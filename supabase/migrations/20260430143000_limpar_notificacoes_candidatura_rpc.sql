-- Limpa notificações pendentes de candidatura para líder e candidato.
-- SECURITY DEFINER para contornar limitações de RLS entre usuários distintos.

create or replace function public.limpar_notificacoes_candidatura_time(
  p_time_id bigint,
  p_candidato_id uuid,
  p_lider_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_deleted integer := 0;
begin
  if v_actor is null then
    raise exception 'not authenticated';
  end if;

  select t.criador_id
    into v_owner
  from public.times t
  where t.id = p_time_id
  limit 1;

  if v_owner is null then
    raise exception 'time not found';
  end if;

  if p_lider_id is not null and p_lider_id <> v_owner then
    raise exception 'leader mismatch';
  end if;

  if v_actor <> p_candidato_id and v_actor <> v_owner then
    raise exception 'forbidden';
  end if;

  delete from public.notificacoes n
  where n.tipo = 'candidatura_time'
    and n.referencia_id = p_time_id
    and (
      (n.usuario_id = v_owner and n.remetente_id = p_candidato_id)
      or (n.usuario_id = p_candidato_id and n.remetente_id = v_owner)
    );

  get diagnostics v_deleted = row_count;
  return coalesce(v_deleted, 0);
end;
$$;

revoke all on function public.limpar_notificacoes_candidatura_time(bigint, uuid, uuid) from public;
grant execute on function public.limpar_notificacoes_candidatura_time(bigint, uuid, uuid) to authenticated;
