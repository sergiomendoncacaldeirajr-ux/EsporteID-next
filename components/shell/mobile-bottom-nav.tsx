"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getContextHomeHref, type ActiveAppContext } from "@/lib/auth/active-context";
import { createClient } from "@/lib/supabase/client";
import type { ReactNode } from "react";

/* ── Cores reativas ao tema ── */
const IC = {
  active: "var(--eid-fg)",
  inactive: "var(--eid-text-secondary)",
};

/* ── Ícones SVG com identidade esportiva ── */

/* Casa / dashboard */
function IconHome({ active }: { active: boolean }) {
  const c = active ? IC.active : IC.inactive;
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <path d="M4 11.3L12 4l8 7.3V20h-5.4v-4.8H9.4V20H4v-8.7z" fill={c} fillOpacity={active ? 0.96 : 0.8} />
    </svg>
  );
}

/* Apito — ícone esportivo para agenda/partidas */
function IconAgenda({ active }: { active: boolean }) {
  const c = active ? IC.active : IC.inactive;
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" fill={c} fillOpacity={active ? 0.96 : 0.8} />
      <rect x="7.3" y="3.2" width="2.1" height="4.3" rx="1.05" fill={c} />
      <rect x="14.6" y="3.2" width="2.1" height="4.3" rx="1.05" fill={c} />
      <path d="M4 10h16" stroke="var(--eid-card)" strokeWidth="1.6" />
    </svg>
  );
}

/* Troféu — para o rank elevado */
function IconTrophy({ active }: { active: boolean }) {
  const c = active ? IC.active : IC.inactive;
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <path d="M7.1 4.5h9.8v5.4a4.9 4.9 0 01-9.8 0V4.5z" fill={c} fillOpacity={active ? 0.96 : 0.8} />
      <path d="M5 5.7h2.1V8a2.3 2.3 0 01-2.1-2.3zm13.9 0H21V8a2.3 2.3 0 01-2.1 2.3z" fill={c} fillOpacity={active ? 0.96 : 0.8} />
      <path d="M12 15v3.1" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <rect x="8.4" y="18.1" width="7.2" height="2.4" rx="1.2" fill={c} fillOpacity={active ? 0.96 : 0.8} />
    </svg>
  );
}

/* Dois jogadores frente a frente — social/comunidade */
function IconSocial({ active }: { active: boolean }) {
  const c = active ? IC.active : IC.inactive;
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <path d="M5 6.8h14a2 2 0 012 2v6.1a2 2 0 01-2 2h-5.5l-2.9 2.6v-2.6H5a2 2 0 01-2-2V8.8a2 2 0 012-2z" fill={c} fillOpacity={active ? 0.96 : 0.8} />
      <circle cx="9.2" cy="11.8" r="1.1" fill="var(--eid-card)" />
      <circle cx="12" cy="11.8" r="1.1" fill="var(--eid-card)" />
      <circle cx="14.8" cy="11.8" r="1.1" fill="var(--eid-card)" />
    </svg>
  );
}

/* Camiseta/jogador — perfil */
function IconPerfil({ active }: { active: boolean }) {
  const c = active ? IC.active : IC.inactive;
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <circle cx="12" cy="8.2" r="3.5" fill={c} fillOpacity={active ? 0.96 : 0.8} />
      <path d="M5 19.2c.9-3.3 3.7-5.3 7-5.3s6.1 2 7 5.3H5z" fill={c} fillOpacity={active ? 0.96 : 0.8} />
    </svg>
  );
}

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
  activeContext?: ActiveAppContext;
};

type UnreadNotif = {
  id: number;
  tipo: string | null;
  referencia_id: number | null;
  remetente_id: string | null;
};

function isFlowActionNotif(tipoRaw: string | null | undefined): boolean {
  const tipo = String(tipoRaw ?? "")
    .trim()
    .toLowerCase();
  return tipo === "match" || tipo === "desafio";
}

