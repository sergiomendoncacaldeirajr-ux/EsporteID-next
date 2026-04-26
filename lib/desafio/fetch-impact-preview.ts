import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type ColetivoImpactPreview,
  type DesafioImpactPerspective,
  type EidConfigPreview,
  type RegrasRankingMatchPreview,
  RANKING_LOSS_POINTS,
  buildColetivoPerspective,
  buildIndividualViewerPerspective,
} from "@/lib/desafio/impact-preview";

export type PedidoRankingPreview =
  | { kind: "individual"; perspective: DesafioImpactPerspective; regras: RegrasRankingMatchPreview }
  | { kind: "coletivo"; coletivo: ColetivoImpactPreview; regras: RegrasRankingMatchPreview };

function mapEidConfig(row: Record<string, unknown> | null): EidConfigPreview {
  const r = row ?? {};
  return {
    win_base: Number(r.win_base ?? 0.25),
    loss_base: Number(r.loss_base ?? 0.15),
    wo_bonus: Number(r.wo_bonus ?? 0.1),
    score_gap_bonus: Number(r.score_gap_bonus ?? 0.05),
    double_transfer_pct: Number(r.double_transfer_pct ?? 0.15),
  };
}

function mapRegras(row: Record<string, unknown> | null): RegrasRankingMatchPreview {
  const r = row ?? {};
  return {
    pontos_vitoria: Math.floor(Number(r.pontos_vitoria ?? 10)),
    pontos_derrota: RANKING_LOSS_POINTS,
  };
}

export async function fetchIndividualRankingPreview(
  supabase: SupabaseClient,
  args: { viewerId: string; opponentId: string; esporteId: number }
): Promise<{
  cfg: EidConfigPreview;
  regras: RegrasRankingMatchPreview;
  perspective: DesafioImpactPerspective;
} | null> {
  const [{ data: cfgRow }, { data: rrm }, { data: ueV }, { data: ueO }] = await Promise.all([
    supabase.from("eid_config").select("win_base, loss_base, wo_bonus, score_gap_bonus, double_transfer_pct").eq("id", 1).maybeSingle(),
    supabase.from("regras_ranking_match").select("pontos_vitoria, pontos_derrota").eq("esporte_id", args.esporteId).maybeSingle(),
    supabase
      .from("usuario_eid")
      .select("nota_eid, pontos_ranking")
      .eq("usuario_id", args.viewerId)
      .eq("esporte_id", args.esporteId)
      .maybeSingle(),
    supabase
      .from("usuario_eid")
      .select("nota_eid, pontos_ranking")
      .eq("usuario_id", args.opponentId)
      .eq("esporte_id", args.esporteId)
      .maybeSingle(),
  ]);

  const cfg = mapEidConfig(cfgRow as Record<string, unknown> | null);
  const regras = mapRegras(rrm as Record<string, unknown> | null);

  const perspective = buildIndividualViewerPerspective(
    {
      notaEid: Number(ueV?.nota_eid ?? 0),
      pontosRanking: Number(ueV?.pontos_ranking ?? 0),
    },
    {
      notaEid: Number(ueO?.nota_eid ?? 0),
      pontosRanking: Number(ueO?.pontos_ranking ?? 0),
    },
    cfg,
    regras
  );

  return { cfg, regras, perspective };
}

