-- EID coletivo: loops de transbordo para membros sem linha NULL (criador_id ausente).
-- Um único NULL no UNION fazia eid_apply_usuario_delta(uuid nulo) e abortava o trigger
-- após aplicar o vencedor — perdedor (time + membros) ficava sem atualização.

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
      select x.usuario_id
      from (
        select t.criador_id as usuario_id
        from public.times t
        where t.id = v_winner_team
        union
        select mt.usuario_id
        from public.membros_time mt
        where mt.time_id = v_winner_team
          and lower(coalesce(mt.status, '')) in ('ativo', 'aceito', 'aprovado')
      ) x
      where x.usuario_id is not null
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
      select x.usuario_id
      from (
        select t.criador_id as usuario_id
        from public.times t
        where t.id = v_loser_team
        union
        select mt.usuario_id
        from public.membros_time mt
        where mt.time_id = v_loser_team
          and lower(coalesce(mt.status, '')) in ('ativo', 'aceito', 'aprovado')
      ) x
      where x.usuario_id is not null
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
