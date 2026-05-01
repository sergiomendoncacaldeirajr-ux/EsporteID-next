"use client";

import { useState, type ReactNode } from "react";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

type Props = {
  summaryRight: ReactNode;
  children: ReactNode;
};

/** Bloco Filtros do ranking: inicia recolhido; seta expande/recolhe o painel. */
export function RankingFilterBarPanel({ summaryRight, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      data-eid-ranking-filter="true"
      className="overflow-hidden rounded-2xl border border-transparent bg-eid-surface/40 shadow-none [&_a]:[-webkit-tap-highlight-color:transparent]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-transparent px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="eid-ranking-filter-toggle flex min-w-0 flex-1 items-center gap-2 rounded-lg py-0.5 text-left outline-none ring-offset-2 ring-offset-eid-bg focus-visible:ring-2 focus-visible:ring-eid-primary-500"
          aria-expanded={open}
          aria-controls="eid-ranking-filter-panel"
          id="eid-ranking-filter-trigger"
        >
          <span
            className={cn(
              "inline-flex h-4 w-4 shrink-0 items-center justify-center text-eid-text-secondary transition-transform duration-200 ease-out motion-safe:transform-gpu",
              open && "rotate-180"
            )}
            aria-hidden
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
          <h3 className="text-[9px] font-black uppercase tracking-[0.1em] text-eid-fg">Filtros</h3>
        </button>
        {summaryRight}
      </div>

      {open ? (
        <div id="eid-ranking-filter-panel" role="region" aria-labelledby="eid-ranking-filter-trigger" className="space-y-1.5 p-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}
