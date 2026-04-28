"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findDuplicateEspaco, isEspacoDuplicateError } from "@/lib/espacos/duplicate";

export type LocalActionState = { ok: true; message: string } | { ok: false; message: string };

function checkboxOn(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

export async function atualizarMeuLocal(
  _prev: LocalActionState | undefined,
  formData: FormData
): Promise<LocalActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada." };

  const espacoId = Number(formData.get("espaco_id") ?? 0);
  if (!Number.isInteger(espacoId) || espacoId < 1) return { ok: false, message: "Local inválido." };

  const { data: row } = await supabase
    .from("espacos_genericos")
    .select("id, criado_por_usuario_id, responsavel_usuario_id")
    .eq("id", espacoId)
    .maybeSingle();

  const pode =
    row &&
    row.responsavel_usuario_id === user.id;
  if (!pode) return { ok: false, message: "Sem permissão para editar este local." };

  const nome = String(formData.get("nome_publico") ?? "").trim();
  const localizacao = String(formData.get("localizacao") ?? "").trim();
  const logoRaw = String(formData.get("logo_arquivo") ?? "").trim();
  const tipo_quadra = String(formData.get("tipo_quadra") ?? "").trim() || null;
  const lat = String(formData.get("lat") ?? "").trim() || null;
  const lng = String(formData.get("lng") ?? "").trim() || null;

  if (nome.length < 2) return { ok: false, message: "Nome do local inválido." };
  if (localizacao.length < 3) return { ok: false, message: "Informe cidade/região ou endereço (mín. 3 caracteres)." };

  const duplicado = await findDuplicateEspaco(supabase, {
    nomePublico: nome,
    localizacao,
    ignoreId: espacoId,
  });
  if (duplicado) {
    return {
      ok: false,
      message: `Já existe um espaço com esse nome em ${duplicado.localizacao ?? "esta localização"}.`,
    };
  }

  const { error } = await supabase
    .from("espacos_genericos")
    .update({
      nome_publico: nome,
      localizacao,
      logo_arquivo: logoRaw || null,
      tipo_quadra,
      lat,
      lng,
      aceita_reserva: checkboxOn(formData, "aceita_reserva"),
      ativo_listagem: checkboxOn(formData, "ativo_listagem"),
    })
    .eq("id", espacoId);

  if (error) {
    if (isEspacoDuplicateError(error)) {
      return { ok: false, message: "Já existe um espaço com esse nome nesta localização." };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath(`/local/${espacoId}`);
  revalidatePath(`/conta/local/${espacoId}`);
  revalidatePath("/locais");
  revalidatePath("/dashboard");
  return { ok: true, message: "Local atualizado." };
}

export async function solicitarPropriedadeOficialLocal(
  _prev: LocalActionState | undefined,
  formData: FormData
): Promise<LocalActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const espacoId = Number(formData.get("espaco_id") ?? 0);
  const mensagem = String(formData.get("mensagem") ?? "").trim() || null;
  const documento = formData.get("documento");

  if (!Number.isInteger(espacoId) || espacoId < 1) {
    return { ok: false, message: "Espaço inválido." };
  }
  if (!(documento instanceof File) || documento.size <= 0) {
    return { ok: false, message: "Envie o documento comprobatório para solicitar a posse oficial." };
  }

  const { data: espaco } = await supabase
    .from("espacos_genericos")
    .select("id, slug, nome_publico, criado_por_usuario_id, responsavel_usuario_id, ownership_status")
    .eq("id", espacoId)
    .maybeSingle();

  if (!espaco) return { ok: false, message: "Espaço não encontrado." };
  if (espaco.responsavel_usuario_id === user.id) {
    return { ok: false, message: "Você já está vinculado a este espaço." };
  }

  const { data: pendente } = await supabase
    .from("espaco_reivindicacoes")
    .select("id, status")
    .eq("espaco_generico_id", espacoId)
    .eq("solicitante_id", user.id)
    .eq("status", "pendente")
    .maybeSingle();

  if (pendente) {
    return { ok: true, message: "Seu pedido já está em análise pelo admin do EsporteID." };
  }

  const ext = (documento.name.split(".").pop() || "pdf").toLowerCase();
  const docPath = `${user.id}/claim_${espacoId}_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
  const upload = await supabase.storage.from("espaco-documentos").upload(docPath, documento, {
    upsert: true,
    contentType: documento.type || "application/octet-stream",
  });

  if (upload.error) {
    return { ok: false, message: "Não foi possível enviar o documento agora. Tente novamente em instantes." };
  }

  const { error } = await supabase.from("espaco_reivindicacoes").insert({
    espaco_generico_id: espacoId,
    solicitante_id: user.id,
    documento_arquivo: docPath,
    mensagem,
    status: "pendente",
    revisado_por_usuario_id: null,
    revisado_em: null,
    observacoes_admin: null,
  });

  if (error) return { ok: false, message: error.message };

  await supabase
    .from("espacos_genericos")
    .update({
      ownership_status: "pendente_validacao",
      onboarding_documental_status: "em_analise",
    })
    .eq("id", espacoId);

  revalidatePath(`/local/${espacoId}`);
  if (espaco.slug) revalidatePath(`/espaco/${espaco.slug}`);
  revalidatePath("/admin/locais");
  return { ok: true, message: "Pedido enviado. O documento será analisado pelo admin do EsporteID." };
}
