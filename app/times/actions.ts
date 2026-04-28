"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type TeamActionState =
  | { ok: true; message: string; createdTimeId?: number; inviteAutoSent?: boolean }
  | { ok: false; message: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROSTER_CAP_DUPLA = 2;
const ROSTER_CAP_TIME = 18;

function rosterCapForTipo(tipo: string | null | undefined): number {
  return String(tipo ?? "")
    .trim()
    .toLowerCase() === "dupla"
    ? ROSTER_CAP_DUPLA
    : ROSTER_CAP_TIME;
}

/** Alinha Content-Type ao que o bucket `avatars` aceita (evita 400 Bad Request em HEIC / octet-stream / aliases). */
function resolveEscudoContentType(file: File, safeExt: string): string {
  const raw = (file.type || "").trim().toLowerCase();
  if (raw === "application/octet-stream" || raw === "binary/octet-stream" || raw === "") {
    switch (safeExt.toLowerCase()) {
      case "png":
        return "image/png";
      case "webp":
        return "image/webp";
      case "heic":
      case "heif":
        return "image/heic";
      default:
        return "image/jpeg";
    }
  }
  if (raw === "image/jpg" || raw === "image/pjpeg") return "image/jpeg";
  if (raw === "image/x-png") return "image/png";
  const base = raw.split(";")[0]?.trim() ?? "";
  if (base.startsWith("image/")) return base;
  return "image/jpeg";
}

/** Convite por @ já resolvido — usado por `convidarUsuarioParaEquipe` e após `criarEquipe`. */
async function conviteUsuarioParaTimeCore(
  supabase: SupabaseClient,
  donoId: string,
  timeId: number,
  targetProfileId: string,
  usernameParaRpc: string
): Promise<TeamActionState> {
  const { data: timeRow } = await supabase
    .from("times")
    .select("id, esporte_id, criador_id, tipo")
    .eq("id", timeId)
    .maybeSingle();
  if (!timeRow || timeRow.criador_id !== donoId) return { ok: false, message: "Sem permissão para convidar nesta equipe." };

  const cap = rosterCapForTipo(timeRow.tipo);
  const { data: alreadyMembro } = await supabase
    .from("membros_time")
    .select("id")
    .eq("time_id", timeId)
    .eq("usuario_id", targetProfileId)
    .in("status", ["ativo", "aceito", "aprovado"])
    .maybeSingle();
  if (!alreadyMembro) {
    const { data: headRaw, error: headErr } = await supabase.rpc("time_roster_headcount", { p_time_id: timeId });
    if (!headErr) {
      const head = Number(headRaw);
      if (Number.isFinite(head) && head >= cap) {
        return {
          ok: false,
          message:
            cap === ROSTER_CAP_DUPLA
              ? "Dupla completa (máximo 2 integrantes, incluindo o líder). Remova um membro para convidar outra pessoa."
              : "Time completo (máximo 18 integrantes, incluindo o líder). Remova um membro para convidar outra pessoa.",
        };
      }
    }
  }

  if (timeRow.esporte_id != null) {
    const { data: esporteConfig } = await supabase
      .from("usuario_eid")
      .select("usuario_id")
      .eq("usuario_id", targetProfileId)
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
    p_username: usernameParaRpc,
  });
  if (error) {
    const em = String(error.message || "").toLowerCase();
    if (em.includes("usuário não encontrado")) {
      return {
        ok: false,
        message:
          "Usuário não encontrado. Para aparecer na opção de adicionar ao time/dupla, o atleta precisa ter esse esporte configurado no perfil.",
      };
    }
    if (em.includes("limite de elenco")) {
      return {
        ok: false,
        message:
          cap === ROSTER_CAP_DUPLA
            ? "Dupla completa (máximo 2 integrantes). Remova um membro para convidar outra pessoa."
            : "Time completo (máximo 18 integrantes). Remova um membro para convidar outra pessoa.",
      };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/times");
  revalidatePath("/comunidade");
  revalidatePath(`/perfil-time/${timeId}`);
  revalidatePath(`/perfil/${targetProfileId}`);
  return { ok: true, message: "Convite enviado. A pessoa recebe aviso em Social para aceitar ou recusar." };
}

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
  if (escudoFile.size > 5 * 1024 * 1024) {
    return { ok: false, message: "A imagem deve ter no máximo 5MB." };
  }

  const mimeRaw = (escudoFile.type || "").trim().toLowerCase();
  const looksLikeImage =
    mimeRaw.startsWith("image/") || mimeRaw === "application/octet-stream" || mimeRaw === "binary/octet-stream";
  if (!looksLikeImage) {
    return { ok: false, message: "Arquivo inválido. Envie uma imagem (JPG, PNG, WEBP ou HEIC)." };
  }

  const originalName = escudoFile.name || "escudo";
  const ext = originalName.includes(".") ? originalName.split(".").pop()?.toLowerCase() ?? "jpg" : "jpg";
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
  const contentType = resolveEscudoContentType(escudoFile, safeExt);
  // RLS do bucket avatars: primeiro segmento do path deve ser auth.uid() (ver storage_avatars_insert_own).
  const path = `${user.id}/time_escudo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const up = await supabase.storage.from("avatars").upload(path, escudoFile, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });
  if (up.error) {
    const detail = up.error.message;
    return {
      ok: false,
      message: detail
        ? `Não foi possível enviar a foto da equipe. (${detail})`
        : "Não foi possível enviar a foto da equipe.",
    };
  }
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
    disponivel_amistoso: false,
    disponivel_amistoso_ate: null,
    vagas_abertas: checkboxOn(formData, "vagas_abertas"),
    aceita_pedidos: checkboxOn(formData, "aceita_pedidos"),
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  const createdId = Number(created?.id ?? 0) || 0;
  const convidarUid = String(formData.get("convidar_usuario_id") ?? "").trim();
  let message = "Formação criada com sucesso.";
  let inviteAutoSent = false;

  if (convidarUid && UUID_RE.test(convidarUid)) {
    const { data: targetById } = await supabase.from("profiles").select("id, username").eq("id", convidarUid).maybeSingle();
    const u = String(targetById?.username ?? "").trim();
    if (!targetById?.id) {
      message = "Formação criada. Convite não enviado (perfil não encontrado).";
    } else if (!u) {
      message = "Formação criada. Convite não enviado: o atleta precisa definir @username no perfil.";
    } else {
      const inv = await conviteUsuarioParaTimeCore(supabase, user.id, createdId, String(targetById.id), u);
      if (inv.ok) {
        inviteAutoSent = true;
        message = "Formação criada e convite enviado. A pessoa vê em Social.";
      } else {
        message = `Formação criada. Convite não enviado: ${inv.message}`;
      }
    }
  }

  revalidatePath("/times");
  revalidatePath(`/perfil/${user.id}`);
  return {
    ok: true,
    message,
    createdTimeId: createdId || undefined,
    ...(inviteAutoSent ? { inviteAutoSent: true } : {}),
  };
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
  const convidadoIdRaw = String(formData.get("convidado_usuario_id") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "").trim().toLowerCase();

  if (!Number.isInteger(timeId) || timeId < 1) return { ok: false, message: "Equipe inválida." };

  let username: string;
  let targetProfileId: string;

  if (convidadoIdRaw && UUID_RE.test(convidadoIdRaw)) {
    const { data: targetById } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", convidadoIdRaw)
      .maybeSingle();
    if (!targetById?.id) {
      return { ok: false, message: "Perfil não encontrado." };
    }
    const u = String(targetById.username ?? "").trim();
    if (!u) {
      return {
        ok: false,
        message: "Este atleta ainda não definiu @username no perfil. Peça para configurar antes de convidar.",
      };
    }
    username = u;
    targetProfileId = targetById.id;
  } else {
    const u = usernameRaw.replace(/^@+/, "");
    if (!u) return { ok: false, message: "Informe o @username do atleta." };
    username = u;
    const { data: targetProfile } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
    if (!targetProfile?.id) {
      return { ok: false, message: "Usuário não encontrado. Verifique o @username informado." };
    }
    targetProfileId = targetProfile.id;
  }

  return conviteUsuarioParaTimeCore(supabase, user.id, timeId, targetProfileId, username);
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
    .select("id, localizacao, esporte_id, escudo")
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
  let escudoFinal = String(owned.escudo ?? "").trim() || null;

  const escudoFile = formData.get("escudo_file");
  if (escudoFile instanceof File && escudoFile.size > 0) {
    if (escudoFile.size > 5 * 1024 * 1024) {
      return { ok: false, message: "A imagem do escudo deve ter no máximo 5MB." };
    }
    const mimeRaw = (escudoFile.type || "").trim().toLowerCase();
    const looksLikeImage =
      mimeRaw.startsWith("image/") || mimeRaw === "application/octet-stream" || mimeRaw === "binary/octet-stream";
    if (!looksLikeImage) {
      return { ok: false, message: "Arquivo inválido. Envie uma imagem (JPG, PNG, WEBP ou HEIC)." };
    }
    const originalName = escudoFile.name || "escudo";
    const ext = originalName.includes(".") ? originalName.split(".").pop()?.toLowerCase() ?? "jpg" : "jpg";
    const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
    const contentType = resolveEscudoContentType(escudoFile, safeExt);
    const path = `${user.id}/time_escudo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
    const up = await supabase.storage.from("avatars").upload(path, escudoFile, {
      upsert: true,
      contentType,
      cacheControl: "3600",
    });
    if (up.error) {
      const detail = up.error.message;
      return {
        ok: false,
        message: detail ? `Não foi possível enviar o escudo. (${detail})` : "Não foi possível enviar o escudo.",
      };
    }
    escudoFinal = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

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
      escudo: escudoFinal,
      nivel_procurado,
      interesse_rank_match: true,
      interesse_torneio: true,
      vagas_abertas: checkboxOn(formData, "vagas_abertas"),
      aceita_pedidos: checkboxOn(formData, "aceita_pedidos"),
    })
    .eq("id", timeId)
    .eq("criador_id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/perfil-time/${timeId}`);
  revalidatePath(`/conta/formacao/time/${timeId}`);
  revalidatePath(`/editar/time/${timeId}`);
  revalidatePath("/times");
  revalidatePath(`/perfil/${user.id}`);
  return { ok: true, message: "Formação atualizada." };
}
