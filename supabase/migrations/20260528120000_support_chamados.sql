-- Central de suporte: chamados abertos pelo app (WhatsApp no snapshot para contato).

create table if not exists public.support_chamados (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  area text not null,
  mensagem text not null,
  whatsapp_contato text,
  status text not null default 'aberto' check (status in ('aberto', 'resolvido')),
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  constraint support_chamados_area_ck check (
    area in (
      'dashboard',
      'desafio_match',
      'ranking',
      'vagas',
      'perfil',
      'torneios',
      'locais',
      'comunidade',
      'conta',
      'outro'
    )
  )
);

create index if not exists idx_support_chamados_status_criado
  on public.support_chamados (status, criado_em desc);

comment on table public.support_chamados is 'Chamados da central de suporte; admin via service role.';

alter table public.support_chamados enable row level security;

drop policy if exists "support_chamados_insert_own" on public.support_chamados;
create policy "support_chamados_insert_own"
  on public.support_chamados for insert
  to authenticated
  with check (usuario_id = auth.uid());

revoke all on public.support_chamados from public;
grant insert on public.support_chamados to authenticated;
grant select, insert, update, delete on public.support_chamados to service_role;
