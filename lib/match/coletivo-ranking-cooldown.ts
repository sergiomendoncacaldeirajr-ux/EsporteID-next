import type { SupabaseClient } from "@supabase/supabase-js";

function norm(s: string | null | undefined): string {
  return String(s ?? "").trim().toLowerCase();
}

function partidaValidaRanking(status: string | null | undefined, statusRanking: string | null | undefined): boolean {
  const sr = norm(statusRanking);
  const st = norm(status);
  return (
    sr === "validado" ||
    ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(st)
  );
}

/**
 * Data até a qual o ranking entre duas formações permanece em carência (base + N meses),
 * alinhado à RPC de desafio: confrontos válidos por `time1_id`/`time2_id` e matches concluídos por times;
 * opcionalmente legado só com jogadores (sem times na partida).
 */
export async function computeRankingBlockedUntilColetivo(
  supabase: SupabaseClient,
  opts: {
    esporteId: number;
    modalidade: "dupla" | "time";
    /** Time do visitante (ex.: líder da formação do usuário). Se inválido, só entra o fallback por jogadores. */
    meuTimeId?: number | null;
    alvoTimeId: number;
    cooldownMeses: number;
    fallbackViewerId?: string | null;
    fallbackOpponentLeaderId?: string | null;
  }
): Promise<string | null> {
  const {
    esporteId,
    modalidade,
    meuTimeId,
    alvoTimeId,
    cooldownMeses,
    fallbackViewerId,
    fallbackOpponentLeaderId,
  } = opts;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - cooldownMeses);
  const cutoffMs = cutoff.getTime();
  const nowMs = Date.now();

  let bestUntilMs = 0;

  const considerDt = (dtRaw: string | null | undefined) => {
    if (!dtRaw) return;
    const base = new Date(dtRaw);
    if (Number.isNaN(base.getTime()) || base.getTime() < cutoffMs) return;
    const until = new Date(base);
    until.setMonth(until.getMonth() + cooldownMeses);
    if (until.getTime() > nowMs && until.getTime() > bestUntilMs) {
      bestUntilMs = until.getTime();
    }
  };

  const myTid = Number(meuTimeId ?? 0);
  const alvoTid = Number(alvoTimeId ?? 0);

  if (Number.isFinite(myTid) && myTid > 0 && Number.isFinite(alvoTid) && alvoTid > 0 && myTid !== alvoTid) {
    const { data: partidasRows } = await supabase
      .from("partidas")
      .select("status, status_ranking, data_resultado, data_partida, data_registro, modalidade, time1_id, time2_id")
      .eq("esporte_id", esporteId)
      .is("torneio_id", null)
      .or(`and(time1_id.eq.${myTid},time2_id.eq.${alvoTid}),and(time1_id.eq.${alvoTid},time2_id.eq.${myTid})`)
      .order("id", { ascending: false })
      .limit(160);

    for (const r of partidasRows ?? []) {
      const mod = norm((r as { modalidade?: string | null }).modalidade);
      if (mod !== modalidade) continue;
      const t1 = Number((r as { time1_id?: number | null }).time1_id ?? 0);
      const t2 = Number((r as { time2_id?: number | null }).time2_id ?? 0);
      if (!(t1 === myTid || t2 === myTid) || !(t1 === alvoTid || t2 === alvoTid)) continue;
      if (!partidaValidaRanking((r as { status?: string | null }).status, (r as { status_ranking?: string | null }).status_ranking)) {
        continue;
      }
      considerDt(
        (r as { data_resultado?: string | null }).data_resultado ??
          (r as { data_registro?: string | null }).data_registro ??
          (r as { data_partida?: string | null }).data_partida
      );
    }

    const { data: matchRows } = await supabase
      .from("matches")
      .select("status, data_confirmacao, data_registro, modalidade_confronto, tipo")
      .eq("esporte_id", esporteId)
      .eq("finalidade", "ranking")
      .or(`and(desafiante_time_id.eq.${myTid},adversario_time_id.eq.${alvoTid}),and(desafiante_time_id.eq.${alvoTid},adversario_time_id.eq.${myTid})`)
      .order("id", { ascending: false })
      .limit(120);

    const concluded = new Set(["concluido", "concluído", "finalizado", "encerrado"]);
    for (const r of matchRows ?? []) {
      const mod =
        norm((r as { modalidade_confronto?: string | null }).modalidade_confronto) ||
        norm((r as { tipo?: string | null }).tipo);
      if (mod !== modalidade) continue;
      if (!concluded.has(norm((r as { status?: string | null }).status))) continue;
      considerDt(
        (r as { data_confirmacao?: string | null }).data_confirmacao ??
          (r as { data_registro?: string | null }).data_registro
      );
    }
  }

  const fv = String(fallbackViewerId ?? "").trim();
  const fo = String(fallbackOpponentLeaderId ?? "").trim();
  if (fv && fo) {
    const { data: legacyRows } = await supabase
      .from("partidas")
      .select("status, status_ranking, data_resultado, data_partida, data_registro, modalidade, time1_id, time2_id")
      .eq("esporte_id", esporteId)
      .is("torneio_id", null)
      .eq("modalidade", modalidade)
      .or(
        `and(jogador1_id.eq.${fv},jogador2_id.eq.${fo}),and(jogador1_id.eq.${fo},jogador2_id.eq.${fv}),and(desafiante_id.eq.${fv},desafiado_id.eq.${fo}),and(desafiante_id.eq.${fo},desafiado_id.eq.${fv})`
      )
      .order("id", { ascending: false })
      .limit(120);

    for (const r of legacyRows ?? []) {
      const t1 = Number((r as { time1_id?: number | null }).time1_id ?? 0);
      const t2 = Number((r as { time2_id?: number | null }).time2_id ?? 0);
      if (t1 > 0 || t2 > 0) continue;
      if (!partidaValidaRanking((r as { status?: string | null }).status, (r as { status_ranking?: string | null }).status_ranking)) {
        continue;
      }
      considerDt(
        (r as { data_resultado?: string | null }).data_resultado ??
          (r as { data_registro?: string | null }).data_registro ??
          (r as { data_partida?: string | null }).data_partida
      );
    }
  }

  return bestUntilMs > 0 ? new Date(bestUntilMs).toISOString() : null;
}

