import type { Metadata, Viewport } from "next";
import type { User } from "@supabase/supabase-js";
import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import { Barlow, Barlow_Condensed, Barlow_Semi_Condensed } from "next/font/google";
import { EidThemeHydration } from "@/components/eid-theme-hydration";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { OnboardingTopbar } from "@/components/onboarding/onboarding-topbar";
import { InteractionFeedback } from "@/components/ui/interaction-feedback";
import { LegalGateDeferred } from "@/components/legal-gate";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { VisitorThemeToggleFloat } from "@/components/shell/visitor-theme-toggle-float";
import { GlobalScrollReset } from "@/components/system/global-scroll-reset";
import { HashTargetHighlight } from "@/components/system/hash-target-highlight";
import { InstallAppOfferDynamic } from "@/components/pwa/install-app-offer-dynamic";
import { PwaBootstrap } from "@/components/pwa/pwa-bootstrap";
import { PwaLaunchSplash } from "@/components/pwa/pwa-launch-splash";
import { RealtimePageRefresh } from "@/components/pwa/realtime-page-refresh";
import { ThemeColorSync } from "@/components/pwa/theme-color-sync";
import {
  ACTIVE_CONTEXT_COOKIE,
  resolveActiveAppContext,
  type ActiveAppContext,
} from "@/lib/auth/active-context";
import { EID_APP_CHROME_THEME_COLOR, EID_LOGO_AUTH_MARK_SRC } from "@/lib/branding";
import { EID_HIDE_APP_SHELL_HEADER, EID_SHOW_ONBOARDING_CHROME_HEADER } from "@/lib/eid-app-shell";
import { SupportCenterFloat } from "@/components/support/support-center-float";
import {
  ALL_SYSTEM_FEATURE_KEYS,
  getSystemFeatureConfig,
  type SystemFeatureKey,
} from "@/lib/system-features";
import { SiteFooterLoader } from "@/components/site-footer-loader";
import { getCachedProfileLegalRow } from "@/lib/auth/profile-legal-cache";
import { getCachedUsuarioPapeis, getServerAuth } from "@/lib/auth/rsc-auth";
import { legalAcceptanceIsCurrent } from "@/lib/legal/acceptance";
import "./globals.css";

/**
 * Este layout usa `headers()`, `cookies()` e Supabase no servidor.
 * Sem `force-dynamic`, o build tenta SSG e falha com `DYNAMIC_SERVER_USAGE` (OpenNext / Cloudflare).
 */
export const dynamic = "force-dynamic";

/* Barlow — família atlética, muito usada em apps esportivos premium */
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  /* Menos pesos = menos CSS/font baixados por navegação inicial */
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

/* Barlow Condensed — para stats, labels, badges compactos */
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});

