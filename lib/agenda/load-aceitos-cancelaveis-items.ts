import type { SupabaseClient } from "@supabase/supabase-js";
import {
  partidaRankingEncerradaParaResumo,
  userIsDesafioAgendaLeaderFromMap,
} from "@/lib/agenda/desafio-match-leadership";
import { type AgendaPartidaCardRow, getAgendaTeamContext } from "@/lib/agenda/partidas-usuario";
import {
  effectiveRankingMatchTeamIds,
  timesDaPartidaPorMatchRows,
} from "@/lib/agenda/ranking-match-effective-teams";
import type { AceitosCancelaveisItem } from "@/components/agenda/agenda-aceitos-cancelaveis";

const aceitosSelect =
  "id, usuario_id, adversario_id, desafiante_time_id, adversario_time_id, modalidade_confronto, esporte_id, status, cancel_requested_by, cancel_requested_at, cancel_response_deadline_at, reschedule_deadline_at, reschedule_selected_option, scheduled_for, scheduled_location, data_confirmacao";

function dueloKey(a: string | null | undefined, b: string | null | undefined, esporteId: number | null | undefined): string | null {
  if (!a || !b || !Number.isFinite(Number(esporteId)) || Number(esporteId) <= 0) return null;
  const [x, y] = [String(a), String(b)].sort();
  return `${Number(esporteId)}:${x}:${y}`;
}

function dueloKeyNoSport(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a || !b) return null;
  const [x, y] = [String(a), String(b)].sort();
  return `${x}:${y}`;
}

export type LoadAceitosCancelaveisResult = {
  items: AceitosCancelaveisItem[];
  /** Lista bruta de `matches` (ranking aceito / cancelamento / reagendamento) após merge com partidas-ponte. */
  aceitosMatches: Array<Record<string, unknown> & { id: number; usuario_id: string | null; adversario_id: string | null; esporte_id?: number | null }>;
  criadorPorTimeIdAgenda: Map<number, string>;
};

/**
 * Itens para o card “Desafios aceitos” (cancelamento / reagendamento de ranking).
 * Usado na Comunidade (ações) e na Agenda (somente leitura — repassa os mesmos dados).
 */
