import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16+: o arquivo deve ser `proxy.ts` e exportar `proxy` (middleware.ts está deprecado).
 * Mantém refresh de sessão Supabase nas rotas do matcher.
 */
export async function proxy(request: NextRequest) {
  return NextResponse.next({ request });
}
