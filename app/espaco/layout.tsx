import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { requireEspacoManagerUser } from "@/lib/espacos/server";

export default async function EspacoLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { managedSpaces } = await requireEspacoManagerUser("/espaco");
  const space = managedSpaces[0];

  const navItems = [
    { href: "/espaco", label: "Resumo" },
    { href: "/espaco/socios", label: "Sócios" },
    { href: "/espaco/agenda", label: "Agenda" },
    { href: "/espaco/financeiro", label: "Financeiro" },
  ];

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] border border-eid-primary-500/20 bg-gradient-to-br from-eid-card via-eid-card to-eid-primary-500/10 p-5 shadow-[0_24px_56px_-26px_rgba(37,99,235,0.45)] sm:p-6">
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
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-eid-fg sm:text-3xl">
              {space?.nome_publico ?? "Espaço"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-eid-text-secondary">
              Gestão operacional completa do local, com sócios, quadras, agenda,
              cobrança, auditoria e integração com professores e torneios.
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-eid-card/90">
              <div className="h-full w-1/3 rounded-full bg-eid-primary-500" />
            </div>
          </div>
          <div className="relative mt-5 flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-3.5 py-2 text-xs font-semibold text-eid-fg transition hover:border-eid-primary-500/45 hover:bg-eid-primary-500/10 hover:text-eid-primary-300"
              >
                {item.label}
              </Link>
            ))}
            {space?.slug ? (
              <Link
                href={`/espaco/${space.slug}`}
                className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-3.5 py-2 text-xs font-semibold text-eid-action-400 transition hover:border-eid-action-500/55"
              >
                Ver landing pública
              </Link>
            ) : null}
          </div>
        </div>
        <div className="mt-5">{children}</div>
      </main>
    </>
  );
}
