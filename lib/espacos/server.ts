import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Um login = um espaço gerido: criador ou responsável de qualquer `espacos_genericos`. */
export async function usuarioJaGerenciaEspaco(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("espacos_genericos")
    .select("id")
    .or(`criado_por_usuario_id.eq.${userId},responsavel_usuario_id.eq.${userId}`)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

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
  categoria_mensalidade: string | null;
  modo_reserva: string | null;
  modo_monetizacao: string | null;
  associacao_regra_json: unknown;
  clube_assinaturas_socios: string | null;
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
      "id, slug, nome_publico, localizacao, cidade, uf, criado_por_usuario_id, responsavel_usuario_id, cover_arquivo, whatsapp_contato, email_contato, website_url, instagram_url, descricao_curta, descricao_longa, aceita_socios, permite_professores_aprovados, ativo_listagem, operacao_status, configuracao_reservas_json, categoria_mensalidade, modo_reserva, modo_monetizacao, associacao_regra_json, clube_assinaturas_socios"
    )
    .or(`criado_por_usuario_id.eq.${user.id},responsavel_usuario_id.eq.${user.id}`)
    .order("id", { ascending: false })
    .limit(1);
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
  /** Ignorado: cada conta gerencia no máximo um espaço. */
  espacoId?: number | null;
}) {
  void espacoId;
  const ctx = await requireEspacoManagerUser(nextPath);
  const selected = ctx.managedSpaces[0] ?? null;
  if (!selected) {
    redirect("/locais/cadastrar?modo=espaco");
  }
  return { ...ctx, selectedSpace: selected };
}
