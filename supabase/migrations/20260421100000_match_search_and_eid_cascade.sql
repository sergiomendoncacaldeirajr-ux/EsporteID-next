-- Busca de Match (proximidade como prioridade) + cascata EID individual em partidas coletivas.

create or replace function public.eid_distance_km(
  p_lat1 double precision,
  p_lng1 double precision,
  p_lat2 double precision,
  p_lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select
    case
      when p_lat1 is null or p_lng1 is null or p_lat2 is null or p_lng2 is null then 99999::double precision
      else sqrt(
        power((p_lat2 - p_lat1) * 111.12, 2)
        + power((p_lng2 - p_lng1) * 111.12 * cos(radians(p_lat1)), 2)
      )
    end;
$$;

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
  interesse_match text
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
      coalesce(ue.modalidade_match, 'individual') as modalidade_match,
      coalesce(ue.interesse_match, 'ranking_e_amistoso') as interesse_match,
      row_number() over (
        partition by ue.usuario_id
        order by ue.nota_eid desc nulls last, ue.pontos_ranking desc nulls last, ue.esporte_id asc
      ) as rn
    from public.usuario_eid ue
    join public.profiles p on p.id = ue.usuario_id
    left join public.esportes e on e.id = ue.esporte_id
    where ue.usuario_id <> p_viewer_id
      and (p_esporte_id is null or ue.esporte_id = p_esporte_id)
  )
  select
    r.usuario_id,
    r.nome,
    r.localizacao,
    r.esporte_id,
    r.esporte_nome,
    r.dist_km,
    r.nota_eid,
    r.pontos_ranking,
    r.modalidade_match,
    r.interesse_match
  from ranked r
  where (p_esporte_id is not null or r.rn = 1)
    and r.dist_km <= greatest(1, p_raio_km)
  order by r.dist_km asc, r.nome asc
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
  can_challenge boolean
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
    case
      when t.disponivel_amistoso then 'ranking_e_amistoso'
      when t.interesse_rank_match then 'ranking'
      else 'ranking_e_amistoso'
    end as interesse_match,
    m.can_challenge
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
  order by dist_km asc, t.id desc
  limit greatest(1, p_limit);
$$;

revoke all on function public.buscar_match_atletas(uuid, double precision, double precision, bigint, integer, integer) from public;
grant execute on function public.buscar_match_atletas(uuid, double precision, double precision, bigint, integer, integer) to authenticated;

revoke all on function public.buscar_match_formacoes(uuid, text, double precision, double precision, bigint, integer, integer) from public;
grant execute on function public.buscar_match_formacoes(uuid, text, double precision, double precision, bigint, integer, integer) to authenticated;

alter table public.partidas
  add column if not exists eid_transbordo_processado_em timestamptz;

