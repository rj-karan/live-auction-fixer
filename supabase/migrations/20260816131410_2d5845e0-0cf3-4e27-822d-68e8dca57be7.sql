CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id)
);

GRANT SELECT ON public.dashboard_layouts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_layouts TO authenticated;
GRANT ALL ON public.dashboard_layouts TO service_role;

ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read dashboard layouts" ON public.dashboard_layouts;
CREATE POLICY "Public read dashboard layouts" ON public.dashboard_layouts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage dashboard layouts" ON public.dashboard_layouts;
CREATE POLICY "Admin manage dashboard layouts" ON public.dashboard_layouts FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS dashboard_layouts_set_updated_at ON public.dashboard_layouts;
CREATE TRIGGER dashboard_layouts_set_updated_at BEFORE UPDATE ON public.dashboard_layouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();