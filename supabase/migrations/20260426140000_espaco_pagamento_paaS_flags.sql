-- Regras PaaS: liberação manual sem gateway, 1º pagamento recorrente, sinal de suspeita (fraude mista)

alter table public.espacos_genericos
  add column if not exists paas_aprovado_operacao_sem_gateway boolean not null default false,
  add column if not exists paas_primeiro_pagamento_mensal_recebido_em timestamptz,
  add column if not exists operacao_suspeita_somente_reservas_gratis boolean not null default false,
  add column if not exists operacao_suspeita_observacao text;

comment on column public.espacos_genericos.paas_aprovado_operacao_sem_gateway is
  'Admin: liberar agendamento/grade sem nenhum pagamento pelo gateway (bypass regra reserva gratuita).';
comment on column public.espacos_genericos.paas_primeiro_pagamento_mensal_recebido_em is
  'Primeiro pagamento recebido (Asaas) da mensalidade PaaS — requisito em modo de reservas 100% gratuitas.';
comment on column public.espacos_genericos.operacao_suspeita_somente_reservas_gratis is
  'Alerta: modo mista com +15 dias, só reservas gratuitas e nenhuma paga — risco de fraude.';

create index if not exists idx_eg_ownership_misto
  on public.espacos_genericos (ownership_status, modo_reserva, ownership_verificado_em)
  where ownership_status = 'verificado' and modo_reserva = 'mista';
-- ownership_verificado_em: exists from prior migration; if missing, use criado_em in app
