create table if not exists public.fiscal_emitentes (
  id bigint generated always as identity primary key,
  escopo text not null,
  espaco_generico_id bigint references public.espacos_genericos (id) on delete cascade,
  nome_razao_social text not null,
  documento text not null,
  inscricao_municipal text,
  municipio text,
  uf text,
  regime_tributario text,
  cnae text,
  codigo_servico text,
  item_lista_servico text,
  aliquota_iss numeric(8, 4),
  provedor text not null default 'manual',
  ambiente text not null default 'producao',
  status text not null default 'rascunho',
  config_json jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint fiscal_emitentes_escopo_ck check (escopo in ('espaco', 'plataforma')),
  constraint fiscal_emitentes_ambiente_ck check (ambiente in ('producao', 'homologacao')),
  constraint fiscal_emitentes_status_ck check (status in ('rascunho', 'pronto', 'pausado'))
);

create unique index if not exists fiscal_emitentes_plataforma_unique
  on public.fiscal_emitentes (escopo)
  where escopo = 'plataforma';

create unique index if not exists fiscal_emitentes_espaco_unique
  on public.fiscal_emitentes (espaco_generico_id)
  where escopo = 'espaco';

create table if not exists public.fiscal_notas (
  id bigint generated always as identity primary key,
  escopo text not null,
  espaco_generico_id bigint references public.espacos_genericos (id) on delete cascade,
  emitente_id bigint references public.fiscal_emitentes (id) on delete set null,
  transacao_id bigint references public.espaco_transacoes (id) on delete set null,
  assinatura_plataforma_id bigint references public.espaco_assinaturas_plataforma (id) on delete set null,
  tomador_usuario_id uuid references public.profiles (id) on delete set null,
  tomador_nome text,
  tomador_documento text,
  tomador_email text,
  descricao text not null,
  valor_servico_centavos int not null default 0,
  status text not null default 'solicitada',
  numero_nfse text,
  codigo_verificacao text,
  pdf_url text,
  xml_url text,
  referencia_externa text,
  erro_mensagem text,
  solicitada_por_usuario_id uuid references public.profiles (id) on delete set null,
  emissao_solicitada_em timestamptz not null default now(),
  emitida_em timestamptz,
  cancelada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  detalhes_json jsonb not null default '{}'::jsonb,
  constraint fiscal_notas_escopo_ck check (escopo in ('espaco_cliente', 'plataforma_espaco')),
  constraint fiscal_notas_status_ck check (
    status in ('solicitada', 'fila_emissao', 'emitida', 'erro', 'cancelada')
  )
);

create index if not exists fiscal_notas_espaco_lookup
  on public.fiscal_notas (espaco_generico_id, escopo, status, criado_em desc);

create index if not exists fiscal_notas_transacao_lookup
  on public.fiscal_notas (transacao_id)
  where transacao_id is not null;

alter table public.fiscal_emitentes enable row level security;
alter table public.fiscal_notas enable row level security;

drop policy if exists "fiscal_emitentes_espaco_owner_select" on public.fiscal_emitentes;
create policy "fiscal_emitentes_espaco_owner_select"
  on public.fiscal_emitentes for select to authenticated
  using (
    escopo = 'espaco'
    and exists (
      select 1 from public.espacos_genericos e
      where e.id = fiscal_emitentes.espaco_generico_id
        and (e.responsavel_usuario_id = auth.uid() or e.criado_por_usuario_id = auth.uid())
    )
  );

drop policy if exists "fiscal_notas_espaco_owner_select" on public.fiscal_notas;
create policy "fiscal_notas_espaco_owner_select"
  on public.fiscal_notas for select to authenticated
  using (
    exists (
      select 1 from public.espacos_genericos e
      where e.id = fiscal_notas.espaco_generico_id
        and (e.responsavel_usuario_id = auth.uid() or e.criado_por_usuario_id = auth.uid())
    )
  );
