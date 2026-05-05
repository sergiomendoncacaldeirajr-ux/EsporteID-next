import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/env/supabase-public";

export function createClient() {
  const cfg = getSupabasePublicEnv();
  if (!cfg) {
    throw new Error(
      "EID_SUPABASE_CONFIG_MISSING: credenciais NEXT_PUBLIC_* ausentes. Cloudflare Pages → Environment variables."
    );
  }
  const isProd = process.env.NODE_ENV === "production";
  return createBrowserClient(cfg.url, cfg.anon, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: isProd,
    },
  });
}
