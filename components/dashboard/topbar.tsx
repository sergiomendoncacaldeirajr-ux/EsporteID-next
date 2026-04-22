"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ActiveContextSwitch } from "@/components/dashboard/active-context-switch";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LogoWordmark } from "@/components/brand/logo-wordmark";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { EidThemeToggle } from "@/components/eid-theme-toggle";
import {
  getContextHomeHref,
  listAvailableAppContexts,
  resolveActiveAppContext,
  type ActiveAppContext,
} from "@/lib/auth/active-context";
import { listarPapeis } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";

function IconUserCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8.2" r="3.5" fill="currentColor" fillOpacity="0.92" />
      <path d="M5 19.2c.9-3.3 3.7-5.3 7-5.3s6.1 2 7 5.3H5z" fill="currentColor" fillOpacity="0.92" />
    </svg>
  );
}

type Props = {
  persistent?: boolean;
  initialMeId?: string | null;
  initialPapeis?: string[];
  initialActiveContext?: ActiveAppContext;
};

export function DashboardTopbar({
  persistent = false,
  initialMeId = null,
  initialPapeis = [],
  initialActiveContext = "atleta",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [meId, setMeId] = useState<string | null>(initialMeId);
  const [papeis, setPapeis] = useState<string[]>(initialPapeis);

  useEffect(() => {
    const sb = createClient();
    async function load() {
      const {
        data: { user },
      } = await sb.auth.getUser();
      setMeId(user?.id ?? null);
      if (!user) {
        setPapeis([]);
        return;
      }
      const { data: papeisRows } = await sb.from("usuario_papeis").select("papel").eq("usuario_id", user.id);
      setPapeis(listarPapeis(papeisRows));
    }
    void load();
  }, []);

  const hideBecausePersistent =
    !persistent &&
    typeof document !== "undefined" &&
    Boolean(document.getElementById("eid-persistent-topbar"));
  if (hideBecausePersistent) return null;

  const activeContext = resolveActiveAppContext(initialActiveContext, papeis);
  const availableContexts = listAvailableAppContexts(papeis);
  const baseAthleteNavItems = [
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
  const baseOrganizerNavItems = [
    { href: "/organizador", label: "Painel" },
    { href: "/torneios", label: "Eventos" },
    { href: "/torneios/criar", label: "Criar torneio" },
    { href: "/locais", label: "Locais" },
    { href: "/conta/esportes-eid", label: "EID" },
  ];
  const baseProfessorNavItems = [
    { href: "/professor", label: "Painel" },
    { href: "/professor/agenda", label: "Agenda" },
    { href: "/professor/alunos", label: "Alunos" },
    { href: "/professor/avaliacoes", label: "Avaliações" },
    { href: "/professor/perfil", label: "Perfil Prof." },
  ];
  const baseEspacoNavItems = [
    { href: "/espaco", label: "Painel" },
    { href: "/espaco/agenda", label: "Agenda" },
    { href: "/espaco/socios", label: "Sócios" },
    { href: "/espaco/financeiro", label: "Financeiro" },
    { href: "/locais", label: "Locais" },
  ];
  const baseNavItems =
    activeContext === "organizador"
      ? baseOrganizerNavItems
      : activeContext === "professor"
        ? baseProfessorNavItems
        : activeContext === "espaco"
          ? baseEspacoNavItems
          : baseAthleteNavItems;
  const navItems = meId ? [...baseNavItems, { href: `/perfil/${meId}`, label: "Perfil" }] : baseNavItems;

  function navActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/professor") return pathname === "/professor";
    if (href === "/organizador") return pathname === "/organizador";
    if (href === "/espaco") return pathname === "/espaco";
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
    router.push(`${getContextHomeHref(activeContext)}?q=${encodeURIComponent(term)}`);
  }

  return (
    <header
      id={persistent ? "eid-persistent-topbar" : undefined}
      className={`${persistent ? "fixed left-0 right-0 top-0 z-50" : "sticky top-0 z-40"} border-b border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] pt-[env(safe-area-inset-top)] shadow-[0_4px_16px_-12px_rgba(0,0,0,0.28)] backdrop-blur-xl md:mb-3`}
      style={persistent ? { viewTransitionName: "eid-app-topbar" } : undefined}
    >
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 py-1.5 sm:py-2">
          <Link href={getContextHomeHref(activeContext)} className="min-w-0 shrink transition hover:opacity-90">
            <LogoWordmark className="h-8 max-w-[min(52vw,230px)] object-left sm:h-10 sm:max-w-[min(58vw,300px)]" />
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
            <ActiveContextSwitch activeContext={activeContext} availableContexts={availableContexts} />
            <NotificationBell userId={meId} />
            <EidThemeToggle variant="toolbar" />
            <SignOutButton variant="icon" />
            {meId ? (
              <Link
                href={`/perfil/${meId}`}
                className="hidden h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-2.5 text-[11px] font-medium text-eid-fg transition hover:border-[color:var(--eid-border)] hover:bg-eid-surface/75 md:inline-flex"
                aria-label="Meu perfil"
              >
                <IconUserCircle className="h-4 w-4 text-eid-text-secondary" />
                Perfil
              </Link>
            ) : null}
          </div>
        </div>

        <form onSubmit={onSubmit} className="pb-2.5">
          <label htmlFor="eid-topbar-search" className="sr-only">
            Buscar no painel
          </label>
          <input
            id="eid-topbar-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              activeContext === "organizador"
                ? "Buscar torneios, locais…"
                : activeContext === "professor"
                  ? "Buscar alunos, aulas…"
                  : activeContext === "espaco"
                    ? "Buscar reservas, sócios…"
                    : "Buscar atletas, locais…"
            }
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
