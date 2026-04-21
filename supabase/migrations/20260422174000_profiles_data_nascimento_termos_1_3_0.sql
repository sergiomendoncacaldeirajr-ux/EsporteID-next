-- Data de nascimento em profiles (cadastro); trigger signup; Termos de Uso v1.3.0 (maioridade 18+).

alter table public.profiles add column if not exists data_nascimento date;

comment on column public.profiles.data_nascimento is 'Data de nascimento informada no cadastro (verificação de maioridade no app)';

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
    data_nascimento
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
    v_dob
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

update public.documentos_legais
set ativo = false
where tipo = 'termos_uso';

insert into public.documentos_legais (tipo, versao, notas, ativo)
values (
  'termos_uso',
  '1.3.0',
  'Maioridade 18 anos; encontros e funcionalidades da plataforma; data de nascimento no cadastro',
  true
)
on conflict (tipo, versao) do update set
  notas = excluded.notas,
  ativo = excluded.ativo;
