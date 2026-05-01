-- Radar dupla/time: não retornar a própria formação quando o viewer é membro do elenco (não só capitão).
-- Assim, com desafio pendente de aceite do líder, o time/dupla não aparece como “sugestão” para os demais membros.

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
  disponivel_amistoso boolean,
  vitorias integer,
  derrotas integer
)
language sql
security definer
set search_path = public
as $$
  with kind as (
    select
      case
        when lower(trim(coalesce(p_tipo, ''))) = 'dupla' then 'dupla'
        else 'time'
      end as p_kind
  ),
  mine as (
    select exists (
      select 1
      from public.times mt
      cross join kind k
      where (
        case when lower(trim(coalesce(mt.tipo, ''))) = 'dupla' then 'dupla' else 'time' end
      ) = k.p_kind
        and (p_esporte_id is null or mt.esporte_id = p_esporte_id)
        and (
          mt.criador_id = p_viewer_id
          or exists (
            select 1
            from public.membros_time m
            where m.time_id = mt.id
              and m.usuario_id = p_viewer_id
              and m.status in ('ativo', 'aceito', 'aprovado')
          )
        )
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
    ) as disponivel_amistoso,
    coalesce(t.vitorias, 0)::integer as vitorias,
    coalesce(t.derrotas, 0)::integer as derrotas
  from public.times t
  cross join kind k
  cross join mine m
  left join public.esportes e on e.id = t.esporte_id
  left join public.profiles cp on cp.id = t.criador_id
  where (
    case when lower(trim(coalesce(t.tipo, ''))) = 'dupla' then 'dupla' else 'time' end
  ) = k.p_kind
    and (p_esporte_id is null or t.esporte_id = p_esporte_id)
    and t.criador_id is distinct from p_viewer_id
    and not exists (
      select 1
      from public.membros_time m
      where m.time_id = t.id
        and m.usuario_id = p_viewer_id
        and m.status in ('ativo', 'aceito', 'aprovado')
    )
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

revoke all on function public.buscar_match_formacoes(uuid, text, double precision, double precision, bigint, integer, integer) from public;
grant execute on function public.buscar_match_formacoes(uuid, text, double precision, double precision, bigint, integer, integer) to authenticated;
