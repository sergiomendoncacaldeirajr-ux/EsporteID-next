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
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { supabase, user: user ?? null };
  } catch (e) {
    const digest = typeof e === "object" && e !== null && "digest" in e ? String((e as { digest?: string }).digest) : "";
    if (digest === "DYNAMIC_SERVER_USAGE") {
      console.error(
        "[eid-auth] getServerAuth em contexto estático — o layout raiz deve usar export const dynamic = \"force-dynamic\" (OpenNext / Cloudflare).",
        e
      );
    } else {
      console.error("[eid-auth] getServerAuth falhou (Supabase / cookies / rede)", e);
    }
    throw e;
  }
});

/**
 * Papéis do usuário, deduplicados no mesmo request (layout + getAuthContextState, etc.).
 */
export const getCachedUsuarioPapeis = cache(async (userId: string) => {
  const { supabase } = await getServerAuth();
  const { data: papeisRows } = await supabase.from("usuario_papeis").select("papel").eq("usuario_id", userId);
  return listarPapeis(papeisRows);
});
