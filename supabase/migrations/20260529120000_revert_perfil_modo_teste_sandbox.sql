-- Reverte sandbox de modo teste (RLS + RPCs) e remove colunas/trigger associados.
-- Motivo: checagens por linha com subconsulta em profiles degradavam desempenho.

-- 1) RPCs do radar (versão anterior ao 20260526120000, sem filtro de sandbox)
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
    and not exists (
      select 1
      from public.matches mm
      where mm.finalidade = 'ranking'
        and mm.status = 'Pendente'
        and lower(trim(coalesce(mm.modalidade_confronto, mm.tipo, ''))) in ('dupla', 'time')
        and mm.desafiante_time_id is not null
        and mm.adversario_time_id is not null
        and (
          (
            mm.desafiante_time_id = t.id
            and exists (
              select 1
              from public.times tx
              where tx.id = mm.adversario_time_id
                and (
                  tx.criador_id = p_viewer_id
                  or exists (
                    select 1
                    from public.membros_time mv
                    where mv.time_id = tx.id
                      and mv.usuario_id = p_viewer_id
                      and mv.status in ('ativo', 'aceito', 'aprovado')
                  )
                )
            )
          )
          or (
            mm.adversario_time_id = t.id
            and exists (
              select 1
              from public.times tx
              where tx.id = mm.desafiante_time_id
                and (
                  tx.criador_id = p_viewer_id
                  or exists (
                    select 1
                    from public.membros_time mv
                    where mv.time_id = tx.id
                      and mv.usuario_id = p_viewer_id
                      and mv.status in ('ativo', 'aceito', 'aprovado')
                  )
                )
            )
          )
        )
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

-- 2) RLS (como antes do isolamento por modo teste)
drop policy if exists "profiles_select_visibility_sandbox" on public.profiles;
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

drop policy if exists "usuario_eid_select_ranking_public" on public.usuario_eid;
create policy "usuario_eid_select_ranking_public"
  on public.usuario_eid for select
  to authenticated
  using (true);

drop policy if exists "times_read" on public.times;
create policy "times_read"
  on public.times for select
  to authenticated
  using (true);

drop policy if exists "mt_read_roster_public" on public.membros_time;
create policy "mt_read_roster_public"
  on public.membros_time for select
  to authenticated
  using (true);

drop policy if exists "duplas_read_public" on public.duplas;
create policy "duplas_read_public"
  on public.duplas for select
  to authenticated
  using (true);

drop policy if exists "partidas_read_concluidas_publico" on public.partidas;
create policy "partidas_read_concluidas_publico"
  on public.partidas for select
  to authenticated
  using (
    jogador1_id is not null
    and jogador2_id is not null
    and lower(coalesce(status, '')) in (
      'encerrada',
      'finalizada',
      'concluida',
      'concluída',
      'validada'
    )
  );

-- 3) Trigger e função de bloqueio ao cliente
drop trigger if exists tr_profiles_block_client_modo_teste on public.profiles;
drop function if exists public.profiles_block_client_perfil_modo_teste_change();

-- 4) Funções só usadas pelo sandbox
drop function if exists public.eid_visible_profiles_for_match(uuid, uuid);
drop function if exists public.profiles_perfil_modo_teste_of(uuid);

drop index if exists public.idx_profiles_perfil_modo_teste;

alter table public.profiles drop column if exists perfil_modo_teste_modulos;
alter table public.profiles drop column if exists perfil_modo_teste;
