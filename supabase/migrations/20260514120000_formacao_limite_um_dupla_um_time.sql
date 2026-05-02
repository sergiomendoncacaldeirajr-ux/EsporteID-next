-- Regra global: no máximo 1 dupla + 1 time por usuário (líder ou membro ativo), podendo combinar os dois.

create or replace function public.usuario_pode_integrar_formacao(p_usuario uuid, p_time_id bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_bucket text;
begin
  select case when lower(trim(coalesce(tipo, ''))) = 'dupla' then 'dupla' else 'time' end
  into v_bucket
  from public.times
  where id = p_time_id;

  if v_bucket is null then
    return false;
  end if;

  return not exists (
    select 1
    from public.times t
    where t.criador_id = p_usuario
      and t.id is distinct from p_time_id
      and (
        (v_bucket = 'dupla' and lower(trim(coalesce(t.tipo, ''))) = 'dupla')
        or
        (v_bucket = 'time' and lower(trim(coalesce(t.tipo, ''))) is distinct from 'dupla')
      )
    union all
    select 1
    from public.membros_time m
    join public.times t on t.id = m.time_id
    where m.usuario_id = p_usuario
      and t.id is distinct from p_time_id
      and lower(trim(coalesce(m.status, ''))) in ('ativo', 'aceito', 'aprovado')
      and (
        (v_bucket = 'dupla' and lower(trim(coalesce(t.tipo, ''))) = 'dupla')
        or
        (v_bucket = 'time' and lower(trim(coalesce(t.tipo, ''))) is distinct from 'dupla')
      )
  );
end;
$$;

revoke all on function public.usuario_pode_integrar_formacao(uuid, bigint) from public;
grant execute on function public.usuario_pode_integrar_formacao(uuid, bigint) to authenticated;

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
  v_tipo text;
  v_cap int;
  v_roster int;
  v_target_in_roster boolean;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select t.nome, lower(trim(coalesce(t.tipo, '')))
  into v_time_nome, v_tipo
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

  if not public.usuario_pode_integrar_formacao(v_target, p_time_id) then
    if v_tipo = 'dupla' then
      raise exception 'Este atleta já integra outra dupla. Cada pessoa pode estar em no máximo uma dupla e um time ao mesmo tempo (podendo combinar os dois).';
    else
      raise exception 'Este atleta já integra outro time. Cada pessoa pode estar em no máximo uma dupla e um time ao mesmo tempo (podendo combinar os dois).';
    end if;
  end if;

  v_cap := case when v_tipo = 'dupla' then 2 else 18 end;

  select exists (
    select 1
    from public.membros_time m
    where m.time_id = p_time_id
      and m.usuario_id = v_target
      and lower(trim(coalesce(m.status, ''))) in ('ativo', 'aceito', 'aprovado')
  ) into v_target_in_roster;

  select public.time_roster_headcount(p_time_id) into v_roster;

  if not v_target_in_roster and v_roster >= v_cap then
    raise exception 'Limite de elenco atingido. Remova um membro para convidar outra pessoa.';
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
  v_tipo text;
  v_cap int;
  v_roster int;
  v_uid_in_roster boolean;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select c.time_id, c.status, c.convidado_por_usuario_id, t.nome, lower(trim(coalesce(t.tipo, '')))
  into v_time_id, v_status, v_inviter, v_time_nome, v_tipo
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
    if not public.usuario_pode_integrar_formacao(v_uid, v_time_id) then
      if v_tipo = 'dupla' then
        raise exception 'Você já integra outra dupla. Saia da outra ou peça remoção antes de aceitar este convite.';
      else
        raise exception 'Você já integra outro time. Saia do outro ou peça remoção antes de aceitar este convite.';
      end if;
    end if;

    v_cap := case when v_tipo = 'dupla' then 2 else 18 end;

    select exists (
      select 1
      from public.membros_time m
      where m.time_id = v_time_id
        and m.usuario_id = v_uid
        and lower(trim(coalesce(m.status, ''))) in ('ativo', 'aceito', 'aprovado')
    ) into v_uid_in_roster;

    if not v_uid_in_roster then
      select public.time_roster_headcount(v_time_id) into v_roster;
      if v_roster >= v_cap then
        raise exception 'Limite de elenco atingido. Remova um membro para aceitar novos integrantes.';
      end if;
    end if;

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
