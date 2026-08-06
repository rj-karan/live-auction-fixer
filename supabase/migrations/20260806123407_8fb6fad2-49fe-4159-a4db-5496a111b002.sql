CREATE TABLE IF NOT EXISTS public.site_branding (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  assets jsonb NOT NULL DEFAULT '{}'::jsonb,
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  typography jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_branding TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_branding TO authenticated;
GRANT ALL ON public.site_branding TO service_role;

ALTER TABLE public.site_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Branding is publicly readable"
  ON public.site_branding FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert branding"
  ON public.site_branding FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update branding"
  ON public.site_branding FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.site_branding (id) VALUES (1) ON CONFLICT (id) DO NOTHING;