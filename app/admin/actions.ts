"use server";

import { revalidatePath } from "next/cache";
import { getIsPlatformAdmin } from "@/lib/auth/platform-admin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

function svc() {
  if (!hasServiceRoleConfig()) throw new Error("Service role não configurada.");
  return createServiceRoleClient();
}

async function guard() {
  if (!(await getIsPlatformAdmin())) throw new Error("Acesso negado.");
}

export async function adminSetEsporteAtivo(formData: FormData) {
  try {
    await guard();
    const id = Number(formData.get("id"));
    const ativo = formData.get("ativo") === "true";
    if (!Number.isFinite(id)) return;
    const { error } = await svc().from("esportes").update({ ativo }).eq("id", id);
    if (error) return;
    revalidatePath("/admin/esportes");
  } catch {
    return;
  }
}

export async function adminSetTorneioStatus(formData: FormData) {
  try {
    await guard();
    const id = Number(formData.get("id"));
    const status = String(formData.get("status") ?? "").trim();
    if (!Number.isFinite(id) || !status) return;
    const { error } = await svc().from("torneios").update({ status }).eq("id", id);
    if (error) return;
    revalidatePath("/admin/torneios");
  } catch {
    return;
  }
}

export async function adminSetEspacoStatus(formData: FormData) {
  try {
    await guard();
    const id = Number(formData.get("id"));
    const status = String(formData.get("status") ?? "").trim();
    if (!Number.isFinite(id) || !status) return;
    const { error } = await svc().from("espacos_genericos").update({ status }).eq("id", id);
    if (error) return;
    revalidatePath("/admin/locais");
  } catch {
    return;
  }
}

export async function adminSetEspacoListagem(formData: FormData) {
  try {
    await guard();
    const id = Number(formData.get("id"));
    const ativo = formData.get("ativo_listagem") === "true";
    if (!Number.isFinite(id)) return;
    const { error } = await svc().from("espacos_genericos").update({ ativo_listagem: ativo }).eq("id", id);
    if (error) return;
    revalidatePath("/admin/locais");
  } catch {
    return;
  }
}

export async function adminSetDenunciaStatus(formData: FormData) {
  try {
    await guard();
    const id = Number(formData.get("id"));
    const status = String(formData.get("status") ?? "").trim();
    if (!Number.isFinite(id) || !status) return;
    const { error } = await svc().from("denuncias").update({ status }).eq("id", id);
    if (error) return;
    revalidatePath("/admin/denuncias");
  } catch {
    return;
  }
}

export async function adminUpdateFinanceiro(formData: FormData) {
  try {
    await guard();
    const row = {
      torneio_taxa_fixa: Number(formData.get("torneio_taxa_fixa")),
      torneio_taxa_promo: Number(formData.get("torneio_taxa_promo")),
      promocao_dias: Math.round(Number(formData.get("promocao_dias"))),
      clube_mensalidade: Number(formData.get("clube_mensalidade")),
      asaas_taxa_percentual: Number(formData.get("asaas_taxa_percentual")),
      plataforma_sobre_taxa_gateway: Number(formData.get("plataforma_sobre_taxa_gateway")),
      plataforma_sobre_taxa_gateway_promo: Number(formData.get("plataforma_sobre_taxa_gateway_promo")),
    };
    if (Object.values(row).some((n) => Number.isNaN(n))) return;
    const { error } = await svc().from("ei_financeiro_config").update(row).eq("id", 1);
    if (error) return;
    revalidatePath("/admin/financeiro");
  } catch {
    return;
  }
}

export async function adminAddPlatformAdmin(formData: FormData) {
  try {
    await guard();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!email.includes("@")) return;
    const db = svc();
    let found: { id: string } | null = null;
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return;
      const u = data.users.find((x) => (x.email ?? "").toLowerCase() === email);
      if (u) {
        found = { id: u.id };
        break;
      }
      if (!data.users.length) break;
    }
    if (!found) return;
    const { error: insErr } = await db.from("platform_admins").upsert({ user_id: found.id }, { onConflict: "user_id" });
    if (insErr) return;
    revalidatePath("/admin/admins");
  } catch {
    return;
  }
}

export async function adminRemovePlatformAdmin(formData: FormData) {
  try {
    await guard();
    const userId = String(formData.get("user_id") ?? "").trim();
    if (!userId) return;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id === userId) return;
    const { error } = await svc().from("platform_admins").delete().eq("user_id", userId);
    if (error) return;
    revalidatePath("/admin/admins");
  } catch {
    return;
  }
}
