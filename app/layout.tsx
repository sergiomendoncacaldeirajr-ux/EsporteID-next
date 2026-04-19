import type { Metadata, Viewport } from "next";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { EidThemeHydration } from "@/components/eid-theme-hydration";
import { EidThemeToggle } from "@/components/eid-theme-toggle";
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
  themeColor: "#070d18",
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
        <div className="pointer-events-none fixed right-3 top-3 z-[60] flex items-center gap-2 sm:right-4 sm:top-4">
          {user ? (
            <div className="pointer-events-auto">
              <SignOutButton />
            </div>
          ) : (
            <div className="pointer-events-auto">
              <Link
                href="/login"
                className="inline-flex rounded-xl border border-eid-action-500/50 bg-eid-action-500/15 px-3 py-1.5 text-xs font-bold text-eid-action-500 transition hover:bg-eid-action-500/25"
              >
                Entrar
              </Link>
            </div>
          )}
          <div className="pointer-events-auto">
            <EidThemeToggle />
          </div>
        </div>
        <div
          id="app-main-column"
          className={
            user
              ? "flex flex-1 flex-col pb-[calc(3.75rem+env(safe-area-inset-bottom))] md:pb-28"
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
