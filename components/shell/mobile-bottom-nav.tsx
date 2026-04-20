"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ReactNode } from "react";

const AUTH_PATH_PREFIXES = [
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/redefinir-senha",
  "/verificar-codigo",
  "/auth/",
];

type Props = {
  userId: string | null;
};

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5z" strokeLinejoin="round" />
    </svg>
  );
}

/** Ícone calendário (Agenda) */
function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M6 4h12v2a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V4zm2 8h8v1a6 6 0 0 1-6 6H8v3H4v-3h0a4 4 0 0 0 4-4v-3zm4-4z" />
    </svg>
  );
}

/** Bolhas de conversa (Social / Comunidade) */
function IconSocial() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 12a7 7 0 0 1-7 7H8l-5 3v-3H7a7 7 0 1 1 14-7z" strokeLinejoin="round" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconUserCircle() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="9" r="3" />
      <path d="M6.5 19c1.3-2.2 3.7-3.5 5.5-3.5s4.2 1.3 5.5 3.5" strokeLinecap="round" />
    </svg>
  );
}

function NavBadge({ n }: { n: number }) {
  if (n < 1) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black leading-none text-white shadow-md">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function MobileBottomNav({ userId }: Props) {
  const pathname = usePathname() ?? "";
  const [agendaBadge, setAgendaBadge] = useState(0);
  const [socialBadge, setSocialBadge] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const [agRes, mRes, pRes, nRes] = await Promise.all([
        supabase
          .from("partidas")
          .select("id", { count: "exact", head: true })
          .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId}`)
          .eq("status", "agendada"),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("adversario_id", userId)
          .eq("status", "Pendente"),
        supabase
          .from("partidas")
          .select("id", { count: "exact", head: true })
          .or(`jogador1_id.eq.${userId},jogador2_id.eq.${userId}`)
          .eq("status", "aguardando_confirmacao")
          .neq("lancado_por", userId),
        supabase.from("notificacoes").select("id", { count: "exact", head: true }).eq("usuario_id", userId).eq("lida", false),
      ]);
      if (cancelled) return;
      setAgendaBadge(agRes.count ?? 0);
      const incoming = mRes.count ?? 0;
      const placar = pRes.count ?? 0;
      const unread = nRes.count ?? 0;
      setSocialBadge(incoming + placar + unread);
    }
    void load();
    const t = window.setInterval(load, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [userId]);

  if (!userId) return null;

  const onAuthPage = AUTH_PATH_PREFIXES.some((p) =>
    p.endsWith("/") ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + "/")
  );

  if (onAuthPage) return null;

  if (pathname.startsWith("/admin")) return null;

  const isHome = pathname === "/dashboard";
  const isAgenda =
    pathname === "/agenda" ||
    pathname.startsWith("/match") ||
    pathname.startsWith("/desafio") ||
    pathname.startsWith("/perfil-time") ||
    pathname.startsWith("/times") ||
    pathname.startsWith("/registrar-placar");
  const isRank = pathname === "/ranking" || pathname.startsWith("/ranking/");
  const isSocial = pathname === "/comunidade" || pathname.startsWith("/comunidade/");
  const isPerfil = pathname === `/perfil/${userId}`;

  const items: Array<{
    href: string;
    label: string;
    icon: ReactNode;
    active: boolean;
    rank?: boolean;
    badge?: number;
    badgeWrap?: boolean;
  }> = [
    { href: "/dashboard", label: "Home", icon: <IconHome />, active: isHome },
    {
      href: "/agenda",
      label: "Agenda",
      icon: <IconCalendar />,
      active: isAgenda,
      badge: agendaBadge,
      badgeWrap: true,
    },
    { href: "/ranking", label: "Rank", icon: <IconTrophy />, active: isRank, rank: true },
    {
      href: "/comunidade",
      label: "Social",
      icon: <IconSocial />,
      active: isSocial,
      badge: socialBadge,
      badgeWrap: true,
    },
    {
      href: `/perfil/${userId}`,
      label: "Perfil",
      icon: <IconUserCircle />,
      active: isPerfil,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 z-[55] flex h-[calc(52px+env(safe-area-inset-bottom))] w-full items-center justify-around border-t border-[color:var(--eid-border-subtle)] bg-eid-bg pb-[env(safe-area-inset-bottom)] pt-1 md:hidden"
      aria-label="Navegação principal"
    >
      {items.map((item) => {
        if (item.rank) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition active:opacity-80 ${
                item.active ? "text-eid-action-500" : "text-eid-text-secondary"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                  item.active
                    ? "bg-eid-action-500 text-[var(--eid-brand-ink)] shadow-md shadow-eid-action-500/25"
                    : "border border-[color:var(--eid-border-subtle)] bg-eid-surface text-eid-text-secondary"
                }`}
              >
                <span className="flex [&>svg]:h-[18px] [&>svg]:w-[18px]">{item.icon}</span>
              </span>
              {item.label}
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-semibold uppercase tracking-wide transition active:opacity-80 ${
              item.active ? "text-eid-primary-400" : "text-eid-text-secondary"
            }`}
          >
            <span className={`relative flex h-6 items-center justify-center ${item.active ? "text-eid-primary-400" : ""}`}>
              {item.icon}
              {item.badgeWrap ? <NavBadge n={item.badge ?? 0} /> : null}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
