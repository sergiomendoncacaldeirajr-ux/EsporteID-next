/**
 * Classes compartilhadas do fluxo Desafio (pedir → confirmar → aceitar → agenda → resultado).
 * Alinhado a `ProfileSolicitarMatchMenu` / `DesafioEnviarForm`.
 */

export const DESAFIO_FLOW_CTA_CLASS =
  "eid-btn-dashboard-cta eid-profile-match-cta relative inline-flex min-h-[30px] items-center justify-center gap-1.5 !px-3 !text-[9px] font-bold uppercase tracking-[0.03em] disabled:pointer-events-none disabled:opacity-50";

/** CTA em largura total (formulários, cards). */
export const DESAFIO_FLOW_CTA_BLOCK_CLASS = `${DESAFIO_FLOW_CTA_CLASS} w-full`;

export const DESAFIO_FLOW_SECONDARY_CLASS =
  "eid-btn-ghost inline-flex min-h-[30px] items-center justify-center px-3 text-[9px] font-bold uppercase tracking-[0.03em]";

export const DESAFIO_CHOICE_RANKING =
  "rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/12 p-4 transition hover:bg-eid-primary-500/20";

export const DESAFIO_CHOICE_AMISTOSO =
  "rounded-xl border border-emerald-500/40 bg-emerald-500/12 p-4 transition hover:bg-emerald-500/20";

export const DESAFIO_CHOICE_ACTION =
  "inline-flex min-h-[30px] w-full items-center justify-center rounded-xl border border-eid-action-500/40 bg-eid-action-500/12 px-3 text-center text-[9px] font-bold uppercase tracking-[0.03em] text-eid-action-200 transition hover:bg-eid-action-500/20";

/** Container do fluxo /desafio no app logado: folga extra acima do footer + nav inferior. */
export const DESAFIO_PAGE_MAIN_CLASS =
  "eid-touch-ui-scope eid-desafio-ui mx-auto w-full max-w-3xl px-3 py-3 pb-[calc(var(--eid-shell-footer-offset)+2.5rem)] sm:px-6 sm:py-4 sm:pb-12";
