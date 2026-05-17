import { PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_WIDE_CLASS } from "@/components/perfil/profile-ui-tokens";

export const SPACE_SHELL_OUTER_CLASS = "relative z-0 flex min-h-0 w-full flex-1 flex-col";

export const SPACE_SHELL_BG_GRADIENT_CLASS =
  "pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-eid-bg via-eid-surface/35 to-eid-bg";

export const SPACE_SHELL_BG_RADIAL_CLASS =
  "pointer-events-none absolute inset-x-0 top-0 z-0 h-[min(48vh,26rem)] bg-[radial-gradient(ellipse_95%_60%_at_50%_-8%,rgba(37,99,235,0.11),transparent_55%)]";

export const SPACE_PUBLIC_MAIN_CLASS = `${PROFILE_PUBLIC_MAIN_WIDE_CLASS} relative z-[1] eid-progressive-enter space-y-4`;

export const SPACE_HERO_CLASS =
  "overflow-hidden rounded-[28px] border border-eid-primary-500/20 bg-eid-card/95 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.72)] eid-light:border-eid-primary-500/15 eid-light:bg-white eid-light:shadow-[0_22px_48px_-30px_rgba(15,23,42,0.16)]";

export const SPACE_HERO_PANEL_CLASS = `relative overflow-hidden ${PROFILE_HERO_PANEL_CLASS} border border-eid-primary-500/18 shadow-[0_24px_56px_-32px_rgba(15,23,42,0.62)]`;

export const SPACE_SECTION_CARD_CLASS =
  "overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/92 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.38)]";

export const SPACE_SECTION_HEAD_CLASS =
  "border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_82%,var(--eid-primary-500)_18%)] px-4 py-3";

export const SPACE_SECTION_TITLE_CLASS =
  "text-[11px] font-black uppercase tracking-[0.16em] text-eid-primary-300";

export const SPACE_SECTION_BODY_CLASS = "p-4 sm:p-5";

export const SPACE_STAT_CARD_CLASS =
  "rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-center backdrop-blur-sm eid-light:border-slate-200 eid-light:bg-slate-50/95";

export const SPACE_PILL_PRIMARY_CLASS =
  "rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-eid-primary-300";

export const SPACE_PILL_ACTION_CLASS =
  "rounded-full border border-eid-action-500/35 bg-eid-action-500/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-eid-action-300";

export const SPACE_PILL_SUCCESS_CLASS =
  "rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-200";

export const SPACE_PILL_GHOST_CLASS =
  "rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white/70";

export const SPACE_FEATURE_CARD_CLASS =
  "rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

export const SPACE_ACTION_CARD_CLASS =
  "group flex gap-4 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 transition hover:border-eid-primary-500/35 hover:bg-eid-primary-500/5";

export const SPACE_ACTION_ICON_WRAP_CLASS =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60";
