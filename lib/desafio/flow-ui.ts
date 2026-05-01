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
  "rounded-xl border border-transparent bg-eid-primary-500/10 p-4 transition hover:bg-eid-primary-500/16";

export const DESAFIO_CHOICE_AMISTOSO =
  "rounded-xl border border-transparent bg-emerald-500/10 p-4 transition hover:bg-emerald-500/16";

export const DESAFIO_CHOICE_ACTION =
  "inline-flex min-h-[30px] w-full items-center justify-center rounded-xl border border-transparent bg-eid-action-500/10 px-3 text-center text-[9px] font-bold uppercase tracking-[0.03em] text-eid-action-200 transition hover:bg-eid-action-500/16";

/**
 * Aceitar / Recusar em pedidos (convite de equipe, pedido de desafio, candidatura ao elenco).
 * Formato mini-chip, sem largura total — evita botões que ocupam metade do card.
 * ~70% menor em área que o bloco full-width com texto 8px.
 */
export const PEDIDO_ACEITAR_BTN_CLASS =
  "inline-flex !h-[12px] !min-h-0 shrink-0 origin-center scale-[0.82] items-center justify-center overflow-hidden whitespace-nowrap rounded-[6px] border border-orange-200/35 bg-[linear-gradient(180deg,#ffb14a_0%,#ff8d1c_48%,#ef6c00_100%)] px-0 text-[4px] font-black uppercase leading-none tracking-[0.02em] text-white shadow-[0_8px_18px_-10px_rgba(239,108,0,0.75)] transition hover:brightness-105 active:brightness-95 disabled:opacity-60 [&_span]:inline-block [&_span]:origin-center [&_span]:scale-[0.78] md:!h-[18px] md:scale-100 md:px-1 md:text-[7px] md:[&_span]:scale-100";

export const PEDIDO_RECUSAR_BTN_CLASS =
  "inline-flex !h-[12px] !min-h-0 shrink-0 origin-center scale-[0.82] items-center justify-center overflow-hidden whitespace-nowrap rounded-[6px] border border-[#475569] bg-transparent px-0 text-[4px] font-black uppercase leading-none tracking-[0.02em] text-[#CBD5F5] transition hover:border-[#ef4444] hover:bg-red-500/15 hover:text-red-100 active:border-[#ef4444] active:bg-red-500/22 active:text-white disabled:opacity-60 [&_span]:inline-block [&_span]:origin-center [&_span]:scale-[0.78] md:!h-[18px] md:scale-100 md:px-1 md:text-[7px] md:[&_span]:scale-100 eid-light:border-[#475569] eid-light:text-[#475569]";

/**
 * Cancelar compacto (candidatura, pedido enviado, atalho na agenda): mesma altura fixa que Aceitar/Recusar.
 */
export const PEDIDO_CANCELAR_COMPACT_BTN_CLASS =
  "inline-flex !h-[10px] !min-h-0 shrink-0 items-center justify-center rounded-full border border-red-700/90 bg-red-700 px-0 text-[2px] font-black uppercase leading-none tracking-[0.02em] text-white shadow-[0_4px_14px_-4px_rgba(220,38,38,0.45)] transition hover:bg-red-800 disabled:opacity-60";

/** Ver mais / Ver menos compacto com altura padronizada. */
export const PEDIDO_VER_MAIS_COMPACT_BTN_CLASS =
  "inline-flex !h-[18px] !min-h-0 shrink-0 items-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/8 px-1 text-[7px] font-black uppercase leading-none tracking-[0.03em] text-eid-primary-300 transition hover:border-eid-primary-500/50 disabled:opacity-60";

/**
 * Limpar compacto (pílula, fundo claro, ícone lixeira) — usado por `EidLimparCompactButton`.
 */
export const PEDIDO_LIMPAR_COMPACT_BTN_CLASS =
  "inline-flex min-h-0 shrink-0 items-center justify-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_90%,var(--eid-surface)_10%)] px-2 py-0.5 text-[7px] font-black uppercase leading-none tracking-[0.03em] text-eid-fg transition hover:border-red-400/40 hover:text-red-300 disabled:opacity-50 eid-light:bg-white/85 eid-light:text-slate-800";

/** Container alinhado à direita para pares Aceitar/Recusar em cards. */
export const PEDIDO_ACOES_ROW_CLASS = "mt-2 flex items-center justify-end gap-0 md:gap-1";

/** Form inline ao lado do outro (sem flex-1 / w-full). */
export const PEDIDO_ACAO_FORM_INLINE_CLASS = "inline";

/** Container para pedidos de desafio com botões à direita (substitui flex-1 + min-w grande). */
export const PEDIDO_MATCH_ACOES_ROW_CLASS = "relative mt-3 flex items-center justify-end gap-0 md:gap-1";

/** Form do pedido de desafio: não estica. */
export const PEDIDO_MATCH_ACAO_FORM_CLASS = "inline";

/** Pedido de desafio recebido (Comunidade): Aceitar/Recusar em linha inteira, ~50% cada. */
export const PEDIDO_MATCH_RECEBIDO_ACOES_ROW_CLASS =
  "relative mt-4 flex w-full max-w-full items-stretch justify-center gap-2 sm:gap-3";

/**
 * Mesma faixa de ações, para rodapé de card social (sem margem extra, gap justo).
 * Botões Aceitar/Recusar: use `EidSocialAceitarButton` / `EidSocialRecusarButton` em `components/ui/eid-social-acao-buttons.tsx`.
 */
