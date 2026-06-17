
-- =====================================================
-- ENUMS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.crm_stage_kind AS ENUM ('initial','open','won','lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_deal_status AS ENUM ('open','won','lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_lead_status AS ENUM ('new','working','converted','archived','lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_custom_field_type AS ENUM ('text','number','date','time','select','multiselect','checkbox','url','email','phone','currency');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_entity_kind AS ENUM ('lead','customer','company','contact','deal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- HELPERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.crm_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- =====================================================
-- CRM COMPANIES (clientes-empresa)
-- =====================================================
CREATE TABLE public.crm_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  segment text,
  website text,
  cnpj text,
  address text,
  city text,
  state text,
  phone text,
  email text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_companies_company ON public.crm_companies(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_companies TO authenticated;
GRANT ALL ON public.crm_companies TO service_role;
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_companies_member_all" ON public.crm_companies FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_companies_updated BEFORE UPDATE ON public.crm_companies
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

-- =====================================================
-- CRM CONTACTS
-- =====================================================
CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  crm_company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  name text NOT NULL,
  role text,
  email text,
  phone text,
  whatsapp text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_contacts_company ON public.crm_contacts(company_id);
CREATE INDEX idx_crm_contacts_crmco ON public.crm_contacts(crm_company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT ALL ON public.crm_contacts TO service_role;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_contacts_member_all" ON public.crm_contacts FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_contacts_updated BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

-- =====================================================
-- LEAD SOURCES
-- =====================================================
CREATE TABLE public.crm_lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_lead_sources TO authenticated;
GRANT ALL ON public.crm_lead_sources TO service_role;
ALTER TABLE public.crm_lead_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_lead_sources_member_all" ON public.crm_lead_sources FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_lead_sources_updated BEFORE UPDATE ON public.crm_lead_sources
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

-- =====================================================
-- WIN / LOSS REASONS
-- =====================================================
CREATE TABLE public.crm_win_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_win_reasons TO authenticated;
GRANT ALL ON public.crm_win_reasons TO service_role;
ALTER TABLE public.crm_win_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_win_reasons_member_all" ON public.crm_win_reasons FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_win_reasons_updated BEFORE UPDATE ON public.crm_win_reasons
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

CREATE TABLE public.crm_loss_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_loss_reasons TO authenticated;
GRANT ALL ON public.crm_loss_reasons TO service_role;
ALTER TABLE public.crm_loss_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_loss_reasons_member_all" ON public.crm_loss_reasons FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_loss_reasons_updated BEFORE UPDATE ON public.crm_loss_reasons
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

-- =====================================================
-- LEADS
-- =====================================================
CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  company_text text,
  crm_company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  email text,
  phone text,
  whatsapp text,
  document text,
  job_title text,
  city text,
  state text,
  source_id uuid REFERENCES public.crm_lead_sources(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  estimated_value numeric(14,2) DEFAULT 0,
  status public.crm_lead_status NOT NULL DEFAULT 'new',
  notes text,
  archived boolean NOT NULL DEFAULT false,
  converted_customer_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_leads_company ON public.crm_leads(company_id);
CREATE INDEX idx_crm_leads_owner ON public.crm_leads(owner_id);
CREATE INDEX idx_crm_leads_status ON public.crm_leads(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_leads_member_all" ON public.crm_leads FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_leads_updated BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

-- =====================================================
-- CUSTOMERS
-- =====================================================
CREATE TABLE public.crm_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  whatsapp text,
  document text,
  job_title text,
  crm_company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  address text,
  city text,
  state text,
  notes text,
  original_lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_customers_company ON public.crm_customers(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_customers TO authenticated;
GRANT ALL ON public.crm_customers TO service_role;
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_customers_member_all" ON public.crm_customers FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_customers_updated BEFORE UPDATE ON public.crm_customers
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

ALTER TABLE public.crm_leads
  ADD CONSTRAINT crm_leads_converted_customer_fk
  FOREIGN KEY (converted_customer_id) REFERENCES public.crm_customers(id) ON DELETE SET NULL;

-- =====================================================
-- PIPELINES & STAGES
-- =====================================================
CREATE TABLE public.crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  position int NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_pipelines TO authenticated;
GRANT ALL ON public.crm_pipelines TO service_role;
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_pipelines_member_all" ON public.crm_pipelines FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_pipelines_updated BEFORE UPDATE ON public.crm_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

CREATE TABLE public.crm_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  position int NOT NULL DEFAULT 0,
  probability int NOT NULL DEFAULT 0,
  kind public.crm_stage_kind NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_stages_pipeline ON public.crm_stages(pipeline_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_stages TO authenticated;
GRANT ALL ON public.crm_stages TO service_role;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_stages_member_all" ON public.crm_stages FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_stages_updated BEFORE UPDATE ON public.crm_stages
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

-- =====================================================
-- SETTINGS
-- =====================================================
CREATE TABLE public.crm_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'BRL',
  date_format text NOT NULL DEFAULT 'DD/MM/YYYY',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  module_label text NOT NULL DEFAULT 'CRM',
  deal_prefix text NOT NULL DEFAULT 'CRM',
  deal_counter int NOT NULL DEFAULT 0,
  default_pipeline_id uuid REFERENCES public.crm_pipelines(id) ON DELETE SET NULL,
  default_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  default_deal_value numeric(14,2) NOT NULL DEFAULT 0,
  required_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  conversion_rules jsonb NOT NULL DEFAULT '{"keep_tags":true,"keep_attachments":true,"keep_notes":true,"keep_deals":true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_settings TO authenticated;
GRANT ALL ON public.crm_settings TO service_role;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_settings_member_all" ON public.crm_settings FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_settings_updated BEFORE UPDATE ON public.crm_settings
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

-- =====================================================
-- DEALS
-- =====================================================
CREATE TABLE public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  number text NOT NULL,
  title text NOT NULL,
  value numeric(14,2) NOT NULL DEFAULT 0,
  probability int NOT NULL DEFAULT 0,
  expected_close_date date,
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE RESTRICT,
  stage_id uuid NOT NULL REFERENCES public.crm_stages(id) ON DELETE RESTRICT,
  position int NOT NULL DEFAULT 0,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  crm_company_id uuid REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  status public.crm_deal_status NOT NULL DEFAULT 'open',
  win_reason_id uuid REFERENCES public.crm_win_reasons(id) ON DELETE SET NULL,
  loss_reason_id uuid REFERENCES public.crm_loss_reasons(id) ON DELETE SET NULL,
  closed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, number)
);
CREATE INDEX idx_crm_deals_company ON public.crm_deals(company_id);
CREATE INDEX idx_crm_deals_pipeline ON public.crm_deals(pipeline_id);
CREATE INDEX idx_crm_deals_stage ON public.crm_deals(stage_id);
CREATE INDEX idx_crm_deals_owner ON public.crm_deals(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_deals TO authenticated;
GRANT ALL ON public.crm_deals TO service_role;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_deals_member_all" ON public.crm_deals FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_deals_updated BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

-- =====================================================
-- TAGS
-- =====================================================
CREATE TABLE public.crm_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  suggested boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tags TO authenticated;
GRANT ALL ON public.crm_tags TO service_role;
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_tags_member_all" ON public.crm_tags FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_tags_updated BEFORE UPDATE ON public.crm_tags
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

CREATE TABLE public.crm_lead_tags (
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_lead_tags TO authenticated;
GRANT ALL ON public.crm_lead_tags TO service_role;
ALTER TABLE public.crm_lead_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_lead_tags_member_all" ON public.crm_lead_tags FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE TABLE public.crm_customer_tags (
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, tag_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_customer_tags TO authenticated;
GRANT ALL ON public.crm_customer_tags TO service_role;
ALTER TABLE public.crm_customer_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_customer_tags_member_all" ON public.crm_customer_tags FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE TABLE public.crm_deal_tags (
  deal_id uuid NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  PRIMARY KEY (deal_id, tag_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_deal_tags TO authenticated;
GRANT ALL ON public.crm_deal_tags TO service_role;
ALTER TABLE public.crm_deal_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_deal_tags_member_all" ON public.crm_deal_tags FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

-- =====================================================
-- CUSTOM FIELDS
-- =====================================================
CREATE TABLE public.crm_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label text NOT NULL,
  key text NOT NULL,
  field_type public.crm_custom_field_type NOT NULL DEFAULT 'text',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  applies_to public.crm_entity_kind[] NOT NULL DEFAULT ARRAY['lead']::public.crm_entity_kind[],
  required boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_custom_fields TO authenticated;
GRANT ALL ON public.crm_custom_fields TO service_role;
ALTER TABLE public.crm_custom_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_custom_fields_member_all" ON public.crm_custom_fields FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_custom_fields_updated BEFORE UPDATE ON public.crm_custom_fields
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

CREATE TABLE public.crm_custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES public.crm_custom_fields(id) ON DELETE CASCADE,
  entity_kind public.crm_entity_kind NOT NULL,
  entity_id uuid NOT NULL,
  value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (field_id, entity_kind, entity_id)
);
CREATE INDEX idx_crm_cfv_entity ON public.crm_custom_field_values(entity_kind, entity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_custom_field_values TO authenticated;
GRANT ALL ON public.crm_custom_field_values TO service_role;
ALTER TABLE public.crm_custom_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_cfv_member_all" ON public.crm_custom_field_values FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_cfv_updated BEFORE UPDATE ON public.crm_custom_field_values
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

-- =====================================================
-- TIMELINE / NOTES / ATTACHMENTS
-- =====================================================
CREATE TABLE public.crm_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_kind public.crm_entity_kind NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_timeline_entity ON public.crm_timeline_events(entity_kind, entity_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_timeline_events TO authenticated;
GRANT ALL ON public.crm_timeline_events TO service_role;
ALTER TABLE public.crm_timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_timeline_member_all" ON public.crm_timeline_events FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE TABLE public.crm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_kind public.crm_entity_kind NOT NULL,
  entity_id uuid NOT NULL,
  content text NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_notes_entity ON public.crm_notes(entity_kind, entity_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_notes TO authenticated;
GRANT ALL ON public.crm_notes TO service_role;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_notes_member_all" ON public.crm_notes FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE TABLE public.crm_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_kind public.crm_entity_kind NOT NULL,
  entity_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_attachments_entity ON public.crm_attachments(entity_kind, entity_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_attachments TO authenticated;
GRANT ALL ON public.crm_attachments TO service_role;
ALTER TABLE public.crm_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_attachments_member_all" ON public.crm_attachments FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

-- =====================================================
-- TIMELINE TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.crm_log_lead_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.crm_timeline_events(company_id, entity_kind, entity_id, event_type, title, actor_id)
    VALUES (NEW.company_id, 'lead', NEW.id, 'created', 'Lead criado', NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      INSERT INTO public.crm_timeline_events(company_id, entity_kind, entity_id, event_type, title, data, actor_id)
      VALUES (NEW.company_id, 'lead', NEW.id, 'owner_changed', 'Responsável alterado',
              jsonb_build_object('from', OLD.owner_id, 'to', NEW.owner_id), auth.uid());
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.crm_timeline_events(company_id, entity_kind, entity_id, event_type, title, data, actor_id)
      VALUES (NEW.company_id, 'lead', NEW.id, 'status_changed', 'Status alterado',
              jsonb_build_object('from', OLD.status, 'to', NEW.status), auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_crm_leads_timeline AFTER INSERT OR UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_log_lead_event();

CREATE OR REPLACE FUNCTION public.crm_log_deal_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.crm_timeline_events(company_id, entity_kind, entity_id, event_type, title, actor_id)
    VALUES (NEW.company_id, 'deal', NEW.id, 'created', 'Negócio criado', NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
      INSERT INTO public.crm_timeline_events(company_id, entity_kind, entity_id, event_type, title, data, actor_id)
      VALUES (NEW.company_id, 'deal', NEW.id, 'stage_changed', 'Etapa alterada',
              jsonb_build_object('from_stage', OLD.stage_id, 'to_stage', NEW.stage_id), auth.uid());
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.crm_timeline_events(company_id, entity_kind, entity_id, event_type, title, data, actor_id)
      VALUES (NEW.company_id, 'deal', NEW.id,
              CASE NEW.status::text WHEN 'won' THEN 'deal_won' WHEN 'lost' THEN 'deal_lost' ELSE 'status_changed' END,
              CASE NEW.status::text WHEN 'won' THEN 'Negócio ganho' WHEN 'lost' THEN 'Negócio perdido' ELSE 'Status alterado' END,
              jsonb_build_object('from', OLD.status, 'to', NEW.status), auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_crm_deals_timeline AFTER INSERT OR UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.crm_log_deal_event();

-- =====================================================
-- NUMBERING
-- =====================================================
CREATE OR REPLACE FUNCTION public.crm_next_deal_number(_company_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prefix text; v_seq int;
BEGIN
  UPDATE public.crm_settings
     SET deal_counter = deal_counter + 1
   WHERE company_id = _company_id
   RETURNING deal_prefix, deal_counter INTO v_prefix, v_seq;
  IF v_prefix IS NULL THEN
    INSERT INTO public.crm_settings(company_id, deal_counter) VALUES (_company_id, 1)
      ON CONFLICT (company_id) DO UPDATE SET deal_counter = public.crm_settings.deal_counter + 1
      RETURNING deal_prefix, deal_counter INTO v_prefix, v_seq;
  END IF;
  RETURN v_prefix || '-' || lpad(v_seq::text, 6, '0');
END $$;

-- =====================================================
-- SEED ON COMPANY CREATION
-- =====================================================
CREATE OR REPLACE FUNCTION public.crm_seed_company()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pipeline uuid;
BEGIN
  INSERT INTO public.crm_settings(company_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;

  INSERT INTO public.crm_pipelines(company_id, name, is_default, position)
    VALUES (NEW.id, 'Vendas', true, 0)
    RETURNING id INTO v_pipeline;

  INSERT INTO public.crm_stages(company_id, pipeline_id, name, color, position, probability, kind) VALUES
    (NEW.id, v_pipeline, 'Novo Lead',    '#94a3b8', 0, 10, 'initial'),
    (NEW.id, v_pipeline, 'Contato',      '#60a5fa', 1, 25, 'open'),
    (NEW.id, v_pipeline, 'Qualificação', '#818cf8', 2, 40, 'open'),
    (NEW.id, v_pipeline, 'Proposta',     '#a78bfa', 3, 60, 'open'),
    (NEW.id, v_pipeline, 'Negociação',   '#f59e0b', 4, 80, 'open'),
    (NEW.id, v_pipeline, 'Ganho',        '#22c55e', 5,100, 'won'),
    (NEW.id, v_pipeline, 'Perdido',      '#ef4444', 6,  0, 'lost');

  UPDATE public.crm_settings SET default_pipeline_id = v_pipeline WHERE company_id = NEW.id;

  INSERT INTO public.crm_lead_sources(company_id, name) VALUES
    (NEW.id, 'Manual'),(NEW.id, 'Site'),(NEW.id, 'WhatsApp'),
    (NEW.id, 'Google Ads'),(NEW.id, 'Meta Ads'),(NEW.id, 'Indicação'),
    (NEW.id, 'Importação'),(NEW.id, 'API')
    ON CONFLICT DO NOTHING;

  INSERT INTO public.crm_win_reasons(company_id, name) VALUES
    (NEW.id, 'Melhor preço'),(NEW.id, 'Indicação'),
    (NEW.id, 'Qualidade do atendimento'),(NEW.id, 'Cliente recorrente')
    ON CONFLICT DO NOTHING;

  INSERT INTO public.crm_loss_reasons(company_id, name) VALUES
    (NEW.id, 'Concorrência'),(NEW.id, 'Sem orçamento'),
    (NEW.id, 'Desistência'),(NEW.id, 'Não respondeu'),(NEW.id, 'Preço elevado')
    ON CONFLICT DO NOTHING;

  RETURN NEW;
END $$;
CREATE TRIGGER trg_companies_crm_seed AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.crm_seed_company();

-- Backfill existing companies
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM public.companies LOOP
    IF NOT EXISTS (SELECT 1 FROM public.crm_settings WHERE company_id = r.id) THEN
      PERFORM public.crm_seed_company_manual(r.id);
    END IF;
  END LOOP;
EXCEPTION WHEN undefined_function THEN
  -- inline backfill if helper not present
  FOR r IN SELECT id FROM public.companies LOOP
    IF NOT EXISTS (SELECT 1 FROM public.crm_settings WHERE company_id = r.id) THEN
      INSERT INTO public.crm_settings(company_id) VALUES (r.id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- LEAD → CUSTOMER CONVERSION
-- =====================================================
CREATE OR REPLACE FUNCTION public.crm_convert_lead_to_customer(_lead_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_lead public.crm_leads; v_customer_id uuid; v_rules jsonb;
BEGIN
  SELECT * INTO v_lead FROM public.crm_leads WHERE id = _lead_id;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF NOT public.is_company_member(auth.uid(), v_lead.company_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF v_lead.converted_customer_id IS NOT NULL THEN
    RETURN v_lead.converted_customer_id;
  END IF;

  SELECT conversion_rules INTO v_rules FROM public.crm_settings WHERE company_id = v_lead.company_id;
  v_rules := COALESCE(v_rules, '{}'::jsonb);

  INSERT INTO public.crm_customers(
    company_id, name, email, phone, whatsapp, document, job_title,
    crm_company_id, city, state, notes, original_lead_id, owner_id, created_by
  ) VALUES (
    v_lead.company_id, v_lead.name, v_lead.email, v_lead.phone, v_lead.whatsapp,
    v_lead.document, v_lead.job_title, v_lead.crm_company_id,
    v_lead.city, v_lead.state, v_lead.notes, v_lead.id, v_lead.owner_id, auth.uid()
  ) RETURNING id INTO v_customer_id;

  IF COALESCE((v_rules->>'keep_tags')::boolean, true) THEN
    INSERT INTO public.crm_customer_tags(customer_id, tag_id, company_id)
      SELECT v_customer_id, tag_id, company_id FROM public.crm_lead_tags WHERE lead_id = v_lead.id
      ON CONFLICT DO NOTHING;
  END IF;
  IF COALESCE((v_rules->>'keep_notes')::boolean, true) THEN
    INSERT INTO public.crm_notes(company_id, entity_kind, entity_id, content, author_id, created_at)
      SELECT company_id, 'customer', v_customer_id, content, author_id, created_at
      FROM public.crm_notes WHERE entity_kind = 'lead' AND entity_id = v_lead.id;
  END IF;
  IF COALESCE((v_rules->>'keep_attachments')::boolean, true) THEN
    INSERT INTO public.crm_attachments(company_id, entity_kind, entity_id, file_name, file_path, mime_type, size_bytes, uploaded_by, created_at)
      SELECT company_id, 'customer', v_customer_id, file_name, file_path, mime_type, size_bytes, uploaded_by, created_at
      FROM public.crm_attachments WHERE entity_kind = 'lead' AND entity_id = v_lead.id;
  END IF;
  IF COALESCE((v_rules->>'keep_deals')::boolean, true) THEN
    UPDATE public.crm_deals SET customer_id = v_customer_id WHERE lead_id = v_lead.id;
  END IF;

  UPDATE public.crm_leads SET status='converted', converted_customer_id = v_customer_id WHERE id = v_lead.id;

  INSERT INTO public.crm_timeline_events(company_id, entity_kind, entity_id, event_type, title, actor_id, data)
    VALUES (v_lead.company_id, 'lead', v_lead.id, 'converted', 'Lead convertido em cliente', auth.uid(),
            jsonb_build_object('customer_id', v_customer_id));
  INSERT INTO public.crm_timeline_events(company_id, entity_kind, entity_id, event_type, title, actor_id, data)
    VALUES (v_lead.company_id, 'customer', v_customer_id, 'created_from_lead', 'Cliente criado a partir de lead', auth.uid(),
            jsonb_build_object('lead_id', v_lead.id));

  RETURN v_customer_id;
END $$;

-- =====================================================
-- MOVE DEAL
-- =====================================================
CREATE OR REPLACE FUNCTION public.crm_move_deal(_deal_id uuid, _stage_id uuid, _position int DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company uuid;
BEGIN
  SELECT company_id INTO v_company FROM public.crm_deals WHERE id = _deal_id;
  IF v_company IS NULL OR NOT public.is_company_member(auth.uid(), v_company) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.crm_deals SET stage_id = _stage_id, position = _position WHERE id = _deal_id;
END $$;
