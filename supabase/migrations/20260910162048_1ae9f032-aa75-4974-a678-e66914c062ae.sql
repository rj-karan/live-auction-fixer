CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

REVOKE ALL ON FUNCTION public.start_round_2(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_player_sale(uuid, uuid, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_player_unsold(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_player_available(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.undo_last_event(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.start_round_2(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_player_sale(uuid, uuid, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_player_unsold(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_player_available(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.undo_last_event(uuid) TO authenticated, service_role;