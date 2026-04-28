"use server";

import { revalidatePath } from "next/cache";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import { getMatchRankMonthlyLimitPerSport } from "@/lib/app-config/match-rank-monthly-limit";
import { triggerPushForNotificationIdsBestEffort } from "@/lib/pwa/push-trigger";
import { hasMaliciousPayload } from "@/lib/security/request-guards";
import { isSportMatchEnabled } from "@/lib/sport-capabilities";
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

async function countRankingPendencias(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<number> {
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("finalidade", "ranking")
    .in("status", ["Pendente", "Aceito", "CancelamentoPendente", "ReagendamentoPendente"])
    .or(`usuario_id.eq.${userId},adversario_id.eq.${userId}`);
  return Number(count ?? 0);
}

async function countRankingConfrontosNoMesPorEsporte(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  esporteId: number,
  modalidade: "individual" | "dupla" | "time"
): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0).toISOString();

  const { data } = await supabase
    .from("partidas")
    .select("id, modalidade, status, status_ranking, data_resultado, data_registro, data_partida")
    .eq("esporte_id", esporteId)
    .is("torneio_id", null)
    .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId},desafiante_id.eq.${userId},desafiado_id.eq.${userId}`)
    .order("id", { ascending: false })
    .limit(240);

  let count = 0;
  for (const p of data ?? []) {
    const mod = norm((p as { modalidade?: string | null }).modalidade);
    const partidaModalidade: "individual" | "dupla" | "time" =
      mod === "dupla" ? "dupla" : mod === "time" ? "time" : "individual";
    if (partidaModalidade !== modalidade) continue;
    const status = norm((p as { status?: string | null }).status);
    const ranking = norm((p as { status_ranking?: string | null }).status_ranking);
    const valido =
      ranking === "validado" ||
      ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(status);
    if (!valido) continue;
    const dtRaw =
      (p as { data_resultado?: string | null }).data_resultado ??
      (p as { data_partida?: string | null }).data_partida ??
      (p as { data_registro?: string | null }).data_registro ??
      null;
    if (!dtRaw) continue;
    const ts = new Date(dtRaw).toISOString();
    if (ts >= monthStart && ts < nextMonthStart) count += 1;
  }
  return count;
}

function norm(v: string | null | undefined): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
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

  if (p_finalidade === "ranking") {
    const limite = await getRankPendingLimit(supabase);
    const limiteMensalPorEsporte = await getMatchRankMonthlyLimitPerSport(supabase);
    let alvoOwnerId: string | null = p_alvo_usuario_id;
    if (!alvoOwnerId && Number.isFinite(p_alvo_time_id ?? NaN) && Number(p_alvo_time_id) > 0) {
      const { data: timeRow } = await supabase
        .from("times")
        .select("criador_id")
        .eq("id", Number(p_alvo_time_id))
        .maybeSingle();
      alvoOwnerId = String(timeRow?.criador_id ?? "");
    }

    const [minhas, alvo] = await Promise.all([
      countRankingPendencias(supabase, user.id),
      alvoOwnerId ? countRankingPendencias(supabase, alvoOwnerId) : Promise.resolve(0),
    ]);
    if (minhas >= limite) {
      return { ok: false, message: `Você atingiu o limite de ${limite} pendências de desafio/ranking.` };
    }
    if (alvo >= limite) {
      return { ok: false, message: "O oponente atingiu o limite de pendências de desafio/ranking." };
    }

    const modalidadeLimit = mod === "individual" ? "individual" : mod === "dupla" ? "dupla" : "time";
    const meusConfrontosNoMes = await countRankingConfrontosNoMesPorEsporte(
      supabase,
      user.id,
      p_esporte_id,
      modalidadeLimit
    );
    if (meusConfrontosNoMes >= limiteMensalPorEsporte) {
      return {
        ok: false,
        message: `Você atingiu o limite mensal de ${limiteMensalPorEsporte} confrontos neste esporte para ${modalidadeLimit}. Tente novamente no próximo mês.`,
      };
    }
    if (alvoOwnerId) {
      const confrontosAlvoNoMes = await countRankingConfrontosNoMesPorEsporte(
        supabase,
        alvoOwnerId,
        p_esporte_id,
        modalidadeLimit
      );
      if (confrontosAlvoNoMes >= limiteMensalPorEsporte) {
        return {
          ok: false,
          message: `O oponente atingiu o limite mensal de ${limiteMensalPorEsporte} confrontos neste esporte para ${modalidadeLimit}.`,
        };
      }
    }

    if (alvoOwnerId) {
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
