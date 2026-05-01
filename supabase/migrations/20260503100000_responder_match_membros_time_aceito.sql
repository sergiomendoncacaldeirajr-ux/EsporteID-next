-- Ao aceitar desafio de dupla/time: notificar membros do time desafiado (exceto o capitão que respondeu).

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
  v_adv_time_id bigint;
  v_challenger_nome text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select
    m.usuario_id,
    m.status,
    m.adversario_id,
    coalesce(m.finalidade, 'ranking'),
    m.adversario_time_id
  into v_usuario, v_status, v_adv, v_fin, v_adv_time_id
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

    select count(*)
    into v_pending_count_adv
    from public.matches x
    where x.finalidade = 'ranking'
      and x.status in ('Pendente', 'Aceito', 'CancelamentoPendente', 'ReagendamentoPendente')
      and (x.usuario_id = v_uid or x.adversario_id = v_uid);

    select count(*)
    into v_pending_count_usuario
    from public.matches x
    where x.finalidade = 'ranking'
      and x.status in ('Pendente', 'Aceito', 'CancelamentoPendente', 'ReagendamentoPendente')
      and (x.usuario_id = v_usuario or x.adversario_id = v_usuario);

    if v_pending_count_adv > v_pending_limit then
      raise exception 'Você atingiu o limite de jogos de ranking pendentes.';
    end if;
    if v_pending_count_usuario > v_pending_limit then
      raise exception 'O desafiante atingiu o limite de jogos de ranking pendentes.';
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

    if v_adv_time_id is not null and v_fin = 'ranking' then
      select nome into v_challenger_nome from public.profiles where id = v_usuario;

      insert into public.notificacoes (
        usuario_id,
        mensagem,
        tipo,
        referencia_id,
        lida,
        remetente_id,
        data_criacao
      )
      select
        mt.usuario_id,
        case
          when v_challenger_nome is not null and length(trim(v_challenger_nome)) > 0
          then
            'Seu capitão aceitou o desafio de ranking de '
            || trim(v_challenger_nome)
            || '. Acompanhe a agenda e combine data/local com a outra formação.'
          else
            'Seu capitão aceitou um desafio de ranking. Acompanhe a agenda e combine com a outra formação.'
        end,
        'match',
        p_match_id,
        false,
        v_uid,
        now()
      from public.membros_time mt
      where mt.time_id = v_adv_time_id
        and mt.usuario_id is distinct from v_uid
        and mt.status in ('ativo', 'aceito', 'aprovado');
    end if;
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
