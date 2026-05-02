-- Exclusão definitiva da formação (`times`) pelo líder: só quando o elenco efetivo é só o líder (headcount = 1)
-- e não há convites/candidaturas pendentes. Remove linha legacy em `duplas` quando aplicável.

create or replace function public.excluir_formacao_time_lider(p_time_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_criador uuid;
  v_esporte bigint;
  v_tipo text;
  v_head int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select t.criador_id, t.esporte_id, lower(trim(coalesce(t.tipo, '')))
  into v_criador, v_esporte, v_tipo
  from public.times t
  where t.id = p_time_id
  for update;

  if v_criador is null then
    raise exception 'Formação não encontrada';
  end if;
  if v_criador <> v_uid then
    raise exception 'Apenas o líder pode excluir o perfil desta formação';
  end if;

  if exists (
    select 1
    from public.time_convites c
    where c.time_id = p_time_id
      and lower(trim(coalesce(c.status, ''))) = 'pendente'
  ) then
    raise exception 'Há convites pendentes. Cancele-os ou aguarde a resposta antes de excluir.';
  end if;

  if exists (
    select 1
    from public.time_candidaturas x
    where x.time_id = p_time_id
      and lower(trim(coalesce(x.status, ''))) = 'pendente'
  ) then
    raise exception 'Há candidaturas pendentes. Responda ou cancele antes de excluir.';
  end if;

  select public.time_roster_headcount(p_time_id) into v_head;

  if v_head is null or v_head <> 1 then
    raise exception 'Só é possível excluir quando você é o único integrante. Remova membros (e parceiro da dupla, se houver) antes.';
  end if;

  if v_tipo = 'dupla' and v_esporte is not null then
    delete from public.duplas d
    using public.times t
    where t.id = p_time_id
      and t.esporte_id = d.esporte_id
      and lower(trim(coalesce(t.tipo, ''))) = 'dupla'
      and (d.player1_id = t.criador_id or d.player2_id = t.criador_id);
  end if;

  delete from public.times t where t.id = p_time_id;
end;
$$;

revoke all on function public.excluir_formacao_time_lider(bigint) from public;
grant execute on function public.excluir_formacao_time_lider(bigint) to authenticated;
