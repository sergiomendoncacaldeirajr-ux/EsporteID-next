import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";

/** Shell de página (gradiente + radial) — igual à lista `/locais`. */
export const locaisShellOuterClass = "relative z-0 flex min-h-0 w-full flex-1 flex-col";

export const locaisShellBgGradientClass =
  "pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-eid-bg via-eid-surface/35 to-eid-bg";

export const locaisShellBgRadialClass =
  "pointer-events-none absolute inset-x-0 top-0 z-0 h-[min(48vh,26rem)] bg-[radial-gradient(ellipse_95%_60%_at_50%_-8%,rgba(37,99,235,0.11),transparent_55%)]";

/** Conteúdo principal alinhado ao guia de locais (max-w-5xl). */
export const locaisMainWideClass =
  "relative z-[1] mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3 pb-[var(--eid-shell-content-bottom-pad)] sm:px-6 sm:py-4 sm:pb-[var(--eid-shell-content-bottom-pad)]";

/** Ficha pública de local genérico — um pouco mais estreita, mesmo padding inferior. */
export const locaisMainFichaClass =
  "relative z-[1] mx-auto w-full max-w-2xl flex-1 px-3 py-3 pb-[var(--eid-shell-content-bottom-pad)] sm:max-w-3xl sm:px-6 sm:py-4 sm:pb-[var(--eid-shell-content-bottom-pad)]";

/** Hero do módulo locais (painel premium). */
export const locaisHeroClass = `eid-locais-hero relative mb-4 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-5 md:mb-6 md:px-6 md:py-6`;

export const locaisSearchCardClass =
  "eid-locais-search-card mb-4 overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.055)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-primary-500)_3%),color-mix(in_srgb,var(--eid-surface)_96%,transparent))] shadow-[0_10px_28px_-16px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]";

export const locaisSectionOuterClass =
  "eid-locais-section mb-6 overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,var(--eid-primary-700)_4%),color-mix(in_srgb,var(--eid-surface)_98%,transparent))] shadow-[0_8px_28px_-16px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.04)] sm:mb-8";

export const locaisSectionHeadClass =
  "eid-locais-section-head flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[rgba(255,255,255,0.045)] bg-transparent px-3 py-2.5 sm:px-4";

export const locaisSectionTitleClass =
  "text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-400";

export const locaisSectionBodyClass = "px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-3";

export const locaisBadgeGhostClass =
  "inline-flex shrink-0 items-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_8%,transparent)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-primary-500)_28%)]";

export const locaisHintBlurbClass =
  "mb-6 rounded-xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_90%,var(--eid-primary-500)_10%)] bg-[color:color-mix(in_srgb,var(--eid-surface)_50%,transparent)] px-3 py-2.5 text-[11px] leading-relaxed text-eid-text-secondary sm:mb-8 sm:text-xs";

export const locaisEmptyClass =
  "rounded-2xl border border-dashed border-[color:color-mix(in_srgb,var(--eid-border-subtle)_62%,var(--eid-primary-500)_38%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-surface)_45%,transparent),transparent)] px-4 py-9 text-center text-sm text-eid-text-secondary ring-1 ring-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,transparent)]";

export const locaisPaginationWrapClass =
  "eid-locais-pagination mt-8 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-3 py-2.5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)] sm:px-4";

export const locaisPaginationLinkActiveClass =
  "inline-flex min-h-9 items-center justify-center rounded-xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_8%,transparent)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-eid-fg transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_35%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,transparent)]";

export const locaisPaginationLinkDisabledClass =
  "pointer-events-none inline-flex min-h-9 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-transparent px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary opacity-45";

/** Painel interno (formulário / aside) — cartão elevado do módulo. */
export const locaisFormPanelClass =
  "overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-4 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.28)] sm:p-5";

/** Título H1 de fluxo locais. */
export const locaisPageH1Class =
  "mt-1 text-xl font-black leading-tight tracking-tight text-eid-fg md:text-2xl lg:text-3xl";

/** Subtítulo / lead. */
export const locaisPageLeadClass = "mt-2 max-w-2xl text-xs leading-relaxed text-eid-text-secondary md:text-sm";
