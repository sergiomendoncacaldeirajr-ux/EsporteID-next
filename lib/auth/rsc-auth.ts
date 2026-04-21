import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { listarPapeis } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type ServerAuth = { supabase: SupabaseClient; user: User | null };

/**
 * Uma sessão Supabase + getUser por request RSC (React.cache).
 * Evita repetir auth.getUser quando layout, footer, LegalGate e páginas rodam no mesmo request.
 */
export const getServerAuth = cache(async (): Promise<ServerAuth> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user: user ?? null };
});

/**
 * Papéis do usuário, deduplicados no mesmo request (layout + getAuthContextState, etc.).
 */
export const getCachedUsuarioPapeis = cache(async (userId: string) => {
  const { supabase } = await getServerAuth();
  const { data: papeisRows } = await supabase.from("usuario_papeis").select("papel").eq("usuario_id", userId);
  return listarPapeis(papeisRows);
});
