"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TeamActionState = { ok: true; message: string } | { ok: false; message: string };

export async function criarEquipe(
  _prev: TeamActionState | undefined,
  formData: FormData
): Promise<TeamActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const nome = String(formData.get("nome") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "").trim().toLowerCase();
  const username = usernameRaw ? usernameRaw.replace(/[^a-z0-9_]/g, "") : null;
  const tipoRaw = String(formData.get("tipo") ?? "time");
  const tipo = tipoRaw === "dupla" ? "dupla" : "time";
  const esporteId = Number(formData.get("esporte_id") ?? 0);
  const localizacao = String(formData.get("localizacao") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (nome.length < 3) return { ok: false, message: "Nome da equipe inválido." };
  if (!Number.isInteger(esporteId) || esporteId < 1) return { ok: false, message: "Selecione um esporte válido." };
  if (username && !/^[a-z0-9_]{3,24}$/.test(username)) {
    return { ok: false, message: "Username inválido. Use 3-24 caracteres [a-z0-9_]." };
  }

  const { error } = await supabase.from("times").insert({
    nome,
    username,
    bio: bio || null,
    tipo,
    esporte_id: esporteId,
    localizacao: localizacao || null,
    criador_id: user.id,
    interesse_rank_match: true,
    disponivel_amistoso: true,
    vagas_abertas: true,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/times");
  revalidatePath(`/perfil/${user.id}`);
  return { ok: true, message: "Equipe criada com sucesso." };
}

export async function convidarUsuarioParaEquipe(
  _prev: TeamActionState | undefined,
  formData: FormData
): Promise<TeamActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const timeId = Number(formData.get("time_id") ?? 0);
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!Number.isInteger(timeId) || timeId < 1) return { ok: false, message: "Equipe inválida." };
  if (!username) return { ok: false, message: "Informe o @username do atleta." };

  const { error } = await supabase.rpc("convidar_para_time", {
    p_time_id: timeId,
    p_username: username,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/times");
  revalidatePath("/comunidade");
  revalidatePath(`/perfil-time/${timeId}`);
  return { ok: true, message: "Convite enviado." };
}

function checkboxOn(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

export async function atualizarMinhaEquipe(
  _prev: TeamActionState | undefined,
  formData: FormData
): Promise<TeamActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const timeId = Number(formData.get("time_id") ?? 0);
  if (!Number.isInteger(timeId) || timeId < 1) return { ok: false, message: "Equipe inválida." };

  const { data: owned } = await supabase
    .from("times")
    .select("id")
    .eq("id", timeId)
    .eq("criador_id", user.id)
    .maybeSingle();
  if (!owned) return { ok: false, message: "Sem permissão para editar esta equipe." };

  const nome = String(formData.get("nome") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "").trim().toLowerCase();
  const username = usernameRaw ? usernameRaw.replace(/[^a-z0-9_]/g, "") : null;
  const bio = String(formData.get("bio") ?? "").trim();
  const escudoRaw = String(formData.get("escudo") ?? "").trim();
  const escudo = escudoRaw || null;
  const nivel_procurado = String(formData.get("nivel_procurado") ?? "").trim() || null;

  if (nome.length < 3) return { ok: false, message: "Nome da equipe inválido." };
  if (username && !/^[a-z0-9_]{3,24}$/.test(username)) {
    return { ok: false, message: "Username inválido. Use 3-24 caracteres [a-z0-9_]." };
  }

  const { error } = await supabase
    .from("times")
    .update({
      nome,
      username,
      bio: bio || null,
      escudo,
      nivel_procurado,
      interesse_rank_match: checkboxOn(formData, "interesse_rank_match"),
      disponivel_amistoso: checkboxOn(formData, "disponivel_amistoso"),
      vagas_abertas: checkboxOn(formData, "vagas_abertas"),
      aceita_pedidos: checkboxOn(formData, "aceita_pedidos"),
      interesse_torneio: checkboxOn(formData, "interesse_torneio"),
    })
    .eq("id", timeId)
    .eq("criador_id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/perfil-time/${timeId}`);
  revalidatePath("/times");
  revalidatePath(`/perfil/${user.id}`);
  return { ok: true, message: "Formação atualizada." };
}
