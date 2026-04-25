"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  Landmark,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

export type EspacoPainelSpace = {
  id: number;
  nome_publico: string;
  slug: string | null;
  mostrarFinanceiro?: boolean;
};

function isActivePath(pathname: string, hrefPath: string) {
  if (hrefPath === "/espaco") return pathname === "/espaco";
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

function PainelChromeInner({ space }: { space: EspacoPainelSpace }) {
  const pathname = usePathname() ?? "";
  const mostrarFinanceiro = space.mostrarFinanceiro !== false;

  const items = [
    { href: "/espaco", label: "Início", Icon: Home },
    { href: "/espaco/agenda", label: "Agenda", Icon: CalendarDays },
    { href: "/espaco/socios", label: "Sócios", Icon: Users },
    ...(mostrarFinanceiro ? [{ href: "/espaco/financeiro", label: "Financ.", Icon: Wallet }] : []),
    { href: "/espaco/configuracao", label: "Ajustes", Icon: Settings },
    { href: "/espaco/integracao-asaas", label: "Asaas", Icon: Landmark },
  ] as const;

  return (
    <>
      <div className="relative overflow-hidden rounded-[2rem] border border-eid-primary-500/20 bg-gradient-to-br from-eid-card via-eid-card to-eid-primary-500/10 p-4 shadow-[0_24px_56px_-26px_rgba(37,99,235,0.45)] sm:p-6">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eid-primary-500/12 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-eid-action-500/12 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <div className="inline-flex rounded-full border border-eid-primary-500/25 bg-eid-primary-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-eid-primary-300">
            Painel do espaço
          </div>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-eid-fg sm:text-3xl">
            {space.nome_publico}
          </h1>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-eid-text-secondary sm:text-sm">
            Cada login gerencia um único local. Para operar outro espaço, use outro cadastro na plataforma.
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-eid-card/90 sm:mt-4 sm:h-2">
            <div className="h-full w-1/3 rounded-full bg-eid-primary-500" />
          </div>
          <div className="relative mt-4 hidden flex-wrap gap-2 md:flex">
            {items.map(({ href, label, Icon }) => {
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
            {space.slug ? (
              <Link
                href={`/espaco/${space.slug}`}
                className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-3.5 py-2 text-xs font-semibold text-eid-action-400 transition hover:border-eid-action-500/55"
              >
                Landing pública
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <nav
        aria-label="Atalhos do painel"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--eid-border-subtle)] bg-eid-card/95 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_30px_-12px_rgba(0,0,0,0.35)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto flex max-w-6xl justify-between gap-0.5 px-1">
          {items.map(({ href, label, Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1 text-[10px] font-semibold leading-tight ${
                  active ? "text-eid-primary-300" : "text-eid-text-secondary"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? "text-eid-primary-400" : ""}`} aria-hidden />
                <span className="line-clamp-2 text-center">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function PainelChromeFallback() {
  return (
    <div
      className="h-36 animate-pulse rounded-[2rem] border border-eid-primary-500/15 bg-eid-card/60 sm:h-40"
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
