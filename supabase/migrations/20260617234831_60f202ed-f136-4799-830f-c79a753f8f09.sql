-- ============================================================================
-- FASE 2.C — Automações do CRM
-- ============================================================================

CREATE TABLE public.crm_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  run_count INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_automations_company ON public.crm_automations(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_automations TO authenticated;
GRANT ALL ON public.crm_automations TO service_role;
ALTER TABLE public.crm_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_automations_company ON public.crm_automations FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_crm_automations_updated BEFORE UPDATE ON public.crm_automations
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

CREATE TABLE public.crm_automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES public.crm_automations(id) ON DELETE CASCADE,
  entity_kind TEXT,
  entity_id UUID,
  status TEXT NOT NULL DEFAULT 'success',
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_automation_runs_company ON public.crm_automation_runs(company_id, created_at DESC);
GRANT SELECT, INSERT ON public.crm_automation_runs TO authenticated;
GRANT ALL ON public.crm_automation_runs TO service_role;
ALTER TABLE public.crm_automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_automation_runs_company ON public.crm_automation_runs FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

-- ============================================================================
-- FASE 3 — ATENDIMENTO
-- ============================================================================

CREATE TYPE public.inbox_channel_kind AS ENUM ('whatsapp','email','webchat','instagram','facebook','sms','api');
CREATE TYPE public.inbox_conv_status AS ENUM ('open','pending','assigned','resolved','archived');
CREATE TYPE public.inbox_msg_direction AS ENUM ('inbound','outbound','internal');
CREATE TYPE public.inbox_msg_type AS ENUM ('text','image','audio','video','file','pdf','location','contact','sticker','system');

CREATE TABLE public.inbox_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind public.inbox_channel_kind NOT NULL,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbox_channels_company ON public.inbox_channels(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_channels TO authenticated;
GRANT ALL ON public.inbox_channels TO service_role;
ALTER TABLE public.inbox_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY inbox_channels_company ON public.inbox_channels FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_inbox_channels_updated BEFORE UPDATE ON public.inbox_channels
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

CREATE TABLE public.inbox_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbox_queues_company ON public.inbox_queues(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_queues TO authenticated;
GRANT ALL ON public.inbox_queues TO service_role;
ALTER TABLE public.inbox_queues ENABLE ROW LEVEL SECURITY;
CREATE POLICY inbox_queues_company ON public.inbox_queues FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_inbox_queues_updated BEFORE UPDATE ON public.inbox_queues
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

CREATE TABLE public.inbox_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.inbox_channels(id) ON DELETE SET NULL,
  queue_id UUID REFERENCES public.inbox_queues(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  contact_avatar TEXT,
  external_id TEXT,
  customer_id UUID REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  status public.inbox_conv_status NOT NULL DEFAULT 'open',
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbox_conv_company ON public.inbox_conversations(company_id, last_message_at DESC);
CREATE INDEX idx_inbox_conv_assignee ON public.inbox_conversations(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_inbox_conv_status ON public.inbox_conversations(company_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_conversations TO authenticated;
GRANT ALL ON public.inbox_conversations TO service_role;
ALTER TABLE public.inbox_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY inbox_conv_company ON public.inbox_conversations FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_inbox_conv_updated BEFORE UPDATE ON public.inbox_conversations
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

CREATE TABLE public.inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  direction public.inbox_msg_direction NOT NULL,
  msg_type public.inbox_msg_type NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  media_mime TEXT,
  media_size INTEGER,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT,
  external_id TEXT,
  ack_status TEXT,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbox_msg_conv ON public.inbox_messages(conversation_id, created_at);
CREATE INDEX idx_inbox_msg_company ON public.inbox_messages(company_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_messages TO authenticated;
GRANT ALL ON public.inbox_messages TO service_role;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY inbox_msg_company ON public.inbox_messages FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE TABLE public.inbox_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'agent',
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_participants TO authenticated;
GRANT ALL ON public.inbox_participants TO service_role;
ALTER TABLE public.inbox_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY inbox_participants_company ON public.inbox_participants FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE TABLE public.inbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT,
  data JSONB,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbox_events_conv ON public.inbox_events(conversation_id, created_at);
GRANT SELECT, INSERT ON public.inbox_events TO authenticated;
GRANT ALL ON public.inbox_events TO service_role;
ALTER TABLE public.inbox_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY inbox_events_company ON public.inbox_events FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE TABLE public.inbox_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_notes TO authenticated;
GRANT ALL ON public.inbox_notes TO service_role;
ALTER TABLE public.inbox_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY inbox_notes_company ON public.inbox_notes FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE TABLE public.inbox_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.inbox_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_attachments TO authenticated;
GRANT ALL ON public.inbox_attachments TO service_role;
ALTER TABLE public.inbox_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY inbox_attachments_company ON public.inbox_attachments FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

-- WhatsApp (estrutura, sem comunicação real)
CREATE TABLE public.wa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.inbox_channels(id) ON DELETE SET NULL,
  instance_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  phone_number TEXT,
  token_encrypted TEXT,
  webhook_url TEXT,
  last_connected_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_sessions_company ON public.wa_sessions(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_sessions TO authenticated;
GRANT ALL ON public.wa_sessions TO service_role;
ALTER TABLE public.wa_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY wa_sessions_company ON public.wa_sessions FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_wa_sessions_updated BEFORE UPDATE ON public.wa_sessions
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

CREATE TABLE public.wa_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.wa_sessions(id) ON DELETE CASCADE,
  event_type TEXT,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_webhook_session ON public.wa_webhook_events(session_id, created_at DESC);
GRANT SELECT ON public.wa_webhook_events TO authenticated;
GRANT ALL ON public.wa_webhook_events TO service_role;
ALTER TABLE public.wa_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY wa_webhook_service ON public.wa_webhook_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- FASE 3 — INTELIGÊNCIA ARTIFICIAL
-- ============================================================================

CREATE TYPE public.ai_provider AS ENUM ('openai','gemini','anthropic','lovable');

CREATE TABLE public.ai_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider public.ai_provider NOT NULL,
  api_key_encrypted TEXT,
  default_model TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_test_at TIMESTAMPTZ,
  last_test_status TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_credentials TO authenticated;
GRANT ALL ON public.ai_credentials TO service_role;
ALTER TABLE public.ai_credentials ENABLE ROW LEVEL SECURITY;
-- Permite leitura de metadados, mas o campo api_key_encrypted é sempre opaco no client
CREATE POLICY ai_credentials_company ON public.ai_credentials FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_ai_credentials_updated BEFORE UPDATE ON public.ai_credentials
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider public.ai_provider NOT NULL,
  model TEXT,
  feature TEXT,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_estimate NUMERIC(12,6) DEFAULT 0,
  latency_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_usage_company ON public.ai_usage_logs(company_id, created_at DESC);
GRANT SELECT, INSERT ON public.ai_usage_logs TO authenticated;
GRANT ALL ON public.ai_usage_logs TO service_role;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_usage_company ON public.ai_usage_logs FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE TABLE public.ai_assistant_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_threads_user ON public.ai_assistant_threads(user_id, last_message_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_assistant_threads TO authenticated;
GRANT ALL ON public.ai_assistant_threads TO service_role;
ALTER TABLE public.ai_assistant_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_threads_owner ON public.ai_assistant_threads FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.is_company_member(auth.uid(), company_id))
  WITH CHECK (auth.uid() = user_id AND public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_ai_threads_updated BEFORE UPDATE ON public.ai_assistant_threads
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

CREATE TABLE public.ai_assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ai_assistant_threads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT,
  parts JSONB,
  tool_calls JSONB,
  tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_messages_thread ON public.ai_assistant_messages(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_assistant_messages TO authenticated;
GRANT ALL ON public.ai_assistant_messages TO service_role;
ALTER TABLE public.ai_assistant_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_messages_thread_owner ON public.ai_assistant_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_assistant_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_assistant_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));

-- ============================================================================
-- FASE 3 — SAAS / PLANOS / MARKETPLACE
-- ============================================================================

CREATE TABLE public.billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  trial_days INTEGER NOT NULL DEFAULT 7,
  max_users INTEGER,
  max_inboxes INTEGER,
  max_contacts INTEGER,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.billing_plans TO authenticated;
GRANT SELECT ON public.billing_plans TO anon;
GRANT ALL ON public.billing_plans TO service_role;
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_plans_public ON public.billing_plans FOR SELECT TO authenticated, anon
  USING (is_public = true);

CREATE TYPE public.billing_status AS ENUM ('trial','active','past_due','canceled','expired');

CREATE TABLE public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.billing_plans(id),
  status public.billing_status NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  gateway TEXT,
  gateway_subscription_id TEXT,
  gateway_customer_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.billing_subscriptions TO authenticated;
GRANT ALL ON public.billing_subscriptions TO service_role;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_sub_company ON public.billing_subscriptions FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_billing_sub_updated BEFORE UPDATE ON public.billing_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

CREATE TABLE public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.billing_subscriptions(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending',
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  gateway TEXT,
  gateway_invoice_id TEXT,
  receipt_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_billing_invoices_company ON public.billing_invoices(company_id, created_at DESC);
GRANT SELECT ON public.billing_invoices TO authenticated;
GRANT ALL ON public.billing_invoices TO service_role;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_inv_company ON public.billing_invoices FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE TABLE public.billing_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL,
  event_type TEXT,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.billing_webhook_events TO service_role;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_webhook_service ON public.billing_webhook_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TABLE public.billing_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  is_core BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.billing_modules TO authenticated;
GRANT SELECT ON public.billing_modules TO anon;
GRANT ALL ON public.billing_modules TO service_role;
ALTER TABLE public.billing_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_modules_public ON public.billing_modules FOR SELECT TO authenticated, anon
  USING (is_active = true);

CREATE TABLE public.company_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.billing_modules(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  enabled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, module_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_modules TO authenticated;
GRANT ALL ON public.company_modules TO service_role;
ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_modules_company ON public.company_modules FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

-- ============================================================================
-- SEED — planos padrão e módulos do marketplace
-- ============================================================================

INSERT INTO public.billing_plans (slug, name, description, price_cents, trial_days, max_users, max_inboxes, max_contacts, features, modules, position) VALUES
  ('start','Start','Para começar a organizar seu time comercial.', 9900, 14, 3, 1, 1000,
    '{"crm":true,"inbox":true,"ai":false,"reports":"basic"}'::jsonb, '["crm","inbox"]'::jsonb, 1),
  ('grow','Grow','Para empresas em crescimento que precisam de IA e mais canais.', 24900, 14, 10, 3, 10000,
    '{"crm":true,"inbox":true,"ai":true,"automations":true,"reports":"advanced"}'::jsonb, '["crm","inbox","ai","automations"]'::jsonb, 2),
  ('scale','Scale','Para operações de alta performance com tudo liberado.', 49900, 14, 50, 10, 100000,
    '{"crm":true,"inbox":true,"ai":true,"automations":true,"reports":"premium","api":true,"sso":true}'::jsonb, '["crm","inbox","ai","automations","marketing","finance"]'::jsonb, 3);

INSERT INTO public.billing_modules (slug, name, description, icon, category, is_core, position) VALUES
  ('crm','CRM','Gestão completa de leads, clientes e funis.','Users','core',true,1),
  ('inbox','Atendimento','Central omnichannel de mensagens.','MessageSquare','core',true,2),
  ('ai','Elevo AI','Assistente inteligente e funcionalidades de IA.','Sparkles','intelligence',false,3),
  ('automations','Automações','Regras automatizadas para o seu fluxo.','Zap','intelligence',false,4),
  ('marketing','Marketing','Campanhas, segmentação e disparos.','Megaphone','growth',false,5),
  ('finance','Financeiro','Cobranças, contas a pagar e receber.','DollarSign','operations',false,6),
  ('inventory','Estoque','Controle de produtos e movimentações.','Package','operations',false,7),
  ('clinic','Clínica','Módulo vertical para clínicas e consultórios.','Stethoscope','vertical',false,8),
  ('workshop','Oficina','Módulo vertical para oficinas mecânicas.','Wrench','vertical',false,9),
  ('realestate','Imobiliária','Módulo vertical para imobiliárias.','Home','vertical',false,10);

-- ============================================================================
-- TRIGGER — provisionar nova empresa com filas padrão, assinatura trial, módulos core
-- ============================================================================

CREATE OR REPLACE FUNCTION public.bootstrap_company_phase3()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_start_plan UUID; v_module_id UUID;
BEGIN
  -- Filas padrão de atendimento
  INSERT INTO public.inbox_queues (company_id, name, color, position) VALUES
    (NEW.id, 'Comercial', '#3b82f6', 0),
    (NEW.id, 'Suporte', '#10b981', 1),
    (NEW.id, 'Financeiro', '#f59e0b', 2),
    (NEW.id, 'Pós-venda', '#8b5cf6', 3),
    (NEW.id, 'Cobrança', '#ef4444', 4)
  ON CONFLICT DO NOTHING;

  -- Assinatura trial no plano Start
  SELECT id INTO v_start_plan FROM public.billing_plans WHERE slug = 'start' LIMIT 1;
  IF v_start_plan IS NOT NULL THEN
    INSERT INTO public.billing_subscriptions (company_id, plan_id, status, trial_ends_at, current_period_end)
    VALUES (NEW.id, v_start_plan, 'trial', now() + INTERVAL '14 days', now() + INTERVAL '14 days')
    ON CONFLICT (company_id) DO NOTHING;
  END IF;

  -- Ativar módulos core
  FOR v_module_id IN SELECT id FROM public.billing_modules WHERE is_core = true LOOP
    INSERT INTO public.company_modules (company_id, module_id, enabled)
    VALUES (NEW.id, v_module_id, true) ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_bootstrap_company_phase3
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_company_phase3();

-- Aplica também para empresas já existentes
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN SELECT id FROM public.companies LOOP
    INSERT INTO public.inbox_queues (company_id, name, color, position) VALUES
      (c.id, 'Comercial', '#3b82f6', 0),
      (c.id, 'Suporte', '#10b981', 1),
      (c.id, 'Financeiro', '#f59e0b', 2),
      (c.id, 'Pós-venda', '#8b5cf6', 3),
      (c.id, 'Cobrança', '#ef4444', 4)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.billing_subscriptions (company_id, plan_id, status, trial_ends_at, current_period_end)
    SELECT c.id, p.id, 'trial', now() + INTERVAL '14 days', now() + INTERVAL '14 days'
    FROM public.billing_plans p WHERE p.slug = 'start'
    ON CONFLICT (company_id) DO NOTHING;

    INSERT INTO public.company_modules (company_id, module_id, enabled)
    SELECT c.id, m.id, true FROM public.billing_modules m WHERE m.is_core = true
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================================================================
-- pgcrypto helpers para chaves de API (server-side only)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.ai_encrypt_key(_plain TEXT, _secret TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT encode(pgp_sym_encrypt(_plain, _secret), 'base64');
$$;

CREATE OR REPLACE FUNCTION public.ai_decrypt_key(_cipher TEXT, _secret TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT pgp_sym_decrypt(decode(_cipher, 'base64'), _secret);
$$;
REVOKE EXECUTE ON FUNCTION public.ai_encrypt_key(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_decrypt_key(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_encrypt_key(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_decrypt_key(TEXT, TEXT) TO service_role;