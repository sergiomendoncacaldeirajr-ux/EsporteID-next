import type { ReactNode } from "react";
import { SkBlock } from "@/components/loading/skeleton-primitives";
import { PROFILE_HERO_PANEL_CLASS, PROFILE_SECTION_TITLE } from "@/components/perfil/profile-ui-tokens";

const MAIN_PROFILE =
  "mx-auto w-full max-w-lg px-2.5 pb-[calc(var(--eid-shell-footer-offset)+1rem)] pt-2 sm:max-w-2xl sm:px-5 sm:pb-8 sm:pt-3";

const HERO_PANEL =
  "eid-surface-panel relative mt-2 overflow-hidden rounded-2xl bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_16px_32px_-20px_rgba(15,23,42,0.45),0_0_20px_-16px_rgba(37,99,235,0.48)]";

/** Mesmas classes do `DashboardTopbar` (sticky, blur, safe-area). */
export function DashboardTopbarSkeleton() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] shadow-[0_6px_18px_-12px_rgba(0,0,0,0.34)] backdrop-blur-xl md:mb-3"
      style={{
        paddingTop: "max(0px, env(safe-area-inset-top, 0px))",
        paddingLeft: "max(0px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(0px, env(safe-area-inset-right, 0px))",
      }}
    >
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 py-1.5 sm:py-2">
          <SkBlock className="h-8 w-[min(52vw,230px)] max-w-full rounded-md sm:h-10" />
          <div className="flex shrink-0 items-center gap-1.5">
            <SkBlock className="h-8 w-8 rounded-lg sm:h-9 sm:w-9" />
            <SkBlock className="h-8 w-8 rounded-lg sm:h-9 sm:w-9" />
            <SkBlock className="h-8 w-8 rounded-lg sm:h-9 sm:w-9" />
            <SkBlock className="h-8 w-8 rounded-lg sm:h-9 sm:w-9" />
          </div>
        </div>
        <div className="pb-2.5">
          <SkBlock className="h-9 w-full rounded-xl sm:h-10" />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkBlock
              key={i}
              className={`h-7 shrink-0 rounded-lg sm:h-8 ${["w-14", "w-16", "w-12", "w-20"][i % 4]}`}
            />
          ))}
        </div>
      </div>
    </header>
  );
}

function SectionTitleSkeleton({ className }: { className?: string }) {
  return (
    <h2 className={`${PROFILE_SECTION_TITLE} ${className ?? ""}`} aria-hidden>
      <SkBlock className="h-2.5 w-32 rounded-md" />
    </h2>
  );
}