create or replace function public.aplicar_cascata_eid_partida_coletiva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_esporte_id bigint;
  v_time_w bigint;
  v_time_l bigint;
  v_eid_w numeric(8, 2);
  v_eid_l numeric(8, 2);
  v_pct numeric(7, 4) := 0.15;
  v_delta_base numeric(8, 4);
  v_delta_w numeric(8, 4);
  v_delta_l numeric(8, 4);
  v_delta_ind_w numeric(8, 4);
  v_delta_ind_l numeric(8, 4);
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.eid_transbordo_processado_em is not null then
    return new;
  end if;

  if lower(coalesce(new.modalidade, '')) not in ('dupla', 'time') then
    return new;
  end if;

  if lower(coalesce(new.status, '')) not in ('encerrada', 'finalizada', 'concluida', 'concluída', 'validada') then
    return new;
  end if;

  v_esporte_id := new.esporte_id;
  if v_esporte_id is null then
    return new;
  end if;

  if new.vencedor_id in (new.time1_id, new.time2_id) then
    v_time_w := new.vencedor_id;
    v_time_l := case when new.time1_id = v_time_w then new.time2_id else new.time1_id end;
  elsif coalesce(new.placar_1, 0) > coalesce(new.placar_2, 0) then
    v_time_w := new.time1_id;
    v_time_l := new.time2_id;
  elsif coalesce(new.placar_2, 0) > coalesce(new.placar_1, 0) then
    v_time_w := new.time2_id;
    v_time_l := new.time1_id;
  else
    return new;
  end if;

  if v_time_w is null or v_time_l is null then
    return new;
  end if;

  select t.eid_time into v_eid_w from public.times t where t.id = v_time_w;
  select t.eid_time into v_eid_l from public.times t where t.id = v_time_l;

  if v_eid_w is null or v_eid_l is null then
    return new;
  end if;

  select coalesce(cm.eid_pct_participacao_equipe, 15.00) / 100.0
  into v_pct
  from public.configuracoes_match cm
  where cm.id = 1;

  v_delta_base := greatest(0.08, 0.20 + abs(v_eid_w - v_eid_l) * 0.06);
  if v_eid_w < v_eid_l then
    v_delta_base := v_delta_base * (1 + least(1.5, (v_eid_l - v_eid_w) * 0.12));
  end if;

  v_delta_w := round(v_delta_base, 4);
  v_delta_l := round(-least(v_delta_base * 0.85, 2.0000), 4);
  v_delta_ind_w := round(v_delta_w * v_pct, 4);
  v_delta_ind_l := round(v_delta_l * v_pct, 4);

  update public.times
  set eid_time = greatest(0.10, round(eid_time + v_delta_w, 2))
  where id = v_time_w;

  update public.times
  set eid_time = greatest(0.10, round(eid_time + v_delta_l, 2))
  where id = v_time_l;

  with membros_w as (
    select t.criador_id as usuario_id
    from public.times t
    where t.id = v_time_w
    union
    select mt.usuario_id
    from public.membros_time mt
    where mt.time_id = v_time_w
      and lower(coalesce(mt.status, '')) in ('ativo', 'aceito', 'aprovado')
  )
  insert into public.usuario_eid (
    usuario_id,
    esporte_id,
    nota_eid,
    vitorias,
    derrotas,
    partidas_jogadas
  )
  select
    mw.usuario_id,
    v_esporte_id,
    greatest(0.10, round(coalesce(ue.nota_eid, 1.00) + v_delta_ind_w, 2)),
    coalesce(ue.vitorias, 0) + 1,
    coalesce(ue.derrotas, 0),
    coalesce(ue.partidas_jogadas, 0) + 1
  from membros_w mw
  left join public.usuario_eid ue
    on ue.usuario_id = mw.usuario_id
   and ue.esporte_id = v_esporte_id
  on conflict (usuario_id, esporte_id)
  do update set
    nota_eid = excluded.nota_eid,
    vitorias = excluded.vitorias,
    partidas_jogadas = excluded.partidas_jogadas;

  with membros_l as (
    select t.criador_id as usuario_id
    from public.times t
    where t.id = v_time_l
    union
    select mt.usuario_id
    from public.membros_time mt
    where mt.time_id = v_time_l
      and lower(coalesce(mt.status, '')) in ('ativo', 'aceito', 'aprovado')
  )
  insert into public.usuario_eid (
    usuario_id,
    esporte_id,
    nota_eid,
    vitorias,
    derrotas,
    partidas_jogadas
  )
  select
    ml.usuario_id,
    v_esporte_id,
    greatest(0.10, round(coalesce(ue.nota_eid, 1.00) + v_delta_ind_l, 2)),
    coalesce(ue.vitorias, 0),
    coalesce(ue.derrotas, 0) + 1,
    coalesce(ue.partidas_jogadas, 0) + 1
  from membros_l ml
  left join public.usuario_eid ue
    on ue.usuario_id = ml.usuario_id
   and ue.esporte_id = v_esporte_id
  on conflict (usuario_id, esporte_id)
  do update set
    nota_eid = excluded.nota_eid,
    derrotas = excluded.derrotas,
    partidas_jogadas = excluded.partidas_jogadas;

  new.impacto_eid_1 := v_delta_w;
  new.impacto_eid_2 := v_delta_l;
  new.eid_transbordo_processado_em := now();
  return new;
end;
$$;

drop trigger if exists tr_partidas_cascata_eid_coletiva on public.partidas;
create trigger tr_partidas_cascata_eid_coletiva
before update on public.partidas
for each row
execute function public.aplicar_cascata_eid_partida_coletiva();
