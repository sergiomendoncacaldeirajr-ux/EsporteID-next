import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js só carrega este arquivo se se chamar `middleware.ts` na raiz e exportar `middleware`.
 * O antigo `proxy.ts` não era executado — sessão Supabase não era refrescada nas rotas do matcher.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todas as rotas exceto estáticos — alinha ao guia Supabase + Next e garante refresh
     * da sessão também em /match, /perfil, etc. (o matcher antigo era incompleto).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
