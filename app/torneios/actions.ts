"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { usuarioPodeCriarTorneio } from "@/lib/torneios/organizador";
import { parseRegrasPlacarJson } from "@/lib/torneios/regras";

function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function criarTorneo(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/torneios/criar");

  const pode = await usuarioPodeCriarTorneio(supabase, user.id);
  if (!pode) redirect("/torneios/criar?erro=permissao");

  const nome = String(formData.get("nome") ?? "").trim();
  const esporteId = numOrNull(formData.get("esporte_id"));
  const status = String(formData.get("status") ?? "aberto").trim() || "aberto";
  const dataInicio = String(formData.get("data_inicio") ?? "").trim() || null;
  const dataFim = String(formData.get("data_fim") ?? "").trim() || null;
  const valorInscricao = Number(String(formData.get("valor_inscricao") ?? "0").replace(",", ".")) || 0;
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const regulamento = String(formData.get("regulamento") ?? "").trim() || null;
  const premios = String(formData.get("premios") ?? "").trim() || null;
  const formatoCompeticao = String(formData.get("formato_competicao") ?? "").trim() || null;
  const criterioDesempate = String(formData.get("criterio_desempate") ?? "").trim() || "sets";
  const banner = String(formData.get("banner") ?? "").trim() || null;
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
      descricao,
      regulamento,
      premios,
      formato_competicao: formatoCompeticao,
      criterio_desempate: criterioDesempate,
      regras_placar_json: regrasPlacarJson,
      banner,
      criador_id: user.id,
      espaco_generico_id: espacoGenericoId,
    })
    .select("id")
    .single();

  if (error) redirect("/torneios/criar?erro=gravacao");

  revalidatePath("/torneios");
  redirect(`/torneios/${data.id}?from=/torneios/criar`);
}

export type TorneioUpdateState = { ok: true; message: string } | { ok: false; message: string };

export async function atualizarMeuTorneio(
  _prev: TorneioUpdateState | undefined,
  formData: FormData
): Promise<TorneioUpdateState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

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
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const regulamento = String(formData.get("regulamento") ?? "").trim() || null;
  const premios = String(formData.get("premios") ?? "").trim() || null;
  const formatoCompeticao = String(formData.get("formato_competicao") ?? "").trim() || null;
  const criterioDesempate = String(formData.get("criterio_desempate") ?? "").trim() || "sets";
  const banner = String(formData.get("banner") ?? "").trim() || null;
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
      descricao,
      regulamento,
      premios,
      formato_competicao: formatoCompeticao,
      criterio_desempate: criterioDesempate,
      regras_placar_json: regrasPlacarJson,
      banner,
      espaco_generico_id: espacoGenericoId,
    })
    .eq("id", torneioId)
    .eq("criador_id", user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/torneios/${torneioId}`);
  revalidatePath(`/conta/torneio/${torneioId}`);
  revalidatePath("/torneios");
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
    .select("id, status, criador_id, regras_placar_json")
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

  const { data: existente } = await supabase
    .from("torneio_inscricoes")
    .select("id")
    .eq("torneio_id", torneioId)
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (existente) {
    redirect(`/torneios/${torneioId}?erro=ja_inscrito`);
  }

  const { error } = await supabase.from("torneio_inscricoes").insert({
    torneio_id: torneioId,
    usuario_id: user.id,
    payment_status: "pending",
    status_inscricao: "pendente",
  });

  if (error) {
    redirect(`/torneios/${torneioId}?erro=inscricao`);
  }

  revalidatePath(`/torneios/${torneioId}`);
  revalidatePath("/torneios");
  redirect(`/torneios/${torneioId}?ok=inscricao`);
}
