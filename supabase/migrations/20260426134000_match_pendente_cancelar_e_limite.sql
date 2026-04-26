-- Ajustes de fluxo ranking/desafio:
-- 1) pedido pendente pode ser cancelado pelo desafiante (e some da fila);
-- 2) aceite de pedido usa contagem completa de pendências, sem bloquear no exato limite
--    por causa do próprio pedido que já está contabilizado.

create or replace function public.cancelar_pedido_match_pendente (
  p_match_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select m.usuario_id, m.status
  into v_owner, v_status
  from public.matches m
  where m.id = p_match_id;

  if v_owner is null then
    raise exception 'Pedido não encontrado';
  end if;
  if v_owner is distinct from v_uid then
    raise exception 'Sem permissão para cancelar este pedido';
  end if;
  if v_status is distinct from 'Pendente' then
    raise exception 'Este pedido já foi respondido';
  end if;

  update public.matches
  set
    status = 'Cancelado',
    data_confirmacao = now()
  where id = p_match_id
    and usuario_id = v_uid
    and status = 'Pendente';
end;
$$;

revoke all on function public.cancelar_pedido_match_pendente (bigint) from public;
grant execute on function public.cancelar_pedido_match_pendente (bigint) to authenticated;

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

    -- O pedido atual já está contabilizado como pendente e seguirá contabilizado após aceite.
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
