-- Busca / sugestões: corresponder termo sem acentuação ao texto acentuado (ex.: "sao" → "São").
create extension if not exists unaccent;

create or replace function public.fold_search_text(input text)
returns text
language sql
stable
parallel safe
set search_path = public
as $$
  select lower(unaccent(coalesce(input, ''::text)));
$$;

create or replace function public.api_fold_search_atletas(
  p_search text,
  p_exclude_user uuid default null,
  p_limit int default 12
)
returns table (id uuid, nome text, username text)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id, p.nome, p.username
  from public.profiles p
  where length(trim(p_search)) >= 3
    and (p_exclude_user is null or p.id <> p_exclude_user)
    and (
      strpos(public.fold_search_text(p.nome), public.fold_search_text(p_search)) > 0
      or strpos(public.fold_search_text(p.username), public.fold_search_text(p_search)) > 0
    )
  limit least(coalesce(nullif(p_limit, 0), 12), 100);
$$;

create or replace function public.api_fold_search_espacos_listagem(p_search text, p_limit int default 60)
returns table (id bigint, slug text, nome_publico text, localizacao text, lat text, lng text)
language sql
stable
security invoker
set search_path = public
as $$
  select e.id, e.slug, e.nome_publico, e.localizacao, e.lat, e.lng
  from public.espacos_genericos e
  where e.ativo_listagem = true
    and length(trim(p_search)) >= 3
    and (
      strpos(public.fold_search_text(e.nome_publico), public.fold_search_text(p_search)) > 0
      or strpos(public.fold_search_text(e.localizacao), public.fold_search_text(p_search)) > 0
    )
  limit least(coalesce(nullif(p_limit, 0), 60), 120);
$$;

create or replace function public.api_fold_search_times_suggest(p_search text, p_limit int default 8)
returns table (id bigint, nome text, localizacao text)
language sql
stable
security invoker
set search_path = public
as $$
  select t.id, t.nome, t.localizacao
  from public.times t
  where length(trim(p_search)) >= 3
    and (
      strpos(public.fold_search_text(t.nome), public.fold_search_text(p_search)) > 0
      or strpos(public.fold_search_text(t.localizacao), public.fold_search_text(p_search)) > 0
    )
  order by t.id desc
  limit least(coalesce(nullif(p_limit, 0), 8), 100);
$$;

create or replace function public.api_fold_search_times_buscar(
  p_search text,
  p_exclude_creator uuid,
  p_limit int default 20
)
returns table (id bigint, nome text, localizacao text, escudo text, tipo text)
language sql
stable
security invoker
set search_path = public
as $$
  select t.id, t.nome, t.localizacao, t.escudo, t.tipo
  from public.times t
  where length(trim(p_search)) >= 1
    and t.criador_id <> p_exclude_creator
    and (
      strpos(public.fold_search_text(t.nome), public.fold_search_text(p_search)) > 0
      or strpos(public.fold_search_text(t.localizacao), public.fold_search_text(p_search)) > 0
    )
  order by t.pontos_ranking desc nulls last, t.id desc
  limit least(coalesce(nullif(p_limit, 0), 20), 100);
$$;

create or replace function public.api_fold_search_torneios_suggest(p_search text, p_limit int default 8)
returns table (id bigint, nome text, status text)
language sql
stable
security invoker
set search_path = public
as $$
  select x.id, x.nome, x.status
  from public.torneios x
  where length(trim(p_search)) >= 3
    and strpos(public.fold_search_text(x.nome), public.fold_search_text(p_search)) > 0
  order by x.criado_em desc nulls last, x.id desc
  limit least(coalesce(nullif(p_limit, 0), 8), 100);
$$;

create or replace function public.api_fold_search_torneios_abertos_buscar(p_search text, p_limit int default 20)
returns table (id bigint, nome text, banner text)
language sql
stable
security invoker
set search_path = public
as $$
  select x.id, x.nome, x.banner
  from public.torneios x
  where length(trim(p_search)) >= 1
    and x.status = 'aberto'
    and strpos(public.fold_search_text(x.nome), public.fold_search_text(p_search)) > 0
  order by x.criado_em desc nulls last, x.id desc
  limit least(coalesce(nullif(p_limit, 0), 20), 100);
