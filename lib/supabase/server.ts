import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabasePublicConfig(): { url: string; anon: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;
  return { url, anon };
}

export async function createClient() {
  const cfg = getSupabasePublicConfig();
  if (!cfg) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes. Configure na Vercel (Production)."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(cfg.url, cfg.anon, {
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
  const cfg = getSupabasePublicConfig();
  if (!cfg) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes. Configure na Vercel (Production)."
    );
  }
  const cookieStore = await cookies();
  return createServerClient(cfg.url, cfg.anon, {
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
