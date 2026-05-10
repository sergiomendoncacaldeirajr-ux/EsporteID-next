"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { atualizarLocalizacaoMatch } from "@/app/match/actions";

/** Chave localStorage: timestamp (ms) até o qual não exibir o banner novamente. */
const DISMISS_KEY = "eid_loc_prompt_dismissed_until";
/** Dias de silêncio após "Agora não". */
const DISMISS_DAYS = 3;
/** Duração da animação de saída (ms) — deve bater com duration-[220ms] no className. */
const EXIT_MS = 220;

type PermStatus = "prompt" | "denied" | "granted" | "unknown";

type Props = {
  /** Se true, o usuário já tem coordenadas salvas — não exibe o banner. */
  hasCoords?: boolean;
};

export function LocationPermissionBanner({ hasCoords = false }: Props) {
  const [mounted, setMounted] = useState(false);
  const [present, setPresent] = useState(false); // controla presença no DOM
  const [closing, setClosing] = useState(false);
  const [permStatus, setPermStatus] = useState<PermStatus>("unknown");
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const permRef = useRef<PermissionStatus | null>(null);

  useEffect(() => {
    setMounted(true);

    if (!("permissions" in navigator)) {
      // Navegador antigo: mostra o banner somente se não há coords salvas
      if (!hasCoords) {
        setPermStatus("prompt");
        setPresent(true);
      }
      return;
    }

    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        permRef.current = result;

        if (result.state === "granted") {
          // Permissão já concedida: atualiza localização em background silenciosamente
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              atualizarLocalizacaoMatch(pos.coords.latitude, pos.coords.longitude).catch(() => {});
            },
            () => {},
            { enableHighAccuracy: false, timeout: 10000 },
          );
          return;
        }

        // Permissão não concedida: só exibe banner se não há coords salvas
        if (hasCoords) return;

        try {
          const until = localStorage.getItem(DISMISS_KEY);
          if (until && Date.now() < Number(until)) return;
        } catch {
          // localStorage indisponível — continua normalmente
        }

        setPermStatus(result.state as PermStatus);
        setPresent(true);
        result.onchange = () => {
          if (result.state === "granted") startClose();
        };
      })
      .catch(() => {
        // API de permissões indisponível para geolocalização neste browser — não exibe
      });

    return () => {
      if (permRef.current) permRef.current.onchange = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords]);

  function startClose() {
    setClosing(true);
    setTimeout(() => {
      setPresent(false);
      setClosing(false);
    }, EXIT_MS);
  }

  function dismiss() {
    try {
      const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_KEY, String(until));
    } catch {
      // sem localStorage — ignora
    }
    startClose();
  }

  function requestLocation() {
    setError(null);
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRequesting(false);
        // Salva coordenadas no banco para não pedir novamente
        atualizarLocalizacaoMatch(pos.coords.latitude, pos.coords.longitude).catch(() => {});
        startClose();
      },
      (err) => {
        setRequesting(false);
        if (err.code === 1) {
          setPermStatus("denied");
          setError(
            "Permissão negada. Acesse as configurações do navegador e ative a localização para o EsporteID."
          );
        } else {
          setError("Não foi possível obter a localização. Tente novamente.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  if (!mounted || !present) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="eid-loc-prompt-title"
      className={`fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[2px] transition-opacity sm:items-center ${
        closing ? "opacity-0 duration-[220ms]" : "opacity-100 duration-[180ms]"
      } motion-safe:animate-[fade-in_180ms_ease-out_both]`}
    >
      {/* Backdrop clicável para dispensar */}
      <button
        type="button"
        aria-label="Dispensar"
        className="absolute inset-0"
        onClick={dismiss}
        tabIndex={-1}
      />

      <div
        className={`relative z-[1] w-full max-w-sm overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-[0_24px_48px_-12px_rgba(0,0,0,0.55)] transition-all sm:rounded-3xl ${
          closing
            ? "translate-y-4 scale-[0.97] opacity-0 duration-[220ms]"
            : "translate-y-0 scale-100 opacity-100 duration-[200ms]"
        } motion-safe:animate-[eid-content-block-enter_300ms_cubic-bezier(0.22,1,0.36,1)_both]`}
      >
        {/* Topo decorativo */}
        <div className="h-1 w-full bg-[linear-gradient(90deg,var(--eid-primary-500),color-mix(in_srgb,var(--eid-primary-400)_60%,transparent))]" />

        {/* Handle (só mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-9 rounded-full bg-[color:var(--eid-border-subtle)]" />
        </div>

        <div className="p-5">
          {/* Ícone */}
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-eid-primary-500/14 ring-1 ring-inset ring-eid-primary-500/22">
            {permStatus === "denied" ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z" strokeLinecap="round" />
                <circle cx="12" cy="10" r="2.5" />
                <line x1="12" y1="8" x2="12" y2="8.5" strokeWidth="3" strokeLinecap="round" />
                <line x1="12" y1="11" x2="12" y2="13" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-eid-primary-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z" strokeLinecap="round" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            )}
          </div>

          <p
            id="eid-loc-prompt-title"
            className="text-[15px] font-black leading-tight tracking-tight text-eid-fg"
          >
            {permStatus === "denied"
              ? "Localização bloqueada"
              : "Ativar localização?"}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-eid-text-secondary">
            {permStatus === "denied"
              ? "Você bloqueou o acesso à localização. Para ver atletas próximos, ranking por cidade e desafios na sua região, ative nas configurações do navegador."
              : "O EsporteID usa sua localização para mostrar atletas próximos, ranking local e desafios na sua região. Você pode desativar a qualquer momento."}
          </p>

          {error ? (
            <p className="mt-2.5 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-[11px] leading-snug text-amber-300">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2">
            {permStatus !== "denied" ? (
              <button
                type="button"
                onClick={requestLocation}
                disabled={requesting}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#1D4ED8] bg-[linear-gradient(135deg,#2563EB,#1D4ED8)] px-5 text-[12px] font-black uppercase tracking-[0.04em] text-white shadow-[0_8px_22px_-10px_rgba(37,99,235,0.75)] transition hover:brightness-105 disabled:opacity-60"
              >
                {requesting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden />
                    Aguardando permissão…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z" strokeLinecap="round" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    Sim, ativar localização
                  </>
                )}
              </button>
            ) : null}

            <button
              type="button"
              onClick={dismiss}
              className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] px-5 text-[11px] font-semibold text-eid-text-secondary transition hover:border-eid-primary-500/30 hover:text-eid-fg"
            >
              {permStatus === "denied" ? "Entendi, fechar" : "Agora não"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
