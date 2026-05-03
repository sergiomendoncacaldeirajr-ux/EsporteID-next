import type { ReactNode } from "react";

/** Bloco de placeholder — pulsação leve de opacidade (`eid-loading-skeleton-block` em `globals.css`). */
export function SkBlock({ className }: { className?: string }) {
  return <div className={`eid-loading-skeleton-block ${className ?? ""}`} aria-hidden />;
}

type SkMainVariant = "wide5" | "wide6" | "narrow" | "match" | "landing";

const skMainClass: Record<SkMainVariant, string> = {
  wide5: "mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-4 sm:px-6",
  wide6: "mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 sm:px-6",
  narrow:
    "mx-auto flex w-full max-w-lg flex-1 flex-col px-3 py-3 sm:max-w-2xl sm:px-6 sm:py-4",
  match: "mx-auto w-full max-w-5xl px-3 py-3 sm:px-6 sm:py-4",
  landing:
    "relative z-[1] mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-12",
};

export function SkMain({ variant, children, className }: { variant: SkMainVariant; children: ReactNode; className?: string }) {
  return <main className={`${skMainClass[variant]}${className ? ` ${className}` : ""}`}>{children}</main>;
}
