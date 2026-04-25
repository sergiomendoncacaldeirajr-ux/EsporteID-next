alter table public.reservas_quadra
  add column if not exists torneio_jogo_id bigint references public.torneio_jogos (id) on delete set null;

create table if not exists public.espaco_punicoes_membro (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  denuncia_id bigint references public.denuncias (id) on delete set null,
  tipo_punicao text not null default 'suspensao_marcacao',
  status text not null default 'ativa',
  motivo text,
  inicio_em timestamptz not null default now(),
  fim_em timestamptz,
  criado_por_usuario_id uuid not null references public.profiles (id) on delete cascade,
  atualizado_por_usuario_id uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint espaco_punicoes_membro_tipo_ck check (tipo_punicao in ('suspensao_marcacao')),
  constraint espaco_punicoes_membro_status_ck check (status in ('ativa', 'suspensa', 'encerrada')),
  constraint espaco_punicoes_membro_periodo_ck check (fim_em is null or fim_em > inicio_em)
);

create index if not exists idx_espaco_punicoes_lookup
  on public.espaco_punicoes_membro (espaco_generico_id, usuario_id, status, inicio_em desc);

drop trigger if exists tr_espaco_punicoes_membro_touch_updated_at on public.espaco_punicoes_membro;
create trigger tr_espaco_punicoes_membro_touch_updated_at
before update on public.espaco_punicoes_membro
for each row execute function public.espaco_touch_updated_at();

alter table public.espaco_punicoes_membro enable row level security;

drop policy if exists "espaco_punicoes_owner_all" on public.espaco_punicoes_membro;
create policy "espaco_punicoes_owner_all"
  on public.espaco_punicoes_membro for all to authenticated
  using (
    exists (
      select 1
      from public.espacos_genericos eg
      where eg.id = espaco_punicoes_membro.espaco_generico_id
        and (eg.criado_por_usuario_id = auth.uid() or eg.responsavel_usuario_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.espacos_genericos eg
      where eg.id = espaco_punicoes_membro.espaco_generico_id
        and (eg.criado_por_usuario_id = auth.uid() or eg.responsavel_usuario_id = auth.uid())
    )
  );

alter table public.espaco_assinaturas_plataforma
  add column if not exists trial_inicio date,
  add column if not exists asaas_customer_id text,
  add column if not exists recorrencia_cartao_confirmada_em timestamptz,
  add column if not exists cancelamento_bloqueado_ate date,
  add column if not exists cancelamento_solicitado_em timestamptz,
  add column if not exists cancelamento_efetivo_em timestamptz;

comment on column public.espaco_assinaturas_plataforma.trial_inicio is
  'Data inicial do mês gratuito da plataforma.';
comment on column public.espaco_assinaturas_plataforma.recorrencia_cartao_confirmada_em is
  'Momento em que a recorrência via cartão foi confirmada no gateway.';
comment on column public.espaco_assinaturas_plataforma.cancelamento_bloqueado_ate is
  'Data mínima para permitir cancelamento (regra de permanência).';
