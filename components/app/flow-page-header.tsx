"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type HeaderStat = {
  label: string;
  value: number | string;
  tone?: "default" | "primary" | "action";
};

export function FlowPageHeader({
  title,
  subtitle,
  stats,
  actions,
  actionsTopRight = false,
}: {
  title: string;
  subtitle: string;
  stats: HeaderStat[];
  actions?: ReactNode;
  actionsTopRight?: boolean;
}) {
  return (
    <div className="eid-surface-panel relative rounded-xl p-2.5 md:overflow-hidden md:rounded-3xl md:border-eid-primary-500/20 md:bg-gradient-to-br md:from-eid-card md:via-eid-card md:to-eid-primary-500/[0.12] md:p-6 md:shadow-xl md:shadow-black/20">
      <div className="pointer-events-none absolute -left-10 -bottom-10 hidden h-36 w-36 rounded-full bg-eid-action-500/15 blur-3xl md:block" />
      {actionsTopRight && actions ? (
        <div className="absolute right-2 top-2 z-[1] md:right-4 md:top-4">{actions}</div>
      ) : null}
      <h1 className={`text-lg font-bold tracking-tight text-eid-fg md:text-2xl md:font-black ${actionsTopRight ? "pr-24 md:pr-36" : ""}`}>{title}</h1>
      <p className="mt-0.5 text-xs leading-relaxed text-eid-text-secondary md:mt-2 md:text-sm">{subtitle}</p>
      <div className="mt-2 -mx-1 flex w-full min-w-0 gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain px-1 pb-0.5 whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] touch-pan-x md:mt-5 md:flex-wrap md:overflow-visible md:overscroll-x-auto md:pb-0 md:gap-2 md:touch-auto [&::-webkit-scrollbar]:hidden">
        {stats.map((item) => (
          <span
            key={item.label}
            className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium md:rounded-full md:px-3 md:py-1 md:text-[11px] md:font-bold ${
              item.tone === "action"
                ? "border border-eid-action-500/35 bg-eid-action-500/10 text-eid-action-300"
                : item.tone === "primary"
                  ? "border border-eid-primary-500/35 bg-eid-primary-500/10 text-eid-primary-200"
                  : "border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 text-eid-text-secondary"
            }`}
          >
            {item.value} {item.label}
          </span>
        ))}
      </div>
      {!actionsTopRight && actions ? <div className="mt-2 flex flex-wrap gap-1.5 md:mt-4 md:gap-2">{actions}</div> : null}
    </div>
  );
}

export function FlowHeaderLink({
  href,
  label,
  tone = "default",
}: {
  href: string;
  label: string;
  tone?: "default" | "primary";
}) {
  return (
    <Link
      href={href}
      className={
        tone === "primary"
          ? "rounded-lg border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1.5 text-[11px] font-bold text-eid-primary-300"
          : "rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-[11px] font-bold text-eid-fg"
      }
    >
      {label}
    </Link>
  );
}
