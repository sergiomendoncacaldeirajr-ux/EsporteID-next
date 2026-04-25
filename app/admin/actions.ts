"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getIsPlatformAdmin } from "@/lib/auth/platform-admin";
import type { SystemFeatureKey, SystemFeatureMode } from "@/lib/system-features";
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

export async function adminSetPaasAprovadoOperacaoSemGateway(formData: FormData) {
  try {
    await guard();
    const id = Number(formData.get("espaco_generico_id") ?? 0);
    if (!Number.isFinite(id) || id < 1) return;
    const ativo = String(formData.get("aprovado_sem_pagamento") ?? "false") === "true";
    const { error } = await svc()
      .from("espacos_genericos")
      .update({ paas_aprovado_operacao_sem_gateway: ativo })
      .eq("id", id);
    if (error) return;
    revalidatePath("/admin/locais");
    revalidatePath("/espaco");
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
      const { data: egMeta } = await db
        .from("espacos_genericos")
        .select("id, modo_reserva, nome_publico")
        .eq("id", claim.espaco_generico_id)
        .maybeSingle();
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
      if (String(egMeta?.modo_reserva ?? "") === "mista") {
        await db.from("espaco_assinaturas_plataforma").upsert(
          {
            espaco_generico_id: claim.espaco_generico_id,
            responsavel_usuario_id: claim.solicitante_id,
            plano_nome: "PaaS — somente taxas (reservas mistas)",
            valor_mensal_centavos: 0,
            status: "active",
            situacao_override: "isento",
            atualizado_em: reviewedAt,
          } as Record<string, unknown>,
          { onConflict: "espaco_generico_id" }
        );
      }
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
      espaco_mensalidade_valor_clube_brl: Number(formData.get("espaco_mensalidade_valor_clube_brl")),
      espaco_mensalidade_valor_condominio_brl: Number(formData.get("espaco_mensalidade_valor_condominio_brl")),
      espaco_mensalidade_valor_centro_brl: Number(formData.get("espaco_mensalidade_valor_centro_brl")),
      espaco_mensalidade_valor_quadra_brl: Number(formData.get("espaco_mensalidade_valor_quadra_brl")),
      espaco_mensalidade_valor_outro_brl: Number(formData.get("espaco_mensalidade_valor_outro_brl")),
      espaco_mensalidade_dias_aviso_antes: Math.round(Number(formData.get("espaco_mensalidade_dias_aviso_antes"))),
      espaco_mensalidade_dias_bloqueio_apos: Math.round(Number(formData.get("espaco_mensalidade_dias_bloqueio_apos"))),
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
      "espaco_mensalidade_valor_clube_brl",
      "espaco_mensalidade_valor_condominio_brl",
      "espaco_mensalidade_valor_centro_brl",
      "espaco_mensalidade_valor_quadra_brl",
      "espaco_mensalidade_valor_outro_brl",
      "espaco_mensalidade_dias_aviso_antes",
      "espaco_mensalidade_dias_bloqueio_apos",
    ] as const;
    if (numericKeys.some((key) => Number.isNaN(row[key]))) return;
    const { error } = await svc().from("ei_financeiro_config").update(row).eq("id", 1);
    if (error) return;
    revalidatePath("/admin/financeiro");
    revalidatePath("/admin/locais");
    revalidatePath("/espaco");
  } catch {
    return;
  }
}

