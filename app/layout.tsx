import type { Metadata, Viewport } from "next";
import type { User } from "@supabase/supabase-js";
import { Geist, Geist_Mono } from "next/font/google";
import { EidThemeHydration } from "@/components/eid-theme-hydration";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { InteractionFeedback } from "@/components/ui/interaction-feedback";
import { LegalGate } from "@/components/legal-gate";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { SiteFooter } from "@/components/site-footer";
import { EID_LOGO_ICON_E_SRC } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
  } catch {
    // Env ausente, restrição de cookies em RSC ou rede — evita 500 na página inteira.
    user = null;
  }

  return (
    <html
      lang="pt-BR"
      data-eid-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-eid-bg text-eid-fg">
        <EidThemeHydration />
        <InteractionFeedback />
        {user ? <DashboardTopbar persistent /> : null}
        <div
          id="app-main-column"
          className={
            user
              ? "eid-page-transition flex flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] pt-[calc(4.25rem+env(safe-area-inset-top))] md:pb-24 md:pt-24"
              : "flex flex-1 flex-col pb-28"
          }
        >
          {children}
        </div>
        <MobileBottomNav userId={user?.id ?? null} />
        <SiteFooter />
        <LegalGate />
      </body>
    </html>
  );
}
