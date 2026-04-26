/**
 * Pré-visualização alinhada ao motor EID (processar_eid_partida_by_id) e às regras de ranking por desafio.
 * Não considera W.O. nem bônus de “ampla vantagem” no placar — apenas cenário de vitória/derrota simples.
 */

export type EidConfigPreview = {
  win_base: number;
  loss_base: number;
  wo_bonus: number;
  score_gap_bonus: number;
  double_transfer_pct: number;
};

export type RegrasRankingMatchPreview = {
  pontos_vitoria: number;
  pontos_derrota: number;
};

/** Bônus ao vencer oponente com mais pontos no ranking (20% fixo da vitória base). */
export const RANKING_UPSET_CAP_PCT = 0.2;
/** Derrota no ranking de desafio: regra fixa para todos os esportes. */
export const RANKING_LOSS_POINTS = 4;

export function eidClampScore(score: number): number {
  return Math.min(10, Math.max(0, Math.round(score * 100) / 100));
}

export function computeRankingUpsetBonus(opponentRankPts: number, selfRankPts: number, baseWinPts: number): number {
  const opponentAbove = Math.floor(opponentRankPts) > Math.floor(selfRankPts);
  const maxBonus = Math.max(0, Math.floor(Math.max(0, Math.floor(baseWinPts)) * RANKING_UPSET_CAP_PCT));
  return opponentAbove ? maxBonus : 0;
}

/** Pontos de ranking se `self` vencer: base + bônus por vencer quem tem mais pontos. */
export function computeRankingPointsIfWin(
  selfRankPts: number,
  opponentRankPts: number,
  regras: RegrasRankingMatchPreview
): { total: number; upsetBonus: number } {
  const baseW = Math.floor(Number(regras.pontos_vitoria) || 0);
  const upsetBonus = computeRankingUpsetBonus(opponentRankPts, selfRankPts, baseW);
  return { total: baseW + upsetBonus, upsetBonus };
}

/** Pontos somados ao perdedor: regra fixa global de 4 pontos. */
export function computeRankingPointsIfLose(_regras: RegrasRankingMatchPreview): number {
  return RANKING_LOSS_POINTS;
}

export function computeIndividualEidDeltaWin(winnerNota: number, loserNota: number, cfg: EidConfigPreview): number {
  const w = Number(winnerNota) || 0;
  const l = Number(loserNota) || 0;
  const gap = Math.max(0, l - w);
  return (Number(cfg.win_base) || 0) + gap * 0.1;
}

export function computeIndividualEidDeltaLoss(winnerNota: number, loserNota: number, cfg: EidConfigPreview): number {
  const w = Number(winnerNota) || 0;
  const l = Number(loserNota) || 0;
  const gap = Math.max(0, w - l);
  return -1 * ((Number(cfg.loss_base) || 0) + gap * 0.05);
}

export function computeTeamEidDeltaWin(winnerTeamEid: number, loserTeamEid: number, cfg: EidConfigPreview): number {
  const w = Number(winnerTeamEid) || 0;
  const l = Number(loserTeamEid) || 0;
  const gap = Math.max(0, l - w);
  return (Number(cfg.win_base) || 0) + gap * 0.1;
}

export function computeTeamEidDeltaLoss(winnerTeamEid: number, loserTeamEid: number, cfg: EidConfigPreview): number {
  const w = Number(winnerTeamEid) || 0;
  const l = Number(loserTeamEid) || 0;
  const gap = Math.max(0, w - l);
  return -1 * ((Number(cfg.loss_base) || 0) + gap * 0.05);
}

export function transferMemberDelta(teamDelta: number, cfg: EidConfigPreview): number {
  const pct = Number(cfg.double_transfer_pct) || 0;
  return Math.round(teamDelta * pct * 10000) / 10000;
}

