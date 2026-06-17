
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('master', 'admin', 'manager', 'seller', 'agent', 'user');
CREATE TYPE public.company_status AS ENUM ('trial', 'active', 'trial_expired', 'suspended', 'cancelled');
CREATE TYPE public.company_plan AS ENUM ('trial', 'starter', 'pro', 'enterprise');
CREATE TYPE public.member_status AS ENUM ('active', 'invited', 'suspended');

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ COMPANIES ============
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan public.company_plan NOT NULL DEFAULT 'trial',
  status public.company_status NOT NULL DEFAULT 'trial',
  trial_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  logo_url TEXT,
  cnpj TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  language TEXT NOT NULL DEFAULT 'pt-BR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  current_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ COMPANY MEMBERS ============
CREATE TABLE public.company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  position TEXT,
  status public.member_status NOT NULL DEFAULT 'active',
  last_access_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_company_members_user ON public.company_members(user_id);
CREATE INDEX idx_company_members_company ON public.company_members(company_id);
CREATE TRIGGER trg_company_members_updated BEFORE UPDATE ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES (platform-wide, e.g. master) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ HELPER FUNCTIONS (SECURITY DEFINER, avoid RLS recursion) ============
CREATE OR REPLACE FUNCTION public.has_platform_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_company_role(_user_id UUID, _company_id UUID)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.company_members
  WHERE user_id = _user_id AND company_id = _company_id AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id
      AND status = 'active' AND role IN ('admin','manager')
  );
$$;

-- ============ RLS POLICIES ============
-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_platform_role(auth.uid(),'master'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- companies
CREATE POLICY "companies_select_member" ON public.companies FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), id) OR public.has_platform_role(auth.uid(),'master'));
CREATE POLICY "companies_insert_authenticated" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "companies_update_admin" ON public.companies FOR UPDATE TO authenticated
  USING (public.is_company_admin(auth.uid(), id) OR public.has_platform_role(auth.uid(),'master'))
  WITH CHECK (public.is_company_admin(auth.uid(), id) OR public.has_platform_role(auth.uid(),'master'));
CREATE POLICY "companies_delete_master" ON public.companies FOR DELETE TO authenticated
  USING (public.has_platform_role(auth.uid(),'master'));

-- company_members
CREATE POLICY "members_select_same_company" ON public.company_members FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id) OR public.has_platform_role(auth.uid(),'master'));
CREATE POLICY "members_insert_admin" ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (public.is_company_admin(auth.uid(), company_id) OR public.has_platform_role(auth.uid(),'master'));
CREATE POLICY "members_update_admin" ON public.company_members FOR UPDATE TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id) OR public.has_platform_role(auth.uid(),'master'))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id) OR public.has_platform_role(auth.uid(),'master'));
CREATE POLICY "members_delete_admin" ON public.company_members FOR DELETE TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id) OR public.has_platform_role(auth.uid(),'master'));

-- user_roles (read own; only master can mutate via service role)
CREATE POLICY "user_roles_select_self_or_master" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_platform_role(auth.uid(),'master'));

-- ============ AUTO PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CREATE COMPANY WITH OWNER (atomic onboarding) ============
CREATE OR REPLACE FUNCTION public.create_company_with_owner(
  p_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_company_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.companies (name, phone, email)
  VALUES (p_name, p_phone, p_email)
  RETURNING id INTO v_company_id;

  INSERT INTO public.company_members (company_id, user_id, role, status, last_access_at)
  VALUES (v_company_id, v_user_id, 'admin', 'active', now());

  UPDATE public.profiles
  SET current_company_id = v_company_id
  WHERE id = v_user_id;

  RETURN v_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_company_with_owner(TEXT, TEXT, TEXT) TO authenticated;