function ProfilePublicHeroSkeleton() {
  return (
    <div className={HERO_PANEL}>
      <div className="relative h-24 w-full sm:h-28">
        <div
          className="h-full w-full opacity-90"
          style={{ background: "linear-gradient(135deg,#172554 0%,#0b1d2e 55%,#0b0f14 100%)" }}
        />
        <SkBlock className="absolute right-2 top-2 z-[3] h-7 w-20 rounded-lg" />
      </div>
      <div className="px-3 pb-3 pt-0">
        <div className="relative z-[3] -mt-6 flex items-end gap-3 sm:-mt-7">
          <SkBlock className="z-10 h-[68px] w-[68px] shrink-0 rounded-full shadow-[0_0_0_2px_rgba(249,115,22,0.55)]" />
          <div className="min-w-0 flex-1 space-y-2 pb-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <SkBlock className="h-4 w-40 max-w-full rounded-md" />
              <SkBlock className="h-4 w-14 rounded-full" />
              <SkBlock className="h-4 w-16 rounded-full" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <SkBlock className="h-3 w-24 rounded-md" />
              <SkBlock className="h-3 w-px" />
              <SkBlock className="h-3 w-28 rounded-full" />
            </div>
          </div>
        </div>
        <SkBlock className="mt-2 h-8 w-full max-w-md rounded-md" />
        <div className="eid-list-item mt-3 grid grid-cols-4 divide-x divide-[color:var(--eid-border-subtle)] rounded-xl bg-eid-surface/45 text-center">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="py-2">
              <SkBlock className="mx-auto h-5 w-8 rounded-md" />
              <SkBlock className="mx-auto mt-1 h-2 w-14 rounded" />
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-nowrap items-center gap-x-2 overflow-x-auto pb-0.5">
          <SkBlock className="h-3 w-16 shrink-0 rounded" />
          <SkBlock className="h-3 w-14 shrink-0 rounded" />
          <SkBlock className="h-3 w-12 shrink-0 rounded" />
          <SkBlock className="ml-auto h-6 w-20 shrink-0 rounded-full" />
        </div>
        <div className="mt-3">
          <SkBlock className="mb-1.5 h-2 w-24 rounded" />
          <div className="flex flex-wrap gap-1.5">
            <SkBlock className="h-7 w-28 rounded-full" />
            <SkBlock className="h-7 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Rota `/perfil/[id]` durante navegação: só hero + poucos blocos.
 * O skeleton completo era muito mais alto que muitos perfis reais → sensação de “abrir grande e encolher”.
 */
export function ProfilePublicRouteLoadingCompact() {
  return (
    <main className={MAIN_PROFILE}>
      <ProfilePublicHeroSkeleton />
      <ProfilePublicBelowFoldSkeleton />
    </main>
  );
}

/** Conteúdo abaixo do hero no perfil público (streaming / Suspense). */
export function ProfilePublicBelowFoldSkeleton() {
  return (
    <div className="mt-4 grid gap-4 motion-reduce:animate-none" aria-hidden>
      <SkBlock className="h-14 w-full rounded-2xl" />
      <SkBlock className="h-28 w-full rounded-2xl" />
      <SkBlock className="h-36 w-full rounded-2xl" />
      <SkBlock className="h-32 w-full rounded-xl" />
      <SkBlock className="h-40 w-full rounded-xl" />
    </div>
  );
}

/** Só a seção de histórico (terceiro estágio de streaming no perfil). */
export function ProfilePublicHistoricoStreamSkeleton() {
  return (
    <div className="mt-0 space-y-2 motion-reduce:animate-none" aria-hidden>
      <div className="flex justify-end">
        <SkBlock className="h-7 w-36 rounded-full" />
      </div>
      <SkBlock className="h-44 w-full rounded-2xl" />
    </div>
  );
}

/** Perfil público — hero, stats, ficha, ação, EID, equipes, histórico (sem bloco Professor para manter altura estável). */
export function ProfilePublicPageSkeleton() {
  return (
    <main className={MAIN_PROFILE}>
      <ProfilePublicHeroSkeleton />

      <div className="mt-4 grid gap-4">
        <div className="grid grid-cols-2 gap-2">
          <SkBlock className="col-span-2 h-11 rounded-xl" />
          <SkBlock className="col-span-2 h-9 rounded-xl" />
        </div>

        <div className="-mt-3">
          <div className="-mb-5 flex justify-end">
            <SkBlock className="h-4 w-28 rounded" />
          </div>
          <section>
            <SectionTitleSkeleton />
            <div className="eid-list-item mt-2 rounded-xl bg-eid-card/55 p-2">
              <div className="flex snap-x gap-2 overflow-x-auto pb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex min-h-[42px] min-w-[108px] shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-xl bg-eid-surface/45 px-1 py-1"
                  >
                    <SkBlock className="h-5 w-[88px] rounded-full" />
                    <SkBlock className="h-2 w-16 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="mt-2">
          <div className="-mb-5 flex justify-end">
            <SkBlock className="h-4 w-28 rounded" />
          </div>
          <section>
            <SectionTitleSkeleton />
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="eid-list-item flex items-center gap-2 rounded-xl bg-eid-card/55 p-2">
                  <SkBlock className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <SkBlock className="h-3 w-full rounded" />
                    <SkBlock className="h-2 w-3/4 max-w-[120px] rounded" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-0">
          <div className="-mb-5 flex justify-end">
            <SkBlock className="relative top-0.5 h-4 w-32 rounded" />
          </div>
          <section>
            <SectionTitleSkeleton />
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-1.5 py-1">
                  <SkBlock className="mx-auto h-4 w-6 rounded" />
                  <SkBlock className="mx-auto mt-1 h-2 w-8 rounded" />
                </div>
              ))}
            </div>
            <ul className="mt-2 grid gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-2 py-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <SkBlock className="h-4 w-4 rounded" />
                    <SkBlock className="h-3 w-10 rounded" />
                    <SkBlock className="h-3 w-8 rounded" />
                  </div>
                  <SkBlock className="h-2 w-16 rounded" />
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-end">
              <SkBlock className="h-4 w-40 rounded" />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

const EDIT_MAIN =
  "mx-auto w-full max-w-3xl px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5";

export function ProfileEditShellSkeleton({
  titleWidth = "w-48",
  subtitleLines = 2,
  topAction,
  children,
}: {
  titleWidth?: string;
  subtitleLines?: number;
  topAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className={EDIT_MAIN}>
      <section className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <SkBlock className="h-4 w-14 rounded" />
          <SkBlock className={`mt-2 h-6 ${titleWidth} max-w-full rounded-md sm:h-7`} />
          <div className="mt-1 space-y-1.5">
            {Array.from({ length: subtitleLines }).map((_, i) => (
              <SkBlock key={i} className={`h-3 rounded ${i === subtitleLines - 1 ? "w-4/5 max-w-md" : "w-full max-w-lg"}`} />
            ))}
          </div>
        </div>
        {topAction ? <div className="shrink-0 pt-6 sm:pt-7">{topAction}</div> : null}
      </section>
      {children}
    </main>
  );
}

/** Editar perfil: mídia (capa + avatar) + painel dados pessoais. */
export function EditarPerfilSkeleton() {
  return (
    <ProfileEditShellSkeleton titleWidth="w-40" subtitleLines={2}>
      <div className="space-y-3">
        <div className="eid-surface-panel rounded-2xl p-3 sm:p-4">
          <SkBlock className="mb-3 h-3 w-40 rounded" />
          <SkBlock className="h-28 w-full rounded-xl sm:h-32" />
          <div className="mt-3 flex justify-center">
            <SkBlock className="h-20 w-20 rounded-full ring-4 ring-eid-bg sm:h-24 sm:w-24" />
          </div>
          <SkBlock className="mx-auto mt-2 h-3 w-32 rounded" />
          <SkBlock className="mt-4 h-3 w-36 rounded" />
          <SkBlock className="mt-2 h-28 w-full rounded-xl" />
        </div>
        <div className="eid-surface-panel rounded-2xl p-3 sm:p-4">
          <SkBlock className="mb-3 h-3 w-32 rounded" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mb-2 last:mb-0">
              <SkBlock className="mb-1 h-2 w-20 rounded" />
              <SkBlock className="h-10 w-full rounded-lg" />
            </div>
          ))}
          <SkBlock className="mt-3 ml-auto h-9 w-32 rounded-xl" />
        </div>
      </div>
    </ProfileEditShellSkeleton>
  );
}

