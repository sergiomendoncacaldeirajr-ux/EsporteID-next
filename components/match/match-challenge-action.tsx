"use client";

import { useEffect, useMemo, useState } from "react";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";

type Modalidade = "individual" | "dupla" | "time";

export type DesafioVariant = { href: string; label: string };

type Props = {
  modalidade: Modalidade;
  desafioHref: string;
  /** Vários esportes no mesmo atleta (individual): abre seletor em vez de link único. */
  desafioVariants?: DesafioVariant[];
  className: string;
  title: string;
  cardEsporteId: number;
  viewerEsportesComDupla: readonly number[];
  viewerEsportesComTime: readonly number[];
  /**
   * Quando true e o usuário não tem dupla/time no esporte: só renderiza o botão Desafio;
   * o painel “criar agora” fica a cargo do pai (largura total abaixo do cabeçalho).
   */
  detachMissingFormationPrompt?: boolean;
  missingFormationPromptOpen?: boolean;
  onMissingFormationPromptChange?: (open: boolean) => void;
};

export function isMatchChallengeBlockedByMissingFormation(
  modalidade: Modalidade,
  cardEsporteId: number,
  viewerEsportesComDupla: readonly number[],
  viewerEsportesComTime: readonly number[]
): boolean {
  return (
    (modalidade === "dupla" && !viewerEsportesComDupla.includes(cardEsporteId)) ||
    (modalidade === "time" && !viewerEsportesComTime.includes(cardEsporteId))
  );
}

function useCadastrarEquipeHref(esporteId: number, tipoFormacao: "dupla" | "time") {
  return useMemo(() => {
    const fromPath = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/match";
    const qs = new URLSearchParams();
    qs.set("from", fromPath);
    if (Number.isFinite(esporteId) && esporteId > 0) qs.set("esporte", String(esporteId));
    qs.set("tipo", tipoFormacao);
    return `/editar/equipes/cadastrar?${qs.toString()}`;
  }, [esporteId, tipoFormacao]);
}

type MissingFormationPromptProps = {
  esporteId: number;
  modalidade: "dupla" | "time";
  open: boolean;
  onClose: () => void;
};

