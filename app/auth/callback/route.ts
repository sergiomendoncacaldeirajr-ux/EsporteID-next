import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

/**
 * Troca o `code` PKCE do e-mail (confirmação, magic link, etc.) por sessão em cookie.
 * A URL deste endpoint deve estar nas URLs de redirecionamento permitidas do provedor de autenticação.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/onboarding";

  const safeNext =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/onboarding";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?erro=auth`);
  }

  const supabase = await createRouteHandlerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?erro=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
