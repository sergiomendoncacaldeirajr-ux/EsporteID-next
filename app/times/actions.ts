"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TeamActionState =
  | { ok: true; message: string; createdTimeId?: number }
  | { ok: false; message: string };

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
  const escudoFile = formData.get("escudo_file");

  if (nome.length < 3) return { ok: false, message: "Nome da equipe inválido." };
  if (!Number.isInteger(esporteId) || esporteId < 1) return { ok: false, message: "Selecione um esporte válido." };
  if (username && !/^[a-z0-9_]{3,24}$/.test(username)) {
    return { ok: false, message: "Username inválido. Use 3-24 caracteres [a-z0-9_]." };
  }
  if (!(escudoFile instanceof File) || escudoFile.size === 0) {
    return { ok: false, message: "A foto da equipe/dupla é obrigatória." };
  }
  if (!escudoFile.type.startsWith("image/")) {
    return { ok: false, message: "Arquivo inválido. Envie uma imagem." };
  }
  if (escudoFile.size > 5 * 1024 * 1024) {
    return { ok: false, message: "A imagem deve ter no máximo 5MB." };
  }

  const originalName = escudoFile.name || "escudo";
  const ext = originalName.includes(".") ? originalName.split(".").pop()?.toLowerCase() ?? "jpg" : "jpg";
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `times/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const up = await supabase.storage.from("avatars").upload(path, escudoFile, {
    upsert: true,
    contentType: escudoFile.type || "image/jpeg",
    cacheControl: "3600",
  });
  if (up.error) return { ok: false, message: "Não foi possível enviar a foto da equipe." };
  const escudo = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;

  const { data: created, error } = await supabase
    .from("times")
    .insert({
    nome,
    username,
    bio: null,
    tipo,
    esporte_id: esporteId,
    localizacao: localizacao || null,
    escudo,
    criador_id: user.id,
    interesse_rank_match: true,
    disponivel_amistoso: true,
    vagas_abertas: true,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  revalidatePath("/times");
  revalidatePath(`/perfil/${user.id}`);
  return { ok: true, message: "Formação criada com sucesso.", createdTimeId: Number(created?.id ?? 0) || undefined };
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

  const [{ data: timeRow }, { data: targetProfile }] = await Promise.all([
    supabase.from("times").select("id, esporte_id, criador_id").eq("id", timeId).maybeSingle(),
    supabase.from("profiles").select("id").eq("username", username).maybeSingle(),
  ]);
  if (!timeRow || timeRow.criador_id !== user.id) return { ok: false, message: "Sem permissão para convidar nesta equipe." };
  if (!targetProfile?.id) {
    return { ok: false, message: "Usuário não encontrado. Verifique o @username informado." };
  }
  if (timeRow.esporte_id != null) {
    const { data: esporteConfig } = await supabase
      .from("usuario_eid")
      .select("usuario_id")
      .eq("usuario_id", targetProfile.id)
      .eq("esporte_id", Number(timeRow.esporte_id))
      .maybeSingle();
    if (!esporteConfig) {
      return {
        ok: false,
        message:
          "Esse usuário ainda não configurou esse esporte no perfil. Para aparecer na busca de adicionar ao time/dupla, ele precisa configurar o esporte no EID.",
      };
    }
  }

  const { error } = await supabase.rpc("convidar_para_time", {
    p_time_id: timeId,
    p_username: username,
  });
  if (error) {
    if (String(error.message || "").toLowerCase().includes("usuário não encontrado")) {
      return {
        ok: false,
        message:
          "Usuário não encontrado. Para aparecer na opção de adicionar ao time/dupla, o atleta precisa ter esse esporte configurado no perfil.",
      };
    }
    return { ok: false, message: error.message };
  }

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
    .select("id, localizacao, esporte_id")
    .eq("id", timeId)
    .eq("criador_id", user.id)
    .maybeSingle();
  if (!owned) return { ok: false, message: "Sem permissão para editar esta equipe." };

  // Trava de segurança: localização da formação é imutável após criação.
  const localizacaoEnviada = String(formData.get("localizacao") ?? "").trim();
  const localizacaoAtual = String(owned.localizacao ?? "").trim();
  if (localizacaoEnviada && localizacaoEnviada !== localizacaoAtual) {
    return { ok: false, message: "A localização da formação não pode ser alterada. Crie outra equipe/dupla para mudar a cidade." };
  }
  const esporteEnviadoRaw = formData.get("esporte_id");
  if (esporteEnviadoRaw != null && String(esporteEnviadoRaw).trim() !== "") {
    const esporteEnviado = Number(esporteEnviadoRaw);
    const esporteAtual = Number(owned.esporte_id ?? 0);
    if (Number.isFinite(esporteEnviado) && esporteEnviado > 0 && esporteEnviado !== esporteAtual) {
      return { ok: false, message: "O esporte da formação não pode ser alterado após o cadastro." };
    }
  }

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
  revalidatePath(`/conta/formacao/time/${timeId}`);
  revalidatePath("/times");
  revalidatePath(`/perfil/${user.id}`);
  return { ok: true, message: "Formação atualizada." };
}
