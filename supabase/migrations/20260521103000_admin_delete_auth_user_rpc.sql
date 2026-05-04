-- Fallback para exclusão de usuário quando auth.admin.deleteUser (GoTrue) falha
-- mas o Postgres aceita DELETE em auth.users (ex.: FK já resolvida ou erro transitório da API).

create or replace function public.admin_delete_auth_user_by_id(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if p_id is null then
    return jsonb_build_object('ok', false, 'message', 'null_id');
  end if;

  delete from auth.users
  where id = p_id;

  if not found then
    return jsonb_build_object('ok', true, 'already_missing', true);
  end if;

  return jsonb_build_object('ok', true);
exception
  when others then
    return jsonb_build_object('ok', false, 'message', SQLERRM, 'sqlstate', SQLSTATE);
end;
$$;

comment on function public.admin_delete_auth_user_by_id(uuid) is
  'Uso restrito service_role: remove linha em auth.users. Chamada pelo painel admin se deleteUser HTTP falhar.';

revoke all on function public.admin_delete_auth_user_by_id(uuid) from public;
grant execute on function public.admin_delete_auth_user_by_id(uuid) to service_role;
