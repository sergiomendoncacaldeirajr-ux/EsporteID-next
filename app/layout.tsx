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
import { MeasuredTopbarOffset } from "@/components/shell/measured-topbar-offset";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { VisitorThemeToggleFloat } from "@/components/shell/visitor-theme-toggle-float";
import { GlobalScrollReset } from "@/components/system/global-scroll-reset";
import { InstallAppOffer } from "@/components/pwa/install-app-offer";
import { PwaBootstrap } from "@/components/pwa/pwa-bootstrap";
import { ThemeColorSync } from "@/components/pwa/theme-color-sync";
import {
  ACTIVE_CONTEXT_COOKIE,
  resolveActiveAppContext,
  type ActiveAppContext,
} from "@/lib/auth/active-context";
import { EID_APP_CHROME_THEME_COLOR, EID_LOGO_ICON_E_SRC } from "@/lib/branding";
import { EID_HIDE_APP_SHELL_HEADER, EID_SHOW_ONBOARDING_CHROME_HEADER } from "@/lib/eid-app-shell";
import { SiteFooterLoader } from "@/components/site-footer-loader";
import { getCachedUsuarioPapeis, getServerAuth } from "@/lib/auth/rsc-auth";
import "./globals.css";

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
    icon: [{ url: EID_LOGO_ICON_E_SRC, type: "image/png" }],
    apple: [
      { url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
      { url: EID_LOGO_ICON_E_SRC, type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "EsporteID",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  /* Padrão escuro; `ThemeColorSync` ajusta no cliente se o tema claro estiver ativo. */
  themeColor: EID_APP_CHROME_THEME_COLOR,
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user: User | null = null;
  let papeis: string[] = [];
  let activeContext: ActiveAppContext = "atleta";
  let hdrs: Awaited<ReturnType<typeof headers>>;
  try {
    const [auth, h] = await Promise.all([getServerAuth(), headers()]);
    hdrs = h;
    user = auth.user;
    if (user) {
      papeis = await getCachedUsuarioPapeis(user.id);
    }
  } catch {
    hdrs = await headers();
    user = null;
    papeis = [];
  }

  const cookieStore = await cookies();
  const hideAppShell = hdrs.get(EID_HIDE_APP_SHELL_HEADER) === "1";
  const showOnboardingChrome = hdrs.get(EID_SHOW_ONBOARDING_CHROME_HEADER) === "1";
  const showAppChrome = Boolean(user) && !hideAppShell;
  const onboardingMinimalChrome = Boolean(user) && hideAppShell && showOnboardingChrome;
  activeContext = resolveActiveAppContext(cookieStore.get(ACTIVE_CONTEXT_COOKIE)?.value ?? null, papeis);

  return (
    <html
      lang="pt-BR"
      data-eid-theme="dark"
      className={`${barlow.variable} ${barlowCondensed.variable} ${barlowSemiCondensed.variable} h-full antialiased`}
    >
      <body
        className={`flex min-h-svh flex-col bg-eid-bg text-eid-fg${showAppChrome ? " eid-app-shell" : ""}`}
      >
        <EidThemeHydration />
        <PwaBootstrap />
        <ThemeColorSync />
        <InstallAppOffer />
        <GlobalScrollReset />
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
        {showAppChrome ? <MeasuredTopbarOffset /> : null}
        {showAppChrome ? (
          <>
            <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
              <div id="app-main-column" className="flex min-h-0 flex-1 flex-col">
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
            className={
              onboardingMinimalChrome
                ? "flex min-h-0 flex-1 flex-col pt-[calc(3.25rem+env(safe-area-inset-top))]"
                : hideAppShell
                  ? "flex min-h-0 flex-1 flex-col"
                  : "flex flex-1 flex-col pb-8 md:pb-28"
            }
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
      </body>
    </html>
  );
}