$$;

create or replace function public.api_fold_search_atletas_buscar(
  p_search text,
  p_exclude_user uuid,
  p_limit int default 28
)
returns table (
  id uuid,
  nome text,
  username text,
  avatar_url text,
  localizacao text,
  disponivel_amistoso boolean,
  disponivel_amistoso_ate timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id,
    p.nome,
    p.username,
    p.avatar_url,
    p.localizacao,
    p.disponivel_amistoso,
    p.disponivel_amistoso_ate
  from public.profiles p
  where length(trim(p_search)) >= 1
    and p.id <> p_exclude_user
    and (
      strpos(public.fold_search_text(p.nome), public.fold_search_text(p_search)) > 0
      or strpos(public.fold_search_text(p.username), public.fold_search_text(p_search)) > 0
    )
  limit least(coalesce(nullif(p_limit, 0), 28), 100);
$$;

create or replace function public.api_fold_search_espacos_buscar(p_search text, p_limit int default 20)
returns table (id bigint, nome_publico text, localizacao text, logo_arquivo text)
language sql
stable
security invoker
set search_path = public
as $$
  select e.id, e.nome_publico, e.localizacao, e.logo_arquivo
  from public.espacos_genericos e
  where e.ativo_listagem = true
    and length(trim(p_search)) >= 1
    and (
      strpos(public.fold_search_text(e.nome_publico), public.fold_search_text(p_search)) > 0
      or strpos(public.fold_search_text(e.localizacao), public.fold_search_text(p_search)) > 0
    )
  order by e.id desc
  limit least(coalesce(nullif(p_limit, 0), 20), 100);
$$;

revoke all on function public.fold_search_text(text) from public;
grant execute on function public.fold_search_text(text) to authenticated;
grant execute on function public.fold_search_text(text) to service_role;

revoke all on function public.api_fold_search_atletas(text, uuid, int) from public;
grant execute on function public.api_fold_search_atletas(text, uuid, int) to authenticated;
grant execute on function public.api_fold_search_atletas(text, uuid, int) to service_role;

revoke all on function public.api_fold_search_espacos_listagem(text, int) from public;
grant execute on function public.api_fold_search_espacos_listagem(text, int) to authenticated;
grant execute on function public.api_fold_search_espacos_listagem(text, int) to service_role;

revoke all on function public.api_fold_search_times_suggest(text, int) from public;
grant execute on function public.api_fold_search_times_suggest(text, int) to authenticated;
grant execute on function public.api_fold_search_times_suggest(text, int) to service_role;

revoke all on function public.api_fold_search_times_buscar(text, uuid, int) from public;
grant execute on function public.api_fold_search_times_buscar(text, uuid, int) to authenticated;
grant execute on function public.api_fold_search_times_buscar(text, uuid, int) to service_role;

revoke all on function public.api_fold_search_torneios_suggest(text, int) from public;
grant execute on function public.api_fold_search_torneios_suggest(text, int) to authenticated;
grant execute on function public.api_fold_search_torneios_suggest(text, int) to service_role;

revoke all on function public.api_fold_search_torneios_abertos_buscar(text, int) from public;
grant execute on function public.api_fold_search_torneios_abertos_buscar(text, int) to authenticated;
grant execute on function public.api_fold_search_torneios_abertos_buscar(text, int) to service_role;

revoke all on function public.api_fold_search_atletas_buscar(text, uuid, int) from public;
grant execute on function public.api_fold_search_atletas_buscar(text, uuid, int) to authenticated;
grant execute on function public.api_fold_search_atletas_buscar(text, uuid, int) to service_role;

revoke all on function public.api_fold_search_espacos_buscar(text, int) from public;
grant execute on function public.api_fold_search_espacos_buscar(text, int) to authenticated;
grant execute on function public.api_fold_search_espacos_buscar(text, int) to service_role;
