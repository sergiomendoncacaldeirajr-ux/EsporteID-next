-- Expõe mudanças para o cliente Supabase Realtime (postgres_changes).
-- Sem isso, sininho/footer não recebem eventos e só atualizam ao recarregar.
-- Idempotente: ignora erro se a tabela já estiver na publicação.

do $body$
declare
  tbl text;
begin
  foreach tbl in array array[
    'notificacoes',
    'matches',
    'match_sugestoes',
    'partidas',
    'time_convites',
    'time_candidaturas',
    'times'
  ]::text[]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception
      when duplicate_object then
        null;
      when others then
        if sqlerrm ilike '%already%a member%' or sqlerrm ilike '%já é membro%' then
          null;
        else
          raise;
        end if;
    end;
  end loop;
end;
$body$;
