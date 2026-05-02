import type { SupabaseClient } from "@supabase/supabase-js";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import { isEsportePermitidoDesafioPerfilIndividual } from "@/lib/match/esporte-match-individual-policy";
import { isSportMatchEnabled } from "@/lib/sport-capabilities";

export type RadarTipo = "atleta" | "dupla" | "time" | "todas";
export type SortBy = "eid_score" | "match_ranking_points";

export type MatchRadarCard = {
  id: string;
  nome: string;
  localizacao: string;
  esporteNome: string;
  esporteId: number;
  dist: number;
  eid: number;
  rank: number;
  modalidade: "individual" | "dupla" | "time";
  interesseMatch: "ranking" | "ranking_e_amistoso" | "amistoso";
  href: string;
  canChallenge: boolean;
  challengeHint?: string;
  avatarUrl: string | null;
  /** Disponível para amistoso (verde) — perfil ou time */
  disponivelAmistoso: boolean;
  /** Gênero do perfil (quando modalidade individual). */
  genero?: "Masculino" | "Feminino" | "Outro" | null;
  /** @deprecated Um card por esporte; não agrupar na UI. */
  groupedIndividualSports?: MatchRadarCard[];
  /** Vitórias / derrotas registradas no esporte (modalidade individual — `usuario_eid`). */
  vitorias?: number;
  derrotas?: number;
  /** Posição no ranking (mesmo esporte + modalidade), quando calculável. */
  posicaoRank?: number | null;
};

type AtletaRow = {
  usuario_id: string;
  nome: string | null;
  localizacao: string | null;
  esporte_id: number | null;
  esporte_nome: string | null;
  dist_km: number | null;
  nota_eid: number | null;
  pontos_ranking: number | null;
  modalidade_match: string | null;
  interesse_match: string | null;
  avatar_url?: string | null;
  disponivel_amistoso?: boolean | null;
  vitorias?: number | null;
  derrotas?: number | null;
  posicao_rank?: number | null;
};

type FormacaoRow = {
  id: number;
  nome: string | null;
  localizacao: string | null;
  esporte_id: number | null;
  esporte_nome: string | null;
  dist_km: number | null;
  eid_time: number | null;
  pontos_ranking: number | null;
  interesse_match: string | null;
  can_challenge: boolean | null;
  disponivel_amistoso?: boolean | null;
  vitorias?: number | null;
  derrotas?: number | null;
};

export type MatchRadarFinalidade = "ranking" | "amistoso";

/** Página de estatísticas EID no esporte (perfil atleta, dupla ou time), com retorno ao Match. */
export function matchCardEidStatsHref(card: MatchRadarCard): string | null {
  if (!card.esporteId || card.esporteId <= 0) return null;
  const from = encodeURIComponent("/match");
  if (card.modalidade === "individual") {
    return `/perfil/${encodeURIComponent(card.id)}/eid/${card.esporteId}?from=${from}`;
  }
  /** No radar, dupla e time usam `times.id`; `/perfil-time/[id]` cobre ambos (tipo dupla no registro). */
  return `/perfil-time/${encodeURIComponent(card.id)}/eid/${card.esporteId}?from=${from}`;
}

/**
 * Posição no ranking de formações: mesma regra do perfil (`perfil-time` / `perfil-dupla`):
 * 1 + quantidade de times no mesmo esporte e modalidade com pontos estritamente maiores.
 */
async function enrichFormationCardsRankPosition(
  supabase: SupabaseClient,
  cards: MatchRadarCard[]
): Promise<MatchRadarCard[]> {
  const targets = cards.filter((c) => c.modalidade === "dupla" || c.modalidade === "time");
  if (targets.length === 0) return cards;

  const esporteIds = [...new Set(targets.map((c) => c.esporteId).filter((n) => Number.isFinite(n) && n > 0))];
  if (esporteIds.length === 0) return cards;

  const { data: rows } = await supabase.from("times").select("id, esporte_id, tipo, pontos_ranking").in("esporte_id", esporteIds);

  type TRow = { id: number; esporte_id: number | null; tipo: string | null; pontos_ranking: number | null };
  const rowsTyped = (rows ?? []) as TRow[];

  return cards.map((c) => {
    if (c.modalidade !== "dupla" && c.modalidade !== "time") return c;
    const tid = Number(c.id);
    if (!Number.isFinite(tid)) return c;
    const eid = Number(c.esporteId);
    const bucketDupla = c.modalidade === "dupla";

    const selfRow = rowsTyped.find((r) => Number(r.id) === tid);
    const pts = Number(selfRow?.pontos_ranking ?? c.rank ?? 0);

    const inBucket = rowsTyped.filter((r) => {
      if (Number(r.esporte_id ?? 0) !== eid) return false;
      const rt = String(r.tipo ?? "").trim().toLowerCase();
      const isDupla = rt === "dupla";
      return bucketDupla ? isDupla : !isDupla;
    });

    const acima = inBucket.filter((r) => Number(r.pontos_ranking ?? 0) > pts).length;
    return { ...c, posicaoRank: acima + 1 };
  });
}