export async function loadAceitosCancelaveisItems(
  supabase: SupabaseClient,
  userId: string,
  partidasAgendadas: AgendaPartidaCardRow[]
): Promise<LoadAceitosCancelaveisResult> {
  const agendaUserId = userId;
  const { teamIds: agendaTeamIds, teamClause } = await getAgendaTeamContext(supabase, userId);
  const matchAceitosOr =
    agendaTeamIds.length > 0
      ? `usuario_id.eq.${userId},adversario_id.eq.${userId},desafiante_time_id.in.(${agendaTeamIds.join(",")}),adversario_time_id.in.(${agendaTeamIds.join(",")})`
      : `usuario_id.eq.${userId},adversario_id.eq.${userId}`;

  const { data: aceitosCancelaveisRaw } = await supabase
    .from("matches")
    .select(aceitosSelect)
    .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente"])
    .eq("finalidade", "ranking")
    .or(matchAceitosOr)
    .order("data_confirmacao", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(20);

  let aceitosCancelaveis = [...(aceitosCancelaveisRaw ?? [])];
  const aceitosIdsSeen = new Set(aceitosCancelaveis.map((m) => Number(m.id)).filter((n) => Number.isFinite(n) && n > 0));
  if (agendaTeamIds.length > 0) {
    const teamIn = agendaTeamIds.join(",");
    const { data: partidasBridgeRows } = await supabase
      .from("partidas")
      .select("match_id")
      .not("match_id", "is", null)
      .or(`time1_id.in.(${teamIn}),time2_id.in.(${teamIn})`)
      .in("status", ["agendada", "aguardando_aceite_agendamento", "aguardando_confirmacao"]);
    const extraMatchIds = [
      ...new Set(
        (partidasBridgeRows ?? [])
          .map((r) => Number((r as { match_id?: number | null }).match_id ?? 0))
          .filter((n) => Number.isFinite(n) && n > 0 && !aceitosIdsSeen.has(n))
      ),
    ];
    if (extraMatchIds.length > 0) {
      const { data: aceitosExtra } = await supabase
        .from("matches")
        .select(aceitosSelect)
        .in("id", extraMatchIds)
        .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente"])
        .eq("finalidade", "ranking");
      for (const row of aceitosExtra ?? []) {
        const nid = Number((row as { id?: number }).id ?? 0);
        if (!Number.isFinite(nid) || nid <= 0 || aceitosIdsSeen.has(nid)) continue;
        aceitosIdsSeen.add(nid);
        aceitosCancelaveis.push(row as (typeof aceitosCancelaveis)[number]);
      }
      aceitosCancelaveis.sort((a, b) => {
        const da = String((a as { data_confirmacao?: string | null }).data_confirmacao ?? "");
        const db = String((b as { data_confirmacao?: string | null }).data_confirmacao ?? "");
        if (da !== db) return db.localeCompare(da);
        return Number((b as { id?: number }).id ?? 0) - Number((a as { id?: number }).id ?? 0);
      });
      aceitosCancelaveis = aceitosCancelaveis.slice(0, 20);
    }
  }

  const matchIdsAceitos = (aceitosCancelaveis ?? [])
    .map((m) => Number(m.id))
    .filter((v) => Number.isFinite(v) && v > 0);
  const { data: partidasPorMatchRows } = matchIdsAceitos.length
    ? await supabase
        .from("partidas")
        .select("id, match_id, time1_id, time2_id, status, status_ranking, data_partida, local_str, local_espaco_id")
        .in("match_id", matchIdsAceitos)
        .order("id", { ascending: false })
    : { data: [] };
  const timesPorMatchIdAgenda = timesDaPartidaPorMatchRows(partidasPorMatchRows ?? []);
  const partidaMaisRecentePorMatch = new Map<
    number,
    {
      status: string | null;
      status_ranking: string | null;
      data_partida: string | null;
      local_str: string | null;
      local_espaco_id: number | null;
    }
  >();
  for (const row of partidasPorMatchRows ?? []) {
    const mid = Number((row as { match_id?: number | null }).match_id ?? 0);
    if (!Number.isFinite(mid) || mid <= 0 || partidaMaisRecentePorMatch.has(mid)) continue;
    partidaMaisRecentePorMatch.set(mid, {
      status: (row as { status?: string | null }).status ?? null,
      status_ranking: (row as { status_ranking?: string | null }).status_ranking ?? null,
      data_partida: (row as { data_partida?: string | null }).data_partida ?? null,
      local_str: (row as { local_str?: string | null }).local_str ?? null,
      local_espaco_id: (row as { local_espaco_id?: number | null }).local_espaco_id ?? null,
    });
  }
  const { data: partidasStatusRows } = await supabase
    .from("partidas")
    .select("id, esporte_id, jogador1_id, jogador2_id, status, status_ranking")
    .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId},usuario_id.eq.${userId}${teamClause}`)
    .in("status", ["agendada", "aguardando_confirmacao"])
    .order("id", { ascending: false })
    .limit(80);
  const partidaMaisRecentePorDuelo = new Map<string, { status: string | null; status_ranking: string | null }>();
  const partidaMaisRecentePorDueloNoSport = new Map<string, { status: string | null; status_ranking: string | null }>();
  for (const row of partidasStatusRows ?? []) {
    const key = dueloKey(
      (row as { jogador1_id?: string | null }).jogador1_id ?? null,
      (row as { jogador2_id?: string | null }).jogador2_id ?? null,
      Number((row as { esporte_id?: number | null }).esporte_id ?? 0)
    );
    if (!key || partidaMaisRecentePorDuelo.has(key)) continue;
    partidaMaisRecentePorDuelo.set(key, {
      status: (row as { status?: string | null }).status ?? null,
      status_ranking: (row as { status_ranking?: string | null }).status_ranking ?? null,
    });
    const keyNoSport = dueloKeyNoSport(
      (row as { jogador1_id?: string | null }).jogador1_id ?? null,
      (row as { jogador2_id?: string | null }).jogador2_id ?? null
    );
    if (keyNoSport && !partidaMaisRecentePorDueloNoSport.has(keyNoSport)) {
      partidaMaisRecentePorDueloNoSport.set(keyNoSport, {
        status: (row as { status?: string | null }).status ?? null,
        status_ranking: (row as { status_ranking?: string | null }).status_ranking ?? null,
      });
    }
  }

  const eidsAceitos = [...new Set((aceitosCancelaveis ?? []).map((m) => m.esporte_id).filter(Boolean))] as number[];
  const { data: esportesAceitos } = eidsAceitos.length
    ? await supabase.from("esportes").select("id, nome").in("id", eidsAceitos)
    : { data: [] };
  const espMapAceitos = new Map((esportesAceitos ?? []).map((e) => [e.id, e.nome]));

  const oponenteIdsAceitos = [
    ...new Set(
      (aceitosCancelaveis ?? [])
        .map((m) => (m.usuario_id === userId ? m.adversario_id : m.usuario_id))
        .filter((x): x is string => typeof x === "string" && x.length > 0)
    ),
  ];
  const { data: oponentesAceitos } = oponenteIdsAceitos.length
    ? await supabase.from("profiles").select("id, nome, avatar_url, localizacao").in("id", oponenteIdsAceitos)
    : { data: [] };
  const oponenteMapAceitos = new Map(
    (oponentesAceitos ?? []).map((p) => [
      p.id,
      { nome: p.nome ?? "Oponente", avatarUrl: p.avatar_url ?? null, localizacao: p.localizacao ?? null },
    ])
  );

  const allPlayerIds = new Set<string>();
  for (const p of partidasAgendadas ?? []) {
    if (p.jogador1_id) allPlayerIds.add(p.jogador1_id);
    if (p.jogador2_id) allPlayerIds.add(p.jogador2_id);
  }
  const playerList = [...allPlayerIds];
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

  const partidasAgendaTimeIdSet = new Set<number>();
  for (const row of partidasAgendadas ?? []) {
    const r = row as AgendaPartidaCardRow;
    for (const t of [r.time1_id, r.time2_id]) {
      const n = Number(t);
      if (Number.isFinite(n) && n > 0) partidasAgendaTimeIdSet.add(n);
    }
  }
  const aceitosTimeIdSet = new Set<number>();
  for (const m of aceitosCancelaveis ?? []) {
    const eff = effectiveRankingMatchTeamIds(
      {
        id: m.id,
        desafiante_time_id: (m as { desafiante_time_id?: number | null }).desafiante_time_id ?? null,
        adversario_time_id: (m as { adversario_time_id?: number | null }).adversario_time_id ?? null,
      },
      timesPorMatchIdAgenda
    );
    const dt = Number(eff.desafiante_time_id ?? 0);
    const at = Number(eff.adversario_time_id ?? 0);
    if (Number.isFinite(dt) && dt > 0) aceitosTimeIdSet.add(dt);
    if (Number.isFinite(at) && at > 0) aceitosTimeIdSet.add(at);
  }
  const allAgendaTimeIdsForCriadores = [...new Set([...aceitosTimeIdSet, ...partidasAgendaTimeIdSet])];
  const { data: aceitosTimesRows } = allAgendaTimeIdsForCriadores.length
    ? await supabase
        .from("times")
        .select("id, nome, escudo, eid_time, localizacao, criador_id")
        .in("id", allAgendaTimeIdsForCriadores)
    : { data: [] };
  const aceitosTimesById = new Map<
    number,
    { nome: string | null; escudo: string | null; eid_time: number | null; localizacao: string | null }
  >();
  const criadorPorTimeIdAgenda = new Map<number, string>();
  for (const t of aceitosTimesRows ?? []) {
    const id = Number((t as { id: number }).id);
    if (!Number.isFinite(id) || id <= 0) continue;
    aceitosTimesById.set(id, {
      nome: (t as { nome?: string | null }).nome ?? null,
      escudo: (t as { escudo?: string | null }).escudo ?? null,
      eid_time: (t as { eid_time?: number | null }).eid_time ?? null,
      localizacao: (t as { localizacao?: string | null }).localizacao ?? null,
    });
    const cid = String((t as { criador_id?: string | null }).criador_id ?? "").trim();
    if (cid) criadorPorTimeIdAgenda.set(id, cid);
  }
  const agendaTeamIdSet = new Set(agendaTeamIds);
  function resolveOponenteTimeIdAceitos(m: {
    usuario_id?: string | null;
    adversario_id?: string | null;
    modalidade_confronto?: string | null;
    desafiante_time_id?: number | null;
    adversario_time_id?: number | null;
  }): number | null {
    const mod = String((m as { modalidade_confronto?: string | null }).modalidade_confronto ?? "")
      .trim()
      .toLowerCase();
    if (mod !== "dupla" && mod !== "time") return null;
    const dti = Number((m as { desafiante_time_id?: number | null }).desafiante_time_id ?? 0);
    const ati = Number((m as { adversario_time_id?: number | null }).adversario_time_id ?? 0);
    if (!Number.isFinite(dti) || dti <= 0 || !Number.isFinite(ati) || ati <= 0) return null;
    const uid = String((m as { usuario_id?: string | null }).usuario_id ?? "");
    const aid = String((m as { adversario_id?: string | null }).adversario_id ?? "");
    if (agendaUserId === uid) return ati;
    if (agendaUserId === aid) return dti;
    if (agendaTeamIdSet.has(dti)) return ati;
    if (agendaTeamIdSet.has(ati)) return dti;
    return null;
  }
  const matchIdsCancel = (aceitosCancelaveis ?? []).map((m) => Number(m.id)).filter((v) => Number.isFinite(v) && v > 0);
  const { data: opcoesCancelRows } = matchIdsCancel.length
    ? await supabase
        .from("match_cancelamento_opcoes")
        .select("match_id, option_idx, scheduled_for, location, status")
        .in("match_id", matchIdsCancel)
        .order("option_idx", { ascending: true })
    : { data: [] };
  const opcoesByMatch = new Map<number, Array<{ optionIdx: number; scheduledFor: string; location: string | null; status: string }>>();
  for (const row of opcoesCancelRows ?? []) {
    const key = Number(row.match_id);
    if (!Number.isFinite(key) || !row.scheduled_for) continue;
    const list = opcoesByMatch.get(key) ?? [];
    list.push({
      optionIdx: Number(row.option_idx),
      scheduledFor: String(row.scheduled_for),
      location: row.location ? String(row.location) : null,
      status: String(row.status ?? "pendente"),
    });
    opcoesByMatch.set(key, list);
  }

  const items = (aceitosCancelaveis ?? []).flatMap((m) => {
    const effTeams = effectiveRankingMatchTeamIds(
      {
        id: m.id,
        desafiante_time_id: (m as { desafiante_time_id?: number | null }).desafiante_time_id ?? null,
        adversario_time_id: (m as { adversario_time_id?: number | null }).adversario_time_id ?? null,
      },
      timesPorMatchIdAgenda
    );
    const matchParaTimes = {
      ...m,
      desafiante_time_id: effTeams.desafiante_time_id,
      adversario_time_id: effTeams.adversario_time_id,
    };
    let opp: string | null = m.usuario_id === userId ? m.adversario_id : m.usuario_id;
    if (effTeams.desafiante_time_id && effTeams.adversario_time_id) {
      const myDesaf = agendaTeamIdSet.has(effTeams.desafiante_time_id);
      const myAdv = agendaTeamIdSet.has(effTeams.adversario_time_id);
      if (myDesaf && !myAdv) opp = m.adversario_id;
      else if (myAdv && !myDesaf) opp = m.usuario_id;
    }
    const status = String(m.status ?? "Aceito");
    const keyDuelo = dueloKey(m.usuario_id, m.adversario_id, Number(m.esporte_id ?? 0));
    const keyDueloNoSport = dueloKeyNoSport(m.usuario_id, m.adversario_id);
    const partidaRecente =
      partidaMaisRecentePorMatch.get(Number(m.id)) ??
      (keyDuelo ? partidaMaisRecentePorDuelo.get(keyDuelo) ?? null : null) ??
      (keyDueloNoSport ? partidaMaisRecentePorDueloNoSport.get(keyDueloNoSport) ?? null : null);

    const isLeader = userIsDesafioAgendaLeaderFromMap(
      userId,
      {
        usuario_id: m.usuario_id,
        adversario_id: m.adversario_id,
        desafiante_time_id: effTeams.desafiante_time_id,
        adversario_time_id: effTeams.adversario_time_id,
        modalidade_confronto: m.modalidade_confronto ?? null,
      },
      criadorPorTimeIdAgenda
    );

    if (!isLeader && partidaRankingEncerradaParaResumo(partidaRecente)) {
      return [];
    }

    const partidaStatus = String(partidaRecente?.status ?? "").trim().toLowerCase();
    const partidaStatusRanking = String(partidaRecente?.status_ranking ?? "").trim().toLowerCase();
    const metaExt = partidaRecente as {
      data_partida?: string | null;
      local_str?: string | null;
      local_espaco_id?: number | null;
    } | null;
    const hasLocalPartida =
      Boolean(String(metaExt?.local_str ?? "").trim()) || (Number(metaExt?.local_espaco_id ?? 0) > 0);
    const reagSelecionado = Number((m as { reschedule_selected_option?: number | null }).reschedule_selected_option ?? 0) > 0;
    const matchTemHorarioReag = Boolean(String((m as { scheduled_for?: string | null }).scheduled_for ?? "").trim());

    let statusLabel: string | null = null;
    if (status === "Aceito") {
      if (partidaStatusRanking === "contestado" || partidaStatusRanking === "resultado_contestado") {
        statusLabel = "Resultado contestado";
      } else if (partidaStatusRanking === "pendente_confirmacao_revisao") {
        statusLabel = "Aguardando aprovação (revisão)";
      } else if (partidaStatusRanking === "em_analise_admin") {
        statusLabel = "Em análise do admin";
      } else if (partidaStatus === "aguardando_confirmacao") {
        statusLabel = "Aguardando aprovação";
      } else if (
        partidaStatus === "agendada" &&
        Boolean(String(metaExt?.data_partida ?? "").trim()) &&
        (hasLocalPartida || (reagSelecionado && matchTemHorarioReag))
      ) {
        statusLabel = "Agendado";
      } else if (reagSelecionado && matchTemHorarioReag) {
        statusLabel = "Agendado";
      }
    }
    const isRequester = String(m.cancel_requested_by ?? "") === userId;
    const tidOpp = resolveOponenteTimeIdAceitos(matchParaTimes);
    const timeRow = tidOpp != null ? aceitosTimesById.get(tidOpp) : undefined;
    const nomePerfilOpp = (opp ? oponenteMapAceitos.get(opp)?.nome : null) ?? "Oponente";
    const avatarPerfilOpp = (opp ? oponenteMapAceitos.get(opp)?.avatarUrl : null) ?? null;
    const locPerfilOpp = (opp ? oponenteMapAceitos.get(opp)?.localizacao : null) ?? null;
    const nomeTime = timeRow?.nome != null && String(timeRow.nome).trim() ? String(timeRow.nome).trim() : null;
    const escudoTime = timeRow?.escudo != null && String(timeRow.escudo).trim() ? String(timeRow.escudo).trim() : null;
    return [
      {
        id: Number(m.id),
        nomeOponente: nomeTime ?? nomePerfilOpp,
        avatarOponente: escudoTime ?? avatarPerfilOpp,
        oponenteAvatarEhTime: Boolean(tidOpp && nomeTime),
        localizacaoOponente: tidOpp && timeRow?.localizacao?.trim() ? timeRow.localizacao.trim() : locPerfilOpp,
        notaEidOponente: tidOpp && timeRow ? Number(timeRow.eid_time ?? 0) : opp ? (notaEidByUserSport.get(`${opp}:${Number(m.esporte_id ?? 0)}`) ?? 0) : 0,
        oponenteId: opp ?? m.adversario_id ?? m.usuario_id ?? "",
        esporte: (m.esporte_id ? espMapAceitos.get(m.esporte_id) : null) ?? "Esporte",
        modalidade: m.modalidade_confronto ?? "individual",
        status,
        statusLabel,
        isRequester,
        cancelResponseDeadlineAt: m.cancel_response_deadline_at ? String(m.cancel_response_deadline_at) : null,
        rescheduleDeadlineAt: m.reschedule_deadline_at ? String(m.reschedule_deadline_at) : null,
        options: opcoesByMatch.get(Number(m.id)) ?? [],
        gestaoSomenteLeitura: !isLeader,
      },
    ];
  });

  return {
    items,
    aceitosMatches: aceitosCancelaveis as LoadAceitosCancelaveisResult["aceitosMatches"],
    criadorPorTimeIdAgenda,
  };
}
