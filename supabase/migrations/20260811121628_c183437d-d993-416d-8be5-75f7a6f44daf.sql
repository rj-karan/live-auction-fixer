CREATE TABLE IF NOT EXISTS public.live_auction (
  tournament_id uuid PRIMARY KEY REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  current_bid numeric,
  status text NOT NULL DEFAULT 'idle',
  round integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.live_auction TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_auction TO authenticated;
GRANT ALL ON public.live_auction TO service_role;

ALTER TABLE public.live_auction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_auction public read" ON public.live_auction FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "live_auction admin write" ON public.live_auction FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.live_auction REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_auction;