alter table public.ei_financeiro_config
  add column if not exists asaas_pix_taxa_fixa_centavos int not null default 199,
  add column if not exists asaas_boleto_taxa_fixa_centavos int not null default 199,
  add column if not exists asaas_credito_taxa_percentual numeric(10, 6) not null default 0.0499,
  add column if not exists asaas_credito_taxa_fixa_centavos int not null default 0,
  add column if not exists asaas_debito_taxa_percentual numeric(10, 6) not null default 0.0299,
  add column if not exists asaas_debito_taxa_fixa_centavos int not null default 0,
  add column if not exists asaas_taxas_atualizadas_em timestamptz,
  add column if not exists asaas_taxas_fonte text not null default 'admin';

alter table public.espaco_transacoes
  add column if not exists asaas_billing_type text,
  add column if not exists asaas_net_value_centavos int,
  add column if not exists asaas_fee_centavos int;

update public.ei_financeiro_config
set
  plataforma_sobre_taxa_gateway = 0.5,
  professor_plataforma_sobre_taxa_gateway = 0.5,
  espaco_plataforma_sobre_taxa_gateway = 0.5
where id = 1;