/**
 * Posição individual: só pontos de ranking (`pontos_ranking` desc). Nota EID não entra na ordem.
 * Desempate estável por `usuario_id` para posição determinística em empates de pontos.
 * Se não achar na lista, usa `posicao_rank` vindo do RPC.
 */
async function enrichIndividualCardsRankPosition(
  supabase: SupabaseClient,
  cards: MatchRadarCard[]
): Promise<MatchRadarCard[]> {
  const ind = cards.filter((c) => c.modalidade === "individual");
  if (ind.length === 0) return cards;

  const esporteIds = [...new Set(ind.map((c) => c.esporteId).filter((n) => Number.isFinite(n) && n > 0))];
  if (esporteIds.length === 0) return cards;

  const posByUsuarioEsporte = new Map<string, number>();

  for (const eid of esporteIds) {
    const { data: rankingRows } = await supabase
      .from("usuario_eid")
      .select("usuario_id, pontos_ranking")
      .eq("esporte_id", eid)
      .order("pontos_ranking", { ascending: false })
      .order("usuario_id", { ascending: true })
      .limit(8000);

    (rankingRows ?? []).forEach((r, idx) => {
      const uid = String((r as { usuario_id?: string }).usuario_id ?? "");
      if (!uid) return;
      const key = `${uid}:${eid}`;
      if (!posByUsuarioEsporte.has(key)) posByUsuarioEsporte.set(key, idx + 1);
    });
  }

  return cards.map((c) => {
    if (c.modalidade !== "individual") return c;
    const computed = posByUsuarioEsporte.get(`${c.id}:${c.esporteId}`);
    const stored = c.posicaoRank;
    const pos =
      computed != null && computed > 0 ? computed : stored != null && stored > 0 ? stored : null;
    return { ...c, posicaoRank: pos };
  });
}

/** Alinha ao SQL `buscar_match_formacoes` e ao app (`times.tipo ?? "time"`). */
export function formacaoKindFromTipoRaw(tipoRaw: string | null | undefined): "dupla" | "time" {
  return String(tipoRaw ?? "").trim().toLowerCase() === "dupla" ? "dupla" : "time";
}

/** Formações em que o viewer é líder ou membro ativo (mesma regra do radar de dupla/time). */
async function loadViewerFormationTimeIds(
  supabase: SupabaseClient,
  viewerId: string,
  modalidadeFormacao: "dupla" | "time",
  eidNumForMine: number | null
): Promise<Set<number>> {
  const viewerFormationTimeIds = new Set<number>();
  let ownedQuery = supabase.from("times").select("id, tipo").eq("criador_id", viewerId);
  if (eidNumForMine != null) ownedQuery = ownedQuery.eq("esporte_id", eidNumForMine);
  const { data: ownedTeams } = await ownedQuery;
  for (const r of ownedTeams ?? []) {
    if (formacaoKindFromTipoRaw((r as { tipo?: string | null }).tipo) !== modalidadeFormacao) continue;
    const id = Number((r as { id?: number }).id ?? 0);
    if (Number.isFinite(id) && id > 0) viewerFormationTimeIds.add(id);
  }
  const { data: memRows } = await supabase
    .from("membros_time")
    .select("time_id, times!inner(esporte_id, tipo)")
    .eq("usuario_id", viewerId)
    .in("status", ["ativo", "aceito", "aprovado"]);
  for (const row of memRows ?? []) {
    const mr = row as {
      time_id?: number | null;
      times?:
        | { esporte_id?: number | null; tipo?: string | null }
        | { esporte_id?: number | null; tipo?: string | null }[]
        | null;
    };
    const tMeta = Array.isArray(mr.times) ? mr.times[0] : mr.times;
    if (!tMeta) continue;
    if (eidNumForMine != null && Number(tMeta.esporte_id ?? 0) !== eidNumForMine) continue;
    if (formacaoKindFromTipoRaw(tMeta.tipo) !== modalidadeFormacao) continue;
    const tid = Number(mr.time_id ?? 0);
    if (Number.isFinite(tid) && tid > 0) viewerFormationTimeIds.add(tid);
  }
  return viewerFormationTimeIds;
}

