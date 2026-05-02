"use server";

import { revalidatePath } from "next/cache";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import { getMatchRankMonthlyLimitPerSport } from "@/lib/app-config/match-rank-monthly-limit";
import { triggerPushForNotificationIdsBestEffort } from "@/lib/pwa/push-trigger";
import { hasMaliciousPayload } from "@/lib/security/request-guards";
import { isSportMatchEnabled } from "@/lib/sport-capabilities";
import { MSG_CONFRONTO_REQUER_ESPORTE_NO_PERFIL_VIEWER } from "@/lib/match/viewer-esporte-confronto";
import { createClient } from "@/lib/supabase/server";

export type SolicitarDesafioState =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

const UUID_V4_OR_GENERIC_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getRankPendingLimit(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number> {
  const { data: cfg } = await supabase
    .from("app_config")
    .select("value_json")
    .eq("key", "match_rank_pending_result_limit")
    .maybeSingle();
  const raw = cfg?.value_json as unknown;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(1, Math.min(20, Math.trunc(raw)));
  if (raw && typeof raw === "object") {
    const v = Number((raw as { limite?: unknown }).limite);
    if (Number.isFinite(v)) return Math.max(1, Math.min(20, Math.trunc(v)));
  }
  return 2;
}

function norm(v: string | null | undefined): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function matchRankModalidadeFromMatch(m: { modalidade_confronto?: string | null; tipo?: string | null }): string {
  return norm(String(m.modalidade_confronto ?? m.tipo ?? ""));
}

function partidaModalidadeRank(p: {
  modalidade?: string | null;
  time1_id?: number | null;
  time2_id?: number | null;
}): "individual" | "dupla" | "time" {
  const mod = norm(p.modalidade);
  if (mod === "dupla") return "dupla";
  if (mod === "time") return "time";
  const t1 = Number(p.time1_id ?? 0);
  const t2 = Number(p.time2_id ?? 0);
  if (!mod && t1 === 0 && t2 === 0) return "individual";
  return "individual";
}

function isIndividualRankPendingPartida(
  p: {
    modalidade?: string | null;
    time1_id?: number | null;
    time2_id?: number | null;
    jogador1_id?: string | null;
    jogador2_id?: string | null;
    usuario_id?: string | null;
    desafiante_id?: string | null;
    desafiado_id?: string | null;
    status?: string | null;
  },
  userId: string
): boolean {
  const st = norm(p.status);
  if (!["agendada", "aguardando_confirmacao"].includes(st)) return false;
  const mod = norm(p.modalidade);
  const t1 = Number(p.time1_id ?? 0);
  const t2 = Number(p.time2_id ?? 0);
  const rowIndividual = mod === "individual" || (p.modalidade == null && t1 === 0 && t2 === 0);
  if (!rowIndividual) return false;
  const uid = userId.trim();
  return (
    String(p.jogador1_id ?? "").trim() === uid ||
    String(p.jogador2_id ?? "").trim() === uid ||
    String(p.usuario_id ?? "").trim() === uid ||
    String(p.desafiante_id ?? "").trim() === uid ||
    String(p.desafiado_id ?? "").trim() === uid
  );
}

function isTeamRankPendingPartida(
  p: {
    modalidade?: string | null;
    time1_id?: number | null;
    time2_id?: number | null;
    status?: string | null;
  },
  timeId: number
): boolean {
  const st = norm(p.status);
  if (!["agendada", "aguardando_confirmacao"].includes(st)) return false;
  const mod = norm(p.modalidade);
  if (mod !== "dupla" && mod !== "time") return false;
  const t1 = Number(p.time1_id ?? 0);
  const t2 = Number(p.time2_id ?? 0);
  return t1 === timeId || t2 === timeId;
}

async function countRankingPendenciasIndividualUsuario(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  esporteId: number
): Promise<number> {
  const { data: ms } = await supabase
    .from("matches")
    .select("id, modalidade_confronto, tipo")
    .eq("finalidade", "ranking")
    .in("status", ["Pendente", "Aceito", "CancelamentoPendente", "ReagendamentoPendente"])
    .eq("esporte_id", esporteId)
    .or(`usuario_id.eq.${userId},adversario_id.eq.${userId}`)
    .limit(400);
  const nMatches = (ms ?? []).filter((m) => matchRankModalidadeFromMatch(m) === "individual").length;

  const { data: ps } = await supabase
    .from("partidas")
    .select(
      "modalidade, time1_id, time2_id, jogador1_id, jogador2_id, usuario_id, desafiante_id, desafiado_id, status"
    )
    .eq("esporte_id", esporteId)
    .is("torneio_id", null)
    .or(
      `jogador1_id.eq.${userId},jogador2_id.eq.${userId},usuario_id.eq.${userId},desafiante_id.eq.${userId},desafiado_id.eq.${userId}`
    )
    .limit(400);

  const nPartidas = (ps ?? []).filter((p) => isIndividualRankPendingPartida(p, userId)).length;
  return nMatches + nPartidas;
}

async function countRankingPendenciasPorTime(
  supabase: Awaited<ReturnType<typeof createClient>>,
  timeId: number,
  esporteId: number
): Promise<number> {
  const { data: ms } = await supabase
    .from("matches")
    .select("id, modalidade_confronto, tipo")
    .eq("finalidade", "ranking")
    .in("status", ["Pendente", "Aceito", "CancelamentoPendente", "ReagendamentoPendente"])
    .eq("esporte_id", esporteId)
    .or(`desafiante_time_id.eq.${timeId},adversario_time_id.eq.${timeId}`)
    .limit(400);
  const nMatches = (ms ?? []).filter((m) => ["dupla", "time"].includes(matchRankModalidadeFromMatch(m))).length;

  const { data: ps } = await supabase
    .from("partidas")
    .select("modalidade, time1_id, time2_id, status")
    .eq("esporte_id", esporteId)
    .is("torneio_id", null)
    .or(`time1_id.eq.${timeId},time2_id.eq.${timeId}`)
    .limit(400);

  const nPartidas = (ps ?? []).filter((p) => isTeamRankPendingPartida(p, timeId)).length;
  return nMatches + nPartidas;
}

async function countRankingConfrontosNoMesIndividual(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  esporteId: number
): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0).toISOString();

  const { data } = await supabase
    .from("partidas")
    .select(
      "modalidade, status, status_ranking, data_resultado, data_registro, data_partida, time1_id, time2_id, jogador1_id, jogador2_id"
    )
    .eq("esporte_id", esporteId)
    .is("torneio_id", null)
    .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId}`)
    .limit(400);

  let count = 0;
  for (const p of data ?? []) {
    if (partidaModalidadeRank(p) !== "individual") continue;
    const j1 = String((p as { jogador1_id?: string | null }).jogador1_id ?? "").trim();
    const j2 = String((p as { jogador2_id?: string | null }).jogador2_id ?? "").trim();
    if (j1 !== userId && j2 !== userId) continue;
    const status = norm((p as { status?: string | null }).status);
    const ranking = norm((p as { status_ranking?: string | null }).status_ranking);
    const valido =
      ranking === "validado" ||
      ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(status);
    if (!valido) continue;
    const dtRaw =
      (p as { data_resultado?: string | null }).data_resultado ??
      (p as { data_registro?: string | null }).data_registro ??
      (p as { data_partida?: string | null }).data_partida ??
      null;
    if (!dtRaw) continue;
    const ts = new Date(dtRaw).toISOString();
    if (ts >= monthStart && ts < nextMonthStart) count += 1;
  }
  return count;
}

async function countRankingConfrontosNoMesPorTime(
  supabase: Awaited<ReturnType<typeof createClient>>,
  timeId: number,
  esporteId: number
): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0).toISOString();

  const { data } = await supabase
    .from("partidas")
    .select("modalidade, status, status_ranking, data_resultado, data_registro, data_partida, time1_id, time2_id")
    .eq("esporte_id", esporteId)
    .is("torneio_id", null)
    .or(`time1_id.eq.${timeId},time2_id.eq.${timeId}`)
    .limit(400);

  let count = 0;
  for (const p of data ?? []) {
    const pm = partidaModalidadeRank(p);
    if (pm !== "dupla" && pm !== "time") continue;
    const t1 = Number((p as { time1_id?: number | null }).time1_id ?? 0);
    const t2 = Number((p as { time2_id?: number | null }).time2_id ?? 0);
    if (t1 !== timeId && t2 !== timeId) continue;
    const status = norm((p as { status?: string | null }).status);
    const ranking = norm((p as { status_ranking?: string | null }).status_ranking);
    const valido =
      ranking === "validado" ||
      ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(status);
    if (!valido) continue;
    const dtRaw =
      (p as { data_resultado?: string | null }).data_resultado ??
      (p as { data_registro?: string | null }).data_registro ??
      (p as { data_partida?: string | null }).data_partida ??
      null;
    if (!dtRaw) continue;
    const ts = new Date(dtRaw).toISOString();
    if (ts >= monthStart && ts < nextMonthStart) count += 1;
  }
  return count;
}

export async function solicitarDesafioMatch(
  _prev: SolicitarDesafioState,
  formData: FormData
): Promise<SolicitarDesafioState> {
  const esporteRaw = formData.get("esporte_id");
  const modalidadeRaw = formData.get("modalidade");
  const alvoUsuario = formData.get("alvo_usuario_id");
  const alvoTime = formData.get("alvo_time_id");

  const p_esporte_id = Number(esporteRaw);
  const p_modalidade = String(modalidadeRaw ?? "")
    .trim()
    .toLowerCase();
  const finRaw = String(formData.get("finalidade") ?? "ranking").trim().toLowerCase();
  const p_finalidade = finRaw === "amistoso" ? "amistoso" : "ranking";

  if (!Number.isFinite(p_esporte_id) || p_esporte_id < 1) {
    return { ok: false, message: "Esporte inválido." };
  }
  if (hasMaliciousPayload(`${String(alvoUsuario ?? "")} ${String(alvoTime ?? "")} ${p_modalidade} ${p_finalidade}`)) {
    return { ok: false, message: "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Sessão expirada. Faça login novamente." };
  }

  const { data: esporteRow, error: esporteErr } = await supabase
    .from("esportes")
    .select("nome")
    .eq("id", p_esporte_id)
    .maybeSingle();
  if (esporteErr) return { ok: false, message: esporteErr.message };
  if (!esporteRow || !isSportMatchEnabled(esporteRow.nome)) {
    return { ok: false, message: "Este esporte não permite desafio/ranking no momento." };
  }

  let p_alvo_usuario_id: string | null = null;
  let p_alvo_time_id: number | null = null;

  const mod = p_modalidade === "atleta" ? "individual" : p_modalidade;
  if (mod === "individual") {
    const u = String(alvoUsuario ?? "").trim();
    if (!u) return { ok: false, message: "Alvo inválido." };
    if (!UUID_V4_OR_GENERIC_RE.test(u)) return { ok: false, message: "Usuário alvo inválido." };
    p_alvo_usuario_id = u;
  } else if (mod === "dupla" || mod === "time") {
    const tid = Number(alvoTime);
    if (!Number.isFinite(tid) || tid < 1) return { ok: false, message: "Formação inválida." };
    p_alvo_time_id = tid;
  } else {
    return { ok: false, message: "Modalidade inválida." };
  }

  if (mod === "individual" && p_alvo_usuario_id) {
    const [{ data: ueSelf }, { data: ueOpp }] = await Promise.all([
      supabase.from("usuario_eid").select("esporte_id").eq("usuario_id", user.id).eq("esporte_id", p_esporte_id).maybeSingle(),
      supabase.from("usuario_eid").select("esporte_id").eq("usuario_id", p_alvo_usuario_id).eq("esporte_id", p_esporte_id).maybeSingle(),
    ]);
    if (!ueSelf) {
      return { ok: false, message: MSG_CONFRONTO_REQUER_ESPORTE_NO_PERFIL_VIEWER };
    }
    if (!ueOpp) {
      return {
        ok: false,
        message: "O oponente não tem este esporte no perfil. Escolha um esporte que vocês dois jogam.",
      };
    }
  }

  if ((mod === "dupla" || mod === "time") && Number.isFinite(p_alvo_time_id ?? NaN) && Number(p_alvo_time_id) > 0) {
    const { data: alvoTimeRow } = await supabase
      .from("times")
      .select("id, criador_id")
      .eq("id", Number(p_alvo_time_id))
      .maybeSingle();
    if (!alvoTimeRow?.id) {
      return { ok: false, message: "Formação alvo não encontrada." };
    }
    if (String(alvoTimeRow.criador_id ?? "") === String(user.id)) {
      return {
        ok: false,
        message: "Você não pode desafiar a própria formação (outro líder precisa estar à frente da dupla/time).",
      };
    }
    const { data: ueSelfColetivo } = await supabase
      .from("usuario_eid")
      .select("esporte_id")
      .eq("usuario_id", user.id)
      .eq("esporte_id", p_esporte_id)
      .maybeSingle();
    if (!ueSelfColetivo) {
      return { ok: false, message: MSG_CONFRONTO_REQUER_ESPORTE_NO_PERFIL_VIEWER };
    }
  }

  if (p_finalidade === "ranking") {
    const limite = await getRankPendingLimit(supabase);
    const limiteMensalPorEsporte = await getMatchRankMonthlyLimitPerSport(supabase);
    const modalidadeLimit = mod === "individual" ? "individual" : mod === "dupla" ? "dupla" : "time";

    if (mod === "individual") {
      const alvoUid = p_alvo_usuario_id;
      if (!alvoUid) {
        return { ok: false, message: "Alvo inválido." };
      }

      const [minhas, alvo] = await Promise.all([
        countRankingPendenciasIndividualUsuario(supabase, user.id, p_esporte_id),
        countRankingPendenciasIndividualUsuario(supabase, alvoUid, p_esporte_id),
      ]);
      if (minhas >= limite) {
        return { ok: false, message: `Você atingiu o limite de ${limite} pendências de desafio/ranking.` };
      }
      if (alvo >= limite) {
        return { ok: false, message: "O oponente atingiu o limite de pendências de desafio/ranking." };
      }

      const meusConfrontosNoMes = await countRankingConfrontosNoMesIndividual(supabase, user.id, p_esporte_id);
      if (meusConfrontosNoMes >= limiteMensalPorEsporte) {
        return {
          ok: false,
          message: `Você atingiu o limite mensal de ${limiteMensalPorEsporte} confrontos neste esporte para ${modalidadeLimit}. Tente novamente no próximo mês.`,
        };
      }
      const confrontosAlvoNoMes = await countRankingConfrontosNoMesIndividual(supabase, alvoUid, p_esporte_id);
      if (confrontosAlvoNoMes >= limiteMensalPorEsporte) {
        return {
          ok: false,
          message: `O oponente atingiu o limite mensal de ${limiteMensalPorEsporte} confrontos neste esporte para ${modalidadeLimit}.`,
        };
      }
    } else {
      const opponentTimeId = Number(p_alvo_time_id);
      const { data: myTeamRow } = await supabase
        .from("times")
        .select("id")
        .eq("criador_id", user.id)
        .eq("esporte_id", p_esporte_id)
        .eq("tipo", mod)
        .limit(1)
        .maybeSingle();
      const myTeamId = Number((myTeamRow as { id?: number | null } | null)?.id ?? 0);
      if (!Number.isFinite(myTeamId) || myTeamId < 1) {
        return {
          ok: false,
          message: "Você precisa ter uma dupla ou time neste esporte para desafiar nesta modalidade.",
        };
      }

      const [minhas, alvo] = await Promise.all([
        countRankingPendenciasPorTime(supabase, myTeamId, p_esporte_id),
        countRankingPendenciasPorTime(supabase, opponentTimeId, p_esporte_id),
      ]);
      if (minhas >= limite) {
        return {
          ok: false,
          message: `Sua formação já tem ${limite} confronto(s) de ranking pendente(s). Conclua ou lance o resultado de um deles antes de abrir outro.`,
        };
      }
      if (alvo >= limite) {
        return {
          ok: false,
          message: `A formação adversária já tem ${limite} confronto(s) pendente(s). Eles precisam concluir um antes de aceitar novos desafios.`,
        };
      }

      const meusConfrontosNoMes = await countRankingConfrontosNoMesPorTime(supabase, myTeamId, p_esporte_id);
      if (meusConfrontosNoMes >= limiteMensalPorEsporte) {
        return {
          ok: false,
          message: `Sua formação atingiu o limite mensal de ${limiteMensalPorEsporte} confrontos neste esporte para ${modalidadeLimit}. Tente novamente no próximo mês.`,
        };
      }
      const confrontosAlvoNoMes = await countRankingConfrontosNoMesPorTime(supabase, opponentTimeId, p_esporte_id);
      if (confrontosAlvoNoMes >= limiteMensalPorEsporte) {
        return {
          ok: false,
          message: `A formação adversária já atingiu o limite mensal de ${limiteMensalPorEsporte} confrontos neste esporte para ${modalidadeLimit}.`,
        };
      }

      const cooldownMesesColetivo = await getMatchRankCooldownMeses(supabase);
      const cutoffColetivo = new Date();
      cutoffColetivo.setMonth(cutoffColetivo.getMonth() - cooldownMesesColetivo);
      const cutoffIsoColetivo = cutoffColetivo.toISOString();

      const [{ data: concludedMatchesColetivo }, { data: concludedPartidasColetivo }] = await Promise.all([
        supabase
          .from("matches")
          .select("id")
          .eq("esporte_id", p_esporte_id)
          .eq("finalidade", "ranking")
          .eq("modalidade_confronto", mod)
          .in("status", ["Concluido", "Concluído", "Finalizado", "Encerrado"])
          .or(
            `and(desafiante_time_id.eq.${myTeamId},adversario_time_id.eq.${opponentTimeId}),and(desafiante_time_id.eq.${opponentTimeId},adversario_time_id.eq.${myTeamId})`
          )
          .gte("data_confirmacao", cutoffIsoColetivo)
          .limit(1),
        supabase
          .from("partidas")
          .select("id, modalidade, status, status_ranking, data_resultado, data_registro, data_partida, time1_id, time2_id")
          .eq("esporte_id", p_esporte_id)
          .is("torneio_id", null)
          .or(
            `and(time1_id.eq.${myTeamId},time2_id.eq.${opponentTimeId}),and(time1_id.eq.${opponentTimeId},time2_id.eq.${myTeamId})`
          )
          .order("id", { ascending: false })
          .limit(40),
      ]);

      const hasRecentPartidaValidaColetivo = (concludedPartidasColetivo ?? []).some((p) => {
        if (partidaModalidadeRank(p) !== "dupla" && partidaModalidadeRank(p) !== "time") return false;
        const statusOk = ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(
          norm((p as { status?: string | null }).status)
        );
        const rankingValidado = norm((p as { status_ranking?: string | null }).status_ranking) === "validado";
        if (!statusOk && !rankingValidado) return false;
        const dtRaw =
          (p as { data_resultado?: string | null }).data_resultado ??
          (p as { data_partida?: string | null }).data_partida ??
          (p as { data_registro?: string | null }).data_registro ??
          null;
        if (!dtRaw) return false;
        const ts = new Date(dtRaw).getTime();
        return Number.isFinite(ts) && ts >= cutoffColetivo.getTime();
      });

      if ((concludedMatchesColetivo?.length ?? 0) > 0 || hasRecentPartidaValidaColetivo) {
        return {
          ok: false,
          message: `Neste esporte (${modalidadeLimit}), só é possível um novo desafio de ranking entre estas formações após ${cooldownMesesColetivo} meses do último confronto válido.`,
        };
      }
    }

    if (p_alvo_usuario_id && mod === "individual") {
      const alvoOwnerId = p_alvo_usuario_id;
      const cooldownMeses = await getMatchRankCooldownMeses(supabase);
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - cooldownMeses);
      const cutoffIso = cutoff.toISOString();

      const [{ data: concludedMatches }, { data: concludedPartidas }] = await Promise.all([
        supabase
          .from("matches")
          .select("id")
          .eq("esporte_id", p_esporte_id)
          .eq("finalidade", "ranking")
          .eq("modalidade_confronto", mod)
          .in("status", ["Concluido", "Concluído", "Finalizado", "Encerrado"])
          .or(
            `and(usuario_id.eq.${user.id},adversario_id.eq.${alvoOwnerId}),and(usuario_id.eq.${alvoOwnerId},adversario_id.eq.${user.id})`
          )
          .gte("data_confirmacao", cutoffIso)
          .limit(1),
        supabase
          .from("partidas")
          .select("id, modalidade, status, status_ranking, data_resultado, data_registro, data_partida")
          .eq("esporte_id", p_esporte_id)
          .is("torneio_id", null)
          .eq("modalidade", modalidadeLimit)
          .or(
            `and(jogador1_id.eq.${user.id},jogador2_id.eq.${alvoOwnerId}),and(jogador1_id.eq.${alvoOwnerId},jogador2_id.eq.${user.id}),and(desafiante_id.eq.${user.id},desafiado_id.eq.${alvoOwnerId}),and(desafiante_id.eq.${alvoOwnerId},desafiado_id.eq.${user.id})`
          )
          .order("id", { ascending: false })
          .limit(40),
      ]);

      const hasRecentPartidaValida = (concludedPartidas ?? []).some((p) => {
        const statusOk = ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(
          norm((p as { status?: string | null }).status)
        );
        const rankingValidado = norm((p as { status_ranking?: string | null }).status_ranking) === "validado";
        if (!statusOk && !rankingValidado) return false;
        const dtRaw =
          (p as { data_resultado?: string | null }).data_resultado ??
          (p as { data_partida?: string | null }).data_partida ??
          (p as { data_registro?: string | null }).data_registro ??
          null;
        if (!dtRaw) return false;
        const ts = new Date(dtRaw).getTime();
        return Number.isFinite(ts) && ts >= cutoff.getTime();
      });

      if ((concludedMatches?.length ?? 0) > 0 || hasRecentPartidaValida) {
        return {
          ok: false,
          message: `Neste esporte (${modalidadeLimit}), só é possível um novo desafio de ranking com este oponente após ${cooldownMeses} meses do último confronto válido.`,
        };
      }
    }
  }

  const { data, error } = await supabase.rpc("solicitar_desafio_match", {
    p_esporte_id,
    p_modalidade: mod,
    p_alvo_usuario_id,
    p_alvo_time_id,
    p_finalidade,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  if (data == null) {
    return { ok: false, message: "Não foi possível registrar o pedido." };
  }

  const novoMatchId = Number(data);
  if ((mod === "dupla" || mod === "time") && Number.isFinite(p_alvo_time_id ?? NaN) && Number(p_alvo_time_id) > 0 && Number.isFinite(novoMatchId) && novoMatchId > 0) {
    const nowIso = new Date().toISOString();
    const { data: autoAcceptedRows } = await supabase
      .from("match_sugestoes")
      .update({
        status: "aprovado",
        respondido_em: nowIso,
        match_id: novoMatchId,
      })
      .eq("status", "pendente")
      .eq("alvo_dono_id", user.id)
      .eq("sugeridor_time_id", Number(p_alvo_time_id))
      .eq("esporte_id", p_esporte_id)
      .eq("modalidade", mod)
      .select("id, sugeridor_id");

    const sugestaoIds = [...new Set((autoAcceptedRows ?? []).map((r) => Number((r as { id?: number | null }).id ?? 0)).filter((n) => Number.isFinite(n) && n > 0))];
    const sugeridorIds = [...new Set((autoAcceptedRows ?? []).map((r) => String((r as { sugeridor_id?: string | null }).sugeridor_id ?? "")).filter(Boolean))];
    if (sugestaoIds.length > 0 && sugeridorIds.length > 0) {
      const { data: insertedNotifs } = await supabase
        .from("notificacoes")
        .insert(
          sugeridorIds.map((uid) => ({
            usuario_id: uid,
            mensagem: "Sua sugestão de desafio foi aceita automaticamente porque o líder já enviou o desafio oficial.",
            tipo: "desafio",
            referencia_id: novoMatchId,
            lida: false,
            remetente_id: user.id,
            data_criacao: nowIso,
          }))
        )
        .select("id");
      const notifIds = (insertedNotifs ?? [])
        .map((row) => Number((row as { id?: number | null }).id ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0);
      if (notifIds.length > 0) {
        await triggerPushForNotificationIdsBestEffort(notifIds, {
          source: "desafio/actions.solicitarDesafioMatch.autoAcceptSuggestion",
        });
      }
    }
  }

  revalidatePath("/match");
  revalidatePath("/comunidade");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return {
    ok: true,
    redirectTo: `/match?status=enviado&esporte=${p_esporte_id}`,
  };
}
