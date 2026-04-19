"use server";

import { revalidatePath } from "next/cache";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { createClient } from "@/lib/supabase/server";

export type AceitarResult = { ok: true } | { ok: false; message: string };

export async function aceitarTermosEprivacidade(
  _prev: AceitarResult | undefined,
  formData: FormData
): Promise<AceitarResult> {
  const aceiteTermos = formData.get("aceite_termos") === "on";
  const aceitePriv = formData.get("aceite_privacidade") === "on";
  const marketing = formData.get("marketing") === "on";

  if (!aceiteTermos || !aceitePriv) {
    return {
      ok: false,
      message:
        "É necessário aceitar os Termos de Uso e a Política de Privacidade para continuar.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Sessão expirada. Faça login novamente." };
  }

  const agora = new Date().toISOString();

  const { error: upErr } = await supabase
    .from("profiles")
    .update({
      termos_versao: LEGAL_VERSIONS.termos,
      termos_aceitos_em: agora,
      privacidade_versao: LEGAL_VERSIONS.privacidade,
      privacidade_aceitos_em: agora,
      marketing_opt_in: marketing,
      marketing_opt_in_em: marketing ? agora : null,
    })
    .eq("id", user.id);

  if (upErr) {
    return { ok: false, message: upErr.message };
  }

  await supabase.from("consentimentos_log").insert({
    usuario_id: user.id,
    evento: "termos_e_privacidade_aceitos",
    versao: LEGAL_VERSIONS.termos,
    detalhes_json: {
      privacidade_versao: LEGAL_VERSIONS.privacidade,
      marketing_opt_in: marketing,
    },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
