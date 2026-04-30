-- Garante notificação ao líder quando alguém se candidata em vaga de time/dupla.
-- Usa SECURITY DEFINER para não depender de policy de INSERT em notificacoes.

create or replace function public.notificar_candidatura_time_lider(
  p_time_id bigint,
  p_mensagem text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_team_nome text;
  v_msg text;
  v_notif_id bigint;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;

  select t.criador_id, t.nome
    into v_owner, v_team_nome
  from public.times t
  where t.id = p_time_id
  limit 1;

  if v_owner is null then
    raise exception 'time not found';
  end if;

  if v_owner = v_actor then
    raise exception 'owner cannot notify self candidatura';
  end if;

  if not exists (
    select 1
    from public.time_candidaturas c
    where c.time_id = p_time_id
      and c.candidato_usuario_id = v_actor
      and lower(trim(coalesce(c.status, ''))) = 'pendente'
  ) then
    raise exception 'pending candidatura not found for actor';
  end if;

  v_msg := nullif(trim(coalesce(p_mensagem, '')), '');
  if v_msg is null then
    v_msg := format(
      'Novo pedido para entrar em "%s". Abra Social → Equipe para aprovar ou recusar.',
      coalesce(v_team_nome, 'sua formação')
    );
  end if;

  insert into public.notificacoes (
    usuario_id,
    remetente_id,
    mensagem,
    tipo,
    referencia_id,
    lida,
    data_criacao
  )
  values (
    v_owner,
    v_actor,
    v_msg,
    'candidatura_time',
    p_time_id,
    false,
    now()
  )
  returning id into v_notif_id;

  return v_notif_id;
end;
$$;

revoke all on function public.notificar_candidatura_time_lider(bigint, text) from public;
grant execute on function public.notificar_candidatura_time_lider(bigint, text) to authenticated;
