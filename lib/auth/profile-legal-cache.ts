import { cache } from "react";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";

/**
 * Uma leitura de `profiles` (só colunas LGPD) por request.
 * Compartilhada entre `app/layout.tsx` e `LegalGateDeferred` (evita 2× a mesma query).
 */
export const getCachedProfileLegalRow = cache(async (userId: string) => {
  const { supabase } = await getServerAuth();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_LEGAL_ACCEPTANCE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  return data;
});
