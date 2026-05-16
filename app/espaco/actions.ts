"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cancelAsaasSubscription,
  createAsaasAccount,
  createAsaasCustomer,
  createAsaasPayment,
  createAsaasSubscription,
  getAsaasPaymentPixQrCode,
} from "@/lib/asaas/client";
import { isAsaasSimulationEnabledFor } from "@/lib/asaas/simulate-payments";
import { slugifyEspaco } from "@/lib/espacos/slug";
import { normalizeEspacoAssociacaoConfig } from "@/lib/espacos/associacao-config";
import { normalizeEspacoReservaConfig, serializarEspacoReservaConfig } from "@/lib/espacos/config";
import { getPaaSUnidadeGateInfo } from "@/lib/espacos/paas-unidades-gate";
import { forcarReservasGratisLiberadasFalsas, podeCriarAgendaEUnidades } from "@/lib/espacos/operacao-gate";
import { avaliarBeneficiosSocioEspaco } from "@/lib/espacos/eligibility";
import {
  espacoUsaCatalogoPaaS,
  resolverTipoOperacaoEspaco,
} from "@/lib/espacos/tipo-operacao";
import {
  calcularFinanceiroEspaco,
} from "@/lib/espacos/financeiro";
import { createNfeioServiceInvoice } from "@/lib/fiscal/nfeio";
import { fiscalDocumentoDigits, fiscalParseConfigJson } from "@/lib/fiscal/nfse";
import {
  checkEspacoConflict,
  fetchAutomaticHolidaysForYear,
  isDentroDaGradeSemanal,
  isHolidayDate,
} from "@/lib/espacos/calendar";
import { triggerPushForNotificationIdsBestEffort } from "@/lib/pwa/push-trigger";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

type State =
  | {
      ok: true;
      message: string;
      payment?: {
        method: "pix" | "cartao";
        status?: string | null;
        chargeUrl?: string | null;
        pixPayload?: string | null;
        pixEncodedImage?: string | null;
        pixExpirationDate?: string | null;
      };
    }
  | { ok: false; message: string };
type SupabaseAdminClient = ReturnType<typeof createServiceRoleClient>;

function exigeUmaReservaAtivaPorVez(plano: { beneficios_json?: unknown } | null | undefined) {
  const beneficios = plano?.beneficios_json;
  if (!beneficios || typeof beneficios !== "object" || Array.isArray(beneficios)) return false;
  const record = beneficios as Record<string, unknown>;
  return record.uma_reserva_ativa_por_vez === true || record.umaReservaAtivaPorVez === true;
}

function planoHerdaRegraGlobal(plano: { beneficios_json?: unknown } | null | undefined, key: string) {
  const beneficios = plano?.beneficios_json;
  if (!beneficios || typeof beneficios !== "object" || Array.isArray(beneficios)) return false;
  const herdar = (beneficios as Record<string, unknown>).herdar_regras_globais;
  return Boolean(
    herdar &&
      typeof herdar === "object" &&
      !Array.isArray(herdar) &&
      (herdar as Record<string, unknown>)[key] === true
  );
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada.");
  return { supabase, user };
}

