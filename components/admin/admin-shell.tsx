import Link from "next/link";
import type { ReactNode } from "react";

const links: { href: string; label: string; hint: string }[] = [
  { href: "/admin", label: "Visão geral", hint: "Métricas" },
  { href: "/admin/usuarios", label: "Usuários", hint: "Perfis" },
  { href: "/admin/esportes", label: "Esportes", hint: "Catálogo" },
  { href: "/admin/equipes", label: "Equipes", hint: "Times e duplas" },
  { href: "/admin/locais", label: "Locais", hint: "Espaços" },
  { href: "/admin/torneios", label: "Torneios", hint: "Eventos" },
  { href: "/admin/partidas", label: "Partidas", hint: "Confrontos" },
  { href: "/admin/matches", label: "Pedidos match", hint: "Matches" },
  { href: "/admin/denuncias", label: "Denúncias", hint: "Moderação" },
  { href: "/admin/financeiro", label: "Financeiro", hint: "Taxas e promo" },
  { href: "/admin/regras", label: "Ranking", hint: "Regras EID" },
  { href: "/admin/admins", label: "Admins", hint: "Acesso" },
];

export function AdminShell({
  children,
  hasServiceRole,
}: {
  children: ReactNode;
  hasServiceRole: boolean;
}) {
  return (
    <div className="min-h-screen bg-eid-bg text-eid-fg">
      <div className="border-b border-[color:var(--eid-border-subtle)] bg-eid-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-eid-action-500">Administração</p>
            <h1 className="text-lg font-bold text-eid-fg sm:text-xl">EsporteID</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-text-secondary hover:border-eid-primary-500/35 hover:text-eid-fg"
            >
              App (painel)
            </Link>
          </div>
        </div>
        {!hasServiceRole ? (
          <div className="border-t border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-100 sm:px-6">
            Defina <code className="rounded bg-eid-bg px-1">SUPABASE_SERVICE_ROLE_KEY</code> no{" "}
            <code className="rounded bg-eid-bg px-1">.env.local</code> para listagens e edições completas no admin.
          </div>
        ) : null}
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-3 sm:px-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="shrink-0 rounded-lg border border-transparent px-2.5 py-1.5 text-center text-[11px] font-semibold text-eid-text-secondary transition hover:border-eid-primary-500/30 hover:text-eid-fg sm:text-xs"
            >
              <span className="block">{l.label}</span>
              <span className="hidden text-[10px] font-normal text-eid-text-muted sm:block">{l.hint}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6">{children}</div>
    </div>
  );
}
