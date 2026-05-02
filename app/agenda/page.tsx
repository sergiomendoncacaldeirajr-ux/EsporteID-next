import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AgendaBackgroundSync } from "@/components/agenda/agenda-background-sync";
import { AgendaAceitosCancelaveis } from "@/components/agenda/agenda-aceitos-cancelaveis";
import { PartidaAgendaCard } from "@/components/agenda/partida-agenda-card";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import { EidCityState } from "@/components/ui/eid-city-state";
import { userIsDesafioAgendaLeaderFromMap } from "@/lib/agenda/desafio-match-leadership";
import { loadAceitosCancelaveisItems } from "@/lib/agenda/load-aceitos-cancelaveis-items";
import {
  type AgendaPartidaCardRow,
  computeAgendaPodeResponderProposta,
  fetchPartidasAgendadasUsuario,
  firstOfRelation,
  getAgendaTeamContext,
  resolveCancelMatchIdParaCard,
} from "@/lib/agenda/partidas-usuario";
import { processarPendenciasAgendamentoAceite } from "@/lib/agenda/processar-pendencias-agendamento";
import { pickFormacaoLadoPartida } from "@/lib/agenda/partida-formacao-lado";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Agenda",
  description: "Jogos agendados e lembretes no EsporteID",
};

export default async function AgendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/agenda");

  const { data: profile } = await supabase
    .from("profiles")
    .select(`perfil_completo, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`)
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !legalAcceptanceIsCurrent(profile)) redirect("/conta/aceitar-termos");
  if (!profile.perfil_completo) redirect("/onboarding");

  const { teamIds: agendaTeamIds, teamClause } = await getAgendaTeamContext(supabase, user.id);
  const matchAceitosOr =
    agendaTeamIds.length > 0
      ? `usuario_id.eq.${user.id},adversario_id.eq.${user.id},desafiante_time_id.in.(${agendaTeamIds.join(",")}),adversario_time_id.in.(${agendaTeamIds.join(",")})`
      : `usuario_id.eq.${user.id},adversario_id.eq.${user.id}`;
  await processarPendenciasAgendamentoAceite(supabase, user.id, teamClause);

  const { data: partidasAgendadas } = await fetchPartidasAgendadasUsuario(supabase, user.id, teamClause);

  const allLocalIds = [
    ...new Set(
      (partidasAgendadas ?? [])
        .map((p) => p.local_espaco_id)
        .filter((x): x is number => typeof x === "number" && x > 0)
    ),
  ];
  const { data: locaisRows } = allLocalIds.length
    ? await supabase.from("espacos_genericos").select("id, nome_publico").in("id", allLocalIds)
    : { data: [] };
  const locMap = new Map((locaisRows ?? []).map((l) => [l.id, l.nome_publico]));

  const allPlayerIds = new Set<string>();
  for (const p of partidasAgendadas ?? []) {
    if (p.jogador1_id) allPlayerIds.add(p.jogador1_id);
    if (p.jogador2_id) allPlayerIds.add(p.jogador2_id);
  }
  const playerList = [...allPlayerIds];
  const { data: nomeRows } = playerList.length
    ? await supabase.from("profiles").select("id, nome, avatar_url").in("id", playerList)
    : { data: [] };
  const perfilMap = new Map((nomeRows ?? []).map((r) => [r.id, r]));
  const nomeMap = new Map((nomeRows ?? []).map((r) => [r.id, r.nome]));

  const esporteIdsPartidas = [
    ...new Set(
      (partidasAgendadas ?? [])
        .map((p) => Number((p as { esporte_id?: number | null }).esporte_id ?? 0))
        .filter((v) => Number.isFinite(v) && v > 0)
    ),
  ];
  const { data: ueRows } = playerList.length && esporteIdsPartidas.length
    ? await supabase
        .from("usuario_eid")
        .select("usuario_id, esporte_id, nota_eid")
        .in("usuario_id", playerList)
        .in("esporte_id", esporteIdsPartidas)
    : { data: [] };
  const notaEidByUserSport = new Map(
    (ueRows ?? []).map((r) => [`${String(r.usuario_id)}:${Number(r.esporte_id)}`, Number(r.nota_eid ?? 0)])
  );

  const { data: pendentesEnvio } = await supabase
    .from("matches")
    .select("id, status, modalidade_confronto, data_solicitacao, data_registro, adversario_id, esporte_id")
    .eq("usuario_id", user.id)
    .eq("status", "Pendente")
    .order("data_registro", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(20);

  const { data: pendentesRankingElencoRows } = await supabase
    .from("matches")
    .select(
      "id, usuario_id, adversario_id, desafiante_time_id, adversario_time_id, esporte_id, modalidade_confronto, data_solicitacao, data_registro"
    )
    .eq("status", "Pendente")
    .eq("finalidade", "ranking")
    .in("modalidade_confronto", ["dupla", "time"])
    .or(matchAceitosOr)
    .order("data_registro", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(20);

  /** Elenco (não o líder desafiante): acompanhar pedido na Agenda; capitão adversário também entra aqui. */
  const pendentesRankingStatus = (pendentesRankingElencoRows ?? []).filter((m) => m.usuario_id !== user.id);

  const pendentesRankingTimeIds = [
    ...new Set(
      (pendentesRankingStatus ?? [])
        .flatMap((m) => [m.desafiante_time_id, m.adversario_time_id])
        .map((x) => Number(x ?? 0))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];
  const { data: timesPendentesRanking } = pendentesRankingTimeIds.length
    ? await supabase.from("times").select("id, nome").in("id", pendentesRankingTimeIds)
    : { data: [] };
  const nomeTimePendenteById = new Map((timesPendentesRanking ?? []).map((t) => [Number(t.id), String(t.nome ?? "").trim() || "Formação"]));

  const eidsPendenteRanking = [
    ...new Set(
      (pendentesRankingStatus ?? [])
        .map((m) => Number(m.esporte_id ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
  const { data: esportesPendenteRanking } = eidsPendenteRanking.length
    ? await supabase.from("esportes").select("id, nome").in("id", eidsPendenteRanking)
    : { data: [] };
  const espNomePendenteById = new Map((esportesPendenteRanking ?? []).map((e) => [Number(e.id), String(e.nome ?? "Esporte")]));

  const { items: aceitosItems, aceitosMatches, criadorPorTimeIdAgenda } = await loadAceitosCancelaveisItems(
    supabase,
    user.id,
    (partidasAgendadas ?? []) as AgendaPartidaCardRow[]
  );

  const { data: historicoCancelamentoRows } = await supabase
    .from("matches")
    .select("id, usuario_id, adversario_id, esporte_id, status")
    .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente", "Cancelado"])
    .eq("finalidade", "ranking")
    .or(matchAceitosOr)
    .order("id", { ascending: false })
    .limit(120);

  function dueloKey(a: string | null | undefined, b: string | null | undefined, esporteId: number | null | undefined): string | null {
    if (!a || !b || !Number.isFinite(Number(esporteId)) || Number(esporteId) <= 0) return null;
    const [x, y] = [String(a), String(b)].sort();
    return `${Number(esporteId)}:${x}:${y}`;
  }
  const advIds = [...new Set((pendentesEnvio ?? []).map((m) => m.adversario_id).filter(Boolean))] as string[];
  const { data: adversarios } = advIds.length
    ? await supabase.from("profiles").select("id, nome, avatar_url, localizacao").in("id", advIds)
    : { data: [] };
  const advMap = new Map((adversarios ?? []).map((p) => [p.id, p]));
  const advSportIds = [...new Set((pendentesEnvio ?? []).map((m) => Number(m.esporte_id ?? 0)).filter((id) => Number.isFinite(id) && id > 0))];
  const { data: advEidRows } =
    advIds.length > 0 && advSportIds.length > 0
      ? await supabase
          .from("usuario_eid")
          .select("usuario_id, esporte_id, nota_eid")
          .in("usuario_id", advIds)
          .in("esporte_id", advSportIds)
      : { data: [] };
  const advEidMap = new Map(
    (advEidRows ?? []).map((row) => [`${String(row.usuario_id)}:${Number(row.esporte_id)}`, Number(row.nota_eid ?? 0)])
  );

  const eids = [...new Set((pendentesEnvio ?? []).map((m) => m.esporte_id).filter(Boolean))] as number[];
  const { data: esportes } = eids.length
    ? await supabase.from("esportes").select("id, nome").in("id", eids)
    : { data: [] };
  const espMap = new Map((esportes ?? []).map((e) => [e.id, e.nome]));

  const cancelMatchIdByDuelo = new Map<string, number>();
  const cancelMatchIdByMatchId = new Map<number, number>();
  const rescheduleAcceptedMatchIdSet = new Set<number>();
  const blockedMatchIdsByCancelFlow = new Set<number>();
  const acceptedScheduleByDuelo = new Map<string, { scheduledFor: string | null; scheduledLocation: string | null }>();
  const acceptedScheduleByMatchId = new Map<number, { scheduledFor: string | null; scheduledLocation: string | null }>();
  const rescheduleAcceptedByDuelo = new Set<string>();
  const blockedDueloByCancelFlow = new Set<string>();
  for (const m of aceitosMatches ?? []) {
    const mid = Number(m.id);
    const st = String(m.status ?? "");
    if (st === "CancelamentoPendente" || st === "ReagendamentoPendente") {
      if (Number.isFinite(mid) && mid > 0) blockedMatchIdsByCancelFlow.add(mid);
    }
    const key = dueloKey(m.usuario_id, m.adversario_id, Number(m.esporte_id ?? 0));
    if (key && (st === "CancelamentoPendente" || st === "ReagendamentoPendente")) {
      blockedDueloByCancelFlow.add(key);
    }
    if (st === "Aceito" && Number.isFinite(mid) && mid > 0) {
      cancelMatchIdByMatchId.set(mid, mid);
      if (key) cancelMatchIdByDuelo.set(key, mid);
      const selected = Number((m as { reschedule_selected_option?: number | null }).reschedule_selected_option ?? 0);
      if (selected > 0) {
        rescheduleAcceptedMatchIdSet.add(mid);
        if (key) {
          rescheduleAcceptedByDuelo.add(key);
          acceptedScheduleByDuelo.set(key, {
            scheduledFor: (m as { scheduled_for?: string | null }).scheduled_for ? String((m as { scheduled_for?: string | null }).scheduled_for) : null,
            scheduledLocation: (m as { scheduled_location?: string | null }).scheduled_location
              ? String((m as { scheduled_location?: string | null }).scheduled_location)
              : null,
          });
        }
        acceptedScheduleByMatchId.set(mid, {
          scheduledFor: (m as { scheduled_for?: string | null }).scheduled_for ? String((m as { scheduled_for?: string | null }).scheduled_for) : null,
          scheduledLocation: (m as { scheduled_location?: string | null }).scheduled_location
            ? String((m as { scheduled_location?: string | null }).scheduled_location)
            : null,
        });
      }
    }
  }
  const latestStatusByDuelo = new Map<string, string>();
  for (const m of historicoCancelamentoRows ?? []) {
    const key = dueloKey(
      (m as { usuario_id?: string | null }).usuario_id ?? null,
      (m as { adversario_id?: string | null }).adversario_id ?? null,
      Number((m as { esporte_id?: number | null }).esporte_id ?? 0)
    );
    if (!key || latestStatusByDuelo.has(key)) continue;
    latestStatusByDuelo.set(key, String((m as { status?: string | null }).status ?? "").trim());
  }
  const partidasAgendadasVisiveis = (partidasAgendadas ?? []).filter((row) => {
    const midRow = Number((row as AgendaPartidaCardRow).match_id ?? 0);
    if (Number.isFinite(midRow) && midRow > 0 && blockedMatchIdsByCancelFlow.has(midRow)) return false;
    const esporteIdCard = Number((row as { esporte_id?: number | null }).esporte_id ?? 0);
    const key = dueloKey(row.jogador1_id, row.jogador2_id, esporteIdCard);
    if (!key) return true;
    if (blockedDueloByCancelFlow.has(key)) return false;
    const latestStatus = String(latestStatusByDuelo.get(key) ?? "").toLowerCase();
    if (latestStatus === "cancelado") return false;
    return true;
  });

  const agendaTimesCardIdSet = new Set<number>();
  for (const row of partidasAgendadasVisiveis) {
    const r = row as AgendaPartidaCardRow;
    for (const t of [r.time1_id, r.time2_id]) {
      const n = Number(t);
      if (Number.isFinite(n) && n > 0) agendaTimesCardIdSet.add(n);
    }
  }
  const agendaTimesCardIds = [...agendaTimesCardIdSet];
  const { data: agendaTimesCardRows } = agendaTimesCardIds.length
    ? await supabase.from("times").select("id, nome, escudo, eid_time").in("id", agendaTimesCardIds)
    : { data: [] };
  const agendaTimesCardById = new Map<number, { nome: string | null; escudo: string | null; eid_time: number | null }>();
  for (const t of agendaTimesCardRows ?? []) {
    const id = Number((t as { id: number }).id);
    if (!Number.isFinite(id) || id <= 0) continue;
    agendaTimesCardById.set(id, {
      nome: (t as { nome?: string | null }).nome ?? null,
      escudo: (t as { escudo?: string | null }).escudo ?? null,
      eid_time: (t as { eid_time?: number | null }).eid_time ?? null,
    });
  }


  function localLabel(p: AgendaPartidaCardRow) {
    if (p.local_str?.trim()) return p.local_str.trim();
    if (p.local_espaco_id) return locMap.get(p.local_espaco_id) ?? null;
    return null;
  }

  return (
    <main
      data-eid-agenda-page
      data-eid-touch-ui
      className="mx-auto w-full max-w-lg px-3 pt-0 pb-[calc(var(--eid-shell-footer-offset)+1rem)] sm:max-w-2xl sm:px-6 sm:pt-1 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]"
    >
      <AgendaBackgroundSync />
      <div className={`mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-4 py-4 sm:px-6 sm:py-5`}>
        <div className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_150px] sm:gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-eid-action-400 sm:text-[12px]">Agenda</p>
            <h1 className="mt-1 text-[17px] font-black leading-[1.12] tracking-tight text-eid-fg sm:text-[28px]">
              Sua agenda (referência)
            </h1>
            <p className="mt-2 max-w-[32ch] text-[10px] leading-relaxed text-eid-text-secondary sm:mt-3 sm:text-[18px]">
              Data e local combinados aqui; cancelamento, reagendamento e respostas ficam no{" "}
              <Link href="/comunidade#desafios-aceitos-gestao" className="font-bold text-eid-primary-300 hover:underline">
                Painel social
              </Link>
              .
            </p>
          </div>
          <div className="justify-self-end" aria-hidden>
            <svg viewBox="0 0 96 96" className="h-[78px] w-[78px] drop-shadow-[0_8px_12px_rgba(249,115,22,0.28)] sm:h-[130px] sm:w-[130px]">
              <rect x="10" y="14" width="76" height="72" rx="16" fill="#FF7A00" />
              <rect x="16" y="24" width="64" height="56" rx="12" fill="#FF8B20" />
              <rect x="22" y="36" width="52" height="38" rx="8" fill="#FFF7ED" />
              <rect x="28" y="8" width="8" height="18" rx="4" fill="#FF7A00" />
              <rect x="60" y="8" width="8" height="18" rx="4" fill="#FF7A00" />
              <path d="m35 55 11 11 16-20" fill="none" stroke="#FF7A00" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      <section className="mt-6 md:mt-10">
        <div className="overflow-hidden rounded-xl border border-transparent bg-eid-card/55">
          <div className="flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-3 py-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-primary-500">Confrontos</h2>
            <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
              Agenda
            </span>
          </div>
          <p className="px-3 pt-2 text-[11px] text-eid-text-secondary md:text-xs">
            Ajuste <strong className="text-eid-fg">data e local</strong> aqui. Pedidos de cancelamento ou nova data:{" "}
            <Link href="/comunidade#desafios-aceitos-gestao" className="font-bold text-eid-primary-300 hover:underline">
              Painel social
            </Link>
            . Placar:{" "}
            <Link href="/comunidade#resultados-partida" className="font-bold text-eid-primary-300 hover:underline">
              Partidas e resultados
            </Link>
            .
          </p>
        {partidasAgendadasVisiveis.length === 0 ? (
          <div className="eid-list-item m-3 rounded-[18px] border-2 border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/45 py-8 text-center shadow-[0_8px_18px_-14px_rgba(15,23,42,0.12)]">
            <p className="text-sm font-bold text-eid-fg">Nenhuma pendência</p>
            <p className="mt-1 text-[11px] text-eid-text-secondary md:text-xs">Sua agenda está em dia. Combine um desafio no radar.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-4 px-2.5 pb-2.5">
            {partidasAgendadasVisiveis.map((row) => {
              const esp = firstOfRelation(row.esportes);
              const pr = row as AgendaPartidaCardRow;
              const esporteIdCard = Number((row as { esporte_id?: number | null }).esporte_id ?? 0);
              const dueloKeyCard = dueloKey(pr.jogador1_id, pr.jogador2_id, esporteIdCard);
              const midPartida = Number(pr.match_id ?? 0);
              const acceptedSchedule =
                (Number.isFinite(midPartida) && midPartida > 0 ? acceptedScheduleByMatchId.get(midPartida) ?? null : null) ??
                (dueloKeyCard ? acceptedScheduleByDuelo.get(dueloKeyCard) ?? null : null);
              const effectiveDataRef = acceptedSchedule?.scheduledFor ?? pr.data_partida ?? pr.data_registro;
              const effectiveLocalLabel = acceptedSchedule?.scheduledLocation ?? localLabel(pr);
              const hasScheduleDefined = Boolean((acceptedSchedule?.scheduledFor ?? pr.data_partida) && effectiveLocalLabel);
              const schedulePending = String(pr.status ?? "") === "aguardando_aceite_agendamento";
              const cancelMatchIdResolved = resolveCancelMatchIdParaCard(pr, cancelMatchIdByMatchId, cancelMatchIdByDuelo, dueloKeyCard);
              const rescheduleAceito =
                (Number.isFinite(midPartida) && midPartida > 0 && rescheduleAcceptedMatchIdSet.has(midPartida)) ||
                (dueloKeyCard ? rescheduleAcceptedByDuelo.has(dueloKeyCard) : false);
              const podeGerenciarPartida = userIsDesafioAgendaLeaderFromMap(
                user.id,
                {
                  usuario_id: pr.jogador1_id,
                  adversario_id: pr.jogador2_id,
                  desafiante_time_id: pr.time1_id ?? null,
                  adversario_time_id: pr.time2_id ?? null,
                  modalidade_confronto: pr.modalidade ?? null,
                },
                criadorPorTimeIdAgenda
              );
              const scheduleCanRespond = computeAgendaPodeResponderProposta(pr, user.id, criadorPorTimeIdAgenda);
              const somenteLeituraElenco = !podeGerenciarPartida;
              return (
                <PartidaAgendaCard
                  key={pr.id}
                  id={pr.id}
                  esporteNome={esp?.nome ?? "Esporte"}
                  j1Nome={pr.jogador1_id ? nomeMap.get(pr.jogador1_id) ?? null : null}
                  j2Nome={pr.jogador2_id ? nomeMap.get(pr.jogador2_id) ?? null : null}
                  j1Id={pr.jogador1_id}
                  j2Id={pr.jogador2_id}
                  j1AvatarUrl={pr.jogador1_id ? perfilMap.get(pr.jogador1_id)?.avatar_url ?? null : null}
                  j2AvatarUrl={pr.jogador2_id ? perfilMap.get(pr.jogador2_id)?.avatar_url ?? null : null}
                  j1NotaEid={pr.jogador1_id ? notaEidByUserSport.get(`${pr.jogador1_id}:${esporteIdCard}`) ?? 0 : 0}
                  j2NotaEid={pr.jogador2_id ? notaEidByUserSport.get(`${pr.jogador2_id}:${esporteIdCard}`) ?? 0 : 0}
                  formacaoJ1={pickFormacaoLadoPartida(pr, 1, agendaTimesCardById)}
                  formacaoJ2={pickFormacaoLadoPartida(pr, 2, agendaTimesCardById)}
                  esporteId={esporteIdCard}
                  dataRef={effectiveDataRef}
                  localLabel={effectiveLocalLabel}
                  variant="agendada"
                  ctaFullscreen
                  cancelMatchId={cancelMatchIdResolved}
                  ctaHidden={
                    schedulePending ||
                    hasScheduleDefined ||
                    rescheduleAceito ||
                    somenteLeituraElenco
                  }
                  desistMatchId={rescheduleAceito ? cancelMatchIdResolved : null}
                  agendamentoPendente={schedulePending}
                  agendamentoPodeResponder={scheduleCanRespond}
                  agendamentoDeadline={pr.agendamento_aceite_deadline ?? null}
                  somenteLeituraElenco={somenteLeituraElenco}
                  ocultarFluxoCancelamento
                />
              );
            })}
          </div>
        )}
        </div>
      </section>

      {pendentesRankingStatus.length > 0 || aceitosItems.length > 0 ? (
        <section id="agenda-status-ranking" className="scroll-mt-4 mt-6 space-y-6 md:scroll-mt-6 md:mt-10">
          {pendentesRankingStatus.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-transparent bg-eid-card/55">
              <div className="flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-3 py-2">
                <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-text-secondary">
                  Pedidos de ranking em análise
                </h2>
                <EidPendingBadge label="Pendente" />
              </div>
              <p className="px-3 pt-2 text-[11px] text-eid-text-secondary md:text-xs">
                Status para o elenco: o capitão adversário responde no{" "}
                <Link href="/comunidade#desafio-pedidos" className="font-bold text-eid-primary-300 hover:underline">
                  Painel social
                </Link>
                . Sem data/local até o pedido ser aceito.
              </p>
              <ul className="m-3 space-y-2">
                {pendentesRankingStatus.map((m) => {
                  const tid1 = Number(m.desafiante_time_id ?? 0);
                  const tid2 = Number(m.adversario_time_id ?? 0);
                  const nome1 = Number.isFinite(tid1) && tid1 > 0 ? nomeTimePendenteById.get(tid1) ?? "Formação" : "Formação";
                  const nome2 = Number.isFinite(tid2) && tid2 > 0 ? nomeTimePendenteById.get(tid2) ?? "Formação" : "Formação";
                  const espNome = m.esporte_id ? espNomePendenteById.get(Number(m.esporte_id)) ?? "Esporte" : "Esporte";
                  const capitaoRecebedor = m.adversario_id === user.id;
                  const noTimeDesafiado =
                    Number.isFinite(tid2) &&
                    tid2 > 0 &&
                    agendaTeamIds.includes(tid2) &&
                    !capitaoRecebedor;
                  const sublinha = capitaoRecebedor
                    ? "Você é o capitão desta formação — aceite ou recuse no Painel social."
                    : noTimeDesafiado
                      ? "Seu capitão deve aceitar ou recusar este pedido no Painel social."
                      : "Aguardando o capitão adversário aceitar ou recusar.";
                  return (
                    <li
                      key={m.id}
                      className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-3 py-2.5 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.18)] md:px-4 md:py-3"
                    >
                      <p className="text-[13px] font-bold text-eid-fg md:text-sm">
                        {nome1} <span className="font-normal text-eid-text-secondary">vs</span> {nome2}
                      </p>
                      <p className="mt-0.5 text-[11px] text-eid-text-secondary md:text-xs">
                        {espNome} · {m.modalidade_confronto ?? "time"}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-eid-text-secondary md:text-xs">{sublinha}</p>
                      {capitaoRecebedor ? (
                        <p className="mt-2">
                          <Link
                            href="/comunidade#desafio-pedidos"
                            className="text-[11px] font-bold text-eid-primary-300 hover:underline md:text-xs"
                          >
                            Abrir pedidos recebidos
                          </Link>
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <AgendaAceitosCancelaveis items={aceitosItems} somenteInformativo cadastrarLocalReturnBase="/comunidade" />
        </section>
      ) : null}

      <section className="mt-6 md:mt-10">
        <div className="overflow-hidden rounded-xl border border-transparent bg-eid-card/55">
          <div className="flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-3 py-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-text-secondary">Pedidos que você enviou</h2>
            <EidPendingBadge label="Pendentes" />
          </div>
        {(pendentesEnvio ?? []).length === 0 ? (
          <p className="eid-list-item m-3 rounded-2xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-4 text-center text-sm text-eid-text-secondary">
            Você não tem pedidos aguardando resposta.
          </p>
        ) : (
          <ul className="m-3 space-y-2">
            {(pendentesEnvio ?? []).map((m) => {
              const adv = m.adversario_id ? advMap.get(m.adversario_id) : null;
              const esp = m.esporte_id ? espMap.get(m.esporte_id) : null;
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-3 py-2.5 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.18)] backdrop-blur-sm md:gap-3 md:px-4 md:py-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
                    <div className="flex w-[44px] shrink-0 flex-col items-center">
                      {adv?.avatar_url ? (
                        <Image
                          src={adv.avatar_url}
                          alt=""
                          width={44}
                          height={44}
                          unoptimized
                          className="h-10 w-10 rounded-xl border border-[color:var(--eid-border-subtle)] object-cover md:h-11 md:w-11"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300 md:h-11 md:w-11">
                          EID
                        </div>
                      )}
                      <div className="mt-1">
                        <ProfileEidPerformanceSeal
                          notaEid={adv ? (advEidMap.get(`${String(adv.id)}:${Number(m.esporte_id ?? 0)}`) ?? 0) : 0}
                          compact
                        />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-eid-fg md:text-sm">{adv?.nome ?? "Oponente"}</p>
                      <p className="text-[11px] text-eid-text-secondary md:text-xs">
                        {esp ?? "Esporte"} · {m.modalidade_confronto ?? "individual"}
                      </p>
                      <div className="text-[10px] md:text-[11px]">
                        <EidCityState location={adv?.localizacao?.trim() ? adv.localizacao : null} compact align="start" />
                      </div>
                    </div>
                  </div>
                  <EidPendingBadge label="Pendente" />
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </section>

      <div className="mt-6 overflow-hidden rounded-xl border border-transparent bg-eid-card/55 px-3 py-3 text-center md:mt-10 md:px-4 md:py-3.5">
        <p className="text-[11px] leading-relaxed text-eid-text-secondary md:text-xs">
          Pedidos recebidos para aceitar estão no{" "}
          <Link href="/comunidade" className="font-bold text-eid-primary-300 hover:underline">
            Painel de controle
          </Link>
          . Resultados e placares:{" "}
          <Link href="/comunidade#resultados-partida" className="font-bold text-eid-primary-300 hover:underline">
            Partidas e resultados
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
