"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type ProfileSolicitarMatchEsporte = { esporteId: number; nome: string };

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
    setEsporteSel(esportes[0]?.esporteId ?? 0);
  }, [esportes]);

  useEffect(() => {
    if (!aberto) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [aberto]);

  const amistosoOk = viewerAmistosoOn && alvoAmistosoOn;
  const base = `/desafio?id=${encodeURIComponent(alvoId)}&tipo=individual&esporte=${esporteSel}`;

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
        className="eid-btn-match-cta eid-match-cta-pulse eid-shimmer-btn relative inline-flex min-h-[44px] w-full items-center justify-center overflow-hidden rounded-xl px-4 text-[13px] font-black uppercase tracking-[0.1em]"
        aria-expanded={aberto}
        aria-haspopup="true"
      >
        Pedir desafio
      </button>
      {mostrarDicaWppRanking ? (
        <p className="text-[10px] leading-relaxed text-eid-text-secondary">
          Vocês já podem falar no WhatsApp. Para valer pontos no ranking, use o botão acima e escolha{" "}
          <span className="font-semibold text-eid-fg">desafio de ranking</span>.
        </p>
      ) : null}

      {aberto ? (
        <div
          className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/95 p-3 shadow-lg backdrop-blur-sm"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {esportes.length > 1 ? (
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Esporte</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {esportes.map((e) => {
                  const ativo = esporteSel === e.esporteId;
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
          ) : null}

          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Tipo de confronto</p>
          <div className="mt-2 grid gap-2">
            <Link
              href={`${base}&finalidade=ranking`}
              role="menuitem"
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/12 text-center text-xs font-bold uppercase tracking-wide text-eid-primary-200 transition hover:bg-eid-primary-500/20"
              onClick={() => setAberto(false)}
            >
              Desafio de ranking
            </Link>
            {amistosoOk ? (
              <Link
                href={`${base}&finalidade=amistoso`}
                role="menuitem"
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/12 text-center text-xs font-bold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-500/20"
                onClick={() => setAberto(false)}
              >
                Desafio amistoso
              </Link>
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
      ) : null}
    </div>
  );
}
