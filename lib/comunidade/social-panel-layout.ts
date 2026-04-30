/** Data e hora em duas linhas (cards sociais em 3 colunas). */
export function formatSolicitacaoParts(iso: string | null | undefined): { date: string; time: string } {
  const raw = iso ? String(iso).trim() : "";
  if (!raw) return { date: "—", time: "—" };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  return {
    date: d.toLocaleDateString("pt-BR"),
    time: d.toLocaleTimeString("pt-BR"),
  };
}

export const EID_SOCIAL_GRID_3 = "grid min-w-0 grid-cols-3";

/** Shell âmbar: sugestões enviadas ao líder e pedidos de entrada enviados (Comunidade). */
export const EID_SOCIAL_SUGESTAO_ENVIADA_CARD_SHELL =
  "relative overflow-hidden rounded-xl border border-amber-500/25 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-warning-500)_12%,var(--eid-card)_88%),color-mix(in_srgb,var(--eid-surface)_93%,transparent))] text-sm shadow-[0_8px_18px_-14px_rgba(217,119,6,0.45)] md:p-0";

/** Status -> shell global (card acompanha a cor do status). */
export const EID_SOCIAL_STATUS_PENDING_CARD_SHELL =
  "relative overflow-hidden rounded-xl border border-amber-500/30 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-warning-500)_13%,var(--eid-card)_87%),color-mix(in_srgb,var(--eid-surface)_93%,transparent))] text-sm shadow-[0_8px_18px_-14px_rgba(217,119,6,0.42)] eid-light:border-amber-300/45 eid-light:bg-[linear-gradient(180deg,color-mix(in_srgb,#f59e0b_4%,#fffdf7_96%),#fffefc)]";

export const EID_SOCIAL_STATUS_APPROVED_CARD_SHELL =
  "relative overflow-hidden rounded-xl border border-emerald-500/30 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-success-500)_14%,var(--eid-card)_86%),color-mix(in_srgb,var(--eid-surface)_93%,transparent))] text-sm shadow-[0_8px_18px_-14px_rgba(16,185,129,0.38)] eid-light:border-emerald-300/55 eid-light:bg-[linear-gradient(180deg,color-mix(in_srgb,#10b981_13%,#ecfdf5_87%),#fafffd)]";

export const EID_SOCIAL_STATUS_REJECTED_CARD_SHELL =
  "relative overflow-hidden rounded-xl border border-rose-500/32 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-danger-500)_13%,var(--eid-card)_87%),color-mix(in_srgb,var(--eid-surface)_93%,transparent))] text-sm shadow-[0_8px_18px_-14px_rgba(244,63,94,0.34)] eid-light:border-rose-300/55 eid-light:bg-[linear-gradient(180deg,color-mix(in_srgb,#ef4444_11%,#fff1f2_89%),#fffafa)]";

export function getSocialStatusCardShell(statusRaw: string | null | undefined): string {
  const s = String(statusRaw ?? "").trim().toLowerCase();
  if (s === "aprovado" || s === "aceito" || s === "aceita") return EID_SOCIAL_STATUS_APPROVED_CARD_SHELL;
  if (s === "recusado" || s === "recusada" || s === "cancelado" || s === "cancelada") return EID_SOCIAL_STATUS_REJECTED_CARD_SHELL;
  return EID_SOCIAL_STATUS_PENDING_CARD_SHELL;
}

export const EID_SOCIAL_CARD_SHELL =
  "relative overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_95%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] shadow-[0_4px_14px_-12px_rgba(15,23,42,0.35)] eid-light:shadow-[0_4px_18px_-12px_rgba(15,23,42,0.12)]";

export const EID_SOCIAL_CARD_FOOTER =
  "border-t border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_35%,transparent)] px-3 py-2 sm:px-4 sm:py-2.5";

/**
 * Card social (pedidos de desafio / pedidos ao elenco): mockup claro no tema light;
 * no tema escuro usa camadas `--eid-card` / `--eid-surface` para alinhar ao app.
 */
export const EID_SOCIAL_LIGHT_CARD_SHELL =
  "relative overflow-hidden rounded-[14px] border border-slate-200/90 bg-white font-[family-name:var(--font-barlow),ui-sans-serif] text-[#1a2b4c] shadow-[0_6px_28px_rgba(26,43,76,0.09)] eid-dark:border-[color:var(--eid-border-subtle)] eid-dark:bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] eid-dark:text-eid-fg eid-dark:shadow-[0_10px_36px_rgba(0,0,0,0.42)]";

/** Painel interno com degradê suave (conteúdo + faixa de ações no mesmo bloco). */
export const EID_SOCIAL_LIGHT_PANEL =
  "mx-1.5 mb-3 mt-2 overflow-hidden rounded-[12px] border border-slate-200/40 bg-gradient-to-b from-[#fdfefe] via-[#fafcfd] to-[#f6f9fb] px-3 pb-3 pt-4 sm:mx-2 sm:px-4 sm:pb-3.5 eid-dark:border-[color:color-mix(in_srgb,var(--eid-border-subtle)_92%,transparent)] eid-dark:bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_90%,var(--eid-surface)_10%),color-mix(in_srgb,var(--eid-surface)_93%,var(--eid-bg)_7%))]";

/** Faixa só dos botões Aceitar/Recusar dentro do painel. */
export const EID_SOCIAL_LIGHT_ACOES_ROW =
  "-mx-3 mt-3 border-t border-sky-200/30 bg-transparent px-3 pt-2 sm:-mx-4 sm:px-4 sm:pt-2.5 eid-dark:border-[color:color-mix(in_srgb,var(--eid-primary-500)_20%,var(--eid-border-subtle)_80%)]";

/**
 * Marca Aceitar/Recusar (e Aprovar) compactos em `data-eid-touch-ui`: o CSS global de botões
 * (min-height 44px, padding largo) não se aplica; ícones SVG são dimensionados em `globals.css`.
 * Preferir `EidSocialAceitarButton` / `EidSocialRecusarButton` (`components/ui/eid-social-acao-buttons.tsx`), que já aplicam este atributo.
 */
export const EID_SOCIAL_ACAO_BTN_ATTR = { "data-eid-social-acao-btn": "true" } as const;
