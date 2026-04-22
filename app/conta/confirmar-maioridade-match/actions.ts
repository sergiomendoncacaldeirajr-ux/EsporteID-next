"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { buildMaioridadeComplianceMeta } from "@/lib/match/compliance-request-meta";
import { temMaioridade18 } from "@/lib/match/idade-maioridade";
import { safeNextInternalPath } from "@/lib/match/redirect-maioridade-match";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export type ConfirmarMaioridadeMatchResult =
  | { ok: true; next: string }
  | { ok: false; error: string };

export async function confirmarMaioridadeMatchAction(formData: FormData): Promise<ConfirmarMaioridadeMatchResult> {
  if (!hasServiceRoleConfig()) {
    return { ok: false, error: "Serviço temporariamente indisponível." };
  }

  const dataNascimento = String(formData.get("data_nascimento") ?? "").trim();
  const aceito = formData.get("aceito") === "on" || formData.get("aceito") === "true";
  const nextRaw = String(formData.get("next") ?? "").trim();
  const next = safeNextInternalPath(nextRaw || "/match");

  if (!aceito) {
    return { ok: false, error: "É necessário aceitar a declaração para continuar." };
  }
  if (!dataNascimento || !temMaioridade18(dataNascimento)) {
    return { ok: false, error: "Informe uma data de nascimento válida. É obrigatório ter 18 anos completos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login." };

  const { data: prof } = await supabase
    .from("profiles")
    .select("id, localizacao, lat, lng, match_maioridade_confirmada")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof) return { ok: false, error: "Perfil não encontrado." };
  if ((prof as { match_maioridade_confirmada?: boolean }).match_maioridade_confirmada) {
    return { ok: true, next };
  }

  const h = await headers();
  const meta = buildMaioridadeComplianceMeta(h);
  const agora = new Date().toISOString();
  const latN = Number((prof as { lat?: unknown }).lat);
  const lngN = Number((prof as { lng?: unknown }).lng);

  const svc = createServiceRoleClient();
  const { error: insErr } = await svc.from("match_maioridade_confirmacoes").insert({
    usuario_id: user.id,
    data_nascimento_declarada: dataNascimento,
    confirmado_em: agora,
    ip_publico: meta.ip_cliente,
    user_agent: meta.user_agent,
    accept_language: meta.accept_language,
    referer: meta.referer,
    host: meta.host,
    localizacao_perfil_snapshot: (prof as { localizacao?: string }).localizacao ?? null,
    lat_snapshot: Number.isFinite(latN) ? latN : null,
    lng_snapshot: Number.isFinite(lngN) ? lngN : null,
    pais_inferido: meta.pais_inferido,
    versao_declaracao: "match_maioridade_v1",
    detalhes_json: {
      ...meta.detalhes_json,
      finalidade: "liberacao_uso_match_18_mais",
      base_legal_observacao:
        "Registro de manifestação livre, informada e inequívoca para uso da funcionalidade Match (maioridade); conservado para comprovação e exercício de direitos (LGPD).",
    },
  });

  if (insErr) {
    return { ok: false, error: insErr.message };
  }

  const { error: upErr } = await svc
    .from("profiles")
    .update({
      match_maioridade_confirmada: true,
      match_maioridade_confirmada_em: agora,
      data_nascimento: dataNascimento,
      atualizado_em: agora,
    })
    .eq("id", user.id);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/match");
  revalidatePath("/desafio");
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${user.id}`);
  return { ok: true, next };
}
