-- Desafio ranking dupla/time pendente: elenco dos dois lados recebe agenda_status (Agenda — status);
-- capitão adversário continua com notificação match (ação no Painel social).
-- Radar: não sugerir formação adversária quando já existe match Pendente entre ela e alguma formação do viewer.

create or replace function public.solicitar_desafio_match (
  p_esporte_id bigint,
  p_modalidade text,
  p_alvo_usuario_id uuid default null,
  p_alvo_time_id bigint default null,
  p_finalidade text default 'ranking'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mid bigint;
  v_adv uuid;
  v_time_id bigint;
  v_challenger_time_id bigint;
  v_challenger_nome text;
  v_time_nome text;
  v_mod text;
  t_tipo text;
  t_esporte bigint;
  t_criador uuid;
  v_fin text;
  v_meses int;
  v_pending_limit int;
  v_pending_count int;
  v_monthly_limit int;
  v_mcount int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  v_fin := lower(trim(coalesce(p_finalidade, 'ranking')));
  if v_fin not in ('ranking', 'amistoso') then
    raise exception 'Finalidade de match inválida';
  end if;

  v_mod := lower(trim(coalesce(p_modalidade, '')));
  if v_mod = 'atleta' then
    v_mod := 'individual';
  end if;
  if v_mod not in ('individual', 'dupla', 'time') then
    raise exception 'Modalidade inválida';
  end if;

  if v_fin = 'amistoso' and v_mod is distinct from 'individual' then
    raise exception 'Match amistoso está disponível apenas na modalidade individual.';
  end if;

  if p_esporte_id is null or p_esporte_id < 1 then
    raise exception 'Esporte obrigatório';
  end if;

  v_challenger_time_id := null;

  if v_mod = 'individual' then
    if p_alvo_usuario_id is null then
      raise exception 'Alvo obrigatório';
    end if;
    if p_alvo_time_id is not null then
      raise exception 'Parâmetros inválidos';
    end if;
    if p_alvo_usuario_id = v_uid then
      raise exception 'Alvo inválido';
    end if;
    if not exists (select 1 from public.profiles p where p.id = p_alvo_usuario_id) then
      raise exception 'Perfil não encontrado';
    end if;
    v_adv := p_alvo_usuario_id;
    v_time_id := null;
  else
    if p_alvo_time_id is null then
      raise exception 'Time obrigatório';
    end if;
    if p_alvo_usuario_id is not null then
      raise exception 'Parâmetros inválidos';
    end if;

    select lower(trim(coalesce(t.tipo, ''))), t.esporte_id, t.criador_id
    into t_tipo, t_esporte, t_criador
    from public.times t
    where t.id = p_alvo_time_id;

    if t_criador is null then
      raise exception 'Time não encontrado';
    end if;
    if t_tipo is distinct from v_mod then
      raise exception 'Tipo de formação não confere';
    end if;
    if t_esporte is distinct from p_esporte_id then
      raise exception 'Esporte não confere';
    end if;
    if t_criador = v_uid then
      raise exception 'Alvo inválido';
    end if;

    if not exists (
      select 1
      from public.times x
      where x.criador_id = v_uid
        and lower(trim(coalesce(x.tipo, ''))) = v_mod
        and x.esporte_id = p_esporte_id
    ) then
      raise exception 'Você precisa ser líder de uma formação neste esporte.';
    end if;

    select x.id
    into v_challenger_time_id
    from public.times x
    where x.criador_id = v_uid
      and lower(trim(coalesce(x.tipo, ''))) = v_mod
      and x.esporte_id = p_esporte_id
    limit 1;

    v_adv := t_criador;
    v_time_id := p_alvo_time_id;
  end if;

  if v_mod = 'individual' then
    if not exists (
      select 1 from public.usuario_eid ue
      where ue.usuario_id = v_uid and ue.esporte_id = p_esporte_id
    ) then
      raise exception 'Você não possui este esporte no perfil. O desafio deve ser no mesmo esporte para ambos.';
    end if;
    if not exists (
      select 1 from public.usuario_eid ue
      where ue.usuario_id = v_adv and ue.esporte_id = p_esporte_id
    ) then
      raise exception 'O oponente não possui este esporte no perfil. O desafio deve ser no mesmo esporte para ambos.';
    end if;
  end if;

  if v_fin = 'amistoso' then
    if not exists (
      select 1 from public.profiles p
      where p.id = v_uid
        and coalesce(p.disponivel_amistoso, false) is true
        and p.disponivel_amistoso_ate is not null
        and p.disponivel_amistoso_ate > now()
    ) then
      raise exception 'Ative o modo amistoso no seu perfil para solicitar match amistoso.';
    end if;
    if not exists (
      select 1 from public.profiles p
      where p.id = v_adv
        and coalesce(p.disponivel_amistoso, false) is true
        and p.disponivel_amistoso_ate is not null
        and p.disponivel_amistoso_ate > now()
    ) then
      raise exception 'O oponente não está com modo amistoso ativo no momento.';
    end if;
  end if;

  if v_fin = 'ranking' then
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

    select coalesce(
      (
        select
          case jsonb_typeof(ac.value_json)
            when 'number' then greatest(1, least(60, (ac.value_json::text)::int))
            when 'object' then greatest(1, least(60, coalesce(nullif((ac.value_json->>'limite'), '')::int, 4)))
            else 4
          end
        from public.app_config ac
        where ac.key = 'match_rank_monthly_limit_per_sport'
      ),
      4
    ) into v_monthly_limit;

    if v_mod = 'individual' then
      select
        (
          select count(*)
          from public.matches m
          where m.finalidade = 'ranking'
            and m.esporte_id = p_esporte_id
            and m.status in ('Pendente', 'Aceito', 'CancelamentoPendente', 'ReagendamentoPendente')
            and lower(trim(coalesce(m.modalidade_confronto, m.tipo, ''))) = 'individual'
            and (m.usuario_id = v_uid or m.adversario_id = v_uid)
        )
        +
        (
          select count(*)
          from public.partidas p
          where p.esporte_id = p_esporte_id
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
      into v_pending_count;

      if v_pending_count >= v_pending_limit then
        raise exception
          using message = format(
            'Você atingiu o limite de %s confronto(s) de ranking individual pendente(s) para lançamento ou validação de resultado.',
            v_pending_limit
          );
      end if;

      select
        (
          select count(*)
          from public.matches m
          where m.finalidade = 'ranking'
            and m.esporte_id = p_esporte_id
            and m.status in ('Pendente', 'Aceito', 'CancelamentoPendente', 'ReagendamentoPendente')
            and lower(trim(coalesce(m.modalidade_confronto, m.tipo, ''))) = 'individual'
            and (m.usuario_id = v_adv or m.adversario_id = v_adv)
        )
        +
        (
          select count(*)
          from public.partidas p
          where p.esporte_id = p_esporte_id
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
              p.jogador1_id = v_adv
              or p.jogador2_id = v_adv
              or p.usuario_id = v_adv
              or p.desafiante_id = v_adv
              or p.desafiado_id = v_adv
            )
        )
      into v_pending_count;

      if v_pending_count >= v_pending_limit then
        raise exception 'O outro atleta já atingiu o limite de confrontos de ranking individuais pendentes para lançamento ou validação de resultado.';
      end if;

      select count(*) into v_mcount
      from public.partidas p
      where p.esporte_id = p_esporte_id
        and p.torneio_id is null
        and (
          lower(trim(coalesce(p.modalidade, ''))) = 'individual'
          or (
            p.modalidade is null
            and coalesce(p.time1_id, 0) = 0
            and coalesce(p.time2_id, 0) = 0
          )
        )
        and (p.jogador1_id = v_uid or p.jogador2_id = v_uid)
        and (
          lower(trim(coalesce(p.status_ranking, ''))) = 'validado'
          or lower(trim(coalesce(p.status, ''))) in (
            'concluida', 'concluída', 'concluido', 'finalizada', 'encerrada', 'validada'
          )
        )
        and coalesce(p.data_resultado, p.data_registro, p.data_partida) >= date_trunc('month', now())
        and coalesce(p.data_resultado, p.data_registro, p.data_partida) < date_trunc('month', now()) + interval '1 month';

      if v_mcount >= v_monthly_limit then
        raise exception
          using message = format(
            'Você atingiu o limite mensal de %s confrontos de ranking individuais neste esporte. No próximo mês o contador renova.',
            v_monthly_limit
          );
      end if;

      select count(*) into v_mcount
      from public.partidas p
      where p.esporte_id = p_esporte_id
        and p.torneio_id is null
        and (
          lower(trim(coalesce(p.modalidade, ''))) = 'individual'
          or (
            p.modalidade is null
            and coalesce(p.time1_id, 0) = 0
            and coalesce(p.time2_id, 0) = 0
          )
        )
        and (p.jogador1_id = v_adv or p.jogador2_id = v_adv)
        and (
          lower(trim(coalesce(p.status_ranking, ''))) = 'validado'
          or lower(trim(coalesce(p.status, ''))) in (
            'concluida', 'concluída', 'concluido', 'finalizada', 'encerrada', 'validada'
          )
        )
        and coalesce(p.data_resultado, p.data_registro, p.data_partida) >= date_trunc('month', now())
        and coalesce(p.data_resultado, p.data_registro, p.data_partida) < date_trunc('month', now()) + interval '1 month';

      if v_mcount >= v_monthly_limit then
        raise exception
          using message = format(
            'O outro atleta já atingiu o limite mensal de %s confrontos de ranking individuais neste esporte.',
            v_monthly_limit
          );
      end if;

    elsif v_mod in ('dupla', 'time') and v_challenger_time_id is not null and v_time_id is not null then
      select
        (
          select count(*)
          from public.matches m
          where m.finalidade = 'ranking'
            and m.esporte_id = p_esporte_id
            and m.status in ('Pendente', 'Aceito', 'CancelamentoPendente', 'ReagendamentoPendente')
            and lower(trim(coalesce(m.modalidade_confronto, m.tipo, ''))) in ('dupla', 'time')
            and (
              m.desafiante_time_id = v_challenger_time_id
              or m.adversario_time_id = v_challenger_time_id
            )
        )
        +
        (
          select count(*)
          from public.partidas p
          where p.esporte_id = p_esporte_id
            and p.torneio_id is null
            and lower(trim(coalesce(p.modalidade, ''))) in ('dupla', 'time')
            and (p.time1_id = v_challenger_time_id or p.time2_id = v_challenger_time_id)
            and lower(trim(coalesce(p.status, ''))) in ('agendada', 'aguardando_confirmacao')
        )
      into v_pending_count;

      if v_pending_count >= v_pending_limit then
        raise exception
          using message = format(
            'Sua formação já tem %s confronto(s) de ranking pendente(s) para lançamento ou validação. Conclua um deles antes de abrir outro.',
            v_pending_limit
          );
      end if;

      select
        (
          select count(*)
          from public.matches m
          where m.finalidade = 'ranking'
            and m.esporte_id = p_esporte_id
            and m.status in ('Pendente', 'Aceito', 'CancelamentoPendente', 'ReagendamentoPendente')
            and lower(trim(coalesce(m.modalidade_confronto, m.tipo, ''))) in ('dupla', 'time')
            and (
              m.desafiante_time_id = v_time_id
              or m.adversario_time_id = v_time_id
            )
        )
        +
        (
          select count(*)
          from public.partidas p
          where p.esporte_id = p_esporte_id
            and p.torneio_id is null
            and lower(trim(coalesce(p.modalidade, ''))) in ('dupla', 'time')
            and (p.time1_id = v_time_id or p.time2_id = v_time_id)
            and lower(trim(coalesce(p.status, ''))) in ('agendada', 'aguardando_confirmacao')
        )
      into v_pending_count;

      if v_pending_count >= v_pending_limit then
        raise exception
          using message = format(
            'A formação adversária já tem %s confronto(s) de ranking pendente(s). Eles precisam concluir um antes de aceitar novos desafios.',
            v_pending_limit
          );
      end if;

      select count(*) into v_mcount
      from public.partidas p
      where p.esporte_id = p_esporte_id
        and p.torneio_id is null
        and lower(trim(coalesce(p.modalidade, ''))) in ('dupla', 'time')
        and (p.time1_id = v_challenger_time_id or p.time2_id = v_challenger_time_id)
        and (
          lower(trim(coalesce(p.status_ranking, ''))) = 'validado'
          or lower(trim(coalesce(p.status, ''))) in (
            'concluida', 'concluída', 'concluido', 'finalizada', 'encerrada', 'validada'
          )
        )
        and coalesce(p.data_resultado, p.data_registro, p.data_partida) >= date_trunc('month', now())
        and coalesce(p.data_resultado, p.data_registro, p.data_partida) < date_trunc('month', now()) + interval '1 month';

      if v_mcount >= v_monthly_limit then
        raise exception
          using message = format(
            'Sua formação atingiu o limite mensal de %s confrontos de ranking neste esporte. No próximo mês o contador renova.',
            v_monthly_limit
          );
      end if;

      select count(*) into v_mcount
      from public.partidas p
      where p.esporte_id = p_esporte_id
        and p.torneio_id is null
        and lower(trim(coalesce(p.modalidade, ''))) in ('dupla', 'time')
        and (p.time1_id = v_time_id or p.time2_id = v_time_id)
        and (
          lower(trim(coalesce(p.status_ranking, ''))) = 'validado'
          or lower(trim(coalesce(p.status, ''))) in (
            'concluida', 'concluída', 'concluido', 'finalizada', 'encerrada', 'validada'
          )
        )
        and coalesce(p.data_resultado, p.data_registro, p.data_partida) >= date_trunc('month', now())
        and coalesce(p.data_resultado, p.data_registro, p.data_partida) < date_trunc('month', now()) + interval '1 month';

      if v_mcount >= v_monthly_limit then
        raise exception
          using message = format(
            'A formação adversária já atingiu o limite mensal de %s confrontos de ranking neste esporte.',
            v_monthly_limit
          );
      end if;
    end if;
  end if;

  select coalesce(
    (
      select
        case jsonb_typeof(ac.value_json)
          when 'number' then (ac.value_json::text)::int
          when 'object' then nullif((ac.value_json->>'meses'), '')::int
          else null
        end
      from public.app_config ac
      where ac.key = 'match_rank_cooldown_meses'
    ),
    12
  ) into v_meses;
  if v_meses is null or v_meses < 1 then
    v_meses := 12;
  end if;

  if v_fin = 'ranking' and v_mod = 'individual' then
    if exists (
      select 1 from public.matches m
      where m.esporte_id = p_esporte_id
        and m.finalidade = 'ranking'
        and m.status = 'Pendente'
        and (
          (m.usuario_id = v_uid and m.adversario_id = v_adv)
          or (m.usuario_id = v_adv and m.adversario_id = v_uid)
        )
    ) then
      raise exception 'Já existe um pedido de match de ranking pendente com este oponente neste esporte.';
    end if;

    if exists (
      select 1 from public.partidas p
      where p.esporte_id = p_esporte_id
        and p.torneio_id is null
        and lower(trim(coalesce(p.status, ''))) in (
          'concluida', 'concluída', 'concluído', 'finalizada', 'encerrada', 'validada'
        )
        and (
          (p.jogador1_id = v_uid and p.jogador2_id = v_adv)
          or (p.jogador1_id = v_adv and p.jogador2_id = v_uid)
        )
        and coalesce(p.data_resultado, p.data_registro, p.data_partida) > now() - make_interval(months => v_meses)
    ) then
      raise exception
        using message = format(
          'Neste esporte, só é possível um novo match de ranking com este oponente após %s meses do último confronto válido.',
          v_meses
        );
    end if;
  elsif v_fin = 'ranking'
    and v_mod in ('dupla', 'time')
    and v_challenger_time_id is not null
    and v_time_id is not null
  then
    if exists (
      select 1 from public.matches m
      where m.esporte_id = p_esporte_id
        and m.finalidade = 'ranking'
        and m.status = 'Pendente'
        and (
          (
            m.desafiante_time_id = v_challenger_time_id
            and m.adversario_time_id = v_time_id
          )
          or (
            m.desafiante_time_id = v_time_id
            and m.adversario_time_id = v_challenger_time_id
          )
          or (
            coalesce(m.desafiante_time_id, 0) = 0
            and coalesce(m.adversario_time_id, 0) = 0
            and (
              (m.usuario_id = v_uid and m.adversario_id = v_adv)
              or (m.usuario_id = v_adv and m.adversario_id = v_uid)
            )
          )
        )
    ) then
      raise exception 'Já existe um pedido de match de ranking pendente entre estas formações neste esporte.';
    end if;

    if exists (
      select 1 from public.matches m
      where m.esporte_id = p_esporte_id
        and m.finalidade = 'ranking'
        and (
          (
            m.desafiante_time_id = v_challenger_time_id
            and m.adversario_time_id = v_time_id
          )
          or (
            m.desafiante_time_id = v_time_id
            and m.adversario_time_id = v_challenger_time_id
          )
          or (
            coalesce(m.desafiante_time_id, 0) = 0
            and coalesce(m.adversario_time_id, 0) = 0
            and lower(trim(coalesce(m.modalidade_confronto, m.tipo, ''))) in ('dupla', 'time')
            and (
              (m.usuario_id = v_uid and m.adversario_id = v_adv)
              or (m.usuario_id = v_adv and m.adversario_id = v_uid)
            )
          )
        )
        and lower(trim(coalesce(m.status, ''))) in ('concluido', 'concluído', 'finalizado', 'encerrado')
        and coalesce(m.data_confirmacao, m.data_registro) > now() - make_interval(months => v_meses)
    ) then
      raise exception
        using message = format(
          'Neste esporte, só é possível um novo match de ranking entre estas formações após %s meses do último confronto válido.',
          v_meses
        );
    end if;

    if exists (
      select 1 from public.partidas p
      where p.esporte_id = p_esporte_id
        and p.torneio_id is null
        and lower(trim(coalesce(p.modalidade, ''))) in ('dupla', 'time')
        and (
          (
            p.time1_id = v_challenger_time_id
            and p.time2_id = v_time_id
          )
          or (
            p.time1_id = v_time_id
            and p.time2_id = v_challenger_time_id
          )
        )
        and (
          lower(trim(coalesce(p.status, ''))) in (
            'concluida', 'concluída', 'concluído', 'finalizada', 'encerrada', 'validada'
          )
          or lower(trim(coalesce(p.status_ranking, ''))) = 'validado'
        )
        and coalesce(p.data_resultado, p.data_registro, p.data_partida) > now() - make_interval(months => v_meses)
    ) then
      raise exception
        using message = format(
          'Neste esporte, só é possível um novo match de ranking entre estas formações após %s meses do último confronto válido.',
          v_meses
        );
    end if;

    if exists (
      select 1 from public.partidas p
      where p.esporte_id = p_esporte_id
        and p.torneio_id is null
        and lower(trim(coalesce(p.modalidade, ''))) in ('dupla', 'time')
        and coalesce(p.time1_id, 0) = 0
        and coalesce(p.time2_id, 0) = 0
        and (
          (p.jogador1_id = v_uid and p.jogador2_id = v_adv)
          or (p.jogador1_id = v_adv and p.jogador2_id = v_uid)
        )
        and (
          lower(trim(coalesce(p.status, ''))) in (
            'concluida', 'concluída', 'concluído', 'finalizada', 'encerrada', 'validada'
          )
          or lower(trim(coalesce(p.status_ranking, ''))) = 'validado'
        )
        and coalesce(p.data_resultado, p.data_registro, p.data_partida) > now() - make_interval(months => v_meses)
    ) then
      raise exception
        using message = format(
          'Neste esporte, só é possível um novo match de ranking entre estas formações após %s meses do último confronto válido.',
          v_meses
        );
    end if;
  end if;

  insert into public.matches (
    usuario_id,
    adversario_id,
    esporte_id,
    tipo,
    modalidade_confronto,
    finalidade,
    status,
    data_registro,
    data_solicitacao,
    adversario_time_id,
    desafiante_time_id
  )
  values (
    v_uid,
    v_adv,
    p_esporte_id,
    v_mod,
    v_mod,
    v_fin,
    'Pendente',
    now(),
    now(),
    v_time_id,
    v_challenger_time_id
  )
  returning id into v_mid;

  select nome into v_challenger_nome from public.profiles where id = v_uid;

  v_time_nome := null;
  if v_time_id is not null then
    select tm.nome into v_time_nome from public.times tm where tm.id = v_time_id;
  end if;

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
    v_adv,
    case
      when v_fin = 'amistoso' then
        case
          when v_challenger_nome is not null and length(trim(v_challenger_nome)) > 0
          then 'Pedido de Match amistoso de ' || trim(v_challenger_nome) || ' (sem pontos de ranking).'
          else 'Você recebeu um pedido de Match amistoso.'
        end
      else
        case
          when v_challenger_nome is not null and length(trim(v_challenger_nome)) > 0
          then 'Você recebeu um novo pedido de Match de ranking de ' || trim(v_challenger_nome) || '.'
          else 'Você recebeu um novo pedido de Match de ranking.'
        end
    end,
    'match',
    v_mid,
    false,
    v_uid,
    now()
  );

  if v_challenger_time_id is not null and v_fin = 'ranking' then
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
          trim(v_challenger_nome)
          || ' (líder) enviou um desafio de ranking. Acompanhe na Agenda — status do ranking até o capitão adversário responder.'
        else
          'O líder enviou um desafio de ranking. Acompanhe na Agenda — status do ranking até o capitão adversário responder.'
      end,
      'agenda_status',
      v_mid,
      false,
      v_uid,
      now()
    from public.membros_time mt
    where mt.time_id = v_challenger_time_id
      and mt.usuario_id is distinct from v_uid
      and mt.status in ('ativo', 'aceito', 'aprovado');
  end if;

  if v_time_id is not null and v_fin = 'ranking' then
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
          trim(v_challenger_nome)
          || ' enviou um desafio de ranking para '
          || coalesce(nullif(trim(coalesce(v_time_nome, '')), ''), 'a sua formação')
          || '. O capitão responde no Painel social; acompanhe o status na Agenda.'
        else
          'Desafio de ranking recebido para '
          || coalesce(nullif(trim(coalesce(v_time_nome, '')), ''), 'a sua formação')
          || '. O capitão responde no Painel social; acompanhe o status na Agenda.'
      end,
      'agenda_status',
      v_mid,
      false,
      v_uid,
      now()
    from public.membros_time mt
    where mt.time_id = v_time_id
      and mt.usuario_id is distinct from v_adv
      and mt.status in ('ativo', 'aceito', 'aprovado');
  end if;

  return v_mid;
end;
$$;

revoke all on function public.solicitar_desafio_match (bigint, text, uuid, bigint, text) from public;
grant execute on function public.solicitar_desafio_match (bigint, text, uuid, bigint, text) to authenticated;

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
