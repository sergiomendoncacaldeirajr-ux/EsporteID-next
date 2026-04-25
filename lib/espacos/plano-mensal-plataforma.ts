import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanoMensalPj = {
  id: number;
  espaco_generico_id: number | null;
  nome: string;
  categoria_espaco: string;
  min_unidades: number;
  max_unidades: number | null;
  valor_mensal_centavos: number;
  socios_mensal_modo: string;
  liberacao: string;
  ativo: boolean;
  ordem: number;
};

/**
 * Plano de catálogo (global) que se aplica ao número de unidades/quadras.
 */
export function selecionarPlanoCatalogo(
  planos: PlanoMensalPj[],
  categoria: string,
  nUnidades: number
): PlanoMensalPj | null {
  const n = Math.max(0, Math.floor(nUnidades));
  const candidatos = planos.filter(
    (p) =>
      p.espaco_generico_id == null &&
      p.ativo &&
      p.categoria_espaco === categoria &&
      p.liberacao === "publico" &&
      n >= p.min_unidades &&
      (p.max_unidades == null || n <= p.max_unidades)
  );
  if (candidatos.length === 0) return null;
  candidatos.sort((a, b) => a.ordem - b.ordem || a.id - b.id);
  return candidatos[0] ?? null;
}

export async function contarUnidadesAtivas(supabase: SupabaseClient, espacoId: number): Promise<number> {
  const { count, error } = await supabase
    .from("espaco_unidades")
    .select("id", { count: "exact", head: true })
    .eq("espaco_generico_id", espacoId)
    .eq("ativo", true);
  if (error) return 0;
  return count ?? 0;
}
