create table if not exists public.admin_user_activity (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_path text,
  last_title text,
  last_user_agent text,
  localizacao text,
  total_active_seconds integer not null default 0,
  heartbeat_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_user_page_activity (
  user_id uuid not null references public.profiles(id) on delete cascade,
  path text not null,
  title text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  total_active_seconds integer not null default 0,
  view_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, path)
);

alter table public.admin_user_activity enable row level security;
alter table public.admin_user_page_activity enable row level security;

drop policy if exists admin_user_activity_service_role_all on public.admin_user_activity;
create policy admin_user_activity_service_role_all
  on public.admin_user_activity
  for all
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

drop policy if exists admin_user_page_activity_service_role_all on public.admin_user_page_activity;
create policy admin_user_page_activity_service_role_all
  on public.admin_user_page_activity
  for all
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

grant select, insert, update, delete on public.admin_user_activity to service_role;
grant select, insert, update, delete on public.admin_user_page_activity to service_role;
