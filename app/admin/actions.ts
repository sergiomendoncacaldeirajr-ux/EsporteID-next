"use server";

import { revalidatePath } from "next/cache";
import { getIsPlatformAdmin } from "@/lib/auth/platform-admin";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

async function svc() {
  if (!hasServiceRoleConfig()) throw new Error("Service role não configurada.");
  return createServiceRoleClient();
}

async function guard() {
  if (!(await getIsPlatformAdmin())) throw new Error("Acesso negado.");
}

export type ActionResult = { ok: true } | { ok: false; message: string };

export async function adminSetEsporteAtivo(formData: FormData): Promise<ActionResult> {
  try {
    await guard();
    const id = Number(formData.get("id"));
    const ativo = formData.get("ativo") === "true";
    if (!Number.isFinite(id)) return { ok: false, message: "ID inválido." };
    const db = await svc();
    const { error } = await db.from("esportes").update({ ativo }).eq("id", id);
    if (error) return { ok: false, message: error.message };
    revalidatePath("/admin/esportes");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro." };
  }
}

export async function adminSetTorneioStatus(formData: FormData): Promise<ActionResult> {
  try {
    await guard();
    const id = Number(formData.get("id"));
    const status = String(formData.get("status") ?? "").trim();
    if (!Number.isFinite(id) || !status) return { ok: false, message: "Dados inválidos." };
    const db = await svc();
    const { error } = await db.from("torneios").update({ status }).eq("id", id);
    if (error) return { ok: false, message: error.message };
    revalidatePath("/admin/torneios");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro." };
  }
}

export async function adminSetEspacoStatus(formData: FormData): Promise<ActionResult> {
  try {
    await guard();
    const id = Number(formData.get("id"));
    const status = String(formData.get("status") ?? "").trim();
    if (!Number.isFinite(id) || !status) return { ok: false, message: "Dados inválidos." };
    const db = await svc();
    const { error } = await db.from("espacos_genericos").update({ status }).eq("id", id);
    if (error) return { ok: false, message: error.message };
    revalidatePath("/admin/locais");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro." };
  }
}

export async function adminSetEspacoListagem(formData: FormData): Promise<ActionResult> {
  try {
    await guard();
    const id = Number(formData.get("id"));
    const ativo = formData.get("ativo_listagem") === "true";
    if (!Number.isFinite(id)) return { ok: false, message: "ID inválido." };
    const db = await svc();
    const { error } = await db.from("espacos_genericos").update({ ativo_listagem: ativo }).eq("id", id);
    if (error) return { ok: false, message: error.message };
    revalidatePath("/admin/locais");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro." };
  }
}

export async function adminSetDenunciaStatus(formData: FormData): Promise<ActionResult> {
  try {
    await guard();
    const id = Number(formData.get("id"));
    const status = String(formData.get("status") ?? "").trim();
    if (!Number.isFinite(id) || !status) return { ok: false, message: "Dados inválidos." };
    const db = await svc();
    const { error } = await db.from("denuncias").update({ status }).eq("id", id);
    if (error) return { ok: false, message: error.message };
    revalidatePath("/admin/denuncias");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro." };
  }
}

export async function adminUpdateFinanceiro(formData: FormData): Promise<ActionResult> {
  try {
    await guard();
    const db = await svc();
    const row = {
      torneio_taxa_fixa: Number(formData.get("torneio_taxa_fixa")),
      torneio_taxa_promo: Number(formData.get("torneio_taxa_promo")),
      promocao_dias: Math.round(Number(formData.get("promocao_dias"))),
      clube_mensalidade: Number(formData.get("clube_mensalidade")),
      asaas_taxa_percentual: Number(formData.get("asaas_taxa_percentual")),
      plataforma_sobre_taxa_gateway: Number(formData.get("plataforma_sobre_taxa_gateway")),
      plataforma_sobre_taxa_gateway_promo: Number(formData.get("plataforma_sobre_taxa_gateway_promo")),
    };
    if (Object.values(row).some((n) => Number.isNaN(n))) {
      return { ok: false, message: "Valores numéricos inválidos." };
    }
    const { error } = await db.from("ei_financeiro_config").update(row).eq("id", 1);
    if (error) return { ok: false, message: error.message };
    revalidatePath("/admin/financeiro");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro." };
  }
}

export async function adminAddPlatformAdmin(formData: FormData): Promise<ActionResult> {
  try {
    await guard();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!email.includes("@")) return { ok: false, message: "E-mail inválido." };
    const db = await svc();
    let found: { id: string } | null = null;
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return { ok: false, message: error.message };
      const u = data.users.find((x) => (x.email ?? "").toLowerCase() === email);
      if (u) {
        found = { id: u.id };
        break;
      }
      if (!data.users.length) break;
    }
    if (!found) return { ok: false, message: "Usuário não encontrado no Auth (confirme o e-mail cadastrado)." };
    const { error: insErr } = await db.from("platform_admins").upsert({ user_id: found.id }, { onConflict: "user_id" });
    if (insErr) return { ok: false, message: insErr.message };
    revalidatePath("/admin/admins");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro." };
  }
}

export async function adminRemovePlatformAdmin(formData: FormData): Promise<ActionResult> {
  try {
    await guard();
    const userId = String(formData.get("user_id") ?? "").trim();
    if (!userId) return { ok: false, message: "ID inválido." };
    const {
      data: { user },
    } = await (await import("@/lib/supabase/server")).createClient().auth.getUser();
    if (user?.id === userId) return { ok: false, message: "Remova outro admin antes de si mesmo." };
    const db = await svc();
    const { error } = await db.from("platform_admins").delete().eq("user_id", userId);
    if (error) return { ok: false, message: error.message };
    revalidatePath("/admin/admins");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro." };
  }
}
