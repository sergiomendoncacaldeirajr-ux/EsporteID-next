"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ResponderMatchState = { ok: true } | { ok: false; message: string };
export type ResponderConviteState = { ok: true } | { ok: false; message: string };

export async function responderPedidoMatch(
  _prev: ResponderMatchState | undefined,
  formData: FormData
): Promise<ResponderMatchState> {
  const rawId = formData.get("match_id");
  const aceitarRaw = formData.get("aceitar");
  const matchId = Number(rawId);
  const aceitar = aceitarRaw === "true" || aceitarRaw === "1";

  if (!Number.isFinite(matchId) || matchId < 1) {
    return { ok: false, message: "Pedido inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Sessão expirada. Faça login novamente." };
  }

  const { error } = await supabase.rpc("responder_pedido_match", {
    p_match_id: matchId,
    p_aceitar: aceitar,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/comunidade");
  revalidatePath("/agenda");
  revalidatePath("/match");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function marcarNotificacaoLida(formData: FormData) {
  const raw = formData.get("notif_id");
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("notificacoes").update({ lida: true }).eq("id", id).eq("usuario_id", user.id);

  revalidatePath("/comunidade");
  revalidatePath("/dashboard");
}

export async function marcarTodasNotificacoesLidas() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("notificacoes").update({ lida: true }).eq("usuario_id", user.id).eq("lida", false);

  revalidatePath("/comunidade");
  revalidatePath("/dashboard");
}

export async function responderConviteEquipe(
  _prev: ResponderConviteState | undefined,
  formData: FormData
): Promise<ResponderConviteState> {
  const conviteId = Number(formData.get("convite_id"));
  const aceitarRaw = formData.get("aceitar");
  const aceitar = aceitarRaw === "true" || aceitarRaw === "1";
  if (!Number.isFinite(conviteId) || conviteId < 1) {
    return { ok: false, message: "Convite inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const { error } = await supabase.rpc("responder_convite_time", {
    p_convite_id: conviteId,
    p_aceitar: aceitar,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/comunidade");
  revalidatePath(`/perfil/${user.id}`);
  revalidatePath("/times");
  return { ok: true };
}
