export const scrollRow =
  “-mx-3 flex gap-2.5 overflow-x-auto px-3 pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-4 sm:gap-3 sm:px-4 [&::-webkit-scrollbar]:hidden”;

export const sectionActionClass =
  “inline-flex shrink-0 items-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_28%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_10%,transparent)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-primary-500)_28%)] transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_42%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_16%,transparent)] shadow-[0_0_10px_-4px_rgba(37,99,235,0.2)]”;

export const sectionTitleClass =
  “text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-400”;

export const dashboardSectionOuter =
  “eid-dashboard-section overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,var(--eid-primary-700)_4%),color-mix(in_srgb,var(--eid-surface)_98%,transparent))] shadow-[0_8px_28px_-16px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]”;

export const dashboardSectionHead =
  “eid-dashboard-section-head flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.045)] bg-transparent px-3 py-2.5 sm:px-4”;

export const dashboardSectionBody = “px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-3”;

/** Mini-cards da grade “Confrontos próximos” (3 colunas). */
export const dashboardSpotlightLink =
  “group flex flex-col items-center overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[linear-gradient(155deg,color-mix(in_srgb,var(--eid-surface)_95%,var(--eid-primary-700)_5%),color-mix(in_srgb,var(--eid-bg)_90%,transparent))] px-2 pb-2.5 pt-2 text-center shadow-[0_4px_16px_-10px_rgba(15,23,42,0.4),inset_0_1px_0_rgba(255,255,255,0.03)] transition duration-200 hover:-translate-y-[2px] hover:border-[rgba(37,99,235,0.2)] hover:bg-[linear-gradient(155deg,color-mix(in_srgb,var(--eid-primary-500)_10%,var(--eid-surface)),var(--eid-surface))] hover:shadow-[0_8px_24px_-12px_rgba(37,99,235,0.3)] active:translate-y-0”;

export const dashboardSpotlightEmpty =
  “flex min-h-[8.5rem] flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(37,99,235,0.12)] bg-[color-mix(in_srgb,var(--eid-surface)_35%,transparent)] px-2 py-3 text-center”;

/** Card horizontal — torneios (maior). */
export const dashboardRailTorneio =
  “group min-w-[220px] max-w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[linear-gradient(155deg,color-mix(in_srgb,var(--eid-surface)_95%,var(--eid-primary-700)_5%),var(--eid-bg))] shadow-[0_4px_16px_-10px_rgba(15,23,42,0.4)] transition duration-200 hover:-translate-y-[2px] hover:border-[rgba(37,99,235,0.18)] hover:shadow-[0_8px_24px_-12px_rgba(37,99,235,0.28)] active:translate-y-0”;

/** Card horizontal — locais. */
export const dashboardRailLocal =
  “group min-w-[148px] max-w-[148px] shrink-0 snap-start rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[linear-gradient(155deg,color-mix(in_srgb,var(--eid-surface)_95%,var(--eid-primary-700)_5%),var(--eid-bg))] p-3 text-left shadow-[0_4px_16px_-10px_rgba(15,23,42,0.4)] transition duration-200 hover:-translate-y-[2px] hover:border-[rgba(37,99,235,0.18)] hover:shadow-[0_8px_24px_-12px_rgba(37,99,235,0.28)] active:translate-y-0”;

export const dashboardEmptyWide =
  “rounded-2xl border border-dashed border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,var(--eid-border-subtle)_78%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-surface)_40%,transparent),transparent)] px-4 py-9 text-center”;

/** Barra de atalhos tipo dock / menu (sem cabeçalho de seção). */
export const dashboardAppNavClass =
  “eid-dashboard-app-nav rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_94%,var(--eid-primary-700)_6%),color-mix(in_srgb,var(--eid-surface)_98%,transparent))] p-1 shadow-[0_6px_22px_-14px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-[1.35rem] sm:p-1.5”;
