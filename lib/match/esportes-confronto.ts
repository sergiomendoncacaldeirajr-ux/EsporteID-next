import { cache } from "react";
import { getServerAuth } from "@/lib/auth/rsc-auth";

export type EsporteConfrontoRow = { id: number; nome: string | null };

/** Uma leitura por request RSC (React.cache) — lista de esportes muda raramente. */
export const getEsportesConfrontoCached = cache(async (): Promise<EsporteConfrontoRow[]> => {
  const { supabase } = await getServerAuth();
  const { data } = await supabase
    .from("esportes")
    .select("id, nome, categoria_processamento")
    .eq("ativo", true)
    .eq("categoria_processamento", "confronto")
    .order("ordem", { ascending: true });
  return (data ?? []).map((e) => ({ id: e.id, nome: e.nome }));
});