export type RadarSnapshotInput = {
  viewerId: string;
  tipo: RadarTipo;
  sortBy: SortBy;
  raio: number;
  esporteSelecionado: string;
  lat: number;
  lng: number;
  /** Aba do radar: ranking (padrão) ou amistoso — filtra cartões e define link do desafio. */
  finalidade: MatchRadarFinalidade;
  /**
   * No modo tela cheia, não oculta oponentes individuais já em confronto ativo (apenas atleta).
   * Dupla/time ocultam a outra formação (desafiante ou desafiada) com match ativo no mesmo esporte.
   */
  includeActiveOpponents?: boolean;
};

export async function fetchMatchRadarCards(
  supabase: SupabaseClient,
  input: RadarSnapshotInput
): Promise<MatchRadarCard[]> {
  const { viewerId, tipo, sortBy, raio, esporteSelecionado, lat, lng, finalidade, includeActiveOpponents } = input;
  if (tipo === "todas") {
    return [];
  }
  const esporteId = /^\d+$/.test(esporteSelecionado) ? Number(esporteSelecionado) : null;
  /** `p_esporte_id` null no RPC lista todos os esportes — nunca usar sem filtrar pelo perfil do viewer. */
  if (esporteId == null || !Number.isFinite(esporteId) || esporteId <= 0) {
    return [];
  }

  let cards: MatchRadarCard[] = [];

  const modalidadeFormacaoEarly: "dupla" | "time" | null = tipo === "dupla" ? "dupla" : tipo === "time" ? "time" : null;
  const eidNumForMineEarly =
    Number.isFinite(Number(esporteId)) && Number(esporteId) > 0 ? Number(esporteId) : null;
  const viewerFormationTimeIdsForBlock =
    modalidadeFormacaoEarly != null
      ? await loadViewerFormationTimeIds(supabase, viewerId, modalidadeFormacaoEarly, eidNumForMineEarly)
      : new Set<number>();

  const { data: activeMatches } = await supabase
    .from("matches")
    .select(
      "usuario_id, adversario_id, adversario_time_id, desafiante_time_id, esporte_id, status, modalidade_confronto"
    )
    .in("status", ["Pendente", "Aceito", "CancelamentoPendente", "ReagendamentoPendente"]);
  const activeOpponentIds = new Set<string>();
  /** Times adversários a ocultar (lado desafiante) ou times desafiantes a ocultar (lado desafiado). */
  const blockedFormationTeamIdsFromMatches = new Set<number>();
  const activeStatuses = new Set(["Pendente", "Aceito", "CancelamentoPendente", "ReagendamentoPendente"]);
  /**
   * Só esconde dupla/time no radar por `matches` em fluxo “vale confronto”: pedido pendente, aceito ou reagendamento.
   * `CancelamentoPendente`: cancelamento em andamento — não bloqueia sugestão (alinhado à SQL `buscar_match_formacoes`, só `Pendente`).
   */
  const formationMatchBlockStatuses = new Set(["Pendente", "Aceito", "ReagendamentoPendente"]);

  for (const m of activeMatches ?? []) {
    const st = String((m as { status?: string | null }).status ?? "");
    if (!activeStatuses.has(st)) continue;

    const usuarioId = String((m as { usuario_id?: string | null }).usuario_id ?? "");
    const adversarioId = String((m as { adversario_id?: string | null }).adversario_id ?? "");
    const mEsporte = Number((m as { esporte_id?: number | null }).esporte_id ?? 0);

    const advTimeRaw = (m as { adversario_time_id?: number | null }).adversario_time_id;
    const desTimeRaw = (m as { desafiante_time_id?: number | null }).desafiante_time_id;
    const advT = Number(advTimeRaw ?? 0);
    const desT = Number(desTimeRaw ?? 0);

    if (formationMatchBlockStatuses.has(st)) {
      if (
        modalidadeFormacaoEarly != null &&
        eidNumForMineEarly != null &&
        mEsporte === eidNumForMineEarly &&
        Number.isFinite(advT) &&
        advT > 0
      ) {
        const viewerIsChallengerCaptain = usuarioId === viewerId;
        const viewerInChallengerTeam = Number.isFinite(desT) && desT > 0 && viewerFormationTimeIdsForBlock.has(desT);
        if (viewerIsChallengerCaptain || viewerInChallengerTeam) {
          blockedFormationTeamIdsFromMatches.add(advT);
        }
      }

      if (
        modalidadeFormacaoEarly != null &&
        eidNumForMineEarly != null &&
        mEsporte === eidNumForMineEarly &&
        Number.isFinite(desT) &&
        desT > 0
      ) {
        const viewerIsChallengedCaptain = adversarioId === viewerId;
        const viewerInChallengedTeam = Number.isFinite(advT) && advT > 0 && viewerFormationTimeIdsForBlock.has(advT);
        if (viewerIsChallengedCaptain || viewerInChallengedTeam) {
          blockedFormationTeamIdsFromMatches.add(desT);
        }
      }
    }

    if (!includeActiveOpponents) {
      const modRaw = String((m as { modalidade_confronto?: string | null }).modalidade_confronto ?? "").trim().toLowerCase();
      if (modRaw && modRaw !== "individual") continue;
      if (usuarioId === viewerId && adversarioId) activeOpponentIds.add(adversarioId);
      else if (adversarioId === viewerId && usuarioId) activeOpponentIds.add(usuarioId);
    }
  }

  function norm(v: string | null | undefined): string {
    return String(v ?? "")
      .trim()
      .toLowerCase();
  }

  function isIndividualMatchRow(modalidadeRaw: string | null | undefined): boolean {
    return norm(modalidadeRaw) === "individual";
  }

  function partidaDentroRankingCooldown(p: Record<string, unknown>, cutoffMs: number): boolean {
    const status = norm((p as { status?: string | null }).status);
    const statusRanking = norm((p as { status_ranking?: string | null }).status_ranking);
    const valid =
      statusRanking === "validado" ||
      ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(status);
    if (!valid) return false;
    const dtRaw =
      (p as { data_resultado?: string | null }).data_resultado ??
      (p as { data_partida?: string | null }).data_partida ??
      (p as { data_registro?: string | null }).data_registro ??
      null;
    if (!dtRaw) return false;
    const ts = new Date(dtRaw).getTime();
    return Number.isFinite(ts) && ts >= cutoffMs;
  }

  const blockedOpponentUsersByCooldown = new Set<string>();
  /** Times já enfrentados no ranking (1x1 vs time, time×time) dentro da carência — esconde sugestão de time. */
  const blockedOpponentTeamIdsByCooldown = new Set<number>();
  let rankingCooldownCutoffMs: number | null = null;
  if (finalidade === "ranking" && Number.isFinite(esporteId) && Number(esporteId) > 0) {
    const cooldownMeses = await getMatchRankCooldownMeses(supabase);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - cooldownMeses);
    rankingCooldownCutoffMs = cutoff.getTime();
    const { data: partRows } = await supabase
      .from("partidas")
      .select(
        "jogador1_id, jogador2_id, time1_id, time2_id, status, status_ranking, data_resultado, data_registro, data_partida"
      )
      .eq("esporte_id", Number(esporteId))
      .is("torneio_id", null)
      .or(`jogador1_id.eq.${viewerId},jogador2_id.eq.${viewerId}`)
      .order("id", { ascending: false })
      .limit(300);
    for (const p of partRows ?? []) {
      if (!partidaDentroRankingCooldown(p as Record<string, unknown>, rankingCooldownCutoffMs)) continue;
      const j1 = String((p as { jogador1_id?: string | null }).jogador1_id ?? "");
      const j2 = String((p as { jogador2_id?: string | null }).jogador2_id ?? "");
      const t1 = Number((p as { time1_id?: number | null }).time1_id ?? 0);
      const t2 = Number((p as { time2_id?: number | null }).time2_id ?? 0);
      if (j1 === viewerId && j2) blockedOpponentUsersByCooldown.add(j2);
      else if (j2 === viewerId && j1) blockedOpponentUsersByCooldown.add(j1);
      if (j1 === viewerId && Number.isFinite(t2) && t2 > 0) blockedOpponentTeamIdsByCooldown.add(t2);
      if (j2 === viewerId && Number.isFinite(t1) && t1 > 0) blockedOpponentTeamIdsByCooldown.add(t1);
    }
  }

  if (tipo === "atleta") {
    const { data: espRows } = await supabase
      .from("esportes")
      .select("id, nome, tipo, permite_individual")
      .eq("ativo", true)
      .eq("categoria_processamento", "confronto")
      .order("ordem", { ascending: true });
    const esporteIdsRadarIndividual = new Set(
      (espRows ?? [])
        .filter((r) => isSportMatchEnabled((r as { nome?: string | null }).nome))
        .filter((r) =>
          isEsportePermitidoDesafioPerfilIndividual(
            (r as { tipo?: string | null }).tipo,
            (r as { permite_individual?: boolean | null }).permite_individual
          )
        )
        .map((r) => Number((r as { id?: number }).id))
        .filter((n) => Number.isFinite(n) && n > 0)
    );

    const { data } = await supabase.rpc("buscar_match_atletas", {
      p_viewer_id: viewerId,
      p_lat: lat,
      p_lng: lng,
      p_esporte_id: esporteId,
      p_raio_km: raio,
      p_limit: 500,
    });

    const baseCards: MatchRadarCard[] = ((data ?? []) as AtletaRow[])
      .filter((row) => !activeOpponentIds.has(String(row.usuario_id ?? "")))
      .filter((row) => !blockedOpponentUsersByCooldown.has(String(row.usuario_id ?? "")))
      .filter((row) => isIndividualMatchRow(row.modalidade_match))
      .filter((row) => esporteIdsRadarIndividual.has(Number(row.esporte_id ?? 0)))
      .map((row) => {
      return {
        id: String(row.usuario_id),
        nome: String(row.nome ?? "Atleta"),
        localizacao: String(row.localizacao ?? "Localização não informada"),
        esporteNome: String(row.esporte_nome ?? "Esporte"),
        esporteId: Number(row.esporte_id ?? 0),
        dist: Number(row.dist_km ?? 99999),
        eid: Number(row.nota_eid ?? 0),
        rank: Number(row.pontos_ranking ?? 0),
        modalidade: "individual",
        interesseMatch:
          row.interesse_match === "ranking"
            ? "ranking"
            : row.interesse_match === "amistoso"
              ? "amistoso"
              : "ranking_e_amistoso",
        href: `/perfil/${encodeURIComponent(String(row.usuario_id ?? ""))}?from=/match`,
        canChallenge: true,
        avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
        disponivelAmistoso: row.disponivel_amistoso === true,
        genero: null,
        vitorias: Number(row.vitorias ?? 0),
        derrotas: Number(row.derrotas ?? 0),
        posicaoRank:
          row.posicao_rank != null && Number.isFinite(Number(row.posicao_rank)) && Number(row.posicao_rank) >= 1
            ? Math.round(Number(row.posicao_rank))
            : null,
      };
    });

    const ids = [...new Set(baseCards.map((c) => c.id))];
    if (ids.length > 0) {
      const { data: profRows } = await supabase
        .from("profiles")
        .select("id, genero, match_maioridade_confirmada")
        .in("id", ids);
      const generoByUser = new Map<string, "Masculino" | "Feminino" | "Outro" | null>();
      const eligibleByUser = new Set<string>();
      for (const row of profRows ?? []) {
        const id = String((row as { id: string }).id);
        if ((row as { match_maioridade_confirmada?: boolean | null }).match_maioridade_confirmada === true) {
          eligibleByUser.add(id);
        }
        const g = String((row as { genero?: string | null }).genero ?? "").trim().toLowerCase();
        if (g === "masculino") generoByUser.set(id, "Masculino");
        else if (g === "feminino") generoByUser.set(id, "Feminino");
        else if (g) generoByUser.set(id, "Outro");
        else generoByUser.set(id, null);
      }
      cards = baseCards
        .filter((c) => eligibleByUser.has(c.id))
        .map((c) => ({ ...c, genero: generoByUser.get(c.id) ?? null }));
    } else {
      cards = baseCards;
    }

    cards = await enrichIndividualCardsRankPosition(supabase, cards);
  } else {
    const modalidadeFormacao: "dupla" | "time" = tipo === "dupla" ? "dupla" : "time";

    const { data: formacoes } = await supabase.rpc("buscar_match_formacoes", {
      p_viewer_id: viewerId,
      p_tipo: tipo,
      p_lat: lat,
      p_lng: lng,
      p_esporte_id: esporteId,
      p_raio_km: raio,
      p_limit: 300,
    });

    /** Formações do próprio viewer (líder ou membro) nesta modalidade — não sugerir a si; carência time×time usa esporte explícito. */
    const viewerFormationTimeIds = viewerFormationTimeIdsForBlock;
    const eidNumForMine =
      Number.isFinite(Number(esporteId)) && Number(esporteId) > 0 ? Number(esporteId) : null;

    if (
      finalidade === "ranking" &&
      rankingCooldownCutoffMs != null &&
      eidNumForMine != null &&
      viewerFormationTimeIds.size > 0
    ) {
      const idArr = [...viewerFormationTimeIds].filter((n) => Number.isFinite(n) && n > 0).slice(0, 80);
      const idList = idArr.join(",");
      if (idList.length > 0) {
        const mine = new Set(idArr);
        const { data: partTeamRows } = await supabase
          .from("partidas")
          .select("time1_id, time2_id, status, status_ranking, data_resultado, data_registro, data_partida")
          .eq("esporte_id", eidNumForMine)
          .is("torneio_id", null)
          .or(`time1_id.in.(${idList}),time2_id.in.(${idList})`)
          .order("id", { ascending: false })
          .limit(300);
        for (const p of partTeamRows ?? []) {
          if (!partidaDentroRankingCooldown(p as Record<string, unknown>, rankingCooldownCutoffMs)) continue;
          const t1 = Number((p as { time1_id?: number | null }).time1_id ?? 0);
          const t2 = Number((p as { time2_id?: number | null }).time2_id ?? 0);
          if (mine.has(t1) && Number.isFinite(t2) && t2 > 0) blockedOpponentTeamIdsByCooldown.add(t2);
          if (mine.has(t2) && Number.isFinite(t1) && t1 > 0) blockedOpponentTeamIdsByCooldown.add(t1);
        }
      }
    }

    const timeRows = ((formacoes ?? []) as FormacaoRow[]).filter((t) => Number.isFinite(Number(t.id)) && Number(t.id) > 0);
    const { data: ownersAll } =
      timeRows.length > 0
        ? await supabase
            .from("times")
            .select("id, criador_id")
            .in(
              "id",
              timeRows.map((t) => Number(t.id))
            )
        : { data: [] as Array<{ id: number; criador_id: string | null }> };
    const ownerByTeamId = new Map<number, string>(
      (ownersAll ?? [])
        .map((row) => ({
          id: Number((row as { id?: number | null }).id ?? 0),
          ownerId: String((row as { criador_id?: string | null }).criador_id ?? ""),
        }))
        .filter((row) => Number.isFinite(row.id) && row.id > 0 && row.ownerId)
        .map((row) => [row.id, row.ownerId])
    );
    // Não sugerir formações do próprio elenco (líder ou membro).
    const teamRowsNotMine = timeRows.filter((t) => !viewerFormationTimeIds.has(Number(t.id)));
    const blockedTeamIds = new Set<number>();
    for (const tid of blockedFormationTeamIdsFromMatches) {
      if (Number.isFinite(tid) && tid > 0) blockedTeamIds.add(tid);
    }
    const teamRowsVisible = teamRowsNotMine.filter((t) => !blockedTeamIds.has(Number(t.id)));
    let eligibleTeamIds = new Set<number>(teamRowsVisible.map((t) => Number(t.id)));
    if (teamRowsVisible.length > 0) {
      const ownersVisible = (ownersAll ?? []).filter((r) =>
        teamRowsVisible.some((t) => Number(t.id) === Number((r as { id?: number | null }).id ?? 0))
      );
      const ownerIds = [...new Set(ownersVisible.map((r) => String((r as { criador_id?: string | null }).criador_id ?? "")).filter(Boolean))];
      if (ownerIds.length > 0) {
        const { data: ownerProfiles } = await supabase
          .from("profiles")
          .select("id, match_maioridade_confirmada")
          .in("id", ownerIds);
        const ownerEligible = new Set(
          (ownerProfiles ?? [])
            .filter((p) => (p as { match_maioridade_confirmada?: boolean | null }).match_maioridade_confirmada === true)
            .map((p) => String((p as { id: string }).id))
        );
        eligibleTeamIds = new Set(
          ownersVisible
            .filter((r) => ownerEligible.has(String((r as { criador_id?: string | null }).criador_id ?? "")))
            .map((r) => Number((r as { id?: number | null }).id ?? 0))
            .filter((id) => Number.isFinite(id) && id > 0)
        );
      } else {
        eligibleTeamIds = new Set<number>();
      }
    }
    let teamRowsByCooldown = teamRowsVisible;
    if (finalidade === "ranking") {
      const blockedTeamIdsByCooldown = new Set<number>();
      for (const tid of blockedOpponentTeamIdsByCooldown) {
        if (Number.isFinite(tid) && tid > 0) blockedTeamIdsByCooldown.add(tid);
      }
      if (blockedTeamIdsByCooldown.size > 0) {
        teamRowsByCooldown = teamRowsVisible.filter((t) => !blockedTeamIdsByCooldown.has(Number(t.id)));
      }
    }
    const teamRowsEligible = teamRowsByCooldown.filter((t) => eligibleTeamIds.has(Number(t.id)));
    const eligibleIds = teamRowsEligible.map((t) => Number(t.id)).filter((id) => Number.isFinite(id) && id > 0);
    const { data: teamShields } =
      eligibleIds.length > 0
        ? await supabase.from("times").select("id, escudo").in("id", eligibleIds)
        : { data: [] as Array<{ id: number; escudo: string | null }> };
    const shieldByTeamId = new Map<number, string | null>(
      (teamShields ?? []).map((row) => [Number((row as { id?: number | null }).id ?? 0), (row as { escudo?: string | null }).escudo ?? null])
    );

    cards = teamRowsEligible.map((t) => ({
      id: String(t.id),
      nome: String(t.nome ?? "Time"),
      localizacao: String(t.localizacao ?? "Localização não informada"),
      esporteNome: String(t.esporte_nome ?? "Esporte"),
      esporteId: Number(t.esporte_id ?? 0),
      dist: Number(t.dist_km ?? 99999),
      eid: Number(t.eid_time ?? 0),
      rank: Number(t.pontos_ranking ?? 0),
      modalidade: modalidadeFormacao,
      interesseMatch: t.interesse_match === "ranking" ? "ranking" : "ranking_e_amistoso",
      href: `/perfil-time/${t.id}?from=/match`,
      canChallenge: Boolean(t.can_challenge),
      challengeHint: Boolean(t.can_challenge)
        ? undefined
        : /^\d+$/.test(esporteSelecionado)
          ? `Somente o líder da formação pode desafiar. Crie sua ${modalidadeFormacao} neste esporte como líder.`
          : `Selecione um esporte e seja proprietário de uma ${modalidadeFormacao} para desafiar.`,
      avatarUrl: shieldByTeamId.get(Number(t.id)) ?? null,
      disponivelAmistoso: t.disponivel_amistoso === true,
      genero: null,
      vitorias: Number(t.vitorias ?? 0),
      derrotas: Number(t.derrotas ?? 0),
    }));
  }

  if (tipo !== "atleta") {
    cards = await enrichFormationCardsRankPosition(supabase, cards);
  }

  return filterAndSortRadarCards(cards, { sortBy, raio, finalidade });
}

