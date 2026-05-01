-- Após transferência, `membros_time.cargo` deve refletir líder (UI + relatórios). Antes ambos ficavam "Membro".

create or replace function public.transferir_lideranca_time(p_time_id bigint, p_novo_lider uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_old_leader uuid;
  v_tipo text;
  v_esp bigint;
  v_membro_ativo boolean;
  v_parceiro_dupla boolean;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select t.criador_id,
         lower(trim(coalesce(t.tipo, ''))),
         t.esporte_id
    into v_old_leader, v_tipo, v_esp
  from public.times t
  where t.id = p_time_id;

  if v_old_leader is null then
    raise exception 'Equipe não encontrada';
  end if;

  if v_old_leader is distinct from v_uid then
    raise exception 'Apenas o líder atual pode transferir liderança';
  end if;

  if p_novo_lider is null or p_novo_lider = v_old_leader then
    raise exception 'Selecione outro integrante para receber a liderança';
  end if;

  select exists (
    select 1
    from public.membros_time m
    where m.time_id = p_time_id
      and m.usuario_id = p_novo_lider
      and lower(coalesce(m.status, '')) in ('ativo', 'aceito', 'aprovado')
  ) into v_membro_ativo;

  v_parceiro_dupla := false;
  if not v_membro_ativo and v_tipo = 'dupla' and v_esp is not null then
    select exists (
      select 1
      from public.duplas d
      where d.esporte_id = v_esp
        and (
          (d.player1_id = v_old_leader and d.player2_id = p_novo_lider)
          or (d.player2_id = v_old_leader and d.player1_id = p_novo_lider)
        )
    ) into v_parceiro_dupla;
  end if;

  if not v_membro_ativo and not v_parceiro_dupla then
    raise exception 'Novo líder deve ser membro ativo ou parceiro da dupla neste esporte';
  end if;

  update public.times
  set criador_id = p_novo_lider
  where id = p_time_id;

  if v_old_leader is not null and v_old_leader is distinct from p_novo_lider then
    insert into public.membros_time (time_id, usuario_id, cargo, status, data_adesao)
    values (p_time_id, v_old_leader, 'Membro', 'ativo', now())
    on conflict (time_id, usuario_id) do update
      set status = 'ativo',
          cargo = 'Membro';
  end if;

  insert into public.membros_time (time_id, usuario_id, cargo, status, data_adesao)
  values (p_time_id, p_novo_lider, 'Líder', 'ativo', now())
  on conflict (time_id, usuario_id) do update
    set status = 'ativo',
        cargo = 'Líder';
end;
$$;

revoke all on function public.transferir_lideranca_time(bigint, uuid) from public;
grant execute on function public.transferir_lideranca_time(bigint, uuid) to authenticated;
