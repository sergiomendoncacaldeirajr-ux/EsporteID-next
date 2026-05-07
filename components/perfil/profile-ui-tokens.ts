/** Container dos perfis públicos (atleta, professor, time, dupla, local) + footer do app. */
export const PROFILE_PUBLIC_MAIN_CLASS =
  "mx-auto w-full max-w-lg px-2.5 pb-[var(--eid-shell-content-bottom-pad)] pt-0 sm:max-w-2xl sm:px-5 sm:pb-[var(--eid-shell-content-bottom-pad)] sm:pt-2.5";

/**
 * Histórico completo (perfil / dupla / time): tela cheia, sem cartão estreito no mobile —
 * alinhado ao fluxo fullscreen do app (ex.: /desafio).
 */
export const PROFILE_HISTORICO_FULLSCREEN_MAIN_CLASS =
  "eid-touch-ui-scope mx-auto flex min-h-[100dvh] w-full max-w-none flex-col bg-eid-bg px-3 pb-[var(--eid-shell-content-bottom-pad)] pt-2 sm:max-w-3xl sm:px-6 sm:pb-[var(--eid-shell-content-bottom-pad)] sm:pt-3";

/** Landing de espaço: mesma base + largura maior no desktop. */
export const PROFILE_PUBLIC_MAIN_WIDE_CLASS =
  "mx-auto w-full max-w-lg px-2.5 pb-[var(--eid-shell-content-bottom-pad)] pt-0 sm:max-w-2xl sm:px-5 sm:pb-[var(--eid-shell-content-bottom-pad)] sm:pt-2.5 lg:max-w-6xl";

/** Card-hero premium (capa + conteúdo) — gradiente profundo + glow azul/laranja. */
export const PROFILE_HERO_PANEL_CLASS =
  "eid-surface-panel relative overflow-hidden rounded-2xl bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_98%,var(--eid-primary-500)_2%),color-mix(in_srgb,var(--eid-surface)_96%,var(--eid-primary-900)_4%))] shadow-[0_20px_40px_-20px_rgba(15,23,42,0.55),0_0_0_1px_rgba(37,99,235,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]";

/** Avatar circular no padrão perfil (anel laranja + sombra). */
export const PROFILE_PUBLIC_AVATAR_RING_CLASS =
  "rounded-full border-[3px] border-eid-card object-cover shadow-[0_0_0_2px_rgba(249,115,22,0.6),0_8px_24px_rgba(0,0,0,0.55),0_0_20px_-8px_rgba(249,115,22,0.3)]";

/** Escudo de time/dupla (squircle) — alinhado ao spotlight da dashboard. */
export const PROFILE_PUBLIC_FORMACAO_ESCUDO_CLASS =
  "rounded-[14px] border-2 border-eid-primary-500/50 object-cover shadow-[0_8px_24px_-12px_rgba(37,99,235,0.45),0_0_0_1px_rgba(37,99,235,0.12)]";

export const PROFILE_CARD_BASE =
  "eid-surface-panel rounded-xl border border-[color:rgba(255,255,255,0.06)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_98%,var(--eid-primary-500)_2%),color-mix(in_srgb,var(--eid-surface)_96%,transparent))] shadow-[0_8px_28px_-16px_rgba(15,23,42,0.5),0_0_0_1px_rgba(37,99,235,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]";
export const PROFILE_CARD_PAD_MD = "p-2.5";
export const PROFILE_CARD_PAD_LG = "p-3 sm:rounded-2xl sm:p-4";
export const PROFILE_SECTION_TITLE =
  "text-[10px] font-black uppercase tracking-[0.14em] text-eid-fg flex items-center gap-2 after:block after:h-px after:flex-1 after:rounded-full after:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--eid-primary-500)_40%,transparent),transparent)]";
export const PROFILE_META_TITLE =
  "text-[10px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary";
export const PROFILE_CARD_TITLE = "text-[12px] font-semibold text-eid-fg leading-snug";
export const PROFILE_CARD_SUBTITLE = "text-[10px] text-eid-text-secondary mt-0.5";
export const PROFILE_TROPHY_CHIP =
  "rounded-full border border-eid-action-500/35 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-action-500)_14%,transparent),color-mix(in_srgb,var(--eid-action-500)_8%,transparent))] px-2.5 py-0.5 text-[10px] font-bold text-eid-action-400 tracking-wide shadow-[0_0_12px_-4px_rgba(249,115,22,0.2)]";

/** Papel no hero (Atleta, Professor…) — chip com micro brilho. */
export const PROFILE_HERO_ROLE_BADGE_CLASS =
  "inline-flex items-center rounded-full border border-[color:rgba(37,99,235,0.2)] bg-[color:color-mix(in_srgb,var(--eid-card)_88%,var(--eid-primary-500)_12%)] px-2.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-eid-primary-300 shadow-[0_0_8px_-2px_rgba(37,99,235,0.15)]";
export const PROFILE_AVATAR_SM = "h-8 w-8 rounded-md object-cover";
export const PROFILE_AVATAR_MD = "h-10 w-10 rounded-lg object-cover";
export const PROFILE_AVATAR_LG = "h-16 w-16 rounded-xl object-cover";
