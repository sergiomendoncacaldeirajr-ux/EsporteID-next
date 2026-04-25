alter table public.ei_financeiro_config
  add column if not exists espaco_trial_dias_default int not null default 30,
  add column if not exists espaco_socio_comissao_percentual numeric(8, 6) not null default 0.05,
  add column if not exists espaco_clube_assinatura_comissao_percentual numeric(8, 6) not null default 0.05;

alter table public.espaco_assinaturas_plataforma
  add column if not exists trial_dias_override int,
  add column if not exists isento_total boolean not null default false;

alter table public.espacos_genericos
  add column if not exists clube_assinaturas_socios text not null default 'em_breve';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'espacos_genericos_clube_assinaturas_socios_ck'
  ) then
    alter table public.espacos_genericos
      add constraint espacos_genericos_clube_assinaturas_socios_ck
      check (clube_assinaturas_socios in ('off', 'em_breve', 'on'));
  end if;
end $$;

comment on column public.ei_financeiro_config.espaco_trial_dias_default is
  'Dias de mês grátis padrão para novos espaços.';
comment on column public.ei_financeiro_config.espaco_socio_comissao_percentual is
  'Comissão da plataforma sobre mensalidade de sócio (modo futuro).';
comment on column public.ei_financeiro_config.espaco_clube_assinatura_comissao_percentual is
  'Comissão da plataforma sobre clube de assinaturas entre sócios (modo futuro).';
comment on column public.espaco_assinaturas_plataforma.trial_dias_override is
  'Override de dias gratuitos por espaço.';
comment on column public.espaco_assinaturas_plataforma.isento_total is
  'Quando true, espaço fica sem cobrança da mensalidade da plataforma.';
comment on column public.espacos_genericos.clube_assinaturas_socios is
  'Modo do clube de assinaturas opcional do espaço (off/em_breve/on).';