async function requireEspacoManager(espacoId: number) {
  const { supabase, user } = await requireUser();
  const { data: espaco, error } = await supabase
    .from("espacos_genericos")
    .select("id, nome_publico, responsavel_usuario_id, criado_por_usuario_id, slug")
    .eq("id", espacoId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const canManage =
    espaco &&
    (espaco.criado_por_usuario_id === user.id ||
      espaco.responsavel_usuario_id === user.id);
  if (!canManage) throw new Error("Sem permissão para gerenciar este espaço.");
  return { supabase, user, espaco };
}

async function hasUserRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  role: "professor" | "organizador"
) {
  const { data, error } = await supabase
    .from("usuario_papeis")
    .select("papel")
    .eq("usuario_id", userId)
    .eq("papel", role)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

async function getActiveSuspensaoMarcacao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  espacoId: number,
  userId: string
) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("espaco_punicoes_membro")
    .select("id, fim_em, motivo")
    .eq("espaco_generico_id", espacoId)
    .eq("usuario_id", userId)
    .eq("tipo_punicao", "suspensao_marcacao")
    .eq("status", "ativa")
    .or(`fim_em.is.null,fim_em.gte.${nowIso}`)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function text(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

function asaasDigits(value: FormDataEntryValue | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function readAsaasCardForm(formData: FormData, fallbackEmail: string | null | undefined) {
  const holderName = String(formData.get("card_holder_name") ?? "").trim();
  const cardNumber = asaasDigits(formData.get("card_number"));
  const expiryMonth = asaasDigits(formData.get("card_expiry_month")).padStart(2, "0").slice(0, 2);
  const expiryYear = asaasDigits(formData.get("card_expiry_year")).slice(-4);
  const ccv = asaasDigits(formData.get("card_ccv"));
  const cpfCnpj = asaasDigits(formData.get("holder_cpf_cnpj"));
  const postalCode = asaasDigits(formData.get("holder_postal_code"));
  const addressNumber = String(formData.get("holder_address_number") ?? "").trim();
  const phone = asaasDigits(formData.get("holder_phone"));
  const email = String(formData.get("holder_email") ?? fallbackEmail ?? "").trim();

  if (!holderName || cardNumber.length < 13 || !expiryMonth || expiryYear.length < 4 || ccv.length < 3) {
    throw new Error("Informe os dados do cartão de crédito para ativar a recorrência.");
  }
  if (!cpfCnpj || !postalCode || !addressNumber || !phone || !email) {
    throw new Error("Informe os dados do titular para validar o cartão no Asaas.");
  }

  return {
    holderName,
    cardNumber,
    expiryMonth,
    expiryYear,
    ccv,
    cpfCnpj,
    postalCode,
    addressNumber,
    phone,
    email,
  };
}

const HORARIO_META_PREFIX = "[eid-horario]";

function parseHorarioObservacoes(raw: unknown) {
  const linhas = String(raw ?? "")
    .split("\n")
    .map((linha) => linha.trimEnd());
  let modoReserva = "mista" as "mista" | "paga" | "gratuita";
  const texto = linhas
    .filter((linha) => {
      if (!linha.trim().startsWith(HORARIO_META_PREFIX)) return true;
      try {
        const parsed = JSON.parse(linha.trim().slice(HORARIO_META_PREFIX.length));
        const modo = String(parsed?.modoReserva ?? "");
        if (modo === "paga" || modo === "gratuita" || modo === "mista") modoReserva = modo;
      } catch {
        // Mantém compatibilidade com observações antigas ou digitadas manualmente.
      }
      return false;
    })
    .join("\n")
    .trim();
  return { texto, modoReserva };
}

function montarHorarioObservacoes(raw: unknown) {
  return parseHorarioObservacoes(raw).texto || null;
}

function parseRecord(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

function asaasSplitDoEspaco(walletId: string | null | undefined, valorLiquidoCentavos: number) {
  const wallet = String(walletId ?? "").trim();
  const valor = Math.max(0, Math.floor(Number(valorLiquidoCentavos) || 0));
  if (!wallet || valor <= 0) return null;
  return [{ walletId: wallet, fixedValue: Number((valor / 100).toFixed(2)) }];
}

async function buscarWalletRecebedorEspaco(
  admin: SupabaseAdminClient,
  espacoId: number,
  responsavelUsuarioId?: string | null
) {
  let usuarioId = responsavelUsuarioId ?? null;
  if (!usuarioId) {
    const { data: espaco } = await admin
      .from("espacos_genericos")
      .select("responsavel_usuario_id, criado_por_usuario_id")
      .eq("id", espacoId)
      .maybeSingle();
    usuarioId = espaco?.responsavel_usuario_id ?? espaco?.criado_por_usuario_id ?? null;
  }
  if (!usuarioId) return null;
  const { data } = await admin
    .from("parceiro_conta_asaas")
    .select("wallet_id")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  return data?.wallet_id ? String(data.wallet_id) : null;
}

async function emitirNotaFiscalNfeioSeConfigurada(admin: SupabaseAdminClient, notaId: number) {
  const { data: nota, error: notaErr } = await admin
    .from("fiscal_notas")
    .select("id, emitente_id, tomador_nome, tomador_documento, tomador_email, descricao, valor_servico_centavos, escopo")
    .eq("id", notaId)
    .maybeSingle();
  if (notaErr) throw new Error(notaErr.message);
  if (!nota?.emitente_id) throw new Error("Nota fiscal sem emitente vinculado.");
  const { data: emitente, error: emitenteErr } = await admin
    .from("fiscal_emitentes")
    .select("id, provedor, codigo_servico, config_json")
    .eq("id", nota.emitente_id)
    .maybeSingle();
  if (emitenteErr) throw new Error(emitenteErr.message);
  const cfg = fiscalParseConfigJson(emitente?.config_json);
  const companyId = String(cfg.nfeio_company_id ?? "").trim();
  const autoEmitir = cfg.auto_emitir_nfse === true;
  if (emitente?.provedor !== "nfeio" || !companyId || !autoEmitir) {
    await admin.from("fiscal_notas").update({ status: "fila_emissao", atualizado_em: new Date().toISOString() }).eq("id", notaId);
    return;
  }
  try {
    const invoice = await createNfeioServiceInvoice(companyId, {
      borrower: {
        name: String(nota.tomador_nome ?? "Tomador"),
        federalTaxNumber: String(nota.tomador_documento ?? "").replace(/\D/g, ""),
        email: nota.tomador_email ?? null,
      },
      services: [
        {
          description: nota.descricao,
          amount: Number(((Number(nota.valor_servico_centavos ?? 0) || 0) / 100).toFixed(2)),
          cityServiceCode: emitente.codigo_servico ?? null,
        },
      ],
      externalId: `${nota.escopo}:${nota.id}`,
    });
    await admin
      .from("fiscal_notas")
      .update({
        status: "emitida",
        referencia_externa: invoice.id ?? null,
        numero_nfse: invoice.number ?? null,
        codigo_verificacao: invoice.verificationCode ?? null,
        pdf_url: invoice.pdfUrl ?? invoice.pdf ?? null,
        xml_url: invoice.xmlUrl ?? invoice.xml ?? null,
        emitida_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        detalhes_json: { nfeio: invoice },
      })
      .eq("id", notaId);
  } catch (error) {
    await admin
      .from("fiscal_notas")
      .update({
        status: "erro",
        erro_mensagem: error instanceof Error ? error.message : "Falha na emissão NFE.io.",
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", notaId);
    throw error;
  }
}

function intOrNull(formData: FormData, field: string) {
  const value = Number(formData.get(field) ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function numberInputOrNull(formData: FormData, field: string) {
  const raw = text(formData, field);
  if (!raw) return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function checkbox(formData: FormData, field: string) {
  return formData.get(field) === "on";
}

function dinheiroCentavos(formData: FormData, field: string) {
  const input = text(formData, field);
  const raw = input.includes(",") ? input.replace(/\./g, "").replace(",", ".") : input;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, Math.round(value * 100)) : 0;
}

function timeToMinutes(value: string) {
  const [h, m] = value.split(":").map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function minutesToTime(value: number) {
  const h = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}`;
}

type EspacoSupabase = Awaited<ReturnType<typeof createClient>>;

type FeriadoOperacaoRow = {
  id: number;
  nome: string | null;
  data_inicio: string;
  data_fim: string;
  operar_no_feriado: boolean;
  sobrepor_grade: boolean;
};

async function applyFeriadoSobreposicaoByRows(
  supabase: EspacoSupabase,
  espacoId: number,
  userId: string,
  rows: FeriadoOperacaoRow[]
) {
  for (const row of rows) {
    if (!row.sobrepor_grade) continue;
    const inicioIso = `${row.data_inicio}T00:00:00`;
    const fimIso = `${row.data_fim}T23:59:00`;
    const motivoTag = `feriado_personalizado_id:${row.id}`;
    if (row.operar_no_feriado) {
      await supabase
        .from("espaco_bloqueios")
        .delete()
        .eq("espaco_generico_id", espacoId)
        .eq("tipo_bloqueio", "feriado")
        .eq("motivo", motivoTag);
      continue;
    }
    const { data: existing } = await supabase
      .from("espaco_bloqueios")
      .select("id")
      .eq("espaco_generico_id", espacoId)
      .eq("tipo_bloqueio", "feriado")
      .eq("motivo", motivoTag)
      .maybeSingle();
    if (existing?.id) continue;
    await supabase.from("espaco_bloqueios").insert({
      espaco_generico_id: espacoId,
      espaco_unidade_id: null,
      titulo: `Feriado: ${row.nome ?? "Data especial"}`,
      tipo_bloqueio: "feriado",
      motivo: motivoTag,
      inicio: inicioIso,
      fim: fimIso,
      criado_por_usuario_id: userId,
    });
  }
}

async function notifyEspacoSociosAboutFeriado(
  supabase: EspacoSupabase,
  espacoId: number,
  autorUsuarioId: string,
  mensagem: string
) {
  const { data: socios } = await supabase
    .from("espaco_socios")
    .select("usuario_id")
    .eq("espaco_generico_id", espacoId)
    .eq("status", "ativo");
  const targets = [...new Set((socios ?? []).map((s) => String(s.usuario_id ?? "")).filter(Boolean))];
  if (!targets.length) return;
  const { data } = await supabase
    .from("notificacoes")
    .insert(
      targets.map((uid) => ({
        usuario_id: uid,
        mensagem,
        tipo: "espaco_feriado",
        referencia_id: espacoId,
        lida: false,
        remetente_id: autorUsuarioId,
        data_criacao: new Date().toISOString(),
      }))
    )
    .select("id");
  await triggerPushForNotificationIdsBestEffort((data ?? []).map((r) => Number((r as { id?: number }).id ?? 0)), {
    source: "espaco/actions.feriado",
  });
}

async function uploadDocumentoEspaco(file: File, userId: string) {
  const supabase = await createClient();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${userId}/${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from("espaco-documentos")
    .upload(path, file, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });
  if (error) throw new Error(error.message);
  return path;
}

async function uploadLogoUnidadeEspaco(file: File, userId: string) {
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

async function ensureProfileAsaasCustomer(userId: string) {
  const admin = createServiceRoleClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, nome, whatsapp, asaas_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile) {
    throw new Error(error?.message ?? "Perfil não encontrado.");
  }
  if (profile.asaas_customer_id) {
    return profile.asaas_customer_id;
  }
  const authUser = await admin.auth.admin.getUserById(userId);
  const created = await createAsaasCustomer({
    name: profile.nome ?? authUser.data.user?.email ?? "Cliente EsporteID",
    email: authUser.data.user?.email ?? null,
    mobilePhone: profile.whatsapp ?? null,
    externalReference: profile.id,
  });
  await admin
    .from("profiles")
    .update({ asaas_customer_id: created.id, atualizado_em: new Date().toISOString() })
    .eq("id", userId);
  return created.id;
}

export async function salvarConfiguracoesEspacoAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const { supabase, user } = await requireEspacoManager(espacoId);
    const nomePublico = text(formData, "nome_publico");
    const cidade = text(formData, "cidade");
    const uf = (text(formData, "uf") || text(formData, "estado")).toUpperCase();
    const localizacao = text(formData, "localizacao") || [cidade, uf].filter(Boolean).join(" - ");
    const endereco = text(formData, "endereco");
    const numero = text(formData, "numero");
    const bairro = text(formData, "bairro") || null;
    const cep = text(formData, "cep") || null;
    const complemento = text(formData, "complemento") || null;
    const lat = text(formData, "lat") || null;
    const lng = text(formData, "lng") || null;
    const coverArquivo = text(formData, "cover_arquivo") || null;
    const whatsappContato = text(formData, "whatsapp_contato") || null;
    const emailContato = text(formData, "email_contato") || null;
    const websiteUrl = text(formData, "website_url") || null;
    const instagramUrl = text(formData, "instagram_url") || null;
    const descricaoCurta = text(formData, "descricao_curta") || null;
    const descricaoLonga = text(formData, "descricao_longa") || null;
    const aceitaSocios = checkbox(formData, "aceita_socios");
    const permiteProfessoresAprovados = checkbox(
      formData,
      "permite_professores_aprovados"
    );
    const associacaoConfig = normalizeEspacoAssociacaoConfig({
      modoEntrada: text(formData, "associacao_modo_entrada"),
      rotuloCampo: text(formData, "associacao_rotulo_campo"),
      instrucoes: text(formData, "associacao_instrucoes"),
    });
    const slugBase = slugifyEspaco(
      text(formData, "slug") || nomePublico || `espaco-${espacoId}`
    );
    const { data: espacoModo } = await supabase
      .from("espacos_genericos")
      .select("modo_reserva, configuracao_reservas_json, venue_config_json")
      .eq("id", espacoId)
      .maybeSingle();
    const espacoModoRow = espacoModo as { modo_reserva?: string | null; configuracao_reservas_json?: unknown; venue_config_json?: unknown } | null;
    const modoR = espacoModoRow?.modo_reserva;
    const reservasGratisLiberadas = forcarReservasGratisLiberadasFalsas(
      modoR ?? null,
      checkbox(formData, "reservas_gratis_liberadas")
    );
    const atualReservas = normalizeEspacoReservaConfig(espacoModoRow?.configuracao_reservas_json);
    const configuracaoReservas = serializarEspacoReservaConfig({
      ...atualReservas,
      limiteReservasDia: Number(formData.get("limite_reservas_dia") ?? atualReservas.limiteReservasDia),
      limiteReservasSemana: Number(formData.get("limite_reservas_semana") ?? atualReservas.limiteReservasSemana),
      cooldownHoras: Number(formData.get("cooldown_horas") ?? atualReservas.cooldownHoras),
      antecedenciaMinHoras: Number(formData.get("antecedencia_min_horas") ?? atualReservas.antecedenciaMinHoras),
      antecedenciaMaxDias: Number(formData.get("antecedencia_max_dias") ?? atualReservas.antecedenciaMaxDias),
      gratisLimiteReservasDiaMembro: Number(
        formData.get("gratis_limite_reservas_dia_membro") ??
          atualReservas.gratisLimiteReservasDiaMembro
      ),
      gratisLimiteReservasSemanaMembro: Number(
        formData.get("gratis_limite_reservas_semana_membro") ??
          atualReservas.gratisLimiteReservasSemanaMembro
      ),
      gratisIntervaloHorasEntreReservasMembro: Number(
        formData.get("gratis_intervalo_horas_entre_reservas_membro") ??
          atualReservas.gratisIntervaloHorasEntreReservasMembro
      ),
      gratisAntecedenciaMaxDiasMembro: Number(
        formData.get("gratis_antecedencia_max_dias_membro") ??
          atualReservas.gratisAntecedenciaMaxDiasMembro
      ),
      valorReservaPadraoCentavos: formData.has("valor_reserva_padrao_reais")
        ? dinheiroCentavos(formData, "valor_reserva_padrao_reais")
        : atualReservas.valorReservaPadraoCentavos,
      bloqueiaInadimplente: checkbox(formData, "bloqueia_inadimplente"),
      reservasGratisLiberadas,
      cancelamentoGratuitaPermite: checkbox(formData, "cancelamento_gratuita_permite"),
      cancelamentoGratuitaAntecedenciaHoras: Number(formData.get("cancelamento_gratuita_antecedencia_horas") ?? 0),
      cancelamentoGratuitaPermiteAposPrazo: checkbox(formData, "cancelamento_gratuita_permite_apos_prazo"),
      cancelamentoGratuitaMultaTipo: text(formData, "cancelamento_gratuita_multa_tipo") || "nenhuma",
      cancelamentoGratuitaMultaPercentual: Number(formData.get("cancelamento_gratuita_multa_percentual") ?? 0),
      cancelamentoGratuitaMultaCentavos: Math.round(
        Number(text(formData, "cancelamento_gratuita_multa_reais").replace(",", ".")) * 100
      ) || 0,
      cancelamentoPagaPermite: checkbox(formData, "cancelamento_paga_permite"),
      cancelamentoPagaAntecedenciaHoras: Number(formData.get("cancelamento_paga_antecedencia_horas") ?? 0),
      cancelamentoPagaPermiteAposPrazo: checkbox(formData, "cancelamento_paga_permite_apos_prazo"),
      cancelamentoPagaMultaTipo: text(formData, "cancelamento_paga_multa_tipo") || "nenhuma",
      cancelamentoPagaMultaPercentual: Number(formData.get("cancelamento_paga_multa_percentual") ?? 0),
      cancelamentoPagaMultaCentavos: Math.round(
        Number(text(formData, "cancelamento_paga_multa_reais").replace(",", ".")) * 100
      ) || 0,
      permiteTransferenciaReserva: checkbox(formData, "permite_transferencia_reserva"),
      transferenciaAntecedenciaHoras: Number(formData.get("transferencia_antecedencia_horas") ?? 0),
      politicaCancelamento: text(formData, "politica_cancelamento"),
      observacoesPublicas: text(formData, "observacoes_publicas"),
    });

    if (nomePublico.length < 3) {
      return { ok: false, message: "Informe um nome público válido." };
    }
    if (cidade.length < 2 || uf.length < 2) {
      return { ok: false, message: "Cidade e UF são obrigatórios." };
    }
    if (endereco.length < 3 || numero.length < 1) {
      return { ok: false, message: "Informe endereço completo com número." };
    }

    const { data: slugConflict } = await supabase
      .from("espacos_genericos")
      .select("id")
      .neq("id", espacoId)
      .ilike("slug", slugBase)
      .maybeSingle();
    if (slugConflict) {
      return { ok: false, message: "Esse slug já está em uso por outro espaço." };
    }

    const { error } = await supabase
      .from("espacos_genericos")
      .update({
        nome_publico: nomePublico,
        slug: slugBase,
        cidade,
        uf,
        lat,
        lng,
        localizacao,
        venue_config_json: {
          ...parseRecord(espacoModoRow?.venue_config_json),
          endereco,
          numero,
          bairro,
          cep,
          cidade,
          estado: uf,
          lat,
          lng,
          complemento,
          origem: "painel-espaco",
        },
        cover_arquivo: coverArquivo,
        whatsapp_contato: whatsappContato,
        email_contato: emailContato,
        website_url: websiteUrl,
        instagram_url: instagramUrl,
        descricao_curta: descricaoCurta,
        descricao_longa: descricaoLonga,
        aceita_socios: aceitaSocios,
        permite_professores_aprovados: permiteProfessoresAprovados,
        associacao_regra_json: associacaoConfig,
        configuracao_reservas_json: configuracaoReservas,
        operacao_status: "ativo",
      })
      .eq("id", espacoId);
    if (error) return { ok: false, message: error.message };

    await supabase.rpc("espaco_criar_auditoria", {
      p_espaco_id: espacoId,
      p_entidade_tipo: "espaco",
      p_entidade_id: espacoId,
      p_acao: "configuracao_atualizada",
      p_motivo: "Atualização do painel do espaço",
      p_payload: {
        nomePublico,
        slug: slugBase,
        aceitaSocios,
        associacaoConfig,
      },
      p_autor_usuario_id: user.id,
    });

    revalidatePath("/espaco");
    revalidatePath("/espaco/configuracao");
    revalidatePath("/espaco/agenda");
    revalidatePath("/espaco/socios");
    revalidatePath(`/espaco/${slugBase}`);
    revalidatePath(`/local/${espacoId}`);
    revalidatePath("/locais");
    return { ok: true, message: "Configurações do espaço salvas." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao salvar espaço.",
    };
  }
}

export async function criarUnidadeEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const { supabase, user } = await requireEspacoManager(espacoId);
  const gate = await getPaaSUnidadeGateInfo(supabase, espacoId);
  if (!gate.podeCriarUnidade) {
    throw new Error(gate.motivoBloqueio ?? "Não é possível criar unidade no momento.");
  }
  const nome = text(formData, "nome");
  if (nome.length < 2) throw new Error("Informe o nome da quadra/unidade.");
  const logoFile = formData.get("logo_file");
  let logoArquivo: string | null = null;
  if (logoFile instanceof File && logoFile.size > 0) {
    logoArquivo = await uploadLogoUnidadeEspaco(logoFile, user.id);
  }
  const payload = {
    espaco_generico_id: espacoId,
    nome,
    tipo_unidade: text(formData, "tipo_unidade") || "quadra",
    superficie: text(formData, "superficie") || null,
    esporte_id: intOrNull(formData, "esporte_id"),
    modalidade: text(formData, "modalidade") || null,
    coberta: simNaoOuManter(formData, "coberta", false),
    indoor: simNaoOuManter(formData, "indoor", false),
    iluminacao: simNaoOuManter(formData, "iluminacao", false),
    capacidade: Math.max(1, Number(formData.get("capacidade") ?? 2) || 2),
    status_operacao: text(formData, "status_operacao") || "ativa",
    aceita_aulas: simNaoOuManter(formData, "aceita_aulas", true),
    aceita_torneios: simNaoOuManter(formData, "aceita_torneios", true),
    observacoes: text(formData, "observacoes") || null,
    logo_arquivo: logoArquivo,
  };
  const { data, error } = await supabase
    .from("espaco_unidades")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_unidade",
    p_entidade_id: data.id,
    p_acao: "unidade_criada",
    p_payload: { nome: payload.nome, tipo_unidade: payload.tipo_unidade },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco");
  revalidatePath("/espaco/agenda");
  revalidatePath("/espaco/configuracao");
}

export async function criarHorarioSemanalEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const { supabase, user } = await requireEspacoManager(espacoId);
  const { data: egFlags2 } = await supabase
    .from("espacos_genericos")
    .select(
      "id, modo_reserva, modo_monetizacao, paas_aprovado_operacao_sem_gateway, paas_primeiro_pagamento_mensal_recebido_em"
    )
    .eq("id", espacoId)
    .maybeSingle();
  const hGate = podeCriarAgendaEUnidades(
    (egFlags2 ?? { id: espacoId, modo_reserva: "mista", modo_monetizacao: "misto" }) as {
      id: number;
      modo_reserva: string | null;
      modo_monetizacao?: string | null;
      paas_aprovado_operacao_sem_gateway?: boolean | null;
      paas_primeiro_pagamento_mensal_recebido_em?: string | null;
    }
  );
  if (!hGate.ok) {
    throw new Error(hGate.motivo);
  }
  const diaSemana = Number(formData.get("dia_semana") ?? -1);
  const horaInicio = text(formData, "hora_inicio");
  const horaFim = text(formData, "hora_fim");
  const liberarProfessor = checkbox(formData, "liberar_professor");
  const liberarTorneio = checkbox(formData, "liberar_torneio");
  const liberarParaUsername = text(formData, "liberar_para_username").replace(/^@/, "");
  if (diaSemana < 0 || diaSemana > 6 || !horaInicio || !horaFim) {
    throw new Error("Preencha dia e faixa horária válidos.");
  }
  let liberarParaUsuarioId: string | null = null;
  if (liberarParaUsername) {
    const { data: targetProfile, error: targetErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", liberarParaUsername)
      .maybeSingle();
    if (targetErr) throw new Error(targetErr.message);
    if (!targetProfile?.id) throw new Error("Usuário de liberação não encontrado.");
    liberarParaUsuarioId = String(targetProfile.id);
  }
  const { data, error } = await supabase
    .from("espaco_horarios_semanais")
    .insert({
      espaco_generico_id: espacoId,
      espaco_unidade_id: intOrNull(formData, "espaco_unidade_id"),
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      liberar_professor: liberarProfessor,
      liberar_torneio: liberarTorneio,
      liberar_para_usuario_id: liberarParaUsuarioId,
      observacoes: montarHorarioObservacoes(text(formData, "observacoes")),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_horario",
    p_entidade_id: data.id,
    p_acao: "grade_criada",
    p_payload: { diaSemana, horaInicio, horaFim },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/agenda");
  revalidatePath("/espaco");
  revalidatePath("/espaco/configuracao");
}

export async function atualizarHorarioSemanalEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const horarioId = Number(formData.get("horario_id") ?? 0);
  if (!espacoId || !horarioId) throw new Error("Identificador inválido.");

  const { supabase, user } = await requireEspacoManager(espacoId);
  const ativo = text(formData, "ativo") === "true";
  const liberarProfessor = checkbox(formData, "liberar_professor");
  const liberarTorneio = checkbox(formData, "liberar_torneio");
  const observacoes = montarHorarioObservacoes(text(formData, "observacoes"));

  const { error } = await supabase
    .from("espaco_horarios_semanais")
    .update({
      ativo,
      liberar_professor: liberarProfessor,
      liberar_torneio: liberarTorneio,
      observacoes,
    })
    .eq("id", horarioId)
    .eq("espaco_generico_id", espacoId);
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_horario",
    p_entidade_id: horarioId,
    p_acao: "grade_atualizada",
    p_payload: { ativo, liberarProfessor, liberarTorneio },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/agenda");
  revalidatePath("/espaco");
  revalidatePath("/espaco/configuracao");
}

export async function removerHorarioSemanalEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const horarioId = Number(formData.get("horario_id") ?? 0);
  if (!espacoId || !horarioId) throw new Error("Identificador inválido.");
  const { supabase, user } = await requireEspacoManager(espacoId);
  const { error } = await supabase
    .from("espaco_horarios_semanais")
    .delete()
    .eq("id", horarioId)
    .eq("espaco_generico_id", espacoId);
  if (error) throw new Error(error.message);
  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_horario",
    p_entidade_id: horarioId,
    p_acao: "grade_removida",
    p_payload: {},
    p_autor_usuario_id: user.id,
  });
  revalidatePath("/espaco/agenda");
  revalidatePath("/espaco");
  revalidatePath("/espaco/configuracao");
}

export async function criarPermissaoOperadorEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const tipoOperador = text(formData, "tipo_operador");
  const usuarioId = text(formData, "usuario_id");
  const unidadeId = intOrNull(formData, "espaco_unidade_id");
  const diaSemana = Number(formData.get("dia_semana") ?? -1);
  const horaInicio = text(formData, "hora_inicio");
  const horaFim = text(formData, "hora_fim");
  const vigenciaInicio = text(formData, "vigencia_inicio") || null;
  const prazoIndeterminado = checkbox(formData, "prazo_indeterminado");
  const vigenciaFim = prazoIndeterminado ? null : text(formData, "vigencia_fim") || null;

  if (tipoOperador !== "professor" && tipoOperador !== "organizador") {
    throw new Error("Escolha se a permissão é para professor ou organizador.");
  }
  if (!usuarioId) throw new Error("Selecione um perfil na busca.");
  if (!unidadeId) throw new Error("Selecione a quadra/unidade liberada.");
  if (diaSemana < 0 || diaSemana > 6 || !horaInicio || !horaFim) {
    throw new Error("Preencha dia e faixa horária válidos.");
  }
  const iniMin = timeToMinutes(horaInicio);
  const fimMin = timeToMinutes(horaFim);
  if (iniMin == null || fimMin == null || fimMin <= iniMin) {
    throw new Error("O horário final precisa ser maior que o horário inicial.");
  }
  if (!vigenciaInicio) throw new Error("Informe a data de início da permissão.");
  if (!prazoIndeterminado && !vigenciaFim) throw new Error("Informe a data final ou marque prazo indeterminado.");
  if (vigenciaFim && vigenciaFim < vigenciaInicio) {
    throw new Error("A data final precisa ser posterior à data inicial.");
  }

  const { supabase, user } = await requireEspacoManager(espacoId);
  const { data: unidade, error: unidadeErr } = await supabase
    .from("espaco_unidades")
    .select("id")
    .eq("id", unidadeId)
    .eq("espaco_generico_id", espacoId)
    .maybeSingle();
  if (unidadeErr) throw new Error(unidadeErr.message);
  if (!unidade?.id) throw new Error("A quadra selecionada não pertence a este espaço.");

  const admin = createServiceRoleClient();
  const { data: roleRow, error: roleErr } = await admin
    .from("usuario_papeis")
    .select("usuario_id")
    .eq("usuario_id", usuarioId)
    .eq("papel", tipoOperador)
    .maybeSingle();
  if (roleErr) throw new Error(roleErr.message);
  if (!roleRow?.usuario_id) {
    throw new Error(
      tipoOperador === "professor"
        ? "Esse perfil não está cadastrado como professor."
        : "Esse perfil não está cadastrado como organizador."
    );
  }

  const { data, error } = await supabase
    .from("espaco_horarios_semanais")
    .insert({
      espaco_generico_id: espacoId,
      espaco_unidade_id: unidadeId,
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      liberar_professor: tipoOperador === "professor",
      liberar_torneio: tipoOperador === "organizador",
      liberar_para_usuario_id: usuarioId,
      vigencia_inicio: vigenciaInicio,
      vigencia_fim: vigenciaFim,
      observacoes: text(formData, "observacoes") || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_horario",
    p_entidade_id: data.id,
    p_acao: "permissao_operador_criada",
    p_payload: { tipoOperador, usuarioId, unidadeId, diaSemana, horaInicio, horaFim, vigenciaInicio, vigenciaFim },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/configuracao");
  revalidatePath("/espaco/agenda");
  revalidatePath("/espaco");
}

export async function alternarPermissaoOperadorEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const horarioId = Number(formData.get("horario_id") ?? 0);
  const ativo = text(formData, "ativo") === "true";
  if (!espacoId || !horarioId) throw new Error("Identificador inválido.");

  const { supabase, user } = await requireEspacoManager(espacoId);
  const { error } = await supabase
    .from("espaco_horarios_semanais")
    .update({ ativo })
    .eq("id", horarioId)
    .eq("espaco_generico_id", espacoId);
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_horario",
    p_entidade_id: horarioId,
    p_acao: ativo ? "permissao_operador_ativada" : "permissao_operador_desativada",
    p_payload: {},
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/configuracao");
  revalidatePath("/espaco/agenda");
  revalidatePath("/espaco");
}

export async function atualizarPermissaoOperadorEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const horarioId = Number(formData.get("horario_id") ?? 0);
  const unidadeId = intOrNull(formData, "espaco_unidade_id");
  const diaSemana = Number(formData.get("dia_semana") ?? -1);
  const horaInicio = text(formData, "hora_inicio");
  const horaFim = text(formData, "hora_fim");
  const vigenciaInicio = text(formData, "vigencia_inicio") || null;
  const prazoIndeterminado = checkbox(formData, "prazo_indeterminado");
  const vigenciaFim = prazoIndeterminado ? null : text(formData, "vigencia_fim") || null;

  if (!espacoId || !horarioId) throw new Error("Identificador inválido.");
  if (!unidadeId) throw new Error("Selecione a quadra/unidade liberada.");
  if (diaSemana < 0 || diaSemana > 6 || !horaInicio || !horaFim) {
    throw new Error("Preencha dia e faixa horária válidos.");
  }
  const iniMin = timeToMinutes(horaInicio);
  const fimMin = timeToMinutes(horaFim);
  if (iniMin == null || fimMin == null || fimMin <= iniMin) {
    throw new Error("O horário final precisa ser maior que o horário inicial.");
  }
  if (!vigenciaInicio) throw new Error("Informe a data de início da permissão.");
  if (!prazoIndeterminado && !vigenciaFim) throw new Error("Informe a data final ou marque prazo indeterminado.");
  if (vigenciaFim && vigenciaFim < vigenciaInicio) {
    throw new Error("A data final precisa ser posterior à data inicial.");
  }

  const { supabase, user } = await requireEspacoManager(espacoId);
  const { data: unidade, error: unidadeErr } = await supabase
    .from("espaco_unidades")
    .select("id")
    .eq("id", unidadeId)
    .eq("espaco_generico_id", espacoId)
    .maybeSingle();
  if (unidadeErr) throw new Error(unidadeErr.message);
  if (!unidade?.id) throw new Error("A quadra selecionada não pertence a este espaço.");

  const { error } = await supabase
    .from("espaco_horarios_semanais")
    .update({
      espaco_unidade_id: unidadeId,
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      vigencia_inicio: vigenciaInicio,
      vigencia_fim: vigenciaFim,
      observacoes: text(formData, "observacoes") || null,
    })
    .eq("id", horarioId)
    .eq("espaco_generico_id", espacoId);
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_horario",
    p_entidade_id: horarioId,
    p_acao: "permissao_operador_atualizada",
    p_payload: { unidadeId, diaSemana, horaInicio, horaFim, vigenciaInicio, vigenciaFim },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/configuracao");
  revalidatePath("/espaco/agenda");
  revalidatePath("/espaco");
}

export async function criarGradeAutomaticaEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const { supabase, user } = await requireEspacoManager(espacoId);
  const unidadeId = intOrNull(formData, "espaco_unidade_id");
  if (!unidadeId) throw new Error("Selecione uma unidade para gerar a grade.");

  const intervaloMin = Math.max(15, Math.min(240, Number(formData.get("intervalo_minutos") ?? 60) || 60));
  const segSexInicio = text(formData, "segsex_hora_inicio");
  const segSexFim = text(formData, "segsex_hora_fim");
  const sabadoDiff = checkbox(formData, "sabado_diferente");
  const domingoDiff = checkbox(formData, "domingo_diferente");
  const sabadoInicio = text(formData, "sabado_hora_inicio");
  const sabadoFim = text(formData, "sabado_hora_fim");
  const domingoInicio = text(formData, "domingo_hora_inicio");
  const domingoFim = text(formData, "domingo_hora_fim");
  const limparExistente = checkbox(formData, "limpar_grade_existente");
  const aplicarRegrasAgora = checkbox(formData, "aplicar_regras_agora");
  const feriadosAutomaticosAtivos = checkbox(formData, "feriados_automaticos_ativos");
  const feriadoOperacaoPadrao = text(formData, "feriado_operacao_padrao") === "aberto" ? "aberto" : "fechado";

  const baseIni = timeToMinutes(segSexInicio);
  const baseFim = timeToMinutes(segSexFim);
  if (baseIni == null || baseFim == null || baseFim <= baseIni) {
    throw new Error("Horário de segunda a sexta inválido.");
  }

  const dayWindows: Array<{ dia: number; ini: number; fim: number }> = [];
  for (let dia = 1; dia <= 5; dia += 1) {
    dayWindows.push({ dia, ini: baseIni, fim: baseFim });
  }

  if (sabadoDiff) {
    const ini = timeToMinutes(sabadoInicio);
    const fim = timeToMinutes(sabadoFim);
    if (ini == null || fim == null || fim <= ini) throw new Error("Horário de sábado inválido.");
    dayWindows.push({ dia: 6, ini, fim });
  }
  if (domingoDiff) {
    const ini = timeToMinutes(domingoInicio);
    const fim = timeToMinutes(domingoFim);
    if (ini == null || fim == null || fim <= ini) throw new Error("Horário de domingo inválido.");
    dayWindows.push({ dia: 0, ini, fim });
  }

  if (limparExistente) {
    const dias = dayWindows.map((d) => d.dia);
    const { error: delErr } = await supabase
      .from("espaco_horarios_semanais")
      .delete()
      .eq("espaco_generico_id", espacoId)
      .eq("espaco_unidade_id", unidadeId)
      .in("dia_semana", dias);
    if (delErr) throw new Error(delErr.message);
  }

  const inserts: Array<Record<string, unknown>> = [];
  for (const day of dayWindows) {
    for (let cursor = day.ini; cursor + intervaloMin <= day.fim; cursor += intervaloMin) {
      inserts.push({
        espaco_generico_id: espacoId,
        espaco_unidade_id: unidadeId,
        dia_semana: day.dia,
        hora_inicio: minutesToTime(cursor),
        hora_fim: minutesToTime(cursor + intervaloMin),
        observacoes: `Gerado automaticamente (${intervaloMin} min)`,
      });
    }
  }
  if (!inserts.length) {
    throw new Error("Nenhum slot foi gerado. Verifique horário e intervalo.");
  }
  const { error } = await supabase.from("espaco_horarios_semanais").insert(inserts);
  if (error) throw new Error(error.message);

  if (aplicarRegrasAgora) {
    const { data: espacoAtual, error: espacoErr } = await supabase
      .from("espacos_genericos")
      .select("id, configuracao_reservas_json")
      .eq("id", espacoId)
      .maybeSingle();
    if (espacoErr || !espacoAtual) {
      throw new Error(espacoErr?.message ?? "Não foi possível carregar configurações do espaço.");
    }
    const atual = normalizeEspacoReservaConfig(espacoAtual.configuracao_reservas_json);
    const novoCfg = serializarEspacoReservaConfig({
      ...atual,
      limiteReservasDia: Math.max(0, Number(formData.get("regra_limite_dia") ?? atual.limiteReservasDia)),
      limiteReservasSemana: Math.max(0, Number(formData.get("regra_limite_semana") ?? atual.limiteReservasSemana)),
      cooldownHoras: Math.max(0, Number(formData.get("regra_cooldown_horas") ?? atual.cooldownHoras)),
      antecedenciaMinHoras: Math.max(
        0,
        Number(formData.get("regra_antecedencia_min_horas") ?? atual.antecedenciaMinHoras)
      ),
      antecedenciaMaxDias: Math.max(
        0,
        Number(formData.get("regra_antecedencia_max_dias") ?? atual.antecedenciaMaxDias)
      ),
      reservasGratisLiberadas: checkbox(formData, "regra_reservas_gratis_liberadas"),
      gratisLimiteReservasDiaMembro: Math.max(
        0,
        Number(formData.get("regra_gratis_limite_dia") ?? atual.gratisLimiteReservasDiaMembro)
      ),
      gratisLimiteReservasSemanaMembro: Math.max(
        0,
        Number(formData.get("regra_gratis_limite_semana") ?? atual.gratisLimiteReservasSemanaMembro)
      ),
      gratisIntervaloHorasEntreReservasMembro: Math.max(
        0,
        Number(formData.get("regra_gratis_intervalo_horas") ?? atual.gratisIntervaloHorasEntreReservasMembro)
      ),
      gratisAntecedenciaMaxDiasMembro: Math.max(
        0,
        Number(formData.get("regra_gratis_antecedencia_max_dias") ?? atual.gratisAntecedenciaMaxDiasMembro)
      ),
    });
    const { error: updCfgErr } = await supabase
      .from("espacos_genericos")
      .update({
        configuracao_reservas_json: novoCfg,
      })
      .eq("id", espacoId);
    if (updCfgErr) throw new Error(updCfgErr.message);
  }

  if (feriadosAutomaticosAtivos) {
    const ano = new Date().getFullYear();
    const { data: espacoMeta, error: espacoMetaErr } = await supabase
      .from("espacos_genericos")
      .select("id, uf, codigo_ibge")
      .eq("id", espacoId)
      .maybeSingle();
    if (espacoMetaErr || !espacoMeta) {
      throw new Error(espacoMetaErr?.message ?? "Não foi possível carregar dados do espaço para feriados.");
    }

    const payload = await fetchAutomaticHolidaysForYear({
      year: ano,
      uf: espacoMeta.uf ?? null,
      codigoIbge: espacoMeta.codigo_ibge ?? null,
    });
    await supabase.from("espaco_feriados_cache").upsert(
      {
        espaco_generico_id: espacoId,
        ano,
        fonte: process.env.FERIADOS_API_TOKEN ? "feriadosapi" : "brasilapi",
        codigo_ibge: espacoMeta.codigo_ibge ?? null,
        payload_json: payload,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "espaco_generico_id,ano,fonte" }
    );

    const rowsToApply: FeriadoOperacaoRow[] = [];
    for (const item of payload) {
      const nome = String(item.nome ?? "Feriado");
      const dataRef = String(item.data ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataRef)) continue;
      const { data: existente } = await supabase
        .from("espaco_feriados_personalizados")
        .select("id, nome, data_inicio, data_fim, operar_no_feriado, sobrepor_grade")
        .eq("espaco_generico_id", espacoId)
        .eq("data_inicio", dataRef)
        .eq("data_fim", dataRef)
        .limit(1)
        .maybeSingle();
      if (existente?.id) {
        rowsToApply.push(existente as FeriadoOperacaoRow);
        continue;
      }
      const { data: inserido } = await supabase
        .from("espaco_feriados_personalizados")
        .insert({
          espaco_generico_id: espacoId,
          nome,
          data_inicio: dataRef,
          data_fim: dataRef,
          operar_no_feriado: feriadoOperacaoPadrao === "aberto",
          sobrepor_grade: true,
        })
        .select("id, nome, data_inicio, data_fim, operar_no_feriado, sobrepor_grade")
        .single();
      if (inserido?.id) {
        rowsToApply.push(inserido as FeriadoOperacaoRow);
      }
    }

    await applyFeriadoSobreposicaoByRows(supabase, espacoId, user.id, rowsToApply);
    await notifyEspacoSociosAboutFeriado(
      supabase,
      espacoId,
      user.id,
      "Atualização de feriados do espaço: confira se o local abrirá ou fechará nas próximas datas."
    );
  }

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_horario",
    p_entidade_id: null,
    p_acao: "grade_automatica_criada",
    p_payload: {
      unidadeId,
      intervaloMin,
      dias: dayWindows.map((d) => d.dia),
      slots: inserts.length,
      limparExistente,
      aplicarRegrasAgora,
      feriadosAutomaticosAtivos,
      feriadoOperacaoPadrao,
    },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/agenda");
  revalidatePath("/espaco");
  revalidatePath("/espaco/configuracao");
}

export async function criarSobreposicaoFeriadoEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const { supabase, user } = await requireEspacoManager(espacoId);
  const unidadeId = intOrNull(formData, "espaco_unidade_id");
  const dataInicio = text(formData, "feriado_data_inicio");
  const dataFim = text(formData, "feriado_data_fim") || dataInicio;
  const horaInicio = text(formData, "feriado_hora_inicio") || "00:00";
  const horaFim = text(formData, "feriado_hora_fim") || "23:59";
  const titulo = text(formData, "feriado_titulo") || "Sobreposição de feriado";
  if (!dataInicio || !dataFim) throw new Error("Informe as datas da sobreposição de feriado.");

  const start = new Date(`${dataInicio}T00:00:00`);
  const end = new Date(`${dataFim}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    throw new Error("Período de feriado inválido.");
  }
  const iniMin = timeToMinutes(horaInicio);
  const fimMin = timeToMinutes(horaFim);
  if (iniMin == null || fimMin == null || fimMin <= iniMin) {
    throw new Error("Horário de sobreposição de feriado inválido.");
  }

  const rows: Array<Record<string, unknown>> = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const date = cursor.toISOString().slice(0, 10);
    rows.push({
      espaco_generico_id: espacoId,
      espaco_unidade_id: unidadeId,
      titulo,
      tipo_bloqueio: "feriado",
      motivo: "Sobreposição aplicada sobre a grade padrão",
      inicio: `${date}T${horaInicio}:00`,
      fim: `${date}T${horaFim}:00`,
      criado_por_usuario_id: user.id,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  const { error } = await supabase.from("espaco_bloqueios").insert(rows);
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_bloqueio",
    p_entidade_id: null,
    p_acao: "sobreposicao_feriado_criada",
    p_payload: { unidadeId, dataInicio, dataFim, horaInicio, horaFim, total: rows.length },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/agenda");
}

export async function criarBloqueioEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const { supabase, user } = await requireEspacoManager(espacoId);
  const inicio = text(formData, "inicio");
  const fim = text(formData, "fim");
  if (!inicio || !fim) throw new Error("Informe início e fim do bloqueio.");
  const { data, error } = await supabase
    .from("espaco_bloqueios")
    .insert({
      espaco_generico_id: espacoId,
      espaco_unidade_id: intOrNull(formData, "espaco_unidade_id"),
      titulo: text(formData, "titulo") || "Bloqueio operacional",
      motivo: text(formData, "motivo") || null,
      tipo_bloqueio: text(formData, "tipo_bloqueio") || "manutencao",
      inicio,
      fim,
      criado_por_usuario_id: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_bloqueio",
    p_entidade_id: data.id,
    p_acao: "bloqueio_criado",
    p_payload: { inicio, fim },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/agenda");
  revalidatePath("/espaco");
  revalidatePath("/espaco/configuracao");
}

export async function removerBloqueioEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const bloqueioId = Number(formData.get("bloqueio_id") ?? 0);
  if (!espacoId || !bloqueioId) throw new Error("Identificador inválido.");
  const { supabase, user } = await requireEspacoManager(espacoId);
  const { error } = await supabase
    .from("espaco_bloqueios")
    .delete()
    .eq("id", bloqueioId)
    .eq("espaco_generico_id", espacoId);
  if (error) throw new Error(error.message);
  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_bloqueio",
    p_entidade_id: bloqueioId,
    p_acao: "bloqueio_removido",
    p_payload: {},
    p_autor_usuario_id: user.id,
  });
  revalidatePath("/espaco/agenda");
  revalidatePath("/espaco");
  revalidatePath("/espaco/configuracao");
}

export async function alternarAtivoUnidadeEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const unidadeId = Number(formData.get("unidade_id") ?? 0);
  if (!espacoId || !unidadeId) throw new Error("Identificador inválido.");
  const { supabase, user } = await requireEspacoManager(espacoId);
  const { data: row, error: selErr } = await supabase
    .from("espaco_unidades")
    .select("id, ativo")
    .eq("id", unidadeId)
    .eq("espaco_generico_id", espacoId)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (!row) throw new Error("Unidade não encontrada.");
  const { error } = await supabase
    .from("espaco_unidades")
    .update({ ativo: !row.ativo, atualizado_em: new Date().toISOString() })
    .eq("id", unidadeId)
    .eq("espaco_generico_id", espacoId);
  if (error) throw new Error(error.message);
  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_unidade",
    p_entidade_id: unidadeId,
    p_acao: "unidade_ativo_alternado",
    p_payload: { ativo: !row.ativo },
    p_autor_usuario_id: user.id,
  });
  revalidatePath("/espaco/agenda");
  revalidatePath("/espaco");
  revalidatePath("/espaco/configuracao");
}

export async function escolherPlanoMensalidadePaaSAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const planoMensalId = Number(formData.get("plano_mensal_id") ?? 0);
  if (!espacoId || !planoMensalId) {
    throw new Error("Selecione um plano válido.");
  }
  const { supabase, user, espaco } = await requireEspacoManager(espacoId);
  const { data: eg, error: egErr } = await supabase
    .from("espacos_genericos")
    .select("categoria_mensalidade, modo_monetizacao, modo_reserva")
    .eq("id", espacoId)
    .maybeSingle();
  if (egErr || !eg) throw new Error(egErr?.message ?? "Espaço não encontrado.");
  if (!espacoUsaCatalogoPaaS({
    modoReserva: (eg as { modo_reserva?: string | null }).modo_reserva ?? null,
    modoMonetizacao: (eg as { modo_monetizacao?: string | null }).modo_monetizacao ?? null,
  })) {
    throw new Error("A mensalidade da plataforma só se aplica a espaços por associação.");
  }
  const categoria = String((eg as { categoria_mensalidade?: string | null }).categoria_mensalidade ?? "outro");
  const { data: plano, error: pErr } = await supabase
    .from("espaco_plano_mensal_plataforma")
    .select("id, nome, valor_mensal_centavos, categoria_espaco, liberacao")
    .eq("id", planoMensalId)
    .maybeSingle();
  if (pErr || !plano) throw new Error(pErr?.message ?? "Plano não encontrado.");
  const p = plano as {
    nome: string;
    valor_mensal_centavos: number;
    categoria_espaco: string;
    liberacao: string;
  };
  if (p.categoria_espaco !== categoria) {
    throw new Error("Este plano não corresponde à categoria do seu espaço.");
  }
  if (p.liberacao !== "publico") {
    throw new Error("Este plano não está disponível para contratação.");
  }
  const responsavel = espaco.responsavel_usuario_id ?? espaco.criado_por_usuario_id;
  if (!responsavel) {
    throw new Error("Defina um responsável pelo espaço antes de contratar o plano.");
  }
  const { error: upErr } = await supabase.from("espaco_assinaturas_plataforma").upsert(
    {
      espaco_generico_id: espacoId,
      responsavel_usuario_id: responsavel,
      plano_mensal_id: planoMensalId,
      plano_nome: p.nome,
      valor_mensal_centavos: p.valor_mensal_centavos,
      atualizado_em: new Date().toISOString(),
      status: "pending",
    },
    { onConflict: "espaco_generico_id" }
  );
  if (upErr) throw new Error(upErr.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco",
    p_entidade_id: espacoId,
    p_acao: "plano_paaS_escolhido",
    p_payload: { plano_mensal_id: planoMensalId, plano_nome: p.nome, valor_mensal_centavos: p.valor_mensal_centavos },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/financeiro");
  revalidatePath("/espaco/configuracao");
  revalidatePath("/espaco");
  revalidatePath("/espaco/agenda");
}

function simNaoOuManter(formData: FormData, field: string, atual: boolean) {
  const v = text(formData, field);
  if (v === "sim") return true;
  if (v === "nao") return false;
  return atual;
}

export async function atualizarUnidadeEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const unidadeId = Number(formData.get("unidade_id") ?? 0);
  if (!espacoId || !unidadeId) throw new Error("Identificador inválido.");
  const { supabase, user } = await requireEspacoManager(espacoId);
  const { data: cur, error: curErr } = await supabase
    .from("espaco_unidades")
    .select(
      "id, nome, tipo_unidade, superficie, modalidade, coberta, indoor, iluminacao, capacidade, status_operacao, aceita_aulas, aceita_torneios, observacoes, logo_arquivo"
    )
    .eq("id", unidadeId)
    .eq("espaco_generico_id", espacoId)
    .maybeSingle();
  if (curErr) throw new Error(curErr.message);
  if (!cur) throw new Error("Unidade não encontrada.");

  const nome = text(formData, "nome");
  if (nome.length < 2) throw new Error("Informe o nome da quadra/unidade.");
  const logoFile = formData.get("logo_file");
  let logoArquivo: string | null | undefined;
  if (logoFile instanceof File && logoFile.size > 0) {
    logoArquivo = await uploadLogoUnidadeEspaco(logoFile, user.id);
  } else if (text(formData, "remover_logo") === "1") {
    logoArquivo = null;
  }

  const curRow = cur as {
    coberta: boolean;
    indoor: boolean;
    iluminacao: boolean;
    aceita_aulas: boolean;
    aceita_torneios: boolean;
  };

  const updatePayload: Record<string, unknown> = {
    nome,
    tipo_unidade: text(formData, "tipo_unidade") || "quadra",
    superficie: text(formData, "superficie") || null,
    modalidade: text(formData, "modalidade") || null,
    coberta: simNaoOuManter(formData, "coberta", curRow.coberta),
    indoor: simNaoOuManter(formData, "indoor", curRow.indoor),
    iluminacao: simNaoOuManter(formData, "iluminacao", curRow.iluminacao),
    capacidade: Math.max(1, Number(formData.get("capacidade") ?? 2) || 2),
    status_operacao: text(formData, "status_operacao") || "ativa",
    aceita_aulas: simNaoOuManter(formData, "aceita_aulas", curRow.aceita_aulas),
    aceita_torneios: simNaoOuManter(formData, "aceita_torneios", curRow.aceita_torneios),
    observacoes: text(formData, "observacoes") || null,
    atualizado_em: new Date().toISOString(),
  };
  if (logoArquivo !== undefined) {
    updatePayload.logo_arquivo = logoArquivo;
  }

  const { error } = await supabase
    .from("espaco_unidades")
    .update(updatePayload)
    .eq("id", unidadeId)
    .eq("espaco_generico_id", espacoId);
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_unidade",
    p_entidade_id: unidadeId,
    p_acao: "unidade_atualizada",
    p_payload: { nome },
    p_autor_usuario_id: user.id,
  });
  revalidatePath("/espaco/agenda");
  revalidatePath("/espaco");
  revalidatePath("/espaco/configuracao");
}

