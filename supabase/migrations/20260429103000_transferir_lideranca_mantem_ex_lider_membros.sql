-- Ao transferir liderança, o ex-líder permanece no elenco: muitos líderes só existiam em times.criador_id
-- sem linha em membros_time e sumiam da lista de participantes.

create or replace function public.transferir_lideranca_time(p_time_id bigint, p_novo_lider uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_old_leader uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select t.criador_id into v_old_leader
  from public.times t
  where t.id = p_time_id;

  if v_old_leader is null then
    raise exception 'Equipe não encontrada';
  end if;

  if v_old_leader is distinct from v_uid then
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

  if v_old_leader is not null and v_old_leader is distinct from p_novo_lider then
    insert into public.membros_time (time_id, usuario_id, cargo, status, data_adesao)
    values (p_time_id, v_old_leader, 'Membro', 'ativo', now())
    on conflict (time_id, usuario_id) do update
      set status = 'ativo',
          cargo = coalesce(public.membros_time.cargo, excluded.cargo);
  end if;
end;
$$;

revoke all on function public.transferir_lideranca_time(bigint, uuid) from public;
grant execute on function public.transferir_lideranca_time(bigint, uuid) to authenticated;
