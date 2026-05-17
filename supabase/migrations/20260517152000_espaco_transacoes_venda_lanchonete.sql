alter table public.espaco_transacoes
  drop constraint if exists espaco_transacoes_tipo_ck;

alter table public.espaco_transacoes
  add constraint espaco_transacoes_tipo_ck check (
    tipo in ('mensalidade_socio', 'reserva_avulsa', 'taxa_adesao', 'mensalidade_plataforma_espaco', 'ajuste', 'comissao_professor', 'venda_lanchonete')
  );
