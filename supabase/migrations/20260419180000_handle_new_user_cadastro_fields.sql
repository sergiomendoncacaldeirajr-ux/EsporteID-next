-- Ao criar usuário no Auth, preenche profiles com dados do cadastro (metadata do signUp).
-- Campos: nome, genero, whatsapp, localizacao, lat, lng (como no register.php legado).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lat double precision;
  v_lng double precision;
begin
  v_lat := null;
  v_lng := null;
  if new.raw_user_meta_data->>'lat' is not null
     and new.raw_user_meta_data->>'lat' ~ '^-?[0-9]+(\.[0-9]+)?$' then
    v_lat := (new.raw_user_meta_data->>'lat')::double precision;
  end if;
  if new.raw_user_meta_data->>'lng' is not null
     and new.raw_user_meta_data->>'lng' ~ '^-?[0-9]+(\.[0-9]+)?$' then
    v_lng := (new.raw_user_meta_data->>'lng')::double precision;
  end if;

  insert into public.profiles (
    id,
    nome,
    genero,
    whatsapp,
    localizacao,
    lat,
    lng
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
    v_lng
  )
  on conflict (id) do update set
    nome = coalesce(excluded.nome, public.profiles.nome),
    genero = coalesce(excluded.genero, public.profiles.genero),
    whatsapp = coalesce(excluded.whatsapp, public.profiles.whatsapp),
    localizacao = coalesce(excluded.localizacao, public.profiles.localizacao),
    lat = coalesce(excluded.lat, public.profiles.lat),
    lng = coalesce(excluded.lng, public.profiles.lng),
    atualizado_em = now();
  return new;
end;
$$;
