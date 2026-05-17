create table if not exists public.espaco_staff (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  usuario_id uuid references public.profiles (id) on delete set null,
  convite_email text,
  papel text not null default 'operacao_reservas',
  status text not null default 'pendente',
  pode_ver_agenda boolean not null default true,
  pode_ver_pagamentos boolean not null default true,
  pode_conferir_reservas boolean not null default true,
  pode_editar_configuracao boolean not null default false,
  convidado_por_usuario_id uuid references public.profiles (id) on delete set null,
  observacoes text,
  aceito_em timestamptz,
  revogado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint espaco_staff_papel_ck check (papel in ('operacao_reservas')),
  constraint espaco_staff_status_ck check (status in ('pendente', 'ativo', 'revogado'))
);

create unique index if not exists idx_espaco_staff_unique_usuario
  on public.espaco_staff (espaco_generico_id, usuario_id, papel)
  where usuario_id is not null;

create unique index if not exists idx_espaco_staff_unique_email
  on public.espaco_staff (espaco_generico_id, lower(convite_email), papel)
  where convite_email is not null;

create index if not exists idx_espaco_staff_lookup
  on public.espaco_staff (espaco_generico_id, status, papel);

alter table public.espaco_staff enable row level security;

drop policy if exists "espaco_staff_read" on public.espaco_staff;
create policy "espaco_staff_read"
  on public.espaco_staff for select to authenticated
  using (
    can_manage_espaco(espaco_generico_id, auth.uid())
    or usuario_id = auth.uid()
  );

drop policy if exists "espaco_staff_manage_owner" on public.espaco_staff;
create policy "espaco_staff_manage_owner"
  on public.espaco_staff for all to authenticated
  using (can_manage_espaco(espaco_generico_id, auth.uid()))
  with check (can_manage_espaco(espaco_generico_id, auth.uid()));

drop trigger if exists tr_espaco_staff_touch_updated_at on public.espaco_staff;
create trigger tr_espaco_staff_touch_updated_at
before update on public.espaco_staff
for each row execute function public.espaco_touch_updated_at();
