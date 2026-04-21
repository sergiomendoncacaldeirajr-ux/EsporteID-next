"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  calcularTaxaCancelamentoProfessor,
  serializarPoliticaCancelamentoProfessor,
} from "@/lib/professor/cancellation";
import { parseCommaSeparatedList } from "@/lib/professor/server";
import { createClient } from "@/lib/supabase/server";

async function requireLoggedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada.");
  return { supabase, user };
}

async function requireProfessorActionContext() {
  const { supabase, user } = await requireLoggedUser();

  const { data: papel } = await supabase
    .from("usuario_papeis")
    .select("papel")
    .eq("usuario_id", user.id)
    .eq("papel", "professor")
    .maybeSingle();
  if (!papel) throw new Error("Sua conta não possui o papel de professor.");

  return { supabase, user };
}

export async function solicitarAulaProfessorAction(formData: FormData) {
  const { supabase } = await requireLoggedUser();

  const professorId = String(formData.get("professor_id") ?? "").trim();
  const esporteId = Number(formData.get("esporte_id") ?? 0);
  const mensagem = String(formData.get("mensagem") ?? "").trim();

  if (!professorId || !esporteId) {
    throw new Error("Selecione o esporte e tente novamente.");
  }

  const { error } = await supabase.rpc("professor_solicitar_aula", {
    p_professor_id: professorId,
    p_esporte_id: esporteId,
    p_mensagem: mensagem || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/professor/${professorId}`);
  revalidatePath("/professor/alunos");
  revalidatePath("/professor");
  revalidatePath("/comunidade");
}

export async function responderSolicitacaoProfessorAction(formData: FormData) {
  const { supabase, user } = await requireProfessorActionContext();
  const solicitacaoId = Number(formData.get("solicitacao_id") ?? 0);
  const proximoStatus = String(formData.get("status") ?? "").trim();

  if (!solicitacaoId || !["aceita", "recusada"].includes(proximoStatus)) {
    throw new Error("Solicitação inválida.");
  }

  const { data: solicitacao, error: loadErr } = await supabase
    .from("professor_solicitacoes_aula")
    .select("id, aluno_id, professor_id, status")
    .eq("id", solicitacaoId)
    .eq("professor_id", user.id)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!solicitacao) throw new Error("Solicitação não encontrada.");
  if (solicitacao.status !== "pendente") throw new Error("Essa solicitação já foi respondida.");

  const { error } = await supabase
    .from("professor_solicitacoes_aula")
    .update({
      status: proximoStatus,
      respondido_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", solicitacaoId)
    .eq("professor_id", user.id);
  if (error) throw new Error(error.message);

  const mensagem =
    proximoStatus === "aceita"
      ? "Seu pedido de aula foi aceito pelo professor. Combine os próximos detalhes pela plataforma."
      : "Seu pedido de aula foi recusado pelo professor.";

  const { error: notifyErr } = await supabase.rpc("professor_criar_notificacao", {
    p_usuario_id: solicitacao.aluno_id,
    p_mensagem: mensagem,
    p_tipo: "professor_solicitacao",
    p_referencia_id: solicitacaoId,
    p_remetente_id: user.id,
  });
  if (notifyErr) throw new Error(notifyErr.message);

  revalidatePath("/professor");
  revalidatePath("/professor/alunos");
  revalidatePath("/comunidade");
}

export async function salvarProfessorPerfilAction(formData: FormData) {
  const { supabase, user } = await requireProfessorActionContext();

  const headline = String(formData.get("headline") ?? "").trim();
  const bioProfissional = String(formData.get("bio_profissional") ?? "").trim();
  const certificacoes = parseCommaSeparatedList(String(formData.get("certificacoes") ?? ""));
  const publicoAlvo = parseCommaSeparatedList(String(formData.get("publico_alvo") ?? ""));
  const formatoAula = parseCommaSeparatedList(String(formData.get("formato_aula") ?? ""));
  const politicaCancelamento = String(formData.get("politica_cancelamento") ?? "").trim();
  const antecedenciaMinutos = Math.max(0, Number(formData.get("politica_antecedencia_minutos") ?? 0) || 0);
  const percentualRetencao = Math.max(0, Math.min(100, Number(formData.get("politica_percentual_retencao") ?? 0) || 0));
  const valorFixoCentavos = Math.max(0, Number(formData.get("politica_valor_fixo_centavos") ?? 0) || 0);
  const cobrarNoShow = formData.get("politica_cobrar_no_show") === "on";
  const whatsappVisibilidade = String(formData.get("whatsapp_visibilidade") ?? "publico").trim();
  const aceitaNovosAlunos = formData.get("aceita_novos_alunos") === "on";
  const perfilPublicado = formData.get("perfil_publicado") === "on";

  const { error } = await supabase.from("professor_perfil").upsert(
    {
      usuario_id: user.id,
      headline: headline || null,
      bio_profissional: bioProfissional || null,
      certificacoes_json: certificacoes,
      publico_alvo_json: publicoAlvo,
      formato_aula_json: formatoAula,
      politica_cancelamento_json: serializarPoliticaCancelamentoProfessor({
        resumo: politicaCancelamento || null,
        antecedenciaMinutos,
        percentualRetencao,
        valorFixoCentavos,
        cobrarNoShow,
      }),
      whatsapp_visibilidade:
        whatsappVisibilidade === "oculto" || whatsappVisibilidade === "alunos_aceitos_ou_com_aula"
          ? whatsappVisibilidade
          : "publico",
      aceita_novos_alunos: aceitaNovosAlunos,
      perfil_publicado: perfilPublicado,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "usuario_id" }
  );
  if (error) throw new Error(error.message);

  const esporteId = Number(formData.get("esporte_id") ?? 0);
  const objetivoPlataforma = String(formData.get("objetivo_plataforma") ?? "somente_exposicao");
  const valorBaseCentavos = Math.max(0, Number(formData.get("valor_base_centavos") ?? 0) || 0);
  const tipoAtuacao = formData
    .getAll("tipo_atuacao")
    .map(String)
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value === "aulas" || value === "treinamento" || value === "consultoria");

  if (esporteId > 0) {
    const { error: sportErr } = await supabase
      .from("professor_esportes")
      .update({
        objetivo_plataforma:
          objetivoPlataforma === "gerir_alunos" || objetivoPlataforma === "ambos"
            ? objetivoPlataforma
            : "somente_exposicao",
        tipo_atuacao: tipoAtuacao.length ? tipoAtuacao : ["aulas"],
        valor_base_centavos: valorBaseCentavos,
        atualizado_em: new Date().toISOString(),
      })
      .eq("professor_id", user.id)
      .eq("esporte_id", esporteId);
    if (sportErr) throw new Error(sportErr.message);
  }

  revalidatePath("/professor");
  revalidatePath("/professor/perfil");
  revalidatePath(`/professor/${user.id}`);
  revalidatePath(`/perfil/${user.id}`);
}

export async function criarDisponibilidadeProfessorAction(formData: FormData) {
  const { supabase, user } = await requireProfessorActionContext();
  const esporteId = Number(formData.get("esporte_id") ?? 0) || null;
  const espacoId = Number(formData.get("espaco_id") ?? 0) || null;
  const diaSemana = Number(formData.get("dia_semana") ?? -1);
  const horaInicio = String(formData.get("hora_inicio") ?? "").trim();
  const horaFim = String(formData.get("hora_fim") ?? "").trim();
  const capacidade = Math.max(1, Number(formData.get("capacidade") ?? 1) || 1);
  const observacoes = String(formData.get("observacoes") ?? "").trim();

  const { error } = await supabase.from("professor_disponibilidades").insert({
    professor_id: user.id,
    esporte_id: esporteId,
    espaco_id: espacoId,
    dia_semana: diaSemana,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    capacidade,
    observacoes: observacoes || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/professor/agenda");
  revalidatePath("/professor");
}

export async function criarAulaProfessorAction(formData: FormData) {
  const { supabase, user } = await requireProfessorActionContext();
  const esporteId = Number(formData.get("esporte_id") ?? 0);
  const espacoId = Number(formData.get("espaco_id") ?? 0) || null;
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const tipoAula = String(formData.get("tipo_aula") ?? "individual").trim();
  const capacidade = Math.max(1, Number(formData.get("capacidade") ?? 1) || 1);
  const valorTotalCentavos = Math.max(0, Number(formData.get("valor_total_centavos") ?? 0) || 0);
  const inicio = String(formData.get("inicio") ?? "").trim();
  const fim = String(formData.get("fim") ?? "").trim();

  const { data: aulaId, error } = await supabase.rpc("professor_agendar_aula", {
    p_esporte_id: esporteId,
    p_inicio: inicio,
    p_fim: fim,
    p_tipo_aula: tipoAula,
    p_capacidade: capacidade,
    p_espaco_id: espacoId,
    p_valor_total_centavos: valorTotalCentavos,
    p_titulo: titulo || null,
    p_descricao: descricao || null,
    p_origem_agendamento: "professor",
  });
  if (error) throw new Error(error.message);

  if (espacoId && aulaId) {
    const { data: reserva } = await supabase
      .from("reservas_quadra")
      .insert({
        espaco_generico_id: espacoId,
        usuario_solicitante_id: user.id,
        valor_total: 0,
        payment_status: "isento",
        status_reserva: "confirmada",
        inicio,
        fim,
        esporte_id: esporteId,
        tipo_reserva: "professor",
        origem_reserva: "professor",
        reserva_gratuita: true,
        professor_aula_id: aulaId,
        atualizado_por: user.id,
      })
      .select("id")
      .single();

    if (reserva?.id) {
      await supabase
        .from("professor_aulas")
        .update({
          reserva_quadra_id: reserva.id,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", aulaId)
        .eq("professor_id", user.id);
    }
  }

  revalidatePath("/professor");
  revalidatePath("/professor/agenda");
  revalidatePath("/espaco");
  revalidatePath("/espaco/agenda");
  revalidatePath(`/perfil/${user.id}`);
}

export async function inscreverAlunoEmAulaAction(formData: FormData) {
  const { supabase, user } = await requireProfessorActionContext();
  const aulaId = Number(formData.get("aula_id") ?? 0);
  const username = String(formData.get("aluno_username") ?? "").trim().replace(/^@/, "");
  const valorCentavos = Math.max(0, Number(formData.get("valor_centavos") ?? 0) || 0);

  const { data: aluno, error: alunoErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (alunoErr) throw new Error(alunoErr.message);
  if (!aluno?.id) throw new Error("Aluno não encontrado por username.");

  const { error } = await supabase.from("professor_aula_alunos").upsert(
    {
      aula_id: aulaId,
      aluno_id: aluno.id,
      valor_centavos: valorCentavos,
      status_inscricao: "confirmada",
      status_pagamento: valorCentavos > 0 ? "pendente" : "isento",
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "aula_id,aluno_id" }
  );
  if (error) throw new Error(error.message);

  const { error: notifyErr } = await supabase.rpc("professor_criar_notificacao", {
    p_usuario_id: aluno.id,
    p_mensagem: "Você foi vinculado a uma aula pela EsporteID. Confira os detalhes em Social.",
    p_tipo: "professor_aula_aluno",
    p_referencia_id: aulaId,
    p_remetente_id: user.id,
  });
  if (notifyErr) throw new Error(notifyErr.message);

  revalidatePath("/professor/alunos");
  revalidatePath("/professor/agenda");
  revalidatePath("/comunidade");
}

export async function concluirAulaProfessorAction(formData: FormData) {
  const { supabase, user } = await requireProfessorActionContext();
  const aulaId = Number(formData.get("aula_id") ?? 0);

  const { error: aulaErr } = await supabase
    .from("professor_aulas")
    .update({
      status: "concluida",
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", aulaId)
    .eq("professor_id", user.id);
  if (aulaErr) throw new Error(aulaErr.message);

  const { error: alunosErr } = await supabase
    .from("professor_aula_alunos")
    .update({
      status_inscricao: "concluida",
      presenca_confirmada: true,
      concluido_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("aula_id", aulaId)
    .neq("status_inscricao", "cancelada");
  if (alunosErr) throw new Error(alunosErr.message);

  revalidatePath("/professor/agenda");
  revalidatePath("/professor/avaliacoes");
}

export async function cancelarAulaProfessorAction(formData: FormData) {
  const { supabase, user } = await requireProfessorActionContext();
  const aulaId = Number(formData.get("aula_id") ?? 0);
  const motivo = String(formData.get("motivo_cancelamento") ?? "").trim();
  if (!aulaId) throw new Error("Aula inválida.");

  const { error } = await supabase.rpc("professor_cancelar_aula", {
    p_aula_id: aulaId,
    p_motivo: motivo || null,
  });
  if (error) throw new Error(error.message);

  const { data: aula } = await supabase
    .from("professor_aulas")
    .select("id, reserva_quadra_id")
    .eq("id", aulaId)
    .eq("professor_id", user.id)
    .maybeSingle();
  if (aula?.reserva_quadra_id) {
    await supabase
      .from("reservas_quadra")
      .update({
        status_reserva: "cancelada",
        motivo_cancelamento: motivo || "Aula cancelada pelo professor.",
        cancelado_por: user.id,
        cancelado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", aula.reserva_quadra_id);
  }

  revalidatePath("/professor");
  revalidatePath("/professor/agenda");
  revalidatePath("/professor/alunos");
  revalidatePath("/comunidade");
  revalidatePath("/espaco");
  revalidatePath("/espaco/agenda");
  revalidatePath(`/professor/${user.id}`);
}

export async function atualizarStatusAlunoAulaProfessorAction(formData: FormData) {
  const { supabase, user } = await requireProfessorActionContext();
  const vinculoId = Number(formData.get("vinculo_id") ?? 0);
  const status = String(formData.get("status") ?? "").trim();
  if (!vinculoId || !["confirmada", "faltou", "concluida"].includes(status)) {
    throw new Error("Status inválido.");
  }

  const { data: vinculo, error: vinculoErr } = await supabase
    .from("professor_aula_alunos")
    .select("id, aula_id, aluno_id, professor_aulas!inner(id, professor_id, titulo)")
    .eq("id", vinculoId)
    .eq("professor_aulas.professor_id", user.id)
    .maybeSingle();
  if (vinculoErr) throw new Error(vinculoErr.message);
  if (!vinculo) throw new Error("Aluno não encontrado nesta aula.");

  const payload =
    status === "faltou"
      ? {
          status_inscricao: "faltou",
          presenca_confirmada: false,
          atualizado_em: new Date().toISOString(),
        }
      : status === "concluida"
        ? {
            status_inscricao: "concluida",
            presenca_confirmada: true,
            concluido_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
          }
        : {
            status_inscricao: "confirmada",
            presenca_confirmada: false,
            atualizado_em: new Date().toISOString(),
          };

  const { error } = await supabase
    .from("professor_aula_alunos")
    .update(payload)
    .eq("id", vinculoId);
  if (error) throw new Error(error.message);

  const mensagem =
    status === "faltou"
      ? "O professor marcou sua participação como falta."
      : status === "concluida"
        ? "Sua aula foi concluída pelo professor."
        : "Seu status na aula foi atualizado pelo professor.";

  const { error: notifyErr } = await supabase.rpc("professor_criar_notificacao", {
    p_usuario_id: vinculo.aluno_id,
    p_mensagem: mensagem,
    p_tipo: "professor_aula_aluno",
    p_referencia_id: vinculo.aula_id,
    p_remetente_id: user.id,
  });
  if (notifyErr) throw new Error(notifyErr.message);

  revalidatePath("/professor/alunos");
  revalidatePath("/professor/agenda");
  revalidatePath("/comunidade");
}

export async function cancelarSolicitacaoAlunoAction(formData: FormData) {
  const { user } = await requireLoggedUser();
  const admin = createServiceRoleClient();
  const solicitacaoId = Number(formData.get("solicitacao_id") ?? 0);
  if (!solicitacaoId) throw new Error("Solicitação inválida.");

  const { data: solicitacao, error: loadErr } = await admin
    .from("professor_solicitacoes_aula")
    .select("id, professor_id, status")
    .eq("id", solicitacaoId)
    .eq("aluno_id", user.id)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!solicitacao) throw new Error("Solicitação não encontrada.");
  if (solicitacao.status !== "pendente") throw new Error("Essa solicitação já foi respondida.");

  const { error } = await admin
    .from("professor_solicitacoes_aula")
    .update({
      status: "cancelada",
      respondido_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", solicitacaoId)
    .eq("aluno_id", user.id);
  if (error) throw new Error(error.message);

  const { error: notifyErr } = await admin.rpc("professor_criar_notificacao", {
    p_usuario_id: solicitacao.professor_id,
    p_mensagem: "Um aluno cancelou uma solicitação de aula pendente.",
    p_tipo: "professor_solicitacao",
    p_referencia_id: solicitacaoId,
    p_remetente_id: user.id,
  });
  if (notifyErr) throw new Error(notifyErr.message);

  revalidatePath("/professor");
  revalidatePath("/professor/alunos");
  revalidatePath("/comunidade");
}

export async function cancelarParticipacaoAlunoAction(formData: FormData) {
  const { user } = await requireLoggedUser();
  const admin = createServiceRoleClient();
  const vinculoId = Number(formData.get("vinculo_id") ?? 0);
  const motivo = String(formData.get("motivo_cancelamento") ?? "").trim();
  if (!vinculoId) throw new Error("Aula inválida.");

  const { data: vinculo, error: loadErr } = await admin
    .from("professor_aula_alunos")
    .select(
      "id, aula_id, aluno_id, valor_centavos, status_inscricao, professor_aulas!inner(id, professor_id, titulo, inicio)"
    )
    .eq("id", vinculoId)
    .eq("aluno_id", user.id)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!vinculo) throw new Error("Vínculo de aula não encontrado.");
  if (!["confirmada", "pendente"].includes(String(vinculo.status_inscricao ?? ""))) {
    throw new Error("Essa aula não pode mais ser cancelada pelo aluno.");
  }

  const aula = Array.isArray(vinculo.professor_aulas) ? vinculo.professor_aulas[0] : vinculo.professor_aulas;
  const professorId = aula?.professor_id;
  if (!professorId) throw new Error("Professor da aula não encontrado.");

  const { data: professorPerfil, error: perfilErr } = await admin
    .from("professor_perfil")
    .select("politica_cancelamento_json")
    .eq("usuario_id", professorId)
    .maybeSingle();
  if (perfilErr) throw new Error(perfilErr.message);

  const cancelamento = calcularTaxaCancelamentoProfessor({
    politica: professorPerfil?.politica_cancelamento_json,
    valorCentavos: Number(vinculo.valor_centavos ?? 0),
    inicio: aula?.inicio,
  });

  const { error } = await admin
    .from("professor_aula_alunos")
    .update({
      status_inscricao: cancelamento.status,
      presenca_confirmada: false,
      origem_cancelamento: "aluno",
      cancelado_por: user.id,
      cancelado_em: new Date().toISOString(),
      motivo_cancelamento: motivo || cancelamento.resumo,
      taxa_cancelamento_centavos: cancelamento.taxaCentavos,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", vinculoId)
    .eq("aluno_id", user.id);
  if (error) throw new Error(error.message);

  const { error: notifyErr } = await admin.rpc("professor_criar_notificacao", {
    p_usuario_id: professorId,
    p_mensagem:
      cancelamento.status === "faltou"
        ? "Um aluno informou ausência e a aula foi tratada como falta."
        : "Um aluno cancelou participação em uma aula.",
    p_tipo: "professor_cancelamento_aluno",
    p_referencia_id: Number(vinculo.aula_id ?? 0) || null,
    p_remetente_id: user.id,
  });
  if (notifyErr) throw new Error(notifyErr.message);

  revalidatePath("/professor");
  revalidatePath("/professor/alunos");
  revalidatePath("/professor/agenda");
  revalidatePath("/comunidade");
}

export async function vincularLocalProfessorAction(formData: FormData) {
  const { supabase, user } = await requireProfessorActionContext();
  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const tipoVinculo = String(formData.get("tipo_vinculo") ?? "preferencial").trim();
  const usaHorariosDoEspaco = formData.get("usa_horarios_do_espaco") === "on";
  const observacoes = String(formData.get("observacoes") ?? "").trim();

  const { error } = await supabase.from("professor_locais").upsert(
    {
      professor_id: user.id,
      espaco_id: espacoId,
      tipo_vinculo:
        tipoVinculo === "parceiro" || tipoVinculo === "proprio" ? tipoVinculo : "preferencial",
      usa_horarios_do_espaco: usaHorariosDoEspaco,
      observacoes: observacoes || null,
      status_vinculo: "ativo",
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "professor_id,espaco_id" }
  );
  if (error) throw new Error(error.message);

  revalidatePath("/professor/locais");
  revalidatePath("/professor");
  revalidatePath(`/perfil/${user.id}`);
}
