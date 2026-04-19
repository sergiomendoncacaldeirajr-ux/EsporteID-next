-- Solicitações de organizadores para usar locais de terceiros em torneios.
create table if not exists public.local_organizadores_solicitacoes (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  solicitante_id uuid not null references public.profiles (id) on delete cascade,
  dono_usuario_id uuid not null references public.profiles (id) on delete cascade,
  esportes_ids_json text,
  mensagem text,
  status text not null default 'pendente',
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  resolvido_por_usuario_id uuid references public.profiles (id) on delete set null
);

create index if not exists idx_los_solicitante on public.local_organizadores_solicitacoes (solicitante_id);
create index if not exists idx_los_dono on public.local_organizadores_solicitacoes (dono_usuario_id);
create index if not exists idx_los_espaco on public.local_organizadores_solicitacoes (espaco_generico_id);

alter table public.local_organizadores_solicitacoes enable row level security;

drop policy if exists "los_read" on public.local_organizadores_solicitacoes;
create policy "los_read"
on public.local_organizadores_solicitacoes
for select
to authenticated
using (solicitante_id = auth.uid() or dono_usuario_id = auth.uid());

drop policy if exists "los_insert_own" on public.local_organizadores_solicitacoes;
create policy "los_insert_own"
on public.local_organizadores_solicitacoes
for insert
to authenticated
with check (solicitante_id = auth.uid());

drop policy if exists "los_update_owner" on public.local_organizadores_solicitacoes;
create policy "los_update_owner"
on public.local_organizadores_solicitacoes
for update
to authenticated
using (dono_usuario_id = auth.uid() or solicitante_id = auth.uid())
with check (dono_usuario_id = auth.uid() or solicitante_id = auth.uid());
