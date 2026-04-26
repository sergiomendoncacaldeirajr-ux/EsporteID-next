"use server";

import { revalidatePath } from "next/cache";
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

  revalidatePath("/match");
  return {
    ok: true,
    redirectTo: `/match?status=enviado&esporte=${p_esporte_id}`,
  };
}
