-- Cancelamento (ranking): líderes/oponentes recebem notificação de ação (tipo match → Painel social);
-- elenco (membros que não estão no conjunto de quem responde) recebe agenda_status → Agenda só referência.
-- Confronto cancelado (final): todos recebem agenda_status com keep_after (link Agenda).

create or replace function public.limpar_notificacoes_match_cancelado (
  p_only_user uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  delete from public.notificacoes n
  using public.matches m
  where m.id = n.referencia_id
    and lower(coalesce(n.tipo, '')) in ('match', 'desafio', 'agenda_status')
    and lower(coalesce(m.status, '')) = 'cancelado'
    and coalesce(n.keep_after_match_cancelled, false) = false
    and (p_only_user is null or n.usuario_id = p_only_user);

  get diagnostics v_deleted = row_count;
  return coalesce(v_deleted, 0);
end;
$$;

revoke all on function public.limpar_notificacoes_match_cancelado (uuid) from public;
grant execute on function public.limpar_notificacoes_match_cancelado (uuid) to authenticated;
grant execute on function public.limpar_notificacoes_match_cancelado (uuid) to service_role;

create or replace function public.notificar_elenco_match_cancelado (
  p_match_id bigint,
  p_mensagem text,
  p_remetente uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
begin
  select
    m.usuario_id,
    m.adversario_id,
    m.desafiante_time_id,
    m.adversario_time_id
  into v_match
  from public.matches m
  where m.id = p_match_id;

  if not found then
    return;
  end if;

  delete from public.notificacoes n
  where n.referencia_id = p_match_id
    and lower(coalesce(n.tipo, '')) in ('match', 'desafio', 'agenda_status');

  insert into public.notificacoes (
    usuario_id,
    mensagem,
    tipo,
    referencia_id,
    lida,
    remetente_id,
    data_criacao,
    keep_after_match_cancelled
  )
  select distinct
    u.uid,
    p_mensagem,
    'agenda_status',
    p_match_id,
    false,
    p_remetente,
    now(),
    true
  from (
    select v_match.usuario_id as uid
    union all
    select v_match.adversario_id
    union all
    select mt.usuario_id
    from public.membros_time mt
    where (
      (v_match.desafiante_time_id is not null and mt.time_id = v_match.desafiante_time_id)
      or (v_match.adversario_time_id is not null and mt.time_id = v_match.adversario_time_id)
    )
      and lower(coalesce(mt.status, '')) in ('ativo', 'aceito', 'aprovado')
  ) u
  where u.uid is not null;
end;
$$;

revoke all on function public.notificar_elenco_match_cancelado (bigint, text, uuid) from public;
grant execute on function public.notificar_elenco_match_cancelado (bigint, text, uuid) to authenticated;
grant execute on function public.notificar_elenco_match_cancelado (bigint, text, uuid) to service_role;

create or replace function public.solicitar_cancelamento_match_aceito (
  p_match_id bigint,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_match public.matches%rowtype;
  v_msg text;
  v_mod text;
  v_status_msg text := 'Seu time recebeu um pedido de cancelamento do confronto. A liderança responde no Painel social; na Agenda você acompanha só o status (referência).';
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_match from public.matches where id = p_match_id;
  if v_match.id is null then
    raise exception 'Match não encontrado';
  end if;

  v_mod := lower(trim(coalesce(v_match.modalidade_confronto, '')));

  if v_uid is distinct from v_match.usuario_id and v_uid is distinct from v_match.adversario_id then
    if v_mod not in ('dupla', 'time') then
      raise exception 'Sem permissão para este match';
    end if;
    if not exists (
      select 1
      from public.times t
      where t.criador_id = v_uid
        and (
          t.id is not distinct from v_match.desafiante_time_id
          or t.id is not distinct from v_match.adversario_time_id
        )
    ) then
      raise exception 'Sem permissão para este match';
    end if;
  end if;

  if coalesce(v_match.status, '') is distinct from 'Aceito' then
    raise exception 'Apenas desafio aceito pode solicitar cancelamento';
  end if;

  update public.matches
  set
    status = 'CancelamentoPendente',
    cancel_requested_by = v_uid,
    cancel_requested_at = now(),
    cancel_response_deadline_at = now() + interval '24 hours',
    cancel_refused_at = null,
    reschedule_deadline_at = null,
    reschedule_selected_option = null,
    scheduled_for = null,
    scheduled_location = null,
    wo_auto_if_no_result = false
  where id = p_match_id;

  delete from public.match_cancelamento_opcoes where match_id = p_match_id;

  v_msg := case
    when p_motivo is not null and length(trim(p_motivo)) > 0
      then 'Pedido de cancelamento do confronto: ' || trim(left(p_motivo, 180))
    else 'Pedido de cancelamento do confronto. A outra parte tem até 24h para responder.'
  end;

  with action_uid as (
    select distinct q.uid
    from (
      select v_match.usuario_id as uid
      union all
      select v_match.adversario_id
      union all
      select t.criador_id
      from public.times t
      where v_match.desafiante_time_id is not null and t.id = v_match.desafiante_time_id
      union all
      select t2.criador_id
      from public.times t2
      where v_match.adversario_time_id is not null and t2.id = v_match.adversario_time_id
    ) q
    where q.uid is not null
      and q.uid is distinct from v_uid
  )
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
    a.uid,
    v_msg,
    'match',
    p_match_id,
    false,
    v_uid,
    now()
  from action_uid a;

  insert into public.notificacoes (
    usuario_id,
    mensagem,
    tipo,
    referencia_id,
    lida,
    remetente_id,
    data_criacao
  )
  select distinct
    mt.usuario_id,
    v_status_msg,
    'agenda_status',
    p_match_id,
    false,
    v_uid,
    now()
  from public.membros_time mt
  where v_mod in ('dupla', 'time')
    and (
      (v_match.desafiante_time_id is not null and mt.time_id = v_match.desafiante_time_id)
      or (v_match.adversario_time_id is not null and mt.time_id = v_match.adversario_time_id)
    )
    and lower(coalesce(mt.status, '')) in ('ativo', 'aceito', 'aprovado')
    and mt.usuario_id is not null
    and mt.usuario_id is distinct from v_uid
    and not exists (
      select 1
      from (
        select v_match.usuario_id as uid
        union all
        select v_match.adversario_id
        union all
        select t.criador_id
        from public.times t
        where v_match.desafiante_time_id is not null and t.id = v_match.desafiante_time_id
        union all
        select t2.criador_id
        from public.times t2
        where v_match.adversario_time_id is not null and t2.id = v_match.adversario_time_id
      ) q
      where q.uid is not null
        and q.uid is distinct from v_uid
        and q.uid = mt.usuario_id
    );
end;
$$;

revoke all on function public.solicitar_cancelamento_match_aceito (bigint, text) from public;
grant execute on function public.solicitar_cancelamento_match_aceito (bigint, text) to authenticated;