export async function fetchColetivoRankingPreview(
  supabase: SupabaseClient,
  args: {
    viewerUserId: string;
    opponentTeamId: number;
    esporteId: number;
    modalidade: "dupla" | "time";
  }
): Promise<{
  cfg: EidConfigPreview;
  regras: RegrasRankingMatchPreview;
  coletivo: ColetivoImpactPreview;
} | null> {
  const [{ data: cfgRow }, { data: rrm }, { data: myTeam }, { data: opTeam }, { data: myUe }] = await Promise.all([
    supabase.from("eid_config").select("win_base, loss_base, wo_bonus, score_gap_bonus, double_transfer_pct").eq("id", 1).maybeSingle(),
    supabase.from("regras_ranking_match").select("pontos_vitoria, pontos_derrota").eq("esporte_id", args.esporteId).maybeSingle(),
    supabase
      .from("times")
      .select("id, nome, pontos_ranking, eid_time")
      .eq("criador_id", args.viewerUserId)
      .eq("esporte_id", args.esporteId)
      .eq("tipo", args.modalidade)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("times").select("id, nome, pontos_ranking, eid_time").eq("id", args.opponentTeamId).maybeSingle(),
    supabase
      .from("usuario_eid")
      .select("nota_eid")
      .eq("usuario_id", args.viewerUserId)
      .eq("esporte_id", args.esporteId)
      .maybeSingle(),
  ]);

  if (!myTeam?.id || !opTeam?.id) return null;

  const cfg = mapEidConfig(cfgRow as Record<string, unknown> | null);
  const regras = mapRegras(rrm as Record<string, unknown> | null);

  const coletivo = buildColetivoPerspective({
    selfTeam: {
      nome: String(myTeam.nome ?? "Sua formação"),
      pontosRanking: Number(myTeam.pontos_ranking ?? 0),
      eidTime: Number(myTeam.eid_time ?? 0),
    },
    opponentTeam: {
      nome: String(opTeam.nome ?? "Oponente"),
      pontosRanking: Number(opTeam.pontos_ranking ?? 0),
      eidTime: Number(opTeam.eid_time ?? 0),
    },
    selfMemberNotaEid: Number(myUe?.nota_eid ?? 0),
    cfg,
    regras,
  });

  return { cfg, regras, coletivo };
}

/** Quem recebe o pedido (adversario_id): perspectiva do accepter vs desafiante. */
export async function fetchPedidoRankingPreview(
  supabase: SupabaseClient,
  args: {
    accepterId: string;
    challengerId: string;
    esporteId: number;
    modalidade: string;
    adversarioTimeId: number | null;
  }
): Promise<PedidoRankingPreview | null> {
  const mod = String(args.modalidade ?? "").toLowerCase();
  if (mod === "dupla" || mod === "time") {
    if (!args.adversarioTimeId) return null;
    const [{ data: cfgRow }, { data: rrm }, { data: myTeam }, { data: chTeam }, { data: myUe }] = await Promise.all([
      supabase.from("eid_config").select("win_base, loss_base, wo_bonus, score_gap_bonus, double_transfer_pct").eq("id", 1).maybeSingle(),
      supabase.from("regras_ranking_match").select("pontos_vitoria, pontos_derrota").eq("esporte_id", args.esporteId).maybeSingle(),
      supabase.from("times").select("id, nome, pontos_ranking, eid_time").eq("id", args.adversarioTimeId).maybeSingle(),
      supabase
        .from("times")
        .select("id, nome, pontos_ranking, eid_time")
        .eq("criador_id", args.challengerId)
        .eq("esporte_id", args.esporteId)
        .eq("tipo", mod)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("usuario_eid").select("nota_eid").eq("usuario_id", args.accepterId).eq("esporte_id", args.esporteId).maybeSingle(),
    ]);
    if (!myTeam?.id || !chTeam?.id) return null;
    const cfg = mapEidConfig(cfgRow as Record<string, unknown> | null);
    const regras = mapRegras(rrm as Record<string, unknown> | null);
    const coletivo = buildColetivoPerspective({
      selfTeam: {
        nome: String(myTeam.nome ?? "Sua formação"),
        pontosRanking: Number(myTeam.pontos_ranking ?? 0),
        eidTime: Number(myTeam.eid_time ?? 0),
      },
      opponentTeam: {
        nome: String(chTeam.nome ?? "Desafiante"),
        pontosRanking: Number(chTeam.pontos_ranking ?? 0),
        eidTime: Number(chTeam.eid_time ?? 0),
      },
      selfMemberNotaEid: Number(myUe?.nota_eid ?? 0),
      cfg,
      regras,
    });
    return { kind: "coletivo", coletivo, regras };
  }

  const ind = await fetchIndividualRankingPreview(supabase, {
    viewerId: args.accepterId,
    opponentId: args.challengerId,
    esporteId: args.esporteId,
  });
  if (!ind) return null;
  return { kind: "individual", perspective: ind.perspective, regras: ind.regras };
}
