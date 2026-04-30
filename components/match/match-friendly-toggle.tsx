"use client";

import { Handshake, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { setViewerDisponivelAmistoso } from "@/app/match/actions";
import {
  AMISTOSO_4H_AVISO_TEXTO,
  amistoso4hFirstUseWarningJaAceito,
  marcarAmistoso4hFirstUseWarningAceito,
} from "@/lib/perfil/amistoso-4h-first-warning";
import { AMISTOSO_DURACAO_MS, computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialOn: boolean;
  initialExpiresAt: string | null;
  userId: string;
  className?: string;
  onStateChange?: (nextOn: boolean) => void;
};

function formatoRestante(ms: number): string {
  if (ms <= 0) return "em instantes";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `em ${h} h ${m} min`;
  if (m > 0) return `em ${m} min`;
  const s = Math.ceil(ms / 1000);
  return `em ${s}s`;
}

/** Modo amistoso: liga por até 4 h; desliga sozinho se não renovar. Controle compacto (mesma escala do botão de localização). */
export function MatchFriendlyToggle({ initialOn, initialExpiresAt, userId, className, onStateChange }: Props) {
  const [on, setOn] = useState(initialOn);
  const [expiresAt, setExpiresAt] = useState<string | null>(initialExpiresAt);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const [showFirstUsePrompt, setShowFirstUsePrompt] = useState(false);
  const [pendingFirstUseActivate, setPendingFirstUseActivate] = useState(false);

  useEffect(() => {
    onStateChange?.(initialOn);
  }, [initialOn, onStateChange]);

  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel(`match-profile-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const row = payload.new as {
            disponivel_amistoso?: boolean | null;
            disponivel_amistoso_ate?: string | null;
          };
          const eff = computeDisponivelAmistosoEffective(row.disponivel_amistoso, row.disponivel_amistoso_ate);
          setOn(eff);
          setExpiresAt(eff ? (row.disponivel_amistoso_ate ?? null) : null);
          onStateChange?.(eff);
        }
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [userId, onStateChange]);

  useEffect(() => {
    if (!on || !expiresAt) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, [on, expiresAt]);

  const isExpired = useMemo(() => {
    if (!on || !expiresAt) return false;
    const end = new Date(expiresAt).getTime();
    if (Number.isNaN(end)) return true;
    return end <= nowMs;
  }, [on, expiresAt, nowMs]);
  const effectiveOn = on && !isExpired;
  const effectiveExpiresAt = effectiveOn ? expiresAt : null;

  function applyToggle(next: boolean) {
    setOn(next);
    setExpiresAt(next ? new Date(Date.now() + AMISTOSO_DURACAO_MS).toISOString() : null);
    onStateChange?.(next);
    startTransition(async () => {
      const res = await setViewerDisponivelAmistoso(next);
      if (!res.ok) {
        setOn(!next);
        setExpiresAt(null);
        onStateChange?.(!next);
      }
      setPendingFirstUseActivate(false);
    });
  }

  function toggle(next: boolean) {
    if (next && !amistoso4hFirstUseWarningJaAceito()) {
      setShowFirstUsePrompt(true);
      return;
    }
    applyToggle(next);
  }

  const restanteMs = effectiveOn && effectiveExpiresAt ? new Date(effectiveExpiresAt).getTime() - nowMs : 0;
  const titleHint = effectiveOn
    ? effectiveExpiresAt
      ? `Disponível para amistoso. Desliga sozinho ${formatoRestante(restanteMs)}. Toque para desligar.`
      : "Disponível para amistoso. Toque para desligar."
    : "Indisponível. Toque para ligar (até 4 horas ou até desligar).";

  return (
    <button
      type="button"
      disabled={pending || pendingFirstUseActivate}
      onClick={() => toggle(!effectiveOn)}
      title={titleHint}
      aria-pressed={effectiveOn}
      aria-label={
        effectiveOn ? "Modo amistoso ativado. Toque para desligar." : "Modo amistoso desligado. Toque para ativar."
      }
      className={`inline-flex max-w-[min(100%,9.8rem)] touch-manipulation items-center gap-0.5 rounded-lg border px-1.25 py-0.75 text-left text-[5.5px] font-black uppercase leading-none tracking-[0.045em] transition active:scale-[0.99] disabled:opacity-50 sm:max-w-[11rem] sm:gap-1 sm:px-1.75 sm:py-1 sm:text-[6.5px] sm:tracking-[0.055em] dark:border-2 ${
        effectiveOn
          ? "border-emerald-700/80 bg-emerald-200 text-emerald-950 shadow-[0_1px_2px_rgba(6,95,70,0.2)] ring-1 ring-emerald-700/25 hover:border-emerald-800 hover:bg-emerald-300 dark:border-emerald-400/65 dark:bg-emerald-950/55 dark:text-emerald-100 dark:shadow-[0_2px_8px_-4px_rgba(15,23,42,0.35)] dark:ring-1 dark:ring-emerald-400/20 dark:hover:bg-emerald-900/50"
          : "border-rose-700/75 bg-rose-200 text-rose-950 shadow-[0_1px_2px_rgba(190,18,60,0.18)] ring-1 ring-rose-700/20 hover:border-rose-800 hover:bg-rose-300 dark:border-red-400/55 dark:bg-red-950/45 dark:text-red-100 dark:shadow-[0_2px_8px_-4px_rgba(15,23,42,0.35)] dark:ring-1 dark:ring-red-400/15 dark:hover:bg-red-950/70"
      } ${className ?? ""}`}
    >
      <Handshake
        className={`h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3 ${effectiveOn ? "text-emerald-900 dark:text-emerald-300" : "text-rose-900 dark:text-red-300"}`}
        strokeWidth={2.35}
        aria-hidden
      />
      <span className="min-w-0 flex-1 whitespace-nowrap">
        {pendingFirstUseActivate ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-[1em] w-[1em] animate-spin" aria-hidden />
            <span>Ligando...</span>
          </span>
        ) : pending ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-[1em] w-[1em] animate-spin" aria-hidden />
            <span>Aguarde...</span>
          </span>
        ) : effectiveOn ? (
          <span>Amistoso ativo</span>
        ) : (
          <span>Amistoso off</span>
        )}
      </span>
      {showFirstUsePrompt ? (
        <span className="absolute inset-x-0 top-[calc(100%+6px)] z-20 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-2 text-left shadow-[0_14px_28px_-20px_rgba(2,6,23,0.9)]">
          <span className="block text-[9px] font-semibold normal-case leading-relaxed tracking-normal text-eid-text-secondary">
            {AMISTOSO_4H_AVISO_TEXTO}
          </span>
          <span className="mt-2 flex items-center justify-end gap-1.5">
            <button
              type="button"
              className="rounded-md border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.06em] text-eid-text-secondary"
              onClick={(e) => {
                e.stopPropagation();
                if (pendingFirstUseActivate) return;
                setShowFirstUsePrompt(false);
              }}
            >
              Não
            </button>
            <button
              type="button"
              className="inline-flex min-w-[78px] items-center justify-center gap-1 rounded-md border border-emerald-400/35 bg-emerald-500/12 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.06em] text-emerald-300"
              onClick={(e) => {
                e.stopPropagation();
                if (pendingFirstUseActivate) return;
                setPendingFirstUseActivate(true);
                marcarAmistoso4hFirstUseWarningAceito();
                setShowFirstUsePrompt(false);
                applyToggle(true);
              }}
            >
              {pendingFirstUseActivate ? <Loader2 className="h-[1em] w-[1em] animate-spin" aria-hidden /> : null}
              {pendingFirstUseActivate ? "Ligando..." : "Sim"}
            </button>
          </span>
        </span>
      ) : null}
    </button>
  );
}