/** Performance EID: lista de cards de esporte. */
export function EditarPerformanceEidSkeleton() {
  return (
    <ProfileEditShellSkeleton titleWidth="w-56" subtitleLines={2}>
      <div className="eid-surface-panel rounded-2xl p-3 sm:p-4">
        <SkBlock className="mb-3 h-3 w-40 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="eid-list-item mb-2 rounded-xl bg-eid-card/55 p-2 last:mb-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <SkBlock className="h-4 w-32 rounded" />
              <SkBlock className="h-3 w-14 rounded" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <SkBlock className="h-9 w-full rounded-lg" />
              <SkBlock className="h-9 w-full rounded-lg" />
              <SkBlock className="h-9 w-full rounded-lg sm:col-span-2" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <SkBlock className="h-7 w-20 rounded-full" />
              <SkBlock className="h-7 w-16 rounded-full" />
              <SkBlock className="h-7 w-14 rounded-full" />
            </div>
          </div>
        ))}
        <SkBlock className="mt-3 ml-auto h-9 w-40 rounded-xl" />
      </div>
    </ProfileEditShellSkeleton>
  );
}

/** Editar equipes: lista de formações (dupla/time) + botão nova equipe no topo. */
export function EditarEquipesSkeleton() {
  return (
    <ProfileEditShellSkeleton
      titleWidth="w-64"
      subtitleLines={1}
      topAction={<SkBlock className="h-8 w-28 rounded-xl" />}
    >
      <div className="space-y-4">
        <section className="eid-surface-panel rounded-2xl p-3">
          <SkBlock className="h-3 w-24 rounded" />
          <div className="mt-2 grid gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="eid-list-item flex items-center gap-2 rounded-xl bg-eid-card/55 p-2">
                <SkBlock className="h-10 w-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1">
                  <SkBlock className="h-3 w-36 rounded" />
                  <SkBlock className="h-2 w-28 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ProfileEditShellSkeleton>
  );
}

/** Privacidade histórico. */
export function EditarHistoricoSkeleton() {
  return (
    <ProfileEditShellSkeleton titleWidth="w-52" subtitleLines={2}>
      <div className="eid-surface-panel rounded-2xl p-3">
        <SkBlock className="mb-2 h-3 w-44 rounded" />
        <SkBlock className="h-4 w-full max-w-sm rounded" />
        <SkBlock className="mt-2 h-16 w-full rounded-lg" />
        <SkBlock className="mt-3 h-9 w-64 rounded-lg" />
      </div>
    </ProfileEditShellSkeleton>
  );
}

