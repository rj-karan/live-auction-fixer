CREATE TABLE IF NOT EXISTS public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  website_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sponsors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read sponsors" ON public.sponsors;
CREATE POLICY "Public read sponsors" ON public.sponsors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage sponsors" ON public.sponsors;
CREATE POLICY "Admin manage sponsors" ON public.sponsors FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP TRIGGER IF EXISTS sponsors_set_updated_at ON public.sponsors;
CREATE TRIGGER sponsors_set_updated_at BEFORE UPDATE ON public.sponsors
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS sponsors_tournament_order_idx ON public.sponsors (tournament_id, display_order);

ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS round_2_eligible boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Public read sponsor logos" ON storage.objects;
CREATE POLICY "Public read sponsor logos" ON storage.objects FOR SELECT USING (bucket_id = 'sponsor-logos');

DROP POLICY IF EXISTS "Admins upload sponsor logos" ON storage.objects;
CREATE POLICY "Admins upload sponsor logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sponsor-logos' AND is_admin());

DROP POLICY IF EXISTS "Admins update sponsor logos" ON storage.objects;
CREATE POLICY "Admins update sponsor logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'sponsor-logos' AND is_admin());

DROP POLICY IF EXISTS "Admins delete sponsor logos" ON storage.objects;
CREATE POLICY "Admins delete sponsor logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'sponsor-logos' AND is_admin());