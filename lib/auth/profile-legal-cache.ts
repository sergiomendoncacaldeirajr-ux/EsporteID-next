import { cache } from "react";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";

/**
 * Uma leitura de `profiles` por request: LGPD + `perfil_completo` (gate de rotas).
 * Compartilhada entre layout, LegalGate e páginas que só precisam desse gate (evita repetir query).
 */
export const getCachedProfileLegalRow = cache(async (userId: string) => {
  const { supabase } = await getServerAuth();
  const { data } = await supabase
    .from("profiles")
    .select(`perfil_completo, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`)
    .eq("id", userId)
    .maybeSingle();
  return data;
});
