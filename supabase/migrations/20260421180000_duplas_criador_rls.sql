-- Dono da dupla registrada: quem criou o registro (edição só deste usuário).
-- Legado: assume-se player1 como criador quando criador_id é nulo.

alter table public.duplas
  add column if not exists criador_id uuid references public.profiles (id) on delete set null;

update public.duplas
set criador_id = player1_id
where criador_id is null;

create index if not exists idx_duplas_criador on public.duplas (criador_id);

drop policy if exists "duplas_own" on public.duplas;

create policy "duplas_insert_criador"
  on public.duplas for insert
  to authenticated
  with check (
    criador_id = auth.uid()
    and (player1_id = auth.uid() or player2_id = auth.uid())
  );

create policy "duplas_update_criador"
  on public.duplas for update
  to authenticated
  using (criador_id = auth.uid())
  with check (criador_id = auth.uid());

create policy "duplas_delete_criador"
  on public.duplas for delete
  to authenticated
  using (criador_id = auth.uid());
