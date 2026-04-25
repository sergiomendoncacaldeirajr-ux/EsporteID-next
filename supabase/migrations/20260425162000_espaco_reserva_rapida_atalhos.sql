create table if not exists public.espaco_reserva_atalhos (
  id bigserial primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  criado_em timestamptz not null default timezone('utc', now()),
  unique (usuario_id, espaco_generico_id)
);

create index if not exists idx_espaco_reserva_atalhos_usuario
  on public.espaco_reserva_atalhos (usuario_id, criado_em desc);

alter table public.espaco_reserva_atalhos enable row level security;

drop policy if exists "espaco_reserva_atalhos_select_own" on public.espaco_reserva_atalhos;
create policy "espaco_reserva_atalhos_select_own"
  on public.espaco_reserva_atalhos
  for select
  using (auth.uid() = usuario_id);

drop policy if exists "espaco_reserva_atalhos_insert_own" on public.espaco_reserva_atalhos;
create policy "espaco_reserva_atalhos_insert_own"
  on public.espaco_reserva_atalhos
  for insert
  with check (auth.uid() = usuario_id);

drop policy if exists "espaco_reserva_atalhos_delete_own" on public.espaco_reserva_atalhos;
create policy "espaco_reserva_atalhos_delete_own"
  on public.espaco_reserva_atalhos
  for delete
  using (auth.uid() = usuario_id);
