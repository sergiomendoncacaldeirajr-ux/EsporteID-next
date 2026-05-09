"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { findDuplicateEspaco, findDuplicateEspacoByNome, isEspacoDuplicateError } from "@/lib/espacos/duplicate";
import { usuarioJaGerenciaEspaco } from "@/lib/espacos/server";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { createClient } from "@/lib/supabase/server";
import { normalizePtBrNameCase, normalizePtBrNameCaseLoose } from "@/lib/text/pt-br-name-case";

export async function cadastrarLocalGenerico(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/locais/cadastrar");
  }
  if (await usuarioJaGerenciaEspaco(user.id)) {
    redirect("/espaco");
  }

  const nome = normalizePtBrNameCase(String(formData.get("nome_publico") ?? ""));
  const endereco = normalizePtBrNameCaseLoose(String(formData.get("endereco") ?? ""));
  const numero = String(formData.get("numero") ?? "").trim();
  const bairro = normalizePtBrNameCase(String(formData.get("bairro") ?? ""));
  const cidade = normalizePtBrNameCase(String(formData.get("cidade") ?? ""));
  const uf = String(formData.get("estado") ?? "").trim().toUpperCase();
  const cep = String(formData.get("cep") ?? "").trim();
  const complemento = normalizePtBrNameCaseLoose(String(formData.get("complemento") ?? ""));
  const lat = String(formData.get("lat") ?? "").trim() || null;
  const lng = String(formData.get("lng") ?? "").trim() || null;
  const localizacao = normalizePtBrNameCaseLoose([cidade, uf].filter(Boolean).join(" - "));
  const returnTo = resolveBackHref(String(formData.get("return_to") ?? "").trim(), "/locais/cadastrar");
  const returnToQs = returnTo !== "/locais/cadastrar" ? `&return_to=${encodeURIComponent(returnTo)}` : "";
  const logoFile = formData.get("logo_file");
  const espacoIdReivindicadoRaw = String(formData.get("espaco_id_reivindicado") ?? "").trim();
  const espacoIdReivindicado = espacoIdReivindicadoRaw ? Number(espacoIdReivindicadoRaw) : null;
  const isClaimMode = Number.isFinite(espacoIdReivindicado) && (espacoIdReivindicado ?? 0) > 0;

  if (nome.length < 2) {
    redirect(`/locais/cadastrar?erro=nome${returnToQs}`);
  }

  if (endereco.length < 3 || numero.length < 1 || cidade.length < 2 || uf.length < 2) {
    redirect(`/locais/cadastrar?erro=local${returnToQs}`);
  }

  let logoPublicUrl: string | null = null;
  if (logoFile instanceof File && logoFile.size > 0) {
    if (!logoFile.type.startsWith("image/")) {
      redirect(`/locais/cadastrar?erro=gravacao${returnToQs}`);
    }
    if (logoFile.size > 5 * 1024 * 1024) {
      redirect(`/locais/cadastrar?erro=gravacao${returnToQs}`);
    }
    const originalName = logoFile.name || "logo";
    const ext = originalName.includes(".") ? originalName.split(".").pop()?.toLowerCase() ?? "jpg" : "jpg";
    const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${user.id}/local_generico_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${safeExt}`;
    const up = await supabase.storage.from("espaco-logos").upload(path, logoFile, {
      upsert: true,
      contentType: logoFile.type || "image/jpeg",
    });
    if (up.error) {
      redirect(`/locais/cadastrar?erro=gravacao${returnToQs}`);
    }
    logoPublicUrl = supabase.storage.from("espaco-logos").getPublicUrl(path).data.publicUrl;
  }

  // ── Claim mode: update espaco data + create reivindicacao record ──────────
  if (isClaimMode) {
    const venueConfigJson = JSON.stringify({
      endereco,
      numero,
      bairro: bairro || null,
      cidade,
      estado: uf,
      cep: cep || null,
      complemento: complemento || null,
      origem: "reivindicacao-dono",
    });
    const updatePayload: Record<string, unknown> = {
      nome_publico: nome,
      localizacao,
      cidade,
      uf,
      lat,
      lng,
      venue_config_json: venueConfigJson,
      ownership_status: "pendente_validacao",
    };
    if (logoPublicUrl) updatePayload.logo_arquivo = logoPublicUrl;

    // Update the espaco with the corrected data and mark pending validation
    const { error: updateErr } = await supabase
      .from("espacos_genericos")
      .update(updatePayload)
      .eq("id", espacoIdReivindicado!);
    if (updateErr) redirect(`/locais/cadastrar?erro=gravacao${returnToQs}`);

    // Create a formal reivindicação record for admin review
    await supabase.from("espaco_reivindicacoes").insert({
      espaco_generico_id: espacoIdReivindicado,
      solicitante_id: user.id,
      mensagem: `Solicitação de posse via cadastro de local (dados confirmados/atualizados pelo usuário).`,
      status: "pendente",
      revisado_por_usuario_id: null,
      revisado_em: null,
      observacoes_admin: null,
    });

    revalidatePath("/locais");
    revalidatePath("/dashboard");
    redirect(
      `/locais/cadastrar?sucesso=1&novo_local_nome=${encodeURIComponent(nome)}&id=${encodeURIComponent(String(espacoIdReivindicado))}${returnToQs ?? ""}`
    );
  }

  // ── Create mode (normal flow) ─────────────────────────────────────────────
  const duplicadoNome = await findDuplicateEspacoByNome(supabase, nome);
  if (duplicadoNome) {
    redirect(`/locais/cadastrar?erro=nome_dup&id=${duplicadoNome.id}${returnToQs}`);
  }

  const duplicado = await findDuplicateEspaco(supabase, {
    nomePublico: nome,
    localizacao,
  });
  if (duplicado) {
    redirect(`/locais/cadastrar?erro=duplicado&id=${duplicado.id}${returnToQs}`);
  }

  const { data, error } = await supabase
    .from("espacos_genericos")
    .insert({
      nome_publico: nome,
      localizacao,
      logo_arquivo: logoPublicUrl,
      cidade,
      uf,
      lat,
      lng,
      venue_config_json: JSON.stringify({
        endereco,
        numero,
        bairro: bairro || null,
        cidade,
        estado: uf,
        cep: cep || null,
        complemento: complemento || null,
        origem: "cadastro-local-generico",
      }),
      criado_por_usuario_id: user.id,
      responsavel_usuario_id: null,
      esportes_ids: "[]",
      status: "publico",
      ownership_status: "generico",
      ativo_listagem: false,
    })
    .select("id")
    .single();

  if (error) {
    if (isEspacoDuplicateError(error)) {
      redirect(`/locais/cadastrar?erro=duplicado${returnToQs}`);
    }
    redirect(`/locais/cadastrar?erro=gravacao${returnToQs}`);
  }

  revalidatePath("/locais");
  revalidatePath("/dashboard");
  if (returnTo !== "/locais/cadastrar") {
    const qp = new URLSearchParams();
    qp.set("novo_local_id", String(data.id));
    qp.set("novo_local_nome", nome);
    qp.set("novo_local_localizacao", localizacao);
    const sep = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${sep}${qp.toString()}`);
  }
  redirect(
    `/locais/cadastrar?sucesso=1&novo_local_nome=${encodeURIComponent(nome)}&id=${encodeURIComponent(String(data.id))}${
      returnToQs ? returnToQs : ""
    }`
  );
}
