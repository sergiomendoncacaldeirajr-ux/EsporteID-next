"use client";

import { useMemo, useState } from "react";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";

type Props = {
  modalidade: "individual" | "dupla" | "time";
  desafioHref: string;
  className: string;
  title: string;
  cardEsporteId: number;
  viewerEsportesComDupla: readonly number[];
  viewerEsportesComTime: readonly number[];
};

export function MatchChallengeAction({
  modalidade,
  desafioHref,
  className,
  title,
  cardEsporteId,
  viewerEsportesComDupla,
  viewerEsportesComTime,
}: Props) {
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);

  const blockedByMissingFormation =
    (modalidade === "dupla" && !viewerEsportesComDupla.includes(cardEsporteId)) ||
    (modalidade === "time" && !viewerEsportesComTime.includes(cardEsporteId));
  const alvoLabel = modalidade === "dupla" ? "dupla" : "time";

  const createHref = useMemo(() => {
    const from = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/match";
    return `/times?from=${encodeURIComponent(from)}`;
  }, []);

  if (!blockedByMissingFormation) {
    return (
      <ProfileEditDrawerTrigger
        href={desafioHref}
        title={title}
        fullscreen
        topMode="backAndClose"
        className={className}
      >
        Desafio
      </ProfileEditDrawerTrigger>
    );
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        title={title}
        aria-label={title}
        className={className}
        onClick={() => setShowCreatePrompt((v) => !v)}
      >
        Desafio
      </button>
      {showCreatePrompt ? (
        <div className="mt-1.5 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/75 p-2">
          <p className="text-[9px] leading-snug text-eid-text-secondary sm:text-[10px]">
            Você ainda não tem uma <span className="font-semibold text-eid-fg">{alvoLabel}</span> neste esporte no seu
            perfil para este tipo de desafio. Deseja criar agora?
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <ProfileEditDrawerTrigger
              href={createHref}
              title={`Criar ${alvoLabel}`}
              fullscreen
              topMode="backOnly"
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 text-[11px] font-black uppercase tracking-[0.06em] text-eid-fg transition hover:border-eid-primary-500/35"
            >
              Criar agora
            </ProfileEditDrawerTrigger>
            <button
              type="button"
              onClick={() => setShowCreatePrompt(false)}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-[color:var(--eid-border-subtle)] bg-transparent px-3 text-[11px] font-black uppercase tracking-[0.06em] text-eid-text-secondary transition hover:text-eid-fg"
            >
              Agora não
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
