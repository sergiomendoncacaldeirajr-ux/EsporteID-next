-- Correção do recalcular_eid_historico:
--
-- Problema 1: o UPDATE em massa em `partidas` (eid_processado_em = null) disparava
-- o trigger tr_partidas_processar_eid para cada linha — reprocessando tudo pelo trigger
-- e depois novamente no loop com force=true, dobrando o trabalho e estouro de timeout.
--
-- Problema 2: ranking_match_pontos_em não era zerado → pontos de ranking nunca
-- eram recalculados pelo recálculo completo. Idem para pontos_ranking de atletas/times.
--
-- Solução: GUC por-transação `app.eid_bulk_reset` para suprimir o trigger durante o
-- reset em massa; depois loop único com processar + aplicar_pontos.

-- 1. Trigger passa a ignorar disparos durante o reset em massa.
create or replace function public.tr_partidas_processar_eid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- Suprimido durante recalcular_eid_historico para evitar duplo processamento.
  if coalesce(current_setting('app.eid_bulk_reset', true), '0') = '1' then
    return new;
  end if;

  if new.eid_processado_em is not null then
    return new;
  end if;

  if not public.eid_status_finalizado(new.status) then
    return new;
  end if;

  perform public.processar_eid_partida_by_id(new.id, false);
  perform public.aplicar_pontos_ranking_match_desafio(new.id);
  return new;
end;
$$;

-- 2. recalcular_eid_historico reescrita: suprime trigger, zera tudo inclusive
--    ranking_match_pontos_em / pontos_ranking, e chama os dois processadores no loop.
create or replace function public.recalcular_eid_historico()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_partida_id bigint;
begin
  -- Suprime o trigger durante o reset em massa (evita duplo processamento).
  perform set_config('app.eid_bulk_reset', '1', true);

  delete from public.eid_logs;
  delete from public.historico_eid;
  delete from public.historico_eid_coletivo;

  update public.usuario_eid
  set
    nota_eid = 0.00,
    vitorias = 0,
    derrotas = 0,
    partidas_jogadas = 0,
    pontos_ranking = 0;

  update public.times
  set
    eid_time = 0.00,
    pontos_ranking = 0,
    vitorias = 0,
    derrotas = 0;

  update public.partidas
  set
    impacto_eid_1 = null,
    impacto_eid_2 = null,
    eid_processado_em = null,
    eid_transbordo_processado_em = null,
    ranking_match_pontos_em = null;

  -- Reativa trigger para o loop de reprocessamento.
  perform set_config('app.eid_bulk_reset', '0', true);

  for v_partida_id in
    select p.id
    from public.partidas p
    where public.eid_status_finalizado(p.status)
    order by coalesce(p.data_resultado, p.data_partida, p.data_registro, p.criado_em, now()) asc, p.id asc
  loop
    if public.processar_eid_partida_by_id(v_partida_id, true) then
      v_count := v_count + 1;
    end if;
    perform public.aplicar_pontos_ranking_match_desafio(v_partida_id);
  end loop;

  return v_count;
end;
$$;

revoke all on function public.tr_partidas_processar_eid() from public;
revoke all on function public.recalcular_eid_historico() from public;
grant execute on function public.recalcular_eid_historico() to service_role;