export async function adminUpdateEspacoMensalidadePlataforma(formData: FormData) {
  try {
    await guard();
    const espacoId = Number(formData.get("espaco_generico_id"));
    if (!Number.isFinite(espacoId)) return;
    const categoria = String(formData.get("categoria_mensalidade") ?? "outro").trim();
    if (!new Set(["clube", "condominio", "centro_esportivo", "quadra", "outro"]).has(categoria)) return;
    const planoSel = Number(formData.get("plano_mensal_id") ?? 0);
    const valorReais = Number(formData.get("valor_mensal_brl"));
    if (!Number.isFinite(valorReais) || valorReais < 0) return;
    let valorMensalCentavos = Math.round(valorReais * 100);
    let plano_nome = String(formData.get("plano_nome") ?? "Plataforma").trim() || "Plataforma";
    const plano_mensal_id: number | null = Number.isFinite(planoSel) && planoSel > 0 ? planoSel : null;
    const db = svc();
    if (plano_mensal_id) {
      const { data: p } = await db
        .from("espaco_plano_mensal_plataforma")
        .select("id, nome, valor_mensal_centavos")
        .eq("id", plano_mensal_id)
        .maybeSingle();
      if (p) {
        valorMensalCentavos = Number(p.valor_mensal_centavos) || valorMensalCentavos;
        plano_nome = p.nome ?? plano_nome;
      }
    }
    const proximaRaw = String(formData.get("proxima_cobranca") ?? "").trim();
    const proxima_cobranca = /^\d{4}-\d{2}-\d{2}$/.test(proximaRaw) ? proximaRaw : null;
    const status = String(formData.get("status") ?? "active").trim() || "active";
    const overrideIn = String(formData.get("situacao_override") ?? "").trim();
    const situacao_override =
      overrideIn === "isento" || overrideIn === "forcar_bloqueio" ? overrideIn : null;
    const observacoes_admin = String(formData.get("observacoes_admin") ?? "").trim() || null;
    const { data: esp } = await db
      .from("espacos_genericos")
      .select("responsavel_usuario_id, criado_por_usuario_id")
      .eq("id", espacoId)
      .maybeSingle();
    if (!esp) return;
    const responsavel = esp.responsavel_usuario_id ?? esp.criado_por_usuario_id;
    if (!responsavel) return;
    const { error: e1 } = await db.from("espacos_genericos").update({ categoria_mensalidade: categoria }).eq("id", espacoId);
    if (e1) return;
    const payload: Record<string, unknown> = {
      espaco_generico_id: espacoId,
      responsavel_usuario_id: responsavel,
      valor_mensal_centavos: valorMensalCentavos,
      proxima_cobranca,
      status,
      plano_nome,
      situacao_override,
      observacoes_admin,
      atualizado_em: new Date().toISOString(),
      plano_mensal_id: plano_mensal_id,
    };
    const { error: e2 } = await db.from("espaco_assinaturas_plataforma").upsert(payload, { onConflict: "espaco_generico_id" });
    if (e2) return;
    revalidatePath("/admin/locais");
    revalidatePath("/espaco");
  } catch {
    return;
  }
}

export async function adminUpdateEspacoModoCobranca(formData: FormData) {
  try {
    await guard();
    const id = Number(formData.get("id"));
    if (!Number.isFinite(id)) return;
    const modo_reserva = String(formData.get("modo_reserva") ?? "").trim();
    const modo_monetizacao = String(formData.get("modo_monetizacao") ?? "").trim();
    const taxaBrl = Number(formData.get("taxa_reserva_plataforma_brl"));
    const socios_esp = String(formData.get("socios_mensalidade_espaco") ?? "em_breve").trim();
    if (!new Set(["gratuita", "paga", "mista"]).has(modo_reserva)) return;
    if (!new Set(["mensalidade_plataforma", "apenas_reservas", "misto"]).has(modo_monetizacao)) return;
    if (!new Set(["off", "em_breve", "on"]).has(socios_esp)) return;
    if (!Number.isFinite(taxaBrl) || taxaBrl < 0) return;
    const taxa_reserva_plataforma_centavos = Math.round(taxaBrl * 100);
    const { error } = await svc()
      .from("espacos_genericos")
      .update({
        modo_reserva,
        modo_monetizacao,
        taxa_reserva_plataforma_centavos,
        socios_mensalidade_espaco: socios_esp,
      })
      .eq("id", id);
    if (error) return;
    revalidatePath("/admin/locais");
    revalidatePath("/espaco");
  } catch {
    return;
  }
}

