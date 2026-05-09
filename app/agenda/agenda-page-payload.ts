import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AceitosCancelaveisItem } from "@/components/agenda/agenda-aceitos-cancelaveis";
import { dueloKey } from "@/app/comunidade/comunidade-shared";
import { loadAceitosCancelaveisItems } from "@/lib/agenda/load-aceitos-cancelaveis-items";
import {
  type AgendaPartidaCardRow,
  fetchPartidasAgendadasUsuario,
} from "@/lib/agenda/partidas-usuario";
import { processarPendenciasAgendamentoAceite } from "@/lib/agenda/processar-pendencias-agendamento";

export type AgendaTimePendenteInfo = { nome: string; escudo: string | null; eid_time: number };

export type AgendaPendenteRankingRow = {
  id: number;
  usuario_id: string | null;
  adversario_id: string | null;
  desafiante_time_id: number | null;
  adversario_time_id: number | null;
  esporte_id: number | null;
  modalidade_confronto: string | null;
};

export type AgendaPendenteEnvioRow = {
  id: number;
  adversario_id: string | null;
  esporte_id: number | null;
  modalidade_confronto: string | null;
};

export type AgendaPagePayload = {
  partidasAgendadasVisiveis: AgendaPartidaCardRow[];
  locMap: Map<number, { nome: string | null; logo: string | null }>;
  /** Fallback logo lookup keyed by `local_str` text for partidas with no `local_espaco_id`. */
  localStrLogoMap: LocalStrLogoMap;
  perfilMap: Map<string, { id: string; nome: string | null; avatar_url: string | null }>;
  nomeMap: Map<string, string | null>;
  notaEidByUserSport: Map<string, number>;
  cancelMatchIdByDuelo: Map<string, number>;
  cancelMatchIdByMatchId: Map<number, number>;
  rescheduleAcceptedMatchIdSet: Set<number>;
  rescheduleAcceptedByDuelo: Set<string>;
  acceptedScheduleByMatchId: Map<number, { scheduledFor: string | null; scheduledLocation: string | null }>;
  acceptedScheduleByDuelo: Map<string, { scheduledFor: string | null; scheduledLocation: string | null }>;
  criadorPorTimeIdAgenda: Map<number, string>;
  agendaTimesCardById: Map<number, { nome: string | null; escudo: string | null; eid_time: number | null }>;
  pendentesRankingStatus: AgendaPendenteRankingRow[];
  aceitosItems: AceitosCancelaveisItem[];
  timeRowById: Map<number, AgendaTimePendenteInfo>;
  espMap: Map<number, string>;
  pendentesEnvio: AgendaPendenteEnvioRow[] | null;
  advMap: Map<string, { id: string; nome: string | null; avatar_url: string | null; localizacao: string | null }>;
  advEidMap: Map<string, number>;
};

/** Só o necessário para o bloco “Confrontos” + `aceitosItems` (reaproveitado no bloco seguinte via cache). */
export type AgendaConfrontosPayload = Omit<
  AgendaPagePayload,
  "pendentesRankingStatus" | "timeRowById" | "espMap" | "pendentesEnvio" | "advMap" | "advEidMap"
>;

/** Text-keyed logo fallback for partidas where local_espaco_id wasn't saved. */
export type LocalStrLogoMap = Map<string, string | null>;

function matchAceitosOrClause(userId: string, agendaTeamIds: number[]): string {
  return agendaTeamIds.length > 0
    ? `usuario_id.eq.${userId},adversario_id.eq.${userId},desafiante_time_id.in.(${agendaTeamIds.join(",")}),adversario_time_id.in.(${agendaTeamIds.join(",")})`
    : `usuario_id.eq.${userId},adversario_id.eq.${userId}`;
}

/**
 * 1ª fase: partidas agendadas, histórico de duelo, locais, perfis, aceitos (mapas dos cards).
 * Resolve antes das queries de pendentes enviados / ranking em análise — melhora o streaming do 1º `Suspense`.
 */
