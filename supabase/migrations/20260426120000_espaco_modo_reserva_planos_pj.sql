-- Modo de reserva, monetização (Plataforma), taxa líquida por reserva e planos PaaS por faixa de unidades.
-- Tabela de planos: catálogo global (espaco_generico_id IS NULL) ou (futuro) custom por local.

alter table public.espacos_genericos
  add column if not exists modo_reserva text not null default 'mista',
  add column if not exists modo_monetizacao text not null default 'misto',
  add column if not exists taxa_reserva_plataforma_centavos int not null default 0,
  add column if not exists socios_mensalidade_espaco text not null default 'em_breve';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'eg_modo_reserva_ck') then
    alter table public.espacos_genericos
      add constraint eg_modo_reserva_ck
      check (modo_reserva in ('gratuita', 'paga', 'mista'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'eg_modo_monetizacao_ck') then
    alter table public.espacos_genericos
      add constraint eg_modo_monetizacao_ck
      check (modo_monetizacao in ('mensalidade_plataforma', 'apenas_reservas', 'misto'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'eg_socios_men_espaco_ck') then
    alter table public.espacos_genericos
      add constraint eg_socios_men_espaco_ck
      check (socios_mensalidade_espaco in ('off', 'em_breve', 'on'));
  end if;
end $$;

create table if not exists public.espaco_plano_mensal_plataforma (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint references public.espacos_genericos (id) on delete cascade,
  nome text not null,
  categoria_espaco text not null default 'outro',
  min_unidades int not null default 1,
  max_unidades int,
  valor_mensal_centavos int not null default 0,
  socios_mensal_modo text not null default 'nenhum',
  liberacao text not null default 'publico',
  assinatura_recorrencia_auto boolean not null default true,
  confirmar_pagamento_automatico boolean not null default true,
  ativo boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint epmpp_categoria_ck
    check (categoria_espaco in ('clube', 'condominio', 'centro_esportivo', 'quadra', 'outro')),
  constraint epmpp_socios_ck
    check (socios_mensal_modo in ('nenhum', 'em_breve', 'disponivel')),
  constraint epmpp_lib_ck
    check (liberacao in ('publico', 'em_breve', 'inativo')),
  constraint epmpp_faixa_ck
    check (max_unidades is null or max_unidades >= min_unidades)
);

create index if not exists idx_epmpp_global_catalogo
  on public.espaco_plano_mensal_plataforma (categoria_espaco, ativo, ordem)
  where espaco_generico_id is null;

-- Descrição: parte líquida (centavos) desejada para a plataforma, embutida na cobrança da reserva com gateway; rateio com Asaas fica a cargo do módulo de pagamento.
comment on column public.espacos_genericos.taxa_reserva_plataforma_centavos is
  'Centavos para a plataforma por reserva, antes do detalhamento de split com taxa do gateway.';

-- Assinatura Plataforma → plano (catálogo) opcional
alter table public.espaco_assinaturas_plataforma
  add column if not exists plano_mensal_id bigint references public.espaco_plano_mensal_plataforma (id) on delete set null;

-- Plano padrão (condomínio e clube) — catálogo global
insert into public.espaco_plano_mensal_plataforma (
  espaco_generico_id, nome, categoria_espaco, min_unidades, max_unidades, valor_mensal_centavos,
  socios_mensal_modo, liberacao, assinatura_recorrencia_auto, confirmar_pagamento_automatico, ativo, ordem
) values
  (null, 'Condomínio · 1 unidade/quadra', 'condominio', 1, 1, 4990, 'nenhum', 'publico', true, true, true, 10),
  (null, 'Condomínio · 2 a 3 unidades', 'condominio', 2, 3, 7990, 'nenhum', 'publico', true, true, true, 20),
  (null, 'Condomínio · 4+ unidades', 'condominio', 4, null, 9990, 'nenhum', 'publico', true, true, true, 30),
  (null, 'Clube · padrão (sem gestão de mensalidade de sócios)', 'clube', 1, null, 9990, 'nenhum', 'publico', true, true, true, 40),
  (null, 'Clube · gestão de mensalidade de sócios (em breve)', 'clube', 1, null, 9990, 'em_breve', 'em_breve', true, true, true, 50);
-- Valor 99,90 no plano "em breve" — ajuste quando ativar; liberacao em_breve impede seleção no fluxo (UI).

alter table public.espaco_plano_mensal_plataforma enable row level security;
drop policy if exists "epmpp_read_auth" on public.espaco_plano_mensal_plataforma;
create policy "epmpp_read_auth"
  on public.espaco_plano_mensal_plataforma
  for select
  to authenticated
  using (true);
