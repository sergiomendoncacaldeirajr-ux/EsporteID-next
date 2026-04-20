-- RPCs de convite/gestão de equipes por @username.

create or replace function public.convidar_para_time(p_time_id bigint, p_username text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_target uuid;
  v_convite_id bigint;
  v_time_nome text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select t.nome into v_time_nome
  from public.times t
  where t.id = p_time_id
    and t.criador_id = v_uid;

  if v_time_nome is null then
    raise exception 'Apenas o líder pode enviar convites';
  end if;

  select p.id into v_target
  from public.profiles p
  where p.username = public.normalize_username(p_username);

  if v_target is null then
    raise exception 'Usuário não encontrado';
  end if;
  if v_target = v_uid then
    raise exception 'Não é possível convidar a si mesmo';
  end if;

  insert into public.time_convites (time_id, convidado_usuario_id, convidado_por_usuario_id, status, respondido_em)
  values (p_time_id, v_target, v_uid, 'pendente', null)
  on conflict (time_id, convidado_usuario_id)
  do update set
    status = 'pendente',
    convidado_por_usuario_id = excluded.convidado_por_usuario_id,
    criado_em = now(),
    respondido_em = null
  returning id into v_convite_id;

  insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
  values (
    v_target,
    'Você recebeu convite para entrar na equipe "' || coalesce(v_time_nome, 'Equipe') || '".',
    'convite_time',
    v_convite_id,
    false,
    v_uid,
    now()
  );

  return v_convite_id;
end;
$$;

create or replace function public.responder_convite_time(p_convite_id bigint, p_aceitar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_time_id bigint;
  v_status text;
  v_inviter uuid;
  v_time_nome text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select c.time_id, c.status, c.convidado_por_usuario_id, t.nome
  into v_time_id, v_status, v_inviter, v_time_nome
  from public.time_convites c
  join public.times t on t.id = c.time_id
  where c.id = p_convite_id
    and c.convidado_usuario_id = v_uid;

  if v_time_id is null then
    raise exception 'Convite não encontrado';
  end if;
  if v_status is distinct from 'pendente' then
    raise exception 'Convite já respondido';
  end if;

  if p_aceitar then
    insert into public.membros_time (time_id, usuario_id, cargo, status, data_adesao)
    values (v_time_id, v_uid, 'Membro', 'ativo', now())
    on conflict (time_id, usuario_id)
    do update set status = 'ativo', data_adesao = now();

    update public.time_convites
    set status = 'aceito', respondido_em = now()
    where id = p_convite_id;

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values (
      v_inviter,
      'Convite aceito para a equipe "' || coalesce(v_time_nome, 'Equipe') || '".',
      'convite_time',
      p_convite_id,
      false,
      v_uid,
      now()
    );
  else
    update public.time_convites
    set status = 'recusado', respondido_em = now()
    where id = p_convite_id;

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values (
      v_inviter,
      'Convite recusado para a equipe "' || coalesce(v_time_nome, 'Equipe') || '".',
      'convite_time',
      p_convite_id,
      false,
      v_uid,
      now()
    );
  end if;
end;
$$;

create or replace function public.remover_membro_time(p_time_id bigint, p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if not exists (
    select 1 from public.times t where t.id = p_time_id and t.criador_id = v_uid
  ) then
    raise exception 'Apenas o líder pode remover membros';
  end if;

  delete from public.membros_time
  where time_id = p_time_id
    and usuario_id = p_usuario_id;
end;
$$;

create or replace function public.transferir_lideranca_time(p_time_id bigint, p_novo_lider uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if not exists (
    select 1 from public.times t where t.id = p_time_id and t.criador_id = v_uid
  ) then
    raise exception 'Apenas o líder atual pode transferir liderança';
  end if;

  if not exists (
    select 1
    from public.membros_time m
    where m.time_id = p_time_id
      and m.usuario_id = p_novo_lider
      and lower(coalesce(m.status, '')) in ('ativo', 'aceito', 'aprovado')
  ) then
    raise exception 'Novo líder deve ser membro ativo';
  end if;

  update public.times
  set criador_id = p_novo_lider
  where id = p_time_id;
end;
$$;

revoke all on function public.convidar_para_time(bigint, text) from public;
grant execute on function public.convidar_para_time(bigint, text) to authenticated;

revoke all on function public.responder_convite_time(bigint, boolean) from public;
grant execute on function public.responder_convite_time(bigint, boolean) to authenticated;

revoke all on function public.remover_membro_time(bigint, uuid) from public;
grant execute on function public.remover_membro_time(bigint, uuid) to authenticated;

revoke all on function public.transferir_lideranca_time(bigint, uuid) from public;
grant execute on function public.transferir_lideranca_time(bigint, uuid) to authenticated;
