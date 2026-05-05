"use server";

import { revalidatePath } from "next/cache";
import {
  isLikelyImageUpload,
  MAX_RAW_IMAGE_BYTES,
  MSG_FOTO_ENVIO_FALHOU,
} from "@/lib/images/image-upload-helpers";
import { normalizeAvatarBuffer } from "@/lib/images/normalize-avatar-server";
import { normalizeCoverBuffer } from "@/lib/images/normalize-cover-server";
import { createClient } from "@/lib/supabase/server";

const MAX_IMG_BYTES = 6 * 1024 * 1024;

export type ProfileUploadState = null | { ok: true } | { ok: false; message: string };

export async function uploadProfileCoverAction(
  _prev: ProfileUploadState,
  formData: FormData
): Promise<ProfileUploadState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const file = formData.get("cover_file");
  if (!(file instanceof File) || file.size <= 0) return { ok: false, message: "Selecione uma imagem para a capa." };

  if (!isLikelyImageUpload(file)) {
    return { ok: false, message: "Envie um arquivo de imagem para a capa." };
  }
  if (file.size > MAX_RAW_IMAGE_BYTES) {
    return {
      ok: false,
      message: "Esta imagem está muito pesada. Escolha outra foto ou reduza o tamanho no celular.",
    };
  }

  let jpegBuf: Buffer;
  try {
    jpegBuf = await normalizeCoverBuffer(Buffer.from(await file.arrayBuffer()));
  } catch {
    return { ok: false, message: MSG_FOTO_ENVIO_FALHOU };
  }
  if (jpegBuf.length > MAX_IMG_BYTES) {
    return {
      ok: false,
      message: "A capa continua grande demais após otimizar. Tente uma imagem com resolução menor.",
    };
  }

  const path = `${user.id}/cover_${Date.now()}_${Math.random().toString(16).slice(2)}.jpg`;
  const up = await supabase.storage.from("avatars").upload(path, jpegBuf, {
    upsert: true,
    contentType: "image/jpeg",
  });
  if (up.error) return { ok: false, message: MSG_FOTO_ENVIO_FALHOU };

  const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase
    .from("profiles")
    .update({ foto_capa: publicUrl, atualizado_em: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { ok: false, message: MSG_FOTO_ENVIO_FALHOU };

  revalidatePath(`/perfil/${user.id}`);
  revalidatePath("/conta/perfil");
  revalidatePath("/editar/perfil");
  return { ok: true };
}

export async function removeProfileCoverAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("profiles")
    .update({ foto_capa: null, atualizado_em: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return;

  revalidatePath(`/perfil/${user.id}`);
  revalidatePath("/conta/perfil");
  revalidatePath("/editar/perfil");
}

export async function uploadProfileAvatarAction(
  _prev: ProfileUploadState,
  formData: FormData
): Promise<ProfileUploadState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const file = formData.get("avatar_file");
  if (!(file instanceof File) || file.size <= 0) return { ok: false, message: "Selecione uma foto de perfil." };

  if (!isLikelyImageUpload(file)) {
    return { ok: false, message: "Envie um arquivo de imagem (foto de perfil)." };
  }
  if (file.size > MAX_RAW_IMAGE_BYTES) {
    return {
      ok: false,
      message: "Esta foto está muito pesada. Escolha outra imagem ou reduza o tamanho no celular.",
    };
  }

  let jpegBuf: Buffer;
  try {
    jpegBuf = await normalizeAvatarBuffer(Buffer.from(await file.arrayBuffer()));
  } catch {
    return { ok: false, message: MSG_FOTO_ENVIO_FALHOU };
  }
  if (jpegBuf.length > MAX_IMG_BYTES) {
    return {
      ok: false,
      message: "A foto continua grande demais após otimizar. Tente uma imagem com resolução menor.",
    };
  }

  const path = `${user.id}/avatar_${Date.now()}_${Math.random().toString(16).slice(2)}.jpg`;
  const up = await supabase.storage.from("avatars").upload(path, jpegBuf, {
    upsert: true,
    contentType: "image/jpeg",
  });
  if (up.error) return { ok: false, message: MSG_FOTO_ENVIO_FALHOU };

  const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, atualizado_em: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { ok: false, message: MSG_FOTO_ENVIO_FALHOU };

  revalidatePath(`/perfil/${user.id}`);
  revalidatePath("/conta/perfil");
  revalidatePath("/editar/perfil");
  return { ok: true };
}

export async function removeProfileAvatarAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, atualizado_em: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return;

  revalidatePath(`/perfil/${user.id}`);
  revalidatePath("/conta/perfil");
  revalidatePath("/editar/perfil");
}

export async function setViewerHistoricoPublicoAction(mostrar: boolean, formData?: FormData): Promise<void> {
  void formData;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("profiles")
    .update({ mostrar_historico_publico: mostrar, atualizado_em: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return;

  revalidatePath(`/perfil/${user.id}`);
  revalidatePath(`/perfil/${user.id}/historico`);
  revalidatePath("/conta/perfil");
}
