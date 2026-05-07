import type { SupabaseClient } from "@supabase/supabase-js";

/** URL pública do espaço principal vinculado ao usuário (dono ou quem cadastrou). */
export async function resolveEspacoPublicPathForUsuario(
  supabase: SupabaseClient,
  usuarioId: string
): Promise<string | null> {
  const { data: row } = await supabase
    .from("espacos_genericos")
    .select("id, slug")
    .or(`responsavel_usuario_id.eq.${usuarioId},criado_por_usuario_id.eq.${usuarioId}`)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row?.id) return null;
  if (row.slug) return `/espaco/${row.slug}`;
  return `/local/${row.id}`;
}
