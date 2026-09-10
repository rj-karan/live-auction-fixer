ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS current_round integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.start_round_2(p_tournament_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.players
    WHERE tournament_id = p_tournament_id
      AND auction_round = 1
      AND status = 'available'
  ) THEN
    RAISE EXCEPTION 'Round 1 is not complete yet';
  END IF;

  UPDATE public.players
     SET status = 'available',
         auction_round = 2,
         round_2_eligible = true
   WHERE tournament_id = p_tournament_id
     AND auction_round = 1
     AND status = 'unsold';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.tournaments SET current_round = 2 WHERE id = p_tournament_id;

  RETURN v_count;
END; $$;