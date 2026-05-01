-- Desafio ranking dupla/time: transbordo de pontos de ranking para usuario_eid de cada membro
-- (percentual de vitória e de derrota), mesmo critério do transbordo de EID (eid_config.double_transfer_pct).

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
  v_transfer_pct numeric(8, 4);
  v_pts_membro_w int;
  v_pts_membro_l int;
  v_member uuid;
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

    select coalesce(ec.double_transfer_pct, 0.15)::numeric(8, 4)
    into v_transfer_pct
    from public.eid_config ec
    where ec.id = 1;

    if not found then
      v_transfer_pct := 0.15;
    end if;

    v_pts_membro_w := greatest(0, round(v_win_pts::numeric * v_transfer_pct)::int);
    v_pts_membro_l := greatest(0, round(v_lose_pts::numeric * v_transfer_pct)::int);

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
      if v_pts_membro_w > 0 then
        update public.usuario_eid
        set pontos_ranking = coalesce(pontos_ranking, 0) + v_pts_membro_w
        where usuario_id = v_member and esporte_id = v_row.esporte_id;
        get diagnostics v_n = row_count;
        if v_n = 0 then
          insert into public.usuario_eid (usuario_id, esporte_id, nota_eid, vitorias, derrotas, pontos_ranking, partidas_jogadas)
          values (v_member, v_row.esporte_id, 0, 0, 0, v_pts_membro_w, 0);
        end if;
      end if;
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
      if v_pts_membro_l > 0 then
        update public.usuario_eid
        set pontos_ranking = coalesce(pontos_ranking, 0) + v_pts_membro_l
        where usuario_id = v_member and esporte_id = v_row.esporte_id;
        get diagnostics v_n = row_count;
        if v_n = 0 then
          insert into public.usuario_eid (usuario_id, esporte_id, nota_eid, vitorias, derrotas, pontos_ranking, partidas_jogadas)
          values (v_member, v_row.esporte_id, 0, 0, 0, v_pts_membro_l, 0);
        end if;
      end if;
    end loop;

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
