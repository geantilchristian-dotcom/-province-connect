-- ============================================================
-- Province Connect — Migration Supabase
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ============================================================

-- Table communiqués (remplace le localStorage)
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

-- Lecture publique : visiteurs anonymes voient uniquement les communiqués publiés
CREATE POLICY "communiques_lecture_publique"
  ON public.communiques FOR SELECT
  USING (statut = 'Publié');

-- Lecture complète : employés authentifiés voient tous les communiqués (brouillons inclus)
CREATE POLICY "communiques_lecture_employes"
  ON public.communiques FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Écriture (INSERT/UPDATE/DELETE) : réservée aux administrateurs uniquement
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

-- Active le temps réel pour cette table
ALTER PUBLICATION supabase_realtime ADD TABLE public.communiques;

-- ============================================================
-- Table abonnements push publics (visiteurs anonymes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions_public (
  id          UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint    TEXT  NOT NULL UNIQUE,
  p256dh      TEXT  NOT NULL,
  auth_key    TEXT  NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.push_subscriptions_public ENABLE ROW LEVEL SECURITY;

-- N'importe qui peut s'abonner (inscription anonyme)
CREATE POLICY "push_public_insertion"
  ON public.push_subscriptions_public FOR INSERT
  WITH CHECK (true);

-- Lecture réservée aux administrateurs (pour l'envoi broadcast)
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

-- Suppression par endpoint (pour désabonnement anonyme)
CREATE POLICY "push_public_suppression"
  ON public.push_subscriptions_public FOR DELETE
  USING (true);
