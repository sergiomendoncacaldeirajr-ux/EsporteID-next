-- Alinha usuários autenticados ao anon: catálogo `esportes` só expõe linhas ativas.
-- Admin continua vendo tudo via service role (bypass RLS).
drop policy if exists "esportes_select_authenticated" on public.esportes;

create policy "esportes_select_authenticated"
  on public.esportes for select
  to authenticated
  using (ativo = true);
