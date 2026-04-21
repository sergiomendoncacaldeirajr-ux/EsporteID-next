"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAsaasCustomer, createAsaasPayment } from "@/lib/asaas/client";
import { slugifyEspaco } from "@/lib/espacos/slug";
import { serializarEspacoReservaConfig } from "@/lib/espacos/config";
import { avaliarBeneficiosSocioEspaco } from "@/lib/espacos/eligibility";
import { calcularFinanceiroEspaco } from "@/lib/espacos/financeiro";
import {
  checkEspacoConflict,
  fetchAutomaticHolidaysForYear,
  isDentroDaGradeSemanal,
  isHolidayDate,
} from "@/lib/espacos/calendar";
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
    .select("id, nome_publico, responsavel_usuario_id, criado_por_usuario_id")
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
    const slugBase = slugifyEspaco(
      text(formData, "slug") || nomePublico || `espaco-${espacoId}`
    );
    const configuracaoReservas = serializarEspacoReservaConfig({
      limiteReservasDia: Number(formData.get("limite_reservas_dia") ?? 1),
      limiteReservasSemana: Number(formData.get("limite_reservas_semana") ?? 3),
      cooldownHoras: Number(formData.get("cooldown_horas") ?? 2),
      antecedenciaMinHoras: Number(formData.get("antecedencia_min_horas") ?? 1),
      antecedenciaMaxDias: Number(formData.get("antecedencia_max_dias") ?? 30),
      waitlistExpiracaoMinutos: Number(
        formData.get("waitlist_expiracao_minutos") ?? 60
      ),
      bloqueiaInadimplente: checkbox(formData, "bloqueia_inadimplente"),
      reservasGratisLiberadas: checkbox(formData, "reservas_gratis_liberadas"),
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
      },
      p_autor_usuario_id: user.id,
    });

    revalidatePath("/espaco");
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
  const nome = text(formData, "nome");
  if (nome.length < 2) throw new Error("Informe o nome da quadra/unidade.");
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
}

export async function criarHorarioSemanalEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const { supabase, user } = await requireEspacoManager(espacoId);
  const diaSemana = Number(formData.get("dia_semana") ?? -1);
  const horaInicio = text(formData, "hora_inicio");
  const horaFim = text(formData, "hora_fim");
  if (diaSemana < 0 || diaSemana > 6 || !horaInicio || !horaFim) {
    throw new Error("Preencha dia e faixa horária válidos.");
  }
  const { data, error } = await supabase
    .from("espaco_horarios_semanais")
    .insert({
      espaco_generico_id: espacoId,
      espaco_unidade_id: intOrNull(formData, "espaco_unidade_id"),
      dia_semana: diaSemana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
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
        "id, slug, nome_publico, aceita_socios, responsavel_usuario_id, criado_por_usuario_id"
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
      await supabase.from("notificacoes").insert({
        usuario_id: notifyOwnerId,
        mensagem: "Um novo pedido de associação foi enviado para o seu espaço.",
        tipo: "espaco_socio",
        referencia_id: socio.id,
        lida: false,
        remetente_id: user.id,
        data_criacao: new Date().toISOString(),
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
    if (!espacoId || !inicio || !fim) {
      return { ok: false, message: "Preencha unidade, início e fim da reserva." };
    }

    const [{ data: espaco }, { data: socio }, { data: plano }, { data: cfg }, { count: reservasSemana }] =
      await Promise.all([
        supabase
          .from("espacos_genericos")
          .select(
            "id, slug, nome_publico, configuracao_reservas_json, uf, codigo_ibge, responsavel_usuario_id, criado_por_usuario_id"
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

    const benefit = avaliarBeneficiosSocioEspaco({
      socio,
      plano,
      configuracaoEspaco: espaco.configuracao_reservas_json,
    });

    const valorCentavos = Math.max(
      0,
      Math.round(Number(formData.get("valor_centavos") ?? 0) || 0)
    );
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
        tipo_reserva,
        origem_reserva: benefit.ok ? "socio" : "avulsa",
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
        asaas_charge_url: payment.invoiceUrl ?? payment.bankSlipUrl ?? null,
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
      await admin.from("notificacoes").insert({
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
      });
    }

    revalidatePath(`/espaco/${espaco.slug ?? ""}`);
    revalidatePath("/comunidade");
    revalidatePath("/agenda");
    return {
      ok: true,
      message:
        calculo.brutoCentavos > 0
          ? "Reserva criada. Gere o PIX no painel do espaço/comunidade."
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

    const { data: socio } = await supabase
      .from("espaco_socios")
      .select("id, status, documentos_status, financeiro_status, beneficios_liberados")
      .eq("espaco_generico_id", espacoId)
      .eq("usuario_id", user.id)
      .maybeSingle();
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

export async function abrirPainelEspacoAction(formData: FormData) {
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  if (!espacoId) {
    redirect("/espaco");
  }
  redirect(`/espaco?espaco=${espacoId}`);
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