export const getAgendaConfrontosPayload = cache(
  async (
    supabase: SupabaseClient,
    userId: string,
    teamClause: string,
    agendaTeamIds: number[],
  ): Promise<AgendaConfrontosPayload> => {
    await processarPendenciasAgendamentoAceite(supabase, userId, teamClause);

    const [{ data: partidasAgendadas }, { data: historicoCancelamentoRows }] = await Promise.all([
      fetchPartidasAgendadasUsuario(supabase, userId, teamClause),
      supabase
        .from("matches")
        .select("id, usuario_id, adversario_id, esporte_id, status")
        .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente", "Cancelado"])
        .eq("finalidade", "ranking")
        .or(matchAceitosOrClause(userId, agendaTeamIds))
        .order("id", { ascending: false })
        .limit(120),
    ]);

    const allLocalIds = [
      ...new Set(
        (partidasAgendadas ?? [])
          .map((p) => p.local_espaco_id)
          .filter((x): x is number => typeof x === "number" && x > 0),
      ),
    ];

    // Text-based lookup: partidas that have local_str but no local_espaco_id
    // (scheduled before the local_espaco_id save was implemented).
    const localStrNamesForLookup = [
      ...new Set(
        (partidasAgendadas ?? [])
          .filter((p) => p.local_str && !(p.local_espaco_id && Number(p.local_espaco_id) > 0))
          .map((p) => String(p.local_str ?? "").split(" — ")[0].trim())
          .filter((n) => n.length >= 2),
      ),
    ];

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
          .filter((v) => Number.isFinite(v) && v > 0),
      ),
    ];

    const [{ data: locaisRows }, { data: nomeRows }, { data: ueRows }, loadAceitosResult, { data: localStrEspacos }] = await Promise.all([
      allLocalIds.length
        ? supabase.from("espacos_genericos").select("id, nome_publico, logo_arquivo").in("id", allLocalIds)
        : Promise.resolve({ data: [] as Array<{ id: number; nome_publico: string | null; logo_arquivo: string | null }> }),
      playerList.length
        ? supabase.from("profiles").select("id, nome, avatar_url").in("id", playerList)
        : Promise.resolve({ data: [] as Array<{ id: string; nome: string | null; avatar_url: string | null }> }),
      playerList.length && esporteIdsPartidas.length
        ? supabase
            .from("usuario_eid")
            .select("usuario_id, esporte_id, nota_eid")
            .in("usuario_id", playerList)
            .in("esporte_id", esporteIdsPartidas)
        : Promise.resolve({ data: [] as Array<{ usuario_id: string; esporte_id: number; nota_eid: number | null }> }),
      loadAceitosCancelaveisItems(supabase, userId, (partidasAgendadas ?? []) as AgendaPartidaCardRow[]),
      localStrNamesForLookup.length
        ? supabase
            .from("espacos_genericos")
            .select("id, nome_publico, logo_arquivo, localizacao")
            .in("nome_publico", localStrNamesForLookup)
        : Promise.resolve({ data: [] as Array<{ id: number; nome_publico: string | null; logo_arquivo: string | null; localizacao: string | null }> }),
    ]);
    const locMap = new Map(
      (locaisRows ?? []).map((l) => [
        l.id,
        {
          nome: l.nome_publico ?? null,
          logo: (l as { logo_arquivo?: string | null }).logo_arquivo?.trim() || null,
        },
      ])
    );

    // Build fallback map: "full local_str text" → logo URL
    const localStrLogoMap: LocalStrLogoMap = new Map();
    for (const p of (partidasAgendadas ?? []).filter(
      (x) => x.local_str && !(x.local_espaco_id && Number(x.local_espaco_id) > 0)
    )) {
      const str = String(p.local_str ?? "").trim();
      if (!str || localStrLogoMap.has(str)) continue;
      const namePart = str.split(" — ")[0].trim();
      const locPart = str.includes(" — ") ? str.slice(str.indexOf(" — ") + 3).trim() : null;
      const candidates = (localStrEspacos ?? []).filter(
        (e) => (e.nome_publico ?? "").trim().toLowerCase() === namePart.toLowerCase()
      );
      let match = candidates[0] as (typeof candidates)[0] | undefined;
      if (candidates.length > 1 && locPart) {
        const precise = candidates.find((e) =>
          (e.localizacao ?? "").trim().toLowerCase().includes(locPart.toLowerCase())
        );
        if (precise) match = precise;
      }
      const logo = match
        ? (match as { logo_arquivo?: string | null }).logo_arquivo?.trim() || null
        : null;
      localStrLogoMap.set(str, logo);
    }
    const perfilMap = new Map((nomeRows ?? []).map((r) => [r.id, r]));
    const nomeMap = new Map((nomeRows ?? []).map((r) => [r.id, r.nome]));
    const notaEidByUserSport = new Map(
      (ueRows ?? []).map((r) => [`${String(r.usuario_id)}:${Number(r.esporte_id)}`, Number(r.nota_eid ?? 0)]),
    );
    const { items: aceitosItems, aceitosMatches, criadorPorTimeIdAgenda } = loadAceitosResult;

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
        const sfRaw = (m as { scheduled_for?: string | null }).scheduled_for;
        const slRaw = (m as { scheduled_location?: string | null }).scheduled_location;
        const scheduledFor = sfRaw ? String(sfRaw) : null;
        const scheduledLocation = slRaw && String(slRaw).trim() ? String(slRaw).trim() : null;
        if (selected > 0) {
          rescheduleAcceptedMatchIdSet.add(mid);
          if (key) rescheduleAcceptedByDuelo.add(key);
        }
        if (selected > 0 || scheduledFor || scheduledLocation) {
          const payload = { scheduledFor, scheduledLocation };
          if (key) acceptedScheduleByDuelo.set(key, payload);
          acceptedScheduleByMatchId.set(mid, payload);
        }
      }
    }
    const latestStatusByDuelo = new Map<string, string>();
    for (const m of historicoCancelamentoRows ?? []) {
      const key = dueloKey(
        (m as { usuario_id?: string | null }).usuario_id ?? null,
        (m as { adversario_id?: string | null }).adversario_id ?? null,
        Number((m as { esporte_id?: number | null }).esporte_id ?? 0),
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

    return {
      partidasAgendadasVisiveis,
      locMap,
      localStrLogoMap,
      perfilMap,
      nomeMap,
      notaEidByUserSport,
      cancelMatchIdByDuelo,
      cancelMatchIdByMatchId,
      rescheduleAcceptedMatchIdSet,
      rescheduleAcceptedByDuelo,
      acceptedScheduleByMatchId,
      acceptedScheduleByDuelo,
      criadorPorTimeIdAgenda,
      agendaTimesCardById,
      aceitosItems,
    };
  },
);