export async function adminAplicarPlanoMensalAutomatico(formData: FormData) {
  try {
    await guard();
    const espacoId = Number(formData.get("espaco_generico_id"));
    if (!Number.isFinite(espacoId)) return;
    const db = svc();
    const { data: esp } = await db
      .from("espacos_genericos")
      .select("id, categoria_mensalidade, responsavel_usuario_id, criado_por_usuario_id")
      .eq("id", espacoId)
      .maybeSingle();
    if (!esp) return;
    const categoria = String(esp.categoria_mensalidade ?? "outro");
    const { count } = await db
      .from("espaco_unidades")
      .select("id", { count: "exact", head: true })
      .eq("espaco_generico_id", espacoId)
      .eq("ativo", true);
    const n = count ?? 0;
    const { data: planos } = await db
      .from("espaco_plano_mensal_plataforma")
      .select("*")
      .is("espaco_generico_id", null)
      .eq("ativo", true);
    const list = (planos ?? []) as Array<{
      id: number;
      nome: string;
      categoria_espaco: string;
      min_unidades: number;
      max_unidades: number | null;
      valor_mensal_centavos: number;
      liberacao: string;
      ordem: number;
    }>;
    const candidatos = list
      .filter(
        (p) =>
          p.categoria_espaco === categoria &&
          p.liberacao === "publico" &&
          n >= p.min_unidades &&
          (p.max_unidades == null || n <= p.max_unidades)
      )
      .sort((a, b) => a.ordem - b.ordem);
    const plano = candidatos[0] ?? null;
    if (!plano) return;
    const responsavel = esp.responsavel_usuario_id ?? esp.criado_por_usuario_id;
    if (!responsavel) return;
    const { error: e2 } = await db.from("espaco_assinaturas_plataforma").upsert(
      {
        espaco_generico_id: espacoId,
        responsavel_usuario_id: responsavel,
        plano_mensal_id: plano.id,
        plano_nome: plano.nome,
        valor_mensal_centavos: plano.valor_mensal_centavos,
        atualizado_em: new Date().toISOString(),
        status: "active",
      },
      { onConflict: "espaco_generico_id" }
    );
    if (e2) return;
    revalidatePath("/admin/locais");
    revalidatePath("/espaco");
  } catch {
    return;
  }
}

export async function adminUpsertPlanoMensalPlataforma(formData: FormData) {
  try {
    await guard();
    const id = Number(formData.get("id") ?? 0);
    const nome = String(formData.get("nome") ?? "").trim();
    if (nome.length < 2) return;
    const categoria_espaco = String(formData.get("categoria_espaco") ?? "outro").trim();
    if (!new Set(["clube", "condominio", "centro_esportivo", "quadra", "outro"]).has(categoria_espaco)) return;
    const min_unidades = Math.max(0, Math.round(Number(formData.get("min_unidades") ?? 1)));
    const maxRaw = String(formData.get("max_unidades") ?? "").trim();
    const max_unidades = maxRaw === "" ? null : Math.max(min_unidades, Math.round(Number(maxRaw)));
    const brl = Number(formData.get("valor_mensal_brl"));
    if (!Number.isFinite(brl) || brl < 0) return;
    const valor_mensal_centavos = Math.round(brl * 100);
    const socios_mensal_modo = String(formData.get("socios_mensal_modo") ?? "nenhum").trim();
    if (!new Set(["nenhum", "em_breve", "disponivel"]).has(socios_mensal_modo)) return;
    const liberacao = String(formData.get("liberacao") ?? "publico").trim();
    if (!new Set(["publico", "em_breve", "inativo"]).has(liberacao)) return;
    const assinatura_recorrencia_auto = formData.get("assinatura_recorrencia_auto") === "on" || String(formData.get("assinatura_recorrencia_auto") ?? "true") === "true";
    const confirmar_pagamento_automatico =
      formData.get("confirmar_pagamento_automatico") === "on" || String(formData.get("confirmar_pagamento_automatico") ?? "true") === "true";
    const ativo = formData.get("ativo") === "on" || String(formData.get("ativo") ?? "true") === "true";
    const ordem = Math.round(Number(formData.get("ordem") ?? 0)) || 0;
    const row: Record<string, unknown> = {
      espaco_generico_id: null,
      nome,
      categoria_espaco,
      min_unidades,
      max_unidades,
      valor_mensal_centavos,
      socios_mensal_modo,
      liberacao,
      assinatura_recorrencia_auto,
      confirmar_pagamento_automatico,
      ativo,
      ordem,
      atualizado_em: new Date().toISOString(),
    };
    const table = svc().from("espaco_plano_mensal_plataforma");
    if (id > 0) {
      const { error } = await table.update(row).eq("id", id);
      if (error) return;
    } else {
      const { error } = await table.insert({ ...row, criado_em: new Date().toISOString() });
      if (error) return;
    }
    revalidatePath("/admin/locais");
    revalidatePath("/admin/locais/planos-mensalidade");
  } catch {
    return;
  }
}

