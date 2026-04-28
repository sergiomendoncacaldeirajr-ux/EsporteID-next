create or replace function public.ocultar_sugestao_match_sugeridor(p_sugestao_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select status
  into v_status
  from public.match_sugestoes
  where id = p_sugestao_id
    and sugeridor_id = v_uid;

  if v_status is null then
    raise exception 'Sugestão não encontrada ou sem permissão';
  end if;

  if lower(trim(coalesce(v_status, 'pendente'))) = 'pendente' then
    raise exception 'Não é possível limpar sugestão pendente';
  end if;

  update public.match_sugestoes
  set oculto_sugeridor = true
  where id = p_sugestao_id
    and sugeridor_id = v_uid;
end;
$$;

revoke all on function public.ocultar_sugestao_match_sugeridor(bigint) from public;
grant execute on function public.ocultar_sugestao_match_sugeridor(bigint) to authenticated;
