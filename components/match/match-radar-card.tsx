"use client";

import Link from "next/link";
import type { MatchRadarCard } from "@/lib/match/radar-snapshot";

type Props = {
  card: MatchRadarCard;
  esporteContextId: string;
};

export function MatchRadarCardView({ card, esporteContextId }: Props) {
  const esporteParam = card.esporteId > 0 ? String(card.esporteId) : esporteContextId;
  const desafioHref = `/desafio?id=${encodeURIComponent(card.id)}&tipo=${encodeURIComponent(card.modalidade)}&esporte=${encodeURIComponent(esporteParam)}`;

  const initials = card.nome
    .split(/\s+/u)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <article className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-3 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.24)] backdrop-blur-sm [content-visibility:auto]">
      <div className="flex gap-3">
        <div className="relative shrink-0">
          {card.avatarUrl ? (
            <img
              src={card.avatarUrl}
              alt={card.nome}
              className="h-14 w-14 rounded-2xl border border-[color:var(--eid-border-subtle)] object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/80 text-sm font-black text-cyan-300/90">
              {initials}
            </div>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-eid-card ${
              card.disponivelAmistoso ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.85)]" : "bg-red-500"
            }`}
            title={card.disponivelAmistoso ? "Disponível para amistoso" : "Indisponível para amistoso"}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-eid-fg">{card.nome}</p>
              <p className="text-[11px] font-medium text-eid-primary-400">{card.esporteNome}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-eid-text-secondary">EID</p>
              <p className="text-sm font-black tabular-nums text-eid-fg">{card.eid.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-eid-text-secondary">
            <span>
              Rank <span className="font-bold text-eid-fg/90">{card.rank}</span>
            </span>
            <span className="text-eid-primary-400/85">{card.dist.toFixed(1).replace(".", ",")} km</span>
            <span className="rounded-md bg-eid-surface/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-eid-text-secondary">
              {card.modalidade === "individual" ? "Indiv." : card.modalidade === "dupla" ? "Dupla" : "Time"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[color:var(--eid-border-subtle)]/60 pt-3">
        <Link
          href={desafioHref}
          className="eid-btn-match-cta inline-flex min-h-[40px] flex-1 items-center justify-center rounded-xl px-4 text-xs font-black uppercase tracking-wide"
        >
          Solicitar Match
        </Link>
        <Link
          href={card.href}
          className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-xs font-semibold text-eid-text-secondary transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_40%,var(--eid-border-subtle)_60%)] hover:text-eid-primary-300"
        >
          Perfil
        </Link>
        {!card.canChallenge ? (
          <p className="w-full text-[10px] text-eid-text-secondary">{card.challengeHint}</p>
        ) : null}
      </div>
    </article>
  );
}
