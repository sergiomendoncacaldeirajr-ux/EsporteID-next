alter table public.espacos_genericos
  add column if not exists associacao_regra_json jsonb not null default '{}'::jsonb;

alter table public.membership_requests
  add column if not exists identificador_tipo text,
  add column if not exists identificador_valor text,
  add column if not exists dados_json jsonb not null default '{}'::jsonb,
  add column if not exists mensagem text,
  add column if not exists plano_socio_id bigint references public.espaco_planos_socio (id) on delete set null;

comment on column public.espacos_genericos.associacao_regra_json is
  'Configuração pública de entrada de sócios (perfil, matrícula, CPF).';
comment on column public.membership_requests.identificador_tipo is
  'Tipo de identificação exigida na solicitação de entrada (matricula/cpf).';