export async function criarPlanoSocioEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const { supabase, user } = await requireEspacoManager(espacoId);
  const nome = text(formData, "nome");
  if (nome.length < 2) throw new Error("Informe o nome do plano.");
  const reservasGratisSemana = numberInputOrNull(formData, "reservas_gratuitas_semana");
  const limiteReservasSemana = numberInputOrNull(formData, "limite_reservas_semana");
  const cooldownHoras = numberInputOrNull(formData, "cooldown_horas");
  const antecedenciaMaxDias = numberInputOrNull(formData, "antecedencia_max_dias");
  const { data, error } = await supabase
    .from("espaco_planos_socio")
    .insert({
      espaco_generico_id: espacoId,
      nome,
      slug: slugifyEspaco(nome),
      descricao: text(formData, "descricao") || null,
      mensalidade_centavos:
        dinheiroCentavos(formData, "mensalidade_reais") ||
        Math.max(0, Math.round(Number(formData.get("mensalidade_centavos") ?? 0) || 0)),
      taxa_adesao_centavos:
        dinheiroCentavos(formData, "taxa_adesao_reais") ||
        Math.max(0, Math.round(Number(formData.get("taxa_adesao_centavos") ?? 0) || 0)),
      limite_reservas_dia: intOrNull(formData, "limite_reservas_dia"),
      limite_reservas_semana:
        limiteReservasSemana === null ? null : Math.max(0, Math.round(limiteReservasSemana)),
      cooldown_horas: Math.max(0, Math.round(cooldownHoras ?? 0)),
      antecedencia_min_horas: Math.max(
        0,
        Number(formData.get("antecedencia_min_horas") ?? 0) || 0
      ),
      antecedencia_max_dias: Math.max(
        0,
        Math.round(antecedenciaMaxDias ?? 0)
      ),
      reservas_gratuitas_semana: Math.max(0, Math.round(reservasGratisSemana ?? 0)),
      beneficios_json: {
        itens_beneficios: text(formData, "itens_beneficios") || null,
        uma_reserva_ativa_por_vez:
          checkbox(formData, "uma_reserva_ativa_por_vez"),
        herdar_regras_globais: {
          reservas_gratuitas_semana: reservasGratisSemana === null,
          limite_reservas_semana: limiteReservasSemana === null,
          cooldown_horas: cooldownHoras === null,
          antecedencia_max_dias: antecedenciaMaxDias === null,
        },
      },
      percentual_desconto_avulso: Math.max(
        0,
        Number(formData.get("percentual_desconto_avulso") ?? 0) || 0
      ),
      prioridade_waitlist: Math.max(
        0,
        Number(formData.get("prioridade_waitlist") ?? 0) || 0
      ),
      permite_convidados: checkbox(formData, "permite_convidados"),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_plano_socio",
    p_entidade_id: data.id,
    p_acao: "plano_criado",
    p_payload: { nome },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/socios");
  revalidatePath("/espaco");
  revalidatePath("/espaco/configuracao");
}

export async function atualizarPlanoSocioEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const planoId = Number(formData.get("plano_id") ?? 0);
  const { supabase, user } = await requireEspacoManager(espacoId);
  if (!planoId) throw new Error("Plano inválido.");
  const nome = text(formData, "nome");
  if (nome.length < 2) throw new Error("Informe o nome do plano.");
  const reservasGratisSemana = numberInputOrNull(formData, "reservas_gratuitas_semana");
  const limiteReservasSemana = numberInputOrNull(formData, "limite_reservas_semana");
  const cooldownHoras = numberInputOrNull(formData, "cooldown_horas");
  const antecedenciaMaxDias = numberInputOrNull(formData, "antecedencia_max_dias");

  const { error } = await supabase
    .from("espaco_planos_socio")
    .update({
      nome,
      slug: slugifyEspaco(nome),
      descricao: text(formData, "descricao") || null,
      mensalidade_centavos: dinheiroCentavos(formData, "mensalidade_reais"),
      taxa_adesao_centavos: dinheiroCentavos(formData, "taxa_adesao_reais"),
      limite_reservas_semana:
        limiteReservasSemana === null ? null : Math.max(0, Math.round(limiteReservasSemana)),
      cooldown_horas: Math.max(0, Math.round(cooldownHoras ?? 0)),
      antecedencia_max_dias: Math.max(0, Math.round(antecedenciaMaxDias ?? 0)),
      reservas_gratuitas_semana: Math.max(0, Math.round(reservasGratisSemana ?? 0)),
      beneficios_json: {
        itens_beneficios: text(formData, "itens_beneficios") || null,
        uma_reserva_ativa_por_vez: checkbox(formData, "uma_reserva_ativa_por_vez"),
        herdar_regras_globais: {
          reservas_gratuitas_semana: reservasGratisSemana === null,
          limite_reservas_semana: limiteReservasSemana === null,
          cooldown_horas: cooldownHoras === null,
          antecedencia_max_dias: antecedenciaMaxDias === null,
        },
      },
      percentual_desconto_avulso: Math.max(0, Number(formData.get("percentual_desconto_avulso") ?? 0) || 0),
      ativo: checkbox(formData, "ativo"),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", planoId)
    .eq("espaco_generico_id", espacoId);
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_plano_socio",
    p_entidade_id: planoId,
    p_acao: "plano_atualizado",
    p_payload: { nome },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/socios");
  revalidatePath("/espaco");
  revalidatePath("/espaco/configuracao");
}

export async function solicitarSocioEspacoAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const { supabase, user } = await requireUser();
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const planoId = intOrNull(formData, "plano_socio_id");
    const mensagem = text(formData, "mensagem");
    if (!espacoId) {
      return { ok: false, message: "Espaço inválido." };
    }

    const { data: espaco, error: espacoErr } = await supabase
      .from("espacos_genericos")
      .select(
        "id, slug, nome_publico, aceita_socios, responsavel_usuario_id, criado_por_usuario_id, associacao_regra_json, modo_reserva, modo_monetizacao, entrada_membro_modo"
      )
      .eq("id", espacoId)
      .maybeSingle();
    if (espacoErr || !espaco) {
      return { ok: false, message: espacoErr?.message ?? "Espaço não encontrado." };
    }
    if (!espaco.aceita_socios) {
      return {
        ok: false,
        message: "Este espaço não está aceitando novos sócios no momento.",
      };
    }
    const regraAssociacao = normalizeEspacoAssociacaoConfig(espaco.associacao_regra_json);
    const tipoOperacao = resolverTipoOperacaoEspaco({
      modoReserva: espaco.modo_reserva,
      modoMonetizacao: (espaco as { modo_monetizacao?: string | null }).modo_monetizacao ?? null,
    });
    const entradaModoColuna = String((espaco as Record<string, unknown>).entrada_membro_modo ?? "manual");
    const entradaAutomatica = false;
    const identificadorEntrada = text(formData, "identificador_entrada");
    if (!entradaAutomatica && regraAssociacao.modoEntrada === "matricula" && identificadorEntrada.length < 3) {
      return { ok: false, message: "Informe a matrícula/código exigido pelo espaço." };
    }
    if (!entradaAutomatica && regraAssociacao.modoEntrada === "cpf") {
      const digits = identificadorEntrada.replace(/\D/g, "");
      if (digits.length !== 11) {
        return { ok: false, message: "Informe um CPF válido (11 dígitos)." };
      }
    }

    const docs: Array<{
      field: string;
      tipo: string;
      file: File | null;
    }> = [
      { field: "documento_rg", tipo: "rg", file: formData.get("documento_rg") as File | null },
      { field: "documento_cpf", tipo: "cpf", file: formData.get("documento_cpf") as File | null },
      {
        field: "documento_comprovante",
        tipo: "comprovante_residencia",
        file: formData.get("documento_comprovante") as File | null,
      },
    ];
    if (!entradaAutomatica && docs.some((item) => !(item.file instanceof File) || item.file.size <= 0)) {
      return {
        ok: false,
        message: "Envie RG, CPF e comprovante para solicitar a associação.",
      };
    }

    const { data: existente } = await supabase
      .from("espaco_socios")
      .select("id, status")
      .eq("espaco_generico_id", espacoId)
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (existente && existente.status !== "rejeitado" && existente.status !== "cancelado") {
      return {
        ok: false,
        message: "Você já possui uma solicitação ou vínculo de sócio com este espaço.",
      };
    }

    const matricula = `SOC-${espacoId}-${Date.now().toString().slice(-8)}`;
    const { data: membership, error: membershipErr } = await supabase
      .from("membership_requests")
      .insert({
        espaco_generico_id: espacoId,
        usuario_id: user.id,
        matricula,
        plano_socio_id: planoId,
        mensagem: mensagem || null,
        identificador_tipo: regraAssociacao.modoEntrada === "somente_perfil" ? null : regraAssociacao.modoEntrada,
        identificador_valor:
          regraAssociacao.modoEntrada === "somente_perfil"
            ? null
            : identificadorEntrada || null,
        dados_json: {
          regra: regraAssociacao,
          entradaAutomatica,
          tipoOperacao,
          fluxoAssociacao: planoId ? "socio" : "membro",
          entrada_membro_modo: entradaModoColuna,
        },
        status: "pendente",
        resolvido_em: null,
        resolvido_por_usuario_id: null,
      })
      .select("id")
      .single();
    if (membershipErr) {
      return { ok: false, message: membershipErr.message };
    }

    const { data: socio, error: socioErr } = await supabase
      .from("espaco_socios")
      .upsert(
        {
          espaco_generico_id: espacoId,
          usuario_id: user.id,
          membership_request_id: membership.id,
          plano_socio_id: planoId,
          matricula,
          status: "em_analise",
          documentos_status: "pendente",
          financeiro_status: "pendente",
          beneficios_liberados: false,
          aprovado_por_usuario_id: null,
          aprovado_em: null,
          ativo_desde: null,
        },
        { onConflict: "espaco_generico_id,usuario_id" }
      )
      .select("id")
      .single();
    if (socioErr) {
      return { ok: false, message: socioErr.message };
    }

    for (const item of docs) {
      if (!(item.file instanceof File) || item.file.size <= 0) continue;
      const path = await uploadDocumentoEspaco(item.file as File, user.id);
      const { error } = await supabase.from("espaco_documentos_socio").insert({
        espaco_generico_id: espacoId,
        espaco_socio_id: socio.id,
        membership_request_id: membership.id,
        usuario_id: user.id,
        tipo_documento: item.tipo,
        arquivo_path: path,
        mime_type: (item.file as File).type || "application/octet-stream",
        status: "pendente",
      });
      if (error) return { ok: false, message: error.message };
    }

    const notifyOwnerId =
      espaco.responsavel_usuario_id ?? espaco.criado_por_usuario_id ?? null;
    if (notifyOwnerId) {
      const { data } = await supabase
        .from("notificacoes")
        .insert({
          usuario_id: notifyOwnerId,
          mensagem: "Um novo pedido de associação foi enviado para o seu espaço.",
          tipo: "espaco_socio",
          referencia_id: socio.id,
          lida: false,
          remetente_id: user.id,
          data_criacao: new Date().toISOString(),
        })
        .select("id")
        .limit(1);
      await triggerPushForNotificationIdsBestEffort([Number((data?.[0] as { id?: number } | undefined)?.id ?? 0)], {
        source: "espaco/actions.solicitacao-associacao",
      });
    }

    await supabase.rpc("espaco_criar_auditoria", {
      p_espaco_id: espacoId,
      p_entidade_tipo: "espaco_socio",
      p_entidade_id: socio.id,
      p_acao: "solicitacao_associacao_criada",
      p_payload: { membershipRequestId: membership.id, planoId, entradaAutomatica, tipoOperacao },
      p_autor_usuario_id: user.id,
    });

    revalidatePath(`/espaco/${espaco.slug ?? ""}`);
    revalidatePath("/comunidade");
    return {
      ok: true,
      message: planoId
        ? "Solicitação enviada. O pagamento e a aprovação do admin vão liberar seu acesso como sócio."
        : "Solicitação enviada. O espaço vai revisar seus dados antes de liberar o acesso.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao solicitar associação.",
    };
  }
}

export async function iniciarAssociacaoPagaEspacoAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const { supabase, user } = await requireUser();
    const admin = createServiceRoleClient();
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const planoId = intOrNull(formData, "plano_socio_id");
    const mensagem = text(formData, "mensagem");
    if (!espacoId || !planoId) {
      return { ok: false, message: "Selecione um plano de sócio válido." };
    }

    const { data: espaco, error: espacoErr } = await supabase
      .from("espacos_genericos")
      .select(
        "id, slug, nome_publico, aceita_socios, responsavel_usuario_id, criado_por_usuario_id, associacao_regra_json, modo_reserva, modo_monetizacao, entrada_membro_modo"
      )
      .eq("id", espacoId)
      .maybeSingle();
    if (espacoErr || !espaco) {
      return { ok: false, message: espacoErr?.message ?? "Espaço não encontrado." };
    }
    if (!espaco.aceita_socios) {
      return { ok: false, message: "Este espaço não está aceitando novos sócios no momento." };
    }

    const tipoOperacao = resolverTipoOperacaoEspaco({
      modoReserva: espaco.modo_reserva,
      modoMonetizacao: (espaco as { modo_monetizacao?: string | null }).modo_monetizacao ?? null,
    });
    if (tipoOperacao !== "associacao") {
      return { ok: false, message: "A associação paga só está disponível para espaços por associação." };
    }

    const regraAssociacao = normalizeEspacoAssociacaoConfig(espaco.associacao_regra_json);
    const identificadorEntrada = text(formData, "identificador_entrada");
    if (regraAssociacao.modoEntrada === "matricula" && identificadorEntrada.length < 3) {
      return { ok: false, message: "Informe a matrícula/código exigido pelo espaço." };
    }
    if (regraAssociacao.modoEntrada === "cpf") {
      const digits = identificadorEntrada.replace(/\D/g, "");
      if (digits.length !== 11) {
        return { ok: false, message: "Informe um CPF válido (11 dígitos)." };
      }
    }

    const docs: Array<{ tipo: string; file: File | null }> = [
      { tipo: "rg", file: formData.get("documento_rg") as File | null },
      { tipo: "cpf", file: formData.get("documento_cpf") as File | null },
      { tipo: "comprovante_residencia", file: formData.get("documento_comprovante") as File | null },
    ];
    if (docs.some((item) => !(item.file instanceof File) || item.file.size <= 0)) {
      return { ok: false, message: "Envie RG, CPF e comprovante para solicitar a associação paga." };
    }

    const { data: plano, error: planoErr } = await supabase
      .from("espaco_planos_socio")
      .select("id, nome, mensalidade_centavos")
      .eq("id", planoId)
      .eq("espaco_generico_id", espacoId)
      .eq("ativo", true)
      .maybeSingle();
    if (planoErr || !plano) {
      return { ok: false, message: planoErr?.message ?? "Plano não encontrado." };
    }
    const valorMensalCentavos = Math.max(0, Number(plano.mensalidade_centavos ?? 0));
    if (valorMensalCentavos <= 0) {
      return { ok: false, message: "Esse plano não possui mensalidade configurada." };
    }

    const { data: existente } = await supabase
      .from("espaco_socios")
      .select("id, status")
      .eq("espaco_generico_id", espacoId)
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (existente && existente.status !== "rejeitado" && existente.status !== "cancelado") {
      return { ok: false, message: "Você já possui uma solicitação ou vínculo de sócio com este espaço." };
    }

    const customerId = await ensureProfileAsaasCustomer(user.id);
    const card = readAsaasCardForm(formData, user.email);
    const hoje = new Date();
    const primeiraCobranca = hoje.toISOString().slice(0, 10);
    const externalRefBase = `espaco_socio_assinatura:${espacoId}:${user.id}:${Date.now()}`;
    const subscription = await createAsaasSubscription({
      customer: customerId,
      billingType: "CREDIT_CARD",
      value: valorMensalCentavos / 100,
      nextDueDate: primeiraCobranca,
      cycle: "MONTHLY",
      description: `Mensalidade de sócio — ${String(plano.nome ?? "Plano")} · ${String(espaco.nome_publico ?? "Espaço")}`,
      externalReference: externalRefBase,
      creditCard: {
        holderName: card.holderName,
        number: card.cardNumber,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        ccv: card.ccv,
      },
      creditCardHolderInfo: {
        name: card.holderName,
        email: card.email,
        cpfCnpj: card.cpfCnpj,
        postalCode: card.postalCode,
        addressNumber: card.addressNumber,
        phone: card.phone,
      },
    });

    const payment = await createAsaasPayment({
      customer: customerId,
      billingType: "CREDIT_CARD",
      value: valorMensalCentavos / 100,
      dueDate: primeiraCobranca,
      description: `1ª mensalidade de sócio — ${String(plano.nome ?? "Plano")}`,
      externalReference: `${externalRefBase}:primeira`,
    });

    const matricula = `SOC-${espacoId}-${Date.now().toString().slice(-8)}`;
    const { data: membership, error: membershipErr } = await supabase
      .from("membership_requests")
      .insert({
        espaco_generico_id: espacoId,
        usuario_id: user.id,
        matricula,
        plano_socio_id: planoId,
        mensagem: mensagem || null,
        identificador_tipo: regraAssociacao.modoEntrada === "somente_perfil" ? null : regraAssociacao.modoEntrada,
        identificador_valor: regraAssociacao.modoEntrada === "somente_perfil" ? null : identificadorEntrada || null,
        dados_json: {
          regra: regraAssociacao,
          tipoOperacao,
          fluxoAssociacao: "socio_pago",
          pagamento_inicial_status: "pending",
          asaas_payment_id: payment.id,
          asaas_subscription_id: subscription.id,
        },
        status: "pendente",
        resolvido_em: null,
        resolvido_por_usuario_id: null,
      })
      .select("id")
      .single();
    if (membershipErr) {
      return { ok: false, message: membershipErr.message };
    }

    const { data: socio, error: socioErr } = await supabase
      .from("espaco_socios")
      .upsert(
        {
          espaco_generico_id: espacoId,
          usuario_id: user.id,
          membership_request_id: membership.id,
          plano_socio_id: planoId,
          matricula,
          status: "em_analise",
          documentos_status: "pendente",
          financeiro_status: "pendente",
          beneficios_liberados: false,
          aprovado_por_usuario_id: null,
          aprovado_em: null,
          ativo_desde: null,
        },
        { onConflict: "espaco_generico_id,usuario_id" }
      )
      .select("id")
      .single();
    if (socioErr) {
      return { ok: false, message: socioErr.message };
    }

    for (const item of docs) {
      if (!(item.file instanceof File) || item.file.size <= 0) continue;
      const path = await uploadDocumentoEspaco(item.file as File, user.id);
      const { error } = await supabase.from("espaco_documentos_socio").insert({
        espaco_generico_id: espacoId,
        espaco_socio_id: socio.id,
        membership_request_id: membership.id,
        usuario_id: user.id,
        tipo_documento: item.tipo,
        arquivo_path: path,
        mime_type: (item.file as File).type || "application/octet-stream",
        status: "pendente",
      });
      if (error) return { ok: false, message: error.message };
    }

    const { data: assinaturaSocio, error: assinaturaErr } = await admin
      .from("espaco_socio_assinaturas")
      .upsert(
        {
          espaco_generico_id: espacoId,
          espaco_socio_id: socio.id,
          usuario_id: user.id,
          plano_socio_id: planoId,
          asaas_subscription_id: subscription.id,
          status: "pending",
          valor_mensal_centavos: valorMensalCentavos,
          proxima_cobranca: subscription.nextDueDate ?? primeiraCobranca,
        },
        { onConflict: "espaco_socio_id" }
      )
      .select("id")
      .single();
    if (assinaturaErr || !assinaturaSocio) {
      return { ok: false, message: assinaturaErr?.message ?? "Falha ao registrar assinatura do sócio." };
    }

    const { data: cfg } = await admin
      .from("ei_financeiro_config")
      .select(
        "asaas_taxa_percentual, espaco_taxa_fixa, espaco_taxa_fixa_promo, espaco_plataforma_sobre_taxa_gateway, espaco_plataforma_sobre_taxa_gateway_promo, espaco_promocao_ativa, espaco_promocao_ate, espaco_socio_comissao_percentual"
      )
      .eq("id", 1)
      .maybeSingle();
    const calculo = calcularFinanceiroEspaco({
      valorCentavos: valorMensalCentavos,
      config: cfg,
      comissaoPercentualPlataforma: Number(
        (cfg as Record<string, unknown> | null)?.espaco_socio_comissao_percentual ?? 0
      ),
    });
    const walletRecebedor = await buscarWalletRecebedorEspaco(
      admin,
      espacoId,
      espaco.responsavel_usuario_id ?? espaco.criado_por_usuario_id ?? null
    );
    const split = asaasSplitDoEspaco(walletRecebedor, calculo.liquidoEspacoCentavos);
    if (!split) {
      return { ok: false, message: "Configure a conta Asaas de recebimentos do espaço antes de cobrar mensalidades de sócio." };
    }

    await admin.from("espaco_transacoes").insert({
      espaco_generico_id: espacoId,
      usuario_id: user.id,
      espaco_socio_id: socio.id,
      assinatura_socio_id: assinaturaSocio.id,
      tipo: "mensalidade_socio",
      billing_type: "cartao",
      asaas_billing_type: "CREDIT_CARD",
      status: "pending",
      valor_bruto_centavos: calculo.brutoCentavos,
      taxa_gateway_centavos: calculo.taxaGatewayCentavos,
      comissao_plataforma_centavos: calculo.comissaoPlataformaCentavos,
      valor_liquido_espaco_centavos: calculo.liquidoEspacoCentavos,
      asaas_customer_id: customerId,
      asaas_payment_id: payment.id,
      asaas_subscription_id: subscription.id,
      asaas_charge_url: payment.invoiceUrl ?? payment.bankSlipUrl ?? null,
      external_reference: `${externalRefBase}:primeira`,
      vencimento_em: primeiraCobranca,
    });

    const notifyOwnerId = espaco.responsavel_usuario_id ?? espaco.criado_por_usuario_id ?? null;
    if (notifyOwnerId) {
      const { data } = await supabase
        .from("notificacoes")
        .insert({
          usuario_id: notifyOwnerId,
          mensagem: "Um novo sócio iniciou pagamento e aguarda aprovação no seu espaço.",
          tipo: "espaco_socio",
          referencia_id: socio.id,
          lida: false,
          remetente_id: user.id,
          data_criacao: new Date().toISOString(),
        })
        .select("id")
        .limit(1);
      await triggerPushForNotificationIdsBestEffort([Number((data?.[0] as { id?: number } | undefined)?.id ?? 0)], {
        source: "espaco/actions.associacao-paga",
      });
    }

    await supabase.rpc("espaco_criar_auditoria", {
      p_espaco_id: espacoId,
      p_entidade_tipo: "espaco_socio",
      p_entidade_id: socio.id,
      p_acao: "associacao_paga_iniciada",
      p_payload: {
        membershipRequestId: membership.id,
        planoId,
        assinaturaSocioId: assinaturaSocio.id,
        asaasPaymentId: payment.id,
        asaasSubscriptionId: subscription.id,
      },
      p_autor_usuario_id: user.id,
    });

    revalidatePath(`/espaco/${espaco.slug ?? ""}`);
    revalidatePath("/comunidade");
    return {
      ok: true,
      message: "Pagamento iniciado. O admin do espaço ainda precisa aprovar sua entrada para liberar reservas e benefícios.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao iniciar associação paga.",
    };
  }
}

