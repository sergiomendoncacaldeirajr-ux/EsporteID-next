"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContextState } from "@/lib/auth/active-context-server";
import { refundAsaasPayment } from "@/lib/asaas/client";
import { getTorneioFinanceiro } from "@/lib/financeiro/config";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";
import { collectTorneioCategorias } from "@/lib/torneios/categorias";
import { generateTorneioDraw, type DrawStrategy } from "@/lib/torneios/draw-engine";
import { usuarioPodeCriarTorneio } from "@/lib/torneios/organizador";
import { parseRegrasPlacarJson } from "@/lib/torneios/regras";
import { canLaunchTorneioScore, getTorneioStaffAccess } from "@/lib/torneios/staff";

function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function criarTorneo(formData: FormData): Promise<void> {
  const contextState = await getAuthContextState();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/torneios/criar");
  if (contextState.papeis.includes("organizador") && contextState.activeContext !== "organizador") {
    redirect("/dashboard?erro=modo_organizador");
  }

  const pode = await usuarioPodeCriarTorneio(supabase, user.id);
  if (!pode) redirect("/torneios/criar?erro=permissao");

  const nome = String(formData.get("nome") ?? "").trim();
  const esporteId = numOrNull(formData.get("esporte_id"));
  const status = String(formData.get("status") ?? "aberto").trim() || "aberto";
  const dataInicio = String(formData.get("data_inicio") ?? "").trim() || null;
  const dataFim = String(formData.get("data_fim") ?? "").trim() || null;
  const valorInscricao = Number(String(formData.get("valor_inscricao") ?? "0").replace(",", ".")) || 0;
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const categoriasPublico = collectTorneioCategorias(formData.getAll("categoria_publico"));
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const regulamento = String(formData.get("regulamento") ?? "").trim() || null;
  const premios = String(formData.get("premios") ?? "").trim() || null;
  const formatoCompeticao = String(formData.get("formato_competicao") ?? "").trim() || null;
  const criterioDesempate = String(formData.get("criterio_desempate") ?? "").trim() || "sets";
  const banner = String(formData.get("banner") ?? "").trim() || null;
  const logoArquivo = String(formData.get("logo_arquivo") ?? "").trim() || null;
  const espacoGenericoId = numOrNull(formData.get("espaco_generico_id"));

  const modalidadeParticipacao = String(formData.get("modalidade_participacao") ?? "").trim() || "individual";
  const melhorDeRaw = String(formData.get("melhor_de") ?? "1").trim();
  const melhorDe = Math.min(5, Math.max(1, Number(melhorDeRaw) || 1));
  const vagasMax = numOrNull(formData.get("vagas_max"));
  const obsRegras = String(formData.get("observacoes_regras") ?? "").trim() || null;

  if (nome.length < 3) redirect("/torneios/criar?erro=nome");
  if (!esporteId || esporteId < 1) redirect("/torneios/criar?erro=esporte");

  const regrasPlacarJson = JSON.stringify({
    modalidade_participacao: modalidadeParticipacao,
    melhor_de: melhorDe,
    ...(vagasMax != null && vagasMax > 0 ? { vagas_max: vagasMax } : {}),
    ...(obsRegras ? { observacoes: obsRegras } : {}),
  });

  const { data, error } = await supabase
    .from("torneios")
    .insert({
      nome,
      esporte_id: esporteId,
      status,
      data_inicio: dataInicio,
      data_fim: dataFim,
      valor_inscricao: valorInscricao,
      categoria,
      categorias_json: JSON.stringify(categoriasPublico),
      descricao,
      regulamento,
      premios,
      formato_competicao: formatoCompeticao,
      criterio_desempate: criterioDesempate,
      regras_placar_json: regrasPlacarJson,
      banner,
      logo_arquivo: logoArquivo,
      criador_id: user.id,
      espaco_generico_id: espacoGenericoId,
    })
    .select("id")
    .single();

  if (error) redirect("/torneios/criar?erro=gravacao");

  revalidatePath("/torneios");
  if (espacoGenericoId) {
    revalidatePath("/locais");
    revalidatePath(`/local/${espacoGenericoId}`);
    revalidatePath("/espaco");
  }
  redirect(`/torneios/${data.id}?from=/torneios/criar`);
}

export type TorneioUpdateState = { ok: true; message: string } | { ok: false; message: string };
export type TorneioStaffActionState = { ok: true; message: string } | { ok: false; message: string };

