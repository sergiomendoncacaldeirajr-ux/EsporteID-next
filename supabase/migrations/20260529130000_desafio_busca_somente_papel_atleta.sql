-- Radar de desafio e buscas "atleta": só quem tem papel `atleta` em usuario_papeis.
-- Professores, organizadores e donos de espaço sem esse papel não entram como alvo de desafio.

-- 1) Radar individual (match)
create or replace function public.buscar_match_atletas(
  p_viewer_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_esporte_id bigint default null,
  p_raio_km integer default 30,
  p_limit integer default 300
)
returns table (
  usuario_id uuid,
  nome text,
  localizacao text,
  esporte_id bigint,
  esporte_nome text,
  dist_km double precision,
  nota_eid numeric,
  pontos_ranking integer,
  modalidade_match text,
  interesse_match text,
  avatar_url text,
  disponivel_amistoso boolean,
  vitorias integer,
  derrotas integer,
  posicao_rank integer
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      ue.usuario_id,
      coalesce(p.nome, 'Atleta') as nome,
      coalesce(p.localizacao, 'Localização não informada') as localizacao,
      ue.esporte_id,
      coalesce(e.nome, 'Esporte') as esporte_nome,
      public.eid_distance_km(p_lat, p_lng, p.lat, p.lng) as dist_km,
      ue.nota_eid,
      ue.pontos_ranking,
      case
        when ue.modalidades_match is not null and coalesce(array_length(ue.modalidades_match, 1), 0) >= 1
        then ue.modalidades_match
        else array[coalesce(ue.modalidade_match, 'individual')]::text[]
      end as mods,
      coalesce(ue.interesse_match, 'ranking_e_amistoso')::text as interesse_match,
      p.avatar_url,
      (
        coalesce(p.disponivel_amistoso, false) is true
        and p.disponivel_amistoso_ate is not null
        and p.disponivel_amistoso_ate > now()
      ) as disponivel_amistoso,
      coalesce(ue.vitorias, 0)::integer as vitorias,
      coalesce(ue.derrotas, 0)::integer as derrotas,
      ue.posicao_rank::integer as posicao_rank,
      row_number() over (
        partition by ue.usuario_id
        order by ue.nota_eid desc nulls last, ue.pontos_ranking desc nulls last, ue.esporte_id asc
      ) as rn
    from public.usuario_eid ue
    join public.profiles p on p.id = ue.usuario_id
    left join public.esportes e on e.id = ue.esporte_id
    where ue.usuario_id <> p_viewer_id
      and (p_esporte_id is null or ue.esporte_id = p_esporte_id)
      and exists (
        select 1
        from public.usuario_papeis upa
        where upa.usuario_id = ue.usuario_id
          and upa.papel = 'atleta'
      )
  ),
  expanded as (
    select
      r.usuario_id,
      r.nome,
      r.localizacao,
      r.esporte_id,
      r.esporte_nome,
      r.dist_km,
      r.nota_eid,
      r.pontos_ranking,
      unnest(r.mods) as modalidade_match,
      r.interesse_match,
      r.avatar_url,
      r.disponivel_amistoso,
      r.vitorias,
      r.derrotas,
      r.posicao_rank
    from ranked r
    where (p_esporte_id is not null or r.rn = 1)
  )
  select
    e.usuario_id,
    e.nome,
    e.localizacao,
    e.esporte_id,
    e.esporte_nome,
    e.dist_km,
    e.nota_eid,
    e.pontos_ranking,
    e.modalidade_match,
    e.interesse_match,
    e.avatar_url,
    e.disponivel_amistoso,
    e.vitorias,
    e.derrotas,
    e.posicao_rank
  from expanded e
  where e.dist_km <= greatest(1, p_raio_km)
  order by e.disponivel_amistoso desc, e.dist_km asc, e.nome asc, e.modalidade_match asc
  limit greatest(1, p_limit);
$$;

revoke all on function public.buscar_match_atletas(uuid, double precision, double precision, bigint, integer, integer) from public;
grant execute on function public.buscar_match_atletas(uuid, double precision, double precision, bigint, integer, integer) to authenticated;

-- 2) Sugestões / busca global: atletas = com papel atleta
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
    and exists (
      select 1
      from public.usuario_papeis upa
      where upa.usuario_id = p.id
        and upa.papel = 'atleta'
    )
    and (
      strpos(public.fold_search_text(p.nome), public.fold_search_text(p_search)) > 0
      or strpos(public.fold_search_text(p.username), public.fold_search_text(p_search)) > 0
    )
  limit least(coalesce(nullif(p_limit, 0), 12), 100);
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
    and exists (
      select 1
      from public.usuario_papeis upa
      where upa.usuario_id = p.id
        and upa.papel = 'atleta'
    )
    and (
      strpos(public.fold_search_text(p.nome), public.fold_search_text(p_search)) > 0
      or strpos(public.fold_search_text(p.username), public.fold_search_text(p_search)) > 0
    )
  limit least(coalesce(nullif(p_limit, 0), 28), 100);
$$;

-- 3) Admin push / ferramentas: qualquer perfil por nome ou @ (sem exigir papel atleta)
create or replace function public.api_fold_search_profiles_admin(
  p_search text,
  p_exclude_user uuid default null,
  p_limit int default 15
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
  limit least(coalesce(nullif(p_limit, 0), 15), 100);
$$;

revoke all on function public.api_fold_search_profiles_admin(text, uuid, int) from public;
grant execute on function public.api_fold_search_profiles_admin(text, uuid, int) to authenticated;
grant execute on function public.api_fold_search_profiles_admin(text, uuid, int) to service_role;
