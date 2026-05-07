"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  Landmark,
  Settings,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

export type EspacoPainelSpace = {
  id: number;
  nome_publico: string;
  slug: string | null;
  mostrarFinanceiro?: boolean;
  /** Dono sem papel de atleta: atalho para criar perfil de atleta. */
  oferecerCtaPerfilAtleta?: boolean;
};

function isActivePath(pathname: string, hrefPath: string) {
  if (hrefPath === "/espaco") return pathname === "/espaco";
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

function PainelChromeInner({ space }: { space: EspacoPainelSpace }) {
  const pathname = usePathname() ?? "";
  const mostrarFinanceiro = space.mostrarFinanceiro !== false;
  const oferecerCtaPerfilAtleta = Boolean(space.oferecerCtaPerfilAtleta);

  const navItems = [
    { href: "/espaco", label: "Início", Icon: Home },
    { href: "/espaco/agenda", label: "Agenda", Icon: CalendarDays },
    { href: "/espaco/socios", label: "Sócios", Icon: Users },
    ...(mostrarFinanceiro ? [{ href: "/espaco/financeiro", label: "Financ.", Icon: Wallet }] : []),
    { href: "/espaco/configuracao", label: "Ajustes", Icon: Settings },
  ] as const;

  const asaasActive = isActivePath(pathname, "/espaco/integracao-asaas");

  return (
    <>
      {/* ── Chrome card ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2rem] border border-eid-primary-500/20 bg-gradient-to-br from-eid-card via-eid-card to-eid-primary-500/10 p-4 shadow-[0_24px_56px_-26px_rgba(37,99,235,0.45)] sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eid-primary-500/12 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-eid-action-500/12 blur-3xl" aria-hidden />

        <div className="relative">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-eid-primary-500/25 bg-eid-primary-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-eid-primary-300">
                Painel do espaço
              </div>
              <h1 className="mt-2.5 truncate text-xl font-bold tracking-tight text-eid-fg sm:text-2xl">
                {space.nome_publico}
              </h1>
            </div>

            <div className="mt-1 flex shrink-0 flex-col items-end gap-2">
              {space.slug ? (
                <Link
                  href={`/espaco/${space.slug}`}
                  className="inline-flex items-center gap-1 rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-3 py-1.5 text-xs font-semibold text-eid-action-400 transition hover:border-eid-action-500/55 hover:bg-eid-action-500/15"
                >
                  Página pública
                  <svg viewBox="0 0 12 12" width={10} height={10} fill="none" aria-hidden>
                    <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ) : null}
              {oferecerCtaPerfilAtleta && (
                <Link
                  href="/conta/criar-perfil-atleta"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-3 py-1.5 text-xs font-semibold text-eid-text-secondary transition hover:border-eid-primary-500/35 hover:text-eid-fg"
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">Criar perfil de atleta</span>
                  <span className="sm:hidden">Ser atleta</span>
                </Link>
              )}
            </div>
          </div>

          {/* Desktop nav pills — hidden on mobile */}
          <div className="relative mt-4 hidden flex-wrap items-center gap-2 md:flex">
            {navItems.map(({ href, label, Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                    active
                      ? "border-eid-primary-500/55 bg-eid-primary-500/15 text-eid-primary-200"
                      : "border-[color:var(--eid-border-subtle)] bg-eid-surface/70 text-eid-fg hover:border-eid-primary-500/45 hover:bg-eid-primary-500/10 hover:text-eid-primary-300"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                  {label}
                </Link>
              );
            })}

            {/* Asaas — item secundário no desktop */}
            <Link
              href="/espaco/integracao-asaas"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                asaasActive
                  ? "border-amber-500/50 bg-amber-500/12 text-amber-300"
                  : "border-[color:var(--eid-border-subtle)] bg-eid-surface/70 text-eid-text-secondary hover:border-amber-500/30 hover:text-amber-300"
              }`}
            >
              <Landmark className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              Asaas
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom nav — mobile only ─────────────────────────────────── */}
      <nav
        aria-label="Navegação do painel"
        className="!fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--eid-border-subtle)] bg-eid-card/96 shadow-[0_-1px_0_0_rgba(255,255,255,0.04),0_-12px_32px_-8px_rgba(0,0,0,0.5)] backdrop-blur-md md:!hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-lg items-stretch px-1 pt-1">
          {/* Itens principais */}
          {navItems.map(({ href, label, Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center gap-0.5 pb-1 pt-0.5 text-[9.5px] font-semibold leading-tight"
              >
                <span
                  className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150 ${
                    active ? "bg-eid-primary-500/18 text-eid-primary-400" : "text-eid-text-secondary"
                  }`}
                >
                  {active && (
                    <span
                      className="absolute -top-1.5 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-eid-primary-500"
                      aria-hidden
                    />
                  )}
                  <Icon className="h-[19px] w-[19px] shrink-0" aria-hidden />
                </span>
                <span className={active ? "text-eid-primary-300" : "text-eid-text-secondary/80"}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Separador visual */}
          <span className="my-1.5 w-px self-stretch rounded-full bg-[color:var(--eid-border-subtle)]" aria-hidden />

          {/* Asaas — item secundário */}
          <Link
            href="/espaco/integracao-asaas"
            className="flex flex-col items-center gap-0.5 pb-1 pl-1.5 pr-2 pt-0.5 text-[9.5px] font-semibold leading-tight"
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150 ${
                asaasActive ? "bg-amber-500/15 text-amber-400" : "text-eid-text-secondary/55"
              }`}
            >
              <Landmark className="h-[19px] w-[19px] shrink-0" aria-hidden />
            </span>
            <span className={asaasActive ? "text-amber-300" : "text-eid-text-secondary/55"}>
              Asaas
            </span>
          </Link>
        </div>
      </nav>
    </>
  );
}

function PainelChromeFallback() {
  return (
    <div
      className="h-28 animate-pulse rounded-[2rem] border border-eid-primary-500/15 bg-eid-card/60 sm:h-32"
      aria-hidden
    />
  );
}

export function EspacoPainelChrome({ space }: { space: EspacoPainelSpace }) {
  return (
    <Suspense fallback={<PainelChromeFallback />}>
      <PainelChromeInner space={space} />
    </Suspense>
  );
}
