"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";

export type ProfileSolicitarMatchEsporte = {
  esporteId: number;
  nome: string;
  rankingBlockedUntil?: string | null;
};

/** Um único botão “Pedir desafio” que abre ranking vs amistoso (e escolha de esporte se necessário). */
export function ProfileSolicitarMatchMenu({
  alvoId,
  esportes,
  viewerAmistosoOn,
  alvoAmistosoOn,
  mostrarDicaWppRanking,
}: {
  alvoId: string;
  esportes: ProfileSolicitarMatchEsporte[];
  viewerAmistosoOn: boolean;
  alvoAmistosoOn: boolean;
  mostrarDicaWppRanking?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [esporteSel, setEsporteSel] = useState(esportes[0]?.esporteId ?? 0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [aberto]);

  const amistosoOk = viewerAmistosoOn && alvoAmistosoOn;
  const esporteSelSafe = esportes.some((e) => e.esporteId === esporteSel)
    ? esporteSel
    : (esportes[0]?.esporteId ?? 0);
  const base = `/desafio?id=${encodeURIComponent(alvoId)}&tipo=individual&esporte=${esporteSelSafe}`;
  const esporteAtual = esportes.find((e) => e.esporteId === esporteSelSafe) ?? null;
  const rankingBlockedUntil = esporteAtual?.rankingBlockedUntil ?? null;
  const rankingBloqueado = Boolean(rankingBlockedUntil);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setAberto((v) => !v);
  }, []);

  if (esportes.length === 0) return null;

  return (
    <div ref={wrapRef} className="space-y-2">
      <button
        type="button"
        onClick={toggle}
        className="eid-btn-dashboard-cta eid-profile-match-cta relative inline-flex w-full items-center justify-center gap-2.5"
        aria-expanded={aberto}
        aria-haspopup="true"
      >
        <svg className="h-5 w-5 shrink-0 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M13 2L5 13h5l-1 9 10-13h-6l0-7z" />
        </svg>
        <span>Pedir desafio</span>
      </button>
      {mostrarDicaWppRanking ? (
        <p className="text-[10px] leading-relaxed text-eid-text-secondary">
          Vocês já podem falar no WhatsApp. Para valer pontos no ranking, use o botão acima e escolha{" "}
          <span className="font-semibold text-eid-fg">desafio de ranking</span>.
        </p>
      ) : null}

      {aberto ? (
        <div
          className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/95 shadow-lg backdrop-blur-sm"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Pedir desafio</p>
            <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
              Match
            </span>
          </div>
          <div className="space-y-3 p-3">
          {esportes.length > 1 ? (
            <div className="overflow-hidden rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/35">
              <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-2.5 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Esporte</p>
                <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-action-400">
                  Seleção
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2">
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {esportes.map((e) => {
                  const ativo = esporteSelSafe === e.esporteId;
                  return (
                    <button
                      key={e.esporteId}
                      type="button"
                      role="menuitem"
                      onClick={() => setEsporteSel(e.esporteId)}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                        ativo
                          ? "border-eid-primary-500/45 bg-eid-primary-500/15 text-eid-fg"
                          : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:border-eid-primary-500/30"
                      }`}
                    >
                      {e.nome}
                    </button>
                  );
                })}
              </div>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/35">
            <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Tipo de confronto</p>
              <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
                Finalidade
              </span>
            </div>
          <div className="grid gap-2 p-2">
            {rankingBloqueado ? (
              <button
                type="button"
                role="menuitem"
                className="inline-flex min-h-[42px] cursor-not-allowed items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 text-center text-xs font-bold uppercase tracking-wide text-eid-text-secondary"
                aria-disabled
              >
                Desafio de ranking
              </button>
            ) : (
              <ProfileEditDrawerTrigger
                href={`${base}&finalidade=ranking`}
                title="Desafio de ranking"
                fullscreen
                topMode="backOnly"
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/12 text-center text-xs font-bold uppercase tracking-wide text-eid-primary-200 transition hover:bg-eid-primary-500/20"
              >
                <span>Desafio de ranking</span>
              </ProfileEditDrawerTrigger>
            )}
            {rankingBloqueado ? (
              <p className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2 text-center text-[10px] text-eid-text-secondary">
                Ranking bloqueado neste esporte até{" "}
                <span className="font-semibold text-eid-fg">
                  {new Date(String(rankingBlockedUntil)).toLocaleDateString("pt-BR")}
                </span>
                .
              </p>
            ) : null}
            {amistosoOk ? (
              <ProfileEditDrawerTrigger
                href={`${base}&finalidade=amistoso`}
                title="Desafio amistoso"
                fullscreen
                topMode="backOnly"
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/12 text-center text-xs font-bold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/20"
              >
                <span>Desafio amistoso</span>
              </ProfileEditDrawerTrigger>
            ) : (
              <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2.5 text-center">
                <p className="text-[11px] font-semibold text-eid-text-secondary">Desafio amistoso</p>
                <p className="mt-0.5 text-[10px] leading-snug text-eid-text-secondary/90">
                  Indisponível: ative o modo amistoso no seu perfil e peça para o oponente também deixar ativo.
                </p>
              </div>
            )}
          </div>
          </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
