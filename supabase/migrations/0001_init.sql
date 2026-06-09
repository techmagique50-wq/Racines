-- ════════════════════════════════════════════════════════════════════════════
-- RACINES — Schéma initial sécurisé (Supabase / Postgres)
-- Données familiales ULTRA-SENSIBLES → la sécurité repose sur la Row Level
-- Security (RLS) : la base elle-même garantit qu'un utilisateur ne voit QUE
-- les données de sa/ses famille(s). Le front ne peut pas contourner ces règles.
--
-- À coller dans : Dashboard Supabase → SQL Editor → New query → Run.
-- (ou `supabase db push` avec la CLI)
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Types ─────────────────────────────────────────────────────────────────────
do $$ begin
  create type gender as enum ('M', 'F');
exception when duplicate_object then null; end $$;
do $$ begin
  create type life_state as enum ('vivant', 'memoire');
exception when duplicate_object then null; end $$;
do $$ begin
  create type family_role as enum ('gardien', 'membre', 'attente', 'invite');
exception when duplicate_object then null; end $$;
do $$ begin
  create type link_status as enum ('confirmed', 'pending');
exception when duplicate_object then null; end $$;

-- ── Tables ────────────────────────────────────────────────────────────────────

create table if not exists families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  clan        text,
  lignage     text,
  created_by  uuid not null references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Appartenance : relie un compte (auth.users) à une famille + sa fiche + son rôle.
-- C'est la table pivot sur laquelle s'appuie TOUTE la RLS.
create table if not exists family_members (
  user_id     uuid not null references auth.users (id) on delete cascade,
  family_id   uuid not null references families (id) on delete cascade,
  person_id   uuid,
  role        family_role not null default 'membre',
  created_at  timestamptz not null default now(),
  primary key (user_id, family_id)
);

