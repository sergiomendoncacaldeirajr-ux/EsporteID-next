create table if not exists public.time_candidaturas (
  id bigserial primary key,
  time_id bigint not null references public.times(id) on delete cascade,
  candidato_usuario_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pendente',
  mensagem text null,
  respondido_por_usuario_id uuid null references auth.users(id) on delete set null,
  respondido_em timestamptz null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint time_candidaturas_status_ck
    check (status in ('pendente', 'aceita', 'recusada', 'cancelada')),
  constraint time_candidaturas_unique unique (time_id, candidato_usuario_id)
);

create index if not exists idx_time_candidaturas_time_status
  on public.time_candidaturas(time_id, status, criado_em desc);

create index if not exists idx_time_candidaturas_candidato_status
  on public.time_candidaturas(candidato_usuario_id, status, criado_em desc);

create or replace function public.set_time_candidaturas_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_time_candidaturas_updated_at on public.time_candidaturas;
create trigger trg_time_candidaturas_updated_at
before update on public.time_candidaturas
for each row execute function public.set_time_candidaturas_updated_at();

alter table public.time_candidaturas enable row level security;

drop policy if exists "time_candidaturas_select_owner_or_candidate" on public.time_candidaturas;
create policy "time_candidaturas_select_owner_or_candidate"
on public.time_candidaturas
for select
to authenticated
using (
  auth.uid() = candidato_usuario_id
  or exists (
    select 1
    from public.times t
    where t.id = time_id
      and t.criador_id = auth.uid()
  )
);

drop policy if exists "time_candidaturas_insert_candidate" on public.time_candidaturas;
create policy "time_candidaturas_insert_candidate"
on public.time_candidaturas
for insert
to authenticated
with check (auth.uid() = candidato_usuario_id);

drop policy if exists "time_candidaturas_update_owner_or_candidate" on public.time_candidaturas;
create policy "time_candidaturas_update_owner_or_candidate"
on public.time_candidaturas
for update
to authenticated
using (
  auth.uid() = candidato_usuario_id
  or exists (
    select 1
    from public.times t
    where t.id = time_id
      and t.criador_id = auth.uid()
  )
)
with check (
  auth.uid() = candidato_usuario_id
  or exists (
    select 1
    from public.times t
    where t.id = time_id
      and t.criador_id = auth.uid()
  )
);
