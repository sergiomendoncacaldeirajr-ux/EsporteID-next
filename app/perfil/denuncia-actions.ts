"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const CODIGOS = new Set(["abuso", "menor_idade", "spam", "perfil_falso", "conteudo_improprio", "outro"]);

export type DenunciaPerfilResult = { ok: true; id: number } | { ok: false; error: string };

export async function denunciarPerfilUsuario(formData: FormData): Promise<DenunciaPerfilResult> {
  const alvoId = String(formData.get("alvo_usuario_id") ?? "").trim();
  const codigo = String(formData.get("codigo_motivo") ?? "").trim().toLowerCase();
  const texto = String(formData.get("texto") ?? "").trim() || null;

  if (!alvoId || !CODIGOS.has(codigo)) {
    return { ok: false, error: "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login para denunciar." };
  if (user.id === alvoId) return { ok: false, error: "Você não pode denunciar a si mesmo." };

  const { data, error } = await supabase.rpc("registrar_denuncia_usuario", {
    p_alvo_usuario_id: alvoId,
    p_codigo_motivo: codigo,
    p_texto: texto,
  });

  if (error) {
    return { ok: false, error: error.message || "Não foi possível registrar a denúncia." };
  }

  const id = typeof data === "number" ? data : Number(data);
  revalidatePath(`/perfil/${alvoId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/denuncias");
  return { ok: true, id };
}
