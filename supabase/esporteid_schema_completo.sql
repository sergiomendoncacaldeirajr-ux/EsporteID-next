-- =============================================================================
-- EsporteID – schema completo (consolidação das migrações em ordem)
-- Fonte: supabase/migrations/*.sql (ordem do nome = ordem cronológica)
--
-- Regerar após editar migrações:  node supabase/_build_schema_completo.mjs
--
-- Uso: banco novo ou ambiente de desenvolvimento. Em produção já populada,
-- prefira `supabase db push` ou migrações incrementais para evitar erros
-- de objeto já existente.
--
-- Não altera o schema auth (Supabase Auth).
-- =============================================================================



-- ============================================================================
-- 20260419120000_init_core.sql
-- ============================================================================

-- Núcleo inicial EsporteID → Postgres (Supabase). Rode antes de 20260419140000.
-- 19 esportes = catálogo PHP (16) + 3 extras comuns (handebol, tênis de mesa, badminton).

-- Extensões úteis
create extension if not exists "pgcrypto";

-- Perfil público ligado ao Auth (substitui a maior parte de `usuarios` no PHP)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  avatar_url text,
  whatsapp text,
  localizacao text,
  lat double precision,
  lng double precision,
  tipo_usuario text not null default 'atleta',
  onboarding_etapa smallint not null default 0,
  perfil_completo boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_profiles_tipo on public.profiles (tipo_usuario);

-- Catálogo de esportes (equivalente a `esportes`)
create table if not exists public.esportes (
  id bigint generated always as identity primary key,
  nome text not null,
  slug text unique,
  tipo text,
  tipo_lancamento text,
  categoria_processamento text not null default 'confronto',
  permite_individual boolean not null default true,
  permite_dupla boolean not null default false,
  permite_time boolean not null default false,
  ativo boolean not null default true,
  ordem int not null default 0
);

-- EID por usuário e esporte (equivalente a `usuario_eid`)
create table if not exists public.usuario_eid (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete cascade,
  nota_eid numeric(8, 2) not null default 1.00,
  vitorias int not null default 0,
  derrotas int not null default 0,
  pontos_ranking int not null default 0,
  partidas_jogadas int not null default 0,
  categoria text,
  posicao_rank int,
  unique (usuario_id, esporte_id)
);

create index if not exists idx_usuario_eid_esporte on public.usuario_eid (esporte_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.esportes enable row level security;
alter table public.usuario_eid enable row level security;

-- Remove todas as políticas RLS dessas tabelas (evita erro 42710 ao reexecutar o script)
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'esportes', 'usuario_eid')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Perfis: leitura pública, escrita só do dono
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Esportes: leitura para logados (ajuste para anon depois se quiser lista pública)
create policy "esportes_select_authenticated"
  on public.esportes for select
  to authenticated
  using (true);

create policy "esportes_select_anon"
  on public.esportes for select
  to anon
  using (ativo = true);

-- usuario_eid: cada um vê/edita o próprio
create policy "usuario_eid_select_own"
  on public.usuario_eid for select
  using (auth.uid() = usuario_id);

create policy "usuario_eid_insert_own"
  on public.usuario_eid for insert
  with check (auth.uid() = usuario_id);

create policy "usuario_eid_update_own"
  on public.usuario_eid for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

create policy "usuario_eid_delete_own"
  on public.usuario_eid for delete
  using (auth.uid() = usuario_id);

-- Ao criar usuário no Auth, cria linha em profiles (nome opcional vem do metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Catálogo: esportes_catalogo_helpers.php (16) + 3 extras → total 19
insert into public.esportes (
  nome, slug, tipo, tipo_lancamento, categoria_processamento,
  permite_individual, permite_dupla, permite_time, ordem, ativo
)
values
  ('Tênis', 'tenis', 'individual', 'sets', 'confronto', true, true, false, 10, true),
  ('Beach Tennis', 'beach_tennis', 'individual', 'sets', 'confronto', false, true, false, 20, true),
  ('Vôlei', 'volei', 'coletivo', 'sets', 'confronto', false, false, true, 30, true),
  ('Futebol', 'futebol', 'coletivo', 'gols', 'confronto', true, false, true, 40, true),
  ('Basquete', 'basquete', 'coletivo', 'gols', 'confronto', false, false, true, 50, true),
  ('Handebol', 'handebol', 'coletivo', 'gols', 'confronto', false, false, true, 55, true),
  ('Tênis de mesa', 'tenis_de_mesa', 'individual', 'sets', 'confronto', true, true, false, 58, true),
  ('Badminton', 'badminton', 'individual', 'sets', 'confronto', true, true, false, 59, true),
  ('Jiu-Jitsu', 'jiu_jitsu', 'individual', 'pontos', 'confronto', true, false, false, 60, true),
  ('Futevôlei', 'futevolei', 'coletivo', 'gols', 'confronto', false, true, true, 70, true),
  ('Corrida', 'corrida', 'individual', 'tempo', 'performance', true, false, false, 100, true),
  ('Ciclismo', 'ciclismo', 'individual', 'tempo', 'performance', true, false, false, 110, true),
  ('Natação', 'natacao', 'individual', 'tempo', 'performance', true, false, false, 120, true),
  ('Musculação', 'musculacao', 'individual', 'carga', 'performance', true, false, false, 130, true),
  ('Crossfit', 'crossfit', 'individual', 'carga', 'performance', true, false, false, 140, true),
  ('Yoga', 'yoga', 'individual', 'registro', 'perfil', true, false, false, 200, true),
  ('Surf', 'surf', 'individual', 'registro', 'perfil', true, false, false, 210, true),
  ('Skate', 'skate', 'individual', 'registro', 'perfil', true, false, false, 220, true),
  ('Pilates', 'pilates', 'individual', 'registro', 'perfil', true, false, false, 230, true)
on conflict (slug) do update set
  nome = excluded.nome,
  tipo = excluded.tipo,
  tipo_lancamento = excluded.tipo_lancamento,
  categoria_processamento = excluded.categoria_processamento,
  permite_individual = excluded.permite_individual,
  permite_dupla = excluded.permite_dupla,
  permite_time = excluded.permite_time,
  ordem = excluded.ordem,
  ativo = excluded.ativo;


-- ============================================================================
-- 20260419140000_esporteid_full_domain.sql
-- ============================================================================

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


-- ============================================================================
-- 20260419150000_lgpd_legal.sql
-- ============================================================================

-- LGPD (Lei 13.709/2018) + registro de consentimentos e versões de documentos.
-- Rode após 20260419140000. Reexecutável (drops de policy + IF NOT EXISTS).

-- Campos no perfil (aceite e direitos do titular)
alter table public.profiles add column if not exists termos_versao text;
alter table public.profiles add column if not exists termos_aceitos_em timestamptz;
alter table public.profiles add column if not exists privacidade_versao text;
alter table public.profiles add column if not exists privacidade_aceitos_em timestamptz;
alter table public.profiles add column if not exists marketing_opt_in boolean not null default false;
alter table public.profiles add column if not exists marketing_opt_in_em timestamptz;
alter table public.profiles add column if not exists lgpd_export_requested_at timestamptz;
alter table public.profiles add column if not exists lgpd_delete_requested_at timestamptz;
alter table public.profiles add column if not exists dpo_email_contato text;

comment on column public.profiles.termos_versao is 'Versão dos Termos de Uso aceita (ex.: 1.0.0), alinhada ao app';
comment on column public.profiles.privacidade_versao is 'Versão da Política de Privacidade aceita';
comment on column public.profiles.lgpd_export_requested_at is 'Data do pedido de cópia dos dados (art. 18, II LGPD)';
comment on column public.profiles.lgpd_delete_requested_at is 'Data do pedido de exclusão (art. 18, VI LGPD; avaliar exceções legais)';

-- Metadados de documentos publicados (auditoria; texto integral pode estar no site)
create table if not exists public.documentos_legais (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('termos_uso', 'politica_privacidade')),
  versao text not null,
  notas text,
  publicado_em timestamptz not null default now(),
  ativo boolean not null default true,
  unique (tipo, versao)
);

-- Trilha de auditoria de consentimentos (não substitui registro nos campos do perfil)
create table if not exists public.consentimentos_log (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  evento text not null,
  versao text,
  detalhes_json jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists idx_consent_usuario on public.consentimentos_log (usuario_id, criado_em desc);

insert into public.documentos_legais (tipo, versao, notas, ativo)
values
  ('termos_uso', '1.0.0', 'Versão inicial alinhada ao lançamento Next + Supabase', true),
  ('politica_privacidade', '1.0.0', 'Versão inicial LGPD', true)
on conflict (tipo, versao) do update set
  notas = excluded.notas,
  ativo = excluded.ativo;

alter table public.documentos_legais enable row level security;
alter table public.consentimentos_log enable row level security;

do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public' and tablename in ('documentos_legais', 'consentimentos_log')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Documentos: leitura pública (texto também está nas páginas /termos e /privacidade)
create policy "doc_legais_read_auth" on public.documentos_legais for select to authenticated using (ativo = true);
create policy "doc_legais_read_anon" on public.documentos_legais for select to anon using (ativo = true);

-- Log: só o próprio usuário consulta; inserção pelo próprio (app registra eventos)
create policy "consent_select_own" on public.consentimentos_log for select to authenticated using (usuario_id = auth.uid());
create policy "consent_insert_own" on public.consentimentos_log for insert to authenticated with check (usuario_id = auth.uid());

-- Políticas em profiles já permitem update do próprio; colunas novas entram no mesmo fluxo


-- ============================================================================
-- 20260419160000_legacy_import_helpers.sql
-- ============================================================================

-- Metadados e mapas para importação MySQL → Supabase (uso com service_role / Postgres direto).
-- Não expor ao cliente: RLS sem políticas para anon/authenticated.

create table if not exists public.legacy_import_meta (
  key text primary key,
  value_json jsonb,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.legacy_usuario_map (
  mysql_id bigint primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  email text,
  importado_em timestamptz not null default now()
);

-- Sem unique em profile_id: e-mails duplicados no MySQL podem mapear o mesmo auth.users
create index if not exists idx_legacy_usuario_profile on public.legacy_usuario_map (profile_id);

create index if not exists idx_legacy_usuario_email on public.legacy_usuario_map (email);

create table if not exists public.legacy_esporte_map (
  mysql_id bigint primary key,
  esporte_id bigint not null references public.esportes (id) on delete cascade
);

create index if not exists idx_legacy_esporte_pg on public.legacy_esporte_map (esporte_id);

alter table public.legacy_import_meta enable row level security;
alter table public.legacy_usuario_map enable row level security;
alter table public.legacy_esporte_map enable row level security;


-- ============================================================================
-- 20260419161000_profiles_legacy_columns.sql
-- ============================================================================

-- Campos extras do legado PHP (`usuarios`) para não perder dados na importação.
-- Opcionais e nullable; o app Next pode evoluir para expor/editar depois.

alter table public.profiles add column if not exists genero text;
alter table public.profiles add column if not exists foto_capa text;
alter table public.profiles add column if not exists altura_cm smallint;
alter table public.profiles add column if not exists peso_kg smallint;
alter table public.profiles add column if not exists lado text;
alter table public.profiles add column if not exists tempo_experiencia text;
alter table public.profiles add column if not exists tipo_perfil text;
alter table public.profiles add column if not exists status_conta text;
alter table public.profiles add column if not exists esportes_interesses text;
alter table public.profiles add column if not exists onboarding_completo boolean not null default false;
alter table public.profiles add column if not exists conta_verificada_legacy boolean not null default false;

comment on column public.profiles.conta_verificada_legacy is 'Espelho OR(verified,verificado) do MySQL; login novo usa Auth';


-- ============================================================================
-- 20260419180000_handle_new_user_cadastro_fields.sql
-- ============================================================================

-- Ao criar usuário no Auth, preenche profiles com dados do cadastro (metadata do signUp).
-- Campos: nome, genero, whatsapp, localizacao, lat, lng (como no register.php legado).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lat double precision;
  v_lng double precision;
begin
  v_lat := null;
  v_lng := null;
  if new.raw_user_meta_data->>'lat' is not null
     and new.raw_user_meta_data->>'lat' ~ '^-?[0-9]+(\.[0-9]+)?$' then
    v_lat := (new.raw_user_meta_data->>'lat')::double precision;
  end if;
  if new.raw_user_meta_data->>'lng' is not null
     and new.raw_user_meta_data->>'lng' ~ '^-?[0-9]+(\.[0-9]+)?$' then
    v_lng := (new.raw_user_meta_data->>'lng')::double precision;
  end if;

  insert into public.profiles (
    id,
    nome,
    genero,
    whatsapp,
    localizacao,
    lat,
    lng
  )
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'nome'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    nullif(trim(new.raw_user_meta_data->>'genero'), ''),
    nullif(trim(new.raw_user_meta_data->>'whatsapp'), ''),
    nullif(trim(new.raw_user_meta_data->>'localizacao'), ''),
    v_lat,
    v_lng
  )
  on conflict (id) do update set
    nome = coalesce(excluded.nome, public.profiles.nome),
    genero = coalesce(excluded.genero, public.profiles.genero),
    whatsapp = coalesce(excluded.whatsapp, public.profiles.whatsapp),
    localizacao = coalesce(excluded.localizacao, public.profiles.localizacao),
    lat = coalesce(excluded.lat, public.profiles.lat),
    lng = coalesce(excluded.lng, public.profiles.lng),
    atualizado_em = now();
  return new;
end;
$$;


-- ============================================================================
-- 20260419193000_usuario_eid_interesse_match.sql
-- ============================================================================

alter table public.usuario_eid
add column if not exists interesse_match text not null default 'ranking_e_amistoso';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuario_eid_interesse_match_check'
  ) then
    alter table public.usuario_eid
    add constraint usuario_eid_interesse_match_check
    check (interesse_match in ('ranking', 'ranking_e_amistoso'));
  end if;
end $$;


-- ============================================================================
-- 20260419194000_usuario_eid_modalidade_match.sql
-- ============================================================================

alter table public.usuario_eid
add column if not exists modalidade_match text not null default 'individual';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'usuario_eid_modalidade_match_check'
  ) then
    alter table public.usuario_eid
    add constraint usuario_eid_modalidade_match_check
    check (modalidade_match in ('individual', 'dupla', 'time'));
  end if;
end $$;


-- ============================================================================
-- 20260420120000_documentos_legais_termos_1_1_0.sql
-- ============================================================================

-- Termos de Uso v1.1.0 — obrigatoriedade de WhatsApp e canal principal de comunicação (texto em /termos).

update public.documentos_legais
set ativo = false
where tipo = 'termos_uso' and versao = '1.0.0';

insert into public.documentos_legais (tipo, versao, notas, ativo)
values (
  'termos_uso',
  '1.1.0',
  'Obrigatoriedade de número WhatsApp; canal principal de comunicação operacional',
  true
)
on conflict (tipo, versao) do update set
  notas = excluded.notas,
  ativo = excluded.ativo;


-- ============================================================================
-- 20260420143000_onboarding_locais_organizacao.sql
-- ============================================================================

-- Solicitações de organizadores para usar locais de terceiros em torneios.
create table if not exists public.local_organizadores_solicitacoes (
  id bigint generated always as identity primary key,
  espaco_generico_id bigint not null references public.espacos_genericos (id) on delete cascade,
  solicitante_id uuid not null references public.profiles (id) on delete cascade,
  dono_usuario_id uuid not null references public.profiles (id) on delete cascade,
  esportes_ids_json text,
  mensagem text,
  status text not null default 'pendente',
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  resolvido_por_usuario_id uuid references public.profiles (id) on delete set null
);

create index if not exists idx_los_solicitante on public.local_organizadores_solicitacoes (solicitante_id);
create index if not exists idx_los_dono on public.local_organizadores_solicitacoes (dono_usuario_id);
create index if not exists idx_los_espaco on public.local_organizadores_solicitacoes (espaco_generico_id);

alter table public.local_organizadores_solicitacoes enable row level security;

drop policy if exists "los_read" on public.local_organizadores_solicitacoes;
create policy "los_read"
on public.local_organizadores_solicitacoes
for select
to authenticated
using (solicitante_id = auth.uid() or dono_usuario_id = auth.uid());

drop policy if exists "los_insert_own" on public.local_organizadores_solicitacoes;
create policy "los_insert_own"
on public.local_organizadores_solicitacoes
for insert
to authenticated
with check (solicitante_id = auth.uid());

drop policy if exists "los_update_owner" on public.local_organizadores_solicitacoes;
create policy "los_update_owner"
on public.local_organizadores_solicitacoes
for update
to authenticated
using (dono_usuario_id = auth.uid() or solicitante_id = auth.uid())
with check (dono_usuario_id = auth.uid() or solicitante_id = auth.uid());


-- ============================================================================
-- 20260420160000_storage_buckets_avatars_espacos.sql
-- ============================================================================

-- Buckets usados pelo app (upload de avatar, logos e documentos de espaço).
-- Rode no projeto Supabase após aplicar migrations locais.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    true,
    5242880,
    array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
  ),
  (
    'espaco-logos',
    'espaco-logos',
    true,
    5242880,
    array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
  ),
  (
    'espaco-documentos',
    'espaco-documentos',
    false,
    15728640,
    array[
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/octet-stream'
    ]::text[]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública dos buckets públicos
drop policy if exists "storage_avatars_select_public" on storage.objects;
create policy "storage_avatars_select_public"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "storage_espaco_logos_select_public" on storage.objects;
create policy "storage_espaco_logos_select_public"
on storage.objects for select
to public
using (bucket_id = 'espaco-logos');

-- Upload apenas na pasta do próprio usuário (primeiro segmento do path = uuid)
drop policy if exists "storage_avatars_insert_own" on storage.objects;
create policy "storage_avatars_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_avatars_update_own" on storage.objects;
create policy "storage_avatars_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_avatars_delete_own" on storage.objects;
create policy "storage_avatars_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_espaco_logos_insert_own" on storage.objects;
create policy "storage_espaco_logos_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'espaco-logos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_espaco_logos_update_own" on storage.objects;
create policy "storage_espaco_logos_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'espaco-logos'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'espaco-logos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_espaco_logos_delete_own" on storage.objects;
create policy "storage_espaco_logos_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'espaco-logos'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Documentos: leitura só do dono do path (admin pode estender depois)
drop policy if exists "storage_espaco_docs_select_own" on storage.objects;
create policy "storage_espaco_docs_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'espaco-documentos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_espaco_docs_insert_own" on storage.objects;
create policy "storage_espaco_docs_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'espaco-documentos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_espaco_docs_update_own" on storage.objects;
create policy "storage_espaco_docs_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'espaco-documentos'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'espaco-documentos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "storage_espaco_docs_delete_own" on storage.objects;
create policy "storage_espaco_docs_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'espaco-documentos'
  and split_part(name, '/', 1) = auth.uid()::text
);


-- ============================================================================
-- 20260420170000_solicitar_desafio_match.sql
-- ============================================================================

-- Referência opcional ao time desafiado (dupla/time); adversário continua sendo o líder (uuid) para RLS e notificações.
alter table public.matches add column if not exists adversario_time_id bigint references public.times (id) on delete set null;

create index if not exists matches_adversario_time_id_idx on public.matches (adversario_time_id)
  where adversario_time_id is not null;

-- Insere pedido de match + notificação para o adversário (RLS de notificacoes só permite self-insert).
create or replace function public.solicitar_desafio_match (
  p_esporte_id bigint,
  p_modalidade text,
  p_alvo_usuario_id uuid default null,
  p_alvo_time_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_mid bigint;
  v_adv uuid;
  v_time_id bigint;
  v_challenger_nome text;
  v_mod text;
  t_tipo text;
  t_esporte bigint;
  t_criador uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  v_mod := lower(trim(coalesce(p_modalidade, '')));
  if v_mod = 'atleta' then
    v_mod := 'individual';
  end if;
  if v_mod not in ('individual', 'dupla', 'time') then
    raise exception 'Modalidade inválida';
  end if;

  if p_esporte_id is null or p_esporte_id < 1 then
    raise exception 'Esporte obrigatório';
  end if;

  if v_mod = 'individual' then
    if p_alvo_usuario_id is null then
      raise exception 'Alvo obrigatório';
    end if;
    if p_alvo_time_id is not null then
      raise exception 'Parâmetros inválidos';
    end if;
    if p_alvo_usuario_id = v_uid then
      raise exception 'Alvo inválido';
    end if;
    if not exists (select 1 from public.profiles p where p.id = p_alvo_usuario_id) then
      raise exception 'Perfil não encontrado';
    end if;
    v_adv := p_alvo_usuario_id;
    v_time_id := null;
  else
    if p_alvo_time_id is null then
      raise exception 'Time obrigatório';
    end if;
    if p_alvo_usuario_id is not null then
      raise exception 'Parâmetros inválidos';
    end if;

    select lower(trim(coalesce(t.tipo, ''))), t.esporte_id, t.criador_id
    into t_tipo, t_esporte, t_criador
    from public.times t
    where t.id = p_alvo_time_id;

    if t_criador is null then
      raise exception 'Time não encontrado';
    end if;
    if t_tipo is distinct from v_mod then
      raise exception 'Tipo de formação não confere';
    end if;
    if t_esporte is distinct from p_esporte_id then
      raise exception 'Esporte não confere';
    end if;
    if t_criador = v_uid then
      raise exception 'Alvo inválido';
    end if;

    if not exists (
      select 1
      from public.times x
      where x.criador_id = v_uid
        and lower(trim(coalesce(x.tipo, ''))) = v_mod
        and x.esporte_id = p_esporte_id
    ) then
      raise exception 'Você precisa ser líder de uma formação neste esporte.';
    end if;

    v_adv := t_criador;
    v_time_id := p_alvo_time_id;
  end if;

  insert into public.matches (
    usuario_id,
    adversario_id,
    esporte_id,
    tipo,
    modalidade_confronto,
    status,
    data_registro,
    data_solicitacao,
    adversario_time_id
  )
  values (
    v_uid,
    v_adv,
    p_esporte_id,
    v_mod,
    v_mod,
    'Pendente',
    now(),
    now(),
    v_time_id
  )
  returning id into v_mid;

  select nome into v_challenger_nome from public.profiles where id = v_uid;

  insert into public.notificacoes (
    usuario_id,
    mensagem,
    tipo,
    referencia_id,
    lida,
    remetente_id,
    data_criacao
  )
  values (
    v_adv,
    case
      when v_challenger_nome is not null and length(trim(v_challenger_nome)) > 0
      then 'Você recebeu um novo pedido de Match de ' || trim(v_challenger_nome) || '.'
      else 'Você recebeu um novo pedido de Match.'
    end,
    'match',
    v_mid,
    false,
    v_uid,
    now()
  );

  return v_mid;
end;
$$;

revoke all on function public.solicitar_desafio_match (bigint, text, uuid, bigint) from public;
grant execute on function public.solicitar_desafio_match (bigint, text, uuid, bigint) to authenticated;


-- ============================================================================
-- 20260420180000_rls_public_ranking_duplas.sql
-- ============================================================================

-- Permite que usuários autenticados vejam EIDs e elencos para perfis públicos (radar, ranking, páginas de perfil).
-- Mantém escrita restrita às políticas existentes (own).

drop policy if exists "usuario_eid_select_own" on public.usuario_eid;

create policy "usuario_eid_select_ranking_public"
  on public.usuario_eid for select
  to authenticated
  using (true);

-- Roster de times visível no perfil da formação (além da regra por membro).
drop policy if exists "mt_read_roster_public" on public.membros_time;
create policy "mt_read_roster_public"
  on public.membros_time for select
  to authenticated
  using (true);

-- Duplas cadastrais (dois atletas) visíveis para perfil público.
drop policy if exists "duplas_read_public" on public.duplas;
create policy "duplas_read_public"
  on public.duplas for select
  to authenticated
  using (true);


-- ============================================================================
-- 20260420190000_responder_pedido_match.sql
-- ============================================================================

-- Resposta ao pedido de match (adversário) + notificação ao desafiante (RLS de notificacoes não permite insert alheio).
create or replace function public.responder_pedido_match (p_match_id bigint, p_aceitar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_usuario uuid;
  v_status text;
  v_adv uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select usuario_id, status, adversario_id
  into v_usuario, v_status, v_adv
  from public.matches
  where id = p_match_id;

  if v_usuario is null then
    raise exception 'Pedido não encontrado';
  end if;
  if v_adv is distinct from v_uid then
    raise exception 'Sem permissão para responder este pedido';
  end if;
  if v_status is distinct from 'Pendente' then
    raise exception 'Este pedido já foi respondido';
  end if;

  if p_aceitar then
    update public.matches
    set
      status = 'Aceito',
      data_confirmacao = now()
    where id = p_match_id;

    insert into public.notificacoes (
      usuario_id,
      mensagem,
      tipo,
      referencia_id,
      lida,
      remetente_id,
      data_criacao
    )
    values (
      v_usuario,
      'Seu pedido de Match foi aceito.',
      'match',
      p_match_id,
      false,
      v_uid,
      now()
    );
  else
    update public.matches
    set
      status = 'Recusado',
      data_confirmacao = now()
    where id = p_match_id;

    insert into public.notificacoes (
      usuario_id,
      mensagem,
      tipo,
      referencia_id,
      lida,
      remetente_id,
      data_criacao
    )
    values (
      v_usuario,
      'Seu pedido de Match foi recusado.',
      'match',
      p_match_id,
      false,
      v_uid,
      now()
    );
  end if;
end;
$$;

revoke all on function public.responder_pedido_match (bigint, boolean) from public;
grant execute on function public.responder_pedido_match (bigint, boolean) to authenticated;


-- ============================================================================
-- 20260420210000_platform_admins.sql
-- ============================================================================

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


-- ============================================================================
-- 20260420220000_indexes_rls_torneio_inscricoes.sql
-- ============================================================================

-- Desempenho em listagens/contagens e fluxo de torneios: organizador pode atualizar inscrições
-- (status, pagamento) sem furar RLS; participante continua com ti_own.

-- Índices (FKs e filtros frequentes no app)
-- unique (torneio_id, usuario_id) já cobre buscas por torneio_id (prefixo B-tree)
create index if not exists idx_torneio_inscricoes_usuario on public.torneio_inscricoes (usuario_id);
create index if not exists idx_torneio_jogos_torneio on public.torneio_jogos (torneio_id);
create index if not exists idx_torneios_criador on public.torneios (criador_id);
create index if not exists idx_torneios_esporte on public.torneios (esporte_id);
create index if not exists idx_notificacoes_usuario on public.notificacoes (usuario_id);
create index if not exists idx_notificacoes_usuario_nao_lida on public.notificacoes (usuario_id) where lida = false;
create index if not exists idx_matches_adversario_status on public.matches (adversario_id, status);

-- Antes do UPDATE: impede troca de torneio/usuario; atualiza atualizado_em
create or replace function public.torneio_inscricoes_before_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.torneio_id is distinct from old.torneio_id or new.usuario_id is distinct from old.usuario_id then
    raise exception 'alteração de torneio_id ou usuario_id da inscrição não permitida';
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists tr_torneio_inscricoes_before_update on public.torneio_inscricoes;
create trigger tr_torneio_inscricoes_before_update
  before update on public.torneio_inscricoes
  for each row
  execute function public.torneio_inscricoes_before_update();

-- Organizador do torneio pode atualizar linhas de inscrição (ex.: status_inscricao, payment_status)
drop policy if exists "ti_organizer_update" on public.torneio_inscricoes;
create policy "ti_organizer_update"
  on public.torneio_inscricoes for update
  to authenticated
  using (
    exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
  )
  with check (
    exists (select 1 from public.torneios t where t.id = torneio_id and t.criador_id = auth.uid())
  );

comment on policy "ti_organizer_update" on public.torneio_inscricoes is
  'Organizador altera status/pagamento; trigger bloqueia mudança de usuario_id/torneio_id.';


-- ============================================================================
-- 20260421100000_match_search_and_eid_cascade.sql
-- ============================================================================

-- Busca de Match (proximidade como prioridade) + cascata EID individual em partidas coletivas.

create or replace function public.eid_distance_km(
  p_lat1 double precision,
  p_lng1 double precision,
  p_lat2 double precision,
  p_lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select
    case
      when p_lat1 is null or p_lng1 is null or p_lat2 is null or p_lng2 is null then 99999::double precision
      else sqrt(
        power((p_lat2 - p_lat1) * 111.12, 2)
        + power((p_lng2 - p_lng1) * 111.12 * cos(radians(p_lat1)), 2)
      )
    end;
$$;

create or replace function public.buscar_match_atletas(
  p_viewer_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_esporte_id bigint default null,
  p_raio_km integer default 30,
  p_limit integer default 300
)
returns table (
  usuario_id uuid,
  nome text,
  localizacao text,
  esporte_id bigint,
  esporte_nome text,
  dist_km double precision,
  nota_eid numeric,
  pontos_ranking integer,
  modalidade_match text,
  interesse_match text
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      ue.usuario_id,
      coalesce(p.nome, 'Atleta') as nome,
      coalesce(p.localizacao, 'Localização não informada') as localizacao,
      ue.esporte_id,
      coalesce(e.nome, 'Esporte') as esporte_nome,
      public.eid_distance_km(p_lat, p_lng, p.lat, p.lng) as dist_km,
      ue.nota_eid,
      ue.pontos_ranking,
      coalesce(ue.modalidade_match, 'individual') as modalidade_match,
      coalesce(ue.interesse_match, 'ranking_e_amistoso') as interesse_match,
      row_number() over (
        partition by ue.usuario_id
        order by ue.nota_eid desc nulls last, ue.pontos_ranking desc nulls last, ue.esporte_id asc
      ) as rn
    from public.usuario_eid ue
    join public.profiles p on p.id = ue.usuario_id
    left join public.esportes e on e.id = ue.esporte_id
    where ue.usuario_id <> p_viewer_id
      and (p_esporte_id is null or ue.esporte_id = p_esporte_id)
  )
  select
    r.usuario_id,
    r.nome,
    r.localizacao,
    r.esporte_id,
    r.esporte_nome,
    r.dist_km,
    r.nota_eid,
    r.pontos_ranking,
    r.modalidade_match,
    r.interesse_match
  from ranked r
  where (p_esporte_id is not null or r.rn = 1)
    and r.dist_km <= greatest(1, p_raio_km)
  order by r.dist_km asc, r.nome asc
  limit greatest(1, p_limit);
$$;

create or replace function public.buscar_match_formacoes(
  p_viewer_id uuid,
  p_tipo text,
  p_lat double precision,
  p_lng double precision,
  p_esporte_id bigint default null,
  p_raio_km integer default 30,
  p_limit integer default 300
)
returns table (
  id bigint,
  nome text,
  localizacao text,
  esporte_id bigint,
  esporte_nome text,
  dist_km double precision,
  eid_time numeric,
  pontos_ranking integer,
  interesse_match text,
  can_challenge boolean
)
language sql
security definer
set search_path = public
as $$
  with mine as (
    select exists (
      select 1
      from public.times mt
      where mt.criador_id = p_viewer_id
        and mt.tipo = p_tipo
        and (p_esporte_id is null or mt.esporte_id = p_esporte_id)
    ) as can_challenge
  )
  select
    t.id,
    coalesce(t.nome, initcap(coalesce(p_tipo, 'time'))) as nome,
    coalesce(t.localizacao, 'Localização não informada') as localizacao,
    t.esporte_id,
    coalesce(e.nome, 'Esporte') as esporte_nome,
    public.eid_distance_km(
      p_lat,
      p_lng,
      coalesce(nullif(t.lat, '')::double precision, cp.lat),
      coalesce(nullif(t.lng, '')::double precision, cp.lng)
    ) as dist_km,
    t.eid_time,
    t.pontos_ranking,
    case
      when t.disponivel_amistoso then 'ranking_e_amistoso'
      when t.interesse_rank_match then 'ranking'
      else 'ranking_e_amistoso'
    end as interesse_match,
    m.can_challenge
  from public.times t
  left join public.esportes e on e.id = t.esporte_id
  left join public.profiles cp on cp.id = t.criador_id
  cross join mine m
  where t.tipo = p_tipo
    and (p_esporte_id is null or t.esporte_id = p_esporte_id)
    and public.eid_distance_km(
      p_lat,
      p_lng,
      coalesce(nullif(t.lat, '')::double precision, cp.lat),
      coalesce(nullif(t.lng, '')::double precision, cp.lng)
    ) <= greatest(1, p_raio_km)
  order by dist_km asc, t.id desc
  limit greatest(1, p_limit);
$$;

revoke all on function public.buscar_match_atletas(uuid, double precision, double precision, bigint, integer, integer) from public;
grant execute on function public.buscar_match_atletas(uuid, double precision, double precision, bigint, integer, integer) to authenticated;

revoke all on function public.buscar_match_formacoes(uuid, text, double precision, double precision, bigint, integer, integer) from public;
grant execute on function public.buscar_match_formacoes(uuid, text, double precision, double precision, bigint, integer, integer) to authenticated;

alter table public.partidas
  add column if not exists eid_transbordo_processado_em timestamptz;

create or replace function public.aplicar_cascata_eid_partida_coletiva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_esporte_id bigint;
  v_time_w bigint;
  v_time_l bigint;
  v_eid_w numeric(8, 2);
  v_eid_l numeric(8, 2);
  v_pct numeric(7, 4) := 0.15;
  v_delta_base numeric(8, 4);
  v_delta_w numeric(8, 4);
  v_delta_l numeric(8, 4);
  v_delta_ind_w numeric(8, 4);
  v_delta_ind_l numeric(8, 4);
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.eid_transbordo_processado_em is not null then
    return new;
  end if;

  if lower(coalesce(new.modalidade, '')) not in ('dupla', 'time') then
    return new;
  end if;

  if lower(coalesce(new.status, '')) not in ('encerrada', 'finalizada', 'concluida', 'concluída', 'validada') then
    return new;
  end if;

  v_esporte_id := new.esporte_id;
  if v_esporte_id is null then
    return new;
  end if;

  if new.vencedor_id in (new.time1_id, new.time2_id) then
    v_time_w := new.vencedor_id;
    v_time_l := case when new.time1_id = v_time_w then new.time2_id else new.time1_id end;
  elsif coalesce(new.placar_1, 0) > coalesce(new.placar_2, 0) then
    v_time_w := new.time1_id;
    v_time_l := new.time2_id;
  elsif coalesce(new.placar_2, 0) > coalesce(new.placar_1, 0) then
    v_time_w := new.time2_id;
    v_time_l := new.time1_id;
  else
    return new;
  end if;

  if v_time_w is null or v_time_l is null then
    return new;
  end if;

  select t.eid_time into v_eid_w from public.times t where t.id = v_time_w;
  select t.eid_time into v_eid_l from public.times t where t.id = v_time_l;

  if v_eid_w is null or v_eid_l is null then
    return new;
  end if;

  select coalesce(cm.eid_pct_participacao_equipe, 15.00) / 100.0
  into v_pct
  from public.configuracoes_match cm
  where cm.id = 1;

  v_delta_base := greatest(0.08, 0.20 + abs(v_eid_w - v_eid_l) * 0.06);
  if v_eid_w < v_eid_l then
    v_delta_base := v_delta_base * (1 + least(1.5, (v_eid_l - v_eid_w) * 0.12));
  end if;

  v_delta_w := round(v_delta_base, 4);
  v_delta_l := round(-least(v_delta_base * 0.85, 2.0000), 4);
  v_delta_ind_w := round(v_delta_w * v_pct, 4);
  v_delta_ind_l := round(v_delta_l * v_pct, 4);

  update public.times
  set eid_time = greatest(0.10, round(eid_time + v_delta_w, 2))
  where id = v_time_w;

  update public.times
  set eid_time = greatest(0.10, round(eid_time + v_delta_l, 2))
  where id = v_time_l;

  with membros_w as (
    select t.criador_id as usuario_id
    from public.times t
    where t.id = v_time_w
    union
    select mt.usuario_id
    from public.membros_time mt
    where mt.time_id = v_time_w
      and lower(coalesce(mt.status, '')) in ('ativo', 'aceito', 'aprovado')
  )
  insert into public.usuario_eid (
    usuario_id,
    esporte_id,
    nota_eid,
    vitorias,
    derrotas,
    partidas_jogadas
  )
  select
    mw.usuario_id,
    v_esporte_id,
    greatest(0.10, round(coalesce(ue.nota_eid, 1.00) + v_delta_ind_w, 2)),
    coalesce(ue.vitorias, 0) + 1,
    coalesce(ue.derrotas, 0),
    coalesce(ue.partidas_jogadas, 0) + 1
  from membros_w mw
  left join public.usuario_eid ue
    on ue.usuario_id = mw.usuario_id
   and ue.esporte_id = v_esporte_id
  on conflict (usuario_id, esporte_id)
  do update set
    nota_eid = excluded.nota_eid,
    vitorias = excluded.vitorias,
    partidas_jogadas = excluded.partidas_jogadas;

  with membros_l as (
    select t.criador_id as usuario_id
    from public.times t
    where t.id = v_time_l
    union
    select mt.usuario_id
    from public.membros_time mt
    where mt.time_id = v_time_l
      and lower(coalesce(mt.status, '')) in ('ativo', 'aceito', 'aprovado')
  )
  insert into public.usuario_eid (
    usuario_id,
    esporte_id,
    nota_eid,
    vitorias,
    derrotas,
    partidas_jogadas
  )
  select
    ml.usuario_id,
    v_esporte_id,
    greatest(0.10, round(coalesce(ue.nota_eid, 1.00) + v_delta_ind_l, 2)),
    coalesce(ue.vitorias, 0),
    coalesce(ue.derrotas, 0) + 1,
    coalesce(ue.partidas_jogadas, 0) + 1
  from membros_l ml
  left join public.usuario_eid ue
    on ue.usuario_id = ml.usuario_id
   and ue.esporte_id = v_esporte_id
  on conflict (usuario_id, esporte_id)
  do update set
    nota_eid = excluded.nota_eid,
    derrotas = excluded.derrotas,
    partidas_jogadas = excluded.partidas_jogadas;

  new.impacto_eid_1 := v_delta_w;
  new.impacto_eid_2 := v_delta_l;
  new.eid_transbordo_processado_em := now();
  return new;
end;
$$;

drop trigger if exists tr_partidas_cascata_eid_coletiva on public.partidas;
create trigger tr_partidas_cascata_eid_coletiva
before update on public.partidas
for each row
execute function public.aplicar_cascata_eid_partida_coletiva();


-- ============================================================================
-- 20260421130000_profiles_username_and_team_management.sql
-- ============================================================================

-- Perfis, handles (@username) e gestão de equipes/convites.

alter table public.profiles
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists estilo_jogo text,
  add column if not exists disponibilidade_semana_json jsonb,
  add column if not exists visibilidade_match text not null default 'ambos';

alter table public.times
  add column if not exists username text,
  add column if not exists bio text;

alter table public.duplas
  add column if not exists username text,
  add column if not exists bio text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_visibilidade_match_ck'
  ) then
    alter table public.profiles
      add constraint profiles_visibilidade_match_ck
      check (visibilidade_match in ('apenas_amistosos', 'participar_ranking', 'ambos'));
  end if;
end $$;

create or replace function public.normalize_username(v text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(lower(trim(coalesce(v, ''))), '[^a-z0-9_]', '', 'g'), '');
$$;

create or replace function public.validate_username(v text)
returns boolean
language sql
immutable
as $$
  select case
    when v is null then true
    when length(v) between 3 and 24 and v ~ '^[a-z0-9_]+$' then true
    else false
  end;
$$;

create or replace function public.set_username_defaults()
returns trigger
language plpgsql
as $$
begin
  new.username := public.normalize_username(new.username);
  if not public.validate_username(new.username) then
    raise exception 'Username inválido. Use 3-24 chars [a-z0-9_].';
  end if;
  return new;
end;
$$;

drop trigger if exists tr_profiles_username_norm on public.profiles;
create trigger tr_profiles_username_norm
before insert or update of username on public.profiles
for each row execute function public.set_username_defaults();

drop trigger if exists tr_times_username_norm on public.times;
create trigger tr_times_username_norm
before insert or update of username on public.times
for each row execute function public.set_username_defaults();

drop trigger if exists tr_duplas_username_norm on public.duplas;
create trigger tr_duplas_username_norm
before insert or update of username on public.duplas
for each row execute function public.set_username_defaults();

create unique index if not exists idx_profiles_username_unique
  on public.profiles (username)
  where username is not null;

create unique index if not exists idx_times_username_unique
  on public.times (username)
  where username is not null;

create unique index if not exists idx_duplas_username_unique
  on public.duplas (username)
  where username is not null;

create table if not exists public.time_convites (
  id bigint generated always as identity primary key,
  time_id bigint not null references public.times (id) on delete cascade,
  convidado_usuario_id uuid not null references public.profiles (id) on delete cascade,
  convidado_por_usuario_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pendente',
  criado_em timestamptz not null default now(),
  respondido_em timestamptz,
  unique (time_id, convidado_usuario_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'time_convites_status_ck'
  ) then
    alter table public.time_convites
      add constraint time_convites_status_ck
      check (status in ('pendente', 'aceito', 'recusado', 'cancelado'));
  end if;
end $$;

alter table public.time_convites enable row level security;

drop policy if exists "time_convites_owner_or_invited" on public.time_convites;
create policy "time_convites_owner_or_invited"
  on public.time_convites
  for all to authenticated
  using (
    convidado_usuario_id = auth.uid()
    or convidado_por_usuario_id = auth.uid()
    or exists (
      select 1 from public.times t
      where t.id = time_id
        and t.criador_id = auth.uid()
    )
  )
  with check (
    convidado_usuario_id = auth.uid()
    or convidado_por_usuario_id = auth.uid()
    or exists (
      select 1 from public.times t
      where t.id = time_id
        and t.criador_id = auth.uid()
    )
  );

create or replace function public.sair_da_equipe(p_time_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_leader uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select criador_id into v_leader
  from public.times
  where id = p_time_id;

  if v_leader is null then
    raise exception 'Equipe não encontrada';
  end if;

  if v_leader = v_uid then
    raise exception 'Líder não pode sair sem transferir liderança';
  end if;

  delete from public.membros_time
  where time_id = p_time_id
    and usuario_id = v_uid;
end;
$$;

revoke all on function public.sair_da_equipe(bigint) from public;
grant execute on function public.sair_da_equipe(bigint) to authenticated;


-- ============================================================================
-- 20260421143000_team_invites_and_management_rpc.sql
-- ============================================================================

-- RPCs de convite/gestão de equipes por @username.

create or replace function public.convidar_para_time(p_time_id bigint, p_username text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_target uuid;
  v_convite_id bigint;
  v_time_nome text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select t.nome into v_time_nome
  from public.times t
  where t.id = p_time_id
    and t.criador_id = v_uid;

  if v_time_nome is null then
    raise exception 'Apenas o líder pode enviar convites';
  end if;

  select p.id into v_target
  from public.profiles p
  where p.username = public.normalize_username(p_username);

  if v_target is null then
    raise exception 'Usuário não encontrado';
  end if;
  if v_target = v_uid then
    raise exception 'Não é possível convidar a si mesmo';
  end if;

  insert into public.time_convites (time_id, convidado_usuario_id, convidado_por_usuario_id, status, respondido_em)
  values (p_time_id, v_target, v_uid, 'pendente', null)
  on conflict (time_id, convidado_usuario_id)
  do update set
    status = 'pendente',
    convidado_por_usuario_id = excluded.convidado_por_usuario_id,
    criado_em = now(),
    respondido_em = null
  returning id into v_convite_id;

  insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
  values (
    v_target,
    'Você recebeu convite para entrar na equipe "' || coalesce(v_time_nome, 'Equipe') || '".',
    'convite_time',
    v_convite_id,
    false,
    v_uid,
    now()
  );

  return v_convite_id;
end;
$$;

create or replace function public.responder_convite_time(p_convite_id bigint, p_aceitar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_time_id bigint;
  v_status text;
  v_inviter uuid;
  v_time_nome text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select c.time_id, c.status, c.convidado_por_usuario_id, t.nome
  into v_time_id, v_status, v_inviter, v_time_nome
  from public.time_convites c
  join public.times t on t.id = c.time_id
  where c.id = p_convite_id
    and c.convidado_usuario_id = v_uid;

  if v_time_id is null then
    raise exception 'Convite não encontrado';
  end if;
  if v_status is distinct from 'pendente' then
    raise exception 'Convite já respondido';
  end if;

  if p_aceitar then
    insert into public.membros_time (time_id, usuario_id, cargo, status, data_adesao)
    values (v_time_id, v_uid, 'Membro', 'ativo', now())
    on conflict (time_id, usuario_id)
    do update set status = 'ativo', data_adesao = now();

    update public.time_convites
    set status = 'aceito', respondido_em = now()
    where id = p_convite_id;

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values (
      v_inviter,
      'Convite aceito para a equipe "' || coalesce(v_time_nome, 'Equipe') || '".',
      'convite_time',
      p_convite_id,
      false,
      v_uid,
      now()
    );
  else
    update public.time_convites
    set status = 'recusado', respondido_em = now()
    where id = p_convite_id;

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values (
      v_inviter,
      'Convite recusado para a equipe "' || coalesce(v_time_nome, 'Equipe') || '".',
      'convite_time',
      p_convite_id,
      false,
      v_uid,
      now()
    );
  end if;
end;
$$;

create or replace function public.remover_membro_time(p_time_id bigint, p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if not exists (
    select 1 from public.times t where t.id = p_time_id and t.criador_id = v_uid
  ) then
    raise exception 'Apenas o líder pode remover membros';
  end if;

  delete from public.membros_time
  where time_id = p_time_id
    and usuario_id = p_usuario_id;
end;
$$;

create or replace function public.transferir_lideranca_time(p_time_id bigint, p_novo_lider uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if not exists (
    select 1 from public.times t where t.id = p_time_id and t.criador_id = v_uid
  ) then
    raise exception 'Apenas o líder atual pode transferir liderança';
  end if;

  if not exists (
    select 1
    from public.membros_time m
    where m.time_id = p_time_id
      and m.usuario_id = p_novo_lider
      and lower(coalesce(m.status, '')) in ('ativo', 'aceito', 'aprovado')
  ) then
    raise exception 'Novo líder deve ser membro ativo';
  end if;

  update public.times
  set criador_id = p_novo_lider
  where id = p_time_id;
end;
$$;

revoke all on function public.convidar_para_time(bigint, text) from public;
grant execute on function public.convidar_para_time(bigint, text) to authenticated;

revoke all on function public.responder_convite_time(bigint, boolean) from public;
grant execute on function public.responder_convite_time(bigint, boolean) to authenticated;

revoke all on function public.remover_membro_time(bigint, uuid) from public;
grant execute on function public.remover_membro_time(bigint, uuid) to authenticated;

revoke all on function public.transferir_lideranca_time(bigint, uuid) from public;
grant execute on function public.transferir_lideranca_time(bigint, uuid) to authenticated;


-- ============================================================================
-- 20260421160000_partidas_select_concluidas_publico.sql
-- ============================================================================

-- Permite que usuários autenticados vejam partidas 1v1 já encerradas (resultado público no ranking),
-- além da regra existente de participante. Necessário para histórico no perfil / página EID por esporte.

create policy "partidas_read_concluidas_publico"
  on public.partidas for select
  to authenticated
  using (
    jogador1_id is not null
    and jogador2_id is not null
    and lower(coalesce(status, '')) in (
      'encerrada',
      'finalizada',
      'concluida',
      'concluída',
      'validada'
    )
  );


-- ============================================================================
-- 20260421161000_partidas_select_coletivo_concluidas_publico.sql
-- ============================================================================

-- Leitura pública (autenticada) de partidas de time/dupla já encerradas — espelha a regra 1v1.

create policy "partidas_read_coletivo_concluidas_publico"
  on public.partidas for select
  to authenticated
  using (
    time1_id is not null
    and time2_id is not null
    and lower(coalesce(status, '')) in (
      'encerrada',
      'finalizada',
      'concluida',
      'concluída',
      'validada'
    )
  );


-- ============================================================================
-- 20260421180000_duplas_criador_rls.sql
-- ============================================================================

-- Dono da dupla registrada: quem criou o registro (edição só deste usuário).
-- Legado: assume-se player1 como criador quando criador_id é nulo.

alter table public.duplas
  add column if not exists criador_id uuid references public.profiles (id) on delete set null;

update public.duplas
set criador_id = player1_id
where criador_id is null;

create index if not exists idx_duplas_criador on public.duplas (criador_id);

drop policy if exists "duplas_own" on public.duplas;

create policy "duplas_insert_criador"
  on public.duplas for insert
  to authenticated
  with check (
    criador_id = auth.uid()
    and (player1_id = auth.uid() or player2_id = auth.uid())
  );

create policy "duplas_update_criador"
  on public.duplas for update
  to authenticated
  using (criador_id = auth.uid())
  with check (criador_id = auth.uid());

create policy "duplas_delete_criador"
  on public.duplas for delete
  to authenticated
  using (criador_id = auth.uid());


-- ============================================================================
-- 20260421200000_match_sugestoes_membro.sql
-- ============================================================================

-- Sugestão de match: atleta que não é líder pede ao líder da formação adversária avaliar;
-- ao aprovar, cria match Aceito e notifica envolvidos (membros das duas formações).

create table if not exists public.match_sugestoes (
  id bigint generated always as identity primary key,
  sugeridor_id uuid not null references public.profiles (id) on delete cascade,
  sugeridor_time_id bigint not null references public.times (id) on delete cascade,
  alvo_time_id bigint not null references public.times (id) on delete cascade,
  alvo_dono_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete restrict,
  modalidade text not null,
  mensagem text,
  status text not null default 'pendente',
  match_id bigint references public.matches (id) on delete set null,
  criado_em timestamptz not null default now(),
  respondido_em timestamptz,
  constraint match_sugestoes_modalidade_ck check (modalidade in ('dupla', 'time')),
  constraint match_sugestoes_status_ck check (status in ('pendente', 'aprovado', 'recusado'))
);

create index if not exists idx_match_sugestoes_alvo_dono_pendente
  on public.match_sugestoes (alvo_dono_id)
  where status = 'pendente';

create index if not exists idx_match_sugestoes_sugeridor
  on public.match_sugestoes (sugeridor_id);

create unique index if not exists idx_match_sugestoes_pendente_par
  on public.match_sugestoes (sugeridor_id, alvo_time_id, sugeridor_time_id)
  where status = 'pendente';

alter table public.match_sugestoes enable row level security;

drop policy if exists "match_sugestoes_select_participantes" on public.match_sugestoes;

create policy "match_sugestoes_select_participantes"
  on public.match_sugestoes for select
  to authenticated
  using (sugeridor_id = auth.uid() or alvo_dono_id = auth.uid());

-- Inserção/atualização apenas via funções security definer.

create or replace function public.sugerir_match_para_lider (
  p_alvo_time_id bigint,
  p_sugeridor_time_id bigint,
  p_mensagem text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sid bigint;
  v_alvo record;
  v_sug record;
  v_msg text;
  v_sug_nome text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if p_alvo_time_id is null or p_alvo_time_id < 1 or p_sugeridor_time_id is null or p_sugeridor_time_id < 1 then
    raise exception 'Parâmetros inválidos';
  end if;

  if p_alvo_time_id = p_sugeridor_time_id then
    raise exception 'Formações inválidas';
  end if;

  select t.id, t.criador_id, t.esporte_id, lower(trim(coalesce(t.tipo, ''))) as tipo, t.nome
  into v_alvo
  from public.times t
  where t.id = p_alvo_time_id;

  if v_alvo.id is null then
    raise exception 'Formação alvo não encontrada';
  end if;

  if v_alvo.tipo not in ('dupla', 'time') then
    raise exception 'Modalidade da formação alvo inválida';
  end if;

  if v_alvo.criador_id = v_uid then
    raise exception 'Líderes enviam pedido de match direto pelo fluxo habitual';
  end if;

  select t.id, t.criador_id, t.esporte_id, lower(trim(coalesce(t.tipo, ''))) as tipo
  into v_sug
  from public.times t
  where t.id = p_sugeridor_time_id;

  if v_sug.id is null then
    raise exception 'Sua formação não encontrada';
  end if;

  if v_sug.criador_id = v_uid then
    raise exception 'Como líder, use o pedido de match normal';
  end if;

  if v_sug.esporte_id is distinct from v_alvo.esporte_id or v_sug.tipo is distinct from v_alvo.tipo then
    raise exception 'Esporte ou tipo de formação não confere com o alvo';
  end if;

  if not exists (
    select 1 from public.membros_time m
    where m.time_id = p_sugeridor_time_id
      and m.usuario_id = v_uid
      and m.status = 'ativo'
  ) then
    raise exception 'Você precisa ser membro ativo da formação indicada';
  end if;

  if exists (
    select 1 from public.match_sugestoes s
    where s.sugeridor_id = v_uid
      and s.alvo_time_id = p_alvo_time_id
      and s.sugeridor_time_id = p_sugeridor_time_id
      and s.status = 'pendente'
  ) then
    raise exception 'Já existe uma sugestão pendente para este confronto';
  end if;

  v_msg := left(trim(coalesce(p_mensagem, '')), 500);
  if v_msg = '' then
    v_msg := null;
  end if;

  insert into public.match_sugestoes (
    sugeridor_id,
    sugeridor_time_id,
    alvo_time_id,
    alvo_dono_id,
    esporte_id,
    modalidade,
    mensagem,
    status
  )
  values (
    v_uid,
    p_sugeridor_time_id,
    p_alvo_time_id,
    v_alvo.criador_id,
    v_alvo.esporte_id,
    v_alvo.tipo,
    v_msg,
    'pendente'
  )
  returning id into v_sid;

  select nome into v_sug_nome from public.profiles where id = v_uid;

  insert into public.notificacoes (
    usuario_id,
    mensagem,
    tipo,
    referencia_id,
    lida,
    remetente_id,
    data_criacao
  )
  values (
    v_alvo.criador_id,
    coalesce(
      nullif(trim(v_sug_nome), ''),
      'Um atleta da sua equipe'
    ) || ' sugeriu um match contra ' || coalesce(v_alvo.nome, 'sua formação') || '. Abra Social para aprovar ou recusar.',
    'match',
    v_sid,
    false,
    v_uid,
    now()
  );

  return v_sid;
end;
$$;

revoke all on function public.sugerir_match_para_lider (bigint, bigint, text) from public;
grant execute on function public.sugerir_match_para_lider (bigint, bigint, text) to authenticated;

create or replace function public.responder_sugestao_match (p_sugestao_id bigint, p_aceitar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_mid bigint;
  v_challenger uuid;
  nome_sug text;
  nome_alvo text;
  nome_sug_time text;
  v_body text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select *
  into r
  from public.match_sugestoes
  where id = p_sugestao_id;

  if r.id is null then
    raise exception 'Sugestão não encontrada';
  end if;

  if r.alvo_dono_id is distinct from v_uid then
    raise exception 'Sem permissão para responder esta sugestão';
  end if;

  if r.status is distinct from 'pendente' then
    raise exception 'Esta sugestão já foi respondida';
  end if;

  select nome into nome_sug from public.profiles where id = r.sugeridor_id;
  select nome into nome_alvo from public.times where id = r.alvo_time_id;
  select nome into nome_sug_time from public.times where id = r.sugeridor_time_id;

  if not p_aceitar then
    update public.match_sugestoes
    set status = 'recusado', respondido_em = now()
    where id = p_sugestao_id;

    insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
    values (
      r.sugeridor_id,
      'O líder recusou sua sugestão de match' || coalesce(' contra ' || nullif(trim(nome_alvo), ''), '') || '.',
      'match',
      p_sugestao_id,
      false,
      v_uid,
      now()
    );
    return;
  end if;

  select criador_id into v_challenger from public.times where id = r.sugeridor_time_id;
  if v_challenger is null then
    raise exception 'Formação do sugeridor inválida';
  end if;

  insert into public.matches (
    usuario_id,
    adversario_id,
    esporte_id,
    tipo,
    modalidade_confronto,
    status,
    data_registro,
    data_solicitacao,
    data_confirmacao,
    adversario_time_id
  )
  values (
    v_challenger,
    r.alvo_dono_id,
    r.esporte_id,
    r.modalidade,
    r.modalidade,
    'Aceito',
    now(),
    now(),
    now(),
    r.alvo_time_id
  )
  returning id into v_mid;

  update public.match_sugestoes
  set status = 'aprovado', respondido_em = now(), match_id = v_mid
  where id = p_sugestao_id;

  v_body := 'Match confirmado: '
    || coalesce(nullif(trim(nome_sug_time), ''), 'Formação')
    || ' × '
    || coalesce(nullif(trim(nome_alvo), ''), 'Formação')
    || '. Combine detalhes com o líder e registre na agenda quando jogarem.';

  insert into public.notificacoes (usuario_id, mensagem, tipo, referencia_id, lida, remetente_id, data_criacao)
  select distinct u.uid, v_body, 'match', v_mid, false, v_uid, now()
  from (
    select r.sugeridor_id as uid
    union
    select v_challenger
    union
    select r.alvo_dono_id
    union
    select m.usuario_id from public.membros_time m
    where m.status = 'ativo'
      and m.time_id in (r.alvo_time_id, r.sugeridor_time_id)
  ) u
  where u.uid is not null;
end;
$$;

revoke all on function public.responder_sugestao_match (bigint, boolean) from public;
grant execute on function public.responder_sugestao_match (bigint, boolean) to authenticated;


-- ============================================================================
-- 20260421203000_usuario_eid_modalidades_match.sql
-- ============================================================================

-- Permite combinar modalidades de match (ex.: individual + dupla + time) por esporte.

alter table public.usuario_eid
  add column if not exists modalidades_match text[];

update public.usuario_eid
set modalidades_match = array[coalesce(nullif(trim(modalidade_match), ''), 'individual')]::text[]
where modalidades_match is null;

alter table public.usuario_eid
  alter column modalidades_match set default array['individual']::text[],
  alter column modalidades_match set not null;

alter table public.usuario_eid
  drop constraint if exists usuario_eid_modalidades_match_ck;

alter table public.usuario_eid
  add constraint usuario_eid_modalidades_match_ck
  check (
    coalesce(array_length(modalidades_match, 1), 0) >= 1
    and modalidades_match <@ array['individual', 'dupla', 'time']::text[]
  );

create or replace function public.usuario_eid_modalidades_legacy_sync()
returns trigger
language plpgsql
as $$
begin
  if new.modalidades_match is not null and coalesce(array_length(new.modalidades_match, 1), 0) >= 1 then
    new.modalidade_match := new.modalidades_match[1];
  elsif new.modalidade_match is not null and (
    tg_op = 'INSERT'
    or (old.modalidade_match is distinct from new.modalidade_match)
  ) then
    new.modalidades_match := array[new.modalidade_match]::text[];
  end if;
  return new;
end;
$$;

drop trigger if exists tr_usuario_eid_modalidades_legacy_sync on public.usuario_eid;
create trigger tr_usuario_eid_modalidades_legacy_sync
before insert or update on public.usuario_eid
for each row
execute function public.usuario_eid_modalidades_legacy_sync();

-- Radar: uma linha por combinação (usuário, esporte, modalidade escolhida).
create or replace function public.buscar_match_atletas(
  p_viewer_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_esporte_id bigint default null,
  p_raio_km integer default 30,
  p_limit integer default 300
)
returns table (
  usuario_id uuid,
  nome text,
  localizacao text,
  esporte_id bigint,
  esporte_nome text,
  dist_km double precision,
  nota_eid numeric,
  pontos_ranking integer,
  modalidade_match text,
  interesse_match text
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select
      ue.usuario_id,
      coalesce(p.nome, 'Atleta') as nome,
      coalesce(p.localizacao, 'Localização não informada') as localizacao,
      ue.esporte_id,
      coalesce(e.nome, 'Esporte') as esporte_nome,
      public.eid_distance_km(p_lat, p_lng, p.lat, p.lng) as dist_km,
      ue.nota_eid,
      ue.pontos_ranking,
      case
        when ue.modalidades_match is not null and coalesce(array_length(ue.modalidades_match, 1), 0) >= 1
        then ue.modalidades_match
        else array[coalesce(ue.modalidade_match, 'individual')]::text[]
      end as mods,
      coalesce(ue.interesse_match, 'ranking_e_amistoso') as interesse_match,
      row_number() over (
        partition by ue.usuario_id
        order by ue.nota_eid desc nulls last, ue.pontos_ranking desc nulls last, ue.esporte_id asc
      ) as rn
    from public.usuario_eid ue
    join public.profiles p on p.id = ue.usuario_id
    left join public.esportes e on e.id = ue.esporte_id
    where ue.usuario_id <> p_viewer_id
      and (p_esporte_id is null or ue.esporte_id = p_esporte_id)
  ),
  expanded as (
    select
      r.usuario_id,
      r.nome,
      r.localizacao,
      r.esporte_id,
      r.esporte_nome,
      r.dist_km,
      r.nota_eid,
      r.pontos_ranking,
      unnest(r.mods) as modalidade_match,
      r.interesse_match
    from ranked r
    where (p_esporte_id is not null or r.rn = 1)
  )
  select
    e.usuario_id,
    e.nome,
    e.localizacao,
    e.esporte_id,
    e.esporte_nome,
    e.dist_km,
    e.nota_eid,
    e.pontos_ranking,
    e.modalidade_match,
    e.interesse_match
  from expanded e
  where e.dist_km <= greatest(1, p_raio_km)
  order by e.dist_km asc, e.nome asc, e.modalidade_match asc
  limit greatest(1, p_limit);
$$;


-- ============================================================================
-- 20260422100000_usuario_eid_tempo_experiencia.sql
-- ============================================================================

-- Adiciona campo de tempo de experiência individual por esporte no EID do usuário
alter table public.usuario_eid
  add column if not exists tempo_experiencia text;


-- ============================================================================
-- 20260422110000_sync_profiles_tipo_usuario_from_papeis.sql
-- ============================================================================

-- Torna usuario_papeis a fonte de verdade dos papéis e mantém profiles.tipo_usuario
-- apenas como coluna legada/somente leitura para compatibilidade.

create or replace function public.profile_tipo_usuario_from_papeis(p_usuario_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select
    case
      when exists (
        select 1 from public.usuario_papeis up
        where up.usuario_id = p_usuario_id
          and up.papel = 'espaco'
      ) then 'espaco'
      when exists (
        select 1 from public.usuario_papeis up
        where up.usuario_id = p_usuario_id
          and up.papel = 'organizador'
      ) then 'organizador'
      when exists (
        select 1 from public.usuario_papeis up
        where up.usuario_id = p_usuario_id
          and up.papel = 'professor'
      ) then 'professor'
      when exists (
        select 1 from public.usuario_papeis up
        where up.usuario_id = p_usuario_id
          and up.papel = 'atleta'
      ) then 'atleta'
      else 'atleta'
    end;
$$;

create or replace function public.sync_profile_tipo_usuario_from_papeis()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_usuario_id uuid;
begin
  v_usuario_id := coalesce(new.usuario_id, old.usuario_id);

  if v_usuario_id is null then
    return coalesce(new, old);
  end if;

  update public.profiles
  set
    tipo_usuario = public.profile_tipo_usuario_from_papeis(v_usuario_id),
    atualizado_em = now()
  where id = v_usuario_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists tr_sync_profile_tipo_usuario_from_papeis on public.usuario_papeis;

create trigger tr_sync_profile_tipo_usuario_from_papeis
after insert or update or delete on public.usuario_papeis
for each row
execute function public.sync_profile_tipo_usuario_from_papeis();

update public.profiles p
set
  tipo_usuario = public.profile_tipo_usuario_from_papeis(p.id),
  atualizado_em = now();


-- ============================================================================
-- 20260422113000_professor_domain.sql
-- ============================================================================

-- Dominio de professores: perfil comercial, esportes, agenda, pagamentos,
-- feedback mensal e metricas docentes.

create table if not exists public.professor_perfil (
  usuario_id uuid primary key references public.profiles (id) on delete cascade,
  slug_publico text unique,
  headline text,
  bio_profissional text,
  tipo_atuacao text[] not null default array['aulas']::text[],
  objetivo_padrao text not null default 'somente_exposicao',
  certificacoes_json jsonb not null default '[]'::jsonb,
  publico_alvo_json jsonb not null default '[]'::jsonb,
  formato_aula_json jsonb not null default '[]'::jsonb,
  politica_cancelamento_json jsonb not null default '{}'::jsonb,
  notificacoes_json jsonb not null default '{}'::jsonb,
  aceita_novos_alunos boolean not null default true,
  perfil_publicado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_perfil_objetivo_ck
    check (objetivo_padrao in ('gerir_alunos', 'somente_exposicao', 'ambos')),
  constraint professor_perfil_tipo_atuacao_ck
    check (coalesce(array_length(tipo_atuacao, 1), 0) >= 1
      and tipo_atuacao <@ array['aulas', 'treinamento', 'consultoria']::text[])
);

create table if not exists public.professor_esportes (
  id bigint generated always as identity primary key,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete cascade,
  modo_atuacao text not null default 'professor',
  objetivo_plataforma text not null default 'somente_exposicao',
  tipo_atuacao text[] not null default array['aulas']::text[],
  especialidades_json jsonb not null default '[]'::jsonb,
  nivel_alunos_json jsonb not null default '[]'::jsonb,
  tempo_experiencia text,
  valor_base_centavos integer not null default 0,
  moeda text not null default 'BRL',
  elegivel_match boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_esportes_unique unique (professor_id, esporte_id),
  constraint professor_esportes_modo_ck
    check (modo_atuacao in ('professor', 'professor_e_atleta')),
  constraint professor_esportes_objetivo_ck
    check (objetivo_plataforma in ('gerir_alunos', 'somente_exposicao', 'ambos')),
  constraint professor_esportes_tipo_atuacao_ck
    check (coalesce(array_length(tipo_atuacao, 1), 0) >= 1
      and tipo_atuacao <@ array['aulas', 'treinamento', 'consultoria']::text[]),
  constraint professor_esportes_valor_ck
    check (valor_base_centavos >= 0),
  constraint professor_esportes_moeda_ck
    check (char_length(moeda) = 3)
);

create table if not exists public.professor_locais (
  id bigint generated always as identity primary key,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  espaco_id bigint not null references public.espacos_genericos (id) on delete cascade,
  tipo_vinculo text not null default 'preferencial',
  usa_horarios_do_espaco boolean not null default false,
  status_vinculo text not null default 'ativo',
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_locais_unique unique (professor_id, espaco_id),
  constraint professor_locais_tipo_ck
    check (tipo_vinculo in ('parceiro', 'preferencial', 'proprio')),
  constraint professor_locais_status_ck
    check (status_vinculo in ('ativo', 'pendente', 'inativo'))
);

create table if not exists public.professor_disponibilidades (
  id bigint generated always as identity primary key,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint references public.esportes (id) on delete set null,
  espaco_id bigint references public.espacos_genericos (id) on delete set null,
  dia_semana smallint not null,
  hora_inicio time not null,
  hora_fim time not null,
  capacidade smallint not null default 1,
  recorrente boolean not null default true,
  ativo boolean not null default true,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_disponibilidades_dia_ck check (dia_semana between 0 and 6),
  constraint professor_disponibilidades_hora_ck check (hora_inicio < hora_fim),
  constraint professor_disponibilidades_capacidade_ck check (capacidade >= 1)
);

create table if not exists public.professor_aulas (
  id bigint generated always as identity primary key,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete restrict,
  espaco_id bigint references public.espacos_genericos (id) on delete set null,
  reserva_quadra_id bigint references public.reservas_quadra (id) on delete set null,
  titulo text,
  descricao text,
  tipo_aula text not null default 'individual',
  status text not null default 'agendada',
  origem_agendamento text not null default 'professor',
  capacidade integer not null default 1,
  valor_total_centavos integer not null default 0,
  moeda text not null default 'BRL',
  inicio timestamptz not null,
  fim timestamptz not null,
  cancelado_por uuid references public.profiles (id) on delete set null,
  motivo_cancelamento text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_aulas_tipo_ck
    check (tipo_aula in ('individual', 'grupo', 'avaliacao', 'treino')),
  constraint professor_aulas_status_ck
    check (status in ('rascunho', 'agendada', 'confirmada', 'concluida', 'cancelada', 'reagendada')),
  constraint professor_aulas_origem_ck
    check (origem_agendamento in ('professor', 'aluno', 'automatico', 'espaco')),
  constraint professor_aulas_capacidade_ck check (capacidade >= 1),
  constraint professor_aulas_valor_ck check (valor_total_centavos >= 0),
  constraint professor_aulas_horario_ck check (inicio < fim),
  constraint professor_aulas_moeda_ck check (char_length(moeda) = 3)
);

create table if not exists public.professor_aula_alunos (
  id bigint generated always as identity primary key,
  aula_id bigint not null references public.professor_aulas (id) on delete cascade,
  aluno_id uuid not null references public.profiles (id) on delete cascade,
  status_inscricao text not null default 'confirmada',
  status_pagamento text not null default 'pendente',
  valor_centavos integer not null default 0,
  presenca_confirmada boolean not null default false,
  concluido_em timestamptz,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_aula_alunos_unique unique (aula_id, aluno_id),
  constraint professor_aula_alunos_status_ck
    check (status_inscricao in ('pendente', 'confirmada', 'cancelada', 'concluida', 'faltou')),
  constraint professor_aula_alunos_pagamento_ck
    check (status_pagamento in ('pendente', 'processando', 'pago', 'falhou', 'estornado', 'isento')),
  constraint professor_aula_alunos_valor_ck check (valor_centavos >= 0)
);

create table if not exists public.professor_pagamentos (
  id bigint generated always as identity primary key,
  aula_id bigint not null references public.professor_aulas (id) on delete cascade,
  aula_aluno_id bigint references public.professor_aula_alunos (id) on delete set null,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  aluno_id uuid references public.profiles (id) on delete set null,
  asaas_payment_id text unique,
  asaas_customer_id text,
  asaas_charge_url text,
  billing_type text,
  status text not null default 'pending',
  valor_bruto_centavos integer not null default 0,
  taxa_gateway_centavos integer not null default 0,
  comissao_plataforma_centavos integer not null default 0,
  valor_liquido_professor_centavos integer not null default 0,
  payload_resumo_json jsonb not null default '{}'::jsonb,
  pago_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_pagamentos_status_ck
    check (status in ('pending', 'processing', 'approved', 'received', 'overdue', 'refunded', 'failed', 'cancelled')),
  constraint professor_pagamentos_valores_ck
    check (
      valor_bruto_centavos >= 0
      and taxa_gateway_centavos >= 0
      and comissao_plataforma_centavos >= 0
      and valor_liquido_professor_centavos >= 0
    )
);

create table if not exists public.professor_feedback_ciclos (
  id bigint generated always as identity primary key,
  professor_id uuid not null references public.profiles (id) on delete cascade,
  aluno_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete cascade,
  competencia_ano smallint not null,
  competencia_mes smallint not null,
  status text not null default 'aberto',
  aulas_pagas_periodo integer not null default 0,
  aberto_em timestamptz not null default now(),
  fechado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_feedback_ciclos_unique
    unique (professor_id, aluno_id, esporte_id, competencia_ano, competencia_mes),
  constraint professor_feedback_ciclos_status_ck
    check (status in ('aberto', 'respondido', 'expirado', 'dispensado')),
  constraint professor_feedback_ciclos_mes_ck
    check (competencia_mes between 1 and 12),
  constraint professor_feedback_ciclos_aulas_ck
    check (aulas_pagas_periodo >= 0)
);

create table if not exists public.professor_feedback_respostas (
  id bigint generated always as identity primary key,
  ciclo_id bigint not null unique references public.professor_feedback_ciclos (id) on delete cascade,
  aula_id bigint references public.professor_aulas (id) on delete set null,
  nota_geral smallint not null,
  nps smallint,
  quiz_json jsonb not null default '{}'::jsonb,
  comentario text,
  aula_realizada boolean not null default true,
  respondido_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint professor_feedback_respostas_nota_ck check (nota_geral between 1 and 5),
  constraint professor_feedback_respostas_nps_ck check (nps is null or nps between 0 and 10)
);

create table if not exists public.professor_metricas (
  professor_id uuid not null references public.profiles (id) on delete cascade,
  esporte_id bigint not null references public.esportes (id) on delete cascade,
  nota_docente numeric(6, 2) not null default 0,
  total_avaliacoes_validas integer not null default 0,
  taxa_presenca numeric(8, 4) not null default 0,
  taxa_cancelamento numeric(8, 4) not null default 0,
  media_periodo numeric(6, 2) not null default 0,
  ultimo_calculo_em timestamptz,
  atualizado_em timestamptz not null default now(),
  primary key (professor_id, esporte_id)
);

create index if not exists idx_professor_esportes_professor
  on public.professor_esportes (professor_id, ativo);
create index if not exists idx_professor_esportes_esporte
  on public.professor_esportes (esporte_id, ativo);
create index if not exists idx_professor_locais_professor
  on public.professor_locais (professor_id, status_vinculo);
create index if not exists idx_professor_disponibilidades_professor
  on public.professor_disponibilidades (professor_id, dia_semana, ativo);
create index if not exists idx_professor_aulas_professor_inicio
  on public.professor_aulas (professor_id, inicio desc);
create index if not exists idx_professor_aulas_status_inicio
  on public.professor_aulas (status, inicio asc);
create index if not exists idx_professor_aula_alunos_aluno
  on public.professor_aula_alunos (aluno_id, status_pagamento);
create index if not exists idx_professor_pagamentos_professor
  on public.professor_pagamentos (professor_id, status, criado_em desc);
create index if not exists idx_professor_feedback_ciclos_professor
  on public.professor_feedback_ciclos (professor_id, competencia_ano desc, competencia_mes desc);
create index if not exists idx_professor_metricas_nota
  on public.professor_metricas (esporte_id, nota_docente desc);

create or replace function public.professor_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists tr_professor_perfil_touch_updated_at on public.professor_perfil;
create trigger tr_professor_perfil_touch_updated_at
before update on public.professor_perfil
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_esportes_touch_updated_at on public.professor_esportes;
create trigger tr_professor_esportes_touch_updated_at
before update on public.professor_esportes
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_locais_touch_updated_at on public.professor_locais;
create trigger tr_professor_locais_touch_updated_at
before update on public.professor_locais
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_disponibilidades_touch_updated_at on public.professor_disponibilidades;
create trigger tr_professor_disponibilidades_touch_updated_at
before update on public.professor_disponibilidades
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_aulas_touch_updated_at on public.professor_aulas;
create trigger tr_professor_aulas_touch_updated_at
before update on public.professor_aulas
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_aula_alunos_touch_updated_at on public.professor_aula_alunos;
create trigger tr_professor_aula_alunos_touch_updated_at
before update on public.professor_aula_alunos
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_pagamentos_touch_updated_at on public.professor_pagamentos;
create trigger tr_professor_pagamentos_touch_updated_at
before update on public.professor_pagamentos
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_feedback_ciclos_touch_updated_at on public.professor_feedback_ciclos;
create trigger tr_professor_feedback_ciclos_touch_updated_at
before update on public.professor_feedback_ciclos
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_feedback_respostas_touch_updated_at on public.professor_feedback_respostas;
create trigger tr_professor_feedback_respostas_touch_updated_at
before update on public.professor_feedback_respostas
for each row
execute function public.professor_touch_updated_at();

drop trigger if exists tr_professor_metricas_touch_updated_at on public.professor_metricas;
create trigger tr_professor_metricas_touch_updated_at
before update on public.professor_metricas
for each row
execute function public.professor_touch_updated_at();

create or replace function public.professor_criar_notificacao(
  p_usuario_id uuid,
  p_mensagem text,
  p_tipo text,
  p_referencia_id bigint default null,
  p_remetente_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_usuario_id is null or coalesce(trim(p_mensagem), '') = '' then
    return;
  end if;

  insert into public.notificacoes (
    usuario_id,
    mensagem,
    tipo,
    referencia_id,
    lida,
    remetente_id,
    data_criacao
  )
  values (
    p_usuario_id,
    left(trim(p_mensagem), 500),
    p_tipo,
    p_referencia_id,
    false,
    p_remetente_id,
    now()
  );
end;
$$;

create or replace function public.professor_agendar_aula(
  p_esporte_id bigint,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_tipo_aula text default 'individual',
  p_capacidade integer default 1,
  p_espaco_id bigint default null,
  p_valor_total_centavos integer default 0,
  p_titulo text default null,
  p_descricao text default null,
  p_origem_agendamento text default 'professor'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_aula_id bigint;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if p_esporte_id is null or p_inicio is null or p_fim is null or p_inicio >= p_fim then
    raise exception 'Parâmetros inválidos';
  end if;

  if not exists (
    select 1
    from public.professor_esportes pe
    where pe.professor_id = v_uid
      and pe.esporte_id = p_esporte_id
      and pe.ativo = true
  ) then
    raise exception 'Você não está habilitado como professor neste esporte';
  end if;

  insert into public.professor_aulas (
    professor_id,
    esporte_id,
    espaco_id,
    titulo,
    descricao,
    tipo_aula,
    capacidade,
    valor_total_centavos,
    origem_agendamento,
    inicio,
    fim
  )
  values (
    v_uid,
    p_esporte_id,
    p_espaco_id,
    nullif(trim(coalesce(p_titulo, '')), ''),
    nullif(trim(coalesce(p_descricao, '')), ''),
    case
      when p_tipo_aula in ('individual', 'grupo', 'avaliacao', 'treino')
      then p_tipo_aula
      else 'individual'
    end,
    greatest(1, coalesce(p_capacidade, 1)),
    greatest(0, coalesce(p_valor_total_centavos, 0)),
    case
      when p_origem_agendamento in ('professor', 'aluno', 'automatico', 'espaco')
      then p_origem_agendamento
      else 'professor'
    end,
    p_inicio,
    p_fim
  )
  returning id into v_aula_id;

  perform public.professor_criar_notificacao(
    v_uid,
    'Aula agendada para ' || to_char(p_inicio at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || '.',
    'professor_aula',
    v_aula_id,
    v_uid
  );

  return v_aula_id;
end;
$$;

create or replace function public.professor_cancelar_aula(
  p_aula_id bigint,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_aula record;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select id, professor_id, titulo, inicio
  into v_aula
  from public.professor_aulas
  where id = p_aula_id;

  if v_aula.id is null then
    raise exception 'Aula não encontrada';
  end if;

  if v_aula.professor_id is distinct from v_uid then
    raise exception 'Sem permissão para cancelar esta aula';
  end if;

  update public.professor_aulas
  set
    status = 'cancelada',
    cancelado_por = v_uid,
    motivo_cancelamento = nullif(trim(coalesce(p_motivo, '')), ''),
    atualizado_em = now()
  where id = p_aula_id;

  update public.professor_aula_alunos
  set
    status_inscricao = 'cancelada',
    atualizado_em = now()
  where aula_id = p_aula_id
    and status_inscricao <> 'cancelada';

  insert into public.notificacoes (
    usuario_id,
    mensagem,
    tipo,
    referencia_id,
    lida,
    remetente_id,
    data_criacao
  )
  select
    paa.aluno_id,
    'A aula ' || coalesce(nullif(trim(v_aula.titulo), ''), '#' || p_aula_id::text)
      || ' de '
      || to_char(v_aula.inicio at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI')
      || ' foi cancelada.'
      || coalesce(' Motivo: ' || nullif(trim(p_motivo), ''), ''),
    'professor_cancelamento',
    p_aula_id,
    false,
    v_uid,
    now()
  from public.professor_aula_alunos paa
  where paa.aula_id = p_aula_id;
end;
$$;

create or replace function public.professor_reagendar_aula(
  p_aula_id bigint,
  p_novo_inicio timestamptz,
  p_novo_fim timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_aula record;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if p_novo_inicio is null or p_novo_fim is null or p_novo_inicio >= p_novo_fim then
    raise exception 'Novo horário inválido';
  end if;

  select id, professor_id, titulo
  into v_aula
  from public.professor_aulas
  where id = p_aula_id;

  if v_aula.id is null then
    raise exception 'Aula não encontrada';
  end if;

  if v_aula.professor_id is distinct from v_uid then
    raise exception 'Sem permissão para reagendar esta aula';
  end if;

  update public.professor_aulas
  set
    inicio = p_novo_inicio,
    fim = p_novo_fim,
    status = 'reagendada',
    atualizado_em = now()
  where id = p_aula_id;

  insert into public.notificacoes (
    usuario_id,
    mensagem,
    tipo,
    referencia_id,
    lida,
    remetente_id,
    data_criacao
  )
  select
    paa.aluno_id,
    'A aula ' || coalesce(nullif(trim(v_aula.titulo), ''), '#' || p_aula_id::text)
      || ' foi reagendada para '
      || to_char(p_novo_inicio at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || '.',
    'professor_reagendamento',
    p_aula_id,
    false,
    v_uid,
    now()
  from public.professor_aula_alunos paa
  where paa.aula_id = p_aula_id;
end;
$$;

create or replace function public.professor_marcar_feedback_respondido()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.professor_feedback_ciclos
  set
    status = 'respondido',
    fechado_em = coalesce(new.respondido_em, now()),
    atualizado_em = now()
  where id = new.ciclo_id;

  return new;
end;
$$;

drop trigger if exists tr_professor_feedback_respondido on public.professor_feedback_respostas;
create trigger tr_professor_feedback_respondido
after insert on public.professor_feedback_respostas
for each row
execute function public.professor_marcar_feedback_respondido();

create or replace function public.professor_abrir_feedbacks_mensal(
  p_ano smallint default null,
  p_mes smallint default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alvo date := date_trunc('month', coalesce(make_date(p_ano, p_mes, 1), now() - interval '1 month'))::date;
  v_inserted integer := 0;
begin
  with base as (
    select
      pa.professor_id,
      paa.aluno_id,
      pa.esporte_id,
      extract(year from pa.inicio)::smallint as ano_ref,
      extract(month from pa.inicio)::smallint as mes_ref,
      count(*)::int as aulas_pagas
    from public.professor_aulas pa
    join public.professor_aula_alunos paa on paa.aula_id = pa.id
    where pa.status = 'concluida'
      and paa.status_pagamento = 'pago'
      and date_trunc('month', pa.inicio) = date_trunc('month', v_alvo)
    group by 1, 2, 3, 4, 5
  ), inserted as (
    insert into public.professor_feedback_ciclos (
      professor_id,
      aluno_id,
      esporte_id,
      competencia_ano,
      competencia_mes,
      aulas_pagas_periodo,
      status,
      aberto_em
    )
    select
      b.professor_id,
      b.aluno_id,
      b.esporte_id,
      b.ano_ref,
      b.mes_ref,
      b.aulas_pagas,
      'aberto',
      now()
    from base b
    on conflict (professor_id, aluno_id, esporte_id, competencia_ano, competencia_mes) do update
      set aulas_pagas_periodo = excluded.aulas_pagas_periodo,
          atualizado_em = now()
    returning id, professor_id, aluno_id
  )
  select count(*) into v_inserted from inserted;

  insert into public.notificacoes (
    usuario_id,
    mensagem,
    tipo,
    referencia_id,
    lida,
    remetente_id,
    data_criacao
  )
  select
    i.aluno_id,
    'Seu feedback mensal do professor já está disponível.',
    'professor_feedback',
    i.id,
    false,
    i.professor_id,
    now()
  from inserted i
  on conflict do nothing;

  return coalesce(v_inserted, 0);
end;
$$;

create or replace function public.professor_consolidar_metricas(
  p_professor_id uuid default null,
  p_esporte_id bigint default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
begin
  with feedbacks as (
    select
      c.professor_id,
      c.esporte_id,
      avg(r.nota_geral)::numeric(6, 2) as nota_docente,
      count(*)::int as total_avaliacoes_validas
    from public.professor_feedback_ciclos c
    join public.professor_feedback_respostas r on r.ciclo_id = c.id
    where (p_professor_id is null or c.professor_id = p_professor_id)
      and (p_esporte_id is null or c.esporte_id = p_esporte_id)
      and r.aula_realizada = true
    group by 1, 2
  ), presencas as (
    select
      pa.professor_id,
      pa.esporte_id,
      coalesce(avg(case when paa.presenca_confirmada then 1 else 0 end)::numeric, 0)::numeric(8, 4) as taxa_presenca,
      coalesce(avg(case when pa.status = 'cancelada' then 1 else 0 end)::numeric, 0)::numeric(8, 4) as taxa_cancelamento
    from public.professor_aulas pa
    left join public.professor_aula_alunos paa on paa.aula_id = pa.id
    where (p_professor_id is null or pa.professor_id = p_professor_id)
      and (p_esporte_id is null or pa.esporte_id = p_esporte_id)
    group by 1, 2
  ), final_rows as (
    select
      coalesce(f.professor_id, p.professor_id) as professor_id,
      coalesce(f.esporte_id, p.esporte_id) as esporte_id,
      coalesce(f.nota_docente, 0)::numeric(6, 2) as nota_docente,
      coalesce(f.total_avaliacoes_validas, 0) as total_avaliacoes_validas,
      coalesce(p.taxa_presenca, 0)::numeric(8, 4) as taxa_presenca,
      coalesce(p.taxa_cancelamento, 0)::numeric(8, 4) as taxa_cancelamento
    from feedbacks f
    full outer join presencas p
      on p.professor_id = f.professor_id
     and p.esporte_id = f.esporte_id
  ), upserted as (
    insert into public.professor_metricas (
      professor_id,
      esporte_id,
      nota_docente,
      total_avaliacoes_validas,
      taxa_presenca,
      taxa_cancelamento,
      media_periodo,
      ultimo_calculo_em,
      atualizado_em
    )
    select
      professor_id,
      esporte_id,
      nota_docente,
      total_avaliacoes_validas,
      taxa_presenca,
      taxa_cancelamento,
      nota_docente,
      now(),
      now()
    from final_rows
    on conflict (professor_id, esporte_id) do update
      set nota_docente = excluded.nota_docente,
          total_avaliacoes_validas = excluded.total_avaliacoes_validas,
          taxa_presenca = excluded.taxa_presenca,
          taxa_cancelamento = excluded.taxa_cancelamento,
          media_periodo = excluded.media_periodo,
          ultimo_calculo_em = excluded.ultimo_calculo_em,
          atualizado_em = now()
    returning 1
  )
  select count(*) into v_rows from upserted;

  return coalesce(v_rows, 0);
end;
$$;

alter table public.professor_perfil enable row level security;
alter table public.professor_esportes enable row level security;
alter table public.professor_locais enable row level security;
alter table public.professor_disponibilidades enable row level security;
alter table public.professor_aulas enable row level security;
alter table public.professor_aula_alunos enable row level security;
alter table public.professor_pagamentos enable row level security;
alter table public.professor_feedback_ciclos enable row level security;
alter table public.professor_feedback_respostas enable row level security;
alter table public.professor_metricas enable row level security;

drop policy if exists "professor_perfil_select_public_or_owner" on public.professor_perfil;
create policy "professor_perfil_select_public_or_owner"
  on public.professor_perfil for select to authenticated
  using (usuario_id = auth.uid() or perfil_publicado = true);

drop policy if exists "professor_perfil_owner_all" on public.professor_perfil;
create policy "professor_perfil_owner_all"
  on public.professor_perfil for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

drop policy if exists "professor_esportes_select_public_or_owner" on public.professor_esportes;
create policy "professor_esportes_select_public_or_owner"
  on public.professor_esportes for select to authenticated
  using (
    professor_id = auth.uid()
    or exists (
      select 1
      from public.professor_perfil pp
      where pp.usuario_id = professor_esportes.professor_id
        and pp.perfil_publicado = true
    )
  );

drop policy if exists "professor_esportes_owner_all" on public.professor_esportes;
create policy "professor_esportes_owner_all"
  on public.professor_esportes for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

drop policy if exists "professor_locais_select_public_or_owner" on public.professor_locais;
create policy "professor_locais_select_public_or_owner"
  on public.professor_locais for select to authenticated
  using (
    professor_id = auth.uid()
    or status_vinculo = 'ativo'
  );

drop policy if exists "professor_locais_owner_all" on public.professor_locais;
create policy "professor_locais_owner_all"
  on public.professor_locais for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

drop policy if exists "professor_disponibilidades_select_public_or_owner" on public.professor_disponibilidades;
create policy "professor_disponibilidades_select_public_or_owner"
  on public.professor_disponibilidades for select to authenticated
  using (
    professor_id = auth.uid()
    or exists (
      select 1
      from public.professor_perfil pp
      where pp.usuario_id = professor_disponibilidades.professor_id
        and pp.perfil_publicado = true
    )
  );

drop policy if exists "professor_disponibilidades_owner_all" on public.professor_disponibilidades;
create policy "professor_disponibilidades_owner_all"
  on public.professor_disponibilidades for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

drop policy if exists "professor_aulas_participantes_select" on public.professor_aulas;
create policy "professor_aulas_participantes_select"
  on public.professor_aulas for select to authenticated
  using (
    professor_id = auth.uid()
    or exists (
      select 1
      from public.professor_aula_alunos paa
      where paa.aula_id = professor_aulas.id
        and paa.aluno_id = auth.uid()
    )
  );

drop policy if exists "professor_aulas_owner_all" on public.professor_aulas;
create policy "professor_aulas_owner_all"
  on public.professor_aulas for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

drop policy if exists "professor_aula_alunos_participantes" on public.professor_aula_alunos;
create policy "professor_aula_alunos_participantes"
  on public.professor_aula_alunos for select to authenticated
  using (
    aluno_id = auth.uid()
    or exists (
      select 1
      from public.professor_aulas pa
      where pa.id = professor_aula_alunos.aula_id
        and pa.professor_id = auth.uid()
    )
  );

drop policy if exists "professor_aula_alunos_owner_insert_update" on public.professor_aula_alunos;
create policy "professor_aula_alunos_owner_insert_update"
  on public.professor_aula_alunos for all to authenticated
  using (
    aluno_id = auth.uid()
    or exists (
      select 1
      from public.professor_aulas pa
      where pa.id = professor_aula_alunos.aula_id
        and pa.professor_id = auth.uid()
    )
  )
  with check (
    aluno_id = auth.uid()
    or exists (
      select 1
      from public.professor_aulas pa
      where pa.id = professor_aula_alunos.aula_id
        and pa.professor_id = auth.uid()
    )
  );

drop policy if exists "professor_pagamentos_participantes" on public.professor_pagamentos;
create policy "professor_pagamentos_participantes"
  on public.professor_pagamentos for select to authenticated
  using (professor_id = auth.uid() or aluno_id = auth.uid());

drop policy if exists "professor_pagamentos_owner_all" on public.professor_pagamentos;
create policy "professor_pagamentos_owner_all"
  on public.professor_pagamentos for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

drop policy if exists "professor_feedback_ciclos_participantes" on public.professor_feedback_ciclos;
create policy "professor_feedback_ciclos_participantes"
  on public.professor_feedback_ciclos for select to authenticated
  using (professor_id = auth.uid() or aluno_id = auth.uid());

drop policy if exists "professor_feedback_ciclos_owner_all" on public.professor_feedback_ciclos;
create policy "professor_feedback_ciclos_owner_all"
  on public.professor_feedback_ciclos for all to authenticated
  using (professor_id = auth.uid() or aluno_id = auth.uid())
  with check (professor_id = auth.uid() or aluno_id = auth.uid());

drop policy if exists "professor_feedback_respostas_participantes" on public.professor_feedback_respostas;
create policy "professor_feedback_respostas_participantes"
  on public.professor_feedback_respostas for select to authenticated
  using (
    exists (
      select 1
      from public.professor_feedback_ciclos c
      where c.id = professor_feedback_respostas.ciclo_id
        and (c.professor_id = auth.uid() or c.aluno_id = auth.uid())
    )
  );

drop policy if exists "professor_feedback_respostas_participantes_write" on public.professor_feedback_respostas;
create policy "professor_feedback_respostas_participantes_write"
  on public.professor_feedback_respostas for all to authenticated
  using (
    exists (
      select 1
      from public.professor_feedback_ciclos c
      where c.id = professor_feedback_respostas.ciclo_id
        and c.aluno_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.professor_feedback_ciclos c
      where c.id = professor_feedback_respostas.ciclo_id
        and c.aluno_id = auth.uid()
    )
  );

drop policy if exists "professor_metricas_select_public_or_owner" on public.professor_metricas;
create policy "professor_metricas_select_public_or_owner"
  on public.professor_metricas for select to authenticated
  using (
    professor_id = auth.uid()
    or exists (
      select 1
      from public.professor_perfil pp
      where pp.usuario_id = professor_metricas.professor_id
        and pp.perfil_publicado = true
    )
  );

drop policy if exists "professor_metricas_owner_all" on public.professor_metricas;
create policy "professor_metricas_owner_all"
  on public.professor_metricas for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());

revoke all on function public.professor_criar_notificacao(uuid, text, text, bigint, uuid) from public;
grant execute on function public.professor_criar_notificacao(uuid, text, text, bigint, uuid) to authenticated;

revoke all on function public.professor_agendar_aula(bigint, timestamptz, timestamptz, text, integer, bigint, integer, text, text, text) from public;
grant execute on function public.professor_agendar_aula(bigint, timestamptz, timestamptz, text, integer, bigint, integer, text, text, text) to authenticated;

revoke all on function public.professor_cancelar_aula(bigint, text) from public;
grant execute on function public.professor_cancelar_aula(bigint, text) to authenticated;

revoke all on function public.professor_reagendar_aula(bigint, timestamptz, timestamptz) from public;
grant execute on function public.professor_reagendar_aula(bigint, timestamptz, timestamptz) to authenticated;

revoke all on function public.professor_abrir_feedbacks_mensal(smallint, smallint) from public;
grant execute on function public.professor_abrir_feedbacks_mensal(smallint, smallint) to authenticated;

revoke all on function public.professor_consolidar_metricas(uuid, bigint) from public;
grant execute on function public.professor_consolidar_metricas(uuid, bigint) to authenticated;