export async function adminDeletePlanoMensalPlataforma(formData: FormData) {
  try {
    await guard();
    const id = Number(formData.get("id"));
    if (!Number.isFinite(id) || id < 1) return;
    const { error } = await svc().from("espaco_plano_mensal_plataforma").delete().eq("id", id);
    if (error) return;
    revalidatePath("/admin/locais/planos-mensalidade");
    revalidatePath("/admin/locais");
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

export async function adminAddPlatformAdminByUserId(formData: FormData) {
  let returnQuery = "";
  try {
    await guard();
    returnQuery = String(formData.get("q") ?? "").trim();
    const userId = String(formData.get("user_id") ?? "").trim();
    if (!userId) return;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id === userId) return;
    const { data: got, error: gErr } = await svc().auth.admin.getUserById(userId);
    if (gErr || !got.user) return;
    const { error: insErr } = await svc().from("platform_admins").upsert({ user_id: userId }, { onConflict: "user_id" });
    if (insErr) return;
    revalidatePath("/admin/admins");
  } catch {
    return;
  }
  if (returnQuery) {
    redirect(`/admin/admins?q=${encodeURIComponent(returnQuery)}`);
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

const ALL_SYSTEM_FEATURE_KEYS: SystemFeatureKey[] = [
  "marketplace",
  "locais",
  "torneios",
  "professores",
  "organizador_torneios",
];

function normalizeTestersArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((x) => String(x ?? "").trim()).filter(Boolean))];
}

function mergeUserIntoAllFeatureTestersJson(prevValue: unknown, userId: string): Record<string, unknown> {
  const prevObj =
    prevValue && typeof prevValue === "object" && !Array.isArray(prevValue) ? (prevValue as Record<string, unknown>) : {};
  const prevFeatures =
    prevObj.features && typeof prevObj.features === "object" && !Array.isArray(prevObj.features)
      ? (prevObj.features as Record<string, unknown>)
      : {};
  const nextFeatures: Record<string, unknown> = { ...prevFeatures };
  for (const key of ALL_SYSTEM_FEATURE_KEYS) {
    const row = prevFeatures[key];
    let mode = "desenvolvimento";
    let testers: string[] = [];
    if (row && typeof row === "object" && !Array.isArray(row)) {
      const o = row as { mode?: unknown; testers?: unknown };
      if (typeof o.mode === "string" && o.mode) mode = o.mode;
      testers = normalizeTestersArray(o.testers);
    }
    if (!testers.includes(userId)) testers = [...testers, userId];
    nextFeatures[key] = { mode, testers };
  }
  return { ...prevObj, features: nextFeatures };
}

function isUserInAllFeatureTesters(prevValue: unknown, userId: string): boolean {
  if (!userId) return false;
  const prevObj =
    prevValue && typeof prevValue === "object" && !Array.isArray(prevValue) ? (prevValue as Record<string, unknown>) : {};
  const prevFeatures =
    prevObj.features && typeof prevObj.features === "object" && !Array.isArray(prevObj.features)
      ? (prevObj.features as Record<string, unknown>)
      : {};
  for (const key of ALL_SYSTEM_FEATURE_KEYS) {
    const row = prevFeatures[key];
    let testers: string[] = [];
    if (row && typeof row === "object" && !Array.isArray(row)) {
      testers = normalizeTestersArray((row as { testers?: unknown }).testers);
    }
    if (!testers.includes(userId)) return false;
  }
  return true;
}

/** Volta ao painel Admins com mensagem (toast via query). */
function redirectAdminsWithFlash(q: string, flash: string): never {
  const p = new URLSearchParams();
  const trimmedQ = q.trim();
  if (trimmedQ) p.set("q", trimmedQ);
  p.set("adm_flash", flash);
  redirect(`/admin/admins?${p.toString()}`);
}