export type DesafioImpactPerspective = {
  rankingPtsNow: number;
  notaEidNow: number;
  ifWin: { rankingDelta: number; eidDelta: number; eidAfter: number; rankingUpsetBonus: number };
  ifLose: { rankingDelta: number; eidDelta: number; eidAfter: number };
};

export function buildIndividualViewerPerspective(
  viewer: { notaEid: number; pontosRanking: number },
  opponent: { notaEid: number; pontosRanking: number },
  cfg: EidConfigPreview,
  regras: RegrasRankingMatchPreview
): DesafioImpactPerspective {
  const winRk = computeRankingPointsIfWin(viewer.pontosRanking, opponent.pontosRanking, regras);
  const loseRk = computeRankingPointsIfLose(regras);

  const winEid = computeIndividualEidDeltaWin(viewer.notaEid, opponent.notaEid, cfg);
  const loseEid = computeIndividualEidDeltaLoss(opponent.notaEid, viewer.notaEid, cfg);

  return {
    rankingPtsNow: viewer.pontosRanking,
    notaEidNow: viewer.notaEid,
    ifWin: {
      rankingDelta: winRk.total,
      eidDelta: winEid,
      eidAfter: eidClampScore(viewer.notaEid + winEid),
      rankingUpsetBonus: winRk.upsetBonus,
    },
    ifLose: {
      rankingDelta: loseRk,
      eidDelta: loseEid,
      eidAfter: eidClampScore(viewer.notaEid + loseEid),
    },
  };
}

export type ColetivoImpactPreview = {
  selfTeam: { nome: string; pontosRanking: number; eidTime: number };
  opponentTeam: { nome: string; pontosRanking: number; eidTime: number };
  /** Variação do EID da formação (times.eid_time). */
  teamIfWin: { eidDelta: number; eidAfter: number; rankingDelta: number; rankingUpsetBonus: number };
  teamIfLose: { eidDelta: number; eidAfter: number; rankingDelta: number };
  /** Transbordo estimado para o seu EID individual no esporte (membro). */
  memberIfWin: { eidDelta: number; eidAfter: number };
  memberIfLose: { eidDelta: number; eidAfter: number };
  selfMemberNotaNow: number;
};

export function buildColetivoPerspective(args: {
  selfTeam: { nome: string; pontosRanking: number; eidTime: number };
  opponentTeam: { nome: string; pontosRanking: number; eidTime: number };
  selfMemberNotaEid: number;
  cfg: EidConfigPreview;
  regras: RegrasRankingMatchPreview;
}): ColetivoImpactPreview {
  const { selfTeam, opponentTeam, selfMemberNotaEid, cfg, regras } = args;
  const rkWin = computeRankingPointsIfWin(selfTeam.pontosRanking, opponentTeam.pontosRanking, regras);
  const rkLosePts = computeRankingPointsIfLose(regras);

  const dWin = computeTeamEidDeltaWin(selfTeam.eidTime, opponentTeam.eidTime, cfg);
  const dLoss = computeTeamEidDeltaLoss(opponentTeam.eidTime, selfTeam.eidTime, cfg);

  const tWin = transferMemberDelta(dWin, cfg);
  const tLoss = transferMemberDelta(dLoss, cfg);

  return {
    selfTeam,
    opponentTeam,
    teamIfWin: {
      eidDelta: dWin,
      eidAfter: eidClampScore(selfTeam.eidTime + dWin),
      rankingDelta: rkWin.total,
      rankingUpsetBonus: rkWin.upsetBonus,
    },
    teamIfLose: {
      eidDelta: dLoss,
      eidAfter: eidClampScore(selfTeam.eidTime + dLoss),
      rankingDelta: rkLosePts,
    },
    memberIfWin: {
      eidDelta: tWin,
      eidAfter: eidClampScore(selfMemberNotaEid + tWin),
    },
    memberIfLose: {
      eidDelta: tLoss,
      eidAfter: eidClampScore(selfMemberNotaEid + tLoss),
    },
    selfMemberNotaNow: selfMemberNotaEid,
  };
}
