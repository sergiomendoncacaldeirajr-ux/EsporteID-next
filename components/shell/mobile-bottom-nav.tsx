"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getContextHomeHref, type ActiveAppContext } from "@/lib/auth/active-context";
import { createClient } from "@/lib/supabase/client";
import type { ReactNode } from "react";

/* ── Cores reativas ao tema ── */
const IC = {
  active: "var(--eid-primary-500)",
  inactive: "var(--eid-text-secondary)",
};

/* ── Ícones SVG com identidade esportiva ── */

/* Casa / dashboard */
function IconHome({ active }: { active: boolean }) {
  const c = active ? IC.active : IC.inactive;
  return (
    <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="none">
      {/* Telhado */}
      <path d="M3 11L12 3l9 8" stroke={c} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Corpo */}
      <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" fill={c} fillOpacity={active ? 0.18 : 0.1} stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      {/* Porta */}
      <rect x="10" y="14" width="4" height="6" rx="0.5" fill={c} fillOpacity={active ? 0.55 : 0.3} />
    </svg>
  );
}

/* Apito — ícone esportivo para agenda/partidas */
function IconAgenda({ active }: { active: boolean }) {
  const c = active ? IC.active : IC.inactive;
  return (
    <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="none">
      {/* Corpo do apito */}
      <path
        d="M14 8H8a4 4 0 000 8h4l2-8z"
        fill={c} fillOpacity={active ? 0.2 : 0.12}
        stroke={c} strokeWidth="1.8" strokeLinejoin="round"
      />
      {/* Bico */}
      <path d="M14 8l3-3 2 2-1 3-4-2z" fill={c} fillOpacity={active ? 0.55 : 0.35} stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Cordinha */}
      <path d="M8 12h3" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      {/* Bolinha do bico */}
      <circle cx="19" cy="5" r="1.2" fill={c} fillOpacity={active ? 0.8 : 0.5} />
    </svg>
  );
}

