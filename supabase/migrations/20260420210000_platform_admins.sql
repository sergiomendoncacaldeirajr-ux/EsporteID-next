-- Administradores da plataforma (ligados ao Supabase Auth). Não expor em perfil público.

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

create index if not exists idx_platform_admins_user on public.platform_admins (user_id);

alter table public.platform_admins enable row level security;

drop policy if exists "platform_admins_select_own" on public.platform_admins;
create policy "platform_admins_select_own"
  on public.platform_admins for select
  to authenticated
  using (user_id = auth.uid());

-- Sem insert/update/delete para o cliente anon/authenticated — uso via service role ou SQL.

insert into public.platform_admins (user_id)
select id
from auth.users
where lower(email) = lower('sergiomendoncacaldeirajr@gmail.com')
on conflict (user_id) do nothing;

comment on table public.platform_admins is 'Usuários com acesso ao painel /admin (verificação no app + operações com service role).';
