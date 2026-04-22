"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const IMG_ACCEPT = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);
const MAX_IMG_BYTES = 6 * 1024 * 1024;

export async function uploadProfileCoverAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const file = formData.get("cover_file");
  if (!(file instanceof File) || file.size <= 0) return;
  if (!IMG_ACCEPT.has(file.type) || file.size > MAX_IMG_BYTES) return;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${user.id}/cover_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
  const up = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (up.error) return;

  const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase
    .from("profiles")
    .update({ foto_capa: publicUrl, atualizado_em: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return;

  revalidatePath(`/perfil/${user.id}`);
  revalidatePath("/conta/perfil");
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
}

export async function uploadProfileAvatarAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const file = formData.get("avatar_file");
  if (!(file instanceof File) || file.size <= 0) return;
  if (!IMG_ACCEPT.has(file.type) || file.size > MAX_IMG_BYTES) return;

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${user.id}/avatar_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
  const up = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (up.error) return;

  const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, atualizado_em: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return;

  revalidatePath(`/perfil/${user.id}`);
  revalidatePath("/conta/perfil");
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