/** Painel full-width: criar dupla/time (usar abaixo da linha avatar + nome). */
export function MatchChallengeMissingFormationPrompt({
  esporteId,
  modalidade,
  open,
  onClose,
}: MissingFormationPromptProps) {
  const tipoFormacao = modalidade === "time" ? "time" : "dupla";
  const createHref = useCadastrarEquipeHref(esporteId, tipoFormacao);
  const alvoLabel = modalidade === "dupla" ? "dupla" : "time";
  const alvoArtigo = modalidade === "dupla" ? "uma" : "um";

  if (!open) return null;

  return (
    <div className="w-full min-w-0 max-w-full rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/75 p-2">
      <p className="break-words text-[9px] leading-snug text-eid-text-secondary sm:text-[10px]">
        Você ainda não tem {alvoArtigo} <span className="font-semibold text-eid-fg">{alvoLabel}</span> neste esporte no seu
        perfil para este tipo de desafio. Deseja criar agora?
      </p>
      <div className="mt-1.5 flex w-full min-w-0 flex-row items-stretch gap-2">
        <ProfileEditDrawerTrigger
          href={createHref}
          title={`Criar ${alvoLabel}`}
          fullscreen
          topMode="backOnly"
          className="inline-flex min-h-[36px] min-w-0 flex-1 items-center justify-center rounded-md border border-[color:var(--eid-border-subtle)] bg-eid-card px-2 text-[9px] font-black uppercase tracking-[0.05em] text-eid-fg transition hover:border-eid-primary-500/35 sm:min-h-[40px] sm:px-3 sm:text-[11px] sm:tracking-[0.06em]"
        >
          Criar agora
        </ProfileEditDrawerTrigger>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[36px] min-w-0 flex-1 items-center justify-center rounded-md border border-[color:var(--eid-border-subtle)] bg-transparent px-2 text-[9px] font-black uppercase tracking-[0.05em] text-eid-text-secondary transition hover:text-eid-fg sm:min-h-[40px] sm:px-3 sm:text-[11px] sm:tracking-[0.06em]"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}

export function MatchChallengeAction({
  modalidade,
  desafioHref,
  desafioVariants,
  className,
  title,
  cardEsporteId,
  viewerEsportesComDupla,
  viewerEsportesComTime,
  detachMissingFormationPrompt = false,
  missingFormationPromptOpen = false,
  onMissingFormationPromptChange,
}: Props) {
  const [internalPromptOpen, setInternalPromptOpen] = useState(false);
  const [sportPickerOpen, setSportPickerOpen] = useState(false);

  useEffect(() => {
    setSportPickerOpen(false);
  }, [desafioHref, cardEsporteId, modalidade, desafioVariants?.length]);

  const blockedByMissingFormation = isMatchChallengeBlockedByMissingFormation(
    modalidade,
    cardEsporteId,
    viewerEsportesComDupla,
    viewerEsportesComTime
  );

  const detached = Boolean(detachMissingFormationPrompt && blockedByMissingFormation);
  const promptOpen = detached ? missingFormationPromptOpen : internalPromptOpen;
  const setPromptOpen = detached ? (v: boolean) => onMissingFormationPromptChange?.(v) : setInternalPromptOpen;

  const tipoFormacaoBlocked = modalidade === "time" ? "time" : "dupla";
  const createHref = useCadastrarEquipeHref(cardEsporteId, tipoFormacaoBlocked);
  const alvoLabel = modalidade === "dupla" ? "dupla" : "time";
  const alvoArtigo = modalidade === "dupla" ? "uma" : "um";

  const variantsResolved: DesafioVariant[] =
    modalidade === "individual" &&
    Array.isArray(desafioVariants) &&
    desafioVariants.length > 0
      ? desafioVariants
      : [{ href: desafioHref, label: "" }];

  if (!blockedByMissingFormation) {
    if (modalidade === "individual" && variantsResolved.length > 1) {
      return (
        <div className="w-full min-w-0 max-w-full">
          <button
            type="button"
            title={title}
            aria-label={title}
            aria-expanded={sportPickerOpen}
            className={className}
            onClick={() => setSportPickerOpen((v) => !v)}
          >
            Desafio
          </button>
          {sportPickerOpen ? (
            <div className="mt-1.5 w-full min-w-0 space-y-1 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/80 p-1.5">
              <p className="px-0.5 text-[8px] font-semibold uppercase tracking-[0.06em] text-eid-text-secondary">
                Esporte do desafio
              </p>
              {variantsResolved.map((v) => (
                <ProfileEditDrawerTrigger
                  key={v.href}
                  href={v.href}
                  title={`${title} — ${v.label}`}
                  openingLabel={<span className="animate-pulse">Abrindo...</span>}
                  fullscreen
                  topMode="backAndClose"
                  className="flex w-full min-w-0 items-center justify-center rounded-md border border-[color:var(--eid-border-subtle)] bg-eid-card px-2 py-1.5 text-[9px] font-bold uppercase tracking-[0.04em] text-eid-fg transition hover:border-eid-primary-500/35"
                >
                  {v.label.trim() || "Esporte"}
                </ProfileEditDrawerTrigger>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <ProfileEditDrawerTrigger
        href={variantsResolved[0]?.href ?? desafioHref}
        title={title}
        openingLabel={<span className="animate-pulse">Desafiando...</span>}
        fullscreen
        topMode="backAndClose"
        className={className}
      >
        Desafio
      </ProfileEditDrawerTrigger>
    );
  }

  if (detached) {
    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        className={className}
        aria-expanded={promptOpen}
        onClick={() => setPromptOpen(!promptOpen)}
      >
        Desafio
      </button>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      <button
        type="button"
        title={title}
        aria-label={title}
        className={className}
        onClick={() => setPromptOpen(!promptOpen)}
      >
        Desafio
      </button>
      {promptOpen ? (
        <div className="mt-1.5 w-full min-w-0 max-w-full rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/75 p-2">
          <p className="break-words text-[9px] leading-snug text-eid-text-secondary sm:text-[10px]">
            Você ainda não tem {alvoArtigo} <span className="font-semibold text-eid-fg">{alvoLabel}</span> neste esporte no
            seu perfil para este tipo de desafio. Deseja criar agora?
          </p>
          <div className="mt-1.5 flex w-full min-w-0 flex-row items-stretch gap-2">
            <ProfileEditDrawerTrigger
              href={createHref}
              title={`Criar ${alvoLabel}`}
              fullscreen
              topMode="backOnly"
              className="inline-flex min-h-[36px] min-w-0 flex-1 items-center justify-center rounded-md border border-[color:var(--eid-border-subtle)] bg-eid-card px-2 text-[9px] font-black uppercase tracking-[0.05em] text-eid-fg transition hover:border-eid-primary-500/35 sm:min-h-[40px] sm:px-3 sm:text-[11px] sm:tracking-[0.06em]"
            >
              Criar agora
            </ProfileEditDrawerTrigger>
            <button
              type="button"
              onClick={() => setPromptOpen(false)}
              className="inline-flex min-h-[36px] min-w-0 flex-1 items-center justify-center rounded-md border border-[color:var(--eid-border-subtle)] bg-transparent px-2 text-[9px] font-black uppercase tracking-[0.05em] text-eid-text-secondary transition hover:text-eid-fg sm:min-h-[40px] sm:px-3 sm:text-[11px] sm:tracking-[0.06em]"
            >
              Agora não
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
