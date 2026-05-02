/** Enriquece times do confronto coletivo quando `matches` veio sem `desafiante_time_id` / `adversario_time_id` mas a `partidas` tem `time1_id` / `time2_id`. */

export type TimesPartidaPorMatchRow = {
  match_id?: number | null;
  time1_id?: number | null;
  time2_id?: number | null;
};

export function timesDaPartidaPorMatchRows(rows: TimesPartidaPorMatchRow[] | null | undefined): Map<
  number,
  { time1_id: number | null; time2_id: number | null }
> {
  const out = new Map<number, { time1_id: number | null; time2_id: number | null }>();
  for (const row of rows ?? []) {
    const mid = Number(row.match_id ?? 0);
    if (!Number.isFinite(mid) || mid <= 0 || out.has(mid)) continue;
    const t1 = Number(row.time1_id ?? 0);
    const t2 = Number(row.time2_id ?? 0);
    out.set(mid, {
      time1_id: Number.isFinite(t1) && t1 > 0 ? t1 : null,
      time2_id: Number.isFinite(t2) && t2 > 0 ? t2 : null,
    });
  }
  return out;
}

export function effectiveRankingMatchTeamIds(
  matchRow: {
    id: number | string;
    desafiante_time_id?: number | null;
    adversario_time_id?: number | null;
  },
  timesPorMatchId: ReadonlyMap<number, { time1_id: number | null; time2_id: number | null }>
): { desafiante_time_id: number | null; adversario_time_id: number | null } {
  const mid = Number(matchRow.id);
  let dti = Number(matchRow.desafiante_time_id ?? 0);
  let ati = Number(matchRow.adversario_time_id ?? 0);
  const pt = timesPorMatchId.get(mid);
  if (pt) {
    const t1 = pt.time1_id;
    const t2 = pt.time2_id;
    if (!Number.isFinite(dti) || dti <= 0) dti = t1 ?? 0;
    if (!Number.isFinite(ati) || ati <= 0) ati = t2 ?? 0;
    if ((!Number.isFinite(dti) || dti <= 0) && t2) dti = t2;
    if ((!Number.isFinite(ati) || ati <= 0) && t1) ati = t1;
  }
  return {
    desafiante_time_id: Number.isFinite(dti) && dti > 0 ? dti : null,
    adversario_time_id: Number.isFinite(ati) && ati > 0 ? ati : null,
  };
}