async function loadAgendaPendentesExtension(
  supabase: SupabaseClient,
  userId: string,
  agendaTeamIds: number[],
): Promise<Pick<AgendaPagePayload, "pendentesRankingStatus" | "timeRowById" | "espMap" | "pendentesEnvio" | "advMap" | "advEidMap">> {
  const matchAceitosOr = matchAceitosOrClause(userId, agendaTeamIds);
  const [{ data: pendentesEnvio }, { data: pendentesRankingElencoRows }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, status, modalidade_confronto, data_solicitacao, data_registro, adversario_id, esporte_id")
      .eq("usuario_id", userId)
      .eq("status", "Pendente")
      .order("data_registro", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(20),
    supabase
      .from("matches")
      .select(
        "id, usuario_id, adversario_id, desafiante_time_id, adversario_time_id, esporte_id, modalidade_confronto, data_solicitacao, data_registro",
      )
      .eq("status", "Pendente")
      .eq("finalidade", "ranking")
      .in("modalidade_confronto", ["dupla", "time"])
      .or(matchAceitosOr)
      .order("data_registro", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(20),
  ]);

  const pendentesRankingStatus = (pendentesRankingElencoRows ?? [])
    .filter((m) => m.usuario_id !== userId)
    .map((m) => m as AgendaPendenteRankingRow);

  const pendentesRankingTimeIds = [
    ...new Set(
      (pendentesRankingStatus ?? [])
        .flatMap((m) => [m.desafiante_time_id, m.adversario_time_id])
        .map((x) => Number(x ?? 0))
        .filter((n) => Number.isFinite(n) && n > 0),
    ),
  ];

  const espIdsAgendaPendentes = [
    ...new Set(
      [
        ...(pendentesEnvio ?? []).map((m) => Number(m.esporte_id ?? 0)),
        ...(pendentesRankingStatus ?? []).map((m) => Number(m.esporte_id ?? 0)),
      ].filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];

  const [{ data: timesPendentesRanking }, { data: esportesAgendaPendentesRows }] = await Promise.all([
    pendentesRankingTimeIds.length
      ? supabase.from("times").select("id, nome, escudo, eid_time").in("id", pendentesRankingTimeIds)
      : Promise.resolve({ data: [] as Array<{ id: number; nome: string | null; escudo?: string | null; eid_time?: number | null }> }),
    espIdsAgendaPendentes.length
      ? supabase.from("esportes").select("id, nome").in("id", espIdsAgendaPendentes)
      : Promise.resolve({ data: [] as Array<{ id: number; nome: string | null }> }),
  ]);
  const timeRowById = new Map<number, AgendaTimePendenteInfo>();
  for (const t of timesPendentesRanking ?? []) {
    const id = Number(t.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const escRaw = (t as { escudo?: string | null }).escudo;
    const escudo = escRaw != null && String(escRaw).trim() ? String(escRaw).trim() : null;
    timeRowById.set(id, {
      nome: String(t.nome ?? "").trim() || "Formação",
      escudo,
      eid_time: Number((t as { eid_time?: number | null }).eid_time ?? 0) || 0,
    });
  }

  const espMap = new Map((esportesAgendaPendentesRows ?? []).map((e) => [Number(e.id), String(e.nome ?? "Esporte")]));

  const advIds = [...new Set((pendentesEnvio ?? []).map((m) => m.adversario_id).filter(Boolean))] as string[];
  const advSportIds = [
    ...new Set((pendentesEnvio ?? []).map((m) => Number(m.esporte_id ?? 0)).filter((id) => Number.isFinite(id) && id > 0)),
  ];
  const [{ data: adversarios }, { data: advEidRows }] = await Promise.all([
    advIds.length
      ? supabase.from("profiles").select("id, nome, avatar_url, localizacao").in("id", advIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string | null; avatar_url: string | null; localizacao: string | null }> }),
    advIds.length > 0 && advSportIds.length > 0
      ? supabase
          .from("usuario_eid")
          .select("usuario_id, esporte_id, nota_eid")
          .in("usuario_id", advIds)
          .in("esporte_id", advSportIds)
      : Promise.resolve({ data: [] as Array<{ usuario_id: string; esporte_id: number; nota_eid: number | null }> }),
  ]);
  const advMap = new Map((adversarios ?? []).map((p) => [p.id, p]));
  const advEidMap = new Map(
    (advEidRows ?? []).map((row) => [`${String(row.usuario_id)}:${Number(row.esporte_id)}`, Number(row.nota_eid ?? 0)]),
  );

  return {
    pendentesRankingStatus,
    timeRowById,
    espMap,
    pendentesEnvio: (pendentesEnvio ?? []) as AgendaPendenteEnvioRow[],
    advMap,
    advEidMap,
  };
}

/**
 * Payload completo da agenda: reutiliza a 1ª fase em cache e acrescenta pendentes / adversários.
 */
export const getAgendaRestPayload = cache(
  async (
    supabase: SupabaseClient,
    userId: string,
    teamClause: string,
    agendaTeamIds: number[],
  ): Promise<AgendaPagePayload> => {
    const base = await getAgendaConfrontosPayload(supabase, userId, teamClause, agendaTeamIds);
    const ext = await loadAgendaPendentesExtension(supabase, userId, agendaTeamIds);
    return { ...base, ...ext };
  },
);

/** Alias de `getAgendaRestPayload` (payload completo). */
export const getAgendaPagePayload = getAgendaRestPayload;
