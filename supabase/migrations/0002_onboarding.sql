-- ════════════════════════════════════════════════════════════════════════════
-- RACINES — Onboarding sécurisé (à exécuter après 0001_init.sql)
-- Crée la famille + la fiche de l'utilisateur + son rattachement « gardien »
-- en UNE transaction, avec created_by = auth.uid() posé CÔTÉ SERVEUR
-- (le client ne peut pas usurper l'identité du créateur).
-- ════════════════════════════════════════════════════════════════════════════

-- Réassure la policy d'insertion (idempotent, restreinte au rôle authenticated).
drop policy if exists families_insert on families;
create policy families_insert on families
  for insert to authenticated
  with check (auth.uid() = created_by);

create or replace function public.create_family_with_member(
  p_family_name text,
  p_clan       text,
  p_lignage    text,
  p_first_name text,
  p_last_name  text,
  p_gender     gender
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_family uuid;
  v_person uuid;
begin
  if v_uid is null then
    raise exception 'Authentification requise.';
  end if;

  insert into families (name, clan, lignage, created_by)
  values (p_family_name, nullif(p_clan, ''), nullif(p_lignage, ''), v_uid)
  returning id into v_family;
  -- Le trigger on_family_created insère déjà family_members (rôle gardien).

  insert into persons (family_id, first_name, last_name, gender, role, state)
  values (v_family, p_first_name, p_last_name, p_gender, 'gardien', 'vivant')
  returning id into v_person;

  update family_members
  set person_id = v_person
  where user_id = v_uid and family_id = v_family;

  return v_family;
end $$;

revoke all on function public.create_family_with_member(text, text, text, text, text, gender) from public, anon;
grant execute on function public.create_family_with_member(text, text, text, text, text, gender) to authenticated;
