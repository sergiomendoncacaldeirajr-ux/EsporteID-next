"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
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
  asaasStatus?: string | null;
  asaasAccountId?: string | null;
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
  const asaasConfigurado = Boolean(space.asaasAccountId);
  const asaasPendente = !asaasConfigurado && String(space.asaasStatus ?? "").includes("aguardando");

  const navItems = [
    { href: "/espaco", label: "Início", Icon: Home },
    { href: "/espaco/agenda", label: "Agenda", Icon: CalendarDays },
    { href: "/espaco/socios", label: "Sócios", Icon: Users },
    ...(mostrarFinanceiro ? [{ href: "/espaco/financeiro", label: "Financ.", Icon: Wallet }] : []),
    { href: "/espaco/notas-fiscais", label: "Notas", Icon: FileText },
    { href: "/espaco/configuracao", label: "Ajustes", Icon: Settings },
  ] as const;

  const asaasActive = isActivePath(pathname, "/espaco/integracao-asaas");

  return (
    <>
      {/* ── Chrome card ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/92 p-4 shadow-[0_18px_44px_-34px_rgba(0,0,0,0.8)] sm:p-5">
        <div className="relative">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-eid-primary-500/25 bg-eid-primary-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-eid-primary-300">
                Painel do espaço
              </div>
              <h1 className="mt-2 truncate text-xl font-black tracking-tight text-eid-fg sm:text-2xl">
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
                  : asaasConfigurado
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-500/45"
                    : "border-[color:var(--eid-border-subtle)] bg-eid-surface/70 text-eid-text-secondary hover:border-amber-500/30 hover:text-amber-300"
              }`}
            >
              {asaasConfigurado ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              ) : asaasPendente ? (
                <Clock3 className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              ) : (
                <Landmark className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              )}
              {asaasConfigurado ? "Asaas OK" : asaasPendente ? "Asaas pendente" : "Asaas"}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom nav — mobile only ─────────────────────────────────── */}
      <nav
        aria-label="Navegação do painel"
        className="!fixed inset-x-0 bottom-0 z-[55] px-2.5 md:!hidden"
        style={{
          paddingBottom: "max(0px, env(safe-area-inset-bottom, 0px))",
          marginBottom: "calc(-1 * max(0px, env(safe-area-inset-bottom, 0px)))",
        }}
      >
        {/* Pill flutuante — mesmo padrão visual do nav de atleta */}
        <div
          className="overflow-hidden rounded-[2rem] border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_94%,#ffffff_6%)] shadow-[0_14px_30px_-22px_rgba(15,23,42,0.45)]"
          style={{
            minHeight: "calc(4.2rem + max(0px, env(safe-area-inset-bottom, 0px)))",
            paddingBottom: "0.45rem",
            paddingLeft: "max(0px, env(safe-area-inset-left))",
            paddingRight: "max(0px, env(safe-area-inset-right))",
          }}
        >
          <div className="flex items-end justify-around px-1.5 pt-2">
            {/* Itens principais */}
            {navItems.map(({ href, label, Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="relative flex flex-1 flex-col items-center gap-0.5 pb-1.5 transition-opacity active:opacity-80"
                >
                  <span
                    className={`relative flex h-[30px] w-[38px] items-center justify-center rounded-xl transition-all duration-150 ${
                      active ? "bg-eid-primary-500/10" : "bg-transparent"
                    }`}
                    style={{ color: active ? "var(--eid-primary-500)" : "var(--eid-text-secondary)" }}
                  >
                    {active && (
                      <span
                        className="absolute -top-2 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-eid-primary-500"
                        aria-hidden
                      />
                    )}
                    <Icon className="h-[19px] w-[19px] shrink-0" aria-hidden />
                  </span>
                  <span
                    className="text-[10px] font-medium leading-none transition"
                    style={{ color: active ? "var(--eid-fg)" : "var(--eid-text-secondary)" }}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}

            {/* Separador visual */}
            <span className="mb-1.5 w-px self-stretch rounded-full bg-[color:var(--eid-border-subtle)]" aria-hidden />

            {/* Asaas — item secundário */}
            <Link
              href="/espaco/integracao-asaas"
              className="relative flex flex-col items-center gap-0.5 pb-1.5 pl-1 pr-0.5 transition-opacity active:opacity-80"
            >
              <span
                className={`flex h-[30px] w-[34px] items-center justify-center rounded-xl transition-all duration-150 ${
                  asaasActive ? "bg-amber-500/12" : "bg-transparent"
                }`}
                style={{ color: asaasActive ? "#f59e0b" : "var(--eid-text-secondary)" }}
              >
                <Landmark className="h-[19px] w-[19px] shrink-0" aria-hidden />
              </span>
              <span
                className="text-[10px] font-medium leading-none transition"
                style={{ color: asaasActive ? "#f59e0b" : "var(--eid-text-secondary)" }}
              >
                Asaas
              </span>
            </Link>
          </div>
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
