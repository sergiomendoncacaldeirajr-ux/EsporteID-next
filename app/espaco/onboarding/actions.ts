"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugifyEspaco } from "@/lib/espacos/slug";
import { fetchAutomaticHolidaysForYear } from "@/lib/espacos/calendar";
import { getPaaSUnidadeGateInfo } from "@/lib/espacos/paas-unidades-gate";
import { escolherPlanoMensalidadePaaSAction } from "@/app/espaco/actions";

type State = { ok: true; message: string } | { ok: false; message: string };

async function requireWizardManager(espacoId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada.");
  const { data: espaco } = await supabase
    .from("espacos_genericos")
    .select("id, responsavel_usuario_id, uf, codigo_ibge")
    .eq("id", espacoId)
    .eq("responsavel_usuario_id", user.id)
    .maybeSingle();
  if (!espaco) throw new Error("Sem permissão para configurar este espaço.");
  return { supabase, user, espaco };
}

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}
function bool(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function normalizeWebsiteUrl(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    if (!url.hostname.startsWith("www.") && !/^(localhost|\d{1,3}(?:\.\d{1,3}){3})$/i.test(url.hostname)) {
      url.hostname = `www.${url.hostname}`;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    const withoutProtocol = withProtocol.replace(/^https?:\/\//i, "");
    return `https://${withoutProtocol.startsWith("www.") ? withoutProtocol : `www.${withoutProtocol}`}`;
  }
}

function normalizeInstagramHandle(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  const handle = value
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^\/+|\/+$/g, "");
  return handle.startsWith("@") ? handle : `@${handle}`;
}

async function uploadLogoUnidadeWizard(file: File, userId: string) {
  const supabase = await createClient();
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie uma imagem (PNG, JPG ou WEBP).");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Imagem acima de 5MB.");
  }
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/unidade_${Date.now()}_${Math.random().toString(16).slice(2, 8)}.${safeExt}`;
  const { error } = await supabase.storage.from("espaco-logos").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from("espaco-logos").getPublicUrl(path).data.publicUrl;
}

async function uploadImagemEspacoWizard(file: File, userId: string, prefix: "logo" | "cover") {
  const supabase = await createClient();
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie uma imagem (PNG, JPG, WEBP ou HEIC).");
  }
  if (file.size > 6 * 1024 * 1024) {
    throw new Error("Imagem acima de 6MB.");
  }
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${prefix}_espaco_${Date.now()}_${Math.random().toString(16).slice(2, 8)}.${safeExt}`;
  const { error } = await supabase.storage.from("espaco-logos").upload(path, file, {
    upsert: true,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from("espaco-logos").getPublicUrl(path).data.publicUrl;
}

// ── Step 1 ─────────────────────────────────────────────────────────────────
export async function salvarModeloEspacoAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const { supabase } = await requireWizardManager(espacoId);
    const categoria = field(formData, "categoria_mensalidade") || "quadra";
    const modoReserva = field(formData, "modo_reserva") || "mista";
    const aceitaSocios = bool(formData, "aceita_socios");
    const modoMonetizacao =
      modoReserva === "paga" ? "apenas_reservas" : "mensalidade_plataforma";
    const { error } = await supabase
      .from("espacos_genericos")
      .update({
        categoria_mensalidade: categoria,
        modo_reserva: modoReserva,
        aceita_socios: aceitaSocios,
        modo_monetizacao: modoMonetizacao,
      })
      .eq("id", espacoId);
    if (error) throw new Error(error.message);
    revalidatePath("/espaco/onboarding");
    return { ok: true, message: "Modelo de operação salvo." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao salvar." };
  }
}

