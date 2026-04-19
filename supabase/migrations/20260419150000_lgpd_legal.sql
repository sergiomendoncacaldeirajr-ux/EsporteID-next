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
