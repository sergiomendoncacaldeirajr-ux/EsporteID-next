"use server";

import { revalidatePath } from "next/cache";
import { compareDocumentSelfie } from "@/lib/verificacao-idade/compare-document-selfie";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

const ALLOWED = new Set(["pendente_documento", "em_analise", "reprovado"]);

export type VerificacaoIdadeResult = { ok: true } | { ok: false; error: string };

export async function submeterVerificacaoIdade(formData: FormData): Promise<VerificacaoIdadeResult> {
  if (!hasServiceRoleConfig()) {
    return { ok: false, error: "Serviço indisponível (configuração)." };
  }

  const doc = formData.get("documento");
  const selfie = formData.get("selfie");
  if (!(doc instanceof File) || !(selfie instanceof File)) {
    return { ok: false, error: "Envie a foto do documento e a selfie." };
  }
  if (doc.size < 256 || selfie.size < 256 || doc.size > 10 * 1024 * 1024 || selfie.size > 10 * 1024 * 1024) {
    return { ok: false, error: "Tamanho de arquivo inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login." };

  const { data: row, error: profErr } = await supabase
    .from("profiles")
    .select("match_idade_gate")
    .eq("id", user.id)
    .maybeSingle();
  if (profErr || !row) return { ok: false, error: "Perfil não encontrado." };
  const gate = String(row.match_idade_gate ?? "ok");
  if (!ALLOWED.has(gate)) {
    return { ok: false, error: "Não há verificação pendente para sua conta." };
  }

  const uid = user.id;
  const ts = Date.now();
  const docPath = `${uid}/${ts}-documento.jpg`;
  const selfiePath = `${uid}/${ts}-selfie.jpg`;

  const docBuf = Buffer.from(await doc.arrayBuffer());
  const selfieBuf = Buffer.from(await selfie.arrayBuffer());

  const upDoc = await supabase.storage.from("verificacao-idade").upload(docPath, docBuf, {
    contentType: doc.type || "image/jpeg",
    upsert: false,
  });
  if (upDoc.error) return { ok: false, error: upDoc.error.message };

  const upSelfie = await supabase.storage.from("verificacao-idade").upload(selfiePath, selfieBuf, {
    contentType: selfie.type || "image/jpeg",
    upsert: false,
  });
  if (upSelfie.error) return { ok: false, error: upSelfie.error.message };

  let cmp: Awaited<ReturnType<typeof compareDocumentSelfie>>;
  try {
    cmp = await compareDocumentSelfie(selfieBuf, docBuf);
  } catch (e) {
    const svc = createServiceRoleClient();
    await svc.from("perfil_verificacao_idade").insert({
      usuario_id: uid,
      documento_storage_path: docPath,
      selfie_storage_path: selfiePath,
      provider: "erro",
      resultado: "erro_processamento",
      detalhes_json: { erro: String(e) },
      processado_em: new Date().toISOString(),
    });
    await svc.from("profiles").update({
      match_idade_gate: "reprovado",
      match_idade_gate_atualizado_em: new Date().toISOString(),
    }).eq("id", uid);
    await svc.from("admin_alertas").insert({
      tipo: "verificacao_idade",
      titulo: "Verificação de idade — erro técnico",
      corpo: `Usuário ${uid}: falha ao processar comparação facial.`,
      payload_json: { usuario_id: uid, erro: String(e) },
    });
    revalidatePath("/conta/verificacao-idade");
    revalidatePath("/dashboard");
    revalidatePath(`/perfil/${uid}`);
    return { ok: false, error: "Não foi possível concluir a verificação automática. Tente novamente ou contate o suporte." };
  }

  const resultado = cmp.approved ? "aprovado_automatico" : "reprovado_automatico";
  const novoGate = cmp.approved ? "aprovado" : "reprovado";

  const svc = createServiceRoleClient();
  await svc.from("perfil_verificacao_idade").insert({
    usuario_id: uid,
    documento_storage_path: docPath,
    selfie_storage_path: selfiePath,
    provider: cmp.provider,
    score_similaridade: cmp.similarity,
    resultado,
    detalhes_json: { ...cmp.details, similarity: cmp.similarity },
    processado_em: new Date().toISOString(),
  });

  await svc
    .from("profiles")
    .update({
      match_idade_gate: novoGate,
      match_idade_gate_atualizado_em: new Date().toISOString(),
    })
    .eq("id", uid);

  await svc.from("admin_alertas").insert({
    tipo: "verificacao_idade",
    titulo: cmp.approved ? "Verificação de idade — aprovada (automático)" : "Verificação de idade — reprovada (automático)",
    corpo: `Usuário ${uid}. Similaridade: ${cmp.similarity}. Provedor: ${cmp.provider}.`,
    payload_json: {
      usuario_id: uid,
      resultado,
      similarity: cmp.similarity,
      provider: cmp.provider,
    },
  });

  revalidatePath("/conta/verificacao-idade");
  revalidatePath("/dashboard");
  revalidatePath(`/perfil/${uid}`);
  revalidatePath("/admin");
  return { ok: true };
}