/** Cadastrar equipe — escudo, chips, campos. */
export function CadastrarEquipeSkeleton() {
  return (
    <ProfileEditShellSkeleton titleWidth="w-72" subtitleLines={2}>
      <div className="eid-surface-panel rounded-2xl p-3 sm:p-4">
        <SkBlock className="mx-auto h-24 w-24 rounded-xl sm:h-28 sm:w-28" />
        <SkBlock className="mx-auto mt-2 h-3 w-48 rounded" />
        <SkBlock className="mt-4 h-3 w-16 rounded" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          <SkBlock className="h-8 w-20 rounded-full" />
          <SkBlock className="h-8 w-16 rounded-full" />
        </div>
        <SkBlock className="mt-3 h-3 w-14 rounded" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkBlock key={i} className="h-8 w-[4.5rem] rounded-md" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mt-3">
            <SkBlock className="mb-1 h-2 w-24 rounded" />
            <SkBlock className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <SkBlock className="mt-4 h-11 w-full rounded-xl" />
      </div>
    </ProfileEditShellSkeleton>
  );
}

/** Editar time: formulário + gestão elenco. */
export function EditarTimeDuplaSkeleton() {
  return (
    <ProfileEditShellSkeleton titleWidth="w-44" subtitleLines={1}>
      <div className="space-y-3">
        <div className="eid-surface-panel rounded-2xl p-3 sm:p-4">
          <div className="flex flex-wrap items-start gap-3">
            <SkBlock className="h-16 w-16 shrink-0 rounded-xl sm:h-20 sm:w-20" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkBlock className="h-3 w-full max-w-xs rounded" />
              <SkBlock className="h-3 w-2/3 rounded" />
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mt-3">
              <SkBlock className="mb-1 h-2 w-28 rounded" />
              <SkBlock className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="eid-surface-panel rounded-2xl p-3 sm:p-4">
          <SkBlock className="h-3 w-40 rounded" />
          <SkBlock className="mt-2 h-10 w-full rounded-lg" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="eid-list-item flex items-center gap-2 rounded-xl bg-eid-card/55 p-2">
                <SkBlock className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <SkBlock className="h-3 w-32 rounded" />
                  <SkBlock className="h-2 w-24 rounded" />
                </div>
                <SkBlock className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProfileEditShellSkeleton>
  );
}

/** Streaming bloco 1 — painel hero da página EID da formação (time/dupla). */
export function FormacaoEidHeroStreamSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <SkBlock className="h-4 w-28 rounded" />
      <div className={`overflow-hidden ${PROFILE_HERO_PANEL_CLASS}`}>
        <div className="flex flex-wrap gap-3 px-3 py-3 sm:px-4 sm:py-4">
          <SkBlock className="h-16 w-16 shrink-0 rounded-2xl sm:h-20 sm:w-20" />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <SkBlock className="h-3 w-24 rounded-full" />
            <SkBlock className="h-5 w-48 max-w-full rounded-md" />
            <SkBlock className="h-3 w-40 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-[color:var(--eid-border-subtle)] px-3 py-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-2 py-2">
              <SkBlock className="mx-auto h-2 w-12 rounded" />
              <SkBlock className="mx-auto mt-1 h-6 w-10 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Streaming bloco 2 — tendência, panorama e lista de partidas da formação. */
export function FormacaoEidDetailsStreamSkeleton() {
  return (
    <div className="mt-3 space-y-3" aria-hidden>
      <SkBlock className="h-36 w-full rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50" />
      <SkBlock className="h-20 w-full rounded-2xl" />
      <SkBlock className="h-52 w-full rounded-2xl border border-[color:var(--eid-border-subtle)]" />
    </div>
  );
}

/** Página EID por esporte — card topo + métricas + seções. */
export function PerfilEidEsporteSkeleton() {
  return (
    <main className={MAIN_PROFILE}>
      <SkBlock className="h-4 w-24 rounded" />
      <div className="mt-3 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
        <div className="px-3 py-3 sm:px-4 sm:py-4">
          <SkBlock className="h-3 w-32 rounded-full" />
          <SkBlock className="mt-2 h-5 w-48 max-w-full rounded-md" />
          <SkBlock className="mt-2 h-3 w-full max-w-sm rounded" />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-2 py-2">
                <SkBlock className="mx-auto h-2 w-12 rounded" />
                <SkBlock className="mx-auto mt-1 h-6 w-10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <SkBlock className="mt-3 h-32 w-full rounded-2xl border border-[color:var(--eid-border-subtle)]" />
      <SkBlock className="mt-3 h-14 w-full rounded-2xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <section key={i} className="mt-4">
          <SectionTitleSkeleton />
          <div className="mt-2 space-y-2">
            <SkBlock className="h-24 rounded-xl" />
            <SkBlock className="h-20 rounded-xl" />
          </div>
        </section>
      ))}
    </main>
  );
}

