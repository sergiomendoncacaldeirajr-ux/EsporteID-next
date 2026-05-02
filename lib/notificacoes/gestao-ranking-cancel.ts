/** Linha mínima de `matches` para saber se o usuário precisa agir no fluxo cancelamento/reag. ranking. */
export type MatchGestaoCancelRow = {
  status?: string | null;
  cancel_requested_by?: string | null;
  usuario_id?: string | null;
  adversario_id?: string | null;
  desafiante_time_id?: number | null;
  adversario_time_id?: number | null;
};

/**
 * Indica se o usuário deve ver a gestão no Painel social (responder cancelamento ou escolher opção).
 * Cobre confronto individual (lados em usuario_id/adversario_id) e dupla/time (capitães por time).
 */
export function userMustActGestaoRankingCancel(
  row: MatchGestaoCancelRow,
  userId: string,
  captainTimeIds: number[]
): boolean {
  const st = String(row.status ?? "");
  const req = String(row.cancel_requested_by ?? "").trim();
  const cap = new Set(captainTimeIds.filter((id) => Number.isFinite(id) && id > 0));

  if (st === "CancelamentoPendente") {
    if (!req || req === userId) return false;
    if (userId === String(row.usuario_id ?? "").trim()) return true;
    if (userId === String(row.adversario_id ?? "").trim()) return true;
    const t1 = Number(row.desafiante_time_id ?? 0);
    const t2 = Number(row.adversario_time_id ?? 0);
    if (Number.isFinite(t1) && t1 > 0 && cap.has(t1)) return true;
    if (Number.isFinite(t2) && t2 > 0 && cap.has(t2)) return true;
    return false;
  }
  if (st === "ReagendamentoPendente") {
    return req === userId;
  }
  return false;
}
