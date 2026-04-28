create or replace function public.limpar_notificacoes_match_cancelado (
  p_only_user uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  delete from public.notificacoes n
  using public.matches m
  where m.id = n.referencia_id
    and lower(coalesce(n.tipo, '')) in ('match', 'desafio')
    and lower(coalesce(m.status, '')) = 'cancelado'
    and (p_only_user is null or n.usuario_id = p_only_user);

  get diagnostics v_deleted = row_count;
  return coalesce(v_deleted, 0);
end;
$$;

revoke all on function public.limpar_notificacoes_match_cancelado (uuid) from public;
grant execute on function public.limpar_notificacoes_match_cancelado (uuid) to authenticated;
grant execute on function public.limpar_notificacoes_match_cancelado (uuid) to service_role;
