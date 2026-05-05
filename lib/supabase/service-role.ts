import { createClient } from "@supabase/supabase-js";
import { parseSupabasePublicEnv } from "@/lib/env/supabase-public";

/**
 * Cliente com service role — **somente em Server Actions / Route Handlers / Server Components**
 * após confirmar `getIsPlatformAdmin()`. Nunca importar em componentes "use client".
 */
export function createServiceRoleClient() {
  const pub = parseSupabasePublicEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!pub || !key) {
    console.error("[eid-env] Service role: exige NEXT_PUBLIC_SUPABASE_* válidas e SUPABASE_SERVICE_ROLE_KEY");
    throw new Error("EID_SUPABASE_SERVICE_ROLE: URL/anon públicos e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  }
  return createClient(pub.url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function hasServiceRoleConfig(): boolean {
  return Boolean(parseSupabasePublicEnv() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
