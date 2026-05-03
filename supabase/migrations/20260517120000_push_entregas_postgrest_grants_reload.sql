-- Garante permissões na API e força o PostgREST a recarregar o schema cache.
-- Sem isso, supabase-js pode retornar: "Could not find the table 'public.push_entregas_notificacao' in the schema cache"
-- mesmo com a tabela criada no Postgres.

grant select, insert, update, delete on table public.push_entregas_notificacao to service_role;
grant select, insert, update, delete on table public.push_entregas_notificacao to authenticated;

notify pgrst, 'reload schema';
