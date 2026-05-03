import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AgendaAceitosCancelaveis, type AceitosCancelaveisItem } from "@/components/agenda/agenda-aceitos-cancelaveis";
import { PartidaAgendaCard } from "@/components/agenda/partida-agenda-card";
import { userIsDesafioAgendaLeaderFromMap } from "@/lib/agenda/desafio-match-leadership";
import { loadAceitosCancelaveisItems } from "@/lib/agenda/load-aceitos-cancelaveis-items";
import {
  type AgendaPartidaCardRow,
  fetchPartidasAgendadasUsuario,
  fetchPartidasRelancamentoAposContestacao,
  fetchPlacarAguardandoConfirmacao,
  firstOfRelation,
  mergeAgendaLocalDisplayed,
  resolveCancelMatchIdParaCard,
} from "@/lib/agenda/partidas-usuario";
import { pickFormacaoLadoPartida } from "@/lib/agenda/partida-formacao-lado";
import { processarPendenciasAgendamentoAceite } from "@/lib/agenda/processar-pendencias-agendamento";
import {
  dueloKey,
  dueloKeyNoSport,
  mergeAgendaPartidasPorId,
  partidaPainelEhRelancamentoPosContestacao,
} from "./comunidade-shared";

export type ComunidadeStreamPartidasProps = {
  supabase: SupabaseClient;
  userId: string;
  comunidadeAgendaTeamIds: number[];
  comunidadeAgendaTeamClause: string;
  needPlacarAguardando: boolean;
  needAgendadaLaunch: boolean;
  needMatchAceitosGestao: boolean;
};

