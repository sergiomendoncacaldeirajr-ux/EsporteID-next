-- Pedido de cancelamento: líder atual (times.criador_id) pode solicitar em dupla/time;
-- notificar capitães + elenco ativo dos dois lados (exceto quem pediu), alinhado ao fluxo de cancelamento final.

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
    u.uid,
    v_msg,
    'match',
    p_match_id,
    false,
    v_uid,
    now()
  from (
    select v_match.usuario_id as uid
    union all
    select v_match.adversario_id
    union all
    select mt.usuario_id
    from public.membros_time mt
    where (
      v_match.desafiante_time_id is not null
      and mt.time_id = v_match.desafiante_time_id
      or v_match.adversario_time_id is not null
      and mt.time_id = v_match.adversario_time_id
    )
      and lower(coalesce(mt.status, '')) in ('ativo', 'aceito', 'aprovado')
  ) u
  where u.uid is not null
    and u.uid is distinct from v_uid;
end;
$$;

revoke all on function public.solicitar_cancelamento_match_aceito (bigint, text) from public;
grant execute on function public.solicitar_cancelamento_match_aceito (bigint, text) to authenticated;
