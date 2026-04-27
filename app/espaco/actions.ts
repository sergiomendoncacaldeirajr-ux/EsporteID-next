"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cancelAsaasSubscription,
  createAsaasCustomer,
  createAsaasPayment,
  createAsaasSubscription,
} from "@/lib/asaas/client";
import { slugifyEspaco } from "@/lib/espacos/slug";
import { normalizeEspacoAssociacaoConfig } from "@/lib/espacos/associacao-config";
import { normalizeEspacoReservaConfig, serializarEspacoReservaConfig } from "@/lib/espacos/config";
import { getPaaSUnidadeGateInfo } from "@/lib/espacos/paas-unidades-gate";
import { forcarReservasGratisLiberadasFalsas, podeCriarAgendaEUnidades } from "@/lib/espacos/operacao-gate";
import { avaliarBeneficiosSocioEspaco } from "@/lib/espacos/eligibility";
import {
  calcularFinanceiroEspaco,
} from "@/lib/espacos/financeiro";
import {
  checkEspacoConflict,
  fetchAutomaticHolidaysForYear,
  isDentroDaGradeSemanal,
  isHolidayDate,
} from "@/lib/espacos/calendar";
import { triggerPushForNotificationIdsBestEffort } from "@/lib/pwa/push-trigger";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

type State = { ok: true; message: string } | { ok: false; message: string };

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

