-- EsporteID: restante do domínio (MySQL esporteid_schema.sql + *_migrate dos helpers).
-- Pré-requisito: rodar 20260419120000_init_core.sql (profiles, esportes, usuario_eid, trigger).
-- Referências de usuário = uuid → public.profiles(id). IDs de entidade legados polimórficos = bigint sem FK.

-- Colunas extras em profiles (financeiro, ranking, espaço — espelho do PHP)
alter table public.profiles add column if not exists asaas_customer_id text;
alter table public.profiles add column if not exists cpf_cnpj text;
alter table public.profiles add column if not exists recuperacao_token text;
alter table public.profiles add column if not exists recuperacao_token_expira timestamptz;
alter table public.profiles add column if not exists espaco_validacao_status text not null default 'nao_aplica';
alter table public.profiles add column if not exists espaco_doc_arquivo text;
alter table public.profiles add column if not exists interesse_rank_match boolean not null default true;
alter table public.profiles add column if not exists interesse_torneio boolean not null default true;
alter table public.profiles add column if not exists disponivel_amistoso boolean not null default true;

-- Config global de match / WO / EID equipe
create table if not exists public.configuracoes_match (
  id integer primary key check (id = 1),
  meses_carencia int not null default 6,
  meses_carencia_confronto int not null default 6,
  punicao_wo int not null default 0,
  eid_pct_participacao_equipe numeric(5, 2) not null default 15.00
);

insert into public.configuracoes_match (id, meses_carencia, meses_carencia_confronto, punicao_wo)
values (1, 6, 6, 0)
on conflict (id) do nothing;

update public.configuracoes_match
set eid_pct_participacao_equipe = coalesce(eid_pct_participacao_equipe, 15.00)
where id = 1;

-- EID settings por esporte/modalidade
create table if not exists public.eid_settings (
  id bigint generated always as identity primary key,
  esporte_id bigint references public.esportes (id) on delete cascade,
  modalidade text,
  peso_match numeric(10, 4),
  peso_ranking numeric(10, 4),
  peso_torneio numeric(10, 4),
  k_factor int,
  k_iniciante int,
  k_elite int,
  threshold_elite int,
  unique (esporte_id, modalidade)
);

insert into public.eid_settings (id, esporte_id, modalidade, peso_match, peso_ranking, peso_torneio, k_factor)
overriding system value
values (1, null, null, 1.0000, 1.0000, 1.0000, 32)
on conflict (id) do nothing;

-- Ranking (torneio / geral)
create table if not exists public.regras_ranking (
  esporte_id bigint not null references public.esportes (id) on delete cascade,
  modalidade text not null,
  pontos_vitoria int not null default 3,
  pontos_derrota int not null default 0,
  pontos_empate int not null default 1,
  primary key (esporte_id, modalidade)
);

create table if not exists public.regras_ranking_match (
  esporte_id bigint primary key references public.esportes (id) on delete cascade,
  pontos_vitoria int not null default 0,
  pontos_derrota int not null default 0,
  pontos_por_set int not null default 0,
  k_factor int not null default 32,
  bonus_por_gol int not null default 0,
  bonus_por_game int not null default 0
);

-- Espaços / locais (antes de torneios que referenciam sede)
create table if not exists public.espacos_genericos (
  id bigint generated always as identity primary key,
  nome_publico text not null,
  logo_arquivo text,
  localizacao text not null,
  lat text,
  lng text,
  criado_por_usuario_id uuid not null references public.profiles (id) on delete cascade,
  responsavel_usuario_id uuid references public.profiles (id) on delete set null,
  status text not null default 'publico',
  criado_em timestamptz not null default now(),
  esportes_ids text,
  tipo_quadra text,
  aceita_reserva boolean not null default true,
  ativo_listagem boolean not null default true,
  fotos_json text,
  comodidades_json text,
  venue_config_json text,
  apenas_checkout_plataforma boolean not null default false
);

create table if not exists public.espaco_reivindicacoes (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  solicitante_id uuid not null references public.profiles (id) on delete cascade,
  documento_arquivo text not null,
  mensagem text,
  status text not null default 'pendente',
  criado_em timestamptz not null default now()
);

-- Times / duplas
create table if not exists public.times (
  id bigint generated always as identity primary key,
  nome text not null,
  tipo text,
  esporte_id bigint references public.esportes (id) on delete set null,
  localizacao text,
  escudo text,
  criador_id uuid not null references public.profiles (id) on delete cascade,
  aceita_pedidos boolean not null default true,
  vagas_abertas boolean not null default true,
  nivel_procurado text,
  lat text,
  lng text,
  pontos_ranking int not null default 0,
  eid_time numeric(8, 2) not null default 1.00,
  interesse_rank_match boolean not null default true,
  interesse_torneio boolean not null default true,
  disponivel_amistoso boolean not null default true
);

