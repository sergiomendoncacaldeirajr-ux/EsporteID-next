import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Requisições de transição / prefetch do App Router. Rodar `getSession` + `setAll`
 * no middleware em toda flight pode emitir Set-Cookie e confundir o cliente (URL muda,
 * UI só atualiza no próximo gesto / destino “atrasado”).
 */
function isNextjsRouterDataRequest(request: NextRequest): boolean {
  return (
    request.headers.has("RSC") ||
    request.headers.get("Next-Router-Prefetch") === "1"
  );
}

/** Celular / navegadores móveis — landing institucional fica para desktop (como o PHP: index → login). */
function isMobileUserAgent(ua: string | null): boolean {
  if (!ua) return false;
  return /Mobile|Android|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini|CriOS|FxiOS/i.test(ua);
}

function needsSessionWork(path: string): boolean {
  return (
    path === "/" ||
    path.startsWith("/auth/callback") ||
    path.startsWith("/conta") ||
    path.startsWith("/editar") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/buscar") ||
    path.startsWith("/organizador") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/admin")
  );
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !anon?.trim()) {
    console.error(
      "[middleware] Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY na Vercel (Production)."
    );
    return NextResponse.next({ request });
  }

  if (isNextjsRouterDataRequest(request)) {
    return NextResponse.next({ request });
  }
  const path = request.nextUrl.pathname;
  if (!needsSessionWork(path)) {
    // Rotas públicas não precisam de leitura de sessão no middleware.
    return NextResponse.next({ request });
  }
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    url,
    anon,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Next.js 15+: cookies do request são imutáveis no middleware — só Set-Cookie na resposta.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  /**
   * `getSession` lê o JWT do cookie (sem round-trip ao Auth) — bem mais rápido em cada navegação.
   * O refresh/validação forte continua no RSC via `getServerAuth` → `getUser`.
   */
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const authCode = request.nextUrl.searchParams.has("code");
  let cachedProfile: { termos_aceitos_em: string | null; perfil_completo: boolean | null } | null | undefined;
  const getProfile = async () => {
    if (!user) return null;
    if (cachedProfile !== undefined) return cachedProfile;
    const { data } = await supabase
      .from("profiles")
      .select("termos_aceitos_em, perfil_completo")
      .eq("id", user.id)
      .maybeSingle();
    cachedProfile = data;
    return cachedProfile;
  };

  if (path.startsWith("/auth/callback")) {
    return supabaseResponse;
  }

  if ((path.startsWith("/conta") || path.startsWith("/editar")) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/dashboard") && !user && !authCode) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", "/dashboard");
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/buscar") && !user && !authCode) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/organizador") && !user && !authCode) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/onboarding") && !user && !authCode) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/admin") && !user && !authCode) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", "/admin");
    return NextResponse.redirect(url);
  }

  if (user && (path.startsWith("/dashboard") || path.startsWith("/organizador") || path.startsWith("/buscar"))) {
    const profile = await getProfile();

    if (!profile?.termos_aceitos_em) {
      const url = request.nextUrl.clone();
      url.pathname = "/conta/aceitar-termos";
      url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
    if (!profile.perfil_completo) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (user && path.startsWith("/onboarding")) {
    const profile = await getProfile();

    if (!profile?.termos_aceitos_em) {
      const url = request.nextUrl.clone();
      url.pathname = "/conta/aceitar-termos";
      url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
    // Onboarding só para quem ainda não concluiu o cadastro inicial.
    if (profile.perfil_completo) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Home `/`: como index.php do legado — logado com perfil ok vai ao painel; visitante no celular vai ao login.
  if (path === "/") {
    const ua = request.headers.get("user-agent");
    const allowInstitutional =
      request.nextUrl.searchParams.get("home") === "1" || request.nextUrl.searchParams.get("site") === "1";

    if (user) {
      const profile = await getProfile();

      if (profile?.termos_aceitos_em && profile.perfil_completo) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    if (!authCode && isMobileUserAgent(ua) && !allowInstitutional) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", "/dashboard");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
