ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS max_teams integer,
  ADD COLUMN IF NOT EXISTS team_size integer;
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS batting_style text,
  ADD COLUMN IF NOT EXISTS bowling_style text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS notes text;