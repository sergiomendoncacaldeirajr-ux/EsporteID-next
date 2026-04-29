-- Líder da formação pode cancelar um convite ainda pendente (remove a pendência para o convidado).

create or replace function public.cancelar_convite_time_lider(p_convite_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_time_id bigint;
  v_status text;
  v_criador uuid;
  v_convidado uuid;
  v_time_nome text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select c.time_id, c.status, c.convidado_usuario_id, t.criador_id, t.nome
  into v_time_id, v_status, v_convidado, v_criador, v_time_nome
  from public.time_convites c
  join public.times t on t.id = c.time_id
  where c.id = p_convite_id;

  if v_time_id is null then
    raise exception 'Convite não encontrado';
  end if;
  if v_criador is distinct from v_uid then
    raise exception 'Apenas o líder pode cancelar convites desta formação';
  end if;
  if v_status is distinct from 'pendente' then
    raise exception 'Só é possível cancelar convites pendentes';
  end if;

  update public.time_convites
  set status = 'cancelado', respondido_em = now()
  where id = p_convite_id;

  insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
  values (
    v_convidado,
    'O líder cancelou o convite para entrar em "' || coalesce(nullif(trim(v_time_nome), ''), 'Formação') || '".',
    'convite_time',
    p_convite_id,
    false,
    v_uid,
    now()
  );
end;
$$;

revoke all on function public.cancelar_convite_time_lider(bigint) from public;
grant execute on function public.cancelar_convite_time_lider(bigint) to authenticated;
