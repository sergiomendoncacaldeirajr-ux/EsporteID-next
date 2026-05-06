-- tipo_usuario não deve ser "atleta" antes do onboarding: o tipo vem de usuario_papeis.
-- Cadastro só cria profiles com tipo neutro; após escolher papel, salvarPapeis + trigger atualizam.

alter table public.profiles alter column tipo_usuario set default 'pendente';

create or replace function public.profile_tipo_usuario_from_papeis(p_usuario_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select
    case
      when exists (
        select 1 from public.usuario_papeis up
        where up.usuario_id = p_usuario_id
          and up.papel = 'espaco'
      ) then 'espaco'
      when exists (
        select 1 from public.usuario_papeis up
        where up.usuario_id = p_usuario_id
          and up.papel = 'organizador'
      ) then 'organizador'
      when exists (
        select 1 from public.usuario_papeis up
        where up.usuario_id = p_usuario_id
          and up.papel = 'professor'
      ) then 'professor'
      when exists (
        select 1 from public.usuario_papeis up
        where up.usuario_id = p_usuario_id
          and up.papel = 'atleta'
      ) then 'atleta'
      else 'pendente'
    end;
$$;

comment on column public.profiles.tipo_usuario is
  'Legado: espelha usuario_papeis (prioridade espaco>organizador>professor>atleta). Valor pendente até existir papel.';

update public.profiles p
set
  tipo_usuario = public.profile_tipo_usuario_from_papeis(p.id),
  atualizado_em = now();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lat double precision;
  v_lng double precision;
  v_dob date;
begin
  v_lat := null;
  v_lng := null;
  v_dob := null;
  if new.raw_user_meta_data->>'lat' is not null
     and new.raw_user_meta_data->>'lat' ~ '^-?[0-9]+(\.[0-9]+)?$' then
    v_lat := (new.raw_user_meta_data->>'lat')::double precision;
  end if;
  if new.raw_user_meta_data->>'lng' is not null
     and new.raw_user_meta_data->>'lng' ~ '^-?[0-9]+(\.[0-9]+)?$' then
    v_lng := (new.raw_user_meta_data->>'lng')::double precision;
  end if;
  if new.raw_user_meta_data->>'data_nascimento' is not null
     and new.raw_user_meta_data->>'data_nascimento' ~ '^\d{4}-\d{2}-\d{2}$' then
    begin
      v_dob := (new.raw_user_meta_data->>'data_nascimento')::date;
    exception
      when others then
        v_dob := null;
    end;
  end if;

  insert into public.profiles (
    id,
    nome,
    genero,
    whatsapp,
    localizacao,
    lat,
    lng,
    data_nascimento,
    tipo_usuario
  )
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'nome'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    nullif(trim(new.raw_user_meta_data->>'genero'), ''),
    nullif(trim(new.raw_user_meta_data->>'whatsapp'), ''),
    nullif(trim(new.raw_user_meta_data->>'localizacao'), ''),
    v_lat,
    v_lng,
    v_dob,
    'pendente'
  )
  on conflict (id) do update set
    nome = coalesce(excluded.nome, public.profiles.nome),
    genero = coalesce(excluded.genero, public.profiles.genero),
    whatsapp = coalesce(excluded.whatsapp, public.profiles.whatsapp),
    localizacao = coalesce(excluded.localizacao, public.profiles.localizacao),
    lat = coalesce(excluded.lat, public.profiles.lat),
    lng = coalesce(excluded.lng, public.profiles.lng),
    data_nascimento = coalesce(excluded.data_nascimento, public.profiles.data_nascimento),
    atualizado_em = now();
  return new;
end;
$$;
