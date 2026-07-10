-- ============================================================
-- PROVINCE CONNECT — MIGRATION GLOBALE VERS SUPABASE
-- Tables centralisées + RLS + Realtime + vérification publique
-- Réexécutable sans supprimer les données existantes
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. Fonctions de sécurité centralisées
-- ------------------------------------------------------------

create or replace function public.pc_role_courant()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role::text
  from public.profils p
  where p.id = auth.uid()
    and p.statut = 'actif'
  limit 1
$$;

create or replace function public.pc_service_courant()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.code
  from public.profils p
  left join public.services s on s.id = p.service_id
  where p.id = auth.uid()
    and p.statut = 'actif'
  limit 1
$$;

create or replace function public.pc_a_acces(
  roles_autorises text[],
  services_chefs text[] default array[]::text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.pc_role_courant() = any(roles_autorises)
    or (
      public.pc_role_courant() = 'chef_service'
      and public.pc_service_courant() = any(services_chefs)
    ),
    false
  )
$$;

grant execute on function public.pc_role_courant() to authenticated;
grant execute on function public.pc_service_courant() to authenticated;
grant execute on function public.pc_a_acces(text[], text[]) to authenticated;

-- ------------------------------------------------------------
-- 2. Fonction updated_at commune
-- ------------------------------------------------------------

create or replace function public.pc_mettre_a_jour_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 3. Tables métier JSONB
-- L'objet complet utilisé par l'interface est conservé dans data.
-- ------------------------------------------------------------

