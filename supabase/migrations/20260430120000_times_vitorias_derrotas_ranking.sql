-- Vitórias / derrotas da formação (times/duplas) no ranking de desafio, alinhado ao individual (usuario_eid).

alter table public.times
  add column if not exists vitorias int not null default 0;

alter table public.times
  add column if not exists derrotas int not null default 0;

-- Backfill a partir de partidas de ranking coletivo já contabilizadas em pontos.
with dec as (
  select
    p.time1_id,
    p.time2_id,
    case
      when p.vencedor_id is not null and (p.vencedor_id = p.time1_id or p.vencedor_id = p.time2_id) then p.vencedor_id
      when coalesce(p.placar_1, p.placar_desafiante) is not null
        and coalesce(p.placar_2, p.placar_desafiado) is not null
        and coalesce(p.placar_1, p.placar_desafiante) is distinct from coalesce(p.placar_2, p.placar_desafiado)
      then case
        when coalesce(p.placar_1, p.placar_desafiante) > coalesce(p.placar_2, p.placar_desafiado) then p.time1_id
        else p.time2_id
      end
      else null
    end as winner_id
  from public.partidas p
  where p.torneio_id is null
    and lower(trim(coalesce(p.tipo_partida, ''))) = 'ranking'
    and p.time1_id is not null
    and p.time2_id is not null
    and p.ranking_match_pontos_em is not null
    and public.eid_status_finalizado(p.status)
),
expanded as (
  select winner_id as tid, 1 as vinc, 0 as dinc
  from dec
  where winner_id is not null
  union all
  select (case when d.winner_id = d.time1_id then d.time2_id else d.time1_id end), 0, 1
  from dec d
  where d.winner_id is not null
    and d.time1_id is not null
    and d.time2_id is not null
),
agg as (
  select tid, sum(vinc)::int as vitorias, sum(dinc)::int as derrotas
  from expanded
  group by tid
)
update public.times t
set
  vitorias = coalesce(a.vitorias, 0),
  derrotas = coalesce(a.derrotas, 0)
from agg a
where t.id = a.tid;

