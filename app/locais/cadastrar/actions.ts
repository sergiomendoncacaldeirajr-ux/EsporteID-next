"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { findDuplicateEspaco, isEspacoDuplicateError } from "@/lib/espacos/duplicate";
import { usuarioJaGerenciaEspaco } from "@/lib/espacos/server";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { createClient } from "@/lib/supabase/server";

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

  const nome = String(formData.get("nome_publico") ?? "").trim();
  const localizacao = String(formData.get("localizacao") ?? "").trim();
  const returnTo = resolveBackHref(String(formData.get("return_to") ?? "").trim(), "/locais/cadastrar");
  const logoFile = formData.get("logo_file");

  if (nome.length < 2) {
    redirect("/locais/cadastrar?erro=nome");
  }
  if (localizacao.length < 3) {
    redirect("/locais/cadastrar?erro=local");
  }

  const duplicado = await findDuplicateEspaco(supabase, {
    nomePublico: nome,
    localizacao,
  });
  if (duplicado) {
    redirect(`/locais/cadastrar?erro=duplicado&id=${duplicado.id}`);
  }

  let logoPublicUrl: string | null = null;
  if (logoFile instanceof File && logoFile.size > 0) {
    if (!logoFile.type.startsWith("image/")) {
      redirect("/locais/cadastrar?erro=gravacao");
    }
    if (logoFile.size > 5 * 1024 * 1024) {
      redirect("/locais/cadastrar?erro=gravacao");
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
      redirect("/locais/cadastrar?erro=gravacao");
    }
    logoPublicUrl = supabase.storage.from("espaco-logos").getPublicUrl(path).data.publicUrl;
  }

  const { data, error } = await supabase
    .from("espacos_genericos")
    .insert({
      nome_publico: nome,
      localizacao,
      logo_arquivo: logoPublicUrl,
      criado_por_usuario_id: user.id,
      responsavel_usuario_id: null,
      esportes_ids: "[]",
      status: "publico",
      ownership_status: "generico",
      ativo_listagem: true,
    })
    .select("id")
    .single();

  if (error) {
    if (isEspacoDuplicateError(error)) {
      redirect("/locais/cadastrar?erro=duplicado");
    }
    redirect("/locais/cadastrar?erro=gravacao");
  }

  revalidatePath("/locais");
  revalidatePath("/dashboard");
  if (returnTo !== "/locais/cadastrar") {
    const sep = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}${sep}novo_local_id=${data.id}`);
  }
  redirect(`/local/${data.id}?from=/locais/cadastrar`);
}
