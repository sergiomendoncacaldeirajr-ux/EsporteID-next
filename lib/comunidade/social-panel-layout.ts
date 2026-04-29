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

export const EID_SOCIAL_GRID_3 = "grid min-w-0 grid-cols-3 divide-x divide-[color:var(--eid-border-subtle)]";

export const EID_SOCIAL_CARD_SHELL =
  "relative overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_95%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] shadow-[0_4px_14px_-12px_rgba(15,23,42,0.35)] [data-eid-theme=light]:shadow-[0_4px_18px_-12px_rgba(15,23,42,0.12)]";

export const EID_SOCIAL_CARD_FOOTER =
  "border-t border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_35%,transparent)] px-3 py-px sm:px-4";