// ── Step 2 ─────────────────────────────────────────────────────────────────
export async function salvarPerfilWizardAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const { supabase, user } = await requireWizardManager(espacoId);
    const nomePublico = field(formData, "nome_publico");
    if (nomePublico.length < 2) throw new Error("Informe o nome do espaço.");
    const slugBase = slugifyEspaco(
      field(formData, "slug") || nomePublico || `espaco-${espacoId}`
    );
    const { data: existing } = await supabase
      .from("espacos_genericos")
      .select("id")
      .eq("slug", slugBase)
      .neq("id", espacoId)
      .maybeSingle();
    const slugFinal = existing ? `${slugBase}-${espacoId}` : slugBase;
    const logoFile = formData.get("logo_file");
    const coverFile = formData.get("cover_file");
    const logoArquivo =
      logoFile instanceof File && logoFile.size > 0
        ? await uploadImagemEspacoWizard(logoFile, user.id, "logo")
        : undefined;
    const coverArquivo =
      coverFile instanceof File && coverFile.size > 0
        ? await uploadImagemEspacoWizard(coverFile, user.id, "cover")
        : undefined;
    const updatePayload: Record<string, unknown> = {
      nome_publico: nomePublico,
      slug: slugFinal,
      cidade: field(formData, "cidade") || null,
      uf: field(formData, "uf").toUpperCase() || null,
      descricao_curta: field(formData, "descricao_curta") || null,
      descricao_longa: field(formData, "descricao_longa") || null,
      whatsapp_contato: field(formData, "whatsapp_contato") || null,
      email_contato: field(formData, "email_contato") || null,
      website_url: normalizeWebsiteUrl(field(formData, "website_url")) || null,
      instagram_url: normalizeInstagramHandle(field(formData, "instagram_url")) || null,
    };
    if (logoArquivo !== undefined) updatePayload.logo_arquivo = logoArquivo;
    if (field(formData, "logo_remove") === "1") updatePayload.logo_arquivo = null;
    if (coverArquivo !== undefined) updatePayload.cover_arquivo = coverArquivo;
    if (field(formData, "cover_remove") === "1") updatePayload.cover_arquivo = null;
    const { error } = await supabase
      .from("espacos_genericos")
      .update(updatePayload)
      .eq("id", espacoId);
    if (error) throw new Error(error.message);
    revalidatePath("/espaco");
    revalidatePath("/espaco/onboarding");
    return { ok: true, message: "Perfil salvo." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao salvar perfil." };
  }
}

