-- Mensalidade plataforma por categoria, tolerância de atraso e override por espaço.
-- Integração Asaas continua via variáveis de ambiente (API key = conta de destino).

alter table public.espacos_genericos
  add column if not exists categoria_mensalidade text not null default 'outro';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'espacos_genericos_categoria_mensalidade_ck'
  ) then
    alter table public.espacos_genericos
      add constraint espacos_genericos_categoria_mensalidade_ck
      check (categoria_mensalidade in ('clube', 'condominio', 'centro_esportivo', 'quadra', 'outro'));
  end if;
end $$;

alter table public.ei_financeiro_config
  add column if not exists espaco_mensalidade_valor_clube_brl numeric(10, 2) not null default 99.90,
  add column if not exists espaco_mensalidade_valor_condominio_brl numeric(10, 2) not null default 49.90,
  add column if not exists espaco_mensalidade_valor_centro_brl numeric(10, 2) not null default 149.90,
  add column if not exists espaco_mensalidade_valor_quadra_brl numeric(10, 2) not null default 79.90,
  add column if not exists espaco_mensalidade_valor_outro_brl numeric(10, 2) not null default 99.90,
  add column if not exists espaco_mensalidade_dias_aviso_antes int not null default 7,
  add column if not exists espaco_mensalidade_dias_bloqueio_apos int not null default 10;

alter table public.espaco_assinaturas_plataforma
  add column if not exists situacao_override text,
  add column if not exists observacoes_admin text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'espaco_assinaturas_situacao_override_ck'
  ) then
    alter table public.espaco_assinaturas_plataforma
      add constraint espaco_assinaturas_situacao_override_ck
      check (situacao_override is null or situacao_override in ('isento', 'forcar_bloqueio'));
  end if;
end $$;
