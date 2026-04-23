create table if not exists public.push_subscriptions (
  id bigserial primary key,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_usuario_ativo
  on public.push_subscriptions(usuario_id, ativo);

create or replace function public.set_push_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.set_push_subscriptions_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_owner_rw" on public.push_subscriptions;
create policy "push_subscriptions_owner_rw"
on public.push_subscriptions
for all
to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);
