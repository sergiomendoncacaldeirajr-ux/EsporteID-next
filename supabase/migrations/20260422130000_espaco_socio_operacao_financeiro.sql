-- Gestão unificada de espaços, sócios, reservas, auditoria e financeiro.
-- Complementa o domínio legado sem substituir `espacos_genericos` e `reservas_quadra`.

alter table public.espacos_genericos
  add column if not exists slug text,
  add column if not exists descricao_curta text,
  add column if not exists descricao_longa text,
  add column if not exists cidade text,
  add column if not exists uf text,
  add column if not exists codigo_ibge text,
  add column if not exists cover_arquivo text,
  add column if not exists whatsapp_contato text,
  add column if not exists email_contato text,
  add column if not exists website_url text,
  add column if not exists instagram_url text,
  add column if not exists aceita_socios boolean not null default false,
  add column if not exists permite_professores_aprovados boolean not null default true,
  add column if not exists operacao_status text not null default 'rascunho',
  add column if not exists onboarding_documental_status text not null default 'pendente',
  add column if not exists configuracao_reservas_json jsonb not null default '{}'::jsonb;

alter table public.membership_requests
  add column if not exists plano_socio_id bigint,
  add column if not exists mensagem text,
  add column if not exists atualizado_em timestamptz not null default now();

alter table public.clube_assinaturas
  add column if not exists espaco_generico_id bigint references public.espacos_genericos (id) on delete cascade;

alter table public.reservas_quadra
  add column if not exists espaco_unidade_id bigint,
  add column if not exists plano_socio_id bigint,
  add column if not exists espaco_socio_id bigint,
  add column if not exists origem_reserva text not null default 'avulsa',
  add column if not exists reserva_gratuita boolean not null default false,
  add column if not exists observacoes text,
  add column if not exists motivo_cancelamento text,
  add column if not exists cancelado_por uuid references public.profiles (id) on delete set null,
  add column if not exists cancelado_em timestamptz,
  add column if not exists partida_id bigint references public.partidas (id) on delete set null,
  add column if not exists torneio_id bigint references public.torneios (id) on delete set null,
  add column if not exists professor_aula_id bigint references public.professor_aulas (id) on delete set null,
  add column if not exists atualizado_por uuid references public.profiles (id) on delete set null,
  add column if not exists detalhes_json jsonb not null default '{}'::jsonb;

alter table public.ei_financeiro_config
  add column if not exists espaco_assinatura_base numeric(10, 2) not null default 99.90,
  add column if not exists espaco_assinatura_desconto_progressivo numeric(8, 6) not null default 0.100000,
  add column if not exists espaco_professor_comissao_percentual numeric(8, 6) not null default 0.100000,
  add column if not exists espaco_waitlist_expiracao_minutos int not null default 60;

create unique index if not exists idx_espacos_genericos_slug_unique
  on public.espacos_genericos (lower(slug))
  where slug is not null;

