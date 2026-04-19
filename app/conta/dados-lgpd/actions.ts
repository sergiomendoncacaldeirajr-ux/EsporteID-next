"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function solicitarCopiaDados(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/?erro=login");
  }
  const { error } = await supabase
    .from("profiles")
    .update({ lgpd_export_requested_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    redirect("/conta/dados-lgpd?erro=" + encodeURIComponent(error.message));
  }
  await supabase.from("consentimentos_log").insert({
    usuario_id: user.id,
    evento: "lgpd_pedido_exportacao",
    versao: "1",
  });
  revalidatePath("/conta/dados-lgpd");
  redirect("/conta/dados-lgpd?ok=copia");
}

export async function solicitarExclusaoConta(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/?erro=login");
  }
  const { error } = await supabase
    .from("profiles")
    .update({ lgpd_delete_requested_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    redirect("/conta/dados-lgpd?erro=" + encodeURIComponent(error.message));
  }
  await supabase.from("consentimentos_log").insert({
    usuario_id: user.id,
    evento: "lgpd_pedido_exclusao",
    versao: "1",
  });
  revalidatePath("/conta/dados-lgpd");
  redirect("/conta/dados-lgpd?ok=exclusao");
}
