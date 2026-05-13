alter table public.ei_financeiro_config
  add column if not exists espaco_reserva_comissao_percentual numeric not null default 0;

comment on column public.ei_financeiro_config.espaco_reserva_comissao_percentual is
  'Comissão percentual da plataforma sobre reservas pagas de espaços. Decimal: 0.05 = 5%.';