create table if not exists persons (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families (id) on delete cascade,
  first_name  text not null,
  last_name   text not null,
  nickname    text,
  gender      gender not null,
  clan        text,
  lignage     text,
  is_pivot    boolean not null default false,
  birth_year  int,
  death_year  int,
  state       life_state not null default 'vivant',
  village     text,
  country     text,
  city        text,
  profession  text,
  avatar      text,
  photo       text,                       -- chemin dans le bucket PRIVÉ (pas une URL publique)
  bio         text,
  role        family_role,
  is_minor    boolean not null default false,  -- protection renforcée des mineurs
  guardian_id uuid references persons (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Coordonnées sensibles isolées : accès réservé aux membres confirmés (pas aux invités).
create table if not exists person_contacts (
  person_id   uuid primary key references persons (id) on delete cascade,
  family_id   uuid not null references families (id) on delete cascade,
  phone       text,
  email       text,
  address     text
);

create table if not exists filiations (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  child_id   uuid not null references persons (id) on delete cascade,
  parent_id  uuid not null references persons (id) on delete cascade,
  status     link_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (child_id, parent_id)
);

create table if not exists unions (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  a_id       uuid not null references persons (id) on delete cascade,
  b_id       uuid not null references persons (id) on delete cascade,
  status     link_status not null default 'pending',
  rank       int,
  created_at timestamptz not null default now()
);

create table if not exists tributes (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families (id) on delete cascade,
  person_id   uuid not null references persons (id) on delete cascade,
  kind        text not null,
  author_name text not null,
  text        text,
  created_at  timestamptz not null default now()
);

create table if not exists posts (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  author_id  uuid not null references persons (id) on delete cascade,
  text       text not null,
  photo      text,
  memory_of  uuid references persons (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists post_likes (
  post_id   uuid not null references posts (id) on delete cascade,
  person_id uuid not null references persons (id) on delete cascade,
  family_id uuid not null references families (id) on delete cascade,
  primary key (post_id, person_id)
);

create table if not exists post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts (id) on delete cascade,
  family_id  uuid not null references families (id) on delete cascade,
  author_id  uuid not null references persons (id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families (id) on delete cascade,
  kind         text not null,
  title        text not null,
  date         date not null,
  place        text,
  description  text,
  organizer_id uuid not null references persons (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists event_rsvps (
  event_id  uuid not null references events (id) on delete cascade,
  person_id uuid not null references persons (id) on delete cascade,
  family_id uuid not null references families (id) on delete cascade,
  primary key (event_id, person_id)
);

create table if not exists conversations (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  type       text not null default 'direct',
  name       text,
  created_at timestamptz not null default now()
);

create table if not exists conversation_members (
  conversation_id uuid not null references conversations (id) on delete cascade,
  person_id       uuid not null references persons (id) on delete cascade,
  family_id       uuid not null references families (id) on delete cascade,
  primary key (conversation_id, person_id)
);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  family_id       uuid not null references families (id) on delete cascade,
  from_id         uuid not null references persons (id) on delete cascade,
  text            text not null,
  created_at      timestamptz not null default now()
);

-- Journal d'audit : APPEND-ONLY (aucune policy update/delete → modifications interdites).
create table if not exists audit_log (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  actor_id   uuid references persons (id) on delete set null,
  action     text not null,
  target_id  uuid,
  summary    text not null,
  created_at timestamptz not null default now()
);

-- Invitations : token non devinable, à usage unique, expirant.
create table if not exists invitations (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  token      uuid not null unique default gen_random_uuid(),
  role       family_role not null default 'membre',
  person_id  uuid references persons (id) on delete set null,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at    timestamptz,
  used_by    uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Index utiles (et nécessaires aux perfs de la RLS qui filtre sur family_id).
create index if not exists idx_persons_family       on persons (family_id);
create index if not exists idx_filiations_family     on filiations (family_id);
create index if not exists idx_unions_family         on unions (family_id);
create index if not exists idx_posts_family          on posts (family_id);
create index if not exists idx_messages_conversation on messages (conversation_id);
create index if not exists idx_members_user          on family_members (user_id);

-- ── Fonctions d'aide (SECURITY DEFINER → bypassent la RLS, évitent la récursion) ──

create or replace function public.is_family_member(fid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from family_members m
    where m.family_id = fid and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_family_guardian(fid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from family_members m
    where m.family_id = fid and m.user_id = auth.uid() and m.role = 'gardien'
  );
$$;

-- Membre « de confiance » (peut voir les coordonnées sensibles) : pas un invité.
create or replace function public.is_trusted_member(fid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from family_members m
    where m.family_id = fid and m.user_id = auth.uid()
      and m.role in ('gardien', 'membre')
  );
$$;

-- ── Activation de la RLS sur toutes les tables ────────────────────────────────
alter table families             enable row level security;
alter table family_members       enable row level security;
alter table persons              enable row level security;
alter table person_contacts      enable row level security;
alter table filiations           enable row level security;
alter table unions               enable row level security;
alter table tributes             enable row level security;
alter table posts                enable row level security;
alter table post_likes           enable row level security;
alter table post_comments        enable row level security;
alter table events               enable row level security;
alter table event_rsvps          enable row level security;
alter table conversations        enable row level security;
alter table conversation_members enable row level security;
alter table messages             enable row level security;
alter table audit_log            enable row level security;
alter table invitations          enable row level security;

-- ── Policies génériques : « voir/écrire seulement dans ma famille » ───────────
-- Helper de génération via DO pour les tables qui ont une colonne family_id et
-- suivent la règle standard (lecture = membre, écriture = membre, suppression = gardien).
do $$
declare t text;
begin
  foreach t in array array[
    'persons','filiations','unions','tributes','posts','post_likes',
    'post_comments','events','event_rsvps','conversations',
    'conversation_members','messages'
  ] loop
    execute format('drop policy if exists %1$s_select on %1$s;', t);
    execute format('drop policy if exists %1$s_insert on %1$s;', t);
    execute format('drop policy if exists %1$s_update on %1$s;', t);
    execute format('drop policy if exists %1$s_delete on %1$s;', t);

    execute format(
      'create policy %1$s_select on %1$s for select using (public.is_family_member(family_id));', t);
    execute format(
      'create policy %1$s_insert on %1$s for insert with check (public.is_family_member(family_id));', t);
    execute format(
      'create policy %1$s_update on %1$s for update using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));', t);
    -- Suppression (modération) réservée aux gardiens.
    execute format(
      'create policy %1$s_delete on %1$s for delete using (public.is_family_guardian(family_id));', t);
  end loop;
end $$;

-- families : un membre voit sa famille ; tout utilisateur connecté peut créer LA sienne.
drop policy if exists families_select on families;
drop policy if exists families_insert on families;
drop policy if exists families_update on families;
create policy families_select on families for select using (public.is_family_member(id));
create policy families_insert on families for insert with check (auth.uid() = created_by);
create policy families_update on families for update using (public.is_family_guardian(id)) with check (public.is_family_guardian(id));

-- family_members : on voit ses co-membres ; seuls les gardiens ajoutent/retirent
-- (l'auto-rattachement passe par redeem_invitation, voir plus bas).
drop policy if exists members_select on family_members;
drop policy if exists members_insert on family_members;
drop policy if exists members_update on family_members;
drop policy if exists members_delete on family_members;
create policy members_select on family_members for select using (public.is_family_member(family_id));
create policy members_insert on family_members for insert with check (public.is_family_guardian(family_id));
create policy members_update on family_members for update using (public.is_family_guardian(family_id)) with check (public.is_family_guardian(family_id));
create policy members_delete on family_members for delete using (public.is_family_guardian(family_id));

-- person_contacts : coordonnées sensibles → membres DE CONFIANCE uniquement.
drop policy if exists contacts_select on person_contacts;
drop policy if exists contacts_write  on person_contacts;
create policy contacts_select on person_contacts for select using (public.is_trusted_member(family_id));
create policy contacts_write  on person_contacts for all    using (public.is_trusted_member(family_id)) with check (public.is_trusted_member(family_id));

-- audit_log : lecture par les membres, insertion par les membres, AUCUN update/delete.
drop policy if exists audit_select on audit_log;
drop policy if exists audit_insert on audit_log;
create policy audit_select on audit_log for select using (public.is_family_member(family_id));
create policy audit_insert on audit_log for insert with check (public.is_family_member(family_id));

-- invitations : gérées par les gardiens uniquement (la redemption passe par la RPC).
drop policy if exists invitations_rw on invitations;
create policy invitations_rw on invitations for all using (public.is_family_guardian(family_id)) with check (public.is_family_guardian(family_id));

-- ── Triggers & RPC ────────────────────────────────────────────────────────────

-- À la création d'une famille, son créateur en devient automatiquement gardien.
create or replace function public.handle_new_family()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into family_members (user_id, family_id, role)
  values (new.created_by, new.id, 'gardien')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_family_created on families;
create trigger on_family_created after insert on families
  for each row execute function public.handle_new_family();

-- Redemption d'invitation : valide le token (non expiré, non utilisé) puis
-- rattache l'utilisateur courant à la famille. SECURITY DEFINER pour pouvoir
-- écrire dans family_members sans ouvrir une faille d'auto-inscription.
create or replace function public.redeem_invitation(invite_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv invitations;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  select * into inv from invitations
  where token = invite_token
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation invalide, déjà utilisée ou expirée.';
  end if;

  insert into family_members (user_id, family_id, person_id, role)
  values (auth.uid(), inv.family_id, inv.person_id, inv.role)
  on conflict (user_id, family_id) do nothing;

  update invitations
  set used_at = now(), used_by = auth.uid()
  where id = inv.id;

  return inv.family_id;
end $$;

revoke all on function public.redeem_invitation(uuid) from public, anon;
grant execute on function public.redeem_invitation(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Storage (à exécuter aussi) : bucket PRIVÉ pour les photos.
--   insert into storage.buckets (id, name, public) values ('photos','photos',false);
-- Les fichiers se nomment '<family_id>/<...>'. Policy d'accès :
--   create policy "photos lisibles par la famille"
--     on storage.objects for select
--     using (bucket_id = 'photos'
--            and public.is_family_member( (split_part(name,'/',1))::uuid ));
--   create policy "photos écrites par la famille"
--     on storage.objects for insert
--     with check (bucket_id = 'photos'
--                 and public.is_family_member( (split_part(name,'/',1))::uuid ));
-- L'accès se fait ensuite par URL signée (createSignedUrl), jamais en public.
-- ════════════════════════════════════════════════════════════════════════════
