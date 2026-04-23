"use server";

import { revalidatePath } from "next/cache";
import { isSportMatchEnabled } from "@/lib/sport-capabilities";
import { createClient } from "@/lib/supabase/server";

export type SolicitarDesafioState =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string };

export async function solicitarDesafioMatch(
  _prev: SolicitarDesafioState,
  formData: FormData
): Promise<SolicitarDesafioState> {
  const esporteRaw = formData.get("esporte_id");
  const modalidadeRaw = formData.get("modalidade");
  const alvoUsuario = formData.get("alvo_usuario_id");
  const alvoTime = formData.get("alvo_time_id");

  const p_esporte_id = Number(esporteRaw);
  const p_modalidade = String(modalidadeRaw ?? "").trim();
  const finRaw = String(formData.get("finalidade") ?? "ranking").trim().toLowerCase();
  const p_finalidade = finRaw === "amistoso" ? "amistoso" : "ranking";

  if (!Number.isFinite(p_esporte_id) || p_esporte_id < 1) {
    return { ok: false, message: "Esporte inválido." };
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
    p_alvo_usuario_id = u;
  } else if (mod === "dupla" || mod === "time") {
    const tid = Number(alvoTime);
    if (!Number.isFinite(tid) || tid < 1) return { ok: false, message: "Formação inválida." };
    p_alvo_time_id = tid;
  } else {
    return { ok: false, message: "Modalidade inválida." };
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
