
-- ============ MGMT: Teams ============
CREATE TABLE public.mgmt_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3b82f6',
  manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mgmt_teams TO authenticated;
GRANT ALL ON public.mgmt_teams TO service_role;
ALTER TABLE public.mgmt_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_teams_company" ON public.mgmt_teams FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER mgmt_teams_updated_at BEFORE UPDATE ON public.mgmt_teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_mgmt_teams_company ON public.mgmt_teams(company_id);

CREATE TABLE public.mgmt_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.mgmt_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mgmt_team_members TO authenticated;
GRANT ALL ON public.mgmt_team_members TO service_role;
ALTER TABLE public.mgmt_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_team_members_company" ON public.mgmt_team_members FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE INDEX idx_mgmt_team_members_team ON public.mgmt_team_members(team_id);
CREATE INDEX idx_mgmt_team_members_user ON public.mgmt_team_members(user_id);

-- ============ MGMT: Goals ============
CREATE TABLE public.mgmt_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'company' CHECK (scope IN ('company','team','user')),
  scope_id uuid,
  kind text NOT NULL DEFAULT 'revenue' CHECK (kind IN ('revenue','deals','leads','conversion','custom')),
  period text NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly','quarterly','annual','custom')),
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz NOT NULL,
  target_value numeric(14,2) NOT NULL DEFAULT 0,
  pipeline_id uuid REFERENCES public.crm_pipelines(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mgmt_goals TO authenticated;
GRANT ALL ON public.mgmt_goals TO service_role;
ALTER TABLE public.mgmt_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_goals_company" ON public.mgmt_goals FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER mgmt_goals_updated_at BEFORE UPDATE ON public.mgmt_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_mgmt_goals_company ON public.mgmt_goals(company_id);
CREATE INDEX idx_mgmt_goals_period ON public.mgmt_goals(start_at, end_at);

-- ============ MGMT: Commission Rules + Commissions ============
CREATE TABLE public.mgmt_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'user' CHECK (scope IN ('user','team','pipeline','product','company')),
  scope_id uuid,
  pipeline_id uuid REFERENCES public.crm_pipelines(id) ON DELETE SET NULL,
  rule_type text NOT NULL DEFAULT 'percent' CHECK (rule_type IN ('percent','fixed')),
  value numeric(14,4) NOT NULL DEFAULT 0,
  min_deal_value numeric(14,2),
  max_deal_value numeric(14,2),
  active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mgmt_commission_rules TO authenticated;
GRANT ALL ON public.mgmt_commission_rules TO service_role;
ALTER TABLE public.mgmt_commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_commission_rules_company" ON public.mgmt_commission_rules FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER mgmt_commission_rules_updated_at BEFORE UPDATE ON public.mgmt_commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_mgmt_commission_rules_company ON public.mgmt_commission_rules(company_id);

CREATE TABLE public.mgmt_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES public.mgmt_commission_rules(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  base_amount numeric(14,2) NOT NULL DEFAULT 0,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','partial','canceled')),
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mgmt_commissions TO authenticated;
GRANT ALL ON public.mgmt_commissions TO service_role;
ALTER TABLE public.mgmt_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_commissions_company" ON public.mgmt_commissions FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER mgmt_commissions_updated_at BEFORE UPDATE ON public.mgmt_commissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_mgmt_commissions_company ON public.mgmt_commissions(company_id);
CREATE INDEX idx_mgmt_commissions_user ON public.mgmt_commissions(user_id);
CREATE INDEX idx_mgmt_commissions_deal ON public.mgmt_commissions(deal_id);

-- ============ MGMT: Tasks ============
CREATE TABLE public.mgmt_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','canceled')),
  due_at timestamptz,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  archived boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mgmt_tasks TO authenticated;
GRANT ALL ON public.mgmt_tasks TO service_role;
ALTER TABLE public.mgmt_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_tasks_company" ON public.mgmt_tasks FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER mgmt_tasks_updated_at BEFORE UPDATE ON public.mgmt_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_mgmt_tasks_company ON public.mgmt_tasks(company_id);
CREATE INDEX idx_mgmt_tasks_owner ON public.mgmt_tasks(owner_id);
CREATE INDEX idx_mgmt_tasks_due ON public.mgmt_tasks(due_at);

-- ============ MGMT: Appointments ============
CREATE TABLE public.mgmt_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'meeting' CHECK (kind IN ('meeting','visit','call','reminder','other')),
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  location text,
  attendees jsonb NOT NULL DEFAULT '[]'::jsonb,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  google_event_id text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','done','canceled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mgmt_appointments TO authenticated;
GRANT ALL ON public.mgmt_appointments TO service_role;
ALTER TABLE public.mgmt_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_appointments_company" ON public.mgmt_appointments FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER mgmt_appointments_updated_at BEFORE UPDATE ON public.mgmt_appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_mgmt_appointments_company ON public.mgmt_appointments(company_id);
CREATE INDEX idx_mgmt_appointments_start ON public.mgmt_appointments(start_at);

-- ============ MGMT: Notifications ============
CREATE TABLE public.mgmt_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'system' CHECK (channel IN ('system','email','whatsapp','push')),
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  entity_kind text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mgmt_notifications TO authenticated;
GRANT ALL ON public.mgmt_notifications TO service_role;
ALTER TABLE public.mgmt_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_notifications_own" ON public.mgmt_notifications FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE INDEX idx_mgmt_notifications_user ON public.mgmt_notifications(user_id, read_at);
CREATE INDEX idx_mgmt_notifications_company ON public.mgmt_notifications(company_id);

-- ============ MGMT: Dashboard Layouts ============
CREATE TABLE public.mgmt_dashboard_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'default',
  widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mgmt_dashboard_layouts TO authenticated;
GRANT ALL ON public.mgmt_dashboard_layouts TO service_role;
ALTER TABLE public.mgmt_dashboard_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_dashboard_layouts_own" ON public.mgmt_dashboard_layouts FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_company_member(auth.uid(), company_id))
  WITH CHECK (user_id = auth.uid() AND public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER mgmt_dashboard_layouts_updated_at BEFORE UPDATE ON public.mgmt_dashboard_layouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ MGMT: Reports ============
CREATE TABLE public.mgmt_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  report_type text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort jsonb NOT NULL DEFAULT '[]'::jsonb,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mgmt_reports TO authenticated;
GRANT ALL ON public.mgmt_reports TO service_role;
ALTER TABLE public.mgmt_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_reports_company" ON public.mgmt_reports FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER mgmt_reports_updated_at BEFORE UPDATE ON public.mgmt_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_mgmt_reports_company ON public.mgmt_reports(company_id);

-- ============ MGMT: Activity Log (immutable) ============
CREATE TABLE public.mgmt_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_kind text,
  entity_id uuid,
  source text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mgmt_activity_log TO authenticated;
GRANT ALL ON public.mgmt_activity_log TO service_role;
ALTER TABLE public.mgmt_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_activity_log_read" ON public.mgmt_activity_log FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "mgmt_activity_log_insert" ON public.mgmt_activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE INDEX idx_mgmt_activity_log_company ON public.mgmt_activity_log(company_id, created_at DESC);
CREATE INDEX idx_mgmt_activity_log_entity ON public.mgmt_activity_log(entity_kind, entity_id);

-- ============ MGMT: Admin Logs ============
CREATE TABLE public.mgmt_admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  ip_address text,
  user_agent text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mgmt_admin_logs TO authenticated;
GRANT ALL ON public.mgmt_admin_logs TO service_role;
ALTER TABLE public.mgmt_admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mgmt_admin_logs_read" ON public.mgmt_admin_logs FOR SELECT TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id));
CREATE POLICY "mgmt_admin_logs_insert" ON public.mgmt_admin_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE INDEX idx_mgmt_admin_logs_company ON public.mgmt_admin_logs(company_id, created_at DESC);

-- ============ Trigger: gerar comissões ao ganhar deal ============
CREATE OR REPLACE FUNCTION public.mgmt_generate_commissions_on_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule record;
  v_amount numeric(14,2);
  v_base numeric(14,2);
BEGIN
  IF NEW.status::text = 'won' AND (OLD.status::text IS DISTINCT FROM 'won') THEN
    v_base := COALESCE(NEW.value, NEW.estimated_value, 0);
    IF NEW.owner_id IS NULL OR v_base <= 0 THEN
      RETURN NEW;
    END IF;
    FOR v_rule IN
      SELECT * FROM public.mgmt_commission_rules
       WHERE company_id = NEW.company_id
         AND active = true
         AND (
           (scope = 'user' AND scope_id = NEW.owner_id)
           OR (scope = 'pipeline' AND scope_id = NEW.pipeline_id)
           OR (scope = 'team' AND EXISTS (
                SELECT 1 FROM public.mgmt_team_members tm
                 WHERE tm.team_id = scope_id AND tm.user_id = NEW.owner_id))
           OR (scope = 'company')
         )
         AND (min_deal_value IS NULL OR v_base >= min_deal_value)
         AND (max_deal_value IS NULL OR v_base <= max_deal_value)
       ORDER BY priority DESC
       LIMIT 1
    LOOP
      IF v_rule.rule_type = 'percent' THEN
        v_amount := round(v_base * v_rule.value / 100.0, 2);
      ELSE
        v_amount := v_rule.value;
      END IF;
      INSERT INTO public.mgmt_commissions(company_id, deal_id, rule_id, user_id, base_amount, amount, status)
      VALUES (NEW.company_id, NEW.id, v_rule.id, NEW.owner_id, v_base, v_amount, 'pending');

      INSERT INTO public.mgmt_notifications(company_id, user_id, channel, kind, title, body, entity_kind, entity_id)
      VALUES (NEW.company_id, NEW.owner_id, 'system', 'commission_generated',
              'Nova comissão gerada',
              'Comissão de R$ ' || v_amount::text || ' pelo negócio ganho.',
              'deal', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mgmt_commissions_on_won ON public.crm_deals;
CREATE TRIGGER trg_mgmt_commissions_on_won
AFTER UPDATE OF status ON public.crm_deals
FOR EACH ROW EXECUTE FUNCTION public.mgmt_generate_commissions_on_won();

-- ============ Profiles: last_seen_at p/ usuários online ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