create table if not exists public.personnes (
  id uuid primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activites (
  id uuid primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cartes (
  id uuid primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.taxes (
  id uuid primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paiements (
  id uuid primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recus (
  id uuid primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- La table communiques peut déjà exister dans votre projet.
create table if not exists public.communiques (
  id uuid primary key default gen_random_uuid(),
  titre text not null default '',
  categorie text not null default 'Communiqué officiel',
  resume text not null default '',
  contenu text not null default '',
  date_publication date,
  reference text not null default '',
  image text not null default '',
  statut text not null default 'Brouillon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

alter table public.communiques add column if not exists updated_at timestamptz not null default now();
alter table public.communiques add column if not exists data jsonb;

update public.communiques
set data = jsonb_build_object(
  'id', id::text,
  'titre', coalesce(titre, ''),
  'categorie', coalesce(categorie, 'Communiqué officiel'),
  'resume', coalesce(resume, ''),
  'contenu', coalesce(contenu, ''),
  'datePublication', coalesce(date_publication::text, ''),
  'reference', coalesce(reference, ''),
  'image', coalesce(image, ''),
  'statut', coalesce(statut, 'Brouillon'),
  'createdAt', coalesce(created_at::text, now()::text)
)
where data is null or data = '{}'::jsonb;

alter table public.communiques alter column data set default '{}'::jsonb;
alter table public.communiques alter column data set not null;

create or replace function public.pc_synchroniser_communique()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.data = coalesce(new.data, '{}'::jsonb);
  new.data = jsonb_set(new.data, '{id}', to_jsonb(new.id::text), true);
  new.titre = coalesce(new.data->>'titre', new.titre, '');
  new.categorie = coalesce(new.data->>'categorie', new.categorie, 'Communiqué officiel');
  new.resume = coalesce(new.data->>'resume', new.resume, '');
  new.contenu = coalesce(new.data->>'contenu', new.contenu, '');
  new.reference = coalesce(new.data->>'reference', new.reference, '');
  new.image = coalesce(new.data->>'image', new.image, '');
  new.statut = coalesce(new.data->>'statut', new.statut, 'Brouillon');
  new.date_publication = coalesce(
    nullif(new.data->>'datePublication', '')::date,
    new.date_publication
  );
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists communiques_sync_data on public.communiques;
create trigger communiques_sync_data
before insert or update
on public.communiques
for each row
execute function public.pc_synchroniser_communique();

-- ------------------------------------------------------------
-- 4. Triggers updated_at
-- ------------------------------------------------------------

do $$
declare
  nom_table text;
begin
  foreach nom_table in array array[
    'personnes', 'activites', 'cartes', 'taxes', 'paiements', 'recus'
  ]
  loop
    execute format('drop trigger if exists %I_updated_at on public.%I', nom_table, nom_table);
    execute format(
      'create trigger %I_updated_at before update on public.%I for each row execute function public.pc_mettre_a_jour_updated_at()',
      nom_table,
      nom_table
    );
  end loop;
end
$$;

-- ------------------------------------------------------------
-- 5. Index métier
-- ------------------------------------------------------------

create unique index if not exists personnes_numero_unique
on public.personnes ((data->>'numero'))
where coalesce(data->>'numero', '') <> '';

create unique index if not exists activites_numero_unique
on public.activites ((data->>'numero'))
where coalesce(data->>'numero', '') <> '';

create unique index if not exists cartes_numero_unique
on public.cartes ((data->>'numeroDocument'))
where coalesce(data->>'numeroDocument', '') <> '';

create unique index if not exists taxes_numero_unique
on public.taxes ((data->>'numero'))
where coalesce(data->>'numero', '') <> '';

create unique index if not exists paiements_numero_unique
on public.paiements ((data->>'numero'))
where coalesce(data->>'numero', '') <> '';

create unique index if not exists recus_numero_unique
on public.recus ((data->>'numeroRecu'))
where coalesce(data->>'numeroRecu', '') <> '';

create unique index if not exists recus_code_unique
on public.recus ((data->>'codeVerification'))
where coalesce(data->>'codeVerification', '') <> '';

create unique index if not exists communiques_reference_unique
on public.communiques ((data->>'reference'))
where coalesce(data->>'reference', '') <> '';

-- ------------------------------------------------------------
-- 6. Activer RLS
-- ------------------------------------------------------------

alter table public.personnes enable row level security;
alter table public.activites enable row level security;
alter table public.cartes enable row level security;
alter table public.taxes enable row level security;
alter table public.paiements enable row level security;
alter table public.recus enable row level security;
alter table public.communiques enable row level security;

-- ------------------------------------------------------------
-- 7. Politiques RLS
-- ------------------------------------------------------------

-- PERSONNES
drop policy if exists personnes_lecture on public.personnes;
drop policy if exists personnes_ecriture on public.personnes;
create policy personnes_lecture on public.personnes
for select to authenticated
using (public.pc_a_acces(
  array['super_admin','admin_provincial','agent_enregistrement','agent_cartes','caissier','agent_controle'],
  array['ENR','ACT','CAR','FIN','CTR']
));
create policy personnes_ecriture on public.personnes
for all to authenticated
using (public.pc_a_acces(
  array['super_admin','admin_provincial','agent_enregistrement'],
  array['ENR']
))
with check (public.pc_a_acces(
  array['super_admin','admin_provincial','agent_enregistrement'],
  array['ENR']
));

-- ACTIVITES
drop policy if exists activites_lecture on public.activites;
drop policy if exists activites_ecriture on public.activites;
create policy activites_lecture on public.activites
for select to authenticated
using (public.pc_a_acces(
  array['super_admin','admin_provincial','agent_enregistrement','agent_cartes','caissier','agent_controle'],
  array['ENR','ACT','CAR','FIN','CTR']
));
create policy activites_ecriture on public.activites
for all to authenticated
using (public.pc_a_acces(
  array['super_admin','admin_provincial','agent_enregistrement'],
  array['ENR','ACT']
))
with check (public.pc_a_acces(
  array['super_admin','admin_provincial','agent_enregistrement'],
  array['ENR','ACT']
));

-- CARTES
drop policy if exists cartes_lecture on public.cartes;
drop policy if exists cartes_ecriture on public.cartes;
create policy cartes_lecture on public.cartes
for select to authenticated
using (public.pc_a_acces(
  array['super_admin','admin_provincial','agent_cartes','agent_controle'],
  array['CAR','CTR']
));
create policy cartes_ecriture on public.cartes
for all to authenticated
using (public.pc_a_acces(
  array['super_admin','admin_provincial','agent_cartes'],
  array['CAR']
))
with check (public.pc_a_acces(
  array['super_admin','admin_provincial','agent_cartes'],
  array['CAR']
));

-- TAXES
drop policy if exists taxes_lecture on public.taxes;
drop policy if exists taxes_ecriture on public.taxes;
create policy taxes_lecture on public.taxes
for select to authenticated
using (public.pc_a_acces(
  array['super_admin','admin_provincial','caissier','agent_controle'],
  array['FIN','CTR']
));
create policy taxes_ecriture on public.taxes
for all to authenticated
using (public.pc_a_acces(
  array['super_admin','admin_provincial','caissier'],
  array['FIN']
))
with check (public.pc_a_acces(
  array['super_admin','admin_provincial','caissier'],
  array['FIN']
));

-- PAIEMENTS
drop policy if exists paiements_lecture on public.paiements;
drop policy if exists paiements_ecriture on public.paiements;
create policy paiements_lecture on public.paiements
for select to authenticated
using (public.pc_a_acces(
  array['super_admin','admin_provincial','caissier','agent_controle'],
  array['FIN','CTR']
));
create policy paiements_ecriture on public.paiements
for all to authenticated
using (public.pc_a_acces(
  array['super_admin','admin_provincial','caissier'],
  array['FIN']
))
with check (public.pc_a_acces(
  array['super_admin','admin_provincial','caissier'],
  array['FIN']
));

-- RECUS
drop policy if exists recus_lecture on public.recus;
drop policy if exists recus_ecriture on public.recus;
create policy recus_lecture on public.recus
for select to authenticated
using (public.pc_a_acces(
  array['super_admin','admin_provincial','caissier','agent_controle'],
  array['FIN','CTR']
));
create policy recus_ecriture on public.recus
for all to authenticated
using (public.pc_a_acces(
  array['super_admin','admin_provincial','caissier'],
  array['FIN']
))
with check (public.pc_a_acces(
  array['super_admin','admin_provincial','caissier'],
  array['FIN']
));

-- COMMUNIQUES
drop policy if exists communiques_lecture_publique on public.communiques;
drop policy if exists communiques_lecture_employes on public.communiques;
drop policy if exists communiques_ecriture_admin on public.communiques;
drop policy if exists communiques_acces_admin on public.communiques;
drop policy if exists communiques_ecriture on public.communiques;
create policy communiques_lecture_publique on public.communiques
for select to anon
using (coalesce(data->>'statut', statut) = 'Publié');
create policy communiques_lecture_employes on public.communiques
for select to authenticated
using (public.pc_role_courant() is not null);
create policy communiques_ecriture on public.communiques
for all to authenticated
using (public.pc_a_acces(
  array['super_admin','admin_provincial','agent_communication'],
  array['COM']
))
with check (public.pc_a_acces(
  array['super_admin','admin_provincial','agent_communication'],
  array['COM']
));

-- ------------------------------------------------------------
-- 8. Grants
-- ------------------------------------------------------------

grant select, insert, update, delete on public.personnes to authenticated;
grant select, insert, update, delete on public.activites to authenticated;
grant select, insert, update, delete on public.cartes to authenticated;
grant select, insert, update, delete on public.taxes to authenticated;
grant select, insert, update, delete on public.paiements to authenticated;
grant select, insert, update, delete on public.recus to authenticated;
grant select, insert, update, delete on public.communiques to authenticated;
grant select on public.communiques to anon;

-- ------------------------------------------------------------
-- 9. Vérification publique sécurisée
-- ------------------------------------------------------------

create or replace function public.verifier_document_public(numero_recherche text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select c.data
  from public.cartes c
  where upper(regexp_replace(coalesce(c.data->>'numeroDocument',''), '[[:space:]]+', '', 'g'))
        = upper(regexp_replace(coalesce(numero_recherche,''), '[[:space:]]+', '', 'g'))
    and coalesce(c.data->>'statut','Brouillon') <> 'Brouillon'
  limit 1
$$;

create or replace function public.verifier_recu_public(
  numero_recherche text,
  code_recherche text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select r.data
  from public.recus r
  where upper(regexp_replace(coalesce(r.data->>'numeroRecu',''), '[[:space:]]+', '', 'g'))
        = upper(regexp_replace(coalesce(numero_recherche,''), '[[:space:]]+', '', 'g'))
    and upper(regexp_replace(coalesce(r.data->>'codeVerification',''), '[[:space:]]+', '', 'g'))
        = upper(regexp_replace(coalesce(code_recherche,''), '[[:space:]]+', '', 'g'))
  limit 1
$$;

grant execute on function public.verifier_document_public(text) to anon, authenticated;
grant execute on function public.verifier_recu_public(text, text) to anon, authenticated;

-- ------------------------------------------------------------
-- 10. Realtime
-- ------------------------------------------------------------

do $$
declare
  nom_table text;
begin
  foreach nom_table in array array[
    'personnes', 'activites', 'cartes', 'taxes',
    'paiements', 'recus', 'communiques'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = nom_table
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        nom_table
      );
    end if;
  end loop;
end
$$;

-- ------------------------------------------------------------
-- 11. Vérification finale
-- ------------------------------------------------------------

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'personnes','activites','cartes','taxes',
    'paiements','recus','communiques'
  )
order by table_name;
