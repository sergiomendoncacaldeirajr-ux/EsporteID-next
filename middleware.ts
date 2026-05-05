import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Mantém refresh de sessão Supabase nas rotas do matcher.
 * OpenNext Cloudflare ainda exige `middleware.ts` (a convenção `proxy.ts` do Next 16 quebra o build).
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
