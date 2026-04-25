-- Hardening do fluxo de desafio:
-- 1) Restringe autoaprovação de resultados para usuário autenticado apenas no próprio escopo.
-- 2) Normaliza mensagens de notificações do tipo "match" para "desafio" no texto exibido ao usuário.

create or replace function public.auto_aprovar_resultados_pendentes (
  p_only_user uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_horas int;
  v_count int := 0;
  r record;
  v_p1 uuid;
  v_p2 uuid;
begin
  -- Usuário autenticado comum só pode processar o próprio escopo.
  if current_user = 'authenticated' then
    if auth.uid() is null then
      raise exception 'Não autenticado';
    end if;
    if p_only_user is null or p_only_user is distinct from auth.uid() then
      raise exception 'Escopo inválido para autoaprovação';
    end if;
  end if;

  select coalesce(
    (
      select
        case jsonb_typeof(ac.value_json)
          when 'number' then greatest(1, least(168, (ac.value_json::text)::int))
          when 'object' then greatest(1, least(168, coalesce(nullif((ac.value_json->>'horas'), '')::int, 24)))
          else 24
        end
      from public.app_config ac
      where ac.key = 'match_resultado_autoaprovacao_horas'
    ),
    24
  ) into v_horas;

  for r in
    select p.id, p.esporte_id, p.jogador1_id, p.jogador2_id, p.desafiante_id, p.desafiado_id, p.usuario_id
    from public.partidas p
    where p.torneio_id is null
      and lower(trim(coalesce(p.status, ''))) = 'aguardando_confirmacao'
      and coalesce(p.data_resultado, p.data_registro, p.data_partida) <= now() - make_interval(hours => v_horas)
      and (
        p_only_user is null
        or p_only_user in (p.jogador1_id, p.jogador2_id, p.usuario_id, p.desafiante_id, p.desafiado_id)
      )
  loop
    update public.partidas
    set
      status = 'concluida',
      status_ranking = coalesce(nullif(status_ranking, ''), 'validado'),
      data_validacao = now(),
      data_resultado = coalesce(data_resultado, now())
    where id = r.id;

    v_p1 := coalesce(r.desafiante_id, r.jogador1_id, r.usuario_id);
    v_p2 := coalesce(r.desafiado_id, r.jogador2_id);

    if v_p1 is not null and v_p2 is not null and r.esporte_id is not null then
      update public.matches m
      set status = 'Concluido', data_confirmacao = now()
      where m.id = (
        select m2.id
        from public.matches m2
        where m2.finalidade = 'ranking'
          and m2.esporte_id = r.esporte_id
          and m2.status = 'Aceito'
          and (
            (m2.usuario_id = v_p1 and m2.adversario_id = v_p2)
            or (m2.usuario_id = v_p2 and m2.adversario_id = v_p1)
          )
        order by m2.data_confirmacao asc nulls last, m2.id asc
        limit 1
      );
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.auto_aprovar_resultados_pendentes (uuid) from public;
grant execute on function public.auto_aprovar_resultados_pendentes (uuid) to authenticated;
grant execute on function public.auto_aprovar_resultados_pendentes (uuid) to service_role;

create or replace function public.responder_pedido_match (p_match_id bigint, p_aceitar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_usuario uuid;
  v_status text;
  v_adv uuid;
  v_fin text;
  v_pending_limit int;
  v_pending_count_adv int;
  v_pending_count_usuario int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select usuario_id, status, adversario_id, coalesce(m.finalidade, 'ranking')
  into v_usuario, v_status, v_adv, v_fin
  from public.matches m
  where m.id = p_match_id;

  if v_usuario is null then
    raise exception 'Pedido não encontrado';
  end if;
  if v_adv is distinct from v_uid then
    raise exception 'Sem permissão para responder este pedido';
  end if;
  if v_status is distinct from 'Pendente' then
    raise exception 'Este pedido já foi respondido';
  end if;

  if p_aceitar and v_fin = 'ranking' then
    select coalesce(
      (
        select
          case jsonb_typeof(ac.value_json)
            when 'number' then greatest(1, least(20, (ac.value_json::text)::int))
            when 'object' then greatest(1, least(20, coalesce(nullif((ac.value_json->>'limite'), '')::int, 2)))
            else 2
          end
        from public.app_config ac
        where ac.key = 'match_rank_pending_result_limit'
      ),
      2
    ) into v_pending_limit;

    select
      (
        select count(*)
        from public.matches x
        where x.finalidade = 'ranking'
          and x.status = 'Aceito'
          and (x.usuario_id = v_uid or x.adversario_id = v_uid)
      ) +
      (
        select count(*)
        from public.partidas p
        where p.torneio_id is null
          and (
            p.jogador1_id = v_uid
            or p.jogador2_id = v_uid
            or p.usuario_id = v_uid
            or p.desafiante_id = v_uid
            or p.desafiado_id = v_uid
          )
          and lower(trim(coalesce(p.status, ''))) in ('agendada', 'aguardando_confirmacao')
      )
    into v_pending_count_adv;

    select
      (
        select count(*)
        from public.matches x
        where x.finalidade = 'ranking'
          and x.status = 'Aceito'
          and (x.usuario_id = v_usuario or x.adversario_id = v_usuario)
      ) +
      (
        select count(*)
        from public.partidas p
        where p.torneio_id is null
          and (
            p.jogador1_id = v_usuario
            or p.jogador2_id = v_usuario
            or p.usuario_id = v_usuario
            or p.desafiante_id = v_usuario
            or p.desafiado_id = v_usuario
          )
          and lower(trim(coalesce(p.status, ''))) in ('agendada', 'aguardando_confirmacao')
      )
    into v_pending_count_usuario;

    if v_pending_count_adv >= v_pending_limit then
      raise exception 'Você atingiu o limite de desafios de ranking pendentes.';
    end if;
    if v_pending_count_usuario >= v_pending_limit then
      raise exception 'O desafiante atingiu o limite de desafios de ranking pendentes.';
    end if;
  end if;

  if p_aceitar then
    update public.matches
    set
      status = 'Aceito',
      data_confirmacao = now()
    where id = p_match_id;

    insert into public.notificacoes (
      usuario_id,
      mensagem,
      tipo,
      referencia_id,
      lida,
      remetente_id,
      data_criacao
    )
    values (
      v_usuario,
      case
        when v_fin = 'amistoso' then
          'Seu pedido de desafio amistoso foi aceito. Use o WhatsApp para combinar — sem pontos de ranking e sem agenda obrigatória.'
        else
          'Seu pedido de desafio de ranking foi aceito. Se não houver acordo de data, vocês podem usar o fluxo de cancelamento com confirmação.'
      end,
      'match',
      p_match_id,
      false,
      v_uid,
      now()
    );
  else
    update public.matches
    set
      status = 'Recusado',
      data_confirmacao = now()
    where id = p_match_id;

    insert into public.notificacoes (
      usuario_id,
      mensagem,
      tipo,
      referencia_id,
      lida,
      remetente_id,
      data_criacao
    )
    values (
      v_usuario,
      case
        when v_fin = 'amistoso' then 'Seu pedido de desafio amistoso foi recusado.'
        else 'Seu pedido de desafio de ranking foi recusado.'
      end,
      'match',
      p_match_id,
      false,
      v_uid,
      now()
    );
  end if;
end;
$$;

revoke all on function public.responder_pedido_match (bigint, boolean) from public;
grant execute on function public.responder_pedido_match (bigint, boolean) to authenticated;

create or replace function public.processar_pendencias_cancelamento_match (
  p_only_user uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  r record;
  v_winner uuid;
begin
  if current_user = 'authenticated' then
    if auth.uid() is null then
      raise exception 'Não autenticado';
    end if;
    if p_only_user is null or p_only_user is distinct from auth.uid() then
      raise exception 'Escopo inválido para processamento de cancelamento';
    end if;
  end if;

  for r in
    select m.*
    from public.matches m
    where m.status = 'CancelamentoPendente'
      and m.cancel_response_deadline_at is not null
      and m.cancel_response_deadline_at <= now()
      and (
        p_only_user is null
        or p_only_user in (m.usuario_id, m.adversario_id)
      )
  loop
    update public.matches
    set status = 'Cancelado', data_confirmacao = now()
    where id = r.id;

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values
      (r.usuario_id, 'Cancelamento automático: não houve resposta ao pedido em 24h.', 'match', r.id, false, null, now()),
      (r.adversario_id, 'Cancelamento automático: não houve resposta ao pedido em 24h.', 'match', r.id, false, null, now());

    v_count := v_count + 1;
  end loop;

  for r in
    select m.*
    from public.matches m
    where m.status = 'ReagendamentoPendente'
      and m.reschedule_deadline_at is not null
      and m.reschedule_deadline_at <= now()
      and (
        p_only_user is null
        or p_only_user in (m.usuario_id, m.adversario_id)
      )
  loop
    update public.matches
    set status = 'Cancelado', data_confirmacao = now()
    where id = r.id;

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values
      (r.usuario_id, 'Cancelamento automático: nenhuma opção de reagendamento foi aceita na janela de 72h.', 'match', r.id, false, null, now()),
      (r.adversario_id, 'Cancelamento automático: nenhuma opção de reagendamento foi aceita na janela de 72h.', 'match', r.id, false, null, now());

    v_count := v_count + 1;
  end loop;

  for r in
    select m.*
    from public.matches m
    where m.status = 'Aceito'
      and m.wo_auto_if_no_result is true
      and m.scheduled_for is not null
      and m.scheduled_for <= now() - interval '24 hours'
      and (
        p_only_user is null
        or p_only_user in (m.usuario_id, m.adversario_id)
      )
  loop
    v_winner := r.cancel_requested_by;
    if v_winner is null then
      continue;
    end if;

    update public.partidas p
    set
      status = 'concluida',
      status_ranking = coalesce(nullif(p.status_ranking, ''), 'validado'),
      placar_1 = case when p.jogador1_id = v_winner then 1 else 0 end,
      placar_2 = case when p.jogador2_id = v_winner then 1 else 0 end,
      mensagem = coalesce(p.mensagem, 'W.O. automático por ausência de resultado no prazo de 24h após data reagendada.'),
      data_resultado = coalesce(p.data_resultado, now()),
      data_validacao = now()
    where p.id = (
      select p2.id
      from public.partidas p2
      where p2.torneio_id is null
        and p2.esporte_id = r.esporte_id
        and (
          (p2.jogador1_id = r.usuario_id and p2.jogador2_id = r.adversario_id)
          or (p2.jogador1_id = r.adversario_id and p2.jogador2_id = r.usuario_id)
        )
        and lower(trim(coalesce(p2.status, ''))) in ('agendada', 'aguardando_confirmacao')
      order by p2.id desc
      limit 1
    );

    update public.matches
    set
      status = 'Concluido',
      data_confirmacao = now(),
      wo_auto_if_no_result = false,
      cancel_requested_by = null
    where id = r.id;

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values
      (r.usuario_id, 'Resultado encerrado por W.O. automático após prazo do reagendamento.', 'match', r.id, false, null, now()),
      (r.adversario_id, 'Resultado encerrado por W.O. automático após prazo do reagendamento.', 'match', r.id, false, null, now());

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.processar_pendencias_cancelamento_match (uuid) from public;
grant execute on function public.processar_pendencias_cancelamento_match (uuid) to authenticated;
grant execute on function public.processar_pendencias_cancelamento_match (uuid) to service_role;

create or replace function public.tr_notificacoes_match_para_desafio ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo = 'match' and new.mensagem is not null then
    new.mensagem := regexp_replace(new.mensagem, '\mMatch\M', 'Desafio', 'g');
    new.mensagem := regexp_replace(new.mensagem, '\mmatch\M', 'desafio', 'g');
  end if;
  return new;
end;
$$;

drop trigger if exists tr_notificacoes_before_match_desafio on public.notificacoes;
create trigger tr_notificacoes_before_match_desafio
before insert or update on public.notificacoes
for each row
execute function public.tr_notificacoes_match_para_desafio ();
