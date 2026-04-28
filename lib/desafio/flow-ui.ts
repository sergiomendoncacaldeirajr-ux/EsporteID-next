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

/**
 * Aceitar / Recusar em pedidos (convite de equipe, pedido de desafio, candidatura ao elenco).
 * Formato mini-chip, sem largura total — evita botões que ocupam metade do card.
 * ~70% menor em área que o bloco full-width com texto 8px.
 */
export const PEDIDO_ACEITAR_BTN_CLASS =
  "inline-flex !h-[12px] !min-h-0 shrink-0 items-center justify-center rounded-full border border-emerald-600/90 bg-emerald-600 px-0 text-[4px] font-black uppercase leading-none tracking-[0.02em] text-white shadow-none transition hover:bg-emerald-700 disabled:opacity-60 md:!h-[18px] md:px-1 md:text-[7px]";

export const PEDIDO_RECUSAR_BTN_CLASS =
  "inline-flex !h-[12px] !min-h-0 shrink-0 items-center justify-center rounded-full border border-rose-600/90 bg-rose-600 px-0 text-[4px] font-black uppercase leading-none tracking-[0.02em] text-white transition hover:bg-rose-700 disabled:opacity-60 md:!h-[18px] md:px-1 md:text-[7px]";

/**
 * Cancelar compacto (candidatura, pedido enviado, atalho na agenda): mesma altura fixa que Aceitar/Recusar.
 */
export const PEDIDO_CANCELAR_COMPACT_BTN_CLASS =
  "inline-flex !h-[10px] !min-h-0 shrink-0 items-center justify-center rounded-full border border-red-700/90 bg-red-700 px-0 text-[2px] font-black uppercase leading-none tracking-[0.02em] text-white shadow-[0_4px_14px_-4px_rgba(220,38,38,0.45)] transition hover:bg-red-800 disabled:opacity-60";

/** Ver mais / Ver menos compacto com altura padronizada. */
export const PEDIDO_VER_MAIS_COMPACT_BTN_CLASS =
  "inline-flex !h-[18px] !min-h-0 shrink-0 items-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/8 px-1 text-[7px] font-black uppercase leading-none tracking-[0.03em] text-eid-primary-300 transition hover:border-eid-primary-500/50 disabled:opacity-60";

/** Limpar compacto com altura padronizada. */
export const PEDIDO_LIMPAR_COMPACT_BTN_CLASS =
  "inline-flex !h-[18px] !min-h-0 shrink-0 items-center rounded-full border border-[color:var(--eid-border-subtle)] px-1 text-[7px] font-black uppercase leading-none tracking-[0.03em] text-eid-text-secondary transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50";

/** Container alinhado à direita para pares Aceitar/Recusar em cards. */
export const PEDIDO_ACOES_ROW_CLASS = "mt-2 flex items-center justify-end gap-1";

/** Form inline ao lado do outro (sem flex-1 / w-full). */
export const PEDIDO_ACAO_FORM_INLINE_CLASS = "inline";

/** Container para pedidos de desafio com botões à direita (substitui flex-1 + min-w grande). */
export const PEDIDO_MATCH_ACOES_ROW_CLASS = "relative mt-3 flex items-center justify-end gap-1";

/** Form do pedido de desafio: não estica. */
export const PEDIDO_MATCH_ACAO_FORM_CLASS = "inline";

/** Container Aprovar/Recusar candidatura na comunidade / vagas. */
export const CANDIDATURA_ACOES_ROW_CLASS = "mt-3 flex items-center justify-end gap-1";

/** Container do fluxo /desafio no app logado: folga extra acima do footer + nav inferior. */
export const DESAFIO_PAGE_MAIN_CLASS =
  "eid-touch-ui-scope eid-desafio-ui mx-auto w-full max-w-3xl px-3 py-3 pb-[calc(var(--eid-shell-footer-offset)+2.5rem)] sm:px-6 sm:py-4 sm:pb-12";
