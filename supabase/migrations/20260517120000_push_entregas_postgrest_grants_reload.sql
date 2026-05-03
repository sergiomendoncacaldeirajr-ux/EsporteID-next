-- Push: log de entregas + permissões na API + reload do schema PostgREST.
-- Pré-requisito no mesmo banco: tabelas public.notificacoes e public.push_subscriptions
-- (migração 20260424130000_push_subscriptions.sql, se push_subscriptions ainda não existir).

create table if not exists public.push_entregas_notificacao (
  id bigserial primary key,
  notificacao_id bigint not null references public.notificacoes (id) on delete cascade,
  subscription_id bigint not null references public.push_subscriptions (id) on delete cascade,
  status text not null default 'pendente',
  tentativas integer not null default 0,
  ultimo_erro text,
  enviado_em timestamptz,
  atualizado_em timestamptz not null default now(),
  unique (notificacao_id, subscription_id)
);

create index if not exists idx_push_entregas_notificacao_notif on public.push_entregas_notificacao (notificacao_id);
create index if not exists idx_push_entregas_notificacao_sub on public.push_entregas_notificacao (subscription_id);

create or replace function public.set_push_entregas_notificacao_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_push_entregas_notificacao_updated_at on public.push_entregas_notificacao;
create trigger trg_push_entregas_notificacao_updated_at
before update on public.push_entregas_notificacao
for each row execute function public.set_push_entregas_notificacao_updated_at();

alter table public.push_entregas_notificacao enable row level security;

drop policy if exists "push_entregas_notificacao_owner_read" on public.push_entregas_notificacao;
create policy "push_entregas_notificacao_owner_read"
on public.push_entregas_notificacao
for select
to authenticated
using (
  exists (
    select 1
    from public.push_subscriptions s
    where s.id = subscription_id
      and s.usuario_id = auth.uid()
  )
);

grant select, insert, update, delete on table public.push_entregas_notificacao to service_role;
grant select, insert, update, delete on table public.push_entregas_notificacao to authenticated;

notify pgrst, 'reload schema';
