
REVOKE EXECUTE ON FUNCTION public.crm_convert_lead_to_customer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.crm_next_deal_number(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.crm_move_deal(uuid, uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_convert_lead_to_customer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_next_deal_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_move_deal(uuid, uuid, int) TO authenticated;
