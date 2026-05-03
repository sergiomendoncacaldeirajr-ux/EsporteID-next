export const scrollRow =
  "-mx-3 flex gap-2.5 overflow-x-auto px-3 pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-4 sm:gap-3 sm:px-4 [&::-webkit-scrollbar]:hidden";

export const sectionActionClass =
  "inline-flex shrink-0 items-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_8%,transparent)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-primary-500)_28%)] transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_35%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,transparent)]";

export const sectionTitleClass =
  "text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-400";

export const dashboardSectionOuter =
  "eid-dashboard-section overflow-hidden rounded-2xl border border-transparent bg-eid-surface/40 shadow-none";

export const dashboardSectionHead =
  "eid-dashboard-section-head flex items-center justify-between gap-3 border-b border-transparent bg-transparent px-3 py-2.5 shadow-none sm:px-4";

export const dashboardSectionBody = "px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-3";

/** Mini-cards da grade “Confrontos próximos” (3 colunas). */
export const dashboardSpotlightLink =
  "group flex flex-col items-center overflow-hidden rounded-2xl border border-transparent bg-eid-surface/40 px-2 pb-2.5 pt-2 text-center shadow-none transition duration-200 hover:-translate-y-[2px] hover:border-eid-primary-500/30 hover:bg-eid-primary-500/10 active:translate-y-0";

export const dashboardSpotlightEmpty =
  "flex min-h-[8.5rem] flex-col items-center justify-center rounded-2xl border border-transparent bg-eid-surface/35 px-2 py-3 text-center shadow-none";

/** Card horizontal — torneios (maior). */
export const dashboardRailTorneio =
  "group min-w-[220px] max-w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl border border-transparent bg-eid-surface/40 shadow-none transition duration-200 hover:-translate-y-[2px] hover:border-eid-primary-500/30 hover:bg-eid-primary-500/10 active:translate-y-0";

/** Card horizontal — locais. */
export const dashboardRailLocal =
  "group min-w-[148px] max-w-[148px] shrink-0 snap-start rounded-2xl border border-transparent bg-eid-surface/40 p-3 text-left shadow-none transition duration-200 hover:-translate-y-[2px] hover:border-eid-primary-500/28 hover:bg-eid-primary-500/10 active:translate-y-0";

export const dashboardEmptyWide =
  "rounded-2xl border border-dashed border-[color:color-mix(in_srgb,var(--eid-border-subtle)_62%,var(--eid-primary-500)_38%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-surface)_45%,transparent),transparent)] px-4 py-9 text-center ring-1 ring-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,transparent)]";

/** Barra de atalhos tipo dock / menu (sem cabeçalho de seção). */
export const dashboardAppNavClass =
  "eid-dashboard-app-nav rounded-2xl border border-transparent bg-[color-mix(in_srgb,var(--eid-surface)_42%,var(--eid-bg)_58%)] p-1 shadow-none sm:rounded-[1.35rem] sm:p-1.5";