// ── Step 3 — unidades ─────────────────────────────────────────────────────
export async function criarUnidadeWizardAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const { supabase, user } = await requireWizardManager(espacoId);
    const gate = await getPaaSUnidadeGateInfo(supabase, espacoId);
    if (!gate.podeCriarUnidade) {
      throw new Error(gate.motivoBloqueio ?? "Seu plano atual não permite cadastrar outra quadra no momento.");
    }
    const nome = field(formData, "nome");
    if (nome.length < 2) throw new Error("Informe o nome da quadra ou campo.");
    const logoFile = formData.get("logo_file");
    let logoArquivo: string | null = null;
    if (logoFile instanceof File && logoFile.size > 0) {
      logoArquivo = await uploadLogoUnidadeWizard(logoFile, user.id);
    }
    const payload = {
      espaco_generico_id: espacoId,
      nome,
      tipo_unidade: field(formData, "tipo_unidade") || "quadra",
      superficie: field(formData, "superficie") || null,
      coberta: bool(formData, "coberta"),
      indoor: bool(formData, "indoor"),
      iluminacao: bool(formData, "iluminacao"),
      capacidade: Math.max(1, Number(formData.get("capacidade") ?? 2) || 2),
      aceita_aulas: bool(formData, "aceita_aulas"),
      aceita_torneios: bool(formData, "aceita_torneios"),
      observacoes: field(formData, "observacoes") || null,
      logo_arquivo: logoArquivo,
      status_operacao: "ativa",
      ativo: true,
    };
    const { error } = await supabase.from("espaco_unidades").insert(payload);
    if (error) throw new Error(error.message);
    await supabase.rpc("espaco_criar_auditoria", {
      p_espaco_id: espacoId,
      p_entidade_tipo: "espaco_unidade",
      p_entidade_id: null,
      p_acao: "unidade_criada_wizard",
      p_payload: { nome: payload.nome },
      p_autor_usuario_id: user.id,
    }).throwOnError();
    revalidatePath("/espaco/onboarding");
    revalidatePath("/espaco");
    return { ok: true, message: `"${nome}" adicionada.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao criar unidade." };
  }
}

export async function atualizarFotoUnidadeWizardAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const unidadeId = Number(formData.get("unidade_id") ?? 0);
    if (!espacoId || !unidadeId) throw new Error("Identificador inválido.");
    const { supabase, user } = await requireWizardManager(espacoId);

    const logoFile = formData.get("logo_file");
    let logoArquivo: string | null | undefined;
    if (logoFile instanceof File && logoFile.size > 0) {
      logoArquivo = await uploadLogoUnidadeWizard(logoFile, user.id);
    } else if (field(formData, "remover_logo") === "1") {
      logoArquivo = null;
    } else {
      throw new Error("Escolha uma nova foto ou remova a foto atual.");
    }

    const { error } = await supabase
      .from("espaco_unidades")
      .update({ logo_arquivo: logoArquivo, atualizado_em: new Date().toISOString() })
      .eq("id", unidadeId)
      .eq("espaco_generico_id", espacoId);
    if (error) throw new Error(error.message);

    revalidatePath("/espaco/onboarding");
    revalidatePath("/espaco/configuracao");
    revalidatePath("/espaco");
    return { ok: true, message: "Foto da quadra atualizada." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao atualizar foto." };
  }
}

export async function removerUnidadeWizardAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const unidadeId = Number(formData.get("unidade_id") ?? 0);
    const { supabase } = await requireWizardManager(espacoId);
    await supabase
      .from("espaco_unidades")
      .update({ ativo: false })
      .eq("id", unidadeId)
      .eq("espaco_generico_id", espacoId);
    revalidatePath("/espaco/onboarding");
    return { ok: true, message: "Unidade removida." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro." };
  }
}

export async function escolherPlanoPlataformaWizardAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    await escolherPlanoMensalidadePaaSAction(formData);
    revalidatePath("/espaco/onboarding");
    return { ok: true, message: "Plano da plataforma selecionado." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao selecionar plano." };
  }
}

// ── Step 4 — horários semanais globais ─────────────────────────────────────
export async function salvarGradeWizardAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const { supabase } = await requireWizardManager(espacoId);
    // Limpa grade global existente
    await supabase
      .from("espaco_horarios_semanais")
      .delete()
      .eq("espaco_generico_id", espacoId)
      .is("espaco_unidade_id", null);

    const inserts: Array<Record<string, unknown>> = [];
    // 0=Dom, 1=Seg, ..., 6=Sáb
    for (let dia = 0; dia <= 6; dia++) {
      if (formData.get(`dia_${dia}_aberto`) !== "on") continue;
      const inicio = field(formData, `dia_${dia}_inicio`);
      const fim = field(formData, `dia_${dia}_fim`);
      if (!inicio || !fim || fim <= inicio) continue;
      inserts.push({
        espaco_generico_id: espacoId,
        espaco_unidade_id: null,
        dia_semana: dia,
        hora_inicio: inicio,
        hora_fim: fim,
        ativo: true,
      });
    }
    if (inserts.length === 0)
      throw new Error("Selecione pelo menos um dia de funcionamento.");
    const { error } = await supabase
      .from("espaco_horarios_semanais")
      .insert(inserts);
    if (error) throw new Error(error.message);
    revalidatePath("/espaco/onboarding");
    revalidatePath("/espaco/agenda");
    return { ok: true, message: `Horários salvos (${inserts.length} dia(s)).` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao salvar horários." };
  }
}

// ── Step 5 — feriados ──────────────────────────────────────────────────────
export async function sincronizarFeriadosWizardAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const { supabase, user, espaco } = await requireWizardManager(espacoId);
    const ano = new Date().getFullYear();
    const payload = await fetchAutomaticHolidaysForYear({
      year: ano,
      uf: espaco.uf ?? null,
      codigoIbge: espaco.codigo_ibge ?? null,
    });
    await supabase
      .from("espaco_feriados_cache")
      .upsert(
        {
          espaco_generico_id: espacoId,
          ano,
          fonte: process.env.FERIADOS_API_TOKEN ? "feriadosapi" : "brasilapi",
          codigo_ibge: espaco.codigo_ibge ?? null,
          payload_json: payload,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "espaco_generico_id,ano,fonte" }
      );
    let novos = 0;
    for (const item of payload as Array<Record<string, string>>) {
      const nome = String(item.nome ?? "Feriado");
      const data = String(item.date ?? item.data ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) continue;
      const { data: existente } = await supabase
        .from("espaco_feriados_personalizados")
        .select("id")
        .eq("espaco_generico_id", espacoId)
        .eq("data_inicio", data)
        .maybeSingle();
      if (existente?.id) continue;
      await supabase.from("espaco_feriados_personalizados").insert({
        espaco_generico_id: espacoId,
        nome,
        data_inicio: data,
        data_fim: data,
        operar_no_feriado: false,
        sobrepor_grade: true,
        criado_por_usuario_id: user.id,
      });
      novos++;
    }
    revalidatePath("/espaco/onboarding");
    revalidatePath("/espaco/agenda");
    return {
      ok: true,
      message: `${payload.length} feriado(s) sincronizados${novos > 0 ? `, ${novos} novo(s)` : ""}.`,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao sincronizar feriados.",
    };
  }
}

export async function toggleFeriadoWizardAction(formData: FormData): Promise<void> {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const feriadoId = Number(formData.get("feriado_id") ?? 0);
  const operar = formData.get("operar") === "true";
  const { supabase } = await requireWizardManager(espacoId);
  await supabase
    .from("espaco_feriados_personalizados")
    .update({ operar_no_feriado: operar })
    .eq("id", feriadoId)
    .eq("espaco_generico_id", espacoId);
  revalidatePath("/espaco/onboarding");
}

// ── Step 6 — plano de associação ───────────────────────────────────────────
export async function criarPlanoWizardAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const { supabase } = await requireWizardManager(espacoId);
    const nome = field(formData, "nome");
    if (nome.length < 2) throw new Error("Informe o nome do plano.");
    const mensalidadeCentavos =
      Math.round(Number(field(formData, "mensalidade_reais").replace(",", ".")) * 100) || 0;
    const { error } = await supabase.from("espaco_planos_socio").insert({
      espaco_generico_id: espacoId,
      nome,
      descricao: field(formData, "descricao") || null,
      mensalidade_centavos: mensalidadeCentavos,
      taxa_adesao_centavos: 0,
      reservas_gratuitas_semana: Math.max(
        0,
        Number(formData.get("reservas_gratis") ?? 0) || 0
      ),
      percentual_desconto_avulso: 0,
      ativo: true,
      ordem: 0,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/espaco/onboarding");
    return { ok: true, message: `Plano "${nome}" criado.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao criar plano." };
  }
}

