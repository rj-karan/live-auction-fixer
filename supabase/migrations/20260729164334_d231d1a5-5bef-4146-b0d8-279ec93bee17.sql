
CREATE TYPE public.tournament_status AS ENUM ('draft', 'active', 'completed');
CREATE TYPE public.player_status AS ENUM ('available', 'sold', 'unsold');
CREATE TYPE public.event_type AS ENUM ('sale', 'unsold', 'undo_sale', 'undo_unsold');

CREATE TABLE public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read admins" ON public.admins FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) $$;

CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  tournament_date DATE,
  location TEXT,
  currency TEXT NOT NULL DEFAULT '₹',
  default_purse NUMERIC(14,2) NOT NULL DEFAULT 10000000,
  status public.tournament_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tournaments TO anon, authenticated;
GRANT ALL ON public.tournaments TO service_role;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Admin manage tournaments" ON public.tournaments FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  captain_name TEXT NOT NULL,
  captain_photo_url TEXT,
  captain_contact TEXT,
  owner_name TEXT,
  theme_color TEXT,
  max_players INT NOT NULL DEFAULT 15,
  initial_purse NUMERIC(14,2) NOT NULL,
  remaining_purse NUMERIC(14,2) NOT NULL,
  players_purchased_count INT NOT NULL DEFAULT 0,
  total_spent NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, slug),
  CHECK (remaining_purse >= 0)
);
CREATE INDEX teams_tournament_idx ON public.teams(tournament_id);
GRANT SELECT ON public.teams TO anon, authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Admin manage teams" ON public.teams FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  player_number TEXT,
  role TEXT,
  base_price NUMERIC(14,2),
  age INT,
  details TEXT,
  cricheroes_player_id TEXT,
  cricheroes_url TEXT,
  cricheroes_data JSONB,
  cricheroes_fetched_at TIMESTAMPTZ,
  auction_round INT NOT NULL DEFAULT 1,
  status public.player_status NOT NULL DEFAULT 'available',
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  final_price NUMERIC(14,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (status = 'sold' AND team_id IS NOT NULL AND final_price IS NOT NULL AND final_price > 0)
    OR (status <> 'sold' AND team_id IS NULL AND final_price IS NULL)
  )
);
CREATE INDEX players_tournament_idx ON public.players(tournament_id);
CREATE INDEX players_team_idx ON public.players(team_id);
GRANT SELECT ON public.players TO anon, authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Admin manage players" ON public.players FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.auction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  event_type public.event_type NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  price NUMERIC(14,2),
  auction_round INT NOT NULL DEFAULT 1,
  player_name_snapshot TEXT,
  team_name_snapshot TEXT,
  is_undone BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX events_tournament_idx ON public.auction_events(tournament_id, created_at DESC);
GRANT SELECT ON public.auction_events TO anon, authenticated;
GRANT ALL ON public.auction_events TO service_role;
ALTER TABLE public.auction_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read events" ON public.auction_events FOR SELECT USING (true);
CREATE POLICY "Admin manage events" ON public.auction_events FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_tournaments_updated BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_players_updated BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.confirm_player_sale(
  p_player_id UUID, p_team_id UUID, p_price NUMERIC
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_player public.players%ROWTYPE;
  v_team public.teams%ROWTYPE;
  v_event_id UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_price IS NULL OR p_price <= 0 THEN RAISE EXCEPTION 'Invalid price'; END IF;

  SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;
  IF v_player.status <> 'available' THEN RAISE EXCEPTION 'Player is not available'; END IF;

  SELECT * INTO v_team FROM public.teams WHERE id = p_team_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Team not found'; END IF;
  IF v_player.tournament_id <> v_team.tournament_id THEN RAISE EXCEPTION 'Player and team belong to different tournaments'; END IF;
  IF v_team.remaining_purse < p_price THEN RAISE EXCEPTION 'Insufficient purse'; END IF;

  UPDATE public.players SET status = 'sold', team_id = p_team_id, final_price = p_price WHERE id = p_player_id;
  UPDATE public.teams
    SET remaining_purse = remaining_purse - p_price,
        total_spent = total_spent + p_price,
        players_purchased_count = players_purchased_count + 1
    WHERE id = p_team_id;

  INSERT INTO public.auction_events (tournament_id, event_type, player_id, team_id, price, auction_round, player_name_snapshot, team_name_snapshot)
  VALUES (v_player.tournament_id, 'sale', p_player_id, p_team_id, p_price, v_player.auction_round, v_player.name, v_team.name)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_player_unsold(p_player_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_player public.players%ROWTYPE; v_event_id UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;
  IF v_player.status <> 'available' THEN RAISE EXCEPTION 'Player is not available'; END IF;
  UPDATE public.players SET status = 'unsold' WHERE id = p_player_id;
  INSERT INTO public.auction_events (tournament_id, event_type, player_id, price, auction_round, player_name_snapshot)
  VALUES (v_player.tournament_id, 'unsold', p_player_id, NULL, v_player.auction_round, v_player.name)
  RETURNING id INTO v_event_id;
  RETURN v_event_id;
END; $$;

CREATE OR REPLACE FUNCTION public.restore_player_available(p_player_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_player public.players%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;
  IF v_player.status <> 'unsold' THEN RAISE EXCEPTION 'Only unsold players can be restored'; END IF;
  UPDATE public.players SET status = 'available' WHERE id = p_player_id;
END; $$;

CREATE OR REPLACE FUNCTION public.undo_last_event(p_tournament_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event public.auction_events%ROWTYPE; v_new_event_id UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO v_event FROM public.auction_events
    WHERE tournament_id = p_tournament_id AND is_undone = false
      AND event_type IN ('sale','unsold')
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No event to undo'; END IF;

  IF v_event.event_type = 'sale' THEN
    UPDATE public.players SET status = 'available', team_id = NULL, final_price = NULL
      WHERE id = v_event.player_id;
    UPDATE public.teams
      SET remaining_purse = remaining_purse + v_event.price,
          total_spent = GREATEST(0, total_spent - v_event.price),
          players_purchased_count = GREATEST(0, players_purchased_count - 1)
      WHERE id = v_event.team_id;
    UPDATE public.auction_events SET is_undone = true WHERE id = v_event.id;
    INSERT INTO public.auction_events (tournament_id, event_type, player_id, team_id, price, auction_round, player_name_snapshot, team_name_snapshot)
    VALUES (v_event.tournament_id, 'undo_sale', v_event.player_id, v_event.team_id, v_event.price, v_event.auction_round, v_event.player_name_snapshot, v_event.team_name_snapshot)
    RETURNING id INTO v_new_event_id;
  ELSE
    UPDATE public.players SET status = 'available' WHERE id = v_event.player_id;
    UPDATE public.auction_events SET is_undone = true WHERE id = v_event.id;
    INSERT INTO public.auction_events (tournament_id, event_type, player_id, auction_round, player_name_snapshot)
    VALUES (v_event.tournament_id, 'undo_unsold', v_event.player_id, v_event.auction_round, v_event.player_name_snapshot)
    RETURNING id INTO v_new_event_id;
  END IF;
  RETURN v_new_event_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.confirm_player_sale(UUID,UUID,NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_player_unsold(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_player_available(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_last_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_events;