export async function revisarDocumentoSocioEspacoAction(formData: FormData) {
  const docId = Number(formData.get("documento_id") ?? 0);
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const status = text(formData, "status");
  const motivo = text(formData, "motivo_rejeicao");
  const { supabase, user } = await requireEspacoManager(espacoId);
  if (!docId || !["aprovado", "rejeitado"].includes(status)) {
    throw new Error("Documento inválido.");
  }

  const { data: doc, error: docErr } = await supabase
    .from("espaco_documentos_socio")
    .update({
      status,
      motivo_rejeicao: motivo || null,
      revisado_por_usuario_id: user.id,
      revisado_em: new Date().toISOString(),
    })
    .eq("id", docId)
    .eq("espaco_generico_id", espacoId)
    .select("id, espaco_socio_id")
    .single();
  if (docErr) throw new Error(docErr.message);

  if (doc.espaco_socio_id) {
    const { data: docs } = await supabase
      .from("espaco_documentos_socio")
      .select("status")
      .eq("espaco_socio_id", doc.espaco_socio_id);
    const statuses = (docs ?? []).map((item) => item.status);
    const documentosStatus = statuses.every((item) => item === "aprovado")
      ? "aprovado"
      : statuses.some((item) => item === "rejeitado")
        ? "rejeitado"
        : "parcial";
    await supabase
      .from("espaco_socios")
      .update({
        documentos_status: documentosStatus,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", doc.espaco_socio_id);
  }

  revalidatePath("/espaco/socios");
}

export async function revisarSocioEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const socioId = Number(formData.get("socio_id") ?? 0);
  const status = text(formData, "status");
  const motivo = text(formData, "motivo");
  const planoId = intOrNull(formData, "plano_socio_id");
  const { supabase, user } = await requireEspacoManager(espacoId);
  if (!socioId || !["ativo", "rejeitado", "suspenso", "inadimplente"].includes(status)) {
    throw new Error("Ação inválida.");
  }

  const documentosStatus =
    status === "ativo" ? "aprovado" : status === "rejeitado" ? "rejeitado" : "parcial";
  const financeiroStatus =
    status === "inadimplente" ? "inadimplente" : status === "ativo" ? "em_dia" : "pendente";
  const beneficiosLiberados = status === "ativo";
  const update: Record<string, unknown> = {
    status,
    documentos_status: documentosStatus,
    financeiro_status: financeiroStatus,
    beneficios_liberados: beneficiosLiberados,
    plano_socio_id: planoId,
    motivo_rejeicao: status === "rejeitado" ? motivo || null : null,
    motivo_bloqueio:
      status === "suspenso" || status === "inadimplente" ? motivo || null : null,
    aprovado_por_usuario_id: status === "ativo" ? user.id : null,
    aprovado_em: status === "ativo" ? new Date().toISOString() : null,
    rejeitado_por_usuario_id: status === "rejeitado" ? user.id : null,
    rejeitado_em: status === "rejeitado" ? new Date().toISOString() : null,
    ativo_desde: status === "ativo" ? new Date().toISOString() : null,
    bloqueado_beneficios_em:
      status === "suspenso" || status === "inadimplente"
        ? new Date().toISOString()
        : null,
    atualizado_em: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("espaco_socios")
    .update(update)
    .eq("id", socioId)
    .eq("espaco_generico_id", espacoId);
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_socio",
    p_entidade_id: socioId,
    p_acao: `socio_${status}`,
    p_motivo: motivo || null,
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/socios");
  revalidatePath("/espaco");
}

export async function responderSolicitacaoEntradaEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const requestId = Number(formData.get("request_id") ?? 0);
  const decisao = text(formData, "decisao");
  const motivo = text(formData, "motivo");
  if (!espacoId || !requestId || !["aprovar", "recusar"].includes(decisao)) {
    throw new Error("Dados inválidos para resposta da solicitação.");
  }
  const { supabase, user } = await requireEspacoManager(espacoId);

  const { data: req, error: reqErr } = await supabase
    .from("membership_requests")
    .select("id, usuario_id, status, plano_socio_id")
    .eq("id", requestId)
    .eq("espaco_generico_id", espacoId)
    .maybeSingle();
  if (reqErr) throw new Error(reqErr.message);
  if (!req) throw new Error("Solicitação não encontrada.");
  if (String(req.status) !== "pendente") throw new Error("Essa solicitação já foi respondida.");
  const planoIdAprovacao = decisao === "aprovar"
    ? (intOrNull(formData, "plano_socio_id") ?? req.plano_socio_id ?? null)
    : req.plano_socio_id ?? null;

  await supabase
    .from("membership_requests")
    .update({
      status: decisao === "aprovar" ? "aprovado" : "recusado",
      plano_socio_id: planoIdAprovacao,
      resolvido_em: new Date().toISOString(),
      resolvido_por_usuario_id: user.id,
    })
    .eq("id", req.id);

  await supabase
    .from("espaco_socios")
    .update({
      status: decisao === "aprovar" ? "ativo" : "rejeitado",
      plano_socio_id: planoIdAprovacao,
      motivo_rejeicao: decisao === "recusar" ? motivo || "Solicitação recusada pelo espaço." : null,
      aprovado_por_usuario_id: decisao === "aprovar" ? user.id : null,
      aprovado_em: decisao === "aprovar" ? new Date().toISOString() : null,
      rejeitado_por_usuario_id: decisao === "recusar" ? user.id : null,
      rejeitado_em: decisao === "recusar" ? new Date().toISOString() : null,
      documentos_status: decisao === "aprovar" ? "aprovado" : "rejeitado",
      financeiro_status: decisao === "aprovar" ? "em_dia" : "pendente",
      beneficios_liberados: decisao === "aprovar",
      atualizado_em: new Date().toISOString(),
    })
    .eq("membership_request_id", req.id)
    .eq("espaco_generico_id", espacoId);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "membership_request",
    p_entidade_id: req.id,
    p_acao: decisao === "aprovar" ? "solicitacao_aprovada" : "solicitacao_recusada",
    p_motivo: motivo || null,
    p_autor_usuario_id: user.id,
  });

  const { data: notifSocio } = await supabase
    .from("notificacoes")
    .insert({
      usuario_id: req.usuario_id,
      mensagem:
        decisao === "aprovar"
          ? "Sua solicitação de entrada no espaço foi aprovada."
          : "Sua solicitação de entrada no espaço foi recusada.",
      tipo: "espaco_socio",
      referencia_id: req.id,
      lida: false,
      remetente_id: user.id,
      data_criacao: new Date().toISOString(),
    })
    .select("id")
    .limit(1);
  await triggerPushForNotificationIdsBestEffort([Number((notifSocio?.[0] as { id?: number } | undefined)?.id ?? 0)], {
    source: "espaco/actions.responder-solicitacao",
  });

  revalidatePath("/espaco/socios");
  revalidatePath("/espaco");
}