export async function ComunidadeStreamPartidas({
  supabase,
  userId,
  comunidadeAgendaTeamIds,
  comunidadeAgendaTeamClause,
  needPlacarAguardando,
  needAgendadaLaunch,
  needMatchAceitosGestao,
}: ComunidadeStreamPartidasProps) {
  const painelTeamIds = comunidadeAgendaTeamIds;
  const teamClausePainel = comunidadeAgendaTeamClause;
  const matchPainelOr =
    painelTeamIds.length > 0
      ? `usuario_id.eq.${userId},adversario_id.eq.${userId},desafiante_time_id.in.(${painelTeamIds.join(",")}),adversario_time_id.in.(${painelTeamIds.join(",")})`
      : `usuario_id.eq.${userId},adversario_id.eq.${userId}`;

  const needPainelMatchMeta = needAgendadaLaunch || needMatchAceitosGestao;

  if (needPainelMatchMeta) {
    await processarPendenciasAgendamentoAceite(supabase, userId, teamClausePainel);
  }

  const painelAgendadasPromise = needAgendadaLaunch
    ? Promise.all([
        fetchPartidasAgendadasUsuario(supabase, userId, teamClausePainel),
        fetchPartidasRelancamentoAposContestacao(supabase, userId, teamClausePainel),
      ]).then(([ag, rel]) => ({ data: mergeAgendaPartidasPorId(ag.data, rel.data) }))
    : Promise.resolve({ data: [] as AgendaPartidaCardRow[] | null });

  const painelPlacarPromise = needPlacarAguardando
    ? fetchPlacarAguardandoConfirmacao(supabase, userId, teamClausePainel)
    : Promise.resolve({ data: [] as AgendaPartidaCardRow[] | null });

  const painelMatchesMetaPromise = needPainelMatchMeta
    ? Promise.all([
        supabase
          .from("matches")
          .select(
            "id, usuario_id, adversario_id, esporte_id, status, reschedule_selected_option, scheduled_for, scheduled_location",
          )
          .or(matchPainelOr)
          .eq("finalidade", "ranking")
          .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente"]),
        supabase
          .from("matches")
          .select("id, usuario_id, adversario_id, esporte_id, status")
          .or(matchPainelOr)
          .eq("finalidade", "ranking")
          .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente", "Cancelado"])
          .order("id", { ascending: false })
          .limit(120),
      ])
    : Promise.resolve(null);

  const [agRes, plRes, metaPair] = await Promise.all([
    painelAgendadasPromise,
    painelPlacarPromise,
    painelMatchesMetaPromise,
  ]);

  const painelAgendadas = agRes.data;
  const painelPlacarFetch = plRes.data;
  const aceitosCancelaveisPainel = metaPair ? metaPair[0].data : null;
  const historicoCancelamentoPainelRows = metaPair ? metaPair[1].data : null;

  let painelAceitosCancelaveisItems: AceitosCancelaveisItem[] = [];
  if (needPainelMatchMeta) {
    const { items: painelAceitosLoaded } = await loadAceitosCancelaveisItems(
      supabase,
      userId,
      (painelAgendadas ?? []) as AgendaPartidaCardRow[],
    );
    painelAceitosCancelaveisItems = painelAceitosLoaded;
  }

  const painelPlacarPendenteBruto = painelPlacarFetch ?? [];

  const { data: painelPartidasStatusRows } = needAgendadaLaunch
    ? await supabase
        .from("partidas")
        .select("id, esporte_id, jogador1_id, jogador2_id, status, status_ranking, lancado_por")
        .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId},usuario_id.eq.${userId}${teamClausePainel}`)
        .in("status", ["agendada", "aguardando_confirmacao"])
        .order("id", { ascending: false })
        .limit(120)
    : { data: [] };
  const painelPartidasAll = [...(painelAgendadas ?? []), ...painelPlacarPendenteBruto];
  const painelTimeIdsSet = new Set<number>();
  for (const p of painelPartidasAll) {
    const r = p as AgendaPartidaCardRow;
    for (const t of [r.time1_id, r.time2_id]) {
      const n = Number(t);
      if (Number.isFinite(n) && n > 0) painelTimeIdsSet.add(n);
    }
  }
  const painelTimeIds = [...painelTimeIdsSet];
  const { data: painelTimesRows } = painelTimeIds.length
    ? await supabase.from("times").select("id, nome, escudo, eid_time, criador_id").in("id", painelTimeIds)
    : { data: [] };
  const painelTimesById = new Map<number, { nome: string | null; escudo: string | null; eid_time: number | null }>();
  const criadorPorTimePainel = new Map<number, string>();
  for (const t of painelTimesRows ?? []) {
    const id = Number((t as { id: number }).id);
    if (!Number.isFinite(id) || id <= 0) continue;
    painelTimesById.set(id, {
      nome: (t as { nome?: string | null }).nome ?? null,
      escudo: (t as { escudo?: string | null }).escudo ?? null,
      eid_time: (t as { eid_time?: number | null }).eid_time ?? null,
    });
    const cid = String((t as { criador_id?: string | null }).criador_id ?? "").trim();
    if (cid) criadorPorTimePainel.set(id, cid);
  }
  const usuarioPodeGerenciarPartidaPainel = (row: AgendaPartidaCardRow) =>
    userIsDesafioAgendaLeaderFromMap(
      userId,
      {
        usuario_id: row.jogador1_id,
        adversario_id: row.jogador2_id,
        desafiante_time_id: row.time1_id ?? null,
        adversario_time_id: row.time2_id ?? null,
        modalidade_confronto: row.modalidade ?? null,
      },
      criadorPorTimePainel,
    );
  const painelPlacarPendente = painelPlacarPendenteBruto.filter((row) =>
    usuarioPodeGerenciarPartidaPainel(row as AgendaPartidaCardRow),
  );
  const painelLocalIds = [
    ...new Set(
      painelPartidasAll.map((p) => p.local_espaco_id).filter((x): x is number => typeof x === "number" && x > 0),
    ),
  ];
  const { data: painelLocaisRows } = painelLocalIds.length
    ? await supabase.from("espacos_genericos").select("id, nome_publico").in("id", painelLocalIds)
    : { data: [] };
  const painelLocMap = new Map((painelLocaisRows ?? []).map((l) => [l.id, l.nome_publico]));
  const painelPlayerIds = new Set<string>();
  for (const p of painelPartidasAll) {
    if (p.jogador1_id) painelPlayerIds.add(p.jogador1_id);
    if (p.jogador2_id) painelPlayerIds.add(p.jogador2_id);
  }
  const painelPlayerList = [...painelPlayerIds];
  const { data: painelNomeRows } = painelPlayerList.length
    ? await supabase.from("profiles").select("id, nome, avatar_url").in("id", painelPlayerList)
    : { data: [] };
  const painelPerfilMap = new Map((painelNomeRows ?? []).map((r) => [r.id, r]));
  const painelNomeMap = new Map((painelNomeRows ?? []).map((r) => [r.id, r.nome]));
  const painelEsporteIds = [
    ...new Set(
      painelPartidasAll
        .map((p) => Number((p as { esporte_id?: number | null }).esporte_id ?? 0))
        .filter((v) => Number.isFinite(v) && v > 0),
    ),
  ];
  const { data: painelUeRows } = painelPlayerList.length && painelEsporteIds.length
    ? await supabase
        .from("usuario_eid")
        .select("usuario_id, esporte_id, nota_eid")
        .in("usuario_id", painelPlayerList)
        .in("esporte_id", painelEsporteIds)
    : { data: [] };
  const painelNotaEidByUserSport = new Map(
    (painelUeRows ?? []).map((r) => [`${String(r.usuario_id)}:${Number(r.esporte_id)}`, Number(r.nota_eid ?? 0)]),
  );

  const partidaMaisRecentePorDueloPainel = new Map<
    string,
    { status: string | null; status_ranking: string | null; lancado_por: string | null }
  >();
  const partidaMaisRecentePorDueloPainelNoSport = new Map<
    string,
    { status: string | null; status_ranking: string | null; lancado_por: string | null }
  >();
  for (const row of painelPartidasStatusRows ?? []) {
    const key = dueloKey(
      (row as { jogador1_id?: string | null }).jogador1_id ?? null,
      (row as { jogador2_id?: string | null }).jogador2_id ?? null,
      Number((row as { esporte_id?: number | null }).esporte_id ?? 0),
    );
    const meta = {
      status: (row as { status?: string | null }).status ?? null,
      status_ranking: (row as { status_ranking?: string | null }).status_ranking ?? null,
      lancado_por: (row as { lancado_por?: string | null }).lancado_por ?? null,
    };
    if (key && !partidaMaisRecentePorDueloPainel.has(key)) {
      partidaMaisRecentePorDueloPainel.set(key, meta);
    }
    const keyNoSport = dueloKeyNoSport(
      (row as { jogador1_id?: string | null }).jogador1_id ?? null,
      (row as { jogador2_id?: string | null }).jogador2_id ?? null,
    );
    if (keyNoSport && !partidaMaisRecentePorDueloPainelNoSport.has(keyNoSport)) {
      partidaMaisRecentePorDueloPainelNoSport.set(keyNoSport, meta);
    }
  }

  const cancelMatchIdByDueloPainel = new Map<string, number>();
  const cancelMatchIdByMatchIdPainel = new Map<number, number>();
  const rescheduleAcceptedMatchIdSetPainel = new Set<number>();
  const rescheduleAcceptedByDueloPainel = new Set<string>();
  const blockedDueloByCancelFlowPainel = new Set<string>();
  const blockedMatchIdsByCancelFlowPainel = new Set<number>();
  let painelAcceptedScheduleByMatchId = new Map<
    number,
    { scheduledFor: string | null; scheduledLocation: string | null }
  >();

  for (const m of aceitosCancelaveisPainel ?? []) {
    const mid = Number(m.id);
    const st = String(m.status ?? "");
    if (st === "CancelamentoPendente" || st === "ReagendamentoPendente") {
      if (Number.isFinite(mid) && mid > 0) blockedMatchIdsByCancelFlowPainel.add(mid);
    }
    const key = dueloKey(m.usuario_id, m.adversario_id, Number(m.esporte_id ?? 0));
    if (key && (st === "CancelamentoPendente" || st === "ReagendamentoPendente")) {
      blockedDueloByCancelFlowPainel.add(key);
    }
    if (st === "Aceito" && Number.isFinite(mid) && mid > 0) {
      cancelMatchIdByMatchIdPainel.set(mid, mid);
      if (key) cancelMatchIdByDueloPainel.set(key, mid);
      const selected = Number((m as { reschedule_selected_option?: number | null }).reschedule_selected_option ?? 0);
      const sfRaw = (m as { scheduled_for?: string | null }).scheduled_for;
      const slRaw = (m as { scheduled_location?: string | null }).scheduled_location;
      const scheduledFor = sfRaw ? String(sfRaw) : null;
      const scheduledLocation = slRaw && String(slRaw).trim() ? String(slRaw).trim() : null;
      if (Number.isFinite(selected) && selected > 0) {
        rescheduleAcceptedMatchIdSetPainel.add(mid);
        if (key) rescheduleAcceptedByDueloPainel.add(key);
      }
      if (selected > 0 || scheduledFor || scheduledLocation) {
        painelAcceptedScheduleByMatchId.set(mid, { scheduledFor, scheduledLocation });
      }
    }
  }
  const latestStatusByDueloPainel = new Map<string, string>();
  for (const m of historicoCancelamentoPainelRows ?? []) {
    const key = dueloKey(
      (m as { usuario_id?: string | null }).usuario_id ?? null,
      (m as { adversario_id?: string | null }).adversario_id ?? null,
      Number((m as { esporte_id?: number | null }).esporte_id ?? 0),
    );
    if (!key || latestStatusByDueloPainel.has(key)) continue;
    latestStatusByDueloPainel.set(key, String((m as { status?: string | null }).status ?? "").trim());
  }
  const painelAgendadasVisiveis = (painelAgendadas ?? [])
    .filter((row) => {
      const stRow = String((row as { status?: string | null }).status ?? "")
        .trim()
        .toLowerCase();
      const relaunchRow = partidaPainelEhRelancamentoPosContestacao(row as AgendaPartidaCardRow, userId);
      if (stRow !== "agendada" && !relaunchRow) return false;
      const midRow = Number((row as AgendaPartidaCardRow).match_id ?? 0);
      if (Number.isFinite(midRow) && midRow > 0 && blockedMatchIdsByCancelFlowPainel.has(midRow)) return false;
      const esporteIdCard = Number((row as { esporte_id?: number | null }).esporte_id ?? 0);
      const key = dueloKey(row.jogador1_id, row.jogador2_id, esporteIdCard);
      const keyNoSport = dueloKeyNoSport(row.jogador1_id, row.jogador2_id);
      const meta =
        (key ? partidaMaisRecentePorDueloPainel.get(key) ?? null : null) ??
        (keyNoSport ? partidaMaisRecentePorDueloPainelNoSport.get(keyNoSport) ?? null : null);
      const rowStatusRanking = String(
        meta?.status_ranking ?? (row as { status_ranking?: string | null }).status_ranking ?? "",
      )
        .trim()
        .toLowerCase();
      const rowLancadoPor = String(meta?.lancado_por ?? (row as { lancado_por?: string | null }).lancado_por ?? "").trim();
      const isContestadoLegacy =
        rowStatusRanking === "contestado" ||
        rowStatusRanking === "resultado_contestado" ||
        rowStatusRanking === "pendente_confirmacao_revisao" ||
        rowStatusRanking === "em_analise_admin";
      if (isContestadoLegacy) {
        if (!rowLancadoPor) return false;
        if (rowLancadoPor !== userId) return false;
      }
      if (rowStatusRanking === "em_analise_admin") {
        return false;
      }
      if (!key) return true;
      if (blockedDueloByCancelFlowPainel.has(key)) return false;
      const latestStatus = String(latestStatusByDueloPainel.get(key) ?? "").toLowerCase();
      if (latestStatus === "cancelado") return false;
      return true;
    })
    .filter((row) => usuarioPodeGerenciarPartidaPainel(row as AgendaPartidaCardRow));

  const hasPartidasAcoes =
    painelPlacarPendente.length > 0 ||
    painelAgendadasVisiveis.length > 0 ||
    painelAceitosCancelaveisItems.length > 0;

  if (!hasPartidasAcoes) return null;

  return (
    <>
      {painelAceitosCancelaveisItems.length > 0 ? (
        <div id="desafios-aceitos-gestao" className="scroll-mt-4 md:scroll-mt-6">
          <AgendaAceitosCancelaveis items={painelAceitosCancelaveisItems} cadastrarLocalReturnBase="/comunidade" />
        </div>
      ) : null}
      {painelPlacarPendente.length > 0 || painelAgendadasVisiveis.length > 0 ? (
        <section
          id="resultados-partida"
          className="eid-list-item overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-0 md:p-0"
        >
          <div className="flex items-center justify-between gap-2 border-b border-transparent bg-eid-surface/40 px-3 py-2.5 md:px-4">
            <div>
              <h2 className="text-[12px] font-black tracking-tight text-eid-fg">Partidas e resultados</h2>
              <p className="mt-0.5 hidden text-[11px] text-eid-text-secondary md:block">
                Lançamento de placar, revisão e confirmação. Cancelamento ou nova data em desafio aceito fica em{" "}
                <strong className="text-eid-fg">Desafios aceitos</strong> (neste painel, quando houver). Na{" "}
                <Link href="/agenda" className="font-semibold text-eid-primary-300 hover:underline">
                  Agenda
                </Link>{" "}
                você vê só <strong className="text-eid-fg">data e local</strong> como referência.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-eid-action-500/30 bg-eid-action-500/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.05em] text-eid-action-400">
              Fluxo de placar
            </span>
          </div>

          <div className="px-3 py-3 md:px-4 md:py-4">
            <div className="space-y-6">
              {(painelPlacarPendente ?? []).length > 0 ? (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-eid-action-400">Placar aguardando você</h3>
                  <div className="mt-4 space-y-4">
                    {(painelPlacarPendente ?? []).map((row) => {
                      const esp = firstOfRelation(row.esportes);
                      const pr = row as AgendaPartidaCardRow;
                      const esporteIdCard = Number((row as { esporte_id?: number | null }).esporte_id ?? 0);
                      const midPartida = Number(pr.match_id ?? 0);
                      const sched =
                        Number.isFinite(midPartida) && midPartida > 0
                          ? painelAcceptedScheduleByMatchId.get(midPartida) ?? null
                          : null;
                      return (
                        <PartidaAgendaCard
                          key={pr.id}
                          id={pr.id}
                          esporteNome={esp?.nome ?? "Esporte"}
                          j1Nome={pr.jogador1_id ? painelNomeMap.get(pr.jogador1_id) ?? null : null}
                          j2Nome={pr.jogador2_id ? painelNomeMap.get(pr.jogador2_id) ?? null : null}
                          j1Id={pr.jogador1_id}
                          j2Id={pr.jogador2_id}
                          j1AvatarUrl={pr.jogador1_id ? painelPerfilMap.get(pr.jogador1_id)?.avatar_url ?? null : null}
                          j2AvatarUrl={pr.jogador2_id ? painelPerfilMap.get(pr.jogador2_id)?.avatar_url ?? null : null}
                          j1NotaEid={pr.jogador1_id ? painelNotaEidByUserSport.get(`${pr.jogador1_id}:${esporteIdCard}`) ?? 0 : 0}
                          j2NotaEid={pr.jogador2_id ? painelNotaEidByUserSport.get(`${pr.jogador2_id}:${esporteIdCard}`) ?? 0 : 0}
                          formacaoJ1={pickFormacaoLadoPartida(pr, 1, painelTimesById)}
                          formacaoJ2={pickFormacaoLadoPartida(pr, 2, painelTimesById)}
                          esporteId={esporteIdCard}
                          dataRef={sched?.scheduledFor ?? pr.data_partida ?? pr.data_registro}
                          localLabel={mergeAgendaLocalDisplayed(
                            sched?.scheduledLocation,
                            pr.local_str,
                            pr.local_espaco_id,
                            pr.local_espaco_id ? painelLocMap.get(pr.local_espaco_id) ?? null : null,
                          )}
                          variant="placar"
                          ctaFullscreen
                          href={`/registrar-placar/${pr.id}?from=/comunidade`}
                          ctaLabel="Revisar resultado"
                          perfilEidFrom="/comunidade"
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {painelAgendadasVisiveis.length > 0 ? (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-eid-primary-400">Lançar resultado</h3>
                  <p className="mt-1 text-xs text-eid-text-secondary">
                    Partidas agendadas em que você pode enviar o placar após o jogo.
                  </p>
                  <div className="mt-4 space-y-4">
                    {painelAgendadasVisiveis.map((row) => {
                      const esp = firstOfRelation(row.esportes);
                      const pr = row as AgendaPartidaCardRow;
                      const esporteIdCard = Number((row as { esporte_id?: number | null }).esporte_id ?? 0);
                      const dueloKeyCard = dueloKey(pr.jogador1_id, pr.jogador2_id, esporteIdCard);
                      const midPartida = Number(pr.match_id ?? 0);
                      const sched =
                        Number.isFinite(midPartida) && midPartida > 0
                          ? painelAcceptedScheduleByMatchId.get(midPartida) ?? null
                          : null;
                      const cancelMatchIdResolved = resolveCancelMatchIdParaCard(
                        pr,
                        cancelMatchIdByMatchIdPainel,
                        cancelMatchIdByDueloPainel,
                        dueloKeyCard,
                      );
                      const rescheduleAceito =
                        (Number.isFinite(midPartida) && midPartida > 0 && rescheduleAcceptedMatchIdSetPainel.has(midPartida)) ||
                        (dueloKeyCard ? rescheduleAcceptedByDueloPainel.has(dueloKeyCard) : false);
                      return (
                        <PartidaAgendaCard
                          key={pr.id}
                          id={pr.id}
                          esporteNome={esp?.nome ?? "Esporte"}
                          j1Nome={pr.jogador1_id ? painelNomeMap.get(pr.jogador1_id) ?? null : null}
                          j2Nome={pr.jogador2_id ? painelNomeMap.get(pr.jogador2_id) ?? null : null}
                          j1Id={pr.jogador1_id}
                          j2Id={pr.jogador2_id}
                          j1AvatarUrl={pr.jogador1_id ? painelPerfilMap.get(pr.jogador1_id)?.avatar_url ?? null : null}
                          j2AvatarUrl={pr.jogador2_id ? painelPerfilMap.get(pr.jogador2_id)?.avatar_url ?? null : null}
                          j1NotaEid={pr.jogador1_id ? painelNotaEidByUserSport.get(`${pr.jogador1_id}:${esporteIdCard}`) ?? 0 : 0}
                          j2NotaEid={pr.jogador2_id ? painelNotaEidByUserSport.get(`${pr.jogador2_id}:${esporteIdCard}`) ?? 0 : 0}
                          formacaoJ1={pickFormacaoLadoPartida(pr, 1, painelTimesById)}
                          formacaoJ2={pickFormacaoLadoPartida(pr, 2, painelTimesById)}
                          esporteId={esporteIdCard}
                          dataRef={sched?.scheduledFor ?? pr.data_partida ?? pr.data_registro}
                          localLabel={mergeAgendaLocalDisplayed(
                            sched?.scheduledLocation,
                            pr.local_str,
                            pr.local_espaco_id,
                            pr.local_espaco_id ? painelLocMap.get(pr.local_espaco_id) ?? null : null,
                          )}
                          variant="agendada"
                          ctaFullscreen
                          cancelMatchId={cancelMatchIdResolved}
                          desistMatchId={rescheduleAceito ? cancelMatchIdResolved : null}
                          href={`/registrar-placar/${pr.id}?from=/comunidade`}
                          ctaLabel={
                            partidaPainelEhRelancamentoPosContestacao(pr, userId)
                              ? "Enviar resultado contestado"
                              : "Lançar resultado"
                          }
                          perfilEidFrom="/comunidade"
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
