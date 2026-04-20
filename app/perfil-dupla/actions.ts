"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DuplaActionState = { ok: true; message: string } | { ok: false; message: string };

export async function atualizarDuplaRegistro(
  _prev: DuplaActionState | undefined,
  formData: FormData
): Promise<DuplaActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const duplaId = Number(formData.get("dupla_id") ?? 0);
  if (!Number.isInteger(duplaId) || duplaId < 1) return { ok: false, message: "Dupla inválida." };

  const { data: row } = await supabase
    .from("duplas")
    .select("id, criador_id, player1_id")
    .eq("id", duplaId)
    .maybeSingle();

  const donoId = row?.criador_id ?? row?.player1_id;
  if (!row || donoId !== user.id) {
    return { ok: false, message: "Só o dono da dupla registrada pode editar estes dados." };
  }

  const usernameRaw = String(formData.get("username") ?? "").trim().toLowerCase();
  const username = usernameRaw ? usernameRaw.replace(/[^a-z0-9_]/g, "") : null;
  const bio = String(formData.get("bio") ?? "").trim();

  if (username && !/^[a-z0-9_]{3,24}$/.test(username)) {
    return { ok: false, message: "Username inválido. Use 3-24 caracteres [a-z0-9_]." };
  }

  const { error } = await supabase
    .from("duplas")
    .update({
      username,
      bio: bio || null,
    })
    .eq("id", duplaId);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/perfil-dupla/${duplaId}`);
  revalidatePath(`/perfil/${user.id}`);
  return { ok: true, message: "Dupla atualizada." };
}