/* Barlow Semi Condensed — transição entre os dois */
const barlowSemiCondensed = Barlow_Semi_Condensed({
  variable: "--font-barlow-semi-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EsporteID",
    template: "%s · EsporteID",
  },
  description:
    "Plataforma esportiva: perfil, partidas, torneios e ranking — com privacidade e LGPD.",
  applicationName: "EsporteID",
  icons: {
    icon: [{ url: EID_LOGO_AUTH_MARK_SRC, type: "image/png" }],
    shortcut: [{ url: EID_LOGO_AUTH_MARK_SRC, type: "image/png" }],
    apple: [
      { url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
      { url: EID_LOGO_AUTH_MARK_SRC, type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "EsporteID",
    /* SSR escuro; tema claro: `ThemeColorSync` troca para `default` (header branco). */
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  /* Padrão escuro; `ThemeColorSync` ajusta no cliente se o tema claro estiver ativo. */
  themeColor: EID_APP_CHROME_THEME_COLOR,
  /* Evita travar o chrome do sistema só em escuro quando o usuário usa tema claro no app. */
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user: User | null = null;
  let canShowAuthenticatedChrome = false;
  let papeis: string[] = [];
  let activeContext: ActiveAppContext = "atleta";
  let supportModulosEmBreve: SystemFeatureKey[] = [];
  let hdrs: Awaited<ReturnType<typeof headers>>;
  let cookieStore: Awaited<ReturnType<typeof cookies>>;
  try {
    const [auth, h, ck] = await Promise.all([getServerAuth(), headers(), cookies()]);
    hdrs = h;
    cookieStore = ck;
    user = auth.user;
    if (user) {
      const [papeisResult, profile] = await Promise.all([
        getCachedUsuarioPapeis(user.id),
        getCachedProfileLegalRow(user.id),
      ]);
      papeis = papeisResult;
      // Exibe o chrome completo (nav + topbar) somente se o onboarding foi concluído.
      // `perfil_completo` já vem em getCachedProfileLegalRow — sem query extra.
      canShowAuthenticatedChrome = legalAcceptanceIsCurrent(profile) && !!profile?.perfil_completo;
      const cfg = await getSystemFeatureConfig(auth.supabase);
      supportModulosEmBreve = ALL_SYSTEM_FEATURE_KEYS.filter((k) => {
        const entry = cfg[k];
        // Módulo ativo para todos: nunca ocultar no suporte
        if (entry.mode === "ativo") return false;
        // Qualquer outro modo (em_breve, desenvolvimento, teste):
        // testers enxergam como disponível; demais usuários não veem
        if (entry.testers.includes(user.id)) return false;
        return true;
      });
    }
  } catch (e) {
    console.error("[eid-layout] bootstrap do shell (auth / perfil / app_config)", e);
    user = null;
    canShowAuthenticatedChrome = false;
    papeis = [];
    supportModulosEmBreve = [];
    try {
      hdrs = await headers();
      cookieStore = await cookies();
    } catch (inner) {
      console.warn("[eid-layout] headers/cookies após falha no bootstrap", inner);
      hdrs = new Headers() as unknown as Awaited<ReturnType<typeof headers>>;
      cookieStore = {
        get: () => undefined,
        getAll: () => [],
        has: () => false,
        size: 0,
        [Symbol.iterator]: function* () {},
        set: () => {},
        delete: () => {},
        clear: () => {},
      } as unknown as Awaited<ReturnType<typeof cookies>>;
    }
  }
  const hideAppShell = hdrs.get(EID_HIDE_APP_SHELL_HEADER) === "1";
  const showOnboardingChrome = hdrs.get(EID_SHOW_ONBOARDING_CHROME_HEADER) === "1";
  const showAppChrome = Boolean(user) && canShowAuthenticatedChrome && !hideAppShell;
  const onboardingMinimalChrome = Boolean(user) && hideAppShell && showOnboardingChrome;
  activeContext = resolveActiveAppContext(cookieStore.get(ACTIVE_CONTEXT_COOKIE)?.value ?? null, papeis);

  return (
    <html
      lang="pt-BR"
      data-eid-theme="dark"
      suppressHydrationWarning
      className={`${barlow.variable} ${barlowCondensed.variable} ${barlowSemiCondensed.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(()=>{try{const p=new URLSearchParams(location.search).get('theme');const s=localStorage.getItem('theme');const t=p==='light'||p==='dark'?p:s==='light'?'light':'dark';document.documentElement.dataset.eidTheme=t;}catch{}})();",
          }}
        />
      </head>
      <body
        className={`flex min-h-svh flex-col bg-eid-bg text-eid-fg${showAppChrome ? " eid-app-shell" : ""}`}
      >
        <EidThemeHydration />
        <PwaBootstrap />
        <PwaLaunchSplash />
        <ThemeColorSync />
        <InstallAppOfferDynamic />
        <GlobalScrollReset />
        <HashTargetHighlight />
        <InteractionFeedback />
        {!user ? <VisitorThemeToggleFloat /> : null}
        {onboardingMinimalChrome ? <OnboardingTopbar /> : null}
        {showAppChrome ? (
          <DashboardTopbar
            persistent
            initialMeId={user?.id ?? null}
            initialPapeis={papeis}
            initialActiveContext={activeContext}
          />
        ) : null}
        {showAppChrome ? (
          <>
            <RealtimePageRefresh userId={user!.id} />
            <div
              id="eid-app-shell-main-wrap"
              className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
            >
              <div
                id="app-main-column"
                className="eid-app-route-enter-children flex min-h-0 flex-1 flex-col"
              >
                {children}
              </div>
            </div>
            <div
              id="eid-mobile-bottom-nav"
              className="pointer-events-none fixed inset-x-0 bottom-0 z-[55] md:hidden"
            >
              <MobileBottomNav userId={user!.id} activeContext={activeContext} />
            </div>
          </>
        ) : (
          <div
            id="app-main-column"
            className={`eid-app-route-enter-children ${
              onboardingMinimalChrome
                ? "flex min-h-0 flex-1 flex-col pt-[calc(3.25rem+env(safe-area-inset-top))]"
                : hideAppShell
                  ? "flex min-h-0 flex-1 flex-col"
                  : "flex flex-1 flex-col pb-8 md:pb-28"
            }`}
          >
            {children}
          </div>
        )}
        {hideAppShell ? null : (
          <div id="eid-site-footer">
            <Suspense
              fallback={<div className="mt-auto hidden min-h-[52px] md:block" aria-hidden />}
            >
              <SiteFooterLoader user={user} />
            </Suspense>
          </div>
        )}
        <Suspense fallback={null}>
          <LegalGateDeferred />
        </Suspense>
        {user ? <SupportCenterFloat modulosEmBreve={supportModulosEmBreve} /> : null}
      </body>
    </html>
  );
}
