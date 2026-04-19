-- Metadados e mapas para importação MySQL → Supabase (uso com service_role / Postgres direto).
-- Não expor ao cliente: RLS sem políticas para anon/authenticated.

create table if not exists public.legacy_import_meta (
  key text primary key,
  value_json jsonb,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.legacy_usuario_map (
  mysql_id bigint primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  email text,
  importado_em timestamptz not null default now()
);

-- Sem unique em profile_id: e-mails duplicados no MySQL podem mapear o mesmo auth.users
create index if not exists idx_legacy_usuario_profile on public.legacy_usuario_map (profile_id);

create index if not exists idx_legacy_usuario_email on public.legacy_usuario_map (email);

create table if not exists public.legacy_esporte_map (
  mysql_id bigint primary key,
  esporte_id bigint not null references public.esportes (id) on delete cascade
);

create index if not exists idx_legacy_esporte_pg on public.legacy_esporte_map (esporte_id);

alter table public.legacy_import_meta enable row level security;
alter table public.legacy_usuario_map enable row level security;
alter table public.legacy_esporte_map enable row level security;