/**
 * Vários esportes na mesma aba (ex.: chip “Todos” com tênis e futebol no perfil) sem chamar RPC com `p_esporte_id` null.
 */
export async function fetchMatchRadarCardsMultiSameTipo(
  supabase: SupabaseClient,
  input: {
    viewerId: string;
    tipo: Exclude<RadarTipo, "todas">;
    sortBy: SortBy;
    raio: number;
    esporteIds: string[];
    lat: number;
    lng: number;
    finalidade: MatchRadarFinalidade;
    includeActiveOpponents?: boolean;
  }
): Promise<MatchRadarCard[]> {
  const ids = [...new Set(input.esporteIds.filter((id) => /^\d+$/.test(id)))];
  if (ids.length === 0) return [];
  const { viewerId, tipo, sortBy, raio, lat, lng, finalidade, includeActiveOpponents } = input;
  const perSport = await Promise.all(
    ids.map((eid) =>
      fetchMatchRadarCards(supabase, {
        viewerId,
        tipo,
        sortBy,
        raio,
        esporteSelecionado: eid,
        lat,
        lng,
        finalidade,
        includeActiveOpponents: includeActiveOpponents === true,
      })
    )
  );
  return dedupeMatchRadarCardsMerged(perSport.flat());
}

function dedupeMatchRadarCardsMerged(cards: MatchRadarCard[]): MatchRadarCard[] {
  const byKey = new Map<string, MatchRadarCard>();
  for (const card of cards) {
    const key = `${card.modalidade}:${card.id}:${card.esporteId}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, card);
      continue;
    }
    if (prev.interesseMatch !== "ranking_e_amistoso" && card.interesseMatch === "ranking_e_amistoso") {
      byKey.set(key, card);
    }
  }
  return Array.from(byKey.values());
}

/**
 * Grade do /match com modalidade "todas": mesma mistura da dashboard (individual + dupla + time) por esporte(s).
 */
export async function fetchMatchRadarCardsTodasMerged(
  supabase: SupabaseClient,
  input: {
    viewerId: string;
    sortBy: SortBy;
    raio: number;
    esporteIds: string[];
    lat: number;
    lng: number;
    finalidade: MatchRadarFinalidade;
  }
): Promise<MatchRadarCard[]> {
  const { viewerId, sortBy, raio, esporteIds, lat, lng, finalidade } = input;
  const ids = [...new Set(esporteIds.filter((id) => /^\d+$/.test(id)))];
  if (ids.length === 0) return [];

  if (finalidade === "amistoso") {
    const perSport = await Promise.all(
      ids.map((eid) =>
        fetchMatchRadarCards(supabase, {
          viewerId,
          tipo: "atleta",
          sortBy,
          raio,
          esporteSelecionado: eid,
          lat,
          lng,
          finalidade: "amistoso",
          includeActiveOpponents: true,
        })
      )
    );
    return dedupeMatchRadarCardsMerged(perSport.flat());
  }

  const perSport = await Promise.all(
    ids.map((eid) =>
      Promise.all([
        fetchMatchRadarCards(supabase, {
          viewerId,
          tipo: "atleta",
          sortBy,
          raio,
          esporteSelecionado: eid,
          lat,
          lng,
          finalidade: "ranking",
          includeActiveOpponents: true,
        }),
        fetchMatchRadarCards(supabase, {
          viewerId,
          tipo: "atleta",
          sortBy,
          raio,
          esporteSelecionado: eid,
          lat,
          lng,
          finalidade: "amistoso",
          includeActiveOpponents: true,
        }),
        fetchMatchRadarCards(supabase, {
          viewerId,
          tipo: "dupla",
          sortBy,
          raio,
          esporteSelecionado: eid,
          lat,
          lng,
          finalidade: "ranking",
          includeActiveOpponents: true,
        }),
        fetchMatchRadarCards(supabase, {
          viewerId,
          tipo: "time",
          sortBy,
          raio,
          esporteSelecionado: eid,
          lat,
          lng,
          finalidade: "ranking",
          includeActiveOpponents: true,
        }),
      ])
    )
  );
  return dedupeMatchRadarCardsMerged(perSport.flat(2));
}

export function filterAndSortRadarCards(
  cards: MatchRadarCard[],
  opts: { sortBy: SortBy; raio: number; finalidade: MatchRadarFinalidade }
): MatchRadarCard[] {
  const { sortBy, raio, finalidade } = opts;
  const canOrderByDistance = true;

  let list = cards;
  if (finalidade === "ranking") {
    list = list.filter((c) => c.interesseMatch !== "amistoso");
  } else {
    list = list.filter((c) => c.interesseMatch !== "ranking" && c.disponivelAmistoso);
  }

  return list
    .filter((c) => (!canOrderByDistance ? true : c.dist <= raio))
    .sort((a, b) => {
      if (a.disponivelAmistoso !== b.disponivelAmistoso) return a.disponivelAmistoso ? -1 : 1;
      if (a.dist !== b.dist) return a.dist - b.dist;
      if (sortBy === "match_ranking_points" && b.rank !== a.rank) return b.rank - a.rank;
      if (sortBy === "eid_score" && b.eid !== a.eid) return b.eid - a.eid;
      return a.nome.localeCompare(b.nome, "pt-BR");
    })
    .slice(0, 40);
}
