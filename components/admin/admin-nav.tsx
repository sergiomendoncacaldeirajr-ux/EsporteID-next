"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  CreditCard,
  DollarSign,
  ExternalLink,
  Flag,
  GraduationCap,
  Headset,
  LayoutDashboard,
  MapPin,
  Menu,
  Settings2,
  ShieldCheck,
  Swords,
  Target,
  ToggleRight,
  Trophy,
  Users,
  Users2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  exact?: boolean;
  indent?: boolean;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ href: "/admin", label: "Dashboard", Icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Usuários",
    items: [
      { href: "/admin/usuarios", label: "Perfis", Icon: Users },
      { href: "/admin/admins", label: "Admins & Testers", Icon: ShieldCheck },
    ],
  },
  {
    label: "Plataforma",
    items: [
      { href: "/admin/esportes", label: "Esportes", Icon: Trophy },
      { href: "/admin/equipes", label: "Equipes", Icon: Users2 },
      { href: "/admin/locais", label: "Locais", Icon: MapPin },
      { href: "/admin/locais/planos-mensalidade", label: "Planos (PaaS)", Icon: Building2, indent: true },
      { href: "/admin/locais/suspeitas-mista", label: "Suspeitas Mista", Icon: AlertTriangle, indent: true },
      { href: "/admin/torneios", label: "Torneios", Icon: Calendar },
      { href: "/admin/partidas", label: "Partidas", Icon: Swords },
      { href: "/admin/matches", label: "Pedidos de Desafio", Icon: Target },
      { href: "/admin/professor", label: "Professores", Icon: GraduationCap },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { href: "/admin/operacoes-sociais", label: "Social & Push", Icon: Bell },
      { href: "/admin/push", label: "Push (Env)", Icon: Zap },
      { href: "/admin/denuncias", label: "Denúncias", Icon: Flag },
      { href: "/admin/suporte", label: "Suporte", Icon: Headset },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/admin/financeiro", label: "Parâmetros", Icon: DollarSign },
      { href: "/admin/integracoes-pagamento", label: "Integrações", Icon: CreditCard },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/eid", label: "Motor EID", Icon: Activity },
      { href: "/admin/funcionalidades-do-app", label: "Funcionalidades", Icon: ToggleRight },
      { href: "/admin/regras", label: "Regras & Ranking", Icon: Settings2 },
    ],
  },
];

function SidebarContent({
  hasServiceRole,
  pathname,
  onClose,
}: {
  hasServiceRole: boolean;
  pathname: string;
  onClose?: () => void;
}) {
  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-[color:var(--eid-border-subtle)] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-eid-primary-500/35 bg-eid-primary-500/15 text-sm font-black text-eid-primary-300 shadow-[0_0_24px_-12px_var(--eid-primary-500)]">
            EID
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-eid-action-400">Admin</p>
            <p className="truncate text-sm font-bold leading-tight text-eid-fg">EsporteID</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
          <span className="rounded-lg border border-eid-primary-500/25 bg-eid-primary-500/10 px-2 py-1 font-semibold text-eid-primary-200">
            Gestão
          </span>
          <span
            className={`rounded-lg border px-2 py-1 font-semibold ${
              hasServiceRole
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200"
            }`}
          >
            {hasServiceRole ? "Service OK" : "Limitado"}
          </span>
        </div>
      </div>

      <div className="shrink-0 border-b border-[color:var(--eid-border-subtle)] px-3 py-2">
        <Link
          href="/dashboard"
          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-eid-text-secondary transition hover:bg-eid-bg hover:text-eid-fg"
          onClick={onClose}
        >
          <span>Voltar ao app</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {/* Service role warning */}
      {!hasServiceRole && (
        <div className="shrink-0 border-b border-amber-500/20 bg-amber-500/[0.08] px-3 py-2">
          <p className="text-[10px] leading-snug text-amber-200">
            Configure{" "}
            <code className="rounded bg-eid-bg/60 px-0.5 font-mono text-amber-100">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            para acesso completo.
          </p>
        </div>
      )}

      <nav
        className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Seções do admin"
      >
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4 border-t border-[color:var(--eid-border-subtle)] pt-3" : ""}>
            {group.label && (
              <p className="mb-1.5 px-2.5 text-[9px] font-bold uppercase tracking-[0.16em] text-eid-text-muted">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition ${
                        item.indent ? "ml-3" : ""
                      } ${
                        active
                          ? "border border-eid-primary-500/25 bg-eid-primary-500/15 font-semibold text-eid-fg shadow-[inset_3px_0_0_var(--eid-primary-500)]"
                          : "border border-transparent font-medium text-eid-text-secondary hover:border-[color:var(--eid-border-subtle)] hover:bg-eid-card/70 hover:text-eid-fg"
                      }`}
                    >
                      <item.Icon
                        className={`h-[0.875rem] w-[0.875rem] shrink-0 ${active ? "text-eid-primary-400" : "text-eid-text-muted"}`}
                        strokeWidth={active ? 2.25 : 2}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-[color:var(--eid-border-subtle)] px-4 py-3">
        <p className="text-[10px] font-semibold text-eid-text-muted">Painel administrativo</p>
        <p className="mt-0.5 text-[9px] text-eid-text-muted/80">Operação, moderação e plataforma</p>
      </div>
    </div>
  );
}

export function AdminSidebar({ hasServiceRole }: { hasServiceRole: boolean }) {
  const pathname = usePathname() ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar — always visible on md+ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-68 border-r border-[color:var(--eid-border-subtle)] bg-eid-card/90 shadow-2xl shadow-black/20 backdrop-blur md:flex md:flex-col">
        <SidebarContent hasServiceRole={hasServiceRole} pathname={pathname} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        aria-label="Menu admin"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(22rem,92vw)] flex-col border-r border-[color:var(--eid-border-subtle)] bg-eid-card shadow-2xl shadow-black/40 transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
          className="absolute right-2 top-3 z-10 rounded-lg p-1 text-eid-text-secondary transition hover:bg-eid-bg hover:text-eid-fg"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <SidebarContent
          hasServiceRole={hasServiceRole}
          pathname={pathname}
          onClose={() => setMobileOpen(false)}
        />
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] items-end gap-3 border-b border-[color:var(--eid-border-subtle)] bg-eid-bg/95 px-3 pb-2 backdrop-blur-sm md:hidden">
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setMobileOpen(true)}
          className="rounded-xl p-1.5 text-eid-text-secondary transition hover:bg-eid-card hover:text-eid-fg"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-eid-primary-500/30 bg-eid-primary-500/15 text-[9px] font-black text-eid-primary-300">
            EID
          </div>
          <span className="truncate text-sm font-bold text-eid-fg">EsporteID Admin</span>
        </div>
      </header>
    </>
  );
}

/** @deprecated Use AdminSidebar — kept for any stray imports */
export function AdminNav() {
  return null;
}
