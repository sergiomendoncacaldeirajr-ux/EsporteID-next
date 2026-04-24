"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { ActiveContextSwitch } from "@/components/dashboard/active-context-switch";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LogoWordmark } from "@/components/brand/logo-wordmark";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { EidThemeToggle } from "@/components/eid-theme-toggle";
import {
  getContextHomeHref,
  listAvailableAppContexts,
  resolveActiveAppContext,
  type ActiveAppContext,
} from "@/lib/auth/active-context";
import { listarPapeis } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";

/** Só iOS “Adicionar à Tela de Início” — `navigator.standalone`. Android PWA usa `display-mode: standalone` e não deve levar o mesmo reforço de padding. */
function isIosHomeScreenWebApp(): boolean {
  if (typeof window === "undefined") return false;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

type Props = {
  persistent?: boolean;
  initialMeId?: string | null;
  initialPapeis?: string[];
  initialActiveContext?: ActiveAppContext;
};

/** Sincroniza o input com `?q=` em `/buscar` (useSearchParams precisa de Suspense no pai). */
function BuscarQuerySync({ setQ }: { setQ: (v: string) => void }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  useEffect(() => {
    if (pathname !== "/buscar") return;
    setQ(sp.get("q") ?? "");
  }, [pathname, sp, setQ]);
  return null;
}

export function DashboardTopbar({
  persistent = false,
  initialMeId = null,
  initialPapeis = [],
  initialActiveContext = "atleta",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [meId, setMeId] = useState<string | null>(initialMeId);
  const [papeis, setPapeis] = useState<string[]>(initialPapeis);

  useEffect(() => {
    const sb = createClient();
    let disposed = false;

    async function loadPapeis(uid: string) {
      const { data: papeisRows } = await sb.from("usuario_papeis").select("papel").eq("usuario_id", uid);
      if (disposed) return;
      setPapeis(listarPapeis(papeisRows));
    }

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      if (disposed) return;
      const uid = session?.user?.id ?? null;
      setMeId(uid);
      if (!uid) {
        setPapeis([]);
      } else {
        void loadPapeis(uid);
      }
    });

    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * iOS (ex.: 14 Pro Max + PWA): sincroniza o padding do wrapper do conteúdo com a altura real do header.
   * Deve rodar depois que `meId` existe e o `<header>` está no DOM — por isso fica aqui, não em um irmão.
   */
  useLayoutEffect(() => {
    const wrap = document.getElementById("eid-app-shell-main-wrap");
    if (!persistent || !meId) {
      wrap?.style.removeProperty("padding-top");
      return;
    }

    const el = document.getElementById("eid-persistent-topbar");
    if (!el || !wrap) return;

    const apply = () => {
      const raw = el.getBoundingClientRect().height;
      let pad = Math.max(Math.ceil(raw), 112);
      /*
       * Só Web App no iOS: medição às vezes vem curta vs. área útil real; Android standalone não entra aqui
       * (evita faixa enorme no topo em Chrome/Samsung).
       */
      if (isIosHomeScreenWebApp() && pad < 132) {
        pad = Math.max(pad, 132);
      }
      if (pad > 0) {
        wrap.style.paddingTop = `${pad}px`;
      }
    };

    apply();
    let nestedRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      nestedRaf = requestAnimationFrame(apply);
    });
    const t0 = window.setTimeout(apply, 0);
    const t1 = window.setTimeout(apply, 100);
    const t2 = window.setTimeout(apply, 320);
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    const onOri = () => apply();
    window.addEventListener("orientationchange", onOri);
    window.visualViewport?.addEventListener("resize", apply);

    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(nestedRaf);
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener("orientationchange", onOri);
      window.visualViewport?.removeEventListener("resize", apply);
      wrap.style.removeProperty("padding-top");
    };
  }, [persistent, meId, pathname]);

  const hideBecausePersistent =
    !persistent &&
    typeof document !== "undefined" &&
    Boolean(document.getElementById("eid-persistent-topbar"));
  if (hideBecausePersistent) return null;
  if (!meId) return null;

  const activeContext = resolveActiveAppContext(initialActiveContext, papeis);
  const availableContexts = listAvailableAppContexts(papeis);
  const baseAthleteNavItems = [
    { href: "/dashboard", label: "Painel" },
    { href: "/agenda", label: "Agenda" },
    { href: "/match", label: "Desafio" },
    { href: "/comunidade", label: "Social" },
    { href: "/torneios", label: "Torneios" },
    { href: "/times", label: "Times" },
    { href: "/locais", label: "Locais" },
    { href: "/ranking", label: "Ranking" },
    { href: "/performance", label: "Performance" },
  ];
  const baseOrganizerNavItems = [
    { href: "/organizador", label: "Painel" },
    { href: "/torneios", label: "Eventos" },
    { href: "/torneios/criar", label: "Criar torneio" },
    { href: "/locais", label: "Locais" },
    { href: "/conta/esportes-eid", label: "EID" },
  ];
  const baseProfessorNavItems = [
    { href: "/professor", label: "Painel" },
    { href: "/professor/agenda", label: "Agenda" },
    { href: "/professor/alunos", label: "Alunos" },
    { href: "/professor/avaliacoes", label: "Avaliações" },
    { href: "/professor/perfil", label: "Perfil Prof." },
  ];
  const baseEspacoNavItems = [
    { href: "/espaco", label: "Painel" },
    { href: "/espaco/agenda", label: "Agenda" },
    { href: "/espaco/socios", label: "Sócios" },
    { href: "/espaco/financeiro", label: "Financeiro" },
    { href: "/locais", label: "Locais" },
  ];
  const baseNavItems =
    activeContext === "organizador"
      ? baseOrganizerNavItems
      : activeContext === "professor"
        ? baseProfessorNavItems
        : activeContext === "espaco"
          ? baseEspacoNavItems
          : baseAthleteNavItems;
  const navItems = meId ? [...baseNavItems, { href: `/perfil/${meId}`, label: "Perfil" }] : baseNavItems;

  function navActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/buscar";
    if (href === "/professor") return pathname === "/professor";
    if (href === "/organizador") return pathname === "/organizador";
    if (href === "/espaco") return pathname === "/espaco";
    if (href === "/agenda") return pathname === "/agenda";
    if (href === "/match")
      return pathname === "/match" || pathname.startsWith("/desafio") || pathname.startsWith("/perfil-time");
    if (href === "/comunidade") return pathname === "/comunidade" || pathname.startsWith("/comunidade/");
    if (href === "/ranking") return pathname === "/ranking" || pathname.startsWith("/ranking/");
    if (href === "/performance") return pathname === "/performance" || pathname.startsWith("/performance/");
    if (meId && href === `/perfil/${meId}`) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/buscar?q=${encodeURIComponent(term)}`);
  }

  return (
    <>
      <Suspense fallback={null}>
        <BuscarQuerySync setQ={setQ} />
      </Suspense>
    <header
      id={persistent ? "eid-persistent-topbar" : undefined}
      className={`${persistent ? "fixed left-0 right-0 top-0 z-50" : "sticky top-0 z-40"} border-b border-[color:var(--eid-border-subtle)] bg-eid-bg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] shadow-[0_6px_18px_-12px_rgba(0,0,0,0.34)] backdrop-blur-xl md:mb-3`}
      style={{
        paddingTop: "max(0px, env(safe-area-inset-top, 0px))",
        paddingLeft: "max(0px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(0px, env(safe-area-inset-right, 0px))",
      }}
    >
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 py-1.5 sm:py-2">
          <Link href={getContextHomeHref(activeContext)} className="min-w-0 shrink transition hover:opacity-90">
            <LogoWordmark className="h-8 max-w-[min(52vw,230px)] object-left sm:h-10 sm:max-w-[min(58vw,300px)]" />
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
            <ActiveContextSwitch activeContext={activeContext} availableContexts={availableContexts} />
            <NotificationBell userId={meId} />
            <EidThemeToggle variant="toolbar" />
            <SignOutButton variant="icon" />
          </div>
        </div>

        <form onSubmit={onSubmit} className="pb-2.5">
          <label htmlFor="eid-topbar-search" className="sr-only">
            Buscar no painel
          </label>
          <input
            id="eid-topbar-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              activeContext === "organizador"
                ? "Buscar torneios, locais…"
                : activeContext === "professor"
                  ? "Buscar alunos, aulas…"
                  : activeContext === "espaco"
                    ? "Buscar reservas, sócios…"
                    : "Buscar atletas, locais…"
            }
            className="eid-input-dark h-9 w-full rounded-[var(--eid-radius-md)] border border-[color:var(--eid-border-subtle)] px-3.5 text-sm text-eid-fg placeholder:text-eid-text-secondary/80 md:h-10"
          />
        </form>
      </div>

      <nav className="mx-auto hidden w-full max-w-5xl gap-1 overflow-x-auto px-4 pb-2.5 md:flex sm:px-6">
        {navItems.map((item) => {
          const active = navActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                active
                  ? "border-eid-primary-500/45 bg-eid-primary-500/12 text-eid-fg ring-2 ring-eid-primary-500/35"
                  : "border-transparent bg-transparent text-eid-text-secondary hover:border-eid-primary-500/25 hover:text-eid-fg"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
    </>
  );
}
