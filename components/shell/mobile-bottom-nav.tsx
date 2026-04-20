"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, House, MessagesSquare, Trophy, UserCircle2 } from "lucide-react";
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
    { href: "/dashboard", label: "Home", icon: <House strokeWidth={1.7} className="h-[17px] w-[17px]" />, active: isHome },
    {
      href: "/agenda",
      label: "Agenda",
      icon: <CalendarDays strokeWidth={1.7} className="h-[17px] w-[17px]" />,
      active: isAgenda,
      badge: agendaBadge,
      badgeWrap: true,
    },
    { href: "/ranking", label: "Rank", icon: <Trophy strokeWidth={1.65} className="h-[18px] w-[18px]" />, active: isRank, rank: true },
    {
      href: "/comunidade",
      label: "Social",
      icon: <MessagesSquare strokeWidth={1.7} className="h-[17px] w-[17px]" />,
      active: isSocial,
      badge: socialBadge,
      badgeWrap: true,
    },
    {
      href: `/perfil/${userId}`,
      label: "Perfil",
      icon: <UserCircle2 strokeWidth={1.7} className="h-[17px] w-[17px]" />,
      active: isPerfil,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 z-[55] flex h-[calc(50px+env(safe-area-inset-bottom))] w-full items-end justify-around border-t border-[color:var(--eid-border-subtle)] bg-eid-card/80 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.38)] backdrop-blur-md supports-[backdrop-filter]:bg-eid-card/70 md:hidden"
      aria-label="Navegação principal"
    >
      {items.map((item) => {
        if (item.rank) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 pb-0.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.11em] transition active:scale-95 ${
                item.active ? "text-eid-primary-500" : "text-eid-text-secondary"
              }`}
            >
              <span className={`absolute left-1/2 top-0 h-[2px] w-6 -translate-x-1/2 rounded-full transition ${item.active ? "bg-eid-primary-500/80" : "bg-transparent"}`} />
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-3xl transition ${
                  item.active
                    ? "bg-eid-primary-500/12 text-eid-primary-400 ring-2 ring-eid-primary-500/30"
                    : "text-eid-text-secondary"
                }`}
              >
                <span className="flex">{item.icon}</span>
              </span>
              {item.label}
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex min-h-[38px] flex-1 flex-col items-center justify-center gap-0.5 px-0.5 pb-0.5 text-[9px] font-semibold uppercase tracking-[0.11em] transition active:scale-95 ${
              item.active ? "text-eid-primary-400" : "text-eid-text-secondary"
            }`}
          >
            <span className={`absolute left-1/2 top-0 h-[2px] w-6 -translate-x-1/2 rounded-full transition ${item.active ? "bg-eid-primary-500/80" : "bg-transparent"}`} />
            <span
              className={`relative flex h-7 items-center justify-center rounded-2xl px-2 transition ${
                item.active ? "bg-eid-primary-500/10 text-eid-primary-400 ring-2 ring-eid-primary-500/25" : ""
              }`}
            >
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
