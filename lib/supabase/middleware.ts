import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { EID_HIDE_APP_SHELL_HEADER, EID_SHOW_ONBOARDING_CHROME_HEADER } from "@/lib/eid-app-shell";
import {
  legalAcceptanceIsCurrent,
  type ProfileLegalAcceptance,
  PROFILE_LEGAL_ACCEPTANCE_COLUMNS,
} from "@/lib/legal/acceptance";

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

/** Páginas de estatísticas EID carregadas em iframe (`embed=1`) — sem header/footer do app. */
function isEmbedEidStatsPath(path: string): boolean {
  return (
    /^\/perfil\/[^/]+\/eid\/\d+(\/historico)?\/?$/.test(path) ||
    /^\/perfil-dupla\/[^/]+\/eid\/\d+\/?$/.test(path) ||
    /^\/perfil-time\/[^/]+\/eid\/\d+\/?$/.test(path)
  );
}

function isEmbedDesafioPath(path: string): boolean {
  return path === "/desafio" || path === "/desafio/";
}

function isFullscreenCadastrarLocalPath(path: string): boolean {
  return path === "/locais/cadastrar" || path === "/locais/cadastrar/";
}

function nextWithHideAppShell(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(EID_HIDE_APP_SHELL_HEADER, "1");
  return NextResponse.next({ request: { headers: requestHeaders } });
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

  const path = request.nextUrl.pathname;
  const embedShell = request.nextUrl.searchParams.get("embed") === "1";
  const hideEmbedMinimalChrome =
    embedShell && (isEmbedEidStatsPath(path) || isEmbedDesafioPath(path));

  if (isNextjsRouterDataRequest(request)) {
    if (hideEmbedMinimalChrome) return nextWithHideAppShell(request);
    return NextResponse.next({ request });
  }

  if (!needsSessionWork(path)) {
    if (hideEmbedMinimalChrome || isFullscreenCadastrarLocalPath(path)) return nextWithHideAppShell(request);
    // Rotas públicas não precisam de leitura de sessão no middleware.
    return NextResponse.next({ request });
  }
  let supabaseResponse = NextResponse.next({ request });
  const requestHeaders = new Headers(request.headers);
  const hideAppShell = path.startsWith("/editar") || isFullscreenCadastrarLocalPath(path);
  const showOnboardingChrome = path.startsWith("/onboarding");
  if (hideAppShell) requestHeaders.set(EID_HIDE_APP_SHELL_HEADER, "1");
  if (showOnboardingChrome) requestHeaders.set(EID_SHOW_ONBOARDING_CHROME_HEADER, "1");

  const makeNextResponse = () => NextResponse.next({ request: { headers: requestHeaders } });

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
          supabaseResponse = makeNextResponse();
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
  let cachedProfile:
    | (ProfileLegalAcceptance & { perfil_completo: boolean | null })
    | null
    | undefined;
  const getProfile = async () => {
    if (!user) return null;
    if (cachedProfile !== undefined) return cachedProfile;
    const { data } = await supabase
      .from("profiles")
      .select(`${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}, perfil_completo`)
      .eq("id", user.id)
      .maybeSingle();
    cachedProfile = data;
    return cachedProfile;
  };

  if (path.startsWith("/auth/callback")) {
    if (hideAppShell) supabaseResponse.headers.set(EID_HIDE_APP_SHELL_HEADER, "1");
    if (showOnboardingChrome) supabaseResponse.headers.set(EID_SHOW_ONBOARDING_CHROME_HEADER, "1");
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

    if (!profile || !legalAcceptanceIsCurrent(profile)) {
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

    if (!profile || !legalAcceptanceIsCurrent(profile)) {
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

  // Home `/`: institucional acessível no desktop.
  // No mobile (iOS/Android), nunca exibe institucional: sempre segue para login/dashboard.
  if (path === "/") {
    const ua = request.headers.get("user-agent");
    const isMobile = isMobileUserAgent(ua);

    if (isMobile && user) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (isMobile && !user && !authCode) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", "/dashboard");
      return NextResponse.redirect(url);
    }
    if (user) return supabaseResponse;
  }

  if (hideAppShell) supabaseResponse.headers.set(EID_HIDE_APP_SHELL_HEADER, "1");
  if (showOnboardingChrome) supabaseResponse.headers.set(EID_SHOW_ONBOARDING_CHROME_HEADER, "1");
  return supabaseResponse;
}
