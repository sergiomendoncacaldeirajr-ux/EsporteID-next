import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ManagedSpace = {
  id: number;
  slug: string | null;
  nome_publico: string;
  localizacao: string | null;
  cidade: string | null;
  uf: string | null;
  criado_por_usuario_id: string | null;
  responsavel_usuario_id: string | null;
  cover_arquivo: string | null;
  whatsapp_contato: string | null;
  email_contato: string | null;
  website_url: string | null;
  instagram_url: string | null;
  descricao_curta: string | null;
  descricao_longa: string | null;
  aceita_socios: boolean | null;
  permite_professores_aprovados: boolean | null;
  ativo_listagem: boolean | null;
  operacao_status: string | null;
  configuracao_reservas_json: unknown;
};

export async function requireEspacoManagerUser(nextPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: managedSpaces, error } = await supabase
    .from("espacos_genericos")
    .select(
      "id, slug, nome_publico, localizacao, cidade, uf, criado_por_usuario_id, responsavel_usuario_id, cover_arquivo, whatsapp_contato, email_contato, website_url, instagram_url, descricao_curta, descricao_longa, aceita_socios, permite_professores_aprovados, ativo_listagem, operacao_status, configuracao_reservas_json"
    )
    .or(`criado_por_usuario_id.eq.${user.id},responsavel_usuario_id.eq.${user.id}`)
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);

  if (!(managedSpaces ?? []).length) {
    redirect("/locais/cadastrar?modo=espaco");
  }

  return {
    supabase,
    user,
    managedSpaces: (managedSpaces ?? []) as ManagedSpace[],
  };
}

export async function getEspacoSelecionado({
  nextPath,
  espacoId,
}: {
  nextPath: string;
  espacoId?: number | null;
}) {
  const ctx = await requireEspacoManagerUser(nextPath);
  const selected =
    ctx.managedSpaces.find((item) => item.id === espacoId) ??
    ctx.managedSpaces[0] ??
    null;
  if (!selected) {
    redirect("/locais/cadastrar?modo=espaco");
  }
  return { ...ctx, selectedSpace: selected };
}