function removeUserFromAllFeatureTestersJson(prevValue: unknown, userId: string): Record<string, unknown> {
  const prevObj =
    prevValue && typeof prevValue === "object" && !Array.isArray(prevValue) ? (prevValue as Record<string, unknown>) : {};
  const prevFeatures =
    prevObj.features && typeof prevObj.features === "object" && !Array.isArray(prevObj.features)
      ? (prevObj.features as Record<string, unknown>)
      : {};
  const nextFeatures: Record<string, unknown> = { ...prevFeatures };
  for (const key of ALL_SYSTEM_FEATURE_KEYS) {
    const row = prevFeatures[key];
    let mode = "desenvolvimento";
    let testers: string[] = [];
    if (row && typeof row === "object" && !Array.isArray(row)) {
      const o = row as { mode?: unknown; testers?: unknown };
      if (typeof o.mode === "string" && o.mode) mode = o.mode;
      testers = normalizeTestersArray(o.testers);
    }
    testers = testers.filter((id) => id !== userId);
    nextFeatures[key] = { mode, testers };
  }
  return { ...prevObj, features: nextFeatures };
}

function revalidateAfterFeatureTesters() {
  revalidatePath("/admin/admins");
  revalidatePath("/admin/regras");
  revalidatePath("/admin/funcionalidades-do-app");
  revalidatePath("/dashboard");
  revalidatePath("/locais");
  revalidatePath("/torneios");
  revalidatePath("/professores");
  revalidatePath("/organizador");
}

