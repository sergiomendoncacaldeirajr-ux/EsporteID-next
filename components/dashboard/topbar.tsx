"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LogoWordmark } from "@/components/brand/logo-wordmark";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { EidThemeToggle } from "@/components/eid-theme-toggle";
import { createClient } from "@/lib/supabase/client";

function IconUserCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="9" r="3" />
      <path d="M6.5 19c1.3-2.2 3.7-3.5 5.5-3.5s4.2 1.3 5.5 3.5" strokeLinecap="round" />
    </svg>
  );
}

type Props = {
  persistent?: boolean;
};

export function DashboardTopbar({ persistent = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [meId, setMeId] = useState<string | null>(null);
  const [hideBecausePersistent, setHideBecausePersistent] = useState(false);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => setMeId(user?.id ?? null));
  }, []);

  useEffect(() => {
    if (persistent || typeof document === "undefined") return;
    if (document.getElementById("eid-persistent-topbar")) {
      setHideBecausePersistent(true);
    }
  }, [persistent]);

  if (hideBecausePersistent) return null;

  const baseNavItems = [
    { href: "/dashboard", label: "Painel" },
    { href: "/agenda", label: "Agenda" },
    { href: "/match", label: "Match" },
    { href: "/comunidade", label: "Social" },
    { href: "/torneios", label: "Torneios" },
    { href: "/times", label: "Times" },
    { href: "/locais", label: "Locais" },
    { href: "/ranking", label: "Ranking" },
    { href: "/performance", label: "Performance" },
  ];

  const navItems = meId ? [...baseNavItems, { href: `/perfil/${meId}`, label: "Perfil" }] : baseNavItems;

  function navActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/agenda") return pathname === "/agenda";
    if (href === "/match")
      return pathname === "/match" || pathname.startsWith("/desafio") || pathname.startsWith("/perfil-time");
    if (href === "/comunidade") return pathname === "/comunidade" || pathname.startsWith("/comunidade/");
    if (href === "/ranking") return pathname === "/ranking" || pathname.startsWith("/ranking/");
    if (href === "/performance") return pathname === "/performance" || pathname.startsWith("/performance/");
    if (meId && href === `/perfil/${meId}`) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/dashboard?q=${encodeURIComponent(term)}`);
  }

  return (
    <header
      id={persistent ? "eid-persistent-topbar" : undefined}
      className={`${persistent ? "fixed left-0 right-0 top-0 z-50" : "sticky top-0 z-40"} border-b border-[color:var(--eid-border-subtle)] bg-eid-bg/90 pt-[env(safe-area-inset-top)] shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md supports-[backdrop-filter]:bg-eid-bg/82 md:mb-3`}
    >
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 py-2 sm:py-2.5">
          <Link href="/dashboard" className="min-w-0 shrink transition hover:opacity-90">
            <LogoWordmark className="h-[1.35rem] max-h-7 max-w-[min(46vw,200px)] object-left sm:h-8 sm:max-w-[min(55vw,220px)]" />
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <NotificationBell userId={meId} />
            <EidThemeToggle variant="toolbar" />
            <SignOutButton variant="icon" />
            {meId ? (
              <Link
                href={`/perfil/${meId}`}
                className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-2.5 text-xs font-bold text-eid-fg transition hover:border-eid-primary-500/50 hover:bg-eid-primary-500/15 md:inline-flex"
                aria-label="Meu perfil"
              >
                <IconUserCircle className="h-[18px] w-[18px] text-eid-primary-300" />
                Perfil
              </Link>
            ) : null}
          </div>
        </div>

        <form onSubmit={onSubmit} className="pb-3">
          <label htmlFor="eid-topbar-search" className="sr-only">
            Buscar no painel
          </label>
          <input
            id="eid-topbar-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar atletas, locais…"
            className="eid-input-dark h-9 w-full rounded-[var(--eid-radius-md)] border border-[color:var(--eid-border-subtle)] px-3.5 text-sm text-eid-fg placeholder:text-eid-text-secondary/80 md:h-10"
          />
        </form>
      </div>

      <nav className="mx-auto hidden w-full max-w-5xl gap-1 overflow-x-auto px-4 pb-2.5 md:flex sm:px-6">
        {navItems.map((item) => {
          const active = navActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                active
                  ? "border-eid-primary-500/45 bg-eid-primary-500/12 text-eid-fg ring-2 ring-eid-primary-500/35"
                  : "border-transparent bg-transparent text-eid-text-secondary hover:border-eid-primary-500/25 hover:text-eid-fg"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
