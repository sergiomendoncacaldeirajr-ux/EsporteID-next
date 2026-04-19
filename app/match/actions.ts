"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MatchLocationResult = { ok: true } | { ok: false; message: string };

export async function atualizarLocalizacaoMatch(lat: number, lng: number): Promise<MatchLocationResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, message: "Coordenadas inválidas." };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, message: "Coordenadas fora do intervalo válido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase
    .from("profiles")
    .update({ lat, lng, atualizado_em: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/match");
  revalidatePath("/dashboard");
  return { ok: true };
}
