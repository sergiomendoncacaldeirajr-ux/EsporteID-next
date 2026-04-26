"use client";

import { Handshake } from "lucide-react";
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

  function toggle(next: boolean) {
    if (next && !amistoso4hFirstUseWarningJaAceito()) {
      const ok = window.confirm(`${AMISTOSO_4H_AVISO_TEXTO}\n\nLigar o modo amistoso agora?`);
      if (!ok) return;
      marcarAmistoso4hFirstUseWarningAceito();
    }
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
    });
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
      disabled={pending}
      onClick={() => toggle(!effectiveOn)}
      title={titleHint}
      aria-pressed={effectiveOn}
      aria-label={
        effectiveOn ? "Modo amistoso ativado. Toque para desligar." : "Modo amistoso desligado. Toque para ativar."
      }
      className={`inline-flex max-w-[min(100%,11.5rem)] touch-manipulation items-center gap-1 rounded-lg border px-1.5 py-1 text-left text-[6px] font-black uppercase leading-tight tracking-[0.05em] transition active:scale-[0.99] disabled:opacity-50 sm:max-w-[13.5rem] sm:gap-1.5 sm:px-2 sm:py-1.5 sm:text-[7px] sm:tracking-[0.06em] dark:border-2 ${
        effectiveOn
          ? "border-emerald-700/80 bg-emerald-200 text-emerald-950 shadow-[0_1px_2px_rgba(6,95,70,0.2)] ring-1 ring-emerald-700/25 hover:border-emerald-800 hover:bg-emerald-300 dark:border-emerald-400/65 dark:bg-emerald-950/55 dark:text-emerald-100 dark:shadow-[0_2px_8px_-4px_rgba(15,23,42,0.35)] dark:ring-1 dark:ring-emerald-400/20 dark:hover:bg-emerald-900/50"
          : "border-rose-700/75 bg-rose-200 text-rose-950 shadow-[0_1px_2px_rgba(190,18,60,0.18)] ring-1 ring-rose-700/20 hover:border-rose-800 hover:bg-rose-300 dark:border-red-400/55 dark:bg-red-950/45 dark:text-red-100 dark:shadow-[0_2px_8px_-4px_rgba(15,23,42,0.35)] dark:ring-1 dark:ring-red-400/15 dark:hover:bg-red-950/70"
      } ${className ?? ""}`}
    >
      <Handshake
        className={`h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5 ${effectiveOn ? "text-emerald-900 dark:text-emerald-300" : "text-rose-900 dark:text-red-300"}`}
        strokeWidth={2.35}
        aria-hidden
      />
      <span className="min-w-0 flex-1 text-balance">
        {pending ? (
          <span className="whitespace-nowrap">Aguarde…</span>
        ) : effectiveOn ? (
          <>
            Modo amistoso
            <span className="block text-[1.05em] sm:inline sm:pl-0.5">ativado</span>
          </>
        ) : (
          <>
            Modo amistoso
            <span className="block text-[1.05em] sm:inline sm:pl-0.5">desligado</span>
          </>
        )}
      </span>
    </button>
  );
}
