"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoWordmark } from "@/components/brand/logo-wordmark";
import { NotificationBell } from "@/components/dashboard/notification-bell";
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

export function DashboardTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => setMeId(user?.id ?? null));
  }, []);

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
    <header className="sticky top-0 z-30 mb-2 border-b border-[color:var(--eid-border-subtle)] bg-eid-bg/95 backdrop-blur-md md:mb-4">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-3">
        <Link href="/dashboard" className="shrink-0 transition hover:opacity-90">
          <LogoWordmark />
        </Link>
        <form onSubmit={onSubmit} className="min-w-0 flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            className="eid-input-dark h-9 w-full rounded-lg px-3 text-xs text-eid-fg placeholder:text-eid-text-secondary/85 md:h-10 md:rounded-xl md:text-sm"
          />
        </form>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <NotificationBell userId={meId} />
          {meId ? (
            <Link
              href={`/perfil/${meId}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card text-eid-primary-300 transition hover:border-eid-primary-500/40 md:h-auto md:w-auto md:gap-2 md:rounded-xl md:border-eid-primary-500/40 md:px-2.5 md:py-2"
              aria-label="Meu perfil"
              title="Meu perfil"
            >
              <IconUserCircle className="h-5 w-5 shrink-0 md:h-6 md:w-6" />
              <span className="hidden text-xs font-bold text-eid-fg md:inline">Perfil</span>
            </Link>
          ) : null}
        </div>
      </div>
      <nav className="mx-auto hidden w-full max-w-5xl gap-1 overflow-x-auto px-4 pb-3 md:flex sm:px-6">
        {navItems.map((item) => {
          const active = navActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-eid-primary-500/50 bg-eid-primary-500/15 text-eid-fg"
                  : "border-[color:var(--eid-border-subtle)] bg-eid-card text-eid-text-secondary hover:border-eid-primary-500/35 hover:text-eid-fg"
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
