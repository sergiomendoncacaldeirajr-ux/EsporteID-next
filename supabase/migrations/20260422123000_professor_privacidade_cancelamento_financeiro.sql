alter table public.professor_perfil
  add column if not exists whatsapp_visibilidade text not null default 'publico';

alter table public.professor_perfil
  drop constraint if exists professor_perfil_whatsapp_visibilidade_ck;

alter table public.professor_perfil
  add constraint professor_perfil_whatsapp_visibilidade_ck
  check (whatsapp_visibilidade in ('publico', 'alunos_aceitos_ou_com_aula', 'oculto'));

alter table public.professor_aula_alunos
  add column if not exists origem_cancelamento text,
  add column if not exists cancelado_por uuid references public.profiles (id) on delete set null,
  add column if not exists cancelado_em timestamptz,
  add column if not exists motivo_cancelamento text,
  add column if not exists taxa_cancelamento_centavos integer not null default 0;

alter table public.professor_aula_alunos
  drop constraint if exists professor_aula_alunos_origem_cancelamento_ck;

alter table public.professor_aula_alunos
  add constraint professor_aula_alunos_origem_cancelamento_ck
  check (origem_cancelamento is null or origem_cancelamento in ('professor', 'aluno', 'sistema'));

alter table public.professor_aula_alunos
  drop constraint if exists professor_aula_alunos_taxa_cancelamento_ck;

alter table public.professor_aula_alunos
  add constraint professor_aula_alunos_taxa_cancelamento_ck
  check (taxa_cancelamento_centavos >= 0);

alter table public.ei_financeiro_config
  add column if not exists professor_taxa_fixa numeric(10, 2) not null default 0,
  add column if not exists professor_taxa_fixa_promo numeric(10, 2) not null default 0,
  add column if not exists professor_plataforma_sobre_taxa_gateway numeric(8, 6) not null default 0.5,
  add column if not exists professor_plataforma_sobre_taxa_gateway_promo numeric(8, 6) not null default 0.2,
  add column if not exists professor_promocao_ativa boolean not null default false,
  add column if not exists professor_promocao_ate timestamptz,
  add column if not exists espaco_taxa_fixa numeric(10, 2) not null default 0,
  add column if not exists espaco_taxa_fixa_promo numeric(10, 2) not null default 0,
  add column if not exists espaco_plataforma_sobre_taxa_gateway numeric(8, 6) not null default 0.5,
  add column if not exists espaco_plataforma_sobre_taxa_gateway_promo numeric(8, 6) not null default 0.2,
  add column if not exists espaco_promocao_ativa boolean not null default false,
  add column if not exists espaco_promocao_ate timestamptz,
  add column if not exists torneio_promocao_ativa boolean not null default false,
  add column if not exists torneio_promocao_ate timestamptz;
