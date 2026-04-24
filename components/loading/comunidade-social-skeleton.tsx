import { SkBlock } from "@/components/loading/skeleton-primitives";

/** Esqueleto fiel ao layout de `/comunidade` (painel social / “Painel de controle”). */
export function ComunidadeSocialSkeleton() {
  return (
    <main className="mx-auto w-full max-w-lg px-3 py-3 pb-[calc(var(--eid-shell-footer-offset)+1rem)] sm:max-w-2xl sm:px-6 sm:py-4 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]">
      <div
        className="eid-surface-panel relative rounded-xl p-2.5 md:overflow-hidden md:rounded-3xl md:border-eid-primary-500/20 md:bg-gradient-to-br md:from-eid-card md:via-eid-card md:to-eid-primary-500/[0.12] md:p-6 md:shadow-xl md:shadow-black/20"
        aria-busy="true"
        aria-label="Carregando painel de controle"
      >
        <div className="pointer-events-none absolute -left-10 -bottom-10 hidden h-36 w-36 rounded-full bg-eid-action-500/15 blur-3xl md:block" />
        <SkBlock className="h-6 w-52 rounded-lg md:h-8 md:w-64" />
        <div className="mt-0.5 space-y-1.5 md:mt-2">
          <SkBlock className="h-3 w-full max-w-2xl rounded-md md:h-3.5" />
          <SkBlock className="h-3 w-[92%] max-w-xl rounded-md md:h-3.5" />
        </div>
        <div className="mt-2 -mx-1 flex w-full min-w-0 gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain px-1 pb-0.5 whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] touch-pan-x md:mt-5 md:flex-wrap md:overflow-visible md:overscroll-x-auto md:pb-0 md:gap-2 md:touch-auto [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkBlock
              key={i}
              className="inline-flex h-[22px] w-[5.5rem] shrink-0 rounded-md md:h-7 md:w-28 md:rounded-full"
            />
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-6 md:mt-8 md:space-y-10">
        <section className="eid-surface-panel rounded-2xl p-4">
          <div className="flex w-full items-center justify-between gap-3 text-left">
            <div className="min-w-0">
              <SkBlock className="h-4 w-44 rounded-md" />
              <SkBlock className="mt-2 h-3 w-36 rounded-md" />
            </div>
            <SkBlock className="h-6 w-6 shrink-0 rounded-md" />
          </div>
        </section>

        <section className="eid-list-item rounded-2xl bg-eid-card/90 p-4 md:p-5">
          <SkBlock className="h-3 w-44 rounded-md" />
          <SkBlock className="mt-1 hidden h-3 w-full max-w-lg rounded-md md:block" />
          <div className="mt-4 space-y-6">
            <div>
              <SkBlock className="h-3 w-40 rounded-md" />
              <SkBlock className="mt-3 h-[5.5rem] rounded-2xl md:h-28" />
            </div>
            <div>
              <SkBlock className="h-3 w-36 rounded-md" />
              <SkBlock className="mt-2 h-3 w-full max-w-sm rounded-md md:hidden" />
              <SkBlock className="mt-3 h-[5.5rem] rounded-2xl md:h-28" />
            </div>
          </div>
        </section>

        <section className="eid-list-item rounded-2xl bg-eid-card/90 p-4 md:p-5">
          <SkBlock className="h-3 w-16 rounded-md" />
          <SkBlock className="mt-1 hidden h-3.5 w-full max-w-xl rounded-md md:block" />
          <div className="mt-3 space-y-4">
            <div>
              <SkBlock className="h-3 w-32 rounded-md" />
              <div className="mt-3 space-y-3 md:space-y-4">
                <div className="relative overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 text-sm md:rounded-2xl md:border-eid-primary-500/25 md:bg-gradient-to-br md:from-eid-card md:to-eid-primary-500/[0.06] md:p-4 md:shadow-md md:shadow-black/15">
                  <div className="pointer-events-none absolute -right-6 -top-6 hidden h-20 w-20 rounded-full bg-eid-primary-500/10 blur-2xl md:block" />
                  <div className="relative flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-2">
                      <SkBlock className="h-4 w-40 rounded-md md:h-5 md:w-48" />
                      <SkBlock className="h-3 w-full max-w-xs rounded-md" />
                      <SkBlock className="h-8 w-28 rounded-xl" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <SkBlock className="h-6 w-20 rounded-full" />
                      <SkBlock className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                  <div className="relative mt-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-3 md:mt-4">
                    <SkBlock className="h-2.5 w-28 rounded-md" />
                    <SkBlock className="mt-2 h-3 w-full rounded-md" />
                    <SkBlock className="mt-1.5 h-3 w-4/5 rounded-md" />
                    <SkBlock className="mt-2 h-16 w-full rounded-lg" />
                  </div>
                  <div className="relative mt-4 flex flex-wrap gap-2">
                    <SkBlock className="h-11 min-w-0 flex-1 rounded-xl sm:min-w-[11rem]" />
                    <SkBlock className="h-11 min-w-0 flex-1 rounded-xl sm:min-w-[9rem]" />
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-3">
              <SkBlock className="h-3 w-40 rounded-md" />
              <ul className="mt-2 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2"
                  >
                    <SkBlock className="h-3 w-full rounded-md" />
                    <SkBlock className="mt-1.5 h-3 w-11/12 rounded-md" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="eid-list-item rounded-2xl bg-eid-card/90 p-4 md:p-5">
          <SkBlock className="h-3 w-14 rounded-md" />
          <SkBlock className="mt-1 hidden h-3.5 w-full max-w-lg rounded-md md:block" />
          <div className="mt-3 space-y-4">
            <div>
              <SkBlock className="h-3 w-48 rounded-md" />
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-sm md:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-2">
                      <SkBlock className="h-3 w-36 rounded-md" />
                      <SkBlock className="h-4 w-full max-w-xs rounded-md" />
                      <SkBlock className="h-3 w-4/5 max-w-sm rounded-md" />
                      <SkBlock className="h-8 w-36 rounded-xl" />
                    </div>
                    <SkBlock className="h-6 w-28 rounded-full" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <SkBlock className="h-11 min-w-0 flex-1 rounded-xl sm:min-w-[12rem]" />
                    <SkBlock className="h-11 min-w-0 flex-1 rounded-xl sm:min-w-[9rem]" />
                  </div>
                  <div className="mt-2 space-y-1">
                    <SkBlock className="h-2.5 w-full rounded-md" />
                    <SkBlock className="h-2.5 w-10/12 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <SkBlock className="h-3 w-36 rounded-md" />
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3">
                  <SkBlock className="h-4 w-44 rounded-md" />
                  <SkBlock className="mt-2 h-3 w-full max-w-sm rounded-md" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SkBlock className="h-11 min-w-0 flex-1 rounded-xl sm:w-40" />
                    <SkBlock className="h-11 min-w-0 flex-1 rounded-xl sm:min-w-[9rem]" />
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-3">
              <SkBlock className="h-3 w-28 rounded-md" />
              <ul className="mt-2 space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2"
                  >
                    <SkBlock className="h-3 w-full rounded-md" />
                    <SkBlock className="mt-1.5 h-3 w-10/12 rounded-md" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="eid-list-item rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-4 opacity-80 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <SkBlock className="h-3 w-28 rounded-md" />
            <SkBlock className="h-6 w-28 rounded-full" />
          </div>
          <SkBlock className="mt-2 h-3.5 w-full max-w-md rounded-md" />
          <div className="mt-3 space-y-2 pointer-events-none select-none">
            <div className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2">
              <SkBlock className="h-3 w-32 rounded-md" />
            </div>
            <div className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2">
              <SkBlock className="h-3 w-44 rounded-md" />
            </div>
            <div className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2">
              <SkBlock className="h-3 w-36 rounded-md" />
            </div>
          </div>
        </section>

        <section className="eid-list-item rounded-2xl bg-eid-card/90 p-5">
          <SkBlock className="h-3 w-20 rounded-md" />
          <ul className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2"
              >
                <SkBlock className="h-3.5 w-28 rounded-md sm:w-40" />
                <SkBlock className="h-5 w-20 shrink-0 rounded-full" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