-- Ao aplicar pontos de ranking, incrementar vitórias/derrotas das formações.
create or replace function public.aplicar_pontos_ranking_match_desafio(p_partida_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.partidas%rowtype;
  v_pv int;
  v_pd int;
  v_modalidade text;
  v_collective boolean;
  v_s1 int;
  v_s2 int;
  v_winner_team bigint;
  v_loser_team bigint;
  v_winner_user uuid;
  v_loser_user uuid;
  v_w_pts int;
  v_l_pts int;
  v_upset int;
  v_upset_cap int;
  v_win_pts int;
  v_lose_pts int;
  v_n int;
begin
  select *
  into v_row
  from public.partidas
  where id = p_partida_id
  for update;

  if v_row.id is null then
    return;
  end if;

  if v_row.ranking_match_pontos_em is not null then
    return;
  end if;

  if v_row.eid_processado_em is null then
    return;
  end if;

  if v_row.torneio_id is not null then
    return;
  end if;

  if lower(coalesce(v_row.tipo_partida, '')) is distinct from 'ranking' then
    return;
  end if;

  if not public.eid_status_finalizado(v_row.status) then
    return;
  end if;

  select coalesce(rrm.pontos_vitoria, 10)::int
  into v_pv
  from public.regras_ranking_match rrm
  where rrm.esporte_id = v_row.esporte_id;

  if not found then
    v_pv := 10;
  end if;
  v_pd := 4;

  v_upset_cap := greatest(0, floor(v_pv * 0.2)::int);

  v_modalidade := lower(coalesce(v_row.modalidade, v_row.tipo_competidor, 'individual'));
  v_collective := v_modalidade in ('dupla', 'time')
    or (v_row.time1_id is not null and v_row.time2_id is not null);

  v_s1 := coalesce(v_row.placar_1, v_row.placar_desafiante);
  v_s2 := coalesce(v_row.placar_2, v_row.placar_desafiado);

  if v_collective then
    if v_row.time1_id is null or v_row.time2_id is null then
      return;
    end if;

    if v_row.vencedor_id in (v_row.time1_id, v_row.time2_id) then
      v_winner_team := v_row.vencedor_id;
      v_loser_team := case when v_row.time1_id = v_winner_team then v_row.time2_id else v_row.time1_id end;
    elsif v_s1 is not null and v_s2 is not null and v_s1 <> v_s2 then
      v_winner_team := case when v_s1 > v_s2 then v_row.time1_id else v_row.time2_id end;
      v_loser_team := case when v_s1 > v_s2 then v_row.time2_id else v_row.time1_id end;
    else
      return;
    end if;

    select coalesce(t.pontos_ranking, 0)::int into v_w_pts from public.times t where t.id = v_winner_team;
    select coalesce(t.pontos_ranking, 0)::int into v_l_pts from public.times t where t.id = v_loser_team;
    v_w_pts := coalesce(v_w_pts, 0);
    v_l_pts := coalesce(v_l_pts, 0);

    v_upset := case
      when v_l_pts > v_w_pts then v_upset_cap
      else 0
    end;
    v_win_pts := v_pv + v_upset;
    v_lose_pts := v_pd;

    update public.times
    set
      pontos_ranking = coalesce(pontos_ranking, 0) + v_win_pts,
      vitorias = coalesce(vitorias, 0) + 1
    where id = v_winner_team;

    update public.times
    set
      pontos_ranking = coalesce(pontos_ranking, 0) + v_lose_pts,
      derrotas = coalesce(derrotas, 0) + 1
    where id = v_loser_team;

  else
    v_winner_user := v_row.jogador1_id;
    v_loser_user := v_row.jogador2_id;

    if v_winner_user is null or v_loser_user is null then
      return;
    end if;

    if v_s1 is not null and v_s2 is not null and v_s1 <> v_s2 then
      if v_s2 > v_s1 then
        v_winner_user := v_row.jogador2_id;
        v_loser_user := v_row.jogador1_id;
      end if;
    else
      return;
    end if;

    select coalesce(ue.pontos_ranking, 0)::int into v_w_pts
    from public.usuario_eid ue
    where ue.usuario_id = v_winner_user and ue.esporte_id = v_row.esporte_id;

    select coalesce(ue.pontos_ranking, 0)::int into v_l_pts
    from public.usuario_eid ue
    where ue.usuario_id = v_loser_user and ue.esporte_id = v_row.esporte_id;

    v_w_pts := coalesce(v_w_pts, 0);
    v_l_pts := coalesce(v_l_pts, 0);

    v_upset := case
      when v_l_pts > v_w_pts then v_upset_cap
      else 0
    end;
    v_win_pts := v_pv + v_upset;
    v_lose_pts := v_pd;

    update public.usuario_eid
    set pontos_ranking = coalesce(pontos_ranking, 0) + v_win_pts
    where usuario_id = v_winner_user and esporte_id = v_row.esporte_id;
    get diagnostics v_n = row_count;
    if v_n = 0 then
      insert into public.usuario_eid (usuario_id, esporte_id, nota_eid, vitorias, derrotas, pontos_ranking, partidas_jogadas)
      values (v_winner_user, v_row.esporte_id, 0, 0, 0, v_win_pts, 0);
    end if;

    update public.usuario_eid
    set pontos_ranking = coalesce(pontos_ranking, 0) + v_lose_pts
    where usuario_id = v_loser_user and esporte_id = v_row.esporte_id;
    get diagnostics v_n = row_count;
    if v_n = 0 then
      insert into public.usuario_eid (usuario_id, esporte_id, nota_eid, vitorias, derrotas, pontos_ranking, partidas_jogadas)
      values (v_loser_user, v_row.esporte_id, 0, 0, 0, v_lose_pts, 0);
    end if;
  end if;

  update public.partidas
  set ranking_match_pontos_em = now()
  where id = p_partida_id;
end;
$$;

revoke all on function public.aplicar_pontos_ranking_match_desafio(bigint) from public;
grant execute on function public.aplicar_pontos_ranking_match_desafio(bigint) to service_role;

-- Radar: expor vitórias e derrotas da formação.
-- Postgres não permite mudar o tipo de retorno com CREATE OR REPLACE (OUT/table columns).
drop function if exists public.buscar_match_formacoes(uuid, text, double precision, double precision, bigint, integer, integer);

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
  with mine as (
    select exists (
      select 1
      from public.times mt
      where mt.criador_id = p_viewer_id
        and lower(trim(coalesce(mt.tipo, ''))) = lower(trim(coalesce(p_tipo, '')))
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
    ) as disponivel_amistoso,
    coalesce(t.vitorias, 0)::integer as vitorias,
    coalesce(t.derrotas, 0)::integer as derrotas
  from public.times t
  left join public.esportes e on e.id = t.esporte_id
  left join public.profiles cp on cp.id = t.criador_id
  cross join mine m
  where lower(trim(coalesce(t.tipo, ''))) = lower(trim(coalesce(p_tipo, '')))
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

revoke all on function public.buscar_match_formacoes(uuid, text, double precision, double precision, bigint, integer, integer) from public;
grant execute on function public.buscar_match_formacoes(uuid, text, double precision, double precision, bigint, integer, integer) to authenticated;
