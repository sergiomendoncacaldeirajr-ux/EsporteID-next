"use client";

import { useState } from "react";
import { TimesVagaRecrutamentoCard, type TimesVagaCardData } from "@/components/times/times-vaga-recrutamento-card";

const PAGE = 10;

export type TimesRecrutamentoVagasItem = {
  team: TimesVagaCardData;
  minhaCandidaturaPendenteId: number | null;
  jaSouMembro: boolean;
};

export function TimesRecrutamentoVagasList({
  viewerUserId,
  items,
}: {
  viewerUserId: string;
  items: TimesRecrutamentoVagasItem[];
}) {
  const [visible, setVisible] = useState(PAGE);

  const slice = items.slice(0, visible);
  const hasMore = visible < items.length;
  const rest = items.length - slice.length;
  const nextBatch = Math.min(PAGE, rest);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-6 text-center">
        <p className="text-sm text-eid-text-secondary">
          Nenhuma formação com vaga aberta encontrada agora. Tente outra busca em alguns instantes.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slice.map((it) => (
          <TimesVagaRecrutamentoCard
            key={it.team.id}
            team={it.team}
            viewerUserId={viewerUserId}
            minhaCandidaturaPendenteId={it.minhaCandidaturaPendenteId}
            jaSouMembro={it.jaSouMembro}
          />
        ))}
      </div>
      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            aria-label={`Carregar mais ${nextBatch} formações (${rest} restantes)`}
            onClick={() => setVisible((n) => n + PAGE)}
            className="inline-flex min-h-10 touch-manipulation items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_16%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_6%,transparent)] px-5 py-2 text-[10px] font-black uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-primary-500)_28%)] transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_24%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_10%,transparent)] sm:text-[11px]"
          >
            Ver mais
          </button>
        </div>
      ) : null}
    </>
  );
}