/** Inclui o usuário (por e-mail) em `testers` de todas as funcionalidades — visível quando o modo for `teste` em Admin → Funcionalidades do app. */
export async function adminAddUserToFeatureTesters(formData: FormData) {
  await guard();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) {
    redirectAdminsWithFlash("", "testador_erro_email_invalido");
  }
  const db = svc();
  let found: { id: string } | null = null;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      redirectAdminsWithFlash("", "testador_erro_auth");
    }
    const u = data.users.find((x) => (x.email ?? "").toLowerCase() === email);
    if (u) {
      found = { id: u.id };
      break;
    }
    if (!data.users.length) break;
  }
  if (!found) {
    redirectAdminsWithFlash("", "testador_erro_email_nao_encontrado");
  }
  const { data: prev } = await db.from("app_config").select("value_json").eq("key", "system_feature_modes_v1").maybeSingle();
  const already = isUserInAllFeatureTesters(prev?.value_json, found.id);
  const nextValue = mergeUserIntoAllFeatureTestersJson(prev?.value_json ?? null, found.id);
  const { error } = await db
    .from("app_config")
    .upsert(
      {
        key: "system_feature_modes_v1",
        value_json: nextValue,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
  if (error) {
    redirectAdminsWithFlash("", "testador_erro_save");
  }
  revalidateAfterFeatureTesters();
  redirectAdminsWithFlash("", already ? "testador_ja" : "testador_ok");
}

export async function adminAddUserToFeatureTestersByUserId(formData: FormData) {
  await guard();
  const returnQuery = String(formData.get("q") ?? "").trim();
  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) {
    redirectAdminsWithFlash(returnQuery, "testador_erro_param");
  }
  const { data: got, error: gErr } = await svc().auth.admin.getUserById(userId);
  if (gErr || !got.user) {
    redirectAdminsWithFlash(returnQuery, "testador_erro_auth");
  }
  const db = svc();
  const { data: prev } = await db.from("app_config").select("value_json").eq("key", "system_feature_modes_v1").maybeSingle();
  const already = isUserInAllFeatureTesters(prev?.value_json, userId);
  const nextValue = mergeUserIntoAllFeatureTestersJson(prev?.value_json ?? null, userId);
  const { error } = await db
    .from("app_config")
    .upsert(
      {
        key: "system_feature_modes_v1",
        value_json: nextValue,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
  if (error) {
    redirectAdminsWithFlash(returnQuery, "testador_erro_save");
  }
  revalidateAfterFeatureTesters();
  redirectAdminsWithFlash(returnQuery, already ? "testador_ja" : "testador_ok");
}

export async function adminRemoveUserFromFeatureTesters(formData: FormData) {
  await guard();
  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) {
    redirectAdminsWithFlash("", "testador_remov_erro_param");
  }
  const db = svc();
  const { data: prev } = await db.from("app_config").select("value_json").eq("key", "system_feature_modes_v1").maybeSingle();
  const nextValue = removeUserFromAllFeatureTestersJson(prev?.value_json ?? null, userId);
  const { error } = await db
    .from("app_config")
    .upsert(
      {
        key: "system_feature_modes_v1",
        value_json: nextValue,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
  if (error) {
    redirectAdminsWithFlash("", "testador_erro_save");
  }
  revalidateAfterFeatureTesters();
  redirectAdminsWithFlash("", "testador_remov_ok");
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

export async function adminSetSystemFeatureMode(formData: FormData) {
  try {
    await guard();
    const feature = String(formData.get("feature") ?? "").trim() as SystemFeatureKey;
    const mode = String(formData.get("mode") ?? "").trim() as SystemFeatureMode;
    const testersRaw = String(formData.get("testers") ?? "");
    const validFeature = new Set<SystemFeatureKey>([
      "marketplace",
      "locais",
      "torneios",
      "professores",
      "organizador_torneios",
    ]);
    const validMode = new Set<SystemFeatureMode>(["ativo", "em_breve", "desenvolvimento", "teste"]);
    if (!validFeature.has(feature) || !validMode.has(mode)) return;
    const testers = [...new Set(testersRaw.split(/[,\n;\s]+/).map((v) => v.trim()).filter(Boolean))];

    const db = svc();
    const { data: prev } = await db.from("app_config").select("value_json").eq("key", "system_feature_modes_v1").maybeSingle();
    const prevObj =
      prev?.value_json && typeof prev.value_json === "object" && !Array.isArray(prev.value_json)
        ? (prev.value_json as { features?: Record<string, unknown> })
        : {};
    const prevFeatures =
      prevObj.features && typeof prevObj.features === "object" && !Array.isArray(prevObj.features)
        ? prevObj.features
        : {};
    const nextValue = {
      ...prevObj,
      features: {
        ...prevFeatures,
        [feature]: { mode, testers },
      },
    };
    const { error } = await db
      .from("app_config")
      .upsert(
        {
          key: "system_feature_modes_v1",
          value_json: nextValue,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    if (error) return;
    revalidatePath("/admin/regras");
    revalidatePath("/admin/funcionalidades-do-app");
    revalidatePath("/dashboard");
    revalidatePath("/locais");
    revalidatePath("/torneios");
    revalidatePath("/professores");
    revalidatePath("/organizador");
  } catch {
    return;
  }
}

// --- Regras de ranking (tabelas regras_ranking / regras_ranking_match) ---

export async function adminUpdateRegrasRankingRow(formData: FormData) {
  try {
    await guard();
    const esporteId = Number(formData.get("esporte_id"));
    const modalidade = String(formData.get("modalidade") ?? "").trim();
    if (!Number.isFinite(esporteId) || !modalidade) return;
    const row = {
      pontos_vitoria: Math.round(Number(formData.get("pontos_vitoria"))),
      pontos_derrota: Math.round(Number(formData.get("pontos_derrota"))),
      pontos_empate: Math.round(Number(formData.get("pontos_empate"))),
    };
    if ([row.pontos_vitoria, row.pontos_derrota, row.pontos_empate].some((n) => !Number.isFinite(n))) return;
    const { error } = await svc()
      .from("regras_ranking")
      .update(row)
      .eq("esporte_id", esporteId)
      .eq("modalidade", modalidade);
    if (error) return;
    revalidatePath("/admin/regras");
  } catch {
    return;
  }
}

export async function adminUpdateRegrasRankingMatchRow(formData: FormData) {
  try {
    await guard();
    const esporteId = Number(formData.get("esporte_id"));
    if (!Number.isFinite(esporteId)) return;
    const row = {
      pontos_vitoria: Math.round(Number(formData.get("pontos_vitoria"))),
      pontos_derrota: Math.round(Number(formData.get("pontos_derrota"))),
      pontos_por_set: Math.round(Number(formData.get("pontos_por_set"))),
      k_factor: Math.round(Number(formData.get("k_factor"))),
      bonus_por_gol: Math.round(Number(formData.get("bonus_por_gol"))),
      bonus_por_game: Math.round(Number(formData.get("bonus_por_game"))),
    };
    if (Object.values(row).some((n) => !Number.isFinite(n))) return;
    const { error } = await svc().from("regras_ranking_match").update(row).eq("esporte_id", esporteId);
    if (error) return;
    revalidatePath("/admin/regras");
  } catch {
    return;
  }
}

// --- Esportes (criar / editar) ---

function slugifyEsporte(nome: string) {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function adminCreateEsporte(formData: FormData) {
  try {
    await guard();
    const nome = String(formData.get("nome") ?? "").trim();
    if (nome.length < 2) return;
    const slugIn = String(formData.get("slug") ?? "").trim();
    const slug = slugIn ? slugifyEsporte(slugIn) : slugifyEsporte(nome);
    if (!slug) return;
    const row = {
      nome,
      slug,
      tipo: String(formData.get("tipo") ?? "individual").trim() || "individual",
      tipo_lancamento: String(formData.get("tipo_lancamento") ?? "sets").trim() || "sets",
      categoria_processamento: String(formData.get("categoria_processamento") ?? "confronto").trim() || "confronto",
      permite_individual: formData.get("permite_individual") === "on" || formData.get("permite_individual") === "true",
      permite_dupla: formData.get("permite_dupla") === "on" || formData.get("permite_dupla") === "true",
      permite_time: formData.get("permite_time") === "on" || formData.get("permite_time") === "true",
      ativo: formData.get("ativo") === "on",
      ordem: Math.round(Number(formData.get("ordem") ?? 0)) || 0,
    };
    if (!Number.isFinite(row.ordem)) return;
    const { error } = await svc().from("esportes").insert(row);
    if (error) return;
    revalidatePath("/admin/esportes");
  } catch {
    return;
  }
}

export async function adminUpdateEsporteCatalogo(formData: FormData) {
  try {
    await guard();
    const id = Number(formData.get("id"));
    if (!Number.isFinite(id)) return;
    const nome = String(formData.get("nome") ?? "").trim();
    if (nome.length < 2) return;
    const slugIn = String(formData.get("slug") ?? "").trim();
    const slug = slugIn ? slugifyEsporte(slugIn) : slugifyEsporte(nome);
    if (!slug) return;
    const row = {
      nome,
      slug,
      tipo: String(formData.get("tipo") ?? "individual").trim() || "individual",
      tipo_lancamento: String(formData.get("tipo_lancamento") ?? "sets").trim() || "sets",
      categoria_processamento: String(formData.get("categoria_processamento") ?? "confronto").trim() || "confronto",
      permite_individual: formData.get("permite_individual") === "on" || formData.get("permite_individual") === "true",
      permite_dupla: formData.get("permite_dupla") === "on" || formData.get("permite_dupla") === "true",
      permite_time: formData.get("permite_time") === "on" || formData.get("permite_time") === "true",
      ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
      ordem: Math.round(Number(formData.get("ordem") ?? 0)) || 0,
    };
    if (!Number.isFinite(row.ordem)) return;
    const { error } = await svc().from("esportes").update(row).eq("id", id);
    if (error) return;
    revalidatePath("/admin/esportes");
  } catch {
    return;
  }
}

// --- Perfil e EID (admin) ---

export async function adminUpdateProfileById(formData: FormData) {
  try {
    await guard();
    const userId = String(formData.get("user_id") ?? "").trim();
    if (!userId) return;
    const genero = String(formData.get("genero") ?? "").trim() || null;
    const dataNasc = String(formData.get("data_nascimento") ?? "").trim();
    const data_nascimento: string | null = /^\d{4}-\d{2}-\d{2}$/.test(dataNasc) ? dataNasc : null;
    const row: Record<string, unknown> = {
      nome: String(formData.get("nome") ?? "").trim() || null,
      username: (() => {
        const u = String(formData.get("username") ?? "").trim();
        return u || null;
      })(),
      whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
      localizacao: String(formData.get("localizacao") ?? "").trim() || null,
      bio: String(formData.get("bio") ?? "").trim() || null,
      tipo_usuario: String(formData.get("tipo_usuario") ?? "atleta").trim() || "atleta",
      genero,
      data_nascimento,
      interesse_rank_match: formData.get("interesse_rank_match") === "on",
      interesse_torneio: formData.get("interesse_torneio") === "on",
      disponivel_amistoso: formData.get("disponivel_amistoso") === "on",
      status_conta: (() => {
        const s = String(formData.get("status_conta") ?? "").trim();
        return s || null;
      })(),
      atualizado_em: new Date().toISOString(),
    };
    const { error } = await svc().from("profiles").update(row).eq("id", userId);
    if (error) return;
    revalidatePath("/admin/usuarios");
    revalidatePath(`/admin/usuarios/${userId}`);
    revalidatePath(`/perfil/${userId}`);
  } catch {
    return;
  }
}

export async function adminUpdateUsuarioEidRow(formData: FormData) {
  try {
    await guard();
    const id = Number(formData.get("usuario_eid_id"));
    if (!Number.isFinite(id)) return;
    const userId = String(formData.get("user_id") ?? "").trim();
    if (!userId) return;
    const nota_eid = Number(formData.get("nota_eid"));
    const vitorias = Math.round(Number(formData.get("vitorias")));
    const derrotas = Math.round(Number(formData.get("derrotas")));
    const partidas_jogadas = Math.round(Number(formData.get("partidas_jogadas")));
    const pontos_ranking = Math.round(Number(formData.get("pontos_ranking")));
    const posStr = String(formData.get("posicao_rank") ?? "").trim();
    const posicao_rank: number | null = posStr === "" ? null : Math.round(Number(posStr));
    const categoria = String(formData.get("categoria") ?? "").trim() || null;
    const interesse_match = String(formData.get("interesse_match") ?? "ranking_e_amistoso").trim();
    if (!["ranking", "ranking_e_amistoso"].includes(interesse_match)) return;
    if (!Number.isFinite(nota_eid) || ![vitorias, derrotas, partidas_jogadas, pontos_ranking].every((n) => Number.isFinite(n))) return;
    if (posStr !== "" && (posicao_rank == null || !Number.isFinite(posicao_rank))) return;
    const row: Record<string, unknown> = {
      nota_eid: Math.min(10, Math.max(0, nota_eid)),
      vitorias,
      derrotas,
      partidas_jogadas,
      pontos_ranking,
      posicao_rank: posicao_rank,
      categoria,
      interesse_match,
    };
    const { error } = await svc().from("usuario_eid").update(row).eq("id", id).eq("usuario_id", userId);
    if (error) return;
    revalidatePath("/admin/usuarios");
    revalidatePath(`/admin/usuarios/${userId}`);
    revalidatePath("/ranking");
  } catch {
    return;
  }
}

export async function adminZerarUsuarioEidTodas(formData: FormData) {
  try {
    await guard();
    const userId = String(formData.get("user_id") ?? "").trim();
    if (!userId) return;
    const confirmar = String(formData.get("confirmar") ?? "").trim();
    if (confirmar.toUpperCase() !== "ZERAR") return;
    const { error } = await svc()
      .from("usuario_eid")
      .update({
        nota_eid: 0,
        vitorias: 0,
        derrotas: 0,
        partidas_jogadas: 0,
        pontos_ranking: 0,
        posicao_rank: null,
      })
      .eq("usuario_id", userId);
    if (error) return;
    revalidatePath("/admin/usuarios");
    revalidatePath(`/admin/usuarios/${userId}`);
    revalidatePath("/ranking");
  } catch {
    return;
  }
}

export async function adminSetAuthUserBan(formData: FormData) {
  try {
    await guard();
    const userId = String(formData.get("user_id") ?? "").trim();
    if (!userId) return;
    const acao = String(formData.get("acao") ?? "").trim();
    if (!["banir", "desbanir"].includes(acao)) return;
    const supabase = await createClient();
    const { data: me } = await supabase.auth.getUser();
    if (me.user?.id === userId) return;
    if (acao === "banir") {
      const { error } = await svc().auth.admin.updateUserById(userId, { ban_duration: "2628000h" });
      if (error) return;
    } else {
      const { error: e1 } = await svc().auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (e1) {
        const { error: e2 } = await svc().auth.admin.updateUserById(userId, { ban_duration: "0" });
        if (e2) return;
      }
    }
    revalidatePath("/admin/usuarios");
    revalidatePath(`/admin/usuarios/${userId}`);
  } catch {
    return;
  }
}

export async function adminDeleteAuthUserCompletamente(formData: FormData) {
  try {
    await guard();
    const userId = String(formData.get("user_id") ?? "").trim();
    const confirmar = String(formData.get("confirmar_excluir_id") ?? "").trim();
    if (!userId || confirmar !== userId) return;
    const supabase = await createClient();
    const { data: me } = await supabase.auth.getUser();
    if (me.user?.id === userId) return;
    const { data: u } = await svc().from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
    if (u) return;
    const { error } = await svc().auth.admin.deleteUser(userId);
    if (error) return;
    revalidatePath("/admin/usuarios");
  } catch {
    return;
  }
}