function isPaidPaymentStatus(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toLowerCase();
  return normalized === "paid" || normalized === "received" || normalized === "confirmado";
}

export async function atualizarMeuTorneio(
  _prev: TorneioUpdateState | undefined,
  formData: FormData
): Promise<TorneioUpdateState> {
  const contextState = await getAuthContextState();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };
  if (contextState.papeis.includes("organizador") && contextState.activeContext !== "organizador") {
    return { ok: false, message: "Troque para o Modo Organizador para editar torneios." };
  }

  const torneioId = numOrNull(formData.get("torneio_id"));
  if (!torneioId || torneioId < 1) return { ok: false, message: "Torneio inválido." };

  const { data: existente } = await supabase
    .from("torneios")
    .select("id, criador_id")
    .eq("id", torneioId)
    .maybeSingle();
  if (!existente || existente.criador_id !== user.id) {
    return { ok: false, message: "Sem permissão para editar este torneio." };
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const esporteId = numOrNull(formData.get("esporte_id"));
  const status = String(formData.get("status") ?? "aberto").trim() || "aberto";
  const dataInicio = String(formData.get("data_inicio") ?? "").trim() || null;
  const dataFim = String(formData.get("data_fim") ?? "").trim() || null;
  const valorInscricao = Number(String(formData.get("valor_inscricao") ?? "0").replace(",", ".")) || 0;
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const categoriasPublico = collectTorneioCategorias(formData.getAll("categoria_publico"));
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const regulamento = String(formData.get("regulamento") ?? "").trim() || null;
  const premios = String(formData.get("premios") ?? "").trim() || null;
  const formatoCompeticao = String(formData.get("formato_competicao") ?? "").trim() || null;
  const criterioDesempate = String(formData.get("criterio_desempate") ?? "").trim() || "sets";
  const banner = String(formData.get("banner") ?? "").trim() || null;
  const logoArquivo = String(formData.get("logo_arquivo") ?? "").trim() || null;
  const espacoGenericoId = numOrNull(formData.get("espaco_generico_id"));

  const modalidadeParticipacao = String(formData.get("modalidade_participacao") ?? "").trim() || "individual";
  const melhorDeRaw = String(formData.get("melhor_de") ?? "1").trim();
  const melhorDe = Math.min(5, Math.max(1, Number(melhorDeRaw) || 1));
  const vagasMax = numOrNull(formData.get("vagas_max"));
  const obsRegras = String(formData.get("observacoes_regras") ?? "").trim() || null;

  if (nome.length < 3) return { ok: false, message: "Nome do torneio inválido." };
  if (!esporteId || esporteId < 1) return { ok: false, message: "Selecione um esporte válido." };

  const regrasPlacarJson = JSON.stringify({
    modalidade_participacao: modalidadeParticipacao,
    melhor_de: melhorDe,
    ...(vagasMax != null && vagasMax > 0 ? { vagas_max: vagasMax } : {}),
    ...(obsRegras ? { observacoes: obsRegras } : {}),
  });

  const { error } = await supabase
    .from("torneios")
    .update({
      nome,
      esporte_id: esporteId,
      status,
      data_inicio: dataInicio,
      data_fim: dataFim,
      valor_inscricao: valorInscricao,
      categoria,
      categorias_json: JSON.stringify(categoriasPublico),
      descricao,
      regulamento,
      premios,
      formato_competicao: formatoCompeticao,
      criterio_desempate: criterioDesempate,
      regras_placar_json: regrasPlacarJson,
      banner,
      logo_arquivo: logoArquivo,
      espaco_generico_id: espacoGenericoId,
    })
    .eq("id", torneioId)
    .eq("criador_id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/torneios/${torneioId}`);
  revalidatePath(`/conta/torneio/${torneioId}`);
  revalidatePath("/torneios");
  if (espacoGenericoId) {
    revalidatePath("/locais");
    revalidatePath(`/local/${espacoGenericoId}`);
    revalidatePath("/espaco");
  }
  return { ok: true, message: "Torneio atualizado." };
}

export async function solicitarInscricaoTorneio(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const torneioId = numOrNull(formData.get("torneio_id"));
  if (!user || !torneioId) redirect("/login?next=/torneios");

  const { data: t } = await supabase
    .from("torneios")
    .select("id, status, criador_id, regras_placar_json, valor_inscricao")
    .eq("id", torneioId)
    .maybeSingle();
  if (!t) redirect(`/torneios/${torneioId}?erro=torneio`);

  if (t.criador_id === user.id) {
    redirect(`/torneios/${torneioId}?erro=proprio`);
  }

  if (t.status !== "aberto") {
    redirect(`/torneios/${torneioId}?erro=inscricoes_fechadas`);
  }

  const regras = parseRegrasPlacarJson(t.regras_placar_json);
  const vagasMax = regras?.vagas_max;
  if (vagasMax != null && vagasMax > 0) {
    const { count } = await supabase
      .from("torneio_inscricoes")
      .select("id", { count: "exact", head: true })
      .eq("torneio_id", torneioId);
    if (count != null && count >= vagasMax) {
      redirect(`/torneios/${torneioId}?erro=vagas`);
    }
  }

  const tipoInscricao =
    regras?.modalidade_participacao === "dupla"
      ? "dupla"
      : regras?.modalidade_participacao === "equipe"
        ? "time"
        : "atleta";
  const duplaId = numOrNull(formData.get("dupla_id"));
  const timeId = numOrNull(formData.get("time_id"));

  let entidadeTitularUserId = user.id;
  if (tipoInscricao === "dupla") {
    if (!duplaId) redirect(`/torneios/${torneioId}?erro=dupla`);
    const { data: dupla } = await supabase
      .from("duplas")
      .select("id, player1_id, player2_id")
      .eq("id", duplaId)
      .maybeSingle();
    if (!dupla || (dupla.player1_id !== user.id && dupla.player2_id !== user.id)) {
      redirect(`/torneios/${torneioId}?erro=dupla`);
    }
    entidadeTitularUserId = String(dupla.player1_id ?? user.id);
  }
  if (tipoInscricao === "time") {
    if (!timeId) redirect(`/torneios/${torneioId}?erro=time`);
    const { data: time } = await supabase
      .from("times")
      .select("id, criador_id")
      .eq("id", timeId)
      .maybeSingle();
    if (!time || time.criador_id !== user.id) {
      redirect(`/torneios/${torneioId}?erro=time`);
    }
    entidadeTitularUserId = String(time.criador_id ?? user.id);
  }

  const { data: existente } = await supabase
    .from("torneio_inscricoes")
    .select("id")
    .eq("torneio_id", torneioId)
    .or(
      tipoInscricao === "atleta"
        ? `usuario_id.eq.${entidadeTitularUserId}`
        : tipoInscricao === "dupla"
          ? `dupla_id.eq.${duplaId}`
          : `time_id.eq.${timeId}`
    )
    .maybeSingle();

  if (existente) {
    redirect(`/torneios/${torneioId}?erro=ja_inscrito`);
  }

  const { data: financeiroConfig } = await supabase
    .from("ei_financeiro_config")
    .select(
      "torneio_taxa_fixa, torneio_taxa_promo, promocao_dias, torneio_promocao_ativa, torneio_promocao_ate"
    )
    .eq("id", 1)
    .maybeSingle();
  const torneioFinanceiro = getTorneioFinanceiro(financeiroConfig);
  const valorInscricao = Number(t.valor_inscricao ?? 0);
  const taxaPlataforma = Number(torneioFinanceiro.taxaFixa ?? 0);
  const valorTotalCobranca = Math.max(0, valorInscricao + taxaPlataforma);
  const valorParaOrganizador = Math.max(0, valorInscricao);

  const { error } = await supabase.from("torneio_inscricoes").insert({
    torneio_id: torneioId,
    usuario_id: tipoInscricao === "atleta" ? entidadeTitularUserId : null,
    tipo_inscricao: tipoInscricao,
    dupla_id: tipoInscricao === "dupla" ? duplaId : null,
    time_id: tipoInscricao === "time" ? timeId : null,
    pagante_usuario_id: entidadeTitularUserId,
    payment_status: "pending",
    status_inscricao: "pendente",
    valor_taxa_plataforma_fixa: taxaPlataforma,
    valor_total_cobranca: valorTotalCobranca,
    valor_para_organizador: valorParaOrganizador,
  });

  if (error) {
    redirect(`/torneios/${torneioId}?erro=inscricao`);
  }

  revalidatePath(`/torneios/${torneioId}`);
  revalidatePath("/torneios");
  redirect(`/torneios/${torneioId}?ok=inscricao`);
}

export async function convidarTorneioStaff(
  _prev: TorneioStaffActionState | undefined,
  formData: FormData
): Promise<TorneioStaffActionState> {
  const contextState = await getAuthContextState();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };
  if (contextState.papeis.includes("organizador") && contextState.activeContext !== "organizador") {
    return { ok: false, message: "Troque para o Modo Organizador para convidar staff." };
  }

  const torneioId = numOrNull(formData.get("torneio_id"));
  const conviteEmail = String(formData.get("convite_email") ?? "").trim().toLowerCase();
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  if (!torneioId || !conviteEmail.includes("@")) {
    return { ok: false, message: "Informe um e-mail válido." };
  }

  const { data: torneio } = await supabase.from("torneios").select("id, criador_id").eq("id", torneioId).maybeSingle();
  if (!torneio || torneio.criador_id !== user.id) {
    return { ok: false, message: "Sem permissão para gerenciar o staff deste torneio." };
  }

  const { data: existenteEmail } = await supabase
    .from("torneio_staff")
    .select("id")
    .eq("torneio_id", torneioId)
    .eq("convite_email", conviteEmail)
    .in("status", ["pendente", "ativo"])
    .maybeSingle();
  if (existenteEmail) {
    return { ok: false, message: "Esse e-mail já foi convidado para este torneio." };
  }

  let invitedUserId: string | null = null;
  if (hasServiceRoleConfig()) {
    const svc = createServiceRoleClient();
    const { data: authUser } = await svc
      .schema("auth")
      .from("users")
      .select("id, email")
      .ilike("email", conviteEmail)
      .limit(1)
      .maybeSingle();
    invitedUserId = authUser?.id ?? null;
  }
  if (!invitedUserId) {
    return { ok: false, message: "Convite permitido apenas para usuário já cadastrado com pagamento realizado." };
  }

  const { data: inscricaoPaga } = await supabase
    .from("torneio_inscricoes")
    .select("id, payment_status")
    .eq("torneio_id", torneioId)
    .or(`usuario_id.eq.${invitedUserId},pagante_usuario_id.eq.${invitedUserId}`)
    .in("status_inscricao", ["confirmada", "aprovada"])
    .maybeSingle();
  if (!inscricaoPaga || !isPaidPaymentStatus(inscricaoPaga.payment_status)) {
    return { ok: false, message: "Só pode virar lançador quem tem inscrição paga neste torneio." };
  }

  const { error } = await supabase.from("torneio_staff").insert({
    torneio_id: torneioId,
    usuario_id: invitedUserId,
    papel: "lancador_placar",
    status: invitedUserId ? "ativo" : "pendente",
    convite_email: conviteEmail,
    convidado_por_usuario_id: user.id,
    observacoes,
    aceito_em: invitedUserId ? new Date().toISOString() : null,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/torneios/${torneioId}/operacao`);
  revalidatePath("/organizador");
  return {
    ok: true,
    message: invitedUserId
      ? "Lançador de placar adicionado com acesso imediato."
      : "Convite registrado por e-mail. O acesso será liberado quando o usuário estiver vinculado.",
  };
}

export async function revogarTorneioStaff(formData: FormData): Promise<void> {
  const contextState = await getAuthContextState();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || (contextState.papeis.includes("organizador") && contextState.activeContext !== "organizador")) return;

  const staffId = numOrNull(formData.get("staff_id"));
  const torneioId = numOrNull(formData.get("torneio_id"));
  if (!staffId || !torneioId) return;

  const { data: torneio } = await supabase.from("torneios").select("criador_id").eq("id", torneioId).maybeSingle();
  if (!torneio || torneio.criador_id !== user.id) return;

  await supabase
    .from("torneio_staff")
    .update({
      status: "revogado",
      revogado_em: new Date().toISOString(),
    })
    .eq("id", staffId)
    .eq("torneio_id", torneioId);

  revalidatePath(`/torneios/${torneioId}/operacao`);
  revalidatePath("/organizador");
}

export async function atualizarPlacarTorneioJogo(
  _prev: TorneioStaffActionState | undefined,
  formData: FormData
): Promise<TorneioStaffActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const torneioId = numOrNull(formData.get("torneio_id"));
  const jogoId = numOrNull(formData.get("jogo_id"));
  if (!torneioId || !jogoId) return { ok: false, message: "Jogo inválido." };

  const access = await getTorneioStaffAccess(supabase, torneioId, user.id);
  if (!canLaunchTorneioScore(access)) {
    return { ok: false, message: "Sem permissão para lançar placar neste torneio." };
  }

  const status = String(formData.get("status") ?? "agendado").trim() || "agendado";
  const placarA = String(formData.get("placar_a") ?? "").trim();
  const placarB = String(formData.get("placar_b") ?? "").trim();
  const quadra = String(formData.get("quadra") ?? "").trim() || null;
  const horarioInicio = String(formData.get("horario_inicio") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const vencedorId = String(formData.get("vencedor_id") ?? "").trim() || null;

  const placarJson = JSON.stringify({
    lado_a: placarA,
    lado_b: placarB,
  });

  const { error } = await supabase
    .from("torneio_jogos")
    .update({
      status,
      placar_json: placarJson,
      quadra,
      horario_inicio: horarioInicio,
      observacoes,
      vencedor_id: vencedorId || null,
      lancado_por_usuario_id: user.id,
      placar_lancado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", jogoId)
    .eq("torneio_id", torneioId);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/torneios/${torneioId}/operacao`);
  revalidatePath(`/torneios/${torneioId}`);
  revalidatePath(`/torneios/${torneioId}/chave`);
  return { ok: true, message: "Placar atualizado." };
}

export async function organizerAtualizarInscricaoStatus(
  _prev: TorneioStaffActionState | undefined,
  formData: FormData
): Promise<TorneioStaffActionState> {
  const contextState = await getAuthContextState();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };
  if (contextState.papeis.includes("organizador") && contextState.activeContext !== "organizador") {
    return { ok: false, message: "Troque para o Modo Organizador para gerenciar inscrições." };
  }

  const torneioId = numOrNull(formData.get("torneio_id"));
  const inscricaoId = numOrNull(formData.get("inscricao_id"));
  const statusInscricao = String(formData.get("status_inscricao") ?? "").trim();
  if (!torneioId || !inscricaoId || !statusInscricao) return { ok: false, message: "Dados inválidos." };

  const { data: torneio } = await supabase.from("torneios").select("criador_id").eq("id", torneioId).maybeSingle();
  if (!torneio || torneio.criador_id !== user.id) return { ok: false, message: "Sem permissão." };

  const payload: Record<string, unknown> = {
    status_inscricao: statusInscricao,
    atualizado_em: new Date().toISOString(),
  };
  if (statusInscricao === "confirmada" || statusInscricao === "aprovada") {
    payload.payment_status = "paid";
    payload.pagamento_confirmado_em = new Date().toISOString();
  }

  const { error } = await supabase
    .from("torneio_inscricoes")
    .update(payload)
    .eq("id", inscricaoId)
    .eq("torneio_id", torneioId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/torneios/${torneioId}/operacao`);
  revalidatePath(`/torneios/${torneioId}`);
  return { ok: true, message: "Status da inscrição atualizado." };
}

export async function organizerCancelarInscricaoComEstorno(
  _prev: TorneioStaffActionState | undefined,
  formData: FormData
): Promise<TorneioStaffActionState> {
  const contextState = await getAuthContextState();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };
  if (contextState.papeis.includes("organizador") && contextState.activeContext !== "organizador") {
    return { ok: false, message: "Troque para o Modo Organizador para estornar inscrições." };
  }

  const torneioId = numOrNull(formData.get("torneio_id"));
  const inscricaoId = numOrNull(formData.get("inscricao_id"));
  if (!torneioId || !inscricaoId) return { ok: false, message: "Inscrição inválida." };

  const { data: torneio } = await supabase.from("torneios").select("criador_id").eq("id", torneioId).maybeSingle();
  if (!torneio || torneio.criador_id !== user.id) return { ok: false, message: "Sem permissão." };

  const { data: inscricao } = await supabase
    .from("torneio_inscricoes")
    .select("id, asaas_payment_id, payment_status")
    .eq("id", inscricaoId)
    .eq("torneio_id", torneioId)
    .maybeSingle();
  if (!inscricao) return { ok: false, message: "Inscrição não encontrada." };

  if (inscricao.asaas_payment_id && isPaidPaymentStatus(inscricao.payment_status)) {
    try {
      await refundAsaasPayment(inscricao.asaas_payment_id);
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Falha ao estornar no Asaas." };
    }
  }

  const { error } = await supabase
    .from("torneio_inscricoes")
    .update({
      status_inscricao: "cancelada",
      payment_status: "refunded",
      cancelado_em: new Date().toISOString(),
      cancelado_por_usuario_id: user.id,
      estornado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", inscricaoId)
    .eq("torneio_id", torneioId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/torneios/${torneioId}/operacao`);
  revalidatePath(`/torneios/${torneioId}`);
  return { ok: true, message: "Inscrição cancelada e estorno processado." };
}

