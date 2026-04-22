"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type SaveProfileResult = { ok: true } | { ok: false; message: string };

function parseIntOrNull(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export async function saveProfileMainAction(formData: FormData): Promise<SaveProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const nome = String(formData.get("nome") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "").trim().toLowerCase();
  const username = usernameRaw ? usernameRaw.replace(/[^a-z0-9_]/g, "").slice(0, 24) : null;
  const localizacao = String(formData.get("localizacao") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const estiloJogo = String(formData.get("estilo_jogo") ?? "").trim();
  const altura = parseIntOrNull(formData.get("altura_cm"));
  const peso = parseIntOrNull(formData.get("peso_kg"));
  const ladoRaw = String(formData.get("lado") ?? "").trim();
  const lado = ladoRaw && ["Destro", "Canhoto", "Ambos"].includes(ladoRaw) ? ladoRaw : null;

  if (nome.length < 3) return { ok: false, message: "Nome inválido." };
  if (localizacao.length < 3) return { ok: false, message: "Localização inválida." };
  if (username && !/^[a-z0-9_]{3,24}$/.test(username)) {
    return { ok: false, message: "Username inválido." };
  }

  const payload = {
    nome,
    username,
    localizacao,
    bio: bio || null,
    estilo_jogo: estiloJogo || null,
    altura_cm: altura,
    peso_kg: peso,
    lado,
    atualizado_em: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/perfil/${user.id}`);
  revalidatePath("/conta/perfil");
  revalidatePath("/editar/perfil");
  return { ok: true };
}

type PerformancePayloadItem = {
  esporteId: number;
  interesse: "ranking" | "ranking_e_amistoso" | "amistoso";
  modalidades: Array<"individual" | "dupla" | "time">;
  tempo: "Menos de 1 ano" | "1 a 3 anos" | "Mais de 3 anos";
};

export async function savePerformanceEidAction(formData: FormData): Promise<SaveProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const raw = String(formData.get("payload") ?? "");
  let parsed: PerformancePayloadItem[] = [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (Array.isArray(arr)) parsed = arr as PerformancePayloadItem[];
  } catch {
    return { ok: false, message: "Dados inválidos para salvar." };
  }

  if (parsed.length === 0) return { ok: false, message: "Selecione pelo menos um esporte." };

  const nowIso = new Date().toISOString();
  const rows = parsed
    .filter((item) => Number.isFinite(item.esporteId) && item.esporteId > 0)
    .map((item) => ({
      usuario_id: user.id,
      esporte_id: item.esporteId,
      interesse_match: item.interesse,
      modalidade_match: item.modalidades.includes("individual")
        ? "individual"
        : item.modalidades.includes("dupla")
          ? "dupla"
          : "time",
      modalidades_match: item.modalidades,
      tempo_experiencia: item.tempo,
      atualizado_em: nowIso,
    }));

  if (rows.length === 0) return { ok: false, message: "Nenhum esporte válido informado." };

  const { error } = await supabase.from("usuario_eid").upsert(rows, {
    onConflict: "usuario_id,esporte_id",
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/perfil/${user.id}`);
  revalidatePath("/conta/esportes-eid");
  revalidatePath("/editar/performance-eid");
  return { ok: true };
}

