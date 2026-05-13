"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugifyEspaco } from "@/lib/espacos/slug";
import { fetchAutomaticHolidaysForYear } from "@/lib/espacos/calendar";
import { getPaaSUnidadeGateInfo } from "@/lib/espacos/paas-unidades-gate";
import { serializarEspacoReservaConfig } from "@/lib/espacos/config";
import { escolherPlanoMensalidadePaaSAction } from "@/app/espaco/actions";
import { createAsaasAccount } from "@/lib/asaas/client";

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
function numberFieldOrNull(formData: FormData, key: string) {
  const raw = field(formData, key);
  if (!raw) return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}
function bool(formData: FormData, key: string) {
  return formData.get(key) === "on";
}
function intList(formData: FormData, key: string) {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const value of formData.getAll(key)) {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0 || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function clampIntervalMinutes(value: FormDataEntryValue | null) {
  const minutes = Number(value ?? 60) || 60;
  return Math.min(360, Math.max(15, Math.round(minutes)));
}

function validModoReservaUnidade(value: string) {
  return ["herdar", "gratuita", "paga", "mista"].includes(value) ? value : "herdar";
}

function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function readSpecificSlots(raw: string) {
  const slots: Array<{ inicio: string; fim: string }> = [];
  for (const part of raw.split(/[\n,;]+/)) {
    const match = part.trim().match(/^(\d{2}:\d{2})\s*(?:-|às|as|a)\s*(\d{2}:\d{2})$/i);
    if (!match) continue;
    const inicioMin = timeToMinutes(match[1]);
    const fimMin = timeToMinutes(match[2]);
    if (inicioMin == null || fimMin == null || fimMin <= inicioMin) continue;
    slots.push({ inicio: match[1], fim: match[2] });
  }
  return slots;
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

async function uploadDocumentoEspacoWizard(file: File, userId: string) {
  const supabase = await createClient();
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Documento acima de 8MB.");
  }
  const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
  const safeExt = ext.replace(/[^a-z0-9]/g, "") || "pdf";
  const path = `${userId}/wizard_${Date.now()}_${Math.random().toString(16).slice(2, 8)}.${safeExt}`;
  const { error } = await supabase.storage.from("espaco-documentos").upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw new Error(error.message);
  return path;
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
    const cidade = field(formData, "cidade");
    const uf = field(formData, "uf").toUpperCase();
    const endereco = field(formData, "endereco");
    const numero = field(formData, "numero");
    const espacoIdReivindicado = Number(formData.get("espaco_id_reivindicado") ?? 0) || null;
    const esportesIds = intList(formData, "esportes_ids");
    if (cidade.length < 2 || uf.length < 2) throw new Error("Informe cidade e UF do espaço.");
    if (endereco.length < 3 || numero.length < 1) throw new Error("Informe endereço completo com número.");
    if (esportesIds.length === 0) throw new Error("Selecione ao menos um esporte atendido no espaço.");
    const slugBase = slugifyEspaco(
      field(formData, "slug") || nomePublico || `espaco-${espacoId}`
    );
    const { data: existing } = await supabase
      .from("espacos_genericos")
      .select("id")
      .eq("slug", slugBase)
      .neq("id", espacoId)
      .maybeSingle();
    if (existing?.id && !espacoIdReivindicado) {
      throw new Error("Este link público já está em uso. Escolha outro nome para o link.");
    }
    const slugFinal = existing?.id ? `${slugBase}-${espacoId}` : slugBase;
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
      cidade,
      uf,
      localizacao: [cidade, uf].filter(Boolean).join(" - "),
      esportes_ids: JSON.stringify(esportesIds),
      venue_config_json: JSON.stringify({
        endereco,
        numero,
        bairro: field(formData, "bairro") || null,
        cep: field(formData, "cep") || null,
        cidade,
        estado: uf,
        complemento: field(formData, "complemento") || null,
        origem: "wizard-espaco",
      }),
      descricao_curta: field(formData, "descricao_longa").slice(0, 160) || null,
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
    if (espacoIdReivindicado) {
      const { data: reivindicacaoExistente } = await supabase
        .from("espaco_reivindicacoes")
        .select("id")
        .eq("espaco_generico_id", espacoIdReivindicado)
        .eq("solicitante_id", user.id)
        .eq("status", "pendente")
        .maybeSingle();
      if (!reivindicacaoExistente?.id) {
        const { error: claimErr } = await supabase.from("espaco_reivindicacoes").insert({
          espaco_generico_id: espacoIdReivindicado,
          solicitante_id: user.id,
          mensagem: "Solicitação de propriedade enviada pelo wizard de cadastro de espaço.",
          status: "pendente",
          revisado_por_usuario_id: null,
          revisado_em: null,
          observacoes_admin: null,
        });
        if (claimErr) throw new Error(claimErr.message);
      }
    }
    revalidatePath("/espaco");
    revalidatePath("/espaco/onboarding");
    return { ok: true, message: "Perfil salvo." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao salvar perfil." };
  }
}

// ── Step 2.5 — regras globais ─────────────────────────────────────────────
export async function salvarRegrasReservasWizardAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const { supabase } = await requireWizardManager(espacoId);
    const configuracao = serializarEspacoReservaConfig({
      limiteReservasDia: Number(formData.get("limite_reservas_dia") ?? 0),
      limiteReservasSemana: Number(formData.get("limite_reservas_semana") ?? 0),
      cooldownHoras: Number(formData.get("cooldown_horas") ?? 0),
      antecedenciaMinHoras: Number(formData.get("antecedencia_min_horas") ?? 0),
      antecedenciaMaxDias: Number(formData.get("antecedencia_max_dias") ?? 0),
      gratisLimiteReservasDiaMembro: Number(
        formData.get("gratis_limite_reservas_dia_membro") ??
          formData.get("limite_reservas_dia") ??
          0
      ),
      gratisLimiteReservasSemanaMembro: Number(
        formData.get("gratis_limite_reservas_semana_membro") ??
          formData.get("limite_reservas_semana") ??
          0
      ),
      gratisIntervaloHorasEntreReservasMembro: Number(
        formData.get("gratis_intervalo_horas_entre_reservas_membro") ??
          formData.get("cooldown_horas") ??
          0
      ),
      gratisAntecedenciaMaxDiasMembro: Number(
        formData.get("gratis_antecedencia_max_dias_membro") ??
          formData.get("antecedencia_max_dias") ??
          0
      ),
      bloqueiaInadimplente: bool(formData, "bloqueia_inadimplente"),
      reservasGratisLiberadas: bool(formData, "reservas_gratis_liberadas"),
      cancelamentoGratuitaPermite: bool(formData, "cancelamento_gratuita_permite"),
      cancelamentoGratuitaAntecedenciaHoras: Number(formData.get("cancelamento_gratuita_antecedencia_horas") ?? 0),
      cancelamentoGratuitaPermiteAposPrazo: bool(formData, "cancelamento_gratuita_permite_apos_prazo"),
      cancelamentoGratuitaMultaTipo: field(formData, "cancelamento_gratuita_multa_tipo") || "nenhuma",
      cancelamentoGratuitaMultaPercentual: Number(formData.get("cancelamento_gratuita_multa_percentual") ?? 0),
      cancelamentoGratuitaMultaCentavos: Math.round(
        Number(field(formData, "cancelamento_gratuita_multa_reais").replace(",", ".")) * 100
      ) || 0,
      cancelamentoPagaPermite: bool(formData, "cancelamento_paga_permite"),
      cancelamentoPagaAntecedenciaHoras: Number(formData.get("cancelamento_paga_antecedencia_horas") ?? 0),
      cancelamentoPagaPermiteAposPrazo: bool(formData, "cancelamento_paga_permite_apos_prazo"),
      cancelamentoPagaMultaTipo: field(formData, "cancelamento_paga_multa_tipo") || "nenhuma",
      cancelamentoPagaMultaPercentual: Number(formData.get("cancelamento_paga_multa_percentual") ?? 0),
      cancelamentoPagaMultaCentavos: Math.round(
        Number(field(formData, "cancelamento_paga_multa_reais").replace(",", ".")) * 100
      ) || 0,
      permiteTransferenciaReserva: bool(formData, "permite_transferencia_reserva"),
      transferenciaAntecedenciaHoras: Number(formData.get("transferencia_antecedencia_horas") ?? 0),
      politicaCancelamento: field(formData, "politica_cancelamento"),
      observacoesPublicas: field(formData, "observacoes_publicas"),
    });
    const { error } = await supabase
      .from("espacos_genericos")
      .update({ configuracao_reservas_json: JSON.stringify(configuracao) })
      .eq("id", espacoId);
    if (error) throw new Error(error.message);
    revalidatePath("/espaco/onboarding");
    return { ok: true, message: "Regras oficiais salvas." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao salvar regras." };
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
    if (gate.maxUnidadesPlano != null && gate.unidadesTotal >= gate.maxUnidadesPlano) {
      throw new Error(
        `Seu plano permite até ${gate.maxUnidadesPlano} quadra(s). Para cadastrar mais, altere o plano antes de continuar.`
      );
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
      esporte_id: Number(formData.get("esporte_id") || 0) || null,
      modalidade: field(formData, "modalidade") || null,
      coberta: bool(formData, "coberta"),
      indoor: bool(formData, "indoor"),
      iluminacao: bool(formData, "iluminacao"),
      capacidade: Math.max(1, Number(formData.get("capacidade") ?? 2) || 2),
      aceita_aulas: bool(formData, "aceita_aulas"),
      aceita_torneios: bool(formData, "aceita_torneios"),
      observacoes: field(formData, "observacoes") || null,
      logo_arquivo: logoArquivo,
      modo_reserva: validModoReservaUnidade(field(formData, "modo_reserva_unidade")),
      intervalo_minutos: clampIntervalMinutes(formData.get("intervalo_minutos")),
      configuracao_agenda_json: {
        modo: field(formData, "agenda_modo") === "especificos" ? "especificos" : "convencional",
        horarioPadraoInicio: field(formData, "horario_padrao_inicio") || "08:00",
        horarioPadraoFim: field(formData, "horario_padrao_fim") || "22:00",
      },
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

// ── Step 4 — horários semanais por unidade ─────────────────────────────────
export async function salvarGradeWizardAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const { supabase } = await requireWizardManager(espacoId);
    const unidadeIds = formData
      .getAll("unidade_id")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
    if (unidadeIds.length === 0) {
      throw new Error("Cadastre pelo menos uma quadra antes de configurar horários.");
    }

    const { data: unidades } = await supabase
      .from("espaco_unidades")
      .select("id")
      .eq("espaco_generico_id", espacoId)
      .eq("ativo", true)
      .in("id", unidadeIds);
    const idsPermitidos = new Set((unidades ?? []).map((unidade) => Number(unidade.id)));
    if (idsPermitidos.size === 0) throw new Error("Nenhuma quadra válida foi encontrada.");

    await supabase
      .from("espaco_horarios_semanais")
      .delete()
      .eq("espaco_generico_id", espacoId);

    const inserts: Array<Record<string, unknown>> = [];
    for (const unidadeId of unidadeIds) {
      if (!idsPermitidos.has(unidadeId)) continue;
      const modo = field(formData, `unidade_${unidadeId}_modo`) === "especificos" ? "especificos" : "convencional";
      const intervalo = clampIntervalMinutes(formData.get(`unidade_${unidadeId}_intervalo`));
      for (let dia = 0; dia <= 6; dia++) {
        if (formData.get(`unidade_${unidadeId}_dia_${dia}_aberto`) !== "on") continue;
        const slotsEditados = readSpecificSlots(field(formData, `unidade_${unidadeId}_dia_${dia}_slots`));
        if (slotsEditados.length > 0) {
          for (const slot of slotsEditados) {
            inserts.push({
              espaco_generico_id: espacoId,
              espaco_unidade_id: unidadeId,
              dia_semana: dia,
              hora_inicio: slot.inicio,
              hora_fim: slot.fim,
              ativo: true,
              observacoes: "Horário revisado no wizard.",
            });
          }
          continue;
        }
        if (modo === "especificos") {
          continue;
        }

        const inicioMin = timeToMinutes(field(formData, `unidade_${unidadeId}_dia_${dia}_inicio`));
        const fimMin = timeToMinutes(field(formData, `unidade_${unidadeId}_dia_${dia}_fim`));
        if (inicioMin == null || fimMin == null || fimMin <= inicioMin) continue;
        for (let cursor = inicioMin; cursor + intervalo <= fimMin; cursor += intervalo) {
          inserts.push({
            espaco_generico_id: espacoId,
            espaco_unidade_id: unidadeId,
            dia_semana: dia,
            hora_inicio: minutesToTime(cursor),
            hora_fim: minutesToTime(cursor + intervalo),
            ativo: true,
            observacoes: `Horário gerado no wizard (${intervalo} min).`,
          });
        }
      }
    }
    if (inserts.length === 0)
      throw new Error("Configure pelo menos um horário válido para uma quadra.");
    const { error } = await supabase
      .from("espaco_horarios_semanais")
      .insert(inserts);
    if (error) throw new Error(error.message);
    revalidatePath("/espaco/onboarding");
    revalidatePath("/espaco/agenda");
    return { ok: true, message: `Horários salvos (${inserts.length} janela(s) de reserva).` };
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
  const horaInicio = field(formData, "hora_inicio") || null;
  const horaFim = field(formData, "hora_fim") || null;
  const { supabase } = await requireWizardManager(espacoId);
  const updatePayload = operar
    ? {
        operar_no_feriado: true,
        sobrepor_grade: true,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
      }
    : {
        operar_no_feriado: false,
        sobrepor_grade: true,
        hora_inicio: null,
        hora_fim: null,
      };
  await supabase
    .from("espaco_feriados_personalizados")
    .update(updatePayload)
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
    const reservasGratisInput = numberFieldOrNull(formData, "reservas_gratis");
    const limiteReservasSemanaInput = numberFieldOrNull(formData, "limite_reservas_semana");
    const cooldownHorasInput = numberFieldOrNull(formData, "cooldown_horas");
    const herdarReservasGratis = bool(formData, "herdar_reservas_gratuitas_semana");
    const herdarLimiteSemana = bool(formData, "herdar_limite_reservas_semana");
    const herdarCooldown = bool(formData, "herdar_cooldown_horas");
    const herdarAntecedenciaMaxDias = bool(formData, "herdar_antecedencia_max_dias");
    const antecedenciaPreset = field(formData, "antecedencia_max_dias_preset");
    const antecedenciaCustom = Number(formData.get("antecedencia_max_dias_custom") ?? 0) || 0;
    const antecedenciaMaxDias = Math.max(
      0,
      Math.min(
        365,
        herdarAntecedenciaMaxDias || !antecedenciaPreset || antecedenciaPreset === "inherit"
          ? antecedenciaCustom
          : antecedenciaPreset === "custom"
          ? antecedenciaCustom
          : Number(antecedenciaPreset) || 0
      )
    );
    const { error } = await supabase.from("espaco_planos_socio").insert({
      espaco_generico_id: espacoId,
      nome,
      descricao: field(formData, "descricao") || null,
      mensalidade_centavos: mensalidadeCentavos,
      taxa_adesao_centavos: 0,
      reservas_gratuitas_semana: Math.max(0, reservasGratisInput ?? 0),
      limite_reservas_semana:
        limiteReservasSemanaInput === null ? null : Math.max(0, Math.round(limiteReservasSemanaInput)),
      cooldown_horas: Math.max(0, Math.round(cooldownHorasInput ?? 0)),
      antecedencia_max_dias: antecedenciaMaxDias,
      beneficios_json: {
        uma_reserva_ativa_por_vez:
          formData.get("uma_reserva_ativa_por_vez") === "on",
        herdar_regras_globais: {
          reservas_gratuitas_semana: herdarReservasGratis,
          limite_reservas_semana: herdarLimiteSemana,
          cooldown_horas: herdarCooldown,
          antecedencia_max_dias: herdarAntecedenciaMaxDias,
        },
      },
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
    const modoIntegracao = field(formData, "modo_integracao") === "conta_existente"
      ? "conta_existente"
      : "criar_nova";
    const nome = field(formData, "nome_razao_social");
    const cpf = field(formData, "cpf_cnpj").replace(/\D/g, "");
    const email = field(formData, "email");
    const walletIdInformado = field(formData, "wallet_id");
    if (!email) throw new Error("Informe o e-mail da conta Asaas.");
    if (!cpf || ![11, 14].includes(cpf.length)) throw new Error("Informe um CPF ou CNPJ válido.");
    if (modoIntegracao === "conta_existente" && !walletIdInformado) {
      throw new Error("Informe o Wallet ID da conta Asaas para direcionar os recebimentos.");
    }
    if (modoIntegracao === "criar_nova") {
      if (!nome) throw new Error("Informe o nome ou razão social.");
    }
    const cadastroAsaas =
      modoIntegracao === "criar_nova"
        ? {
            name: nome,
            email,
            cpfCnpj: cpf,
            birthDate: field(formData, "asaas_birth_date"),
            companyType: field(formData, "asaas_company_type"),
            phone: field(formData, "asaas_phone").replace(/\D/g, ""),
            mobilePhone: field(formData, "asaas_mobile_phone").replace(/\D/g, ""),
            address: field(formData, "asaas_address"),
            addressNumber: field(formData, "asaas_address_number"),
            complement: field(formData, "asaas_complement"),
            province: field(formData, "asaas_province"),
            postalCode: field(formData, "asaas_postal_code").replace(/\D/g, ""),
          }
        : null;
    if (cadastroAsaas) {
      const requiredFields = [
        cadastroAsaas.birthDate,
        cadastroAsaas.companyType,
        cadastroAsaas.mobilePhone,
        cadastroAsaas.address,
        cadastroAsaas.addressNumber,
        cadastroAsaas.province,
        cadastroAsaas.postalCode,
      ];
      if (requiredFields.some((value) => !value)) {
        throw new Error("Preencha os dados obrigatórios para criar a conta Asaas.");
      }
    }
    const { data: contaAtual } = await supabase
      .from("parceiro_conta_asaas")
      .select("asaas_account_id, wallet_id, api_key_subconta")
      .eq("usuario_id", user.id)
      .maybeSingle();
    const contaCriada =
      cadastroAsaas && !contaAtual?.asaas_account_id && !contaAtual?.wallet_id
        ? await createAsaasAccount(cadastroAsaas)
        : null;
    const asaasAccountId =
      contaCriada?.id ?? contaCriada?.accountId ?? contaAtual?.asaas_account_id ?? null;
    const walletId =
      contaCriada?.walletId ?? contaAtual?.wallet_id ?? (modoIntegracao === "conta_existente" ? walletIdInformado : null);
    const apiKeySubconta = contaCriada?.apiKey ?? contaAtual?.api_key_subconta ?? null;
    const onboardingStatus = walletId
      ? "conectado"
      : modoIntegracao === "conta_existente"
        ? "aguardando_conexao_asaas"
        : "aguardando_criacao_asaas";
    const dadosBancariosJson = JSON.stringify({
      fluxo_integracao_asaas: modoIntegracao,
      origem: "wizard_receber",
      login_asaas_informado: modoIntegracao === "conta_existente",
      senha_asaas_recebida_sem_persistir: false,
      cadastro_asaas: cadastroAsaas,
      wallet_id_informado: modoIntegracao === "conta_existente",
      conta_criada_via_api: Boolean(contaCriada),
      proxima_acao:
        modoIntegracao === "conta_existente"
          ? "usar walletId informado para split de recebimentos; validar titularidade no processo operacional Asaas"
          : "subconta criada via POST /v3/accounts; concluir verificações/documentos no ambiente Asaas quando exigido",
    });
    const { error } = await supabase.from("parceiro_conta_asaas").upsert(
      {
        usuario_id: user.id,
        nome_razao_social: nome || email,
        cpf_cnpj: cpf,
        email,
        dados_bancarios_json: dadosBancariosJson,
        asaas_account_id: asaasAccountId,
        wallet_id: walletId,
        api_key_subconta: apiKeySubconta,
        onboarding_status: onboardingStatus,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "usuario_id" }
    );
    if (error) throw new Error(error.message);
    revalidatePath("/espaco/onboarding");
    return {
      ok: true,
      message:
        modoIntegracao === "conta_existente"
          ? "Conta registrada. As próximas cobranças pagas já usam o Wallet ID informado para recebimentos."
          : contaCriada
            ? "Conta Asaas criada e vinculada. As próximas cobranças pagas já usam split para o espaço."
            : "Conta Asaas já estava vinculada. Mantive os dados de recebimento.",
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao salvar dados Asaas." };
  }
}

// ── Conclusão ──────────────────────────────────────────────────────────────
export async function concluirOnboardingAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const { supabase, user } = await requireWizardManager(espacoId);
    const documento = formData.get("documento_validacao");
    const mensagem = field(formData, "mensagem_validacao");
    const { data: reivindicacao } = await supabase
      .from("espaco_reivindicacoes")
      .select("id")
      .eq("espaco_generico_id", espacoId)
      .eq("solicitante_id", user.id)
      .eq("status", "pendente")
      .maybeSingle();

    let documentoArquivo: string | null = null;
    if (documento instanceof File && documento.size > 0) {
      documentoArquivo = await uploadDocumentoEspacoWizard(documento, user.id);
    }
    if (!reivindicacao && !documentoArquivo) {
      return { ok: false, message: "Envie o documento de comprovação do espaço para finalizar." };
    }

    if (reivindicacao?.id) {
      const patch: Record<string, unknown> = {
        mensagem: mensagem || null,
        observacoes_admin: null,
      };
      if (documentoArquivo) patch.documento_arquivo = documentoArquivo;
      const { error } = await supabase
        .from("espaco_reivindicacoes")
        .update(patch)
        .eq("id", reivindicacao.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("espaco_reivindicacoes").insert({
        espaco_generico_id: espacoId,
        solicitante_id: user.id,
        documento_arquivo: documentoArquivo,
        mensagem: mensagem || null,
        status: "pendente",
      });
      if (error) throw new Error(error.message);
    }

    const { error: upErr } = await supabase
      .from("espacos_genericos")
      .update({
        operacao_status: "pendente_admin",
        status: "pendente_validacao",
        ativo_listagem: false,
      })
      .eq("id", espacoId)
      .eq("responsavel_usuario_id", user.id);
    if (upErr) throw new Error(upErr.message);
    revalidatePath("/espaco");
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao finalizar cadastro." };
  }
  redirect("/espaco");
}
