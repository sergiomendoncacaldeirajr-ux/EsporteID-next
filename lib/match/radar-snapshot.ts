import type { SupabaseClient } from "@supabase/supabase-js";

export type RadarTipo = "atleta" | "dupla" | "time";
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
};

export type MatchRadarFinalidade = "ranking" | "amistoso";

/** Página de estatísticas EID no esporte (perfil atleta, dupla ou time), com retorno ao Match. */
export function matchCardEidStatsHref(card: MatchRadarCard): string | null {
  if (!card.esporteId || card.esporteId <= 0) return null;
  const from = encodeURIComponent("/match");
  if (card.modalidade === "individual") {
    return `/perfil/${encodeURIComponent(card.id)}/eid/${card.esporteId}?from=${from}`;
  }
  if (card.modalidade === "dupla") {
    return `/perfil-dupla/${encodeURIComponent(card.id)}/eid/${card.esporteId}?from=${from}`;
  }
  return `/perfil-time/${encodeURIComponent(card.id)}/eid/${card.esporteId}?from=${from}`;
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
};

export async function fetchMatchRadarCards(
  supabase: SupabaseClient,
  input: RadarSnapshotInput
): Promise<MatchRadarCard[]> {
  const { viewerId, tipo, sortBy, raio, esporteSelecionado, lat, lng, finalidade } = input;
  const esporteId = /^\d+$/.test(esporteSelecionado) ? Number(esporteSelecionado) : null;

  let cards: MatchRadarCard[] = [];
  const { data: activeMatches } = await supabase
    .from("matches")
    .select("usuario_id, adversario_id, status")
    .or(`usuario_id.eq.${viewerId},adversario_id.eq.${viewerId}`)
    .in("status", ["Pendente", "Aceito", "CancelamentoPendente", "ReagendamentoPendente"]);
  const activeOpponentIds = new Set<string>();
  for (const m of activeMatches ?? []) {
    const usuarioId = String((m as { usuario_id?: string | null }).usuario_id ?? "");
    const adversarioId = String((m as { adversario_id?: string | null }).adversario_id ?? "");
    if (usuarioId === viewerId && adversarioId) activeOpponentIds.add(adversarioId);
    else if (adversarioId === viewerId && usuarioId) activeOpponentIds.add(usuarioId);
  }

  if (tipo === "atleta") {
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
  } else {
    const { data: formacoes } = await supabase.rpc("buscar_match_formacoes", {
      p_viewer_id: viewerId,
      p_tipo: tipo,
      p_lat: lat,
      p_lng: lng,
      p_esporte_id: esporteId,
      p_raio_km: raio,
      p_limit: 300,
    });

    const timeRows = ((formacoes ?? []) as FormacaoRow[]).filter((t) => Number.isFinite(Number(t.id)) && Number(t.id) > 0);
    let blockedTeamIds = new Set<number>();
    if (timeRows.length > 0 && activeOpponentIds.size > 0) {
      const { data: timesOwners } = await supabase
        .from("times")
        .select("id, criador_id")
        .in(
          "id",
          timeRows.map((t) => Number(t.id))
        );
      blockedTeamIds = new Set(
        (timesOwners ?? [])
          .filter((row) => activeOpponentIds.has(String((row as { criador_id?: string | null }).criador_id ?? "")))
          .map((row) => Number((row as { id?: number | null }).id ?? 0))
          .filter((id) => Number.isFinite(id) && id > 0)
      );
    }
    const teamRowsVisible = timeRows.filter((t) => !blockedTeamIds.has(Number(t.id)));
    let eligibleTeamIds = new Set<number>(teamRowsVisible.map((t) => Number(t.id)));
    if (teamRowsVisible.length > 0) {
      const { data: owners } = await supabase
        .from("times")
        .select("id, criador_id")
        .in(
          "id",
          teamRowsVisible.map((t) => Number(t.id))
        );
      const ownerIds = [...new Set((owners ?? []).map((r) => String((r as { criador_id?: string | null }).criador_id ?? "")).filter(Boolean))];
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
          (owners ?? [])
            .filter((r) => ownerEligible.has(String((r as { criador_id?: string | null }).criador_id ?? "")))
            .map((r) => Number((r as { id?: number | null }).id ?? 0))
            .filter((id) => Number.isFinite(id) && id > 0)
        );
      } else {
        eligibleTeamIds = new Set<number>();
      }
    }
    cards = teamRowsVisible.filter((t) => eligibleTeamIds.has(Number(t.id))).map((t) => ({
      id: String(t.id),
      nome: String(t.nome ?? "Time"),
      localizacao: String(t.localizacao ?? "Localização não informada"),
      esporteNome: String(t.esporte_nome ?? "Esporte"),
      esporteId: Number(t.esporte_id ?? 0),
      dist: Number(t.dist_km ?? 99999),
      eid: Number(t.eid_time ?? 0),
      rank: Number(t.pontos_ranking ?? 0),
      modalidade: tipo,
      interesseMatch: t.interesse_match === "ranking" ? "ranking" : "ranking_e_amistoso",
      href: `/perfil-time/${t.id}?from=/match`,
      canChallenge: Boolean(t.can_challenge),
      challengeHint: Boolean(t.can_challenge)
        ? undefined
        : /^\d+$/.test(esporteSelecionado)
          ? `Somente o proprietário (capitão) pode desafiar. Crie sua ${tipo} neste esporte como líder.`
          : `Selecione um esporte e seja proprietário de uma ${tipo} para desafiar.`,
      avatarUrl: null,
      disponivelAmistoso: t.disponivel_amistoso === true,
      genero: null,
    }));
  }

  return filterAndSortRadarCards(cards, { sortBy, raio, finalidade });
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
