import type { Metadata, Viewport } from "next";
import type { User } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { ViewTransition } from "react";
import { Barlow, Barlow_Condensed, Barlow_Semi_Condensed } from "next/font/google";
import { EidThemeHydration } from "@/components/eid-theme-hydration";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { OnboardingTopbar } from "@/components/onboarding/onboarding-topbar";
import { InteractionFeedback } from "@/components/ui/interaction-feedback";
import { LegalGate } from "@/components/legal-gate";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { VisitorThemeToggleFloat } from "@/components/shell/visitor-theme-toggle-float";
import { SiteFooter } from "@/components/site-footer";
import {
  ACTIVE_CONTEXT_COOKIE,
  resolveActiveAppContext,
  type ActiveAppContext,
} from "@/lib/auth/active-context";
import { EID_LOGO_ICON_E_SRC } from "@/lib/branding";
import { EID_HIDE_APP_SHELL_HEADER } from "@/lib/eid-app-shell";
import { getCachedUsuarioPapeis, getServerAuth } from "@/lib/auth/rsc-auth";
import "./globals.css";

/* Barlow — família atlética, muito usada em apps esportivos premium */
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
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
  icons: {
    icon: [{ url: EID_LOGO_ICON_E_SRC, type: "image/png" }],
    apple: [{ url: EID_LOGO_ICON_E_SRC }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user: User | null = null;
  let papeis: string[] = [];
  let activeContext: ActiveAppContext = "atleta";
  try {
    const auth = await getServerAuth();
    user = auth.user;
    if (user) {
      papeis = await getCachedUsuarioPapeis(user.id);
    }
  } catch {
    // Env ausente, restrição de cookies em RSC ou rede — evita 500 na página inteira.
    user = null;
    papeis = [];
  }

  const hdrs = await headers();
  const cookieStore = await cookies();
  const hideAppShell = hdrs.get(EID_HIDE_APP_SHELL_HEADER) === "1";
  const showAppChrome = Boolean(user) && !hideAppShell;
  const onboardingMinimalChrome = Boolean(user) && hideAppShell;
  activeContext = resolveActiveAppContext(cookieStore.get(ACTIVE_CONTEXT_COOKIE)?.value ?? null, papeis);

  return (
    <html
      lang="pt-BR"
      data-eid-theme="dark"
      className={`${barlow.variable} ${barlowCondensed.variable} ${barlowSemiCondensed.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-eid-bg text-eid-fg">
        <EidThemeHydration />
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
        <div
          id="app-main-column"
          className={
            showAppChrome
              ? "flex flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] pt-[calc(4.25rem+env(safe-area-inset-top))] md:pb-24 md:pt-24"
              : onboardingMinimalChrome
                ? "flex min-h-0 flex-1 flex-col pt-[calc(3.25rem+env(safe-area-inset-top))]"
                : hideAppShell
                  ? "flex min-h-0 flex-1 flex-col"
                  : "flex flex-1 flex-col pb-28"
          }
        >
          <ViewTransition default="none" enter="eid-vt-main-in" exit="eid-vt-main-out">
            {children}
          </ViewTransition>
        </div>
        {showAppChrome && user ? <MobileBottomNav userId={user.id} activeContext={activeContext} /> : null}
        {hideAppShell ? null : <SiteFooter />}
        <LegalGate />
      </body>
    </html>
  );
}