/* Troféu — para o rank elevado */
function IconTrophy({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-[21px] w-[21px] ${active ? "opacity-100" : "opacity-80"}`} fill="none">
      <path d="M7 3h10v8a5 5 0 01-10 0V3z" fill="white" fillOpacity="0.92" />
      <path d="M4 4h3v5a3 3 0 01-3-3V4zM17 4h3v2a3 3 0 01-3 3V4z" fill="white" fillOpacity="0.65" />
      <line x1="12" y1="16" x2="12" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <rect x="8" y="19" width="8" height="2.5" rx="1.25" fill="white" fillOpacity="0.85" />
      {/* Estrela no topo do troféu */}
      <path d="M12 5.5l.8 1.6 1.7.25-1.25 1.2.3 1.7L12 9.4l-1.55.85.3-1.7L9.5 7.35l1.7-.25L12 5.5z" fill="rgba(249,115,22,0.9)" />
    </svg>
  );
}

/* Dois jogadores frente a frente — social/comunidade */
function IconSocial({ active }: { active: boolean }) {
  const c = active ? IC.active : IC.inactive;
  return (
    <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="none">
      {/* Jogador esquerda */}
      <circle cx="8" cy="8" r="2.8" fill={c} fillOpacity={active ? 0.25 : 0.15} stroke={c} strokeWidth="1.6" />
      <path d="M3 19c0-3 2.2-5 5-5s5 2 5 5" stroke={c} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      {/* Jogador direita */}
      <circle cx="16" cy="8" r="2.8" fill={c} fillOpacity={active ? 0.45 : 0.2} stroke={c} strokeWidth="1.6" />
      <path d="M11 19c0-3 2.2-5 5-5s5 2 5 5" stroke={c} strokeWidth="1.7" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* Camiseta/jogador — perfil */
function IconPerfil({ active }: { active: boolean }) {
  const c = active ? IC.active : IC.inactive;
  return (
    <svg viewBox="0 0 24 24" className="h-[20px] w-[20px]" fill="none">
      {/* Camiseta esportiva */}
      <path
        d="M9 3L6 6l-3 1.5 2 4 3-1.5V21h8V10l3 1.5 2-4L18 6l-3-3"
        fill={c} fillOpacity={active ? 0.18 : 0.1}
        stroke={c} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round"
      />
      {/* Gola */}
      <path d="M9 3c0 1.657 1.343 3 3 3s3-1.343 3-3" stroke={c} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      {/* Número */}
      <text x="12" y="17" textAnchor="middle" fontSize="5.5" fontWeight="900" fill={c} fillOpacity={active ? 0.8 : 0.5}>10</text>
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

function NavBadge({ n }: { n: number }) {
  if (n < 1) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black leading-none text-white shadow-md">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function MobileBottomNav({ userId, activeContext = "atleta" }: Props) {
  const pathname = usePathname() ?? "";
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(userId);
  const [agendaBadge, setAgendaBadge] = useState(0);
  const [socialBadge, setSocialBadge] = useState(0);

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
    async function load() {
      const supabase = createClient();
      const [agRes, mRes, pRes, nRes] = await Promise.all([
        supabase
          .from("partidas")
          .select("id", { count: "exact", head: true })
          .or(`jogador1_id.eq.${resolvedUserId},jogador2_id.eq.${resolvedUserId}`)
          .eq("status", "agendada"),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("adversario_id", resolvedUserId)
          .eq("status", "Pendente"),
        supabase
          .from("partidas")
          .select("id", { count: "exact", head: true })
          .or(`jogador1_id.eq.${resolvedUserId},jogador2_id.eq.${resolvedUserId}`)
          .eq("status", "aguardando_confirmacao")
          .neq("lancado_por", resolvedUserId),
        supabase
          .from("notificacoes")
          .select("id", { count: "exact", head: true })
          .eq("usuario_id", resolvedUserId)
          .eq("lida", false),
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
          : pathname === "/dashboard";
  const isAgenda =
    pathname === "/agenda" ||
    pathname.startsWith("/match") ||
    pathname.startsWith("/desafio") ||
    pathname.startsWith("/perfil-time") ||
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
        className="fixed bottom-0 left-0 z-[55] w-full md:hidden"
        aria-label="Navegação principal"
        style={{ viewTransitionName: "eid-app-bottomnav" }}
      >
        <div
          className="relative overflow-visible rounded-t-[18px] border-t border-[color:var(--eid-border-subtle)] bg-eid-card/96 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] backdrop-blur-xl"
          style={{ paddingBottom: "max(0.3rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-around px-1 pt-1.5">
            {items.map((item) => {
              if (item.rank) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-1.5 transition-transform active:scale-90"
                    aria-label={item.label}
                  >
                    {/* Glow permanente — destaque de feature principal */}
                    <span
                      className="pointer-events-none absolute -top-8 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full blur-2xl"
                      style={{
                        background: item.active
                          ? "radial-gradient(circle, rgba(249,115,22,0.75), transparent 70%)"
                          : "radial-gradient(circle, rgba(249,115,22,0.35), transparent 70%)",
                      }}
                    />
                    {/* Botão elevado */}
                    <span
                      className={`absolute -top-7 flex h-[56px] w-[56px] items-center justify-center rounded-full transition-all ${
                        item.active
                          ? "bg-eid-action-500 ring-[3px] ring-eid-card shadow-[0_8px_28px_-4px_rgba(249,115,22,0.95),0_0_0_5px_rgba(249,115,22,0.18)]"
                          : "bg-gradient-to-b from-eid-action-400 to-eid-action-600 ring-[3px] ring-eid-card shadow-[0_6px_20px_-4px_rgba(249,115,22,0.7),0_0_0_4px_rgba(249,115,22,0.1)]"
                      }`}
                    >
                      <IconTrophy active={item.active} />
                    </span>
                    {/* Espaçador invisível que reserva a altura do ícone, alinhando o label */}
                    <span className="h-[28px] w-[42px]" aria-hidden />
                    <span
                      className="text-[8px] font-semibold uppercase tracking-[0.12em] leading-none"
                      style={{ color: item.active ? "var(--eid-action-500)" : "var(--eid-text-secondary)" }}
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
                  className="relative flex flex-1 flex-col items-center gap-0.5 pb-1.5 transition-transform active:scale-90"
                  aria-label={item.label}
                >
                  {/* Raio de luz no topo quando ativo */}
                  {item.active && (
                    <span
                      className="pointer-events-none absolute -top-px left-1/2 h-[2px] w-7 -translate-x-1/2 rounded-full"
                      style={{
                        background: "linear-gradient(90deg,transparent,var(--eid-primary-400),transparent)",
                        boxShadow: "0 0 7px 1.5px rgba(96,165,250,0.55)",
                      }}
                    />
                  )}

                  {/* Ícone */}
                  <span
                    className={`relative flex h-[28px] w-[42px] items-center justify-center rounded-xl transition-all ${
                      item.active ? "bg-eid-primary-500/12" : ""
                    }`}
                    style={{ color: item.active ? "var(--eid-primary-500)" : "var(--eid-text-secondary)" }}
                  >
                    {item.icon}
                    {item.badgeWrap ? <NavBadge n={item.badge ?? 0} /> : null}
                  </span>

                  <span
                    className="text-[8px] font-semibold uppercase tracking-[0.12em] leading-none transition"
                    style={{ color: item.active ? "var(--eid-primary-500)" : "var(--eid-text-secondary)" }}
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
