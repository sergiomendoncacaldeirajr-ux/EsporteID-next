-- Modo teste de pagamento por domínio (Admin → Financeiro).
alter table public.ei_financeiro_config
  add column if not exists asaas_simulacao_locais boolean not null default false,
  add column if not exists asaas_simulacao_professores boolean not null default false,
  add column if not exists asaas_simulacao_torneios boolean not null default false;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ei_financeiro_config'
      and column_name = 'asaas_simulacao_pagamentos_admin'
  ) then
    update public.ei_financeiro_config
    set asaas_simulacao_locais = coalesce(asaas_simulacao_pagamentos_admin, false)
    where id = 1;
    alter table public.ei_financeiro_config drop column asaas_simulacao_pagamentos_admin;
  end if;
end $$;

comment on column public.ei_financeiro_config.asaas_simulacao_locais is
  'Modo teste: simular confirmação Asaas em locais / espaços (Financeiro do espaço).';
comment on column public.ei_financeiro_config.asaas_simulacao_professores is
  'Modo teste: simular confirmação em cobranças de professor.';
comment on column public.ei_financeiro_config.asaas_simulacao_torneios is
  'Modo teste: organizador simula pagamento de inscrição no torneio.';
