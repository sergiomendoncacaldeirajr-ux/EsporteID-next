import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    throw new Error(
      "Configuração ausente: o app não encontrou as credenciais do Supabase. Verifique o deploy (variáveis NEXT_PUBLIC_*)."
    );
  }
  const isProd = process.env.NODE_ENV === "production";
  return createBrowserClient(url, anon, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: isProd,
    },
  });
}
