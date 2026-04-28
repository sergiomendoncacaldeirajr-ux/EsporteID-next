alter table public.usuario_eid
  add column if not exists atualizado_em timestamptz not null default now();
