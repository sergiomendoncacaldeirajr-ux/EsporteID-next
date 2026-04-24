/** Container dos perfis públicos (atleta, professor, time, dupla, local) + footer do app. */
export const PROFILE_PUBLIC_MAIN_CLASS =
  "mx-auto w-full max-w-lg px-2.5 pb-[calc(var(--eid-shell-footer-offset)+2.5rem)] pt-3 sm:max-w-2xl sm:px-5 sm:pb-10 sm:pt-3";

/** Landing de espaço: mesma base + largura maior no desktop. */
export const PROFILE_PUBLIC_MAIN_WIDE_CLASS =
  "mx-auto w-full max-w-lg px-2.5 pb-[calc(var(--eid-shell-footer-offset)+2.5rem)] pt-3 sm:max-w-2xl sm:px-5 sm:pb-10 sm:pt-3 lg:max-w-6xl";

/** Card-hero premium (capa + conteúdo) — mesmo gradiente/sombra do perfil do atleta. */
export const PROFILE_HERO_PANEL_CLASS =
  "eid-surface-panel relative overflow-hidden rounded-2xl bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_16px_32px_-20px_rgba(15,23,42,0.45),0_0_20px_-16px_rgba(37,99,235,0.48)]";

/** Avatar circular no padrão perfil (anel laranja + sombra). */
export const PROFILE_PUBLIC_AVATAR_RING_CLASS =
  "rounded-full border-[3px] border-eid-card object-cover shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)]";

export const PROFILE_CARD_BASE =
  "eid-surface-panel rounded-xl border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_10px_24px_-18px_rgba(15,23,42,0.42),0_0_18px_-16px_rgba(37,99,235,0.45)]";
export const PROFILE_CARD_PAD_MD = "p-2.5";
export const PROFILE_CARD_PAD_LG = "p-3 sm:rounded-2xl sm:p-4";
export const PROFILE_SECTION_TITLE =
  "text-[9px] font-black uppercase tracking-[0.2em] text-eid-primary-400 flex items-center gap-2 after:block after:h-px after:flex-1 after:rounded-full after:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_24%,var(--eid-border-subtle)_76%)]";
export const PROFILE_META_TITLE =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-eid-text-secondary";
export const PROFILE_CARD_TITLE = "text-[12px] font-semibold text-eid-fg leading-snug";
export const PROFILE_CARD_SUBTITLE = "text-[10px] text-eid-text-secondary mt-0.5";
export const PROFILE_TROPHY_CHIP =
  "rounded-full border border-eid-action-500/30 bg-eid-action-500/10 px-2.5 py-0.5 text-[10px] font-bold text-eid-action-400 tracking-wide";
export const PROFILE_AVATAR_SM = "h-8 w-8 rounded-md object-cover";
export const PROFILE_AVATAR_MD = "h-10 w-10 rounded-lg object-cover";
export const PROFILE_AVATAR_LG = "h-16 w-16 rounded-xl object-cover";