function NavBadge({ n }: { n: number }) {
  if (n < 1) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-danger-500)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-danger-500)_88%,transparent)] px-1 text-[9px] font-black leading-none text-white shadow-[0_5px_12px_-7px_color-mix(in_srgb,var(--eid-danger-500)_88%,transparent)]">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function MobileBottomNav({ userId, activeContext = "atleta" }: Props) {
  const pathname = usePathname() ?? "";
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(userId);
  const [agendaBadge, setAgendaBadge] = useState(0);
  const [socialBadge, setSocialBadge] = useState(0);
  const pendingHrefRef = useRef<string | null>(null);
  const releaseTimerRef = useRef<number | undefined>(undefined);

  function onNavLinkClickCapture(ev: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (pendingHrefRef.current === href) {
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    pendingHrefRef.current = href;
    if (releaseTimerRef.current !== undefined) window.clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = window.setTimeout(() => {
      pendingHrefRef.current = null;
      releaseTimerRef.current = undefined;
    }, 450);
  }

  useEffect(() => {
    pendingHrefRef.current = null;
    if (releaseTimerRef.current !== undefined) {
      window.clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = undefined;
    }
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (releaseTimerRef.current !== undefined) window.clearTimeout(releaseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let stopped = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (stopped) return;
      setResolvedUserId(session?.user?.id ?? null);
    });

    if (resolvedUserId) {
      return () => {
        stopped = true;
        subscription.unsubscribe();
      };
    }

    async function resolveUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (stopped) return;
      setResolvedUserId(user?.id ?? null);
    }
    void resolveUser();
    return () => {
      stopped = true;
      subscription.unsubscribe();
    };
  }, [resolvedUserId]);

  useEffect(() => {
    if (!resolvedUserId) return;
    let cancelled = false;
    const supabase = createClient();
    async function load() {
      const [agRes, pRes, mRes, nRes] = await Promise.all([
        supabase
          .from("partidas")
          .select("id", { count: "exact", head: true })
          .or(`jogador1_id.eq.${resolvedUserId},jogador2_id.eq.${resolvedUserId}`)
          .eq("status", "agendada"),
        supabase
          .from("partidas")
          .select("id", { count: "exact", head: true })
          .or(`jogador1_id.eq.${resolvedUserId},jogador2_id.eq.${resolvedUserId}`)
          .eq("status", "aguardando_confirmacao")
          .neq("lancado_por", resolvedUserId),
        supabase.from("matches").select("id", { count: "exact", head: true }).eq("adversario_id", resolvedUserId).eq("status", "Pendente"),
        supabase
          .from("notificacoes")
          .select("id, tipo, referencia_id, remetente_id")
          .eq("usuario_id", resolvedUserId)
          .eq("lida", false)
          .limit(300),
      ]);
      if (cancelled) return;
      setAgendaBadge(agRes.count ?? 0);
      const placar = pRes.count ?? 0;
      const pedidos = mRes.count ?? 0;
      const unreadRows = (nRes.data ?? []) as UnreadNotif[];
      const seen = new Set<string>();
      let unreadGeneral = 0;
      for (const n of unreadRows) {
        const isFlowAction = isFlowActionNotif(n.tipo);
        const key = isFlowAction
          ? `flow:${String(n.tipo ?? "").trim().toLowerCase()}:${String(n.referencia_id ?? "null")}`
          : `id:${n.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        // Notificações de fluxo (desafio/match) já são cobertas pelos cartões de ação
        // (placar/pedidos). Não somar novamente para evitar badge duplicado.
        if (!isFlowAction) unreadGeneral += 1;
      }
      // Social = ações pendentes + notificações gerais (sem duplicar match/desafio).
      setSocialBadge(placar + pedidos + unreadGeneral);
    }
    void load();
    const t = window.setInterval(load, 12000);
    const channel = supabase
      .channel(`eid-mobile-nav-${resolvedUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes", filter: `usuario_id=eq.${resolvedUserId}` },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `usuario_id=eq.${resolvedUserId}` },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `adversario_id=eq.${resolvedUserId}` },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partidas", filter: `jogador1_id=eq.${resolvedUserId}` },
        () => void load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partidas", filter: `jogador2_id=eq.${resolvedUserId}` },
        () => void load()
      )
      .subscribe();
    const onFocus = () => void load();
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(t);
      void supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [resolvedUserId]);

  if (!resolvedUserId) return null;

  const onAuthPage = AUTH_PATH_PREFIXES.some((p) =>
    p.endsWith("/") ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + "/")
  );

  if (onAuthPage) return null;

  if (pathname.startsWith("/admin")) return null;

  const isHome =
    activeContext === "organizador"
      ? pathname === "/organizador"
      : activeContext === "professor"
        ? pathname === "/professor"
        : activeContext === "espaco"
          ? pathname === "/espaco"
          : pathname === "/dashboard" || pathname === "/buscar";
  const isAgenda =
    pathname === "/agenda" ||
    pathname.startsWith("/match") ||
    pathname.startsWith("/desafio") ||
    pathname.startsWith("/perfil-time") ||
    pathname.startsWith("/vagas") ||
    pathname.startsWith("/times") ||
    pathname.startsWith("/registrar-placar");
  const isRank = pathname === "/ranking" || pathname.startsWith("/ranking/");
  const isSocial = pathname === "/comunidade" || pathname.startsWith("/comunidade/");
  const isPerfil = pathname === `/perfil/${resolvedUserId}`;
  const isTorneios = pathname === "/torneios" || pathname.startsWith("/torneios/");
  const isLocais = pathname === "/locais" || pathname.startsWith("/locais/");
  const isCriar = pathname === "/torneios/criar";
  const isProfAgenda = pathname === "/professor/agenda" || pathname.startsWith("/professor/agenda/");
  const isProfAlunos = pathname === "/professor/alunos" || pathname.startsWith("/professor/alunos/");
  const isProfAvaliacoes =
    pathname === "/professor/avaliacoes" || pathname.startsWith("/professor/avaliacoes/");
  const isEspAgenda = pathname === "/espaco/agenda" || pathname.startsWith("/espaco/agenda/");
  const isEspSocios = pathname === "/espaco/socios" || pathname.startsWith("/espaco/socios/");
  const isEspFinanceiro =
    pathname === "/espaco/financeiro" || pathname.startsWith("/espaco/financeiro/");

  const items: Array<{
    href: string;
    label: string;
    icon: ReactNode;
    active: boolean;
    rank?: boolean;
    badge?: number;
    badgeWrap?: boolean;
  }> = activeContext === "organizador"
      ? [
          {
            href: getContextHomeHref(activeContext),
            label: "Home",
            icon: <IconHome active={isHome} />,
            active: isHome,
          },
          {
            href: "/torneios",
            label: "Eventos",
            icon: <IconTrophy active={isTorneios} />,
            active: isTorneios,
          },
          {
            href: "/torneios/criar",
            label: "Criar",
            icon: <IconAgenda active={isCriar} />,
            active: isCriar,
          },
          {
            href: "/locais",
            label: "Locais",
            icon: <IconSocial active={isLocais} />,
            active: isLocais,
          },
          {
            href: `/perfil/${resolvedUserId}`,
            label: "Perfil",
            icon: <IconPerfil active={isPerfil} />,
            active: isPerfil,
          },
        ]
      : activeContext === "professor"
        ? [
            {
              href: getContextHomeHref(activeContext),
              label: "Home",
              icon: <IconHome active={isHome} />,
              active: isHome,
            },
            {
              href: "/professor/agenda",
              label: "Agenda",
              icon: <IconAgenda active={isProfAgenda} />,
              active: isProfAgenda,
            },
            {
              href: "/professor/alunos",
              label: "Alunos",
              icon: <IconSocial active={isProfAlunos} />,
              active: isProfAlunos,
            },
            {
              href: "/professor/avaliacoes",
              label: "Aval.",
              icon: <IconTrophy active={isProfAvaliacoes} />,
              active: isProfAvaliacoes,
            },
            {
              href: `/perfil/${resolvedUserId}`,
              label: "Perfil",
              icon: <IconPerfil active={isPerfil} />,
              active: isPerfil,
            },
          ]
        : activeContext === "espaco"
          ? [
              {
                href: getContextHomeHref(activeContext),
                label: "Home",
                icon: <IconHome active={isHome} />,
                active: isHome,
              },
              {
                href: "/espaco/agenda",
                label: "Agenda",
                icon: <IconAgenda active={isEspAgenda} />,
                active: isEspAgenda,
              },
              {
                href: "/espaco/socios",
                label: "Sócios",
                icon: <IconSocial active={isEspSocios} />,
                active: isEspSocios,
              },
              {
                href: "/espaco/financeiro",
                label: "Financeiro",
                icon: <IconTrophy active={isEspFinanceiro} />,
                active: isEspFinanceiro,
              },
              {
                href: `/perfil/${resolvedUserId}`,
                label: "Perfil",
                icon: <IconPerfil active={isPerfil} />,
                active: isPerfil,
              },
            ]
          : [
          {
            href: getContextHomeHref(activeContext),
            label: "Home",
            icon: <IconHome active={isHome} />,
            active: isHome,
          },
          {
            href: "/agenda",
            label: "Agenda",
            icon: <IconAgenda active={isAgenda} />,
            active: isAgenda,
            badge: agendaBadge,
            badgeWrap: true,
          },
          { href: "/ranking", label: "Rank", icon: <IconTrophy active={isRank} />, active: isRank, rank: true },
          {
            href: "/comunidade",
            label: "Social",
            icon: <IconSocial active={isSocial} />,
            active: isSocial,
            badge: socialBadge,
            badgeWrap: true,
          },
          {
            href: `/perfil/${resolvedUserId}`,
            label: "Perfil",
            icon: <IconPerfil active={isPerfil} />,
            active: isPerfil,
          },
        ];

  return (
    <>
      {/* Padding do conteúdo: #app-main-column (--eid-shell-footer-offset). Espaçador removido para não duplicar folga. */}
      <nav
        className="pointer-events-auto w-full bg-eid-card"
        style={{
          paddingBottom: "max(0px, env(safe-area-inset-bottom, 0px))",
          marginBottom: "calc(-1 * max(0px, env(safe-area-inset-bottom, 0px)))",
        }}
        aria-label="Navegação principal"
      >
        <div
          className="relative overflow-visible rounded-t-[16px] rounded-b-none bg-eid-card"
          style={{
            minHeight: "calc(4rem + max(0px, env(safe-area-inset-bottom, 0px)))",
            paddingBottom: "0.35rem",
            paddingLeft: "max(0px, env(safe-area-inset-left))",
            paddingRight: "max(0px, env(safe-area-inset-right))",
          }}
        >
          <div className="flex items-end justify-around px-1 pt-1.5">
            {items.map((item) => {
              if (item.rank) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClickCapture={(ev) => onNavLinkClickCapture(ev, item.href)}
                    className="relative flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-1.5 transition-opacity active:opacity-80"
                    aria-label={item.label}
                  >
                    <span
                      className="pointer-events-none absolute -top-6 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full blur-xl"
                      style={{
                        background: item.active
                          ? "radial-gradient(circle, color-mix(in srgb, var(--eid-action-400) 70%, transparent), transparent 72%)"
                          : "radial-gradient(circle, color-mix(in srgb, var(--eid-action-400) 36%, transparent), transparent 72%)",
                      }}
                    />
                    <span
                      className={`absolute -top-[1.62rem] flex h-[46px] w-[46px] items-center justify-center rounded-full transition-all ${
                        item.active
                          ? "bg-eid-action-400 ring-[2.5px] ring-eid-card shadow-[0_8px_20px_-6px_color-mix(in_srgb,var(--eid-action-500)_80%,transparent)]"
                          : "bg-eid-action-500/85 ring-[2.5px] ring-eid-card shadow-[0_6px_14px_-7px_color-mix(in_srgb,var(--eid-action-500)_70%,transparent)]"
                      }`}
                    >
                      <IconTrophy active={item.active} />
                    </span>
                    <span className="h-[22px] w-[36px]" aria-hidden />
                    <span
                      className="text-[8px] font-medium leading-none"
                      style={{ color: item.active ? "var(--eid-fg)" : "var(--eid-text-secondary)" }}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClickCapture={(ev) => onNavLinkClickCapture(ev, item.href)}
                  className="relative flex flex-1 flex-col items-center gap-0.5 pb-1.5 transition-opacity active:opacity-80"
                  aria-label={item.label}
                >
                  <span
                    className={`relative flex h-[25px] w-[36px] items-center justify-center rounded-xl transition-all ${
                      item.active ? "bg-eid-primary-500/12" : "bg-transparent"
                    }`}
                    style={{ color: item.active ? "var(--eid-primary-500)" : "var(--eid-text-secondary)" }}
                  >
                    {item.icon}
                    {item.badgeWrap ? <NavBadge n={item.badge ?? 0} /> : null}
                  </span>

                  <span
                    className="text-[8px] font-medium leading-none transition"
                    style={{ color: item.active ? "var(--eid-fg)" : "var(--eid-text-secondary)" }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
