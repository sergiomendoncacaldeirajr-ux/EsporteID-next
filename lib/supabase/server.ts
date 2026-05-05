import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "@/lib/env/supabase-public";

const isProd = process.env.NODE_ENV === "production";

export async function createClient() {
  const cfg = getSupabasePublicEnv();
  if (!cfg) {
    throw new Error(
      "EID_SUPABASE_CONFIG_MISSING: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (Cloudflare Pages: Production e Preview)."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(cfg.url, cfg.anon, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: isProd,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Chamado de Server Component; sessão costuma ser atualizada no middleware.
        }
      },
    },
  });
}

/** Route Handlers (ex.: `auth/callback`) — cookies podem ser gravados na resposta. */
export async function createRouteHandlerClient() {
  const cfg = getSupabasePublicEnv();
  if (!cfg) {
    throw new Error(
      "EID_SUPABASE_CONFIG_MISSING: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (Cloudflare Pages: Production e Preview)."
    );
  }
  const cookieStore = await cookies();
  return createServerClient(cfg.url, cfg.anon, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: isProd,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });
}