export async function organizerSubstituirInscricao(
  _prev: TorneioStaffActionState | undefined,
  formData: FormData
): Promise<TorneioStaffActionState> {
  const contextState = await getAuthContextState();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };
  if (contextState.papeis.includes("organizador") && contextState.activeContext !== "organizador") {
    return { ok: false, message: "Troque para o Modo Organizador para substituir inscritos." };
  }

  const torneioId = numOrNull(formData.get("torneio_id"));
  const inscricaoId = numOrNull(formData.get("inscricao_id"));
  const novoUsuarioId = String(formData.get("novo_usuario_id") ?? "").trim();
  if (!torneioId || !inscricaoId || !novoUsuarioId) return { ok: false, message: "Dados inválidos." };

  const { data: torneio } = await supabase.from("torneios").select("criador_id").eq("id", torneioId).maybeSingle();
  if (!torneio || torneio.criador_id !== user.id) return { ok: false, message: "Sem permissão." };

  const { data: original } = await supabase
    .from("torneio_inscricoes")
    .select("id, tipo_inscricao, valor_taxa_plataforma_fixa, valor_total_cobranca, valor_para_organizador")
    .eq("id", inscricaoId)
    .eq("torneio_id", torneioId)
    .maybeSingle();
  if (!original) return { ok: false, message: "Inscrição original não encontrada." };
  if (original.tipo_inscricao !== "atleta") {
    return { ok: false, message: "Substituição automática é permitida somente para inscrição individual." };
  }

  const { data: jaExiste } = await supabase
    .from("torneio_inscricoes")
    .select("id")
    .eq("torneio_id", torneioId)
    .eq("usuario_id", novoUsuarioId)
    .maybeSingle();
  if (jaExiste) return { ok: false, message: "O novo atleta já possui inscrição neste torneio." };

  const { data: nova, error: insErr } = await supabase
    .from("torneio_inscricoes")
    .insert({
      torneio_id: torneioId,
      usuario_id: novoUsuarioId,
      tipo_inscricao: "atleta",
      pagante_usuario_id: novoUsuarioId,
      payment_status: "pending",
      status_inscricao: "pendente",
      valor_taxa_plataforma_fixa: original.valor_taxa_plataforma_fixa,
      valor_total_cobranca: original.valor_total_cobranca,
      valor_para_organizador: original.valor_para_organizador,
    })
    .select("id")
    .single();
  if (insErr) return { ok: false, message: insErr.message };

  await supabase
    .from("torneio_inscricoes")
    .update({
      status_inscricao: "substituida",
      payment_status: "replaced",
      substituido_por_inscricao_id: nova.id,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", inscricaoId)
    .eq("torneio_id", torneioId);

  revalidatePath(`/torneios/${torneioId}/operacao`);
  revalidatePath(`/torneios/${torneioId}`);
  return { ok: true, message: "Inscrição substituída. O novo atleta precisa concluir o pagamento para entrar." };
}

export async function gerarChaveTorneio(
  _prev: TorneioStaffActionState | undefined,
  formData: FormData
): Promise<TorneioStaffActionState> {
  const contextState = await getAuthContextState();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };
  if (contextState.papeis.includes("organizador") && contextState.activeContext !== "organizador") {
    return { ok: false, message: "Troque para o Modo Organizador para gerar a chave." };
  }

  const torneioId = numOrNull(formData.get("torneio_id"));
  if (!torneioId) return { ok: false, message: "Torneio inválido." };

  const { data: torneio } = await supabase
    .from("torneios")
    .select("id, criador_id, esporte_id, formato_competicao, regras_placar_json")
    .eq("id", torneioId)
    .maybeSingle();
  if (!torneio || torneio.criador_id !== user.id) {
    return { ok: false, message: "Somente o organizador pode gerar a chave." };
  }

  const strategy = (String(formData.get("draw_strategy") ?? "eid").trim().toLowerCase() || "eid") as DrawStrategy;
  const manualOrder = String(formData.get("manual_order") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const groupCount = Math.max(2, Number(formData.get("group_count") ?? 2) || 2);
  const regras = parseRegrasPlacarJson(torneio.regras_placar_json);
  const modalidade =
    regras?.modalidade_participacao === "dupla"
      ? "dupla"
      : regras?.modalidade_participacao === "equipe"
        ? "equipe"
        : "individual";

  const { data: inscricoes } = await supabase
    .from("torneio_inscricoes")
    .select("id, usuario_id, status_inscricao")
    .eq("torneio_id", torneioId)
    .in("status_inscricao", ["pendente", "confirmada", "aprovada"]);

  const participantesBase = inscricoes ?? [];
  if (participantesBase.length < 2) {
    return { ok: false, message: "Cadastre ao menos 2 inscrições para gerar a chave." };
  }

  const usuarioIds = [...new Set(participantesBase.map((item) => String(item.usuario_id ?? "")).filter(Boolean))];
  const [{ data: profiles }, { data: eids }] = await Promise.all([
    supabase.from("profiles").select("id, nome").in("id", usuarioIds),
    torneio.esporte_id
      ? supabase.from("usuario_eid").select("usuario_id, nota_eid").eq("esporte_id", torneio.esporte_id).in("usuario_id", usuarioIds)
      : Promise.resolve({ data: [] as Array<{ usuario_id: string; nota_eid: number | null }> }),
  ]);
  const profileMap = new Map((profiles ?? []).map((profile) => [String(profile.id), profile.nome ?? "Atleta"]));
  const eidMap = new Map((eids ?? []).map((row) => [String(row.usuario_id), Number(row.nota_eid ?? 0)]));

  const generated = generateTorneioDraw({
    torneioId,
    strategy,
    modalidade,
    formatoCompeticao: torneio.formato_competicao,
    manualOrder,
    groupCount,
    participants: participantesBase.map((item) => ({
      inscricaoId: Number(item.id),
      entityId: String(item.usuario_id),
      nome: profileMap.get(String(item.usuario_id)) ?? "Atleta",
      eid: eidMap.get(String(item.usuario_id)) ?? 0,
    })),
  });

  await supabase.from("torneio_jogos").delete().eq("torneio_id", torneioId);

  if (generated.jogos.length > 0) {
    const { error: jogosErr } = await supabase.from("torneio_jogos").insert(generated.jogos);
    if (jogosErr) return { ok: false, message: jogosErr.message };
  }

  for (const seedRow of generated.seedOrder) {
    await supabase
      .from("torneio_inscricoes")
      .update({ seed_ordem: seedRow.seed })
      .eq("id", seedRow.inscricaoId)
      .eq("torneio_id", torneioId);
  }

  const { error: chaveErr } = await supabase.from("torneio_chaves").upsert(
    {
      torneio_id: torneioId,
      formato: generated.meta.formato,
      dados_json: generated,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "torneio_id" }
  );
  if (chaveErr) return { ok: false, message: chaveErr.message };

  revalidatePath(`/torneios/${torneioId}/chave`);
  revalidatePath(`/torneios/${torneioId}`);
  revalidatePath(`/torneios/${torneioId}/operacao`);
  return { ok: true, message: "Chave gerada em modo rascunho." };
}

export async function publicarChaveTorneio(formData: FormData): Promise<void> {
  const contextState = await getAuthContextState();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || (contextState.papeis.includes("organizador") && contextState.activeContext !== "organizador")) return;

  const torneioId = numOrNull(formData.get("torneio_id"));
  if (!torneioId) return;
  const { data: torneio } = await supabase.from("torneios").select("criador_id").eq("id", torneioId).maybeSingle();
  if (!torneio || torneio.criador_id !== user.id) return;

  const { data: chave } = await supabase.from("torneio_chaves").select("dados_json").eq("torneio_id", torneioId).maybeSingle();
  if (!chave?.dados_json || typeof chave.dados_json !== "object") return;

  const payload = chave.dados_json as Record<string, unknown>;
  const meta =
    payload.meta && typeof payload.meta === "object"
      ? { ...(payload.meta as Record<string, unknown>) }
      : {};
  meta.publicado = true;
  meta.publicado_em = new Date().toISOString();

  await supabase
    .from("torneio_chaves")
    .update({
      dados_json: {
        ...payload,
        meta,
      },
      atualizado_em: new Date().toISOString(),
    })
    .eq("torneio_id", torneioId);

  revalidatePath(`/torneios/${torneioId}/chave`);
  revalidatePath(`/torneios/${torneioId}`);
}