create table if not exists public.membros_time (
  id bigint generated always as identity primary key,
  time_id bigint not null references public.times (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  cargo text,
  status text not null default 'pendente',
  data_adesao timestamptz,
  data_criacao timestamptz not null default now(),
  unique (time_id, usuario_id)
);

-- Matches (pedidos de jogo / radar)
create table if not exists public.matches (
  id bigint generated always as identity primary key,
  usuario_id uuid references public.profiles (id) on delete set null,
  adversario_id uuid references public.profiles (id) on delete set null,
  user_id_1 uuid references public.profiles (id) on delete set null,
  user_id_2 uuid references public.profiles (id) on delete set null,
  user_1 uuid references public.profiles (id) on delete set null,
  user_2 uuid references public.profiles (id) on delete set null,
  esporte_id bigint references public.esportes (id) on delete set null,
  tipo text,
  modalidade_confronto text default 'individual',
  status text,
  data_registro timestamptz default now(),
  data_criacao timestamptz,
  data_solicitacao timestamptz,
  data_confirmacao timestamptz,
  agenda_local_espaco_id bigint
);

-- Torneios + filhas
create table if not exists public.torneios (
  id bigint generated always as identity primary key,
  nome text not null,
  esporte_id bigint references public.esportes (id) on delete set null,
  status text not null default 'aberto',
  data_inicio date,
  data_fim date,
  banner text,
  lat double precision,
  lng double precision,
  criador_id uuid references public.profiles (id) on delete set null,
  espaco_generico_id bigint references public.espacos_genericos (id) on delete set null,
  sede_solicitada_id bigint,
  categoria text,
  descricao text,
  regulamento text,
  premios text,
  valor_inscricao numeric(10, 2) not null default 0,
  formato_competicao text,
  regras_placar_json text,
  criterio_desempate text default 'sets',
  criado_em timestamptz default now()
);

create table if not exists public.torneio_inscricoes (
  id bigint generated always as identity primary key,
  torneio_id bigint not null references public.torneios (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  payment_status text not null default 'pending',
  transaction_id text,
  coupon_code text,
  valor_pago numeric(10, 2),
  status_inscricao text not null default 'pendente',
  valor_para_organizador numeric(12, 2),
  valor_taxa_plataforma_fixa numeric(12, 2) not null default 0,
  valor_total_cobranca numeric(12, 2),
  asaas_payment_id text,
  seed_ordem int,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz,
  unique (torneio_id, usuario_id)
);

create table if not exists public.torneio_venue_requests (
  id bigint generated always as identity primary key,
  torneio_id bigint not null references public.torneios (id) on delete cascade,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  organizador_id uuid not null references public.profiles (id) on delete cascade,
  dono_notificado_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pendente',
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz
);

create table if not exists public.torneio_chaves (
  id bigint generated always as identity primary key,
  torneio_id bigint not null unique references public.torneios (id) on delete cascade,
  formato text,
  dados_json jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

create table if not exists public.torneio_jogos (
  id bigint generated always as identity primary key,
  torneio_id bigint not null references public.torneios (id) on delete cascade,
  rodada int not null,
  idx_rodada int not null default 1,
  jogador_a_id uuid references public.profiles (id) on delete set null,
  jogador_b_id uuid references public.profiles (id) on delete set null,
  fonte_jogo_a_id bigint,
  fonte_jogo_b_id bigint,
  vencedor_id uuid references public.profiles (id) on delete set null,
  status text not null default 'pendente',
  placar_json text,
  quadra text,
  horario_inicio timestamptz,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

create table if not exists public.torneio_staff (
  torneio_id bigint not null references public.torneios (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (torneio_id, usuario_id)
);

-- Partidas (confrontos; vencedor/perdedor podem ser usuário OU time — ids legados sem FK)
create table if not exists public.partidas (
  id bigint generated always as identity primary key,
  esporte_id bigint references public.esportes (id) on delete set null,
  modalidade text,
  jogador1_id uuid references public.profiles (id) on delete set null,
  jogador2_id uuid references public.profiles (id) on delete set null,
  time1_id bigint references public.times (id) on delete set null,
  time2_id bigint references public.times (id) on delete set null,
  tipo_competidor text,
  vendedor_id bigint,
  vencedor_id bigint,
  perdedor_id bigint,
  usuario_id uuid references public.profiles (id) on delete set null,
  desafiante_id uuid references public.profiles (id) on delete set null,
  desafiado_id uuid references public.profiles (id) on delete set null,
  tipo text,
  tipo_partida text,
  local_str text,
  mensagem text,
  placar text,
  placar_1 int,
  placar_2 int,
  placar_desafiante int,
  placar_desafiado int,
  status text,
  status_ranking text,
  torneio_id bigint references public.torneios (id) on delete set null,
  lancado_por uuid references public.profiles (id) on delete set null,
  data_registro timestamptz default now(),
  data_resultado timestamptz,
  data_partida timestamptz,
  criado_em timestamptz,
  data_aceito timestamptz,
  data_validacao timestamptz,
  impacto_eid_1 numeric(10, 4),
  impacto_eid_2 numeric(10, 4),
  local_espaco_id bigint references public.espacos_genericos (id) on delete set null,
  agenda_local_espaco_id bigint,
  local_cidade text,
  local_lat double precision,
  local_lng double precision,
  regra_pontuacao_id bigint,
  resultado_json text
);

create table if not exists public.agenda (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  relacao_id bigint,
  origem text,
  titulo text,
  status text
);

create table if not exists public.notificacoes (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  mensagem text not null,
  tipo text,
  referencia_id bigint,
  lida boolean not null default false,
  remetente_id uuid references public.profiles (id) on delete set null,
  criada_em timestamptz,
  data_criacao timestamptz default now()
);

create table if not exists public.duplas (
  id bigint generated always as identity primary key,
  player1_id uuid not null references public.profiles (id) on delete cascade,
  player2_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete cascade
);

create table if not exists public.historico_eid_coletivo (
  id bigint generated always as identity primary key,
  time_id bigint not null references public.times (id) on delete cascade,
  nota_anterior numeric(8, 2) not null default 0,
  nota_nova numeric(8, 2) not null,
  data_alteracao timestamptz not null default now()
);

create table if not exists public.historico_eid (
  id bigint generated always as identity primary key,
  entidade_id bigint not null,
  tipo_entidade text not null,
  esporte_id bigint references public.esportes (id) on delete set null,
  nota_anterior numeric(8, 2),
  nota_nova numeric(8, 2),
  partida_id bigint references public.partidas (id) on delete set null,
  data_registro timestamptz not null default now()
);

create table if not exists public.user_sports (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  esporte text,
  nivel text
);

create table if not exists public.jogos (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  data date,
  hora time,
  local text,
  nivel text,
  esporte text
);

create table if not exists public.usuario_ranking_match (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete cascade,
  modalidade text not null,
  pontos_acumulados int not null default 0,
  vitorias int not null default 0,
  derrotas int not null default 0,
  unique (usuario_id, esporte_id, modalidade)
);

create table if not exists public.ranking_podio_historico (
  id bigint generated always as identity primary key,
  esporte_id bigint not null references public.esportes (id) on delete cascade,
  modalidade text not null,
  metrica text not null,
  periodo_ano smallint not null,
  periodo_mes smallint not null default 0,
  posicao smallint not null,
  entidade_tipo text not null,
  entidade_id bigint not null,
  valor numeric(12, 2) not null default 0,
  escopo text not null default 'brasil',
  cidade_chave text not null default '',
  registrado_em timestamptz not null default now(),
  unique (esporte_id, modalidade, metrica, periodo_ano, periodo_mes, posicao, escopo, cidade_chave)
);

create table if not exists public.usuario_papeis (
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  papel text not null,
  detalhes_json text,
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, papel)
);

create table if not exists public.denuncias (
  id bigint generated always as identity primary key,
  denunciante_id uuid not null references public.profiles (id) on delete cascade,
  alvo_tipo text not null default 'usuario',
  alvo_id bigint not null,
  motivo text not null,
  texto text,
  status text not null default 'aberta',
  criado_em timestamptz not null default now()
);

create table if not exists public.usuario_locais_frequentes (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  visitas int not null default 1,
  ultimo_em timestamptz not null default now(),
  unique (usuario_id, espaco_generico_id)
);

create table if not exists public.membership_requests (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  matricula text not null,
  status text not null default 'pendente',
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  resolvido_por_usuario_id uuid references public.profiles (id) on delete set null
);

create table if not exists public.usuario_performance_registros (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete cascade,
  tipo_marca text not null,
  valor_metrico numeric(14, 4) not null,
  distancia_km numeric(10, 4),
  observacoes text,
  registrado_em timestamptz not null default now(),
  midia_arquivo text,
  status_validacao text not null default 'aprovado',
  melhor_antes_snapshot numeric(14, 4)
);

create table if not exists public.esporte_regras_pontuacao (
  id bigint generated always as identity primary key,
  esporte_id bigint not null references public.esportes (id) on delete cascade,
  codigo text not null,
  nome text not null,
  tipo_validador text not null,
  config_json jsonb,
  ordem int not null default 0,
  ativo boolean not null default true,
  unique (esporte_id, codigo)
);

-- Financeiro / Asaas
create table if not exists public.parceiro_conta_asaas (
  id bigint generated always as identity primary key,
  usuario_id uuid not null unique references public.profiles (id) on delete cascade,
  nome_razao_social text not null,
  cpf_cnpj text not null,
  email text not null,
  dados_bancarios_json text,
  asaas_account_id text,
  wallet_id text,
  api_key_subconta text,
  onboarding_status text not null default 'pendente',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

create table if not exists public.extrato_lancamentos (
  id bigint generated always as identity primary key,
  parceiro_usuario_id uuid not null references public.profiles (id) on delete cascade,
  tipo text not null,
  referencia_tipo text not null,
  referencia_id bigint not null,
  valor_pago_cliente numeric(12, 2) not null default 0,
  taxa_gateway numeric(12, 2) not null default 0,
  comissao_plataforma numeric(12, 2) not null default 0,
  valor_liquido_parceiro numeric(12, 2) not null default 0,
  asaas_payment_id text,
  detalhes_json text,
  criado_em timestamptz not null default now()
);

create table if not exists public.clube_assinaturas (
  id bigint generated always as identity primary key,
  usuario_id uuid not null unique references public.profiles (id) on delete cascade,
  asaas_subscription_id text,
  status text not null default 'trial',
  trial_ate date,
  valor_mensal numeric(10, 2) not null default 99.90,
  proxima_cobranca date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

create table if not exists public.reservas_quadra (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  usuario_solicitante_id uuid not null references public.profiles (id) on delete cascade,
  valor_total numeric(12, 2) not null,
  payment_status text not null default 'pending',
  asaas_payment_id text,
  status_reserva text not null default 'pendente',
  taxa_gateway numeric(12, 2),
  comissao_plataforma numeric(12, 2),
  valor_liquido_local numeric(12, 2),
  inicio timestamptz,
  fim timestamptz,
  esporte_id bigint references public.esportes (id) on delete set null,
  tipo_reserva text not null default 'paga',
  transaction_id text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

create table if not exists public.ei_financeiro_config (
  id int primary key default 1 check (id = 1),
  asaas_taxa_percentual numeric(8, 6) not null default 0.01,
  plataforma_sobre_taxa_gateway numeric(8, 6) not null default 0.5,
  plataforma_sobre_taxa_gateway_promo numeric(8, 6) not null default 0.2,
  torneio_taxa_fixa numeric(10, 2) not null default 3.00,
  torneio_taxa_promo numeric(10, 2) not null default 1.00,
  clube_mensalidade numeric(10, 2) not null default 99.90,
  promocao_dias int not null default 90
);

insert into public.ei_financeiro_config (id)
values (1)
on conflict (id) do nothing;

-- Painel admin legado (senha fora do Supabase Auth — migrar para role ou desativar depois)
create table if not exists public.admin_users (
  id bigint generated always as identity primary key,
  nome text not null,
  email text not null unique,
  senha_hash text not null,
  email_recuperacao text,
  status text not null default 'ativo',
  ultimo_login timestamptz
);

-- Seeds: regras de ranking por esporte de confronto (espelho ei_esporte_seed_regras)
insert into public.regras_ranking_match (esporte_id, pontos_vitoria, pontos_derrota, pontos_por_set, k_factor, bonus_por_gol, bonus_por_game)
select e.id, 10, 2, 1, 32, 0, 0
from public.esportes e
where e.categoria_processamento = 'confronto'
on conflict (esporte_id) do update set
  pontos_vitoria = excluded.pontos_vitoria,
  pontos_derrota = excluded.pontos_derrota,
  pontos_por_set = excluded.pontos_por_set,
  k_factor = excluded.k_factor;

insert into public.regras_ranking (esporte_id, modalidade, pontos_vitoria, pontos_derrota, pontos_empate)
select e.id, m.modalidade, 10, 2, 5
from public.esportes e
cross join (values ('individual'), ('time')) as m (modalidade)
where e.categoria_processamento = 'confronto'
on conflict (esporte_id, modalidade) do update set
  pontos_vitoria = excluded.pontos_vitoria,
  pontos_derrota = excluded.pontos_derrota,
  pontos_empate = excluded.pontos_empate;

-- RLS: habilitar e políticas base (ajuste fino antes de produção)
do $$
declare
  t text;
  tables text[] := array[
    'configuracoes_match', 'eid_settings', 'regras_ranking', 'regras_ranking_match',
    'espacos_genericos', 'espaco_reivindicacoes', 'times', 'membros_time', 'matches',
    'torneios', 'torneio_inscricoes', 'torneio_venue_requests', 'torneio_chaves', 'torneio_jogos', 'torneio_staff',
    'partidas', 'agenda', 'notificacoes', 'duplas', 'historico_eid_coletivo', 'historico_eid',
    'user_sports', 'jogos', 'usuario_ranking_match', 'ranking_podio_historico',
    'usuario_papeis', 'denuncias', 'usuario_locais_frequentes', 'membership_requests',
    'usuario_performance_registros', 'esporte_regras_pontuacao',
    'parceiro_conta_asaas', 'extrato_lancamentos', 'clube_assinaturas', 'reservas_quadra',
    'ei_financeiro_config', 'admin_users'
  ];
begin
  foreach t in array tables
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'configuracoes_match', 'eid_settings', 'regras_ranking', 'regras_ranking_match',
        'espacos_genericos', 'espaco_reivindicacoes', 'times', 'membros_time', 'matches',
        'torneios', 'torneio_inscricoes', 'torneio_venue_requests', 'torneio_chaves', 'torneio_jogos', 'torneio_staff',
        'partidas', 'agenda', 'notificacoes', 'duplas', 'historico_eid_coletivo', 'historico_eid',
        'user_sports', 'jogos', 'usuario_ranking_match', 'ranking_podio_historico',
        'usuario_papeis', 'denuncias', 'usuario_locais_frequentes', 'membership_requests',
        'usuario_performance_registros', 'esporte_regras_pontuacao',
        'parceiro_conta_asaas', 'extrato_lancamentos', 'clube_assinaturas', 'reservas_quadra',
        'ei_financeiro_config', 'admin_users'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Leitura de catálogo / config para usuários logados e anônimos (onde fizer sentido)
create policy "cfg_match_read_auth" on public.configuracoes_match for select to authenticated using (true);
create policy "cfg_match_read_anon" on public.configuracoes_match for select to anon using (true);
create policy "eid_settings_read_auth" on public.eid_settings for select to authenticated using (true);
create policy "eid_settings_read_anon" on public.eid_settings for select to anon using (true);
create policy "rr_read_auth" on public.regras_ranking for select to authenticated using (true);
create policy "rr_read_anon" on public.regras_ranking for select to anon using (true);
create policy "rrm_read_auth" on public.regras_ranking_match for select to authenticated using (true);
create policy "rrm_read_anon" on public.regras_ranking_match for select to anon using (true);
create policy "erp_read_auth" on public.esporte_regras_pontuacao for select to authenticated using (ativo = true);
create policy "erp_read_anon" on public.esporte_regras_pontuacao for select to anon using (ativo = true);
create policy "efi_read_auth" on public.ei_financeiro_config for select to authenticated using (true);

-- Dono dos dados do usuário (padrão)
create policy "usuario_papeis_own" on public.usuario_papeis for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "notif_own" on public.notificacoes for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "agenda_own" on public.agenda for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "usr_sports_own" on public.user_sports for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "jogos_own" on public.jogos for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "urm_own" on public.usuario_ranking_match for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "perf_reg_own" on public.usuario_performance_registros for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "duplas_own" on public.duplas for all to authenticated using (player1_id = auth.uid() or player2_id = auth.uid()) with check (player1_id = auth.uid() or player2_id = auth.uid());
create policy "mt_own" on public.membros_time for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "matches_own" on public.matches for all to authenticated using (
  auth.uid() in (usuario_id, adversario_id, user_id_1, user_id_2, user_1, user_2)
) with check (
  auth.uid() in (usuario_id, adversario_id, user_id_1, user_id_2, user_1, user_2)
);

-- Times: criador + membros
create policy "times_read" on public.times for select to authenticated using (true);
create policy "times_write" on public.times for all to authenticated using (criador_id = auth.uid()) with check (criador_id = auth.uid());

-- Torneios: leitura ampla; escrita só criador (MVP)
create policy "torneios_read" on public.torneios for select to authenticated using (true);
create policy "torneios_read_anon" on public.torneios for select to anon using (true);
create policy "torneios_write" on public.torneios for all to authenticated using (criador_id = auth.uid()) with check (criador_id = auth.uid());

create policy "ti_own" on public.torneio_inscricoes for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "ti_organizer_read" on public.torneio_inscricoes for select to authenticated using (
  exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
);
create policy "tvr_read" on public.torneio_venue_requests for select to authenticated using (true);
create policy "tvr_organizer" on public.torneio_venue_requests for all to authenticated using (
  exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
) with check (
  exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
);

create policy "tch_read" on public.torneio_chaves for select to authenticated using (true);
create policy "tch_organizer" on public.torneio_chaves for all to authenticated using (
  exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
) with check (
  exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
);

create policy "tjg_read" on public.torneio_jogos for select to authenticated using (true);
create policy "tjg_organizer" on public.torneio_jogos for all to authenticated using (
  exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
) with check (
  exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
);

create policy "tst_read" on public.torneio_staff for select to authenticated using (true);
create policy "tst_organizer" on public.torneio_staff for all to authenticated using (
  exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
) with check (
  exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
);

-- Partidas: envolvidos
create policy "partidas_participant" on public.partidas for all to authenticated using (
  auth.uid() in (jogador1_id, jogador2_id, usuario_id, desafiante_id, desafiado_id, lancado_por)
) with check (
  auth.uid() in (jogador1_id, jogador2_id, usuario_id, desafiante_id, desafiado_id, lancado_por)
);

-- Espaços: leitura listagem; escrita dono/responsável
create policy "eg_read" on public.espacos_genericos for select to authenticated using (true);
create policy "eg_read_anon" on public.espacos_genericos for select to anon using (ativo_listagem = true);
create policy "eg_write" on public.espacos_genericos for all to authenticated using (
  criado_por_usuario_id = auth.uid() or responsavel_usuario_id = auth.uid()
) with check (
  criado_por_usuario_id = auth.uid() or responsavel_usuario_id = auth.uid()
);

create policy "er_own" on public.espaco_reivindicacoes for all to authenticated using (solicitante_id = auth.uid()) with check (solicitante_id = auth.uid());
create policy "ulf_own" on public.usuario_locais_frequentes for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "mr_part" on public.membership_requests for all to authenticated using (
  usuario_id = auth.uid()
  or exists (
    select 1 from public.espacos_genericos g
    where g.id = espaco_generico_id
      and (g.criado_por_usuario_id = auth.uid() or g.responsavel_usuario_id = auth.uid())
  )
) with check (
  usuario_id = auth.uid()
  or exists (
    select 1 from public.espacos_genericos g
    where g.id = espaco_generico_id
      and (g.criado_por_usuario_id = auth.uid() or g.responsavel_usuario_id = auth.uid())
  )
);

-- Financeiro
create policy "pca_own" on public.parceiro_conta_asaas for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "ext_own" on public.extrato_lancamentos for all to authenticated using (parceiro_usuario_id = auth.uid()) with check (parceiro_usuario_id = auth.uid());
create policy "clube_own" on public.clube_assinaturas for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "rq_own" on public.reservas_quadra for all to authenticated using (
  usuario_solicitante_id = auth.uid()
  or exists (
    select 1 from public.espacos_genericos g
    where g.id = espaco_generico_id
      and (g.criado_por_usuario_id = auth.uid() or g.responsavel_usuario_id = auth.uid())
  )
) with check (
  usuario_solicitante_id = auth.uid()
  or exists (
    select 1 from public.espacos_genericos g
    where g.id = espaco_generico_id
      and (g.criado_por_usuario_id = auth.uid() or g.responsavel_usuario_id = auth.uid())
  )
);

-- Histórico / pódio: leitura autenticada
create policy "hec_read" on public.historico_eid_coletivo for select to authenticated using (true);
create policy "he_read" on public.historico_eid for select to authenticated using (true);
create policy "rp_read" on public.ranking_podio_historico for select to authenticated using (true);

-- Denúncias: quem abre vê a própria
create policy "den_own" on public.denuncias for all to authenticated using (denunciante_id = auth.uid()) with check (denunciante_id = auth.uid());

-- Admin legado: sem acesso via anon key (só service_role no servidor)
create policy "admin_deny" on public.admin_users for select to authenticated using (false);
