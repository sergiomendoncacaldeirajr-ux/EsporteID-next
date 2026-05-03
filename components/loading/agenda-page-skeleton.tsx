import { SkBlock } from "@/components/loading/skeleton-primitives";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";

/** Esqueleto fiel ao layout de `/agenda` (hero, conexões, confrontos, desafios aceitos, pedidos, rodapé). */
export function AgendaPageSkeleton() {
  return (
    <main
      className="mx-auto w-full max-w-lg px-3 pt-0 pb-[calc(var(--eid-shell-footer-offset)+1rem)] sm:max-w-2xl sm:px-6 sm:pt-1 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]"
      aria-busy="true"
      aria-label="Carregando agenda"
    >
      <div className={`mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-4`}>
        <SkBlock className="h-2 w-24 rounded-md opacity-70" />
        <SkBlock className="mt-2 h-5 w-4/5 max-w-sm rounded-md" />
        <SkBlock className="mt-2 h-3 w-full max-w-md rounded-md opacity-80" />
      </div>

      {/* ConexoesStrip (card) */}
      <section className="mt-4 md:mt-8">
        <div className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
          <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <SkBlock className="h-2.5 w-[7.5rem] rounded-md" />
            <SkBlock className="h-5 w-16 rounded-full" />
          </div>
          <SkBlock className="mx-3 mt-2 h-3 w-full max-w-md rounded-md md:hidden" />
          <div className="mt-2 flex gap-3 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none] md:mt-3 md:gap-4 md:pb-3 [&::-webkit-scrollbar]:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex min-w-[68px] flex-col items-center text-center md:min-w-[76px]">
                <div className="rounded-full p-[2px] md:p-[3px]">
                  <SkBlock className="h-12 w-12 rounded-full border-2 border-eid-bg md:h-14 md:w-14" />
                </div>
                <SkBlock className="mt-1.5 h-2 w-12 rounded-md md:mt-2" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Confrontos (card + cards) */}
      <section className="mt-6 md:mt-10">
        <div className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
          <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <SkBlock className="h-2.5 w-28 rounded-md" />
            <SkBlock className="h-5 w-14 rounded-full" />
          </div>
          <SkBlock className="mx-3 mt-2 h-3 w-full max-w-xl rounded-md" />
          <div className="mt-3 space-y-4 px-2.5 pb-2.5">
            {Array.from({ length: 2 }).map((_, i) => (
              <article
                key={i}
                className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-2.5 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.24)] md:p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SkBlock className="h-2.5 w-28 rounded-md" />
                  <SkBlock className="ml-auto h-5 w-20 rounded-full" />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2 md:mt-4">
                  <SkBlock className="h-4 w-20 rounded-md md:h-5 md:w-24" />
                  <SkBlock className="h-7 w-7 shrink-0 rounded-full opacity-80" />
                  <SkBlock className="h-4 w-20 rounded-md md:h-5 md:w-24" />
                </div>
                <SkBlock className="mx-auto mt-2.5 h-3 w-2/3 max-w-xs rounded-md" />
                <SkBlock className="mt-2.5 h-10 w-full rounded-2xl md:mt-4 md:min-h-[48px]" />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Desafios aceitos */}
      <section className="mt-6 md:mt-10">
        <div className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
          <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <SkBlock className="h-2.5 w-28 rounded-md" />
            <SkBlock className="h-5 w-16 rounded-full" />
          </div>
          <SkBlock className="mx-3 mt-2 h-3 w-full max-w-lg rounded-md" />
          <div className="m-2.5 space-y-1.5 md:m-3 md:space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-2.5 py-2.5 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.18)] md:px-3 md:py-3"
              >
                <div className="flex items-center gap-2">
                  <SkBlock className="h-9 w-9 shrink-0 rounded-full md:h-10 md:w-10" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <SkBlock className="h-4 w-36 rounded-md" />
                    <SkBlock className="h-3 w-28 rounded-md" />
                  </div>
                  <SkBlock className="h-5 w-20 shrink-0 rounded-full" />
                </div>
                <SkBlock className="mt-2 h-8 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pedidos */}
      <section className="mt-6 md:mt-10">
        <div className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
          <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <SkBlock className="h-2.5 w-40 rounded-md" />
            <SkBlock className="h-5 w-20 rounded-full" />
          </div>
          <ul className="m-3 space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-3 py-2.5 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.18)] md:gap-3 md:px-4 md:py-3"
              >
                <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
                  <SkBlock className="h-10 w-10 shrink-0 rounded-xl md:h-11 md:w-11" />
                  <div className="min-w-0 space-y-1.5">
                    <SkBlock className="h-4 w-32 rounded-md" />
                    <SkBlock className="h-3 w-40 rounded-md" />
                  </div>
                </div>
                <SkBlock className="h-6 w-24 shrink-0 rounded-full" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mt-6 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 px-3 py-3 md:mt-10">
        <SkBlock className="mx-auto h-3 w-full max-w-sm rounded-md" />
        <SkBlock className="mx-auto mt-2 h-3 w-full max-w-md rounded-md" />
      </div>
    </main>
  );
}
