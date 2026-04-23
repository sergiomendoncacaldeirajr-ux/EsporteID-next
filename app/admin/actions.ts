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

export async function adminReviewEspacoClaim(formData: FormData) {
  try {
    await guard();
    const claimId = Number(formData.get("claim_id"));
    const decision = String(formData.get("decision") ?? "").trim().toLowerCase();
    const observacoesAdmin = String(formData.get("observacoes_admin") ?? "").trim() || null;
    if (!Number.isFinite(claimId) || !["aprovar", "rejeitar"].includes(decision)) return;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const adminUserId = user?.id ?? null;

    const db = svc();
    const { data: claim } = await db
      .from("espaco_reivindicacoes")
      .select("id, espaco_generico_id, solicitante_id, status")
      .eq("id", claimId)
      .maybeSingle();
    if (!claim) return;

    const reviewedAt = new Date().toISOString();
    const status = decision === "aprovar" ? "aprovado" : "rejeitado";

    const { error: claimErr } = await db
      .from("espaco_reivindicacoes")
      .update({
        status,
        revisado_por_usuario_id: adminUserId,
        revisado_em: reviewedAt,
        observacoes_admin: observacoesAdmin,
      })
      .eq("id", claimId);
    if (claimErr) return;

    if (decision === "aprovar") {
      await db
        .from("espacos_genericos")
        .update({
          responsavel_usuario_id: claim.solicitante_id,
          ownership_status: "verificado",
          ownership_verificado_em: reviewedAt,
          ownership_verificado_por_usuario_id: adminUserId,
          onboarding_documental_status: "aprovado",
          status: "publico",
        })
        .eq("id", claim.espaco_generico_id);
    } else {
      await db
        .from("espacos_genericos")
        .update({
          ownership_status: "rejeitado",
          onboarding_documental_status: "reprovado",
        })
        .eq("id", claim.espaco_generico_id);
    }

    revalidatePath("/admin/locais");
    revalidatePath(`/local/${claim.espaco_generico_id}`);
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

export async function adminMarcarAlertaLido(formData: FormData) {
  try {
    await guard();
    const id = Number(formData.get("id"));
    if (!Number.isFinite(id)) return;
    const { error } = await svc().from("admin_alertas").update({ lido: true }).eq("id", id);
    if (error) return;
    revalidatePath("/admin");
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
      professor_taxa_fixa: Number(formData.get("professor_taxa_fixa")),
      professor_taxa_fixa_promo: Number(formData.get("professor_taxa_fixa_promo")),
      professor_plataforma_sobre_taxa_gateway: Number(formData.get("professor_plataforma_sobre_taxa_gateway")),
      professor_plataforma_sobre_taxa_gateway_promo: Number(formData.get("professor_plataforma_sobre_taxa_gateway_promo")),
      professor_promocao_ativa: formData.get("professor_promocao_ativa") === "on",
      professor_promocao_ate: String(formData.get("professor_promocao_ate") ?? "").trim() || null,
      espaco_taxa_fixa: Number(formData.get("espaco_taxa_fixa")),
      espaco_taxa_fixa_promo: Number(formData.get("espaco_taxa_fixa_promo")),
      espaco_plataforma_sobre_taxa_gateway: Number(formData.get("espaco_plataforma_sobre_taxa_gateway")),
      espaco_plataforma_sobre_taxa_gateway_promo: Number(formData.get("espaco_plataforma_sobre_taxa_gateway_promo")),
      espaco_promocao_ativa: formData.get("espaco_promocao_ativa") === "on",
      espaco_promocao_ate: String(formData.get("espaco_promocao_ate") ?? "").trim() || null,
      torneio_promocao_ativa: formData.get("torneio_promocao_ativa") === "on",
      torneio_promocao_ate: String(formData.get("torneio_promocao_ate") ?? "").trim() || null,
    };
    const numericKeys = [
      "torneio_taxa_fixa",
      "torneio_taxa_promo",
      "promocao_dias",
      "clube_mensalidade",
      "asaas_taxa_percentual",
      "plataforma_sobre_taxa_gateway",
      "plataforma_sobre_taxa_gateway_promo",
      "professor_taxa_fixa",
      "professor_taxa_fixa_promo",
      "professor_plataforma_sobre_taxa_gateway",
      "professor_plataforma_sobre_taxa_gateway_promo",
      "espaco_taxa_fixa",
      "espaco_taxa_fixa_promo",
      "espaco_plataforma_sobre_taxa_gateway",
      "espaco_plataforma_sobre_taxa_gateway_promo",
    ] as const;
    if (numericKeys.some((key) => Number.isNaN(row[key]))) return;
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

export async function adminUpdateEidConfig(formData: FormData) {
  try {
    await guard();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const row = {
      id: 1,
      win_base: Number(formData.get("win_base")),
      loss_base: Number(formData.get("loss_base")),
      wo_bonus: Number(formData.get("wo_bonus")),
      score_gap_bonus: Number(formData.get("score_gap_bonus")),
      double_transfer_pct: Number(formData.get("double_transfer_pct")),
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    };

    if (
      [row.win_base, row.loss_base, row.wo_bonus, row.score_gap_bonus, row.double_transfer_pct].some((value) => !Number.isFinite(value))
    ) {
      return;
    }

    const { error } = await svc().from("eid_config").upsert(row, { onConflict: "id" });
    if (error) return;

    revalidatePath("/admin/eid");
  } catch {
    return;
  }
}

export async function adminRecalcularEidHistorico() {
  try {
    await guard();
    const { error } = await svc().rpc("recalcular_eid_historico");
    if (error) return;

    revalidatePath("/admin/eid");
    revalidatePath("/ranking");
    revalidatePath("/dashboard");
    revalidatePath("/match");
  } catch {
    return;
  }
}

/** Carência mínima (meses) entre confrontos de ranking válidos para o mesmo par de atletas no mesmo esporte. */
export async function adminSetMatchRankCooldownMeses(formData: FormData) {
  try {
    await guard();
    const raw = Number(formData.get("meses"));
    const meses = Number.isFinite(raw) ? Math.max(1, Math.min(120, Math.floor(raw))) : 12;
    const { error } = await svc()
      .from("app_config")
      .upsert(
        {
          key: "match_rank_cooldown_meses",
          value_json: { meses },
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    if (error) return;
    revalidatePath("/admin/regras");
    revalidatePath("/desafio");
  } catch {
    return;
  }
}

/** Limite de jogos de ranking pendentes de resultado por jogador. */
export async function adminSetMatchRankPendingLimit(formData: FormData) {
  try {
    await guard();
    const raw = Number(formData.get("limite"));
    const limite = Number.isFinite(raw) ? Math.max(1, Math.min(20, Math.floor(raw))) : 2;
    const { error } = await svc()
      .from("app_config")
      .upsert(
        {
          key: "match_rank_pending_result_limit",
          value_json: { limite },
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    if (error) return;
    revalidatePath("/admin/regras");
    revalidatePath("/desafio");
    revalidatePath("/match");
  } catch {
    return;
  }
}

/** Prazo (em horas) para autoaprovar resultado pendente sem contestação. */
export async function adminSetMatchResultadoAutoAprovacaoHoras(formData: FormData) {
  try {
    await guard();
    const raw = Number(formData.get("horas"));
    const horas = Number.isFinite(raw) ? Math.max(1, Math.min(168, Math.floor(raw))) : 24;
    const { error } = await svc()
      .from("app_config")
      .upsert(
        {
          key: "match_resultado_autoaprovacao_horas",
          value_json: { horas },
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    if (error) return;
    revalidatePath("/admin/regras");
    revalidatePath("/agenda");
  } catch {
    return;
  }
}
