-- ============================================================
-- Province Connect — Migration Supabase (version idempotente)
-- Peut être exécutée même si les tables/policies existent déjà
-- ============================================================

-- ── Table communiqués ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communiques (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  titre            TEXT        NOT NULL,
  categorie        TEXT        NOT NULL DEFAULT 'Communiqué officiel',
  resume           TEXT        NOT NULL DEFAULT '',
  contenu          TEXT        NOT NULL DEFAULT '',
  date_publication DATE,
  reference        TEXT        NOT NULL DEFAULT '',
  image            TEXT        NOT NULL DEFAULT '',
  statut           TEXT        NOT NULL DEFAULT 'Brouillon'
                                 CHECK (statut IN ('Brouillon', 'Publié')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.communiques ENABLE ROW LEVEL SECURITY;

-- Suppression des anciennes policies (pour éviter les erreurs "already exists")
DROP POLICY IF EXISTS "communiques_lecture_publique"    ON public.communiques;
DROP POLICY IF EXISTS "communiques_lecture_employes"    ON public.communiques;
DROP POLICY IF EXISTS "communiques_ecriture_admin"      ON public.communiques;
DROP POLICY IF EXISTS "communiques_acces_admin"         ON public.communiques;

-- Lecture publique : visiteurs anonymes — communiqués publiés uniquement
CREATE POLICY "communiques_lecture_publique"
  ON public.communiques FOR SELECT
  USING (statut = 'Publié');

-- Lecture complète : employés connectés voient aussi les brouillons
CREATE POLICY "communiques_lecture_employes"
  ON public.communiques FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Écriture : réservée aux administrateurs (super_admin ou admin_provincial)
CREATE POLICY "communiques_ecriture_admin"
  ON public.communiques FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profils
      WHERE profils.id = auth.uid()
        AND profils.role IN ('super_admin', 'admin_provincial')
        AND profils.statut = 'actif'
    )
  );

-- Temps réel (ignore si déjà membre)
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'communiques'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.communiques;
  END IF;
END $;

-- ── Table abonnements push publics ───────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions_public (
  id         UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint   TEXT  NOT NULL UNIQUE,
  p256dh     TEXT  NOT NULL,
  auth_key   TEXT  NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.push_subscriptions_public ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_public_insertion"     ON public.push_subscriptions_public;
DROP POLICY IF EXISTS "push_public_lecture_admin" ON public.push_subscriptions_public;
DROP POLICY IF EXISTS "push_public_suppression"   ON public.push_subscriptions_public;

CREATE POLICY "push_public_insertion"
  ON public.push_subscriptions_public FOR INSERT
  WITH CHECK (true);

CREATE POLICY "push_public_lecture_admin"
  ON public.push_subscriptions_public FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profils
      WHERE profils.id = auth.uid()
        AND profils.role IN ('super_admin', 'admin_provincial')
        AND profils.statut = 'actif'
    )
  );

CREATE POLICY "push_public_suppression"
  ON public.push_subscriptions_public FOR DELETE
  USING (true);
