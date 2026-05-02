-- Aceite de ranking: mesma lógica de pendências que solicitar_desafio_match (individual vs formação, matches + partidas, por esporte).

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
  v_desafiante_time_id bigint;
  v_esporte_id bigint;
  v_mod text;
  v_challenger_nome text;
  v_acceptor_nome text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select
    m.usuario_id,
    m.status,
    m.adversario_id,
    coalesce(m.finalidade, 'ranking'),
    m.adversario_time_id,
    m.desafiante_time_id,
    m.esporte_id,
    lower(trim(coalesce(m.modalidade_confronto, m.tipo, '')))
  into v_usuario, v_status, v_adv, v_fin, v_adv_time_id, v_desafiante_time_id, v_esporte_id, v_mod
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

    v_mod := lower(trim(coalesce(v_mod, '')));
    if v_mod = 'atleta' then
      v_mod := 'individual';
    end if;
    if v_mod not in ('individual', 'dupla', 'time') then
      v_mod := 'individual';
    end if;

    if v_mod = 'individual'
      or v_adv_time_id is null
      or v_desafiante_time_id is null
    then
      select
        (
          select count(*)
          from public.matches m
          where m.finalidade = 'ranking'
            and (v_esporte_id is null or m.esporte_id = v_esporte_id)
            and m.status in ('Pendente', 'Aceito', 'CancelamentoPendente', 'ReagendamentoPendente')
            and lower(trim(coalesce(m.modalidade_confronto, m.tipo, ''))) = 'individual'
            and (m.usuario_id = v_uid or m.adversario_id = v_uid)
        )
        +
        (
          select count(*)
          from public.partidas p
          where (v_esporte_id is null or p.esporte_id = v_esporte_id)
            and p.torneio_id is null
            and lower(trim(coalesce(p.status, ''))) in ('agendada', 'aguardando_confirmacao')
            and (
              lower(trim(coalesce(p.modalidade, ''))) = 'individual'
              or (
                p.modalidade is null
                and coalesce(p.time1_id, 0) = 0
                and coalesce(p.time2_id, 0) = 0
              )
            )
            and (
              p.jogador1_id = v_uid
              or p.jogador2_id = v_uid
              or p.usuario_id = v_uid
              or p.desafiante_id = v_uid
              or p.desafiado_id = v_uid
            )
        )
      into v_pending_count_adv;

      select
        (
          select count(*)
          from public.matches m
          where m.finalidade = 'ranking'
            and (v_esporte_id is null or m.esporte_id = v_esporte_id)
            and m.status in ('Pendente', 'Aceito', 'CancelamentoPendente', 'ReagendamentoPendente')
            and lower(trim(coalesce(m.modalidade_confronto, m.tipo, ''))) = 'individual'
            and (m.usuario_id = v_usuario or m.adversario_id = v_usuario)
        )
        +
        (
          select count(*)
          from public.partidas p
          where (v_esporte_id is null or p.esporte_id = v_esporte_id)
            and p.torneio_id is null
            and lower(trim(coalesce(p.status, ''))) in ('agendada', 'aguardando_confirmacao')
            and (
              lower(trim(coalesce(p.modalidade, ''))) = 'individual'
              or (
                p.modalidade is null
                and coalesce(p.time1_id, 0) = 0
                and coalesce(p.time2_id, 0) = 0
              )
            )
            and (
              p.jogador1_id = v_usuario
              or p.jogador2_id = v_usuario
              or p.usuario_id = v_usuario
              or p.desafiante_id = v_usuario
              or p.desafiado_id = v_usuario
            )
        )
      into v_pending_count_usuario;
    else
      select
        (
          select count(*)
          from public.matches m
          where m.finalidade = 'ranking'
            and (v_esporte_id is null or m.esporte_id = v_esporte_id)
            and m.status in ('Pendente', 'Aceito', 'CancelamentoPendente', 'ReagendamentoPendente')
            and lower(trim(coalesce(m.modalidade_confronto, m.tipo, ''))) in ('dupla', 'time')
            and (
              m.desafiante_time_id = v_adv_time_id
              or m.adversario_time_id = v_adv_time_id
            )
        )
        +
        (
          select count(*)
          from public.partidas p
          where (v_esporte_id is null or p.esporte_id = v_esporte_id)
            and p.torneio_id is null
            and lower(trim(coalesce(p.modalidade, ''))) in ('dupla', 'time')
            and (p.time1_id = v_adv_time_id or p.time2_id = v_adv_time_id)
            and lower(trim(coalesce(p.status, ''))) in ('agendada', 'aguardando_confirmacao')
        )
      into v_pending_count_adv;

      select
        (
          select count(*)
          from public.matches m
          where m.finalidade = 'ranking'
            and (v_esporte_id is null or m.esporte_id = v_esporte_id)
            and m.status in ('Pendente', 'Aceito', 'CancelamentoPendente', 'ReagendamentoPendente')
            and lower(trim(coalesce(m.modalidade_confronto, m.tipo, ''))) in ('dupla', 'time')
            and (
              m.desafiante_time_id = v_desafiante_time_id
              or m.adversario_time_id = v_desafiante_time_id
            )
        )
        +
        (
          select count(*)
          from public.partidas p
          where (v_esporte_id is null or p.esporte_id = v_esporte_id)
            and p.torneio_id is null
            and lower(trim(coalesce(p.modalidade, ''))) in ('dupla', 'time')
            and (p.time1_id = v_desafiante_time_id or p.time2_id = v_desafiante_time_id)
            and lower(trim(coalesce(p.status, ''))) in ('agendada', 'aguardando_confirmacao')
        )
      into v_pending_count_usuario;
    end if;

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

    select nome into v_acceptor_nome from public.profiles where id = v_uid;
    select nome into v_challenger_nome from public.profiles where id = v_usuario;

    -- Membros do time desafiado (exceto quem aceitou), quando há elenco coletivo
    if v_adv_time_id is not null then
      if v_fin = 'ranking' then
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
      else
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
              'Seu capitão aceitou o desafio amistoso de '
              || trim(v_challenger_nome)
              || '. Combine pelo WhatsApp com a outra formação (sem agenda obrigatória na plataforma).'
            else
              'Seu capitão aceitou um desafio amistoso. Combine pelo WhatsApp com a outra formação.'
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
    end if;

    -- Membros do time desafiante (exceto o capitão desafiante que já recebeu a linha acima)
    if v_desafiante_time_id is not null then
      if v_fin = 'ranking' then
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
            when v_acceptor_nome is not null and length(trim(v_acceptor_nome)) > 0
            then
              'O desafio de ranking foi aceito por '
              || trim(v_acceptor_nome)
              || '. Acompanhe a agenda na Comunidade e combine data/local com a outra formação.'
            else
              'O desafio de ranking foi aceito. Acompanhe a agenda na Comunidade e combine com a outra formação.'
          end,
          'match',
          p_match_id,
          false,
          v_uid,
          now()
        from public.membros_time mt
        where mt.time_id = v_desafiante_time_id
          and mt.usuario_id is distinct from v_usuario
          and mt.status in ('ativo', 'aceito', 'aprovado');
      else
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
            when v_acceptor_nome is not null and length(trim(v_acceptor_nome)) > 0
            then
              'O desafio amistoso foi aceito por '
              || trim(v_acceptor_nome)
              || '. Combine pelo WhatsApp com a outra formação (sem agenda obrigatória na plataforma).'
            else
              'O desafio amistoso foi aceito. Combine pelo WhatsApp com a outra formação.'
          end,
          'match',
          p_match_id,
          false,
          v_uid,
          now()
        from public.membros_time mt
        where mt.time_id = v_desafiante_time_id
          and mt.usuario_id is distinct from v_usuario
          and mt.status in ('ativo', 'aceito', 'aprovado');
      end if;
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
