-- Time/dupla desafiante: referência explícita + notificar elenco + RLS para membros acompanharem pendências.

alter table public.matches
  add column if not exists desafiante_time_id bigint references public.times (id) on delete set null;

create index if not exists matches_desafiante_time_id_idx on public.matches (desafiante_time_id)
  where desafiante_time_id is not null;

-- Preencher retroativamente (capitão = usuario_id na modalidade dupla/time com adversario_time_id).
update public.matches m
set desafiante_time_id = s.tid
from (
  select distinct on (m2.id)
    m2.id as mid,
    t.id as tid
  from public.matches m2
  join public.times t
    on t.criador_id = m2.usuario_id
   and t.esporte_id = m2.esporte_id
   and lower(trim(coalesce(t.tipo, ''))) = lower(trim(coalesce(m2.modalidade_confronto, m2.tipo, '')))
  where m2.desafiante_time_id is null
    and m2.adversario_time_id is not null
    and lower(trim(coalesce(m2.modalidade_confronto, m2.tipo, ''))) in ('dupla', 'time')
  order by m2.id, t.id
) s
where m.id = s.mid;

drop policy if exists "matches_own" on public.matches;

create policy "matches_select_participants_and_teams"
  on public.matches for select
  to authenticated
  using (
    auth.uid() in (usuario_id, adversario_id, user_id_1, user_id_2, user_1, user_2)
    or (
      desafiante_time_id is not null
      and exists (
        select 1
        from public.membros_time mt
        where mt.time_id = matches.desafiante_time_id
          and mt.usuario_id = auth.uid()
          and mt.status in ('ativo', 'aceito', 'aprovado')
      )
    )
    or (
      adversario_time_id is not null
      and exists (
        select 1
        from public.membros_time mt
        where mt.time_id = matches.adversario_time_id
          and mt.usuario_id = auth.uid()
          and mt.status in ('ativo', 'aceito', 'aprovado')
      )
    )
  );

create policy "matches_insert_participants"
  on public.matches for insert
  to authenticated
  with check (
    auth.uid() in (usuario_id, adversario_id, user_id_1, user_id_2, user_1, user_2)
  );

create policy "matches_update_participants"
  on public.matches for update
  to authenticated
  using (auth.uid() in (usuario_id, adversario_id, user_id_1, user_id_2, user_1, user_2))
  with check (auth.uid() in (usuario_id, adversario_id, user_id_1, user_id_2, user_1, user_2));

create policy "matches_delete_participants"
  on public.matches for delete
  to authenticated
  using (auth.uid() in (usuario_id, adversario_id, user_id_1, user_id_2, user_1, user_2));

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
  v_mod text;
  t_tipo text;
  t_esporte bigint;
  t_criador uuid;
  v_fin text;
  v_meses int;
  v_pending_limit int;
  v_pending_count int;
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

    select
      (
        select count(*)
        from public.matches m
        where m.finalidade = 'ranking'
          and m.status = 'Aceito'
          and (m.usuario_id = v_uid or m.adversario_id = v_uid)
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
    into v_pending_count;

    if v_pending_count >= v_pending_limit then
      raise exception
        using message = format(
          'Você atingiu o limite de %s jogo(s) de ranking pendente(s) para lançamento/validação de resultado.',
          v_pending_limit
        );
    end if;
  end if;

  if v_fin = 'ranking' and v_mod = 'individual' then
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
    if v_meses < 1 then
      v_meses := 12;
    end if;

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
          || ' (capitão) enviou um desafio de ranking para outra formação. O pedido está pendente — evitem sugerir outro adversário até a resposta.'
        else
          'O capitão enviou um desafio de ranking para outra formação. O pedido está pendente — evitem sugerir outro adversário até a resposta.'
      end,
      'match',
      v_mid,
      false,
      v_uid,
      now()
    from public.membros_time mt
    where mt.time_id = v_challenger_time_id
      and mt.usuario_id is distinct from v_uid
      and mt.status in ('ativo', 'aceito', 'aprovado');
  end if;

  return v_mid;
end;
$$;

revoke all on function public.solicitar_desafio_match (bigint, text, uuid, bigint, text) from public;
grant execute on function public.solicitar_desafio_match (bigint, text, uuid, bigint, text) to authenticated;