create table if not exists public.espaco_unidades (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  nome text not null,
  tipo_unidade text not null default 'quadra',
  superficie text,
  esporte_id bigint references public.esportes (id) on delete set null,
  modalidade text,
  coberta boolean not null default false,
  indoor boolean not null default false,
  iluminacao boolean not null default false,
  capacidade int not null default 2,
  status_operacao text not null default 'ativa',
  aceita_aulas boolean not null default true,
  aceita_torneios boolean not null default true,
  observacoes text,
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.espaco_horarios_semanais (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  espaco_unidade_id bigint references public.espaco_unidades (id) on delete cascade,
  dia_semana smallint not null,
  hora_inicio time not null,
  hora_fim time not null,
  prioridade int not null default 1,
  ativo boolean not null default true,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint espaco_horarios_semanais_dia_ck check (dia_semana between 0 and 6),
  constraint espaco_horarios_semanais_faixa_ck check (hora_fim > hora_inicio)
);

create table if not exists public.espaco_feriados_personalizados (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  nome text not null,
  data_inicio date not null,
  data_fim date not null,
  recorrente_anual boolean not null default false,
  bloqueia_reservas boolean not null default true,
  observacoes text,
  criado_por_usuario_id uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint espaco_feriados_personalizados_faixa_ck check (data_fim >= data_inicio)
);

create table if not exists public.espaco_feriados_cache (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  ano int not null,
  fonte text not null default 'brasilapi',
  codigo_ibge text,
  payload_json jsonb not null default '[]'::jsonb,
  atualizado_em timestamptz not null default now(),
  unique (espaco_generico_id, ano, fonte)
);

create table if not exists public.espaco_bloqueios (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  espaco_unidade_id bigint references public.espaco_unidades (id) on delete cascade,
  titulo text not null,
  motivo text,
  tipo_bloqueio text not null default 'manutencao',
  inicio timestamptz not null,
  fim timestamptz not null,
  criado_por_usuario_id uuid references public.profiles (id) on delete set null,
  recorrencia_json jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint espaco_bloqueios_faixa_ck check (fim > inicio)
);

create table if not exists public.espaco_planos_socio (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  nome text not null,
  slug text,
  descricao text,
  ativo boolean not null default true,
  ordem int not null default 0,
  mensalidade_centavos int not null default 0,
  taxa_adesao_centavos int not null default 0,
  limite_reservas_dia int,
  limite_reservas_semana int,
  cooldown_horas int not null default 0,
  antecedencia_min_horas int not null default 0,
  antecedencia_max_dias int not null default 30,
  reservas_gratuitas_semana int not null default 0,
  percentual_desconto_avulso numeric(8, 6) not null default 0,
  prioridade_waitlist int not null default 0,
  permite_convidados boolean not null default false,
  acesso_unidades_json jsonb not null default '[]'::jsonb,
  beneficios_json jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.espaco_socios (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  membership_request_id bigint references public.membership_requests (id) on delete set null,
  plano_socio_id bigint references public.espaco_planos_socio (id) on delete set null,
  matricula text,
  status text not null default 'em_analise',
  documentos_status text not null default 'pendente',
  financeiro_status text not null default 'pendente',
  beneficios_liberados boolean not null default false,
  bloqueado_beneficios_em timestamptz,
  motivo_bloqueio text,
  aprovado_por_usuario_id uuid references public.profiles (id) on delete set null,
  aprovado_em timestamptz,
  rejeitado_em timestamptz,
  rejeitado_por_usuario_id uuid references public.profiles (id) on delete set null,
  motivo_rejeicao text,
  ativo_desde timestamptz,
  validade_ate timestamptz,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint espaco_socios_status_ck check (
    status in ('pendente_documentos', 'em_analise', 'ativo', 'inadimplente', 'suspenso', 'rejeitado', 'cancelado')
  ),
  constraint espaco_socios_docs_ck check (
    documentos_status in ('pendente', 'parcial', 'aprovado', 'rejeitado')
  ),
  constraint espaco_socios_financeiro_ck check (
    financeiro_status in ('pendente', 'em_dia', 'inadimplente', 'cancelado')
  ),
  unique (espaco_generico_id, usuario_id)
);

create table if not exists public.espaco_documentos_socio (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  espaco_socio_id bigint references public.espaco_socios (id) on delete cascade,
  membership_request_id bigint references public.membership_requests (id) on delete set null,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  tipo_documento text not null,
  bucket text not null default 'espaco-documentos',
  arquivo_path text not null,
  mime_type text,
  status text not null default 'pendente',
  motivo_rejeicao text,
  metadata_json jsonb not null default '{}'::jsonb,
  revisado_por_usuario_id uuid references public.profiles (id) on delete set null,
  revisado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint espaco_documentos_socio_status_ck check (status in ('pendente', 'aprovado', 'rejeitado'))
);

create table if not exists public.espaco_reserva_participantes (
  id bigint generated always as identity primary key,
  reserva_quadra_id bigint not null references public.reservas_quadra (id) on delete cascade,
  usuario_id uuid references public.profiles (id) on delete cascade,
  time_id bigint references public.times (id) on delete set null,
  dupla_id bigint references public.duplas (id) on delete set null,
  papel text not null default 'titular',
  status text not null default 'confirmado',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint espaco_reserva_participantes_status_ck check (status in ('confirmado', 'pendente', 'cancelado'))
);

create table if not exists public.espaco_waitlist (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  espaco_unidade_id bigint references public.espaco_unidades (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint references public.esportes (id) on delete set null,
  inicio timestamptz not null,
  fim timestamptz not null,
  prioridade int not null default 0,
  status text not null default 'ativa',
  origem text not null default 'manual',
  notificado_em timestamptz,
  expira_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint espaco_waitlist_status_ck check (status in ('ativa', 'notificada', 'convertida', 'cancelada', 'expirada')),
  constraint espaco_waitlist_faixa_ck check (fim > inicio)
);

create table if not exists public.espaco_transacoes (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  usuario_id uuid references public.profiles (id) on delete set null,
  espaco_socio_id bigint references public.espaco_socios (id) on delete set null,
  reserva_quadra_id bigint references public.reservas_quadra (id) on delete set null,
  assinatura_plataforma_id bigint,
  assinatura_socio_id bigint,
  tipo text not null,
  billing_type text not null default 'PIX',
  status text not null default 'pending',
  valor_bruto_centavos int not null default 0,
  taxa_gateway_centavos int not null default 0,
  comissao_plataforma_centavos int not null default 0,
  valor_liquido_espaco_centavos int not null default 0,
  asaas_customer_id text,
  asaas_payment_id text,
  asaas_subscription_id text,
  asaas_charge_url text,
  external_reference text,
  vencimento_em date,
  pago_em timestamptz,
  detalhes_json jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint espaco_transacoes_tipo_ck check (
    tipo in ('mensalidade_socio', 'reserva_avulsa', 'taxa_adesao', 'mensalidade_plataforma_espaco', 'ajuste', 'comissao_professor')
  ),
  constraint espaco_transacoes_status_ck check (
    status in ('pending', 'processing', 'received', 'overdue', 'refunded', 'cancelled')
  )
);

create table if not exists public.espaco_socio_assinaturas (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  espaco_socio_id bigint not null unique references public.espaco_socios (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  plano_socio_id bigint references public.espaco_planos_socio (id) on delete set null,
  asaas_subscription_id text,
  status text not null default 'pending',
  valor_mensal_centavos int not null default 0,
  proxima_cobranca date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.espaco_assinaturas_plataforma (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null unique references public.espacos_genericos (id) on delete cascade,
  responsavel_usuario_id uuid not null references public.profiles (id) on delete cascade,
  asaas_subscription_id text,
  status text not null default 'trial',
  plano_nome text not null default 'Essencial',
  valor_mensal_centavos int not null default 9990,
  desconto_progressivo_percentual numeric(8, 6) not null default 0,
  proxima_cobranca date,
  trial_ate date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.espaco_auditoria (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  entidade_tipo text not null,
  entidade_id bigint,
  acao text not null,
  motivo text,
  autor_usuario_id uuid references public.profiles (id) on delete set null,
  payload_json jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

alter table public.membership_requests
  add constraint membership_requests_plano_socio_id_fkey
  foreign key (plano_socio_id) references public.espaco_planos_socio (id) on delete set null;

alter table public.reservas_quadra
  add constraint reservas_quadra_espaco_unidade_id_fkey
  foreign key (espaco_unidade_id) references public.espaco_unidades (id) on delete set null;

alter table public.reservas_quadra
  add constraint reservas_quadra_plano_socio_id_fkey
  foreign key (plano_socio_id) references public.espaco_planos_socio (id) on delete set null;

alter table public.reservas_quadra
  add constraint reservas_quadra_espaco_socio_id_fkey
  foreign key (espaco_socio_id) references public.espaco_socios (id) on delete set null;

alter table public.espaco_transacoes
  add constraint espaco_transacoes_assinatura_plataforma_id_fkey
  foreign key (assinatura_plataforma_id) references public.espaco_assinaturas_plataforma (id) on delete set null;

alter table public.espaco_transacoes
  add constraint espaco_transacoes_assinatura_socio_id_fkey
  foreign key (assinatura_socio_id) references public.espaco_socio_assinaturas (id) on delete set null;

create index if not exists idx_espaco_unidades_espaco
  on public.espaco_unidades (espaco_generico_id, ativo, status_operacao);
create index if not exists idx_espaco_horarios_semanais_espaco
  on public.espaco_horarios_semanais (espaco_generico_id, espaco_unidade_id, dia_semana);
create index if not exists idx_espaco_bloqueios_faixa
  on public.espaco_bloqueios (espaco_generico_id, espaco_unidade_id, inicio, fim);
create index if not exists idx_espaco_planos_socio_espaco
  on public.espaco_planos_socio (espaco_generico_id, ativo, ordem);
create index if not exists idx_espaco_socios_espaco
  on public.espaco_socios (espaco_generico_id, status, financeiro_status, documentos_status);
create index if not exists idx_espaco_documentos_socio_lookup
  on public.espaco_documentos_socio (espaco_generico_id, usuario_id, status);
create index if not exists idx_espaco_reserva_participantes_reserva
  on public.espaco_reserva_participantes (reserva_quadra_id, status);
create index if not exists idx_espaco_waitlist_slot
  on public.espaco_waitlist (espaco_generico_id, espaco_unidade_id, inicio, fim, status);
create index if not exists idx_espaco_transacoes_lookup
  on public.espaco_transacoes (espaco_generico_id, tipo, status, criado_em desc);
create index if not exists idx_espaco_assinaturas_plataforma_status
  on public.espaco_assinaturas_plataforma (status, proxima_cobranca);
create index if not exists idx_espaco_socio_assinaturas_status
  on public.espaco_socio_assinaturas (status, proxima_cobranca);
create index if not exists idx_espaco_auditoria_lookup
  on public.espaco_auditoria (espaco_generico_id, criado_em desc);
create index if not exists idx_reservas_quadra_espaco_agenda
  on public.reservas_quadra (espaco_generico_id, espaco_unidade_id, inicio, fim, status_reserva);

create or replace function public.espaco_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create or replace function public.is_platform_admin_uid(p_user uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = p_user
  );
$$;

create or replace function public.can_manage_espaco(
  p_espaco_id bigint,
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.espacos_genericos eg
    where eg.id = p_espaco_id
      and (
        eg.criado_por_usuario_id = p_user
        or eg.responsavel_usuario_id = p_user
        or public.is_platform_admin_uid(p_user)
      )
  );
$$;

create or replace function public.espaco_socio_beneficios_liberados(
  p_espaco_id bigint,
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.espaco_socios es
    where es.espaco_generico_id = p_espaco_id
      and es.usuario_id = p_user
      and es.status = 'ativo'
      and es.documentos_status = 'aprovado'
      and es.financeiro_status = 'em_dia'
      and es.beneficios_liberados = true
  );
$$;

create or replace function public.espaco_criar_auditoria(
  p_espaco_id bigint,
  p_entidade_tipo text,
  p_entidade_id bigint,
  p_acao text,
  p_motivo text default null,
  p_payload jsonb default '{}'::jsonb,
  p_autor_usuario_id uuid default auth.uid()
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  insert into public.espaco_auditoria (
    espaco_generico_id,
    entidade_tipo,
    entidade_id,
    acao,
    motivo,
    autor_usuario_id,
    payload_json
  )
  values (
    p_espaco_id,
    p_entidade_tipo,
    p_entidade_id,
    p_acao,
    p_motivo,
    p_autor_usuario_id,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

drop trigger if exists tr_espaco_unidades_touch_updated_at on public.espaco_unidades;
create trigger tr_espaco_unidades_touch_updated_at
before update on public.espaco_unidades
for each row execute function public.espaco_touch_updated_at();

drop trigger if exists tr_espaco_horarios_semanais_touch_updated_at on public.espaco_horarios_semanais;
create trigger tr_espaco_horarios_semanais_touch_updated_at
before update on public.espaco_horarios_semanais
for each row execute function public.espaco_touch_updated_at();

drop trigger if exists tr_espaco_feriados_personalizados_touch_updated_at on public.espaco_feriados_personalizados;
create trigger tr_espaco_feriados_personalizados_touch_updated_at
before update on public.espaco_feriados_personalizados
for each row execute function public.espaco_touch_updated_at();

drop trigger if exists tr_espaco_bloqueios_touch_updated_at on public.espaco_bloqueios;
create trigger tr_espaco_bloqueios_touch_updated_at
before update on public.espaco_bloqueios
for each row execute function public.espaco_touch_updated_at();

drop trigger if exists tr_espaco_planos_socio_touch_updated_at on public.espaco_planos_socio;
create trigger tr_espaco_planos_socio_touch_updated_at
before update on public.espaco_planos_socio
for each row execute function public.espaco_touch_updated_at();

drop trigger if exists tr_espaco_socios_touch_updated_at on public.espaco_socios;
create trigger tr_espaco_socios_touch_updated_at
before update on public.espaco_socios
for each row execute function public.espaco_touch_updated_at();

drop trigger if exists tr_espaco_documentos_socio_touch_updated_at on public.espaco_documentos_socio;
create trigger tr_espaco_documentos_socio_touch_updated_at
before update on public.espaco_documentos_socio
for each row execute function public.espaco_touch_updated_at();

drop trigger if exists tr_espaco_reserva_participantes_touch_updated_at on public.espaco_reserva_participantes;
create trigger tr_espaco_reserva_participantes_touch_updated_at
before update on public.espaco_reserva_participantes
for each row execute function public.espaco_touch_updated_at();

drop trigger if exists tr_espaco_waitlist_touch_updated_at on public.espaco_waitlist;
create trigger tr_espaco_waitlist_touch_updated_at
before update on public.espaco_waitlist
for each row execute function public.espaco_touch_updated_at();

drop trigger if exists tr_espaco_transacoes_touch_updated_at on public.espaco_transacoes;
create trigger tr_espaco_transacoes_touch_updated_at
before update on public.espaco_transacoes
for each row execute function public.espaco_touch_updated_at();

drop trigger if exists tr_espaco_socio_assinaturas_touch_updated_at on public.espaco_socio_assinaturas;
create trigger tr_espaco_socio_assinaturas_touch_updated_at
before update on public.espaco_socio_assinaturas
for each row execute function public.espaco_touch_updated_at();

drop trigger if exists tr_espaco_assinaturas_plataforma_touch_updated_at on public.espaco_assinaturas_plataforma;
create trigger tr_espaco_assinaturas_plataforma_touch_updated_at
before update on public.espaco_assinaturas_plataforma
for each row execute function public.espaco_touch_updated_at();

alter table public.espaco_unidades enable row level security;
alter table public.espaco_horarios_semanais enable row level security;
alter table public.espaco_feriados_personalizados enable row level security;
alter table public.espaco_feriados_cache enable row level security;
alter table public.espaco_bloqueios enable row level security;
alter table public.espaco_planos_socio enable row level security;
alter table public.espaco_socios enable row level security;
alter table public.espaco_documentos_socio enable row level security;
alter table public.espaco_reserva_participantes enable row level security;
alter table public.espaco_waitlist enable row level security;
alter table public.espaco_transacoes enable row level security;
alter table public.espaco_socio_assinaturas enable row level security;
alter table public.espaco_assinaturas_plataforma enable row level security;
alter table public.espaco_auditoria enable row level security;

drop policy if exists "rq_public_read_auth" on public.reservas_quadra;
create policy "rq_public_read_auth"
  on public.reservas_quadra for select to authenticated
  using (
    exists (
      select 1
      from public.espacos_genericos eg
      where eg.id = espaco_generico_id
        and eg.ativo_listagem = true
    )
  );

drop policy if exists "rq_public_read_anon" on public.reservas_quadra;
create policy "rq_public_read_anon"
  on public.reservas_quadra for select to anon
  using (
    status_reserva in ('confirmada', 'agendada', 'aguardando_pagamento')
    and exists (
      select 1
      from public.espacos_genericos eg
      where eg.id = espaco_generico_id
        and eg.ativo_listagem = true
    )
  );

drop policy if exists "espaco_unidades_select_public" on public.espaco_unidades;
create policy "espaco_unidades_select_public"
  on public.espaco_unidades for select to authenticated
  using (true);

drop policy if exists "espaco_unidades_select_public_anon" on public.espaco_unidades;
create policy "espaco_unidades_select_public_anon"
  on public.espaco_unidades for select to anon
  using (
    ativo = true
    and exists (
      select 1
      from public.espacos_genericos eg
      where eg.id = espaco_generico_id
        and eg.ativo_listagem = true
    )
  );

drop policy if exists "espaco_unidades_owner_all" on public.espaco_unidades;
create policy "espaco_unidades_owner_all"
  on public.espaco_unidades for all to authenticated
  using (public.can_manage_espaco(espaco_generico_id))
  with check (public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_horarios_semanais_select_public" on public.espaco_horarios_semanais;
create policy "espaco_horarios_semanais_select_public"
  on public.espaco_horarios_semanais for select to authenticated
  using (true);

drop policy if exists "espaco_horarios_semanais_select_public_anon" on public.espaco_horarios_semanais;
create policy "espaco_horarios_semanais_select_public_anon"
  on public.espaco_horarios_semanais for select to anon
  using (
    ativo = true
    and exists (
      select 1
      from public.espacos_genericos eg
      where eg.id = espaco_generico_id
        and eg.ativo_listagem = true
    )
  );

drop policy if exists "espaco_horarios_semanais_owner_all" on public.espaco_horarios_semanais;
create policy "espaco_horarios_semanais_owner_all"
  on public.espaco_horarios_semanais for all to authenticated
  using (public.can_manage_espaco(espaco_generico_id))
  with check (public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_feriados_personalizados_select" on public.espaco_feriados_personalizados;
create policy "espaco_feriados_personalizados_select"
  on public.espaco_feriados_personalizados for select to authenticated
  using (true);

drop policy if exists "espaco_feriados_personalizados_owner_all" on public.espaco_feriados_personalizados;
create policy "espaco_feriados_personalizados_owner_all"
  on public.espaco_feriados_personalizados for all to authenticated
  using (public.can_manage_espaco(espaco_generico_id))
  with check (public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_feriados_cache_owner_read" on public.espaco_feriados_cache;
create policy "espaco_feriados_cache_owner_read"
  on public.espaco_feriados_cache for select to authenticated
  using (public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_feriados_cache_owner_all" on public.espaco_feriados_cache;
create policy "espaco_feriados_cache_owner_all"
  on public.espaco_feriados_cache for all to authenticated
  using (public.can_manage_espaco(espaco_generico_id))
  with check (public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_bloqueios_select" on public.espaco_bloqueios;
create policy "espaco_bloqueios_select"
  on public.espaco_bloqueios for select to authenticated
  using (
    public.can_manage_espaco(espaco_generico_id)
    or exists (
      select 1
      from public.espacos_genericos eg
      where eg.id = espaco_generico_id
        and eg.ativo_listagem = true
    )
  );

drop policy if exists "espaco_bloqueios_owner_all" on public.espaco_bloqueios;
create policy "espaco_bloqueios_owner_all"
  on public.espaco_bloqueios for all to authenticated
  using (public.can_manage_espaco(espaco_generico_id))
  with check (public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_planos_socio_select" on public.espaco_planos_socio;
create policy "espaco_planos_socio_select"
  on public.espaco_planos_socio for select to authenticated
  using (true);

drop policy if exists "espaco_planos_socio_select_anon" on public.espaco_planos_socio;
create policy "espaco_planos_socio_select_anon"
  on public.espaco_planos_socio for select to anon
  using (
    ativo = true
    and exists (
      select 1
      from public.espacos_genericos eg
      where eg.id = espaco_generico_id
        and eg.ativo_listagem = true
    )
  );

drop policy if exists "espaco_planos_socio_owner_all" on public.espaco_planos_socio;
create policy "espaco_planos_socio_owner_all"
  on public.espaco_planos_socio for all to authenticated
  using (public.can_manage_espaco(espaco_generico_id))
  with check (public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_socios_participantes" on public.espaco_socios;
create policy "espaco_socios_participantes"
  on public.espaco_socios for select to authenticated
  using (
    usuario_id = auth.uid()
    or public.can_manage_espaco(espaco_generico_id)
  );

drop policy if exists "espaco_socios_self_insert" on public.espaco_socios;
create policy "espaco_socios_self_insert"
  on public.espaco_socios for insert to authenticated
  with check (usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_socios_owner_update" on public.espaco_socios;
create policy "espaco_socios_owner_update"
  on public.espaco_socios for update to authenticated
  using (usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id))
  with check (usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_documentos_socio_participantes" on public.espaco_documentos_socio;
create policy "espaco_documentos_socio_participantes"
  on public.espaco_documentos_socio for select to authenticated
  using (
    usuario_id = auth.uid()
    or public.can_manage_espaco(espaco_generico_id)
  );

drop policy if exists "espaco_documentos_socio_self_insert" on public.espaco_documentos_socio;
create policy "espaco_documentos_socio_self_insert"
  on public.espaco_documentos_socio for insert to authenticated
  with check (usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_documentos_socio_owner_update" on public.espaco_documentos_socio;
create policy "espaco_documentos_socio_owner_update"
  on public.espaco_documentos_socio for update to authenticated
  using (usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id))
  with check (usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_reserva_participantes_participantes" on public.espaco_reserva_participantes;
create policy "espaco_reserva_participantes_participantes"
  on public.espaco_reserva_participantes for select to authenticated
  using (
    usuario_id = auth.uid()
    or exists (
      select 1
      from public.reservas_quadra rq
      where rq.id = reserva_quadra_id
        and (
          rq.usuario_solicitante_id = auth.uid()
          or public.can_manage_espaco(rq.espaco_generico_id)
        )
    )
  );

drop policy if exists "espaco_reserva_participantes_public_auth" on public.espaco_reserva_participantes;
create policy "espaco_reserva_participantes_public_auth"
  on public.espaco_reserva_participantes for select to authenticated
  using (
    exists (
      select 1
      from public.reservas_quadra rq
      join public.espacos_genericos eg on eg.id = rq.espaco_generico_id
      where rq.id = reserva_quadra_id
        and eg.ativo_listagem = true
        and rq.status_reserva in ('confirmada', 'agendada')
    )
  );

drop policy if exists "espaco_reserva_participantes_public_anon" on public.espaco_reserva_participantes;
create policy "espaco_reserva_participantes_public_anon"
  on public.espaco_reserva_participantes for select to anon
  using (
    exists (
      select 1
      from public.reservas_quadra rq
      join public.espacos_genericos eg on eg.id = rq.espaco_generico_id
      where rq.id = reserva_quadra_id
        and eg.ativo_listagem = true
        and rq.status_reserva in ('confirmada', 'agendada')
    )
  );

drop policy if exists "espaco_reserva_participantes_insert" on public.espaco_reserva_participantes;
create policy "espaco_reserva_participantes_insert"
  on public.espaco_reserva_participantes for insert to authenticated
  with check (
    usuario_id = auth.uid()
    or exists (
      select 1
      from public.reservas_quadra rq
      where rq.id = reserva_quadra_id
        and (
          rq.usuario_solicitante_id = auth.uid()
          or public.can_manage_espaco(rq.espaco_generico_id)
        )
    )
  );

drop policy if exists "espaco_reserva_participantes_update" on public.espaco_reserva_participantes;
create policy "espaco_reserva_participantes_update"
  on public.espaco_reserva_participantes for update to authenticated
  using (
    usuario_id = auth.uid()
    or exists (
      select 1
      from public.reservas_quadra rq
      where rq.id = reserva_quadra_id
        and (
          rq.usuario_solicitante_id = auth.uid()
          or public.can_manage_espaco(rq.espaco_generico_id)
        )
    )
  )
  with check (
    usuario_id = auth.uid()
    or exists (
      select 1
      from public.reservas_quadra rq
      where rq.id = reserva_quadra_id
        and (
          rq.usuario_solicitante_id = auth.uid()
          or public.can_manage_espaco(rq.espaco_generico_id)
        )
    )
  );

drop policy if exists "espaco_waitlist_participantes" on public.espaco_waitlist;
create policy "espaco_waitlist_participantes"
  on public.espaco_waitlist for select to authenticated
  using (usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_waitlist_self_insert" on public.espaco_waitlist;
create policy "espaco_waitlist_self_insert"
  on public.espaco_waitlist for insert to authenticated
  with check (usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_waitlist_update" on public.espaco_waitlist;
create policy "espaco_waitlist_update"
  on public.espaco_waitlist for update to authenticated
  using (usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id))
  with check (usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_transacoes_participantes" on public.espaco_transacoes;
create policy "espaco_transacoes_participantes"
  on public.espaco_transacoes for select to authenticated
  using (usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_transacoes_owner_all" on public.espaco_transacoes;
create policy "espaco_transacoes_owner_all"
  on public.espaco_transacoes for all to authenticated
  using (public.can_manage_espaco(espaco_generico_id))
  with check (public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_socio_assinaturas_participantes" on public.espaco_socio_assinaturas;
create policy "espaco_socio_assinaturas_participantes"
  on public.espaco_socio_assinaturas for select to authenticated
  using (usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_socio_assinaturas_owner_all" on public.espaco_socio_assinaturas;
create policy "espaco_socio_assinaturas_owner_all"
  on public.espaco_socio_assinaturas for all to authenticated
  using (usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id))
  with check (usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_assinaturas_plataforma_owner" on public.espaco_assinaturas_plataforma;
create policy "espaco_assinaturas_plataforma_owner"
  on public.espaco_assinaturas_plataforma for all to authenticated
  using (responsavel_usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id))
  with check (responsavel_usuario_id = auth.uid() or public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_auditoria_owner_read" on public.espaco_auditoria;
create policy "espaco_auditoria_owner_read"
  on public.espaco_auditoria for select to authenticated
  using (public.can_manage_espaco(espaco_generico_id));

drop policy if exists "espaco_auditoria_owner_insert" on public.espaco_auditoria;
create policy "espaco_auditoria_owner_insert"
  on public.espaco_auditoria for insert to authenticated
  with check (public.can_manage_espaco(espaco_generico_id));

revoke all on function public.espaco_criar_auditoria(bigint, text, bigint, text, text, jsonb, uuid) from public;
grant execute on function public.espaco_criar_auditoria(bigint, text, bigint, text, text, jsonb, uuid) to authenticated;
