"use client";

import { useId, useState, type ReactNode } from "react";

function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

type EidCollapsiblePanelProps = {
  title: string;
  defaultOpen?: boolean;
  summaryRight?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Painel colapsável compacto para blocos secundários. */
export function EidCollapsiblePanel({
  title,
  defaultOpen = false,
  summaryRight,
  children,
  className,
  contentClassName,
}: EidCollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const rid = useId().replace(/:/g, "");
  const panelId = `eid-collapsible-panel-${rid}`;
  const triggerId = `eid-collapsible-trigger-${rid}`;

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-transparent bg-eid-surface/40 shadow-none", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-transparent px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-0.5 text-left outline-none ring-offset-2 ring-offset-eid-bg focus-visible:ring-2 focus-visible:ring-eid-primary-500"
          aria-expanded={open}
          aria-controls={panelId}
          id={triggerId}
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
          <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-eid-fg">{title}</h3>
        </button>
        {summaryRight}
      </div>

      {open ? (
        <div id={panelId} role="region" aria-labelledby={triggerId} className={cn("space-y-2 p-2", contentClassName)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
