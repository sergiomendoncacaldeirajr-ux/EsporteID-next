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
