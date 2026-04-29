"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import { ActiveContextSwitch } from "@/components/dashboard/active-context-switch";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LogoWordmark } from "@/components/brand/logo-wordmark";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { EidThemeToggle } from "@/components/eid-theme-toggle";
import { SearchSuggestInput } from "@/components/search/search-suggest-input";
import {
  getContextHomeHref,
  listAvailableAppContexts,
  resolveActiveAppContext,
  type ActiveAppContext,
} from "@/lib/auth/active-context";
import { listarPapeis } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";

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
   * Sincroniza o padding de `#eid-app-shell-main-wrap` com a altura do header fixo (mobile/desktop).
   * Roda com `meId` e o `<header>` no DOM; um pequeno desconto evita faixa de fundo entre busca e conteúdo.
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
      /*
       * A medida costuma ficar 2–8px acima do “encaixe” visual (borda/sombra/subpixel),
       * gerando faixa de `--eid-bg` entre a busca e o conteúdo. Compensamos sem encostar no mínimo real.
       */
      let pad = Math.ceil(raw) - 5;
      if (pad < 82) pad = 82;
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
      className={`${persistent ? "fixed left-0 right-0 top-0 z-50" : "sticky top-0 z-40"} border-b border-transparent bg-eid-bg backdrop-blur-xl md:mb-3`}
      style={{
        paddingTop: "max(0px, env(safe-area-inset-top, 0px))",
        paddingLeft: "max(0px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(0px, env(safe-area-inset-right, 0px))",
      }}
    >
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 py-2.5 sm:py-3">
          <Link href={getContextHomeHref(activeContext)} className="min-w-0 shrink transition hover:opacity-90">
            <LogoWordmark className="h-10 max-w-[min(64vw,300px)] object-left sm:h-12 sm:max-w-[min(68vw,390px)]" />
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden md:flex">
              <ActiveContextSwitch activeContext={activeContext} availableContexts={availableContexts} />
            </div>
            <NotificationBell userId={meId} />
            <EidThemeToggle
              variant="toolbar"
              className="h-8 w-8 rounded-full border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_92%,transparent)] text-eid-text-secondary shadow-none hover:border-eid-primary-500/35 md:h-9 md:w-9"
            />
            <SignOutButton variant="icon" />
          </div>
        </div>

        <form onSubmit={onSubmit} className="mb-0 pb-2 sm:pb-3">
          <label htmlFor="eid-topbar-search" className="sr-only">
            Buscar no painel
          </label>
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="pointer-events-none absolute left-4 top-1/2 z-[2] h-5 w-5 -translate-y-1/2 text-[color:color-mix(in_srgb,var(--eid-text-secondary)_82%,#475569_18%)]"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.2-3.2" strokeLinecap="round" />
            </svg>
            <SearchSuggestInput
              id="eid-topbar-search"
              name="q"
              value={q}
              onChange={setQ}
              scope="global"
              minChars={3}
              placeholder={
                activeContext === "organizador"
                  ? "Buscar torneios, locais..."
                  : activeContext === "professor"
                    ? "Buscar alunos, aulas..."
                    : activeContext === "espaco"
                      ? "Buscar reservas, sócios..."
                      : "Buscar atletas, locais..."
              }
              className="h-11 w-full rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,var(--eid-border)_12%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_96%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] pl-12 pr-4 text-[13px] text-eid-fg shadow-[inset_0_1px_0_color-mix(in_srgb,var(--eid-fg)_8%,transparent)] outline-none transition placeholder:text-eid-text-secondary/88 focus:border-eid-primary-500/35 sm:h-12 sm:text-[15px]"
            />
          </div>
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