function intOrNull(formData: FormData, field: string) {
  const value = Number(formData.get(field) ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function checkbox(formData: FormData, field: string) {
  return formData.get(field) === "on";
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
    const uf = text(formData, "uf").toUpperCase();
    const localizacao = text(formData, "localizacao");
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
      .select("modo_reserva")
      .eq("id", espacoId)
      .maybeSingle();
    const modoR = (espacoModo as { modo_reserva?: string } | null)?.modo_reserva;
    const reservasGratisLiberadas = forcarReservasGratisLiberadasFalsas(
      modoR ?? null,
      checkbox(formData, "reservas_gratis_liberadas")
    );
    const configuracaoReservas = serializarEspacoReservaConfig({
      limiteReservasDia: Number(formData.get("limite_reservas_dia") ?? 1),
      limiteReservasSemana: Number(formData.get("limite_reservas_semana") ?? 3),
      cooldownHoras: Number(formData.get("cooldown_horas") ?? 2),
      antecedenciaMinHoras: Number(formData.get("antecedencia_min_horas") ?? 1),
      antecedenciaMaxDias: Number(formData.get("antecedencia_max_dias") ?? 30),
      gratisLimiteReservasDiaMembro: Number(
        formData.get("gratis_limite_reservas_dia_membro") ??
          formData.get("limite_reservas_dia") ??
          1
      ),
      gratisLimiteReservasSemanaMembro: Number(
        formData.get("gratis_limite_reservas_semana_membro") ??
          formData.get("limite_reservas_semana") ??
          3
      ),
      gratisIntervaloHorasEntreReservasMembro: Number(
        formData.get("gratis_intervalo_horas_entre_reservas_membro") ??
          formData.get("cooldown_horas") ??
          2
      ),
      gratisAntecedenciaMaxDiasMembro: Number(
        formData.get("gratis_antecedencia_max_dias_membro") ??
          formData.get("antecedencia_max_dias") ??
          30
      ),
      waitlistExpiracaoMinutos: Number(
        formData.get("waitlist_expiracao_minutos") ?? 60
      ),
      bloqueiaInadimplente: checkbox(formData, "bloqueia_inadimplente"),
      reservasGratisLiberadas,
      politicaCancelamento: text(formData, "politica_cancelamento"),
      observacoesPublicas: text(formData, "observacoes_publicas"),
    });

    if (nomePublico.length < 3) {
      return { ok: false, message: "Informe um nome público válido." };
    }
    if (cidade.length < 2 || uf.length < 2) {
      return { ok: false, message: "Cidade e UF são obrigatórios." };
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
        localizacao,
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
    coberta: checkbox(formData, "coberta"),
    indoor: checkbox(formData, "indoor"),
    iluminacao: checkbox(formData, "iluminacao"),
    capacidade: Math.max(1, Number(formData.get("capacidade") ?? 2) || 2),
    status_operacao: text(formData, "status_operacao") || "ativa",
    aceita_aulas: checkbox(formData, "aceita_aulas"),
    aceita_torneios: checkbox(formData, "aceita_torneios"),
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
      observacoes: text(formData, "observacoes") || null,
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
      limiteReservasDia: Math.max(0, Number(formData.get("regra_limite_dia") ?? atual.limiteReservasDia) || atual.limiteReservasDia),
      limiteReservasSemana: Math.max(0, Number(formData.get("regra_limite_semana") ?? atual.limiteReservasSemana) || atual.limiteReservasSemana),
      cooldownHoras: Math.max(0, Number(formData.get("regra_cooldown_horas") ?? atual.cooldownHoras) || atual.cooldownHoras),
      antecedenciaMinHoras: Math.max(
        0,
        Number(formData.get("regra_antecedencia_min_horas") ?? atual.antecedenciaMinHoras) || atual.antecedenciaMinHoras
      ),
      antecedenciaMaxDias: Math.max(
        1,
        Number(formData.get("regra_antecedencia_max_dias") ?? atual.antecedenciaMaxDias) || atual.antecedenciaMaxDias
      ),
      reservasGratisLiberadas: checkbox(formData, "regra_reservas_gratis_liberadas"),
      gratisLimiteReservasDiaMembro: Math.max(
        0,
        Number(formData.get("regra_gratis_limite_dia") ?? atual.gratisLimiteReservasDiaMembro) || atual.gratisLimiteReservasDiaMembro
      ),
      gratisLimiteReservasSemanaMembro: Math.max(
        0,
        Number(formData.get("regra_gratis_limite_semana") ?? atual.gratisLimiteReservasSemanaMembro) || atual.gratisLimiteReservasSemanaMembro
      ),
      gratisIntervaloHorasEntreReservasMembro: Math.max(
        0,
        Number(formData.get("regra_gratis_intervalo_horas") ?? atual.gratisIntervaloHorasEntreReservasMembro) ||
          atual.gratisIntervaloHorasEntreReservasMembro
      ),
      gratisAntecedenciaMaxDiasMembro: Math.max(
        1,
        Number(formData.get("regra_gratis_antecedencia_max_dias") ?? atual.gratisAntecedenciaMaxDiasMembro) ||
          atual.gratisAntecedenciaMaxDiasMembro
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
    .select("categoria_mensalidade, modo_monetizacao")
    .eq("id", espacoId)
    .maybeSingle();
  if (egErr || !eg) throw new Error(egErr?.message ?? "Espaço não encontrado.");
  if (String((eg as { modo_monetizacao?: string }).modo_monetizacao) !== "mensalidade_plataforma") {
    throw new Error("Este espaço não está no modo de mensalidade com a plataforma.");
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
  const { data, error } = await supabase
    .from("espaco_planos_socio")
    .insert({
      espaco_generico_id: espacoId,
      nome,
      slug: slugifyEspaco(nome),
      descricao: text(formData, "descricao") || null,
      mensalidade_centavos: Math.max(
        0,
        Math.round(Number(formData.get("mensalidade_centavos") ?? 0) || 0)
      ),
      taxa_adesao_centavos: Math.max(
        0,
        Math.round(Number(formData.get("taxa_adesao_centavos") ?? 0) || 0)
      ),
      limite_reservas_dia: intOrNull(formData, "limite_reservas_dia"),
      limite_reservas_semana: intOrNull(formData, "limite_reservas_semana"),
      cooldown_horas: Math.max(0, Number(formData.get("cooldown_horas") ?? 0) || 0),
      antecedencia_min_horas: Math.max(
        0,
        Number(formData.get("antecedencia_min_horas") ?? 0) || 0
      ),
      antecedencia_max_dias: Math.max(
        1,
        Number(formData.get("antecedencia_max_dias") ?? 30) || 30
      ),
      reservas_gratuitas_semana: Math.max(
        0,
        Number(formData.get("reservas_gratuitas_semana") ?? 0) || 0
      ),
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
        "id, slug, nome_publico, aceita_socios, responsavel_usuario_id, criado_por_usuario_id, associacao_regra_json"
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
    if (docs.some((item) => !(item.file instanceof File) || item.file.size <= 0)) {
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
        },
        status: "pendente",
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
        },
        { onConflict: "espaco_generico_id,usuario_id" }
      )
      .select("id")
      .single();
    if (socioErr) {
      return { ok: false, message: socioErr.message };
    }

    for (const item of docs) {
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
      p_payload: { membershipRequestId: membership.id, planoId },
      p_autor_usuario_id: user.id,
    });

    revalidatePath(`/espaco/${espaco.slug ?? ""}`);
    revalidatePath("/comunidade");
    return {
      ok: true,
      message: "Solicitação enviada. O espaço vai revisar seus documentos.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao solicitar associação.",
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

  await supabase
    .from("membership_requests")
    .update({
      status: decisao === "aprovar" ? "aprovado" : "recusado",
      resolvido_em: new Date().toISOString(),
      resolvido_por_usuario_id: user.id,
    })
    .eq("id", req.id);

  await supabase
    .from("espaco_socios")
    .update({
      status: decisao === "aprovar" ? "ativo" : "rejeitado",
      plano_socio_id: req.plano_socio_id ?? null,
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
    const esporteId = intOrNull(formData, "esporte_id");
    const partidaId = intOrNull(formData, "partida_id");
    const torneioJogoId = intOrNull(formData, "torneio_jogo_id");
    if (!espacoId || !inicio || !fim) {
      return { ok: false, message: "Preencha unidade, início e fim da reserva." };
    }

    const [{ data: espaco }, { data: socio }, { data: plano }, { data: cfg }, { count: reservasSemana }] =
      await Promise.all([
        supabase
          .from("espacos_genericos")
          .select(
            "id, slug, nome_publico, configuracao_reservas_json, uf, codigo_ibge, responsavel_usuario_id, criado_por_usuario_id, modo_reserva, modo_monetizacao, taxa_reserva_plataforma_centavos"
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
            "asaas_taxa_percentual, espaco_taxa_fixa, espaco_taxa_fixa_promo, espaco_plataforma_sobre_taxa_gateway, espaco_plataforma_sobre_taxa_gateway_promo, espaco_promocao_ativa, espaco_promocao_ate"
          )
          .eq("id", 1)
          .maybeSingle(),
        supabase
          .from("reservas_quadra")
          .select("id", { count: "exact", head: true })
          .eq("espaco_generico_id", espacoId)
          .eq("usuario_solicitante_id", user.id)
          .gte(
            "inicio",
            new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
          ),
      ]);

    if (!espaco) return { ok: false, message: "Espaço não encontrado." };
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
        .select("id, hora_inicio, hora_fim, liberar_para_usuario_id")
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
        return dentroFaixa && usuarioPermitido;
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

    const valorCentavos = Math.max(
      0,
      Math.round(Number(formData.get("valor_centavos") ?? 0) || 0)
    );
    const espacoM = espaco as {
      modo_reserva?: string | null;
      modo_monetizacao?: string | null;
      taxa_reserva_plataforma_centavos?: number | null;
    };
    const modoReserva = (espacoM.modo_reserva ?? "mista") as "gratuita" | "paga" | "mista";
    const modoMonet = (espacoM.modo_monetizacao ?? "misto") as
      | "mensalidade_plataforma"
      | "apenas_reservas"
      | "misto";
    const isGratuitoTipo = tipoReserva === "torneio" || tipoReserva === "professor";
    if (modoReserva === "paga" && !isGratuitoTipo && !checkbox(formData, "usar_beneficio_gratis") && valorCentavos < 1) {
      return {
        ok: false,
        message: "Este local está configurado apenas para reservas pagas. Informe o valor (centavos) do horário ou use o benefício de sócio, se aplicável.",
      };
    }
    if (modoReserva === "gratuita" && !isGratuitoTipo && valorCentavos > 0) {
      return {
        ok: false,
        message: "Este local está com reservas gratuitas. O valor do horário deve ser zero (exceto usos de professor/torneio, se o espaço permitir).",
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
    if (antecedenciaHoras > benefit.antecedenciaMaxDias * 24) {
      return {
        ok: false,
        message: `Seu plano permite reservar até ${benefit.antecedenciaMaxDias} dia(s) à frente.`,
      };
    }

    const [reservasExistentes, bloqueios, gradeSemanal, feriadosCustom, reservasDiaUsuario, ultimaReservaUsuario] =
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
          .select("dia_semana, hora_inicio, hora_fim, ativo")
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
    const usarBeneficioGratis =
      checkbox(formData, "usar_beneficio_gratis") &&
      benefit.ok &&
      benefit.reservasGratisSemana > 0;
    if (usarBeneficioGratis) {
      const cfgReservas = normalizeEspacoReservaConfig(
        espaco.configuracao_reservas_json
      );
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

      if (antecedenciaHoras > cfgReservas.gratisAntecedenciaMaxDiasMembro * 24) {
        return {
          ok: false,
          message: `Nas reservas gratuitas, o máximo de antecedência é ${cfgReservas.gratisAntecedenciaMaxDiasMembro} dia(s).`,
        };
      }
    }
    const taxaReservaPlataformaDb = Math.max(0, Math.round(Number(espacoM.taxa_reserva_plataforma_centavos ?? 0)));
    const soMensalidadePaaS = modoMonet === "mensalidade_plataforma";
    const taxaReservaAplicar =
      !usarBeneficioGratis &&
      !soMensalidadePaaS &&
      valorCentavos > 0 &&
      taxaReservaPlataformaDb > 0
        ? taxaReservaPlataformaDb
        : 0;
    if (benefit.limiteReservasSemana > 0 && (reservasSemana ?? 0) >= benefit.limiteReservasSemana) {
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
      valorCentavos: usarBeneficioGratis ? 0 : valorCentavos,
      config: cfg,
      taxaReservaPlataformaCentavos: usarBeneficioGratis ? 0 : taxaReservaAplicar,
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
        reserva_gratuita: usarBeneficioGratis,
        espaco_socio_id: socio?.id ?? null,
        plano_socio_id: socio?.plano_socio_id ?? null,
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

    let checkoutUrl: string | null = null;
    if (calculo.brutoCentavos > 0) {
      const customerId = await ensureProfileAsaasCustomer(user.id);
      const payment = await createAsaasPayment({
        customer: customerId,
        billingType: "PIX",
        value: calculo.brutoCentavos / 100,
        dueDate: new Date().toISOString().slice(0, 10),
        description: `Reserva EsporteID · ${espaco.nome_publico}`,
        externalReference: `espaco_reserva:${reserva.id}`,
      });
      checkoutUrl = payment.invoiceUrl ?? payment.bankSlipUrl ?? null;

      await admin.from("espaco_transacoes").insert({
        espaco_generico_id: espacoId,
        usuario_id: user.id,
        espaco_socio_id: socio?.id ?? null,
        reserva_quadra_id: reserva.id,
        tipo: "reserva_avulsa",
        billing_type: "PIX",
        status: "pending",
        valor_bruto_centavos: calculo.brutoCentavos,
        taxa_gateway_centavos: calculo.taxaGatewayCentavos,
        comissao_plataforma_centavos: calculo.comissaoPlataformaCentavos,
        valor_liquido_espaco_centavos: calculo.liquidoEspacoCentavos,
        asaas_customer_id: customerId,
        asaas_payment_id: payment.id,
        asaas_charge_url: checkoutUrl,
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
    if (checkoutUrl) {
      redirect(checkoutUrl);
    }
    return {
      ok: true,
      message:
        calculo.brutoCentavos > 0
          ? "Reserva registrada, mas o link de pagamento não retornou do Asaas. Abra Financeiro do espaço ou tente de novo."
          : "Reserva criada com benefício de sócio.",
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
        .select("id, configuracao_reservas_json")
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

    const benefit = avaliarBeneficiosSocioEspaco({
      socio,
      plano,
      configuracaoEspaco: espaco.configuracao_reservas_json,
    });
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
    const modoReserva = String(espaco.modo_reserva ?? "").toLowerCase();
    if (!espaco.ativo_listagem || modoReserva !== "paga") {
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
      "asaas_taxa_percentual, espaco_taxa_fixa, espaco_taxa_fixa_promo, espaco_plataforma_sobre_taxa_gateway, espaco_plataforma_sobre_taxa_gateway_promo, espaco_promocao_ativa, espaco_promocao_ate"
    )
    .eq("id", 1)
    .maybeSingle();
  const calculo = calcularFinanceiroEspaco({ valorCentavos, config: cfg });
  const payment = await createAsaasPayment({
    customer: customerId,
    billingType: "PIX",
    value: valorCentavos / 100,
    dueDate: new Date().toISOString().slice(0, 10),
    description: `Mensalidade de sócio · ${plano?.nome ?? "Espaço"}`,
    externalReference: `espaco_socio:${socioId}:${Date.now()}`,
  });

  await admin.from("espaco_transacoes").insert({
    espaco_generico_id: espacoId,
    usuario_id: socio.usuario_id,
    espaco_socio_id: socioId,
    tipo: "mensalidade_socio",
    billing_type: "PIX",
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
    const subscription = await createAsaasSubscription({
      customer: customerId,
      billingType: "CREDIT_CARD",
      value: (Number(assin.valor_mensal_centavos ?? 0) || 0) / 100,
      nextDueDate: primeiraCobranca,
      cycle: "MONTHLY",
      description: `Mensalidade PaaS EsporteID — ${String(espaco.nome_publico ?? "Espaço")} · ${String(assin.plano_nome ?? "Plano")}`,
      externalReference: `espaco_paaS_assinatura:${assin.id}:${Date.now()}`,
    });

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
    const { supabase, user } = await requireEspacoManager(espacoId);
    const nomeRazao = text(formData, "nome_razao_social");
    const cpfCnpj = text(formData, "cpf_cnpj").replace(/\D/g, "");
    const email = text(formData, "email");
    if (nomeRazao.length < 3) {
      return { ok: false, message: "Informe a razão social (ou seu nome) como constará no Asaas." };
    }
    if (cpfCnpj.length < 11) {
      return { ok: false, message: "CPF/CNPJ inválido (apenas números)." };
    }
    if (!email.includes("@")) {
      return { ok: false, message: "Informe o e-mail que usará no Asaas." };
    }
    const admin = createServiceRoleClient();
    const { error } = await admin.from("parceiro_conta_asaas").upsert(
      {
        usuario_id: user.id,
        nome_razao_social: nomeRazao,
        cpf_cnpj: cpfCnpj,
        email,
        onboarding_status: "dados_salvos",
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
        "Dados guardados. Abra a conta no Asaas ou o painel pelos links abaixo. Quando a integração (API/subconta) for necessária, o suporte orienta a chave de ambiente.",
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Falha ao salvar." };
  }
}