export async function criarReservaEspacoAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const { supabase, user } = await requireUser();
    const admin = createServiceRoleClient();
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const unidadeId = intOrNull(formData, "espaco_unidade_id");
    const inicio = text(formData, "inicio");
    const fim = text(formData, "fim");
    const tipoReserva = text(formData, "tipo_reserva") || "paga";
    const formaRaw = text(formData, "forma_pagamento") || "pix";
    const esporteId = intOrNull(formData, "esporte_id");
    const partidaId = intOrNull(formData, "partida_id");
    const torneioJogoId = intOrNull(formData, "torneio_jogo_id");
    if (!espacoId || !inicio || !fim) {
      return { ok: false, message: "Preencha unidade, início e fim da reserva." };
    }

    const [{ data: espaco }, { data: socio }, { data: planoFormulario }, { data: cfg }] =
      await Promise.all([
        supabase
          .from("espacos_genericos")
          .select(
            "id, slug, nome_publico, configuracao_reservas_json, uf, codigo_ibge, responsavel_usuario_id, criado_por_usuario_id, modo_reserva, modo_monetizacao, taxa_reserva_plataforma_centavos, formas_pagamento_aceitas"
          )
          .eq("id", espacoId)
          .maybeSingle(),
        supabase
          .from("espaco_socios")
          .select("id, status, documentos_status, financeiro_status, beneficios_liberados, validade_ate, plano_socio_id")
          .eq("espaco_generico_id", espacoId)
          .eq("usuario_id", user.id)
          .maybeSingle(),
        supabase
          .from("espaco_planos_socio")
          .select("*")
          .eq("id", Number(formData.get("plano_socio_id") ?? 0) || -1)
          .maybeSingle(),
        supabase
          .from("ei_financeiro_config")
          .select(
            "asaas_taxa_percentual, espaco_taxa_fixa, espaco_taxa_fixa_promo, espaco_plataforma_sobre_taxa_gateway, espaco_plataforma_sobre_taxa_gateway_promo, espaco_reserva_comissao_percentual, espaco_promocao_ativa, espaco_promocao_ate"
          )
          .eq("id", 1)
          .maybeSingle(),
      ]);

    if (!espaco) return { ok: false, message: "Espaço não encontrado." };
    let plano = planoFormulario;
    if (!plano && socio?.plano_socio_id) {
      const { data: planoSocio } = await supabase
        .from("espaco_planos_socio")
        .select("*")
        .eq("id", Number(socio.plano_socio_id))
        .maybeSingle();
      plano = planoSocio;
    }
    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);
    if (
      Number.isNaN(inicioDate.getTime()) ||
      Number.isNaN(fimDate.getTime()) ||
      fimDate.getTime() <= inicioDate.getTime()
    ) {
      return { ok: false, message: "Intervalo inválido para a reserva." };
    }

    const punicaoAtiva = await getActiveSuspensaoMarcacao(supabase, espacoId, user.id);
    if (punicaoAtiva?.id) {
      return {
        ok: false,
        message: punicaoAtiva.fim_em
          ? `Você está com suspensão ativa de marcação até ${new Date(String(punicaoAtiva.fim_em)).toLocaleDateString("pt-BR")}.`
          : "Você está com suspensão ativa de marcação sem prazo definido.",
      };
    }

    if (tipoReserva === "professor" || tipoReserva === "torneio") {
      if (!unidadeId) {
        return {
          ok: false,
          message: "Para professor/torneio, selecione uma unidade específica.",
        };
      }
      const ehProfessor = tipoReserva === "professor" ? await hasUserRole(supabase, user.id, "professor") : true;
      const ehOrganizador = tipoReserva === "torneio" ? await hasUserRole(supabase, user.id, "organizador") : true;
      if (!ehProfessor || !ehOrganizador) {
        return {
          ok: false,
          message:
            tipoReserva === "professor"
              ? "Somente professores podem usar horário liberado para aula."
              : "Somente organizadores podem usar horário liberado para torneio.",
        };
      }

      const diaSemana = inicioDate.getDay();
      const inicioHorario = inicioDate.toISOString().slice(11, 16);
      const fimHorario = fimDate.toISOString().slice(11, 16);
      const flagField = tipoReserva === "professor" ? "liberar_professor" : "liberar_torneio";

      const { data: horariosLiberados, error: horariosErr } = await supabase
        .from("espaco_horarios_semanais")
        .select("id, hora_inicio, hora_fim, liberar_para_usuario_id, vigencia_inicio, vigencia_fim")
        .eq("espaco_generico_id", espacoId)
        .eq("espaco_unidade_id", unidadeId)
        .eq("dia_semana", diaSemana)
        .eq("ativo", true)
        .eq(flagField, true);
      if (horariosErr) {
        return { ok: false, message: horariosErr.message };
      }

      const permitido = (horariosLiberados ?? []).some((slot) => {
        const inicioSlot = String(slot.hora_inicio).slice(0, 5);
        const fimSlot = String(slot.hora_fim).slice(0, 5);
        const alvo = slot.liberar_para_usuario_id ? String(slot.liberar_para_usuario_id) : null;
        const dentroFaixa = inicioHorario >= inicioSlot && fimHorario <= fimSlot;
        const usuarioPermitido = !alvo || alvo === user.id;
        const dataReserva = inicioDate.toISOString().slice(0, 10);
        const vigenciaInicio = slot.vigencia_inicio ? String(slot.vigencia_inicio).slice(0, 10) : null;
        const vigenciaFim = slot.vigencia_fim ? String(slot.vigencia_fim).slice(0, 10) : null;
        const dentroVigencia = (!vigenciaInicio || dataReserva >= vigenciaInicio) && (!vigenciaFim || dataReserva <= vigenciaFim);
        return dentroFaixa && usuarioPermitido && dentroVigencia;
      });

      if (!permitido) {
        return {
          ok: false,
          message:
            tipoReserva === "professor"
              ? "Este horário não foi liberado pelo dono para aulas de professor."
              : "Este horário não foi liberado pelo dono para jogo de torneio.",
        };
      }
    }

    if (tipoReserva === "rank") {
      if (!partidaId) {
        return { ok: false, message: "Informe a partida de ranking para vincular a reserva." };
      }
      const { data: partida, error: partidaErr } = await supabase
        .from("partidas")
        .select("id, jogador1_id, jogador2_id, desafiante_id, desafiado_id, usuario_id")
        .eq("id", partidaId)
        .maybeSingle();
      if (partidaErr) return { ok: false, message: partidaErr.message };
      const podeVincular =
        partida &&
        [partida.jogador1_id, partida.jogador2_id, partida.desafiante_id, partida.desafiado_id, partida.usuario_id]
          .filter(Boolean)
          .some((id) => String(id) === user.id);
      if (!podeVincular) {
        return { ok: false, message: "Você não tem permissão para vincular essa partida de ranking." };
      }
    }

    let torneioIdVinculado: number | null = null;
    if (tipoReserva === "torneio") {
      if (!torneioJogoId) {
        return { ok: false, message: "Informe o jogo de torneio para vincular a reserva." };
      }
      const { data: jogo, error: jogoErr } = await supabase
        .from("torneio_jogos")
        .select("id, torneio_id, torneios!inner(id, criador_id)")
        .eq("id", torneioJogoId)
        .maybeSingle();
      if (jogoErr) return { ok: false, message: jogoErr.message };
      const torneioOwner = Array.isArray(jogo?.torneios) ? jogo?.torneios[0] : jogo?.torneios;
      if (!jogo?.id || String(torneioOwner?.criador_id ?? "") !== user.id) {
        return { ok: false, message: "Você só pode vincular jogos dos seus torneios." };
      }
      torneioIdVinculado = Number(jogo.torneio_id ?? 0) || null;
    }

    const benefit = avaliarBeneficiosSocioEspaco({
      socio,
      plano,
      configuracaoEspaco: espaco.configuracao_reservas_json,
    });

    const cfgReservas = normalizeEspacoReservaConfig(espaco.configuracao_reservas_json);
    const valorCentavos = cfgReservas.valorReservaPadraoCentavos;
    const espacoM = espaco as {
      modo_reserva?: string | null;
      modo_monetizacao?: string | null;
      taxa_reserva_plataforma_centavos?: number | null;
    };
    const tipoOperacao = resolverTipoOperacaoEspaco({
      modoReserva: espacoM.modo_reserva ?? null,
      modoMonetizacao: espacoM.modo_monetizacao ?? null,
    });
    const isGratuitoTipo = tipoReserva === "torneio" || tipoReserva === "professor";
    if (tipoOperacao === "reserva_paga" && !isGratuitoTipo && !checkbox(formData, "usar_beneficio_gratis") && valorCentavos < 1) {
      return {
        ok: false,
        message: "Este local está configurado com reservas pagas, mas o dono ainda não definiu o valor padrão da reserva.",
      };
    }
    if (tipoOperacao === "associacao" && !isGratuitoTipo && valorCentavos > 0) {
      return {
        ok: false,
        message: "Este local opera por associação. O valor do horário precisa ser gratuito para associados nas reservas comuns.",
      };
    }
    if (tipoOperacao === "associacao" && !isGratuitoTipo && !benefit.ok) {
      return {
        ok: false,
        message: benefit.motivo ?? "Você precisa estar com a associação ativa para reservar neste espaço.",
      };
    }
    const antecedenciaHoras =
      (inicioDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (antecedenciaHoras < benefit.antecedenciaMinHoras) {
      return {
        ok: false,
        message: `Esse horário precisa ser reservado com pelo menos ${benefit.antecedenciaMinHoras} hora(s) de antecedência.`,
      };
    }
    if (benefit.antecedenciaMaxDias > 0 && antecedenciaHoras > benefit.antecedenciaMaxDias * 24) {
      return {
        ok: false,
        message: `Seu plano permite reservar até ${benefit.antecedenciaMaxDias} dia(s) à frente.`,
      };
    }
    if (exigeUmaReservaAtivaPorVez(plano)) {
      const { count: reservasAtivasCount, error: reservasAtivasErr } = await supabase
        .from("reservas_quadra")
        .select("id", { count: "exact", head: true })
        .eq("espaco_generico_id", espacoId)
        .eq("usuario_solicitante_id", user.id)
        .in("status_reserva", ["pendente", "confirmada", "aguardando_pagamento"])
        .gte("fim", new Date().toISOString());
      if (reservasAtivasErr) {
        return { ok: false, message: reservasAtivasErr.message };
      }
      if (Number(reservasAtivasCount ?? 0) > 0) {
        return {
          ok: false,
          message:
            "Seu plano permite 1 marcação ativa por vez. Cancele ou finalize a reserva atual para marcar a próxima.",
        };
      }
    }

    const inicioSemanaReserva = new Date(inicioDate);
    inicioSemanaReserva.setDate(inicioDate.getDate() - inicioDate.getDay());
    inicioSemanaReserva.setHours(0, 0, 0, 0);
    const fimSemanaReserva = new Date(inicioSemanaReserva);
    fimSemanaReserva.setDate(inicioSemanaReserva.getDate() + 7);
    fimSemanaReserva.setMilliseconds(-1);

    const [reservasExistentes, bloqueios, gradeSemanal, feriadosCustom, reservasDiaUsuario, reservasSemanaUsuario, ultimaReservaUsuario] =
      await Promise.all([
        supabase
          .from("reservas_quadra")
          .select("id, inicio, fim, status_reserva")
          .eq("espaco_generico_id", espacoId)
          .eq("espaco_unidade_id", unidadeId ?? -1)
          .neq("status_reserva", "cancelada")
          .lt("inicio", fim)
          .gt("fim", inicio),
        supabase
          .from("espaco_bloqueios")
          .select("id, inicio, fim, titulo")
          .eq("espaco_generico_id", espacoId)
          .eq("espaco_unidade_id", unidadeId ?? -1)
          .eq("ativo", true)
          .lt("inicio", fim)
          .gt("fim", inicio),
        supabase
          .from("espaco_horarios_semanais")
          .select("dia_semana, hora_inicio, hora_fim, ativo, observacoes")
          .eq("espaco_generico_id", espacoId)
          .or(
            unidadeId
              ? `espaco_unidade_id.eq.${unidadeId},espaco_unidade_id.is.null`
              : "espaco_unidade_id.is.null"
          )
          .eq("ativo", true),
        supabase
          .from("espaco_feriados_personalizados")
          .select("data_inicio, data_fim")
          .eq("espaco_generico_id", espacoId),
        supabase
          .from("reservas_quadra")
          .select("id", { count: "exact", head: true })
          .eq("espaco_generico_id", espacoId)
          .eq("usuario_solicitante_id", user.id)
          .neq("status_reserva", "cancelada")
          .gte(
            "inicio",
            new Date(
              new Date(inicioDate).setHours(0, 0, 0, 0)
            ).toISOString()
          )
          .lte(
            "inicio",
            new Date(
              new Date(inicioDate).setHours(23, 59, 59, 999)
            ).toISOString()
          ),
        supabase
          .from("reservas_quadra")
          .select("id", { count: "exact", head: true })
          .eq("espaco_generico_id", espacoId)
          .eq("usuario_solicitante_id", user.id)
          .neq("status_reserva", "cancelada")
          .gte("inicio", inicioSemanaReserva.toISOString())
          .lte("inicio", fimSemanaReserva.toISOString()),
        supabase
          .from("reservas_quadra")
          .select("inicio")
          .eq("espaco_generico_id", espacoId)
          .eq("usuario_solicitante_id", user.id)
          .order("inicio", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (!isDentroDaGradeSemanal({ inicio, fim, grade: gradeSemanal.data ?? [] })) {
      return {
        ok: false,
        message: "Esse horário está fora da grade semanal disponível.",
      };
    }
    const slotDaReserva = (gradeSemanal.data ?? []).find((slot) => {
      const inicioSlot = String(slot.hora_inicio).slice(0, 5);
      const fimSlot = String(slot.hora_fim).slice(0, 5);
      const diaSlot = Number(slot.dia_semana);
      return diaSlot === inicioDate.getDay() && inicioDate.toISOString().slice(11, 16) >= inicioSlot && fimDate.toISOString().slice(11, 16) <= fimSlot;
    });
    const modoReservaHorario = parseHorarioObservacoes(slotDaReserva?.observacoes).modoReserva;

    const feriadosAutomaticos = await fetchAutomaticHolidaysForYear({
      year: inicioDate.getFullYear(),
      uf: espaco.uf ?? null,
      codigoIbge: espaco.codigo_ibge ?? null,
    });
    if (
      isHolidayDate({
        inicio,
        feriadosCustom: (feriadosCustom.data ?? []).map((item) => ({
          data_inicio: String(item.data_inicio),
          data_fim: String(item.data_fim),
        })),
        feriadosAutomaticos,
      })
    ) {
      return {
        ok: false,
        message: "Esse horário cai em um feriado bloqueado para reservas.",
      };
    }

    const conflict = checkEspacoConflict({
      inicio,
      fim,
      reservas: (reservasExistentes.data ?? []).map((item) => ({
        id: item.id,
        inicio: String(item.inicio),
        fim: String(item.fim),
        status_reserva: item.status_reserva,
      })),
      bloqueios: (bloqueios.data ?? []).map((item) => ({
        inicio: String(item.inicio),
        fim: String(item.fim),
        titulo: item.titulo,
      })),
    });
    if (!conflict.ok) {
      return { ok: false, message: conflict.motivo ?? "Horário indisponível." };
    }

    if (benefit.limiteReservasDia > 0 && (reservasDiaUsuario.count ?? 0) >= benefit.limiteReservasDia) {
      return {
        ok: false,
        message: "Você atingiu o limite diário de reservas deste espaço.",
      };
    }
    const cfgBeneficiosGratis = normalizeEspacoReservaConfig(espaco.configuracao_reservas_json);
    const reservasGratisPlanoCustomizado =
      cfgBeneficiosGratis.reservasGratisLiberadas &&
      !planoHerdaRegraGlobal(plano, "reservas_gratuitas_semana") &&
      plano?.reservas_gratuitas_semana !== null &&
      plano?.reservas_gratuitas_semana !== undefined &&
      Number.isFinite(Number(plano.reservas_gratuitas_semana));
    const reservasGratisSemLimite = benefit.ok && benefit.reservasGratisSemana === 0;
    const usarBeneficioGratis =
      checkbox(formData, "usar_beneficio_gratis") &&
      benefit.ok &&
      cfgBeneficiosGratis.reservasGratisLiberadas;
    if (modoReservaHorario === "paga" && usarBeneficioGratis && !isGratuitoTipo) {
      return {
        ok: false,
        message: "Este horário foi configurado pelo espaço para aceitar somente reserva paga.",
      };
    }
    const reservaGratuitaPorHorario = modoReservaHorario === "gratuita" && !isGratuitoTipo;
    const usarReservaSemCobranca = usarBeneficioGratis || reservaGratuitaPorHorario;
    if (usarBeneficioGratis) {
      const cfgReservas = cfgBeneficiosGratis;
      const inicioDia = new Date(
        new Date(inicioDate).setHours(0, 0, 0, 0)
      ).toISOString();
      const fimDia = new Date(
        new Date(inicioDate).setHours(23, 59, 59, 999)
      ).toISOString();

      const inicioSemana = new Date(inicioDate);
      inicioSemana.setDate(inicioDate.getDate() - inicioDate.getDay());
      inicioSemana.setHours(0, 0, 0, 0);
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 7);
      fimSemana.setMilliseconds(-1);

      const [
        { count: reservasGratisDiaCount },
        { count: reservasGratisSemanaCount },
        { data: ultimaReservaGratis },
      ] = await Promise.all([
        supabase
          .from("reservas_quadra")
          .select("id", { count: "exact", head: true })
          .eq("espaco_generico_id", espacoId)
          .eq("usuario_solicitante_id", user.id)
          .eq("reserva_gratuita", true)
          .gte("inicio", inicioDia)
          .lte("inicio", fimDia),
        supabase
          .from("reservas_quadra")
          .select("id", { count: "exact", head: true })
          .eq("espaco_generico_id", espacoId)
          .eq("usuario_solicitante_id", user.id)
          .eq("reserva_gratuita", true)
          .gte("inicio", inicioSemana.toISOString())
          .lte("inicio", fimSemana.toISOString()),
        supabase
          .from("reservas_quadra")
          .select("inicio")
          .eq("espaco_generico_id", espacoId)
          .eq("usuario_solicitante_id", user.id)
          .eq("reserva_gratuita", true)
          .order("inicio", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (
        cfgReservas.gratisLimiteReservasDiaMembro > 0 &&
        Number(reservasGratisDiaCount ?? 0) >=
          cfgReservas.gratisLimiteReservasDiaMembro
      ) {
        return {
          ok: false,
          message: `Nas reservas gratuitas, seu limite diário é ${cfgReservas.gratisLimiteReservasDiaMembro}.`,
        };
      }

      if (
        !reservasGratisSemLimite &&
        benefit.reservasGratisSemana > 0 &&
        Number(reservasGratisSemanaCount ?? 0) >= benefit.reservasGratisSemana
      ) {
        return {
          ok: false,
          message: `Seu plano permite ${benefit.reservasGratisSemana} reserva(s) gratuita(s) por semana.`,
        };
      }

      if (
        !reservasGratisPlanoCustomizado &&
        cfgReservas.gratisLimiteReservasSemanaMembro > 0 &&
        Number(reservasGratisSemanaCount ?? 0) >=
          cfgReservas.gratisLimiteReservasSemanaMembro
      ) {
        return {
          ok: false,
          message: `Nas reservas gratuitas, seu limite semanal é ${cfgReservas.gratisLimiteReservasSemanaMembro}.`,
        };
      }

      if (
        cfgReservas.gratisIntervaloHorasEntreReservasMembro > 0 &&
        ultimaReservaGratis?.inicio
      ) {
        const ultima = new Date(String(ultimaReservaGratis.inicio));
        const diffHours =
          Math.abs(inicioDate.getTime() - ultima.getTime()) / (1000 * 60 * 60);
        if (diffHours < cfgReservas.gratisIntervaloHorasEntreReservasMembro) {
          return {
            ok: false,
            message: `Nas reservas gratuitas, é obrigatório intervalo de ${cfgReservas.gratisIntervaloHorasEntreReservasMembro} hora(s) entre reservas.`,
          };
        }
      }

      if (
        cfgReservas.gratisAntecedenciaMaxDiasMembro > 0 &&
        antecedenciaHoras > cfgReservas.gratisAntecedenciaMaxDiasMembro * 24
      ) {
        return {
          ok: false,
          message: `Nas reservas gratuitas, o máximo de antecedência é ${cfgReservas.gratisAntecedenciaMaxDiasMembro} dia(s).`,
        };
      }
    }
    const taxaReservaPlataformaDb = Math.max(0, Math.round(Number(espacoM.taxa_reserva_plataforma_centavos ?? 0)));
    const soMensalidadePaaS = tipoOperacao === "associacao";
    const taxaReservaAplicar =
      !usarReservaSemCobranca &&
      !soMensalidadePaaS &&
      valorCentavos > 0 &&
      taxaReservaPlataformaDb > 0
        ? taxaReservaPlataformaDb
        : 0;
    if (benefit.limiteReservasSemana > 0 && (reservasSemanaUsuario.count ?? 0) >= benefit.limiteReservasSemana) {
      return {
        ok: false,
        message: "Você atingiu o limite semanal de reservas deste espaço.",
      };
    }
    if (benefit.cooldownHoras > 0 && ultimaReservaUsuario.data?.inicio) {
      const lastStart = new Date(String(ultimaReservaUsuario.data.inicio));
      const diffHours =
        Math.abs(inicioDate.getTime() - lastStart.getTime()) / (1000 * 60 * 60);
      if (diffHours < benefit.cooldownHoras) {
        return {
          ok: false,
          message: `É preciso respeitar ${benefit.cooldownHoras} hora(s) de cooldown entre reservas.`,
        };
      }
    }

    const calculo = calcularFinanceiroEspaco({
      valorCentavos: usarReservaSemCobranca ? 0 : valorCentavos,
      config: cfg,
      taxaReservaPlataformaCentavos: usarReservaSemCobranca ? 0 : taxaReservaAplicar,
      comissaoPercentualPlataforma: usarReservaSemCobranca
        ? 0
        : Number((cfg as Record<string, unknown> | null)?.espaco_reserva_comissao_percentual ?? 0),
    });

    const { data: reserva, error } = await admin
      .from("reservas_quadra")
      .insert({
        espaco_generico_id: espacoId,
        espaco_unidade_id: unidadeId,
        usuario_solicitante_id: user.id,
        valor_total: calculo.brutoCentavos / 100,
        payment_status: calculo.brutoCentavos > 0 ? "pending" : "isento",
        status_reserva: calculo.brutoCentavos > 0 ? "aguardando_pagamento" : "confirmada",
        taxa_gateway: calculo.taxaGatewayCentavos / 100,
        comissao_plataforma: calculo.comissaoPlataformaCentavos / 100,
        valor_liquido_local: calculo.liquidoEspacoCentavos / 100,
        inicio,
        fim,
        esporte_id: esporteId,
        tipo_reserva: tipoReserva,
        origem_reserva: benefit.ok ? "socio" : "avulsa",
        partida_id: partidaId,
        torneio_id: torneioIdVinculado,
        torneio_jogo_id: torneioJogoId,
        reserva_gratuita: usarReservaSemCobranca,
        espaco_socio_id: socio?.id ?? null,
        plano_socio_id: socio?.plano_socio_id ?? null,
        detalhes_json: {
          contexto: tipoReserva,
          pagamento: calculo.brutoCentavos > 0 ? "checkout_externo" : "isento",
          valor_centavos: calculo.brutoCentavos,
          modo_reserva_horario: modoReservaHorario,
          jogo_vinculado_id: partidaId,
          torneio_jogo_id: torneioJogoId,
        },
        atualizado_por: user.id,
      })
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };

    await admin.from("espaco_reserva_participantes").insert({
      reserva_quadra_id: reserva.id,
      usuario_id: user.id,
      papel: "titular",
      status: "confirmado",
    });

    await supabase.rpc("espaco_criar_auditoria", {
      p_espaco_id: espacoId,
      p_entidade_tipo: "reserva_quadra",
      p_entidade_id: reserva.id,
      p_acao: "reserva_criada",
      p_payload: { tipoReserva, usarBeneficioGratis, valorCentavos: calculo.brutoCentavos },
      p_autor_usuario_id: user.id,
    });

    const FORMA_PARA_ASAAS: Record<string, string> = { pix: "PIX", cartao: "CREDIT_CARD", boleto: "BOLETO" };
    const formasAceitas = Array.isArray((espaco as Record<string, unknown>).formas_pagamento_aceitas)
      ? (espaco as Record<string, unknown>).formas_pagamento_aceitas as string[]
      : ["pix", "cartao", "boleto"];
    const formaValidada = ["pix", "cartao", "boleto"].includes(formaRaw) ? formaRaw : "pix";
    const asaasBillingType = FORMA_PARA_ASAAS[formaValidada] ?? "PIX";

    let paymentResult:
      | {
          method: "pix" | "cartao";
          status?: string | null;
          chargeUrl?: string | null;
          pixPayload?: string | null;
          pixEncodedImage?: string | null;
          pixExpirationDate?: string | null;
        }
      | undefined;
    if (calculo.brutoCentavos > 0) {
      if (!formasAceitas.includes(formaValidada)) {
        return {
          ok: false,
          message: `Este espaço não aceita ${formaValidada === "pix" ? "PIX" : formaValidada === "cartao" ? "cartão de crédito" : "boleto"} como forma de pagamento.`,
        };
      }
      if (formaValidada === "boleto") {
        return {
          ok: false,
          message: "Boleto ainda não está disponível no checkout interno. Use PIX ou cartão de crédito.",
        };
      }
      const customerId = await ensureProfileAsaasCustomer(user.id);
      const walletRecebedor = await buscarWalletRecebedorEspaco(
        admin,
        espacoId,
        espaco.responsavel_usuario_id ?? espaco.criado_por_usuario_id
      );
      const split = asaasSplitDoEspaco(walletRecebedor, calculo.liquidoEspacoCentavos);
      if (!split) {
        return {
          ok: false,
          message: "Configure a conta Asaas de recebimentos do espaço antes de criar reservas pagas.",
        };
      }
      const paymentPayload: Record<string, unknown> = {
        customer: customerId,
        billingType: asaasBillingType,
        value: calculo.brutoCentavos / 100,
        dueDate: new Date().toISOString().slice(0, 10),
        description: `Reserva EsporteID · ${espaco.nome_publico}`,
        externalReference: `espaco_reserva:${reserva.id}`,
        split,
      };
      if (formaValidada === "cartao") {
        const card = readAsaasCardForm(formData, user.email);
        paymentPayload.creditCard = {
          holderName: card.holderName,
          number: card.cardNumber,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          ccv: card.ccv,
        };
        paymentPayload.creditCardHolderInfo = {
          name: card.holderName,
          email: card.email,
          cpfCnpj: card.cpfCnpj,
          postalCode: card.postalCode,
          addressNumber: card.addressNumber,
          phone: card.phone,
        };
      }
      const payment = await createAsaasPayment(paymentPayload);
      const chargeUrl = payment.invoiceUrl ?? payment.bankSlipUrl ?? null;
      let pixPayload: string | null = null;
      let pixEncodedImage: string | null = null;
      let pixExpirationDate: string | null = null;
      if (formaValidada === "pix") {
        const pixQr = await getAsaasPaymentPixQrCode(payment.id);
        pixPayload = pixQr.payload ?? null;
        pixEncodedImage = pixQr.encodedImage ?? null;
        pixExpirationDate = pixQr.expirationDate ?? null;
      }

      await admin.from("espaco_transacoes").insert({
        espaco_generico_id: espacoId,
        usuario_id: user.id,
        espaco_socio_id: socio?.id ?? null,
        reserva_quadra_id: reserva.id,
        tipo: "reserva_avulsa",
        billing_type: formaValidada,
        asaas_billing_type: asaasBillingType,
        status: "pending",
        valor_bruto_centavos: calculo.brutoCentavos,
        taxa_gateway_centavos: calculo.taxaGatewayCentavos,
        comissao_plataforma_centavos: calculo.comissaoPlataformaCentavos,
        valor_liquido_espaco_centavos: calculo.liquidoEspacoCentavos,
        asaas_customer_id: customerId,
        asaas_payment_id: payment.id,
        asaas_charge_url: chargeUrl,
        external_reference: `espaco_reserva:${reserva.id}`,
        vencimento_em: new Date().toISOString().slice(0, 10),
      });

      await admin
        .from("reservas_quadra")
        .update({
          asaas_payment_id: payment.id,
          transaction_id: `espaco_reserva:${reserva.id}`,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", reserva.id);

      paymentResult = {
        method: formaValidada === "cartao" ? "cartao" : "pix",
        status: payment.status ?? null,
        chargeUrl,
        pixPayload,
        pixEncodedImage,
        pixExpirationDate,
      };
    }

    const notifyOwnerId =
      espaco.responsavel_usuario_id ?? espaco.criado_por_usuario_id ?? null;
    if (notifyOwnerId) {
      const { data } = await admin
        .from("notificacoes")
        .insert({
          usuario_id: notifyOwnerId,
          mensagem:
            calculo.brutoCentavos > 0
              ? "Uma nova reserva aguardando pagamento foi criada no seu espaço."
              : "Uma nova reserva foi confirmada com benefício do sócio no seu espaço.",
          tipo: "espaco_reserva",
          referencia_id: reserva.id,
          lida: false,
          remetente_id: user.id,
          data_criacao: new Date().toISOString(),
        })
        .select("id")
        .limit(1);
      await triggerPushForNotificationIdsBestEffort([Number((data?.[0] as { id?: number } | undefined)?.id ?? 0)], {
        source: "espaco/actions.criar-reserva",
      });
    }

    revalidatePath(`/espaco/${espaco.slug ?? ""}`);
    revalidatePath("/comunidade");
    revalidatePath("/agenda");
    return {
      ok: true,
      message:
        calculo.brutoCentavos > 0
          ? paymentResult?.method === "pix"
            ? "Reserva criada. Finalize o pagamento por PIX abaixo para confirmar o horário."
            : "Reserva criada. O pagamento por cartão foi iniciado dentro da plataforma."
          : "Reserva criada com benefício de sócio.",
      payment: paymentResult,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao criar reserva.",
    };
  }
}

export async function entrarFilaEsperaEspacoAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const { supabase, user } = await requireUser();
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const inicio = text(formData, "inicio");
    const fim = text(formData, "fim");
    if (!espacoId || !inicio || !fim) {
      return { ok: false, message: "Informe o horário desejado." };
    }
    const inicioDate = new Date(inicio);
    if (Number.isNaN(inicioDate.getTime())) {
      return { ok: false, message: "Horário inválido para fila de espera." };
    }

    const punicaoAtiva = await getActiveSuspensaoMarcacao(supabase, espacoId, user.id);
    if (punicaoAtiva?.id) {
      return {
        ok: false,
        message: "Você está com suspensão ativa de marcação e não pode entrar na fila de espera.",
      };
    }

    const [{ data: espaco }, { data: socio }, { data: plano }] = await Promise.all([
      supabase
        .from("espacos_genericos")
        .select("id, modo_reserva, modo_monetizacao, configuracao_reservas_json")
        .eq("id", espacoId)
        .maybeSingle(),
      supabase
        .from("espaco_socios")
        .select("id, status, documentos_status, financeiro_status, beneficios_liberados, plano_socio_id")
        .eq("espaco_generico_id", espacoId)
        .eq("usuario_id", user.id)
        .maybeSingle(),
      supabase
        .from("espaco_planos_socio")
        .select("*")
        .eq("espaco_generico_id", espacoId)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle(),
    ]);
    if (!espaco) {
      return { ok: false, message: "Espaço não encontrado." };
    }
    const tipoOperacao = resolverTipoOperacaoEspaco({
      modoReserva: espaco.modo_reserva,
      modoMonetizacao: (espaco as { modo_monetizacao?: string | null }).modo_monetizacao ?? null,
    });
    if (tipoOperacao === "reserva_paga") {
      return { ok: false, message: "Fila de espera só está disponível para espaços por associação." };
    }

    const benefit = avaliarBeneficiosSocioEspaco({
      socio,
      plano,
      configuracaoEspaco: espaco.configuracao_reservas_json,
    });
    const cfgReservas = normalizeEspacoReservaConfig(espaco.configuracao_reservas_json);
    if (!benefit.ok || !cfgReservas.reservasGratisLiberadas) {
      return { ok: false, message: "Fila de espera só está disponível para membros com reserva gratuita liberada." };
    }
    const limiteDia = Math.max(0, Number(benefit.limiteReservasDia ?? 0));
    const limiteSemana = Math.max(0, Number(benefit.limiteReservasSemana ?? 0));

    const inicioDia = new Date(new Date(inicioDate).setHours(0, 0, 0, 0)).toISOString();
    const fimDia = new Date(new Date(inicioDate).setHours(23, 59, 59, 999)).toISOString();
    const inicioSemana = new Date(inicioDate);
    inicioSemana.setDate(inicioDate.getDate() - inicioDate.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 7);
    fimSemana.setMilliseconds(-1);

    const [{ count: countDia }, { count: countSemana }] = await Promise.all([
      supabase
        .from("reservas_quadra")
        .select("id", { count: "exact", head: true })
        .eq("espaco_generico_id", espacoId)
        .eq("usuario_solicitante_id", user.id)
        .neq("status_reserva", "cancelada")
        .gte("inicio", inicioDia)
        .lte("inicio", fimDia),
      supabase
        .from("reservas_quadra")
        .select("id", { count: "exact", head: true })
        .eq("espaco_generico_id", espacoId)
        .eq("usuario_solicitante_id", user.id)
        .neq("status_reserva", "cancelada")
        .gte("inicio", inicioSemana.toISOString())
        .lte("inicio", fimSemana.toISOString()),
    ]);

    if (limiteDia > 0 && Number(countDia ?? 0) >= limiteDia) {
      return {
        ok: false,
        message:
          "Você não pode entrar na fila deste horário porque já atingiu seu limite diário de reservas.",
      };
    }
    if (limiteSemana > 0 && Number(countSemana ?? 0) >= limiteSemana) {
      return {
        ok: false,
        message:
          "Você não pode entrar na fila deste horário porque já atingiu seu limite semanal de reservas.",
      };
    }

    const prioridade =
      socio?.status === "ativo" &&
      socio.documentos_status === "aprovado" &&
      socio.financeiro_status === "em_dia" &&
      socio.beneficios_liberados
        ? 10
        : 0;

    const { error } = await supabase.from("espaco_waitlist").insert({
      espaco_generico_id: espacoId,
      espaco_unidade_id: intOrNull(formData, "espaco_unidade_id"),
      usuario_id: user.id,
      esporte_id: intOrNull(formData, "esporte_id"),
      inicio,
      fim,
      prioridade,
      status: "ativa",
      origem: "publico",
    });
    if (error) return { ok: false, message: error.message };

    await supabase.rpc("espaco_criar_auditoria", {
      p_espaco_id: espacoId,
      p_entidade_tipo: "espaco_waitlist",
      p_entidade_id: null,
      p_acao: "waitlist_entrada",
      p_payload: { inicio, fim },
      p_autor_usuario_id: user.id,
    });

    revalidatePath("/comunidade");
    return { ok: true, message: "Você entrou na fila de espera desse horário." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao entrar na fila de espera.",
    };
  }
}

export async function transferirReservaEspacoAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const { supabase, user } = await requireUser();
    const reservaId = Number(formData.get("reserva_id") ?? 0);
    const novoUsuarioId = text(formData, "novo_usuario_id");
    if (!reservaId || !novoUsuarioId || novoUsuarioId === user.id) {
      return { ok: false, message: "Informe outro membro para receber a reserva." };
    }

    const { data: reserva, error: reservaErr } = await supabase
      .from("reservas_quadra")
      .select("id, espaco_generico_id, inicio, fim, usuario_solicitante_id, status_reserva")
      .eq("id", reservaId)
      .maybeSingle();
    if (reservaErr) return { ok: false, message: reservaErr.message };
    if (!reserva || String(reserva.usuario_solicitante_id ?? "") !== user.id) {
      return { ok: false, message: "Reserva não encontrada para sua conta." };
    }
    if (["cancelada", "finalizada"].includes(String(reserva.status_reserva ?? ""))) {
      return { ok: false, message: "Essa reserva não pode mais ser transferida." };
    }

    const { data: espaco, error: espacoErr } = await supabase
      .from("espacos_genericos")
      .select("id, slug, configuracao_reservas_json")
      .eq("id", Number(reserva.espaco_generico_id))
      .maybeSingle();
    if (espacoErr) return { ok: false, message: espacoErr.message };
    const cfg = normalizeEspacoReservaConfig(espaco?.configuracao_reservas_json);
    if (!cfg.permiteTransferenciaReserva) {
      return { ok: false, message: "Este espaço não permite transferência de reserva entre membros." };
    }
    const inicioDate = new Date(String(reserva.inicio));
    const horasAntes = (inicioDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (horasAntes < cfg.transferenciaAntecedenciaHoras) {
      return {
        ok: false,
        message: `A transferência precisa ser feita com pelo menos ${cfg.transferenciaAntecedenciaHoras} hora(s) de antecedência.`,
      };
    }

    const { data: socioDestino, error: socioErr } = await supabase
      .from("espaco_socios")
      .select("id, status, documentos_status, financeiro_status, beneficios_liberados")
      .eq("espaco_generico_id", Number(reserva.espaco_generico_id))
      .eq("usuario_id", novoUsuarioId)
      .maybeSingle();
    if (socioErr) return { ok: false, message: socioErr.message };
    if (
      !socioDestino ||
      socioDestino.status !== "ativo" ||
      socioDestino.documentos_status !== "aprovado" ||
      socioDestino.financeiro_status !== "em_dia" ||
      !socioDestino.beneficios_liberados
    ) {
      return { ok: false, message: "A reserva só pode ser transferida para um membro ativo e liberado do espaço." };
    }

    const { error } = await supabase
      .from("reservas_quadra")
      .update({
        usuario_solicitante_id: novoUsuarioId,
        espaco_socio_id: socioDestino.id,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", reservaId)
      .eq("usuario_solicitante_id", user.id);
    if (error) return { ok: false, message: error.message };

    await supabase.rpc("espaco_criar_auditoria", {
      p_espaco_id: Number(reserva.espaco_generico_id),
      p_entidade_tipo: "reserva_quadra",
      p_entidade_id: reservaId,
      p_acao: "reserva_transferida",
      p_payload: { de: user.id, para: novoUsuarioId },
      p_autor_usuario_id: user.id,
    });

    revalidatePath(`/espaco/${espaco?.slug ?? ""}`);
    revalidatePath("/agenda");
    return { ok: true, message: "Reserva transferida para o membro selecionado." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao transferir reserva.",
    };
  }
}

export async function adicionarEspacoReservaRapidaAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const { supabase, user } = await requireUser();
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    if (!Number.isFinite(espacoId) || espacoId < 1) {
      return { ok: false, message: "Espaço inválido." };
    }

    const { data: espaco, error: espacoErr } = await supabase
      .from("espacos_genericos")
      .select("id, slug, modo_reserva, ativo_listagem")
      .eq("id", espacoId)
      .maybeSingle();
    if (espacoErr || !espaco) {
      return { ok: false, message: espacoErr?.message ?? "Espaço não encontrado." };
    }
    const tipoOperacao = resolverTipoOperacaoEspaco({
      modoReserva: espaco.modo_reserva,
      modoMonetizacao: (espaco as { modo_monetizacao?: string | null }).modo_monetizacao ?? null,
    });
    if (!espaco.ativo_listagem || tipoOperacao !== "reserva_paga") {
      return {
        ok: false,
        message: "Somente espaços públicos em modo pago podem ser adicionados ao botão Reservar.",
      };
    }

    const { error: upsertErr } = await supabase.from("espaco_reserva_atalhos").upsert(
      {
        usuario_id: user.id,
        espaco_generico_id: espacoId,
      },
      { onConflict: "usuario_id,espaco_generico_id" }
    );
    if (upsertErr) {
      return { ok: false, message: upsertErr.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/reservar");
    revalidatePath(`/reservar/${espaco.slug ?? ""}`);
    revalidatePath(`/espaco/${espaco.slug ?? ""}`);
    return { ok: true, message: "Espaço adicionado ao seu atalho de reserva rápida." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível adicionar o espaço agora.",
    };
  }
}

export async function adicionarVisitanteReservaEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const reservaId = Number(formData.get("reserva_id") ?? 0);
  const username = text(formData, "visitante_username").replace(/^@/, "");
  if (!espacoId || !reservaId || !username) throw new Error("Dados inválidos para adicionar visitante.");
  const { supabase, user } = await requireEspacoManager(espacoId);

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (profileErr) throw new Error(profileErr.message);
  if (!profile?.id) throw new Error("Usuário visitante não encontrado.");

  const { data: existente, error: existenteErr } = await supabase
    .from("espaco_reserva_participantes")
    .select("id")
    .eq("reserva_quadra_id", reservaId)
    .eq("usuario_id", profile.id)
    .maybeSingle();
  if (existenteErr) throw new Error(existenteErr.message);
  if (existente) throw new Error("Esse usuário já está vinculado nesta reserva.");

  const { error } = await supabase.from("espaco_reserva_participantes").insert({
    reserva_quadra_id: reservaId,
    usuario_id: profile.id,
    papel: "visitante",
    status: "confirmado",
  });
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "reserva_quadra",
    p_entidade_id: reservaId,
    p_acao: "visitante_adicionado",
    p_payload: { visitante_usuario_id: profile.id, visitante_username: username },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/agenda");
}

export async function denunciarNoShowReservaEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const reservaId = Number(formData.get("reserva_id") ?? 0);
  const alvoUsuarioId = text(formData, "alvo_usuario_id");
  const detalhe = text(formData, "detalhe");
  if (!espacoId || !reservaId || !alvoUsuarioId) throw new Error("Dados inválidos da denúncia.");
  const { supabase, user } = await requireEspacoManager(espacoId);
  if (alvoUsuarioId === user.id) throw new Error("Não é possível denunciar seu próprio usuário.");

  const { error } = await supabase.rpc("registrar_denuncia_usuario", {
    p_alvo_usuario_id: alvoUsuarioId,
    p_codigo_motivo: "outro",
    p_texto: `No-show em reserva #${reservaId}. ${detalhe || "Membro não compareceu ao horário reservado."}`,
  });
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "reserva_quadra",
    p_entidade_id: reservaId,
    p_acao: "denuncia_no_show",
    p_payload: { alvo_usuario_id: alvoUsuarioId, detalhe: detalhe || null },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/agenda");
}

export async function salvarPunicaoMembroEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const punicaoId = Number(formData.get("punicao_id") ?? 0) || null;
  const alvoUsuarioId = text(formData, "alvo_usuario_id");
  const motivo = text(formData, "motivo") || null;
  const periodo = text(formData, "periodo");
  const denunciaId = Number(formData.get("denuncia_id") ?? 0) || null;
  if (!espacoId || !alvoUsuarioId) throw new Error("Dados inválidos da punição.");
  const { supabase, user } = await requireEspacoManager(espacoId);
  if (alvoUsuarioId === user.id) throw new Error("Você não pode punir seu próprio usuário.");

  const now = new Date();
  const inicio = now.toISOString();
  const fim =
    periodo === "1_semana"
      ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : periodo === "1_mes"
        ? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString()
        : null;

  if (punicaoId) {
    const { error } = await supabase
      .from("espaco_punicoes_membro")
      .update({
        usuario_id: alvoUsuarioId,
        motivo,
        fim_em: fim,
        denuncia_id: denunciaId,
        atualizado_por_usuario_id: user.id,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", punicaoId)
      .eq("espaco_generico_id", espacoId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("espaco_punicoes_membro").insert({
      espaco_generico_id: espacoId,
      usuario_id: alvoUsuarioId,
      denuncia_id: denunciaId,
      tipo_punicao: "suspensao_marcacao",
      status: "ativa",
      motivo,
      inicio_em: inicio,
      fim_em: fim,
      criado_por_usuario_id: user.id,
      atualizado_por_usuario_id: user.id,
    });
    if (error) throw new Error(error.message);
  }

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_punicoes_membro",
    p_entidade_id: punicaoId,
    p_acao: punicaoId ? "punicao_editada" : "punicao_criada",
    p_motivo: motivo,
    p_payload: { alvo_usuario_id: alvoUsuarioId, periodo, denuncia_id: denunciaId },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/agenda");
}

export async function alterarStatusPunicaoMembroEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const punicaoId = Number(formData.get("punicao_id") ?? 0);
  const status = text(formData, "status");
  if (!espacoId || !punicaoId || !["ativa", "suspensa", "encerrada"].includes(status)) {
    throw new Error("Dados inválidos para atualização de punição.");
  }
  const { supabase, user } = await requireEspacoManager(espacoId);
  const { error } = await supabase
    .from("espaco_punicoes_membro")
    .update({
      status,
      atualizado_por_usuario_id: user.id,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", punicaoId)
    .eq("espaco_generico_id", espacoId);
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_punicoes_membro",
    p_entidade_id: punicaoId,
    p_acao: "punicao_status_alterado",
    p_payload: { status },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/agenda");
}

export async function gerarCobrancaSocioEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const socioId = Number(formData.get("socio_id") ?? 0);
  const { supabase, user } = await requireEspacoManager(espacoId);
  const admin = createServiceRoleClient();

  const { data: socio, error: socioErr } = await admin
    .from("espaco_socios")
    .select(
      "id, usuario_id, plano_socio_id, espaco_planos_socio(mensalidade_centavos, nome)"
    )
    .eq("id", socioId)
    .eq("espaco_generico_id", espacoId)
    .maybeSingle();
  if (socioErr || !socio) throw new Error(socioErr?.message ?? "Sócio não encontrado.");

  const plano = Array.isArray(socio.espaco_planos_socio)
    ? socio.espaco_planos_socio[0]
    : socio.espaco_planos_socio;
  const valorCentavos = Number(plano?.mensalidade_centavos ?? 0);
  if (valorCentavos <= 0) throw new Error("Esse plano não possui mensalidade.");

  const customerId = await ensureProfileAsaasCustomer(socio.usuario_id);
  const { data: cfg } = await admin
    .from("ei_financeiro_config")
    .select(
      "asaas_taxa_percentual, espaco_taxa_fixa, espaco_taxa_fixa_promo, espaco_plataforma_sobre_taxa_gateway, espaco_plataforma_sobre_taxa_gateway_promo, espaco_promocao_ativa, espaco_promocao_ate, espaco_socio_comissao_percentual"
    )
    .eq("id", 1)
    .maybeSingle();
  const calculo = calcularFinanceiroEspaco({
    valorCentavos,
    config: cfg,
    comissaoPercentualPlataforma: Number(
      (cfg as Record<string, unknown> | null)?.espaco_socio_comissao_percentual ?? 0
    ),
  });
  const walletRecebedor = await buscarWalletRecebedorEspaco(admin, espacoId);
  const split = asaasSplitDoEspaco(walletRecebedor, calculo.liquidoEspacoCentavos);
  if (!split) {
    throw new Error("Configure a conta Asaas de recebimentos do espaço antes de gerar mensalidades pagas.");
  }
  const payment = await createAsaasPayment({
    customer: customerId,
    billingType: "PIX",
    value: calculo.brutoCentavos / 100,
    dueDate: new Date().toISOString().slice(0, 10),
    description: `Mensalidade de sócio · ${plano?.nome ?? "Espaço"}`,
    externalReference: `espaco_socio:${socioId}:${Date.now()}`,
    split,
  });

  await admin.from("espaco_transacoes").insert({
    espaco_generico_id: espacoId,
    usuario_id: socio.usuario_id,
    espaco_socio_id: socioId,
    tipo: "mensalidade_socio",
    billing_type: "PIX",
    asaas_billing_type: "PIX",
    status: "pending",
    valor_bruto_centavos: calculo.brutoCentavos,
    taxa_gateway_centavos: calculo.taxaGatewayCentavos,
    comissao_plataforma_centavos: calculo.comissaoPlataformaCentavos,
    valor_liquido_espaco_centavos: calculo.liquidoEspacoCentavos,
    asaas_customer_id: customerId,
    asaas_payment_id: payment.id,
    asaas_charge_url: payment.invoiceUrl ?? payment.bankSlipUrl ?? null,
    external_reference: `espaco_socio:${socioId}:${Date.now()}`,
    vencimento_em: new Date().toISOString().slice(0, 10),
  });

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_socio",
    p_entidade_id: socioId,
    p_acao: "cobranca_mensalidade_gerada",
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/financeiro");
  revalidatePath("/espaco/socios");
}

/** Ativa recorrência em cartão no Asaas com 1º mês grátis e cobrança a partir do mês seguinte. */
export async function gerarCobrancaMensalidadePlataformaEspacoAction(
  _prev: { ok: boolean; message: string } | null,
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  if (!Number.isFinite(espacoId) || espacoId < 1) {
    return { ok: false, message: "Espaço inválido." };
  }
  let slug: string | null = null;
  try {
    const { supabase, user, espaco } = await requireEspacoManager(espacoId);
    slug = espaco.slug ?? null;
    const admin = createServiceRoleClient();

    const { data: assin, error: aErr } = await admin
      .from("espaco_assinaturas_plataforma")
      .select(
        "id, valor_mensal_centavos, plano_nome, status, trial_inicio, cancelamento_bloqueado_ate, asaas_subscription_id, trial_dias_override, isento_total"
      )
      .eq("espaco_generico_id", espacoId)
      .maybeSingle();
    if (aErr) return { ok: false, message: aErr.message };
    if (!assin || (assin.valor_mensal_centavos ?? 0) < 1) {
      return { ok: false, message: "Assinatura da plataforma não encontrada ou valor zerado." };
    }
    if (assin.isento_total) {
      return {
        ok: true,
        message: "Este espaço está marcado como isento total de cobrança pelo admin.",
      };
    }
    if (assin.asaas_subscription_id) {
      return {
        ok: true,
        message:
          "A recorrência em cartão já está ativa. O mês grátis está correndo e a cobrança começa no mês seguinte.",
      };
    }

    const customerId = await ensureProfileAsaasCustomer(user.id);
    const hoje = new Date();
    const { data: eiCfg } = await admin
      .from("ei_financeiro_config")
      .select("espaco_trial_dias_default")
      .eq("id", 1)
      .maybeSingle();
    const trialDias = Math.max(
      0,
      Math.min(
        90,
        Number(assin.trial_dias_override ?? (eiCfg as { espaco_trial_dias_default?: number } | null)?.espaco_trial_dias_default ?? 30) || 30
      )
    );
    const trialFim = new Date(hoje.getTime() + trialDias * 24 * 60 * 60 * 1000);
    const primeiraCobranca = trialFim.toISOString().slice(0, 10);
    const subscriptionPayload: Record<string, unknown> = {
      customer: customerId,
      billingType: "CREDIT_CARD",
      value: (Number(assin.valor_mensal_centavos ?? 0) || 0) / 100,
      nextDueDate: primeiraCobranca,
      cycle: "MONTHLY",
      description: `Mensalidade PaaS EsporteID — ${String(espaco.nome_publico ?? "Espaço")} · ${String(assin.plano_nome ?? "Plano")}`,
      externalReference: `espaco_paaS_assinatura:${assin.id}:${Date.now()}`,
    };

    const simulationEnabled = await isAsaasSimulationEnabledFor("locais");
    let subscription: { id: string; nextDueDate?: string | null; status?: string } | null = null;
    if (simulationEnabled) {
      subscription = { id: `sim_locais_${assin.id}_${Date.now()}`, nextDueDate: primeiraCobranca, status: "ACTIVE" };
    } else {
      const card = readAsaasCardForm(formData, user.email);
      subscription = await createAsaasSubscription({
        ...subscriptionPayload,
        creditCard: {
          holderName: card.holderName,
          number: card.cardNumber,
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          ccv: card.ccv,
        },
        creditCardHolderInfo: {
          name: card.holderName,
          email: card.email,
          cpfCnpj: card.cpfCnpj,
          postalCode: card.postalCode,
          addressNumber: card.addressNumber,
          phone: card.phone,
        },
      });
    }

    const bloqueioCancelamentoAte = new Date(hoje.getFullYear(), hoje.getMonth() + 3, hoje.getDate())
      .toISOString()
      .slice(0, 10);
    await admin
      .from("espaco_assinaturas_plataforma")
      .update({
        status: "trial",
        trial_inicio: assin.trial_inicio ?? hoje.toISOString().slice(0, 10),
        trial_ate: trialFim.toISOString().slice(0, 10),
        proxima_cobranca: primeiraCobranca,
        asaas_subscription_id: subscription.id,
        asaas_customer_id: customerId,
        recorrencia_cartao_confirmada_em: new Date().toISOString(),
        cancelamento_bloqueado_ate: bloqueioCancelamentoAte,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", assin.id);

    await supabase.rpc("espaco_criar_auditoria", {
      p_espaco_id: espacoId,
      p_entidade_tipo: "espaco_assinaturas_plataforma",
      p_entidade_id: assin.id,
      p_acao: "recorrencia_cartao_ativada",
      p_autor_usuario_id: user.id,
    });

    revalidatePath("/espaco/financeiro");
    revalidatePath("/espaco");
    revalidatePath(`/espaco/${slug ?? ""}`);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `${error.message} Para ativar o mês grátis, confirme um cartão válido no Asaas.`
          : "Falha ao ativar recorrência.",
    };
  }
  return {
    ok: true,
    message:
      "Recorrência ativada com cartão. Seu primeiro mês está gratuito e a primeira cobrança será no mês seguinte.",
  };
}

export async function solicitarCancelamentoAssinaturaPlataformaEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  if (!Number.isFinite(espacoId) || espacoId < 1) {
    throw new Error("Espaço inválido.");
  }
  const { supabase, user } = await requireEspacoManager(espacoId);
  const admin = createServiceRoleClient();
  const { data: assin, error } = await admin
    .from("espaco_assinaturas_plataforma")
    .select("id, asaas_subscription_id, cancelamento_bloqueado_ate")
    .eq("espaco_generico_id", espacoId)
    .maybeSingle();
  if (error || !assin) throw new Error(error?.message ?? "Assinatura não encontrada.");
  const bloqueadoAte = assin.cancelamento_bloqueado_ate ? new Date(`${assin.cancelamento_bloqueado_ate}T12:00:00`) : null;
  if (bloqueadoAte && bloqueadoAte.getTime() > Date.now()) {
    throw new Error(
      `O cancelamento só pode ser solicitado após ${bloqueadoAte.toLocaleDateString("pt-BR")} (permanência mínima de 3 meses).`
    );
  }
  if (assin.asaas_subscription_id) {
    await cancelAsaasSubscription(String(assin.asaas_subscription_id));
  }
  await admin
    .from("espaco_assinaturas_plataforma")
    .update({
      status: "cancelled",
      cancelamento_solicitado_em: new Date().toISOString(),
      cancelamento_efetivo_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", assin.id);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_assinaturas_plataforma",
    p_entidade_id: assin.id,
    p_acao: "assinatura_cancelada",
    p_autor_usuario_id: user.id,
  });
  revalidatePath("/espaco/financeiro");
}

export async function sincronizarFeriadosEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const ano = Number(formData.get("ano") ?? new Date().getFullYear());
  const { supabase, user } = await requireEspacoManager(espacoId);
  const { data: espaco, error: espacoErr } = await supabase
    .from("espacos_genericos")
    .select("id, uf, codigo_ibge")
    .eq("id", espacoId)
    .maybeSingle();
  if (espacoErr || !espaco) throw new Error(espacoErr?.message ?? "Espaço não encontrado.");

  const payload = await fetchAutomaticHolidaysForYear({
    year: ano,
    uf: espaco.uf ?? null,
    codigoIbge: espaco.codigo_ibge ?? null,
  });
  const { error } = await supabase.from("espaco_feriados_cache").upsert(
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
  if (error) throw new Error(error.message);

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_feriado_cache",
    p_entidade_id: null,
    p_acao: "feriados_sincronizados",
    p_payload: { ano, total: payload.length },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/agenda");
}

export async function atualizarOperacaoFeriadoEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const feriadoId = Number(formData.get("feriado_id") ?? 0);
  const operarNoFeriado = text(formData, "operar_no_feriado") === "sim";
  const sobreporGrade = text(formData, "sobrepor_grade") !== "nao";
  if (!espacoId || !feriadoId) throw new Error("Identificador inválido.");
  const { supabase, user } = await requireEspacoManager(espacoId);

  const { data: row, error: rowErr } = await supabase
    .from("espaco_feriados_personalizados")
    .update({
      operar_no_feriado: operarNoFeriado,
      sobrepor_grade: sobreporGrade,
    })
    .eq("id", feriadoId)
    .eq("espaco_generico_id", espacoId)
    .select("id, nome, data_inicio, data_fim, operar_no_feriado, sobrepor_grade")
    .single();
  if (rowErr || !row) throw new Error(rowErr?.message ?? "Feriado não encontrado.");

  await applyFeriadoSobreposicaoByRows(supabase, espacoId, user.id, [row as FeriadoOperacaoRow]);
  await notifyEspacoSociosAboutFeriado(
    supabase,
    espacoId,
    user.id,
    `Atualização de feriado: ${row.nome ?? "data especial"} foi definido como ${operarNoFeriado ? "aberto" : "fechado"}.`
  );

  await supabase.rpc("espaco_criar_auditoria", {
    p_espaco_id: espacoId,
    p_entidade_tipo: "espaco_feriado_personalizado",
    p_entidade_id: feriadoId,
    p_acao: "feriado_operacao_atualizada",
    p_payload: { operarNoFeriado, sobreporGrade },
    p_autor_usuario_id: user.id,
  });

  revalidatePath("/espaco/agenda");
}

/**
 * Dados básicos para o cadastro Asaas (recebimento) — a subconta/API
 * no servidor segue a configuração global; aqui o dono guarda CPF/CNPJ e acessa o Asaas.
 */
export async function salvarDadosContaAsaasParceiroAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    if (!Number.isFinite(espacoId) || espacoId < 1) {
      return { ok: false, message: "Espaço inválido." };
    }
    const { user } = await requireEspacoManager(espacoId);
    const modoIntegracao = text(formData, "modo_integracao") === "conta_existente"
      ? "conta_existente"
      : "criar_nova";
    const nomeRazao = text(formData, "nome_razao_social");
    const cpfCnpj = text(formData, "cpf_cnpj").replace(/\D/g, "");
    const email = text(formData, "email");
    if (modoIntegracao === "criar_nova" && nomeRazao.length < 3) {
      return { ok: false, message: "Informe a razão social (ou seu nome) como constará no Asaas." };
    }
    if (cpfCnpj.length < 11) {
      return { ok: false, message: "CPF/CNPJ inválido (apenas números)." };
    }
    if (!email.includes("@")) {
      return { ok: false, message: "Informe o e-mail que usará no Asaas." };
    }
    const walletIdInformado = text(formData, "wallet_id");
    if (modoIntegracao === "conta_existente" && !walletIdInformado) {
      return {
        ok: false,
        message: "Informe o Wallet ID da conta Asaas para direcionar os recebimentos.",
      };
    }
    const cadastroAsaas =
      modoIntegracao === "criar_nova"
        ? {
            name: nomeRazao,
            email,
            cpfCnpj,
            birthDate: text(formData, "asaas_birth_date"),
            companyType: text(formData, "asaas_company_type"),
            mobilePhone: text(formData, "asaas_mobile_phone").replace(/\D/g, ""),
            address: text(formData, "asaas_address"),
            addressNumber: text(formData, "asaas_address_number"),
            complement: text(formData, "asaas_complement"),
            province: text(formData, "asaas_province"),
            postalCode: text(formData, "asaas_postal_code").replace(/\D/g, ""),
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
        return { ok: false, message: "Preencha os dados obrigatórios para criar a conta Asaas." };
      }
    }
    const admin = createServiceRoleClient();
    const { data: contaAtual } = await admin
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
      origem: "painel_integracao_asaas",
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
    const { error } = await admin.from("parceiro_conta_asaas").upsert(
      {
        usuario_id: user.id,
        nome_razao_social: nomeRazao || email,
        cpf_cnpj: cpfCnpj,
        email,
        dados_bancarios_json: dadosBancariosJson,
        asaas_account_id: asaasAccountId,
        wallet_id: walletId,
        api_key_subconta: apiKeySubconta,
        onboarding_status: onboardingStatus,
        atualizado_em: new Date().toISOString(),
      } as Record<string, unknown>,
      { onConflict: "usuario_id" }
    );
    if (error) {
      return { ok: false, message: error.message };
    }
    revalidatePath("/espaco/integracao-asaas");
    revalidatePath("/espaco");
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
    return { ok: false, message: e instanceof Error ? e.message : "Falha ao salvar." };
  }
}

export async function salvarConfiguracaoFiscalEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const { user } = await requireEspacoManager(espacoId);
  const admin = createServiceRoleClient();
  const documento = fiscalDocumentoDigits(formData.get("documento"));
  const nome = text(formData, "nome_razao_social");
  if (!nome || !documento) throw new Error("Informe razão social e CPF/CNPJ do emitente.");
  const payload = {
    escopo: "espaco",
    espaco_generico_id: espacoId,
    nome_razao_social: nome,
    documento,
    inscricao_municipal: text(formData, "inscricao_municipal") || null,
    municipio: text(formData, "municipio") || null,
    uf: text(formData, "uf").toUpperCase() || null,
    regime_tributario: text(formData, "regime_tributario") || null,
    cnae: fiscalDocumentoDigits(formData.get("cnae")) || null,
    codigo_servico: text(formData, "codigo_servico") || null,
    item_lista_servico: text(formData, "item_lista_servico") || null,
    aliquota_iss: numberInputOrNull(formData, "aliquota_iss"),
      provedor: text(formData, "provedor") || "manual",
      ambiente: text(formData, "ambiente") === "homologacao" ? "homologacao" : "producao",
      status: "pronto",
      config_json: {
        atualizado_por: user.id,
        observacoes: text(formData, "observacoes"),
        nfeio_company_id: text(formData, "nfeio_company_id"),
        auto_emitir_nfse: checkbox(formData, "auto_emitir_nfse"),
      },
      atualizado_em: new Date().toISOString(),
  };
  const { data: atual } = await admin
    .from("fiscal_emitentes")
    .select("id")
    .eq("escopo", "espaco")
    .eq("espaco_generico_id", espacoId)
    .maybeSingle();
  const { error } = atual
    ? await admin.from("fiscal_emitentes").update(payload).eq("id", atual.id)
    : await admin.from("fiscal_emitentes").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/espaco/notas-fiscais");
}

export async function solicitarNotaFiscalEspacoClienteAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const transacaoId = Number(formData.get("transacao_id") ?? 0);
  const { user } = await requireEspacoManager(espacoId);
  const admin = createServiceRoleClient();
  const [{ data: emitente }, { data: transacao }, { data: existente }] = await Promise.all([
    admin
      .from("fiscal_emitentes")
      .select("id, status")
      .eq("escopo", "espaco")
      .eq("espaco_generico_id", espacoId)
      .maybeSingle(),
    admin
      .from("espaco_transacoes")
      .select("id, usuario_id, tipo, status, valor_bruto_centavos, valor_liquido_espaco_centavos, espaco_generico_id")
      .eq("id", transacaoId)
      .eq("espaco_generico_id", espacoId)
      .maybeSingle(),
    admin
      .from("fiscal_notas")
      .select("id")
      .eq("escopo", "espaco_cliente")
      .eq("transacao_id", transacaoId)
      .maybeSingle(),
  ]);
  if (!emitente || emitente.status !== "pronto") throw new Error("Configure os dados fiscais do espaço antes de solicitar nota.");
  if (!transacao || transacao.status !== "received") throw new Error("A nota só pode ser solicitada para transação recebida.");
  if (existente) throw new Error("Essa transação já possui solicitação de nota.");
  const tomadorNome = text(formData, "tomador_nome");
  const tomadorDocumento = fiscalDocumentoDigits(formData.get("tomador_documento"));
  const tomadorEmail = text(formData, "tomador_email");
  if (!tomadorNome || !tomadorDocumento) throw new Error("Informe nome e CPF/CNPJ do tomador.");
  const { data: notaCriada, error } = await admin.from("fiscal_notas").insert({
    escopo: "espaco_cliente",
    espaco_generico_id: espacoId,
    emitente_id: emitente.id,
    transacao_id: transacao.id,
    tomador_usuario_id: transacao.usuario_id,
    tomador_nome: tomadorNome,
    tomador_documento: tomadorDocumento,
    tomador_email: tomadorEmail || null,
    descricao: text(formData, "descricao") || `Serviço ${transacao.tipo}`,
    valor_servico_centavos: Number(transacao.valor_bruto_centavos ?? 0),
    status: "solicitada",
    solicitada_por_usuario_id: user.id,
    detalhes_json: { origem: "painel_espaco" },
  }).select("id").single();
  if (error) throw new Error(error.message);
  if (notaCriada?.id) await emitirNotaFiscalNfeioSeConfigurada(admin, Number(notaCriada.id));
  revalidatePath("/espaco/notas-fiscais");
}

export async function atualizarConfiguracaoMembrosAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const { supabase } = await requireEspacoManager(espacoId);
  const modo = String(formData.get("entrada_membro_modo") ?? "");
  if (modo !== "automatica" && modo !== "manual") throw new Error("Modo inválido.");
  const descricao = String(formData.get("entrada_membro_descricao") ?? "").trim() || null;
  const { error } = await supabase
    .from("espacos_genericos")
    .update({ entrada_membro_modo: modo, entrada_membro_descricao: descricao })
    .eq("id", espacoId);
  if (error) throw new Error(error.message);
  revalidatePath("/espaco/configuracao");
  revalidatePath(`/espaco`);
}

export async function atualizarFormasPagamentoAction(formData: FormData): Promise<void> {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const { supabase, espaco } = await requireEspacoManager(espacoId);

  const formas: string[] = [];
  if (checkbox(formData, "forma_pix")) formas.push("pix");
  if (checkbox(formData, "forma_cartao")) formas.push("cartao");
  if (checkbox(formData, "forma_boleto")) formas.push("boleto");

  if (formas.length === 0) throw new Error("Selecione ao menos uma forma de pagamento.");

  const { error } = await supabase
    .from("espacos_genericos")
    .update({ formas_pagamento_aceitas: formas })
    .eq("id", espacoId);

  if (error) throw new Error(error.message);
  revalidatePath("/espaco/configuracao");
  if (espaco.slug) revalidatePath(`/espaco/${espaco.slug}`);
}

export async function escolherModoReservaEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const { supabase } = await requireEspacoManager(espacoId);
  const modo = String(formData.get("modo") ?? "");
  if (modo !== "paga" && modo !== "gratuita") throw new Error("Modo inválido.");
  const { error } = await supabase
    .from("espacos_genericos")
    .update({ modo_reserva: modo })
    .eq("id", espacoId);
  if (error) throw new Error(error.message);
  revalidatePath("/espaco");
  redirect("/espaco");
}

export async function reservarQuadraParaPartidaAction(
  _prev: State | undefined,
  formData: FormData
): Promise<State> {
  try {
    const { supabase, user } = await requireUser();
    const admin = createServiceRoleClient();
    const partidaId = Number(formData.get("partida_id") ?? 0);
    const espacoId = Number(formData.get("espaco_id") ?? 0);
    const unidadeId = intOrNull(formData, "espaco_unidade_id");
    const inicio = text(formData, "inicio");
    const fim = text(formData, "fim");
    if (!partidaId || !espacoId || !inicio || !fim) {
      return { ok: false, message: "Dados incompletos para a reserva." };
    }
    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);
    if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(fimDate.getTime()) || fimDate <= inicioDate) {
      return { ok: false, message: "Intervalo inválido para a reserva." };
    }
    const { data: partida } = await supabase
      .from("partidas")
      .select("id, jogador1_id, jogador2_id, desafiante_id, desafiado_id, status")
      .eq("id", partidaId)
      .maybeSingle();
    if (!partida) return { ok: false, message: "Partida não encontrada." };
    const isParticipant = [
      (partida as Record<string, unknown>).jogador1_id,
      (partida as Record<string, unknown>).jogador2_id,
      (partida as Record<string, unknown>).desafiante_id,
      (partida as Record<string, unknown>).desafiado_id,
    ]
      .filter(Boolean)
      .some((id) => String(id) === user.id);
    if (!isParticipant) {
      return { ok: false, message: "Você não é participante desta partida." };
    }
    const { data: socio } = await supabase
      .from("espaco_socios")
      .select("id, status")
      .eq("espaco_generico_id", espacoId)
      .eq("usuario_id", user.id)
      .eq("status", "ativo")
      .maybeSingle();
    if (!socio) {
      return { ok: false, message: "Você precisa ser membro ativo deste espaço para reservar como rank." };
    }
    const { data: reservaExistente } = await supabase
      .from("reservas_quadra")
      .select("id")
      .eq("partida_id", partidaId)
      .neq("status_reserva", "cancelada")
      .maybeSingle();
    if (reservaExistente) {
      return { ok: false, message: "Esta partida já tem uma quadra reservada." };
    }
    const conflictQuery = supabase
      .from("reservas_quadra")
      .select("id")
      .eq("espaco_generico_id", espacoId)
      .neq("status_reserva", "cancelada")
      .lt("inicio", fim)
      .gt("fim", inicio);
    if (unidadeId) {
      conflictQuery.eq("espaco_unidade_id", unidadeId);
    }
    const { data: conflitos } = await conflictQuery;
    if ((conflitos ?? []).length > 0) {
      return { ok: false, message: "Já existe uma reserva para este horário na quadra selecionada." };
    }
    const { data: reserva, error } = await admin
      .from("reservas_quadra")
      .insert({
        espaco_generico_id: espacoId,
        espaco_unidade_id: unidadeId,
        usuario_solicitante_id: user.id,
        valor_total: 0,
        payment_status: "isento",
        status_reserva: "confirmada",
        taxa_gateway: 0,
        comissao_plataforma: 0,
        valor_liquido_local: 0,
        inicio,
        fim,
        tipo_reserva: "rank",
        origem_reserva: "socio",
        partida_id: partidaId,
        reserva_gratuita: true,
        espaco_socio_id: socio.id,
        detalhes_json: { contexto: "rank", pagamento: "isento", jogo_vinculado_id: partidaId },
        atualizado_por: user.id,
      })
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };
    await admin.from("espaco_reserva_participantes").insert({
      reserva_quadra_id: reserva.id,
      usuario_id: user.id,
      papel: "titular",
      status: "confirmado",
    });
    revalidatePath(`/confrontos/${partidaId}`);
    return { ok: true, message: "Quadra reservada com sucesso para a partida de rank!" };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Falha ao reservar quadra." };
  }
}
