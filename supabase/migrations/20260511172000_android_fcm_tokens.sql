create table if not exists public.android_fcm_tokens (
  id bigserial primary key,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  device text null,
  app_version text null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_android_fcm_tokens_usuario_ativo
  on public.android_fcm_tokens(usuario_id, ativo);

create or replace function public.set_android_fcm_tokens_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_android_fcm_tokens_updated_at on public.android_fcm_tokens;
create trigger trg_android_fcm_tokens_updated_at
before update on public.android_fcm_tokens
for each row execute function public.set_android_fcm_tokens_updated_at();

alter table public.android_fcm_tokens enable row level security;

drop policy if exists "android_fcm_tokens_owner_rw" on public.android_fcm_tokens;
create policy "android_fcm_tokens_owner_rw"
on public.android_fcm_tokens
for all
to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

grant select, insert, update, delete on table public.android_fcm_tokens to authenticated;
grant select, insert, update, delete on table public.android_fcm_tokens to service_role;
