"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function cadastrarLocalGenerico(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/locais/cadastrar");
  }

  const nome = String(formData.get("nome_publico") ?? "").trim();
  const localizacao = String(formData.get("localizacao") ?? "").trim();

  if (nome.length < 2) {
    redirect("/locais/cadastrar?erro=nome");
  }
  if (localizacao.length < 3) {
    redirect("/locais/cadastrar?erro=local");
  }

  const { data, error } = await supabase
    .from("espacos_genericos")
    .insert({
      nome_publico: nome,
      localizacao,
      criado_por_usuario_id: user.id,
      responsavel_usuario_id: user.id,
      esportes_ids: "[]",
      status: "publico",
      ativo_listagem: true,
    })
    .select("id")
    .single();

  if (error) {
    redirect("/locais/cadastrar?erro=gravacao");
  }

  revalidatePath("/locais");
  revalidatePath("/dashboard");
  redirect(`/local/${data.id}?from=/locais/cadastrar`);
}
