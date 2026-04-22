-- Amistoso: padrão desligado; quando ligado, expira após 4h (disponivel_amistoso_ate).
-- Ranking não é mais escolhido por esporte no cadastro — interesse_match fixo em 'ranking'.

alter table public.profiles
  add column if not exists disponivel_amistoso_ate timestamptz;

alter table public.times
  add column if not exists disponivel_amistoso_ate timestamptz;

alter table public.profiles
  alter column disponivel_amistoso set default false;

alter table public.times
  alter column disponivel_amistoso set default false;

update public.profiles
set
  disponivel_amistoso = false,
  disponivel_amistoso_ate = null;

update public.times
set
  disponivel_amistoso = false,
  disponivel_amistoso_ate = null;

update public.usuario_eid
set interesse_match = 'ranking'
where interesse_match is distinct from 'ranking';

alter table public.usuario_eid
  alter column interesse_match set default 'ranking';

-- CREATE OR REPLACE não altera o row type de RETURNS TABLE. Remove todas as assinaturas antigas
-- (produção pode ter menos colunas no retorno ou parâmetros com tipos diferentes).
do $drop_match_rpc$
declare
  sig text;
begin
  for sig in
    select p.oid::regprocedure::text
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('buscar_match_atletas', 'buscar_match_formacoes')
  loop
    execute format('drop function %s cascade', sig);
  end loop;
end;
$drop_match_rpc$;

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
  disponivel_amistoso boolean
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
      'ranking'::text as interesse_match,
      p.avatar_url,
      (
        coalesce(p.disponivel_amistoso, false) is true
        and p.disponivel_amistoso_ate is not null
        and p.disponivel_amistoso_ate > now()
      ) as disponivel_amistoso,
      row_number() over (
        partition by ue.usuario_id
        order by ue.nota_eid desc nulls last, ue.pontos_ranking desc nulls last, ue.esporte_id asc
      ) as rn
    from public.usuario_eid ue
    join public.profiles p on p.id = ue.usuario_id
    left join public.esportes e on e.id = ue.esporte_id
    where ue.usuario_id <> p_viewer_id
      and (p_esporte_id is null or ue.esporte_id = p_esporte_id)
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
      r.disponivel_amistoso
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
    e.disponivel_amistoso
  from expanded e
  where e.dist_km <= greatest(1, p_raio_km)
  order by e.disponivel_amistoso desc, e.dist_km asc, e.nome asc, e.modalidade_match asc
  limit greatest(1, p_limit);
$$;

create or replace function public.buscar_match_formacoes(
  p_viewer_id uuid,
  p_tipo text,
  p_lat double precision,
  p_lng double precision,
  p_esporte_id bigint default null,
  p_raio_km integer default 30,
  p_limit integer default 300
)
returns table (
  id bigint,
  nome text,
  localizacao text,
  esporte_id bigint,
  esporte_nome text,
  dist_km double precision,
  eid_time numeric,
  pontos_ranking integer,
  interesse_match text,
  can_challenge boolean,
  disponivel_amistoso boolean
)
language sql
security definer
set search_path = public
as $$
  with mine as (
    select exists (
      select 1
      from public.times mt
      where mt.criador_id = p_viewer_id
        and mt.tipo = p_tipo
        and (p_esporte_id is null or mt.esporte_id = p_esporte_id)
    ) as can_challenge
  )
  select
    t.id,
    coalesce(t.nome, initcap(coalesce(p_tipo, 'time'))) as nome,
    coalesce(t.localizacao, 'Localização não informada') as localizacao,
    t.esporte_id,
    coalesce(e.nome, 'Esporte') as esporte_nome,
    public.eid_distance_km(
      p_lat,
      p_lng,
      coalesce(nullif(t.lat, '')::double precision, cp.lat),
      coalesce(nullif(t.lng, '')::double precision, cp.lng)
    ) as dist_km,
    t.eid_time,
    t.pontos_ranking,
    'ranking'::text as interesse_match,
    m.can_challenge,
    (
      coalesce(t.disponivel_amistoso, false) is true
      and t.disponivel_amistoso_ate is not null
      and t.disponivel_amistoso_ate > now()
    ) as disponivel_amistoso
  from public.times t
  left join public.esportes e on e.id = t.esporte_id
  left join public.profiles cp on cp.id = t.criador_id
  cross join mine m
  where t.tipo = p_tipo
    and (p_esporte_id is null or t.esporte_id = p_esporte_id)
    and public.eid_distance_km(
      p_lat,
      p_lng,
      coalesce(nullif(t.lat, '')::double precision, cp.lat),
      coalesce(nullif(t.lng, '')::double precision, cp.lng)
    ) <= greatest(1, p_raio_km)
  order by
    (
      coalesce(t.disponivel_amistoso, false) is true
      and t.disponivel_amistoso_ate is not null
      and t.disponivel_amistoso_ate > now()
    ) desc,
    dist_km asc,
    t.id desc
  limit greatest(1, p_limit);
$$;

revoke all on function public.buscar_match_atletas(uuid, double precision, double precision, bigint, integer, integer) from public;
grant execute on function public.buscar_match_atletas(uuid, double precision, double precision, bigint, integer, integer) to authenticated;

revoke all on function public.buscar_match_formacoes(uuid, text, double precision, double precision, bigint, integer, integer) from public;
grant execute on function public.buscar_match_formacoes(uuid, text, double precision, double precision, bigint, integer, integer) to authenticated;