/**
 * Maior data ainda futura em que **algum** adversário desta formação permanece em carência de ranking
 * (útil para avisar elenco no perfil da dupla/time).
 */
export async function computeLatestActiveRankingCooldownEndForTeamInSport(
  supabase: SupabaseClient,
  opts: { teamId: number; esporteId: number; modalidade: "dupla" | "time"; cooldownMeses: number }
): Promise<string | null> {
  const { teamId, esporteId, modalidade, cooldownMeses } = opts;
  if (!Number.isFinite(teamId) || teamId < 1 || !Number.isFinite(esporteId) || esporteId < 1) return null;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - cooldownMeses);
  const cutoffMs = cutoff.getTime();
  const nowMs = Date.now();
  let bestUntilMs = 0;

  const considerDt = (dtRaw: string | null | undefined) => {
    if (!dtRaw) return;
    const base = new Date(dtRaw);
    if (Number.isNaN(base.getTime()) || base.getTime() < cutoffMs) return;
    const until = new Date(base);
    until.setMonth(until.getMonth() + cooldownMeses);
    if (until.getTime() > nowMs && until.getTime() > bestUntilMs) {
      bestUntilMs = until.getTime();
    }
  };

  const { data: partidasRows } = await supabase
    .from("partidas")
    .select("status, status_ranking, data_resultado, data_partida, data_registro, modalidade, time1_id, time2_id")
    .eq("esporte_id", esporteId)
    .is("torneio_id", null)
    .or(`time1_id.eq.${teamId},time2_id.eq.${teamId}`)
    .order("id", { ascending: false })
    .limit(220);

  for (const r of partidasRows ?? []) {
    const mod = norm((r as { modalidade?: string | null }).modalidade);
    if (mod !== modalidade) continue;
    const t1 = Number((r as { time1_id?: number | null }).time1_id ?? 0);
    const t2 = Number((r as { time2_id?: number | null }).time2_id ?? 0);
    if (t1 !== teamId && t2 !== teamId) continue;
    if (!partidaValidaRanking((r as { status?: string | null }).status, (r as { status_ranking?: string | null }).status_ranking)) {
      continue;
    }
    considerDt(
      (r as { data_resultado?: string | null }).data_resultado ??
        (r as { data_registro?: string | null }).data_registro ??
        (r as { data_partida?: string | null }).data_partida
    );
  }

  const concluded = new Set(["concluido", "concluído", "finalizado", "encerrado"]);
  const { data: matchRows } = await supabase
    .from("matches")
    .select("status, data_confirmacao, data_registro, modalidade_confronto, tipo, desafiante_time_id, adversario_time_id")
    .eq("esporte_id", esporteId)
    .eq("finalidade", "ranking")
    .or(`desafiante_time_id.eq.${teamId},adversario_time_id.eq.${teamId}`)
    .order("id", { ascending: false })
    .limit(160);

  for (const r of matchRows ?? []) {
    const mod =
      norm((r as { modalidade_confronto?: string | null }).modalidade_confronto) ||
      norm((r as { tipo?: string | null }).tipo);
    if (mod !== modalidade) continue;
    if (!concluded.has(norm((r as { status?: string | null }).status))) continue;
    const a = Number((r as { desafiante_time_id?: number | null }).desafiante_time_id ?? 0);
    const b = Number((r as { adversario_time_id?: number | null }).adversario_time_id ?? 0);
    if (a !== teamId && b !== teamId) continue;
    considerDt((r as { data_confirmacao?: string | null }).data_confirmacao ?? (r as { data_registro?: string | null }).data_registro);
  }

  return bestUntilMs > 0 ? new Date(bestUntilMs).toISOString() : null;
}
