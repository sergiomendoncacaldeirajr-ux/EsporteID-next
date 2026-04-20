"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type LocalActionState = { ok: true; message: string } | { ok: false; message: string };

function checkboxOn(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

export async function atualizarMeuLocal(
  _prev: LocalActionState | undefined,
  formData: FormData
): Promise<LocalActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const espacoId = Number(formData.get("espaco_id") ?? 0);
  if (!Number.isInteger(espacoId) || espacoId < 1) return { ok: false, message: "Local inválido." };

  const { data: row } = await supabase
    .from("espacos_genericos")
    .select("id, criado_por_usuario_id, responsavel_usuario_id")
    .eq("id", espacoId)
    .maybeSingle();

  const pode =
    row &&
    (row.criado_por_usuario_id === user.id || row.responsavel_usuario_id === user.id);
  if (!pode) return { ok: false, message: "Sem permissão para editar este local." };

  const nome = String(formData.get("nome_publico") ?? "").trim();
  const localizacao = String(formData.get("localizacao") ?? "").trim();
  const logoRaw = String(formData.get("logo_arquivo") ?? "").trim();
  const tipo_quadra = String(formData.get("tipo_quadra") ?? "").trim() || null;
  const lat = String(formData.get("lat") ?? "").trim() || null;
  const lng = String(formData.get("lng") ?? "").trim() || null;

  if (nome.length < 2) return { ok: false, message: "Nome do local inválido." };
  if (localizacao.length < 3) return { ok: false, message: "Informe cidade/região ou endereço (mín. 3 caracteres)." };

  const { error } = await supabase
    .from("espacos_genericos")
    .update({
      nome_publico: nome,
      localizacao,
      logo_arquivo: logoRaw || null,
      tipo_quadra,
      lat,
      lng,
      aceita_reserva: checkboxOn(formData, "aceita_reserva"),
      ativo_listagem: checkboxOn(formData, "ativo_listagem"),
    })
    .eq("id", espacoId);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/local/${espacoId}`);
  revalidatePath(`/conta/local/${espacoId}`);
  revalidatePath("/locais");
  revalidatePath("/dashboard");
  return { ok: true, message: "Local atualizado." };
}
