-- Motor EID zero-base, logs auditáveis e trigger automático por partida finalizada.

alter table public.usuario_eid
  alter column nota_eid set default 0.00;

alter table public.times
  alter column eid_time set default 0.00;

update public.usuario_eid
set nota_eid = 0.00
where coalesce(nota_eid, 0) = 1.00
  and coalesce(vitorias, 0) = 0
  and coalesce(derrotas, 0) = 0
  and coalesce(partidas_jogadas, 0) = 0;

update public.times t
set eid_time = 0.00
where coalesce(t.eid_time, 0) = 1.00
  and not exists (
    select 1
    from public.historico_eid_coletivo h
    where h.time_id = t.id
  );

alter table public.partidas
  add column if not exists eid_processado_em timestamptz;

create table if not exists public.eid_config (
  id integer primary key check (id = 1),
  win_base numeric(8, 4) not null default 0.25,
  loss_base numeric(8, 4) not null default 0.15,
  wo_bonus numeric(8, 4) not null default 0.10,
  score_gap_bonus numeric(8, 4) not null default 0.05,
  double_transfer_pct numeric(8, 4) not null default 0.15,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

insert into public.eid_config (
  id,
  win_base,
  loss_base,
  wo_bonus,
  score_gap_bonus,
  double_transfer_pct
)
values (1, 0.25, 0.15, 0.10, 0.05, 0.15)
on conflict (id) do update set
  win_base = excluded.win_base,
  loss_base = excluded.loss_base,
  wo_bonus = excluded.wo_bonus,
  score_gap_bonus = excluded.score_gap_bonus,
  double_transfer_pct = excluded.double_transfer_pct;

create table if not exists public.eid_logs (
  id bigint generated always as identity primary key,
  match_id bigint references public.partidas (id) on delete set null,
  esporte_id bigint references public.esportes (id) on delete set null,
  entity_kind text not null check (entity_kind in ('usuario', 'time')),
  entity_id text not null,
  entity_profile_id uuid references public.profiles (id) on delete cascade,
  entity_time_id bigint references public.times (id) on delete cascade,
  old_score numeric(8, 2) not null,
  new_score numeric(8, 2) not null,
  change_amount numeric(10, 4) not null,
  reason text not null,
  meta jsonb,
  created_at timestamptz not null default now(),
  check (
    (entity_kind = 'usuario' and entity_profile_id is not null and entity_time_id is null)
    or
    (entity_kind = 'time' and entity_time_id is not null and entity_profile_id is null)
  )
);

create index if not exists idx_eid_logs_profile_created
  on public.eid_logs (entity_profile_id, created_at desc)
  where entity_profile_id is not null;

create index if not exists idx_eid_logs_time_created
  on public.eid_logs (entity_time_id, created_at desc)
  where entity_time_id is not null;

create index if not exists idx_eid_logs_match
  on public.eid_logs (match_id);

alter table public.eid_config enable row level security;
alter table public.eid_logs enable row level security;

drop policy if exists eid_config_select_authenticated on public.eid_config;
create policy eid_config_select_authenticated
  on public.eid_config
  for select
  to authenticated
  using (true);

drop policy if exists eid_logs_select_authenticated on public.eid_logs;
create policy eid_logs_select_authenticated
  on public.eid_logs
  for select
  to authenticated
  using (true);

create or replace function public.eid_clamp_score(p_score numeric)
returns numeric(8, 2)
language sql
immutable
as $$
  select least(10.00::numeric(8, 2), greatest(0.00::numeric(8, 2), round(coalesce(p_score, 0), 2)));
$$;

create or replace function public.eid_status_finalizado(p_status text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(trim(p_status), '')) in ('encerrada', 'finalizada', 'concluida', 'concluída', 'validada');
$$;

create or replace function public.eid_is_wo(
  p_tipo_partida text,
  p_status_ranking text,
  p_mensagem text,
  p_resultado_json text,
  p_placar text
)
returns boolean
language sql
immutable
as $$
  select concat_ws(
    ' ',
    lower(coalesce(p_tipo_partida, '')),
    lower(coalesce(p_status_ranking, '')),
    lower(coalesce(p_mensagem, '')),
    lower(coalesce(p_resultado_json, '')),
    lower(coalesce(p_placar, ''))
  ) ~ '(^|[^a-z])w\.?o($|[^a-z])|walkover';
$$;

create or replace function public.eid_has_score_gap_bonus(
  p_placar_1 integer,
  p_placar_2 integer,
  p_placar text,
  p_resultado_json text
)
returns boolean
language sql
immutable
as $$
  select
    abs(coalesce(p_placar_1, 0) - coalesce(p_placar_2, 0)) >= 4
    or concat_ws(' ', coalesce(p_placar, ''), coalesce(p_resultado_json, '')) ~ '(6[/xX-]0.*6[/xX-]0|7[/xX-]0.*7[/xX-]0)';
$$;

create or replace function public.eid_apply_time_delta(
  p_time_id bigint,
  p_esporte_id bigint,
  p_partida_id bigint,
  p_delta numeric,
  p_reason text,
  p_meta jsonb default '{}'::jsonb
)
returns numeric(8, 2)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_score numeric(8, 2);
  v_new_score numeric(8, 2);
begin
  select eid_time
  into v_old_score
  from public.times
  where id = p_time_id
  for update;

  if v_old_score is null then
    v_old_score := 0.00;
  end if;

  v_new_score := public.eid_clamp_score(v_old_score + coalesce(p_delta, 0));

  update public.times
  set eid_time = v_new_score
  where id = p_time_id;

  insert into public.historico_eid_coletivo (
    time_id,
    nota_anterior,
    nota_nova,
    data_alteracao
  )
  values (
    p_time_id,
    v_old_score,
    v_new_score,
    now()
  );

  insert into public.eid_logs (
    match_id,
    esporte_id,
    entity_kind,
    entity_id,
    entity_time_id,
    old_score,
    new_score,
    change_amount,
    reason,
    meta,
    created_at
  )
  values (
    p_partida_id,
    p_esporte_id,
    'time',
    p_time_id::text,
    p_time_id,
    v_old_score,
    v_new_score,
    round(coalesce(p_delta, 0), 4),
    p_reason,
    coalesce(p_meta, '{}'::jsonb),
    now()
  );

  return v_new_score;
end;
$$;

create or replace function public.eid_apply_usuario_delta(
  p_usuario_id uuid,
  p_esporte_id bigint,
  p_partida_id bigint,
  p_delta numeric,
  p_resultado text,
  p_reason text,
  p_meta jsonb default '{}'::jsonb
)
returns numeric(8, 2)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ue_id bigint;
  v_old_score numeric(8, 2);
  v_new_score numeric(8, 2);
  v_vitorias integer;
  v_derrotas integer;
  v_partidas integer;
begin
  select id, nota_eid, vitorias, derrotas, partidas_jogadas
  into v_ue_id, v_old_score, v_vitorias, v_derrotas, v_partidas
  from public.usuario_eid
  where usuario_id = p_usuario_id
    and esporte_id = p_esporte_id
  for update;

  if v_ue_id is null then
    insert into public.usuario_eid (
      usuario_id,
      esporte_id,
      nota_eid,
      vitorias,
      derrotas,
      partidas_jogadas
    )
    values (
      p_usuario_id,
      p_esporte_id,
      0.00,
      0,
      0,
      0
    )
    returning id, nota_eid, vitorias, derrotas, partidas_jogadas
    into v_ue_id, v_old_score, v_vitorias, v_derrotas, v_partidas;
  end if;

  v_old_score := coalesce(v_old_score, 0.00);
  v_vitorias := coalesce(v_vitorias, 0);
  v_derrotas := coalesce(v_derrotas, 0);
  v_partidas := coalesce(v_partidas, 0);
  v_new_score := public.eid_clamp_score(v_old_score + coalesce(p_delta, 0));

  update public.usuario_eid
  set
    nota_eid = v_new_score,
    vitorias = v_vitorias + case when p_resultado = 'vitoria' then 1 else 0 end,
    derrotas = v_derrotas + case when p_resultado = 'derrota' then 1 else 0 end,
    partidas_jogadas = v_partidas + 1
  where id = v_ue_id;

  insert into public.historico_eid (
    entidade_id,
    tipo_entidade,
    esporte_id,
    nota_anterior,
    nota_nova,
    partida_id,
    data_registro
  )
  values (
    v_ue_id,
    'usuario_eid',
    p_esporte_id,
    v_old_score,
    v_new_score,
    p_partida_id,
    now()
  );

  insert into public.eid_logs (
    match_id,
    esporte_id,
    entity_kind,
    entity_id,
    entity_profile_id,
    old_score,
    new_score,
    change_amount,
    reason,
    meta,
    created_at
  )
  values (
    p_partida_id,
    p_esporte_id,
    'usuario',
    p_usuario_id::text,
    p_usuario_id,
    v_old_score,
    v_new_score,
    round(coalesce(p_delta, 0), 4),
    p_reason,
    coalesce(p_meta, '{}'::jsonb),
    now()
  );

  return v_new_score;
end;
$$;

create or replace function public.processar_eid_partida_by_id(
  p_partida_id bigint,
  p_force boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partida public.partidas%rowtype;
  v_cfg public.eid_config%rowtype;
  v_modalidade text;
  v_is_final boolean;
  v_is_collective boolean;
  v_is_wo boolean;
  v_has_gap_bonus boolean;
  v_side_1_score integer;
  v_side_2_score integer;
  v_winner_user uuid;
  v_loser_user uuid;
  v_winner_team bigint;
  v_loser_team bigint;
  v_winner_score numeric(8, 2);
  v_loser_score numeric(8, 2);
  v_gap numeric(10, 4);
  v_delta_win numeric(10, 4);
  v_delta_loss numeric(10, 4);
  v_transfer_delta_win numeric(10, 4);
  v_transfer_delta_loss numeric(10, 4);
  v_reason_win text;
  v_reason_loss text;
  v_now timestamptz := now();
  v_member uuid;
begin
  select *
  into v_partida
  from public.partidas
  where id = p_partida_id
  for update;

  if v_partida.id is null then
    return false;
  end if;

  if not p_force and v_partida.eid_processado_em is not null then
    return false;
  end if;

  v_is_final := public.eid_status_finalizado(v_partida.status);
  if not v_is_final or v_partida.esporte_id is null then
    return false;
  end if;

  select *
  into v_cfg
  from public.eid_config
  where id = 1;

  if v_cfg.id is null then
    insert into public.eid_config (id) values (1)
    on conflict (id) do nothing;

    select *
    into v_cfg
    from public.eid_config
    where id = 1;
  end if;

  v_modalidade := lower(coalesce(v_partida.modalidade, v_partida.tipo_competidor, 'individual'));
  v_is_collective := v_modalidade in ('dupla', 'time')
    or (v_partida.time1_id is not null and v_partida.time2_id is not null);

  v_side_1_score := coalesce(v_partida.placar_1, v_partida.placar_desafiante);
  v_side_2_score := coalesce(v_partida.placar_2, v_partida.placar_desafiado);
  v_is_wo := public.eid_is_wo(
    v_partida.tipo_partida,
    v_partida.status_ranking,
    v_partida.mensagem,
    v_partida.resultado_json,
    v_partida.placar
  );
  v_has_gap_bonus := not v_is_wo and public.eid_has_score_gap_bonus(
    v_partida.placar_1,
    v_partida.placar_2,
    v_partida.placar,
    v_partida.resultado_json
  );

  if v_is_collective then
    if v_partida.time1_id is null or v_partida.time2_id is null then
      return false;
    end if;

    if v_partida.vencedor_id in (v_partida.time1_id, v_partida.time2_id) then
      v_winner_team := v_partida.vencedor_id;
      v_loser_team := case when v_partida.time1_id = v_winner_team then v_partida.time2_id else v_partida.time1_id end;
    elsif v_side_1_score is not null and v_side_2_score is not null and v_side_1_score <> v_side_2_score then
      v_winner_team := case when v_side_1_score > v_side_2_score then v_partida.time1_id else v_partida.time2_id end;
      v_loser_team := case when v_side_1_score > v_side_2_score then v_partida.time2_id else v_partida.time1_id end;
    else
      return false;
    end if;

    select eid_time into v_winner_score from public.times where id = v_winner_team;
    select eid_time into v_loser_score from public.times where id = v_loser_team;
    v_winner_score := coalesce(v_winner_score, 0.00);
    v_loser_score := coalesce(v_loser_score, 0.00);

    v_gap := greatest(0, v_loser_score - v_winner_score);
    v_delta_win := case
      when v_is_wo then coalesce(v_cfg.wo_bonus, 0.10)
      else coalesce(v_cfg.win_base, 0.25) + (v_gap * 0.10) + case when v_has_gap_bonus then coalesce(v_cfg.score_gap_bonus, 0.05) else 0 end
    end;

    v_gap := greatest(0, v_winner_score - v_loser_score);
    v_delta_loss := -1 * (
      coalesce(v_cfg.loss_base, 0.15)
      + (v_gap * 0.05)
    );

    v_reason_win := case
      when v_is_wo then 'Vitória por W.O.'
      when v_has_gap_bonus then 'Vitória com bônus de ampla vantagem'
      when v_loser_score > v_winner_score then 'Vitória contra oponente com EID maior'
      else 'Vitória simples'
    end;

    v_reason_loss := case
      when v_winner_score < v_loser_score then 'Derrota para oponente com EID menor'
      else 'Derrota simples'
    end;

    perform public.eid_apply_time_delta(
      v_winner_team,
      v_partida.esporte_id,
      v_partida.id,
      v_delta_win,
      v_reason_win,
      jsonb_build_object('modalidade', v_modalidade, 'transferencia', false, 'wo', v_is_wo, 'bonus_larga_vantagem', v_has_gap_bonus)
    );

    perform public.eid_apply_time_delta(
      v_loser_team,
      v_partida.esporte_id,
      v_partida.id,
      v_delta_loss,
      v_reason_loss,
      jsonb_build_object('modalidade', v_modalidade, 'transferencia', false, 'wo', v_is_wo, 'bonus_larga_vantagem', false)
    );

    v_transfer_delta_win := round(v_delta_win * coalesce(v_cfg.double_transfer_pct, 0.15), 4);
    v_transfer_delta_loss := round(v_delta_loss * coalesce(v_cfg.double_transfer_pct, 0.15), 4);

    for v_member in
      select t.criador_id as usuario_id
      from public.times t
      where t.id = v_winner_team
      union
      select mt.usuario_id
      from public.membros_time mt
      where mt.time_id = v_winner_team
        and lower(coalesce(mt.status, '')) in ('ativo', 'aceito', 'aprovado')
    loop
      perform public.eid_apply_usuario_delta(
        v_member,
        v_partida.esporte_id,
        v_partida.id,
        v_transfer_delta_win,
        'vitoria',
        format('Transbordo da %s vencedora', case when v_modalidade = 'dupla' then 'dupla' else 'equipe' end),
        jsonb_build_object(
          'modalidade', v_modalidade,
          'transferencia', true,
          'source_team_id', v_winner_team,
          'transfer_pct', coalesce(v_cfg.double_transfer_pct, 0.15),
          'base_delta', v_delta_win
        )
      );
    end loop;

    for v_member in
      select t.criador_id as usuario_id
      from public.times t
      where t.id = v_loser_team
      union
      select mt.usuario_id
      from public.membros_time mt
      where mt.time_id = v_loser_team
        and lower(coalesce(mt.status, '')) in ('ativo', 'aceito', 'aprovado')
    loop
      perform public.eid_apply_usuario_delta(
        v_member,
        v_partida.esporte_id,
        v_partida.id,
        v_transfer_delta_loss,
        'derrota',
        format('Transbordo da %s derrotada', case when v_modalidade = 'dupla' then 'dupla' else 'equipe' end),
        jsonb_build_object(
          'modalidade', v_modalidade,
          'transferencia', true,
          'source_team_id', v_loser_team,
          'transfer_pct', coalesce(v_cfg.double_transfer_pct, 0.15),
          'base_delta', v_delta_loss
        )
      );
    end loop;

    update public.partidas
    set
      impacto_eid_1 = case when v_partida.time1_id = v_winner_team then round(v_delta_win, 4) else round(v_delta_loss, 4) end,
      impacto_eid_2 = case when v_partida.time2_id = v_winner_team then round(v_delta_win, 4) else round(v_delta_loss, 4) end,
      eid_processado_em = v_now,
      eid_transbordo_processado_em = v_now
    where id = v_partida.id;

    return true;
  end if;

  v_winner_user := v_partida.jogador1_id;
  v_loser_user := v_partida.jogador2_id;

  if v_winner_user is null or v_loser_user is null then
    return false;
  end if;

  if v_side_1_score is not null and v_side_2_score is not null and v_side_1_score <> v_side_2_score then
    if v_side_2_score > v_side_1_score then
      v_winner_user := v_partida.jogador2_id;
      v_loser_user := v_partida.jogador1_id;
    end if;
  else
    return false;
  end if;

  select nota_eid into v_winner_score
  from public.usuario_eid
  where usuario_id = v_winner_user
    and esporte_id = v_partida.esporte_id;

  select nota_eid into v_loser_score
  from public.usuario_eid
  where usuario_id = v_loser_user
    and esporte_id = v_partida.esporte_id;

  v_winner_score := coalesce(v_winner_score, 0.00);
  v_loser_score := coalesce(v_loser_score, 0.00);

  v_gap := greatest(0, v_loser_score - v_winner_score);
  v_delta_win := case
    when v_is_wo then coalesce(v_cfg.wo_bonus, 0.10)
    else coalesce(v_cfg.win_base, 0.25) + (v_gap * 0.10) + case when v_has_gap_bonus then coalesce(v_cfg.score_gap_bonus, 0.05) else 0 end
  end;

  v_gap := greatest(0, v_winner_score - v_loser_score);
  v_delta_loss := -1 * (
    coalesce(v_cfg.loss_base, 0.15)
    + (v_gap * 0.05)
  );

  v_reason_win := case
    when v_is_wo then 'Vitória por W.O.'
    when v_has_gap_bonus then 'Vitória com bônus de ampla vantagem'
    when v_loser_score > v_winner_score then 'Vitória contra oponente com EID maior'
    else 'Vitória simples'
  end;

  v_reason_loss := case
    when v_winner_score < v_loser_score then 'Derrota para oponente com EID menor'
    else 'Derrota simples'
  end;

  perform public.eid_apply_usuario_delta(
    v_winner_user,
    v_partida.esporte_id,
    v_partida.id,
    v_delta_win,
    'vitoria',
    v_reason_win,
    jsonb_build_object('modalidade', v_modalidade, 'transferencia', false, 'wo', v_is_wo, 'bonus_larga_vantagem', v_has_gap_bonus)
  );

  perform public.eid_apply_usuario_delta(
    v_loser_user,
    v_partida.esporte_id,
    v_partida.id,
    v_delta_loss,
    'derrota',
    v_reason_loss,
    jsonb_build_object('modalidade', v_modalidade, 'transferencia', false, 'wo', v_is_wo, 'bonus_larga_vantagem', false)
  );

  update public.partidas
  set
    impacto_eid_1 = case when v_partida.jogador1_id = v_winner_user then round(v_delta_win, 4) else round(v_delta_loss, 4) end,
    impacto_eid_2 = case when v_partida.jogador2_id = v_winner_user then round(v_delta_win, 4) else round(v_delta_loss, 4) end,
    eid_processado_em = v_now
  where id = v_partida.id;

  return true;
end;
$$;

create or replace function public.tr_partidas_processar_eid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.eid_processado_em is not null then
    return new;
  end if;

  if not public.eid_status_finalizado(new.status) then
    return new;
  end if;

  perform public.processar_eid_partida_by_id(new.id, false);
  return new;
end;
$$;

drop trigger if exists tr_partidas_cascata_eid_coletiva on public.partidas;
drop trigger if exists tr_partidas_processar_eid on public.partidas;
create trigger tr_partidas_processar_eid
after insert or update of
  status,
  placar_1,
  placar_2,
  placar_desafiante,
  placar_desafiado,
  vencedor_id,
  perdedor_id,
  tipo_partida,
  status_ranking,
  mensagem,
  resultado_json,
  modalidade,
  time1_id,
  time2_id,
  jogador1_id,
  jogador2_id
on public.partidas
for each row
execute function public.tr_partidas_processar_eid();

create or replace function public.recalcular_eid_historico()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_partida_id bigint;
begin
  delete from public.eid_logs;
  delete from public.historico_eid;
  delete from public.historico_eid_coletivo;

  update public.usuario_eid
  set
    nota_eid = 0.00,
    vitorias = 0,
    derrotas = 0,
    partidas_jogadas = 0;

  update public.times
  set eid_time = 0.00;

  update public.partidas
  set
    impacto_eid_1 = null,
    impacto_eid_2 = null,
    eid_processado_em = null,
    eid_transbordo_processado_em = null;

  for v_partida_id in
    select p.id
    from public.partidas p
    where public.eid_status_finalizado(p.status)
    order by coalesce(p.data_resultado, p.data_partida, p.data_registro, p.criado_em, now()) asc, p.id asc
  loop
    if public.processar_eid_partida_by_id(v_partida_id, true) then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.processar_eid_partida_by_id(bigint, boolean) from public;
revoke all on function public.recalcular_eid_historico() from public;
grant execute on function public.processar_eid_partida_by_id(bigint, boolean) to service_role;
grant execute on function public.recalcular_eid_historico() to service_role;
