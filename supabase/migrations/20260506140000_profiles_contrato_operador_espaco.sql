-- Aceite do contrato de operador de espaço (onboarding / envio à análise).

alter table public.profiles
  add column if not exists contrato_operador_espaco_versao text;

alter table public.profiles
  add column if not exists contrato_operador_espaco_aceito_em timestamptz;

comment on column public.profiles.contrato_operador_espaco_versao is
  'Versão do contrato de operador de espaço aceita (alinhar a lib/legal/versions).';

comment on column public.profiles.contrato_operador_espaco_aceito_em is
  'Data/hora do aceite do contrato de operador de espaço no onboarding.';
