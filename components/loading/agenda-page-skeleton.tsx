import { SkBlock } from "@/components/loading/skeleton-primitives";

/** Esqueleto fiel ao layout de `/agenda` (conexões, jogos agendados, desafios aceitos, pedidos enviados, rodapé). */
export function AgendaPageSkeleton() {
  return (
    <main
      className="mx-auto w-full max-w-lg px-3 py-3 pb-[calc(var(--eid-shell-footer-offset)+1rem)] sm:max-w-2xl sm:px-6 sm:py-4 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]"
      aria-busy="true"
      aria-label="Carregando agenda"
    >
      {/* ConexoesStrip */}
      <section className="mt-5 md:mt-8">
        <SkBlock className="h-2.5 w-[7.5rem] rounded-md" />
        <SkBlock className="mt-0.5 hidden h-3 w-full max-w-md rounded-md md:mt-1 md:block" />
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex min-w-[76px] flex-col items-center text-center">
              <div className="rounded-full p-[3px] bg-gradient-to-br from-eid-surface to-eid-surface">
                <SkBlock className="h-14 w-14 rounded-full border-[3px] border-eid-bg" />
              </div>
              <SkBlock className="mt-2 h-2.5 w-14 rounded-md" />
            </div>
          ))}
        </div>
      </section>

      {/* Jogos agendados */}
      <section className="mt-6 md:mt-10">
        <SkBlock className="h-2.5 w-32 rounded-md" />
        <div className="mt-1 hidden space-y-1 md:block">
          <SkBlock className="h-3 w-full max-w-xl rounded-md" />
          <SkBlock className="h-3 w-4/5 max-w-lg rounded-md" />
        </div>
        <div className="mt-4 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <article
              key={i}
              className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-3 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.24)] backdrop-blur-sm md:p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <SkBlock className="h-2.5 w-28 rounded-md" />
                <SkBlock className="ml-auto h-2.5 w-16 rounded-md" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 md:mt-4">
                <SkBlock className="h-4 w-20 rounded-md md:h-5 md:w-24" />
                <SkBlock className="h-2.5 w-8 shrink-0 rounded-md opacity-50" />
                <SkBlock className="h-4 w-20 rounded-md md:h-5 md:w-24" />
              </div>
              <SkBlock className="mx-auto mt-3 h-3 w-2/3 max-w-xs rounded-md" />
              <SkBlock className="mt-3 h-11 w-full rounded-2xl md:mt-4 md:min-h-[48px]" />
            </article>
          ))}
        </div>
      </section>

      {/* AgendaAceitosCancelaveis (só aparece com itens; skeleton assume presença para altura típica) */}
      <section className="mt-6 md:mt-10">
        <SkBlock className="h-2.5 w-28 rounded-md" />
        <SkBlock className="mt-1 h-3 w-full max-w-lg rounded-md" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2"
            >
              <div className="min-w-0 space-y-1.5">
                <SkBlock className="h-4 w-36 rounded-md" />
                <SkBlock className="h-3 w-28 rounded-md" />
              </div>
              <SkBlock className="h-9 w-[8.5rem] shrink-0 rounded-xl" />
            </div>
          ))}
        </div>
      </section>

      {/* Pedidos que você enviou */}
      <section className="mt-6 md:mt-10">
        <SkBlock className="h-2.5 w-40 rounded-md" />
        <ul className="mt-3 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <li
              key={i}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <SkBlock className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="min-w-0 space-y-1.5">
                  <SkBlock className="h-4 w-32 rounded-md" />
                  <SkBlock className="h-3 w-40 rounded-md" />
                </div>
              </div>
              <SkBlock className="h-6 w-24 shrink-0 rounded-full" />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 space-y-2 text-center md:mt-10">
        <SkBlock className="mx-auto h-3 w-full max-w-sm rounded-md" />
        <SkBlock className="mx-auto h-3 w-full max-w-md rounded-md" />
      </div>
    </main>
  );
}