/** Enquanto o iframe do painel de edição (drawer ou fullscreen) carrega a rota `embed=1`. */
export function ProfileEditIframeLoadingSkeleton() {
  return (
    <div className="flex min-h-[55vh] flex-col gap-3 px-3 pt-2 sm:px-5" aria-hidden>
      <div className="flex gap-2">
        <SkBlock className="h-9 w-24 rounded-xl" />
      </div>
      <SkBlock className="h-36 w-full rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50" />
      <SkBlock className="h-28 w-full rounded-2xl" />
      <SkBlock className="h-40 w-full rounded-2xl" />
    </div>
  );
}

const MAIN_HIST_PERFIL = "mx-auto w-full max-w-lg px-2.5 pb-6 pt-2 sm:max-w-2xl sm:px-5 sm:pb-8 sm:pt-3";

function HistoricoLinhaSkeleton() {
  return (
    <li className="eid-list-item flex items-center gap-2 rounded-xl bg-eid-surface/45 px-2 py-2">
      <SkBlock className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1">
        <SkBlock className="h-3 w-36 rounded" />
        <SkBlock className="h-2 w-full max-w-[200px] rounded" />
      </div>
      <SkBlock className="h-7 w-7 shrink-0 rounded-full" />
    </li>
  );
}

/** Histórico completo (perfil global) ou lista EID por esporte. */
export function PerfilHistoricoListaSkeleton({
  variant = "perfil",
}: {
  /** `perfil`: um único `eid-surface-panel` como na página real. `eid`: voltar + card + lista. */
  variant?: "perfil" | "eid";
}) {
  if (variant === "perfil") {
    return (
      <main className={MAIN_HIST_PERFIL}>
        <div className="eid-surface-panel rounded-2xl p-3 sm:p-4">
          <SkBlock className="h-4 w-44 rounded-md" />
          <SkBlock className="mt-1 h-2.5 w-52 max-w-full rounded" />
          <SkBlock className="mt-2 h-8 w-full max-w-lg rounded-md" />
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkBlock key={i} className="h-14 rounded-lg" />
            ))}
          </div>
          <ul className="mt-3 grid gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <HistoricoLinhaSkeleton key={i} />
            ))}
          </ul>
        </div>
      </main>
    );
  }

  return (
    <main className={MAIN_PROFILE}>
      <SkBlock className="h-4 w-20 rounded" />
      <div className="mt-3 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.3)] sm:px-4 sm:py-4">
        <SkBlock className="h-3 w-28 rounded" />
        <SkBlock className="mt-2 h-5 w-56 max-w-full rounded-md" />
        <SkBlock className="mt-1 h-3 w-full max-w-md rounded" />
      </div>
      <ul className="mt-4 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <li
            key={i}
            className="eid-surface-panel flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] p-2.5"
          >
            <SkBlock className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1">
              <SkBlock className="h-3 w-40 rounded" />
              <SkBlock className="h-2 w-48 max-w-full rounded" />
            </div>
            <SkBlock className="h-6 w-6 shrink-0 rounded-full" />
          </li>
        ))}
      </ul>
    </main>
  );
}

/** Onboarding (shell global oculto): indicadores de passo + painel principal. */
export function OnboardingStreamSkeleton() {
  return (
    <main className="mx-auto w-full max-w-lg px-3 pb-8 pt-4 sm:max-w-2xl sm:px-6" aria-hidden>
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkBlock key={i} className="h-2 flex-1 rounded-full" />
        ))}
      </div>
      <SkBlock className="h-10 w-full max-w-md rounded-xl" />
      <SkBlock className="mt-4 h-72 w-full rounded-2xl" />
      <SkBlock className="mt-4 h-12 w-full rounded-xl" />
    </main>
  );
}

/** `/locais/cadastrar` — hero + grid formulário / lateral. */
export function LocaisCadastrarStreamSkeleton() {
  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-2 sm:px-6 sm:py-3" aria-hidden>
      <SkBlock className="mb-5 h-28 w-full rounded-2xl sm:h-32" />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SkBlock className="min-h-[260px] w-full rounded-xl" />
        <SkBlock className="min-h-[180px] w-full rounded-xl" />
      </div>
    </main>
  );
}
