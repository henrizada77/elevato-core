
-- Engine de execução das automações do CRM
CREATE OR REPLACE FUNCTION public.crm_run_automation(
  _rule_id uuid,
  _entity_kind text,
  _entity_id uuid,
  _payload jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rule public.crm_automations;
  v_action jsonb;
  v_type text;
  v_cfg jsonb;
  v_company uuid;
  v_owner uuid;
  v_lead public.crm_leads;
  v_deal public.crm_deals;
  v_error text;
BEGIN
  SELECT * INTO v_rule FROM public.crm_automations WHERE id = _rule_id AND is_active = true;
  IF v_rule.id IS NULL THEN RETURN; END IF;
  v_company := v_rule.company_id;

  IF _entity_kind = 'lead' THEN
    SELECT * INTO v_lead FROM public.crm_leads WHERE id = _entity_id;
    v_owner := v_lead.owner_id;
  ELSIF _entity_kind = 'deal' THEN
    SELECT * INTO v_deal FROM public.crm_deals WHERE id = _entity_id;
    v_owner := v_deal.owner_id;
  END IF;

  FOR v_action IN SELECT * FROM jsonb_array_elements(COALESCE(v_rule.actions, '[]'::jsonb)) LOOP
    v_type := v_action->>'type';
    v_cfg := COALESCE(v_action->'config', '{}'::jsonb);
    BEGIN
      IF v_type = 'create_task' THEN
        INSERT INTO public.mgmt_tasks(company_id, title, description, owner_id, lead_id, deal_id, priority)
        VALUES (
          v_company,
          COALESCE(v_cfg->>'title', 'Automação: ' || v_rule.name),
          v_cfg->>'description',
          COALESCE((v_cfg->>'owner_id')::uuid, v_owner),
          CASE WHEN _entity_kind = 'lead' THEN _entity_id ELSE NULL END,
          CASE WHEN _entity_kind = 'deal' THEN _entity_id ELSE NULL END,
          COALESCE(v_cfg->>'priority', 'medium')
        );
      ELSIF v_type = 'add_tag' AND v_cfg ? 'tag_id' THEN
        IF _entity_kind = 'lead' THEN
          INSERT INTO public.crm_lead_tags(lead_id, tag_id, company_id)
          VALUES (_entity_id, (v_cfg->>'tag_id')::uuid, v_company) ON CONFLICT DO NOTHING;
        ELSIF _entity_kind = 'deal' THEN
          INSERT INTO public.crm_deal_tags(deal_id, tag_id, company_id)
          VALUES (_entity_id, (v_cfg->>'tag_id')::uuid, v_company) ON CONFLICT DO NOTHING;
        END IF;
      ELSIF v_type = 'assign_owner' AND v_cfg ? 'owner_id' THEN
        IF _entity_kind = 'lead' THEN
          UPDATE public.crm_leads SET owner_id = (v_cfg->>'owner_id')::uuid WHERE id = _entity_id;
        ELSIF _entity_kind = 'deal' THEN
          UPDATE public.crm_deals SET owner_id = (v_cfg->>'owner_id')::uuid WHERE id = _entity_id;
        END IF;
      ELSIF v_type = 'send_notification' AND v_owner IS NOT NULL THEN
        INSERT INTO public.mgmt_notifications(company_id, user_id, channel, kind, title, body, entity_kind, entity_id)
        VALUES (v_company, v_owner, 'system', 'automation',
                COALESCE(v_cfg->>'title', v_rule.name),
                v_cfg->>'body', _entity_kind, _entity_id);
      ELSIF v_type = 'convert_to_customer' AND _entity_kind = 'lead' THEN
        PERFORM public.crm_convert_lead_to_customer(_entity_id);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_error := SQLERRM;
      INSERT INTO public.crm_automation_runs(company_id, automation_id, entity_kind, entity_id, status, error_message, result)
      VALUES (v_company, _rule_id, _entity_kind, _entity_id, 'error', v_error, jsonb_build_object('action', v_type));
      CONTINUE;
    END;
    INSERT INTO public.crm_automation_runs(company_id, automation_id, entity_kind, entity_id, status, result)
    VALUES (v_company, _rule_id, _entity_kind, _entity_id, 'success', jsonb_build_object('action', v_type));
  END LOOP;

  UPDATE public.crm_automations SET run_count = run_count + 1, last_run_at = now() WHERE id = _rule_id;
END $$;

-- Dispatcher: encontra regras ativas que casam com o evento e executa
CREATE OR REPLACE FUNCTION public.crm_dispatch_automations(
  _company_id uuid,
  _trigger text,
  _entity_kind text,
  _entity_id uuid,
  _payload jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT id FROM public.crm_automations
    WHERE company_id = _company_id AND is_active = true AND trigger_type = _trigger
  LOOP
    PERFORM public.crm_run_automation(r.id, _entity_kind, _entity_id, _payload);
  END LOOP;
END $$;

-- Triggers em crm_leads
CREATE OR REPLACE FUNCTION public.crm_leads_automation_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.crm_dispatch_automations(NEW.company_id, 'lead_created', 'lead', NEW.id, '{}'::jsonb);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.crm_dispatch_automations(NEW.company_id, 'lead_stage_changed', 'lead', NEW.id,
      jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_crm_leads_automation ON public.crm_leads;
CREATE TRIGGER trg_crm_leads_automation AFTER INSERT OR UPDATE ON public.crm_leads
FOR EACH ROW EXECUTE FUNCTION public.crm_leads_automation_trg();

-- Triggers em crm_deals
CREATE OR REPLACE FUNCTION public.crm_deals_automation_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.crm_dispatch_automations(NEW.company_id, 'deal_created', 'deal', NEW.id, '{}'::jsonb);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
      PERFORM public.crm_dispatch_automations(NEW.company_id, 'deal_stage_changed', 'deal', NEW.id,
        jsonb_build_object('from_stage', OLD.stage_id, 'to_stage', NEW.stage_id));
    END IF;
    IF NEW.status::text = 'won' AND OLD.status::text IS DISTINCT FROM 'won' THEN
      PERFORM public.crm_dispatch_automations(NEW.company_id, 'deal_won', 'deal', NEW.id, '{}'::jsonb);
    ELSIF NEW.status::text = 'lost' AND OLD.status::text IS DISTINCT FROM 'lost' THEN
      PERFORM public.crm_dispatch_automations(NEW.company_id, 'deal_lost', 'deal', NEW.id, '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_crm_deals_automation ON public.crm_deals;
CREATE TRIGGER trg_crm_deals_automation AFTER INSERT OR UPDATE ON public.crm_deals
FOR EACH ROW EXECUTE FUNCTION public.crm_deals_automation_trg();
