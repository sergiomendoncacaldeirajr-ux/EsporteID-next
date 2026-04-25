import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/admin-nav";

export function AdminShell({
  children,
  hasServiceRole,
}: {
  children: ReactNode;
  hasServiceRole: boolean;
}) {
  return (
    <div className="min-h-screen bg-eid-bg text-eid-fg" data-eid-admin>
      <header className="eid-admin-header sticky top-0 z-40 border-b border-[color:var(--eid-border-subtle)] bg-eid-bg/90 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-eid-primary-500/40 to-transparent" aria-hidden />
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/10 text-sm font-black text-eid-primary-300 eid-admin-logo-mark">
              A
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-eid-action-500">Administração</p>
              <h1 className="text-lg font-bold tracking-tight text-eid-fg sm:text-xl">EsporteID</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 px-4 py-2 text-xs font-semibold text-eid-fg transition hover:border-eid-primary-500/40 hover:bg-eid-card"
            >
              Voltar ao app
            </Link>
          </div>
        </div>
        {!hasServiceRole ? (
          <div className="border-t border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 px-3 py-2.5 text-center text-xs leading-snug text-amber-100 eid-admin-service-role-banner sm:px-6">
            Defina <code className="rounded-md bg-eid-bg/80 px-1.5 py-0.5 font-mono text-[11px] eid-admin-inline-code">SUPABASE_SERVICE_ROLE_KEY</code> no{" "}
            <code className="rounded-md bg-eid-bg/80 px-1.5 py-0.5 font-mono text-[11px] eid-admin-inline-code">.env.local</code> para carregar listagens e
            salvar alterações.
          </div>
        ) : null}
        <AdminNav />
      </header>
      <div className="mx-auto max-w-6xl px-3 py-8 sm:px-6">{children}</div>
    </div>
  );
}