export const PEDIDO_MATCH_RECEBIDO_SOCIAL_ACOES_ROW_CLASS =
  "flex w-full max-w-full items-center justify-center gap-1.5 sm:gap-2";

export const PEDIDO_MATCH_RECEBIDO_FORM_CLASS = "min-w-0 flex-1 basis-0";

export const PEDIDO_MATCH_RECEBIDO_ACEITAR_BTN_CLASS =
  "flex min-h-[48px] w-full items-center justify-center rounded-xl border border-orange-200/35 bg-[linear-gradient(180deg,#ffb14a_0%,#ff8d1c_48%,#ef6c00_100%)] px-2 !text-sm font-black uppercase tracking-[0.06em] text-white shadow-[0_8px_18px_-10px_rgba(239,108,0,0.75)] transition hover:brightness-105 active:brightness-95 disabled:pointer-events-none disabled:opacity-55 sm:min-h-[52px] sm:px-4 sm:!text-base";

export const PEDIDO_MATCH_RECEBIDO_RECUSAR_BTN_CLASS =
  "flex min-h-[48px] w-full items-center justify-center rounded-xl border border-rose-500/90 bg-rose-600 px-2 !text-sm font-black uppercase tracking-[0.06em] text-white shadow-[0_4px_14px_-6px_rgba(225,29,72,0.45)] transition hover:bg-rose-500 disabled:pointer-events-none disabled:opacity-55 sm:min-h-[52px] sm:px-4 sm:!text-base";

/**
 * Aceitar / Recusar / Aprovar — padrão global (cards sociais, candidatura, pedidos ao líder).
 * Contorno + fundo leve na cor do botão; ícone em círculo (`PEDIDO_SOCIAL_LIGHT_ICON_RING_*`).
 * Touch: `app/globals.css` (`data-eid-social-acao-btn`).
 */
export const PEDIDO_MATCH_RECEBIDO_SOCIAL_ACEITAR_BTN_CLASS =
  "flex min-h-[30px] w-full items-center justify-center gap-0.5 rounded-[8px] border border-orange-200/35 bg-[linear-gradient(180deg,#ffb14a_0%,#ff8d1c_48%,#ef6c00_100%)] px-0.5 text-[8.5px] font-black uppercase tracking-[0.05em] text-white shadow-[0_6px_14px_-10px_rgba(239,108,0,0.72)] transition hover:brightness-105 active:brightness-95 disabled:pointer-events-none disabled:opacity-50 sm:min-h-[32px] sm:gap-1 sm:px-1 sm:text-[9px]";

export const PEDIDO_MATCH_RECEBIDO_SOCIAL_RECUSAR_BTN_CLASS =
  "flex min-h-[30px] w-full items-center justify-center gap-0.5 rounded-[8px] border border-[#475569] bg-transparent px-0.5 text-[8.5px] font-black uppercase tracking-[0.05em] text-[#CBD5F5] shadow-none transition hover:border-[#ef4444] hover:bg-red-500/15 hover:text-red-100 active:border-[#ef4444] active:bg-red-500/22 active:text-white disabled:pointer-events-none disabled:opacity-50 sm:min-h-[32px] sm:gap-1 sm:px-1 sm:text-[9px] eid-light:border-[#475569] eid-light:text-[#475569]";

/** Anel do ícone Check / Loader dentro do botão Aceitar (chrome claro / escuro). */
export const PEDIDO_SOCIAL_LIGHT_ICON_RING_ACEITAR =
  "flex h-[9px] w-[9px] shrink-0 items-center justify-center rounded-full border border-orange-100/85 bg-transparent text-[#fff7ed] sm:h-[10px] sm:w-[10px] eid-light:border-orange-100/85 eid-light:text-[#fff7ed]";

/** Anel do ícone X / Loader dentro do botão Recusar (chrome claro / escuro). */
export const PEDIDO_SOCIAL_LIGHT_ICON_RING_RECUSAR =
  "flex h-[9px] w-[9px] shrink-0 items-center justify-center rounded-full border border-[#475569] bg-transparent text-[#CBD5F5] sm:h-[10px] sm:w-[10px] eid-light:border-[#64748b] eid-light:bg-transparent eid-light:text-[#475569]";

/** Cancelar pedido de desafio enviado (Comunidade): compacto, vermelho (tema claro/escuro via utilitários + globals). */
export const PEDIDO_DESAFIO_ENVIADO_CANCELAR_BTN_CLASS =
  "inline-flex !min-h-[17px] !max-h-[22px] shrink-0 items-center justify-center rounded border border-red-600 !bg-red-600 px-1.5 !py-0 !text-[6.5px] font-black uppercase !leading-none tracking-[0.06em] !text-white shadow-sm transition hover:!bg-red-500 hover:!border-red-500 disabled:pointer-events-none disabled:opacity-55 sm:!min-h-[18px] sm:!max-h-[24px] sm:!text-[7px]";

/** Container Aprovar/Recusar candidatura na comunidade / vagas. */
export const CANDIDATURA_ACOES_ROW_CLASS = "mt-3 flex items-center justify-end gap-1 md:gap-1.5";

/** Container do fluxo /desafio no app logado: folga extra acima do footer + nav inferior. */
export const DESAFIO_PAGE_MAIN_CLASS =
  "eid-touch-ui-scope eid-desafio-ui mx-auto w-full max-w-3xl px-3 py-3 pb-[calc(var(--eid-shell-footer-offset)+2.5rem)] sm:px-6 sm:py-4 sm:pb-12";