// ── Step 7 — Asaas ─────────────────────────────────────────────────────────
export async function salvarAsaasWizardAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const { supabase, user } = await requireWizardManager(espacoId);
    const nome = field(formData, "nome_razao_social");
    const cpf = field(formData, "cpf_cnpj").replace(/\D/g, "");
    const email = field(formData, "email");
    if (!nome) throw new Error("Informe o nome ou razão social.");
    const { error } = await supabase.from("parceiro_conta_asaas").upsert(
      {
        usuario_id: user.id,
        espaco_generico_id: espacoId,
        nome_razao_social: nome,
        cpf_cnpj: cpf || null,
        email: email || null,
        onboarding_status: "aguardando_integracao",
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "usuario_id" }
    );
    if (error) throw new Error(error.message);
    revalidatePath("/espaco/onboarding");
    return { ok: true, message: "Dados salvos. Acesse o Asaas para concluir a integração." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao salvar dados Asaas." };
  }
}

// ── Conclusão ──────────────────────────────────────────────────────────────
export async function concluirOnboardingAction(espacoId: number): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada.");
  await supabase
    .from("espacos_genericos")
    .update({ operacao_status: "ativo" })
    .eq("id", espacoId)
    .eq("responsavel_usuario_id", user.id);
  revalidatePath("/espaco");
  redirect("/espaco");
}
