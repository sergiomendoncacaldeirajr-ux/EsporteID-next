-- Permite ligar "modo teste" de confirmação de pagamento pelo Admin (sem .env em produção).
alter table public.ei_financeiro_config
  add column if not exists asaas_simulacao_pagamentos_admin boolean not null default false;

comment on column public.ei_financeiro_config.asaas_simulacao_pagamentos_admin is
  'Quando true, donos de espaço podem simular webhook Asaas (Financeiro do espaço + API dev). Apenas admins alteram em Admin → Financeiro.';
