import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Celular / navegadores móveis — landing institucional fica para desktop (como o PHP: index → login). */
function isMobileUserAgent(ua: string | null): boolean {
  if (!ua) return false;
  return /Mobile|Android|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini|CriOS|FxiOS/i.test(ua);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const authCode = request.nextUrl.searchParams.has("code");

  if (path.startsWith("/auth/callback")) {
    return supabaseResponse;
  }

  if (path.startsWith("/conta") && !user) {
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

  if (path.startsWith("/onboarding") && !user && !authCode) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", "/onboarding");
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/admin") && !user && !authCode) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", "/admin");
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/dashboard")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("termos_aceitos_em, perfil_completo")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.termos_aceitos_em) {
      const url = request.nextUrl.clone();
      url.pathname = "/conta/aceitar-termos";
      url.searchParams.set("next", "/dashboard");
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("termos_aceitos_em, perfil_completo")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.termos_aceitos_em) {
      const url = request.nextUrl.clone();
      url.pathname = "/conta/aceitar-termos";
      url.searchParams.set("next", "/onboarding");
      return NextResponse.redirect(url);
    }
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
      const { data: profile } = await supabase
        .from("profiles")
        .select("termos_aceitos_em, perfil_completo")
        .eq("id", user.id)
        .maybeSingle();

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
