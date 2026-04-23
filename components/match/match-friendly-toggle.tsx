"use client";

import { Handshake } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
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
export function MatchFriendlyToggle({ initialOn, initialExpiresAt, userId, className }: Props) {
  const [on, setOn] = useState(initialOn);
  const [expiresAt, setExpiresAt] = useState<string | null>(initialExpiresAt);
  const [tick, setTick] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setOn(initialOn);
    setExpiresAt(initialExpiresAt);
  }, [initialOn, initialExpiresAt]);

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
        }
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!on || !expiresAt) return;
    const id = window.setInterval(() => setTick((x) => x + 1), 15_000);
    return () => window.clearInterval(id);
  }, [on, expiresAt]);

  useEffect(() => {
    if (!on || !expiresAt) return;
    const end = new Date(expiresAt).getTime();
    if (Number.isNaN(end) || end <= Date.now()) {
      setOn(false);
      setExpiresAt(null);
    }
  }, [on, expiresAt, tick]);

  function toggle(next: boolean) {
    if (next && !amistoso4hFirstUseWarningJaAceito()) {
      const ok = window.confirm(`${AMISTOSO_4H_AVISO_TEXTO}\n\nLigar o modo amistoso agora?`);
      if (!ok) return;
      marcarAmistoso4hFirstUseWarningAceito();
    }
    setOn(next);
    setExpiresAt(next ? new Date(Date.now() + AMISTOSO_DURACAO_MS).toISOString() : null);
    startTransition(async () => {
      const res = await setViewerDisponivelAmistoso(next);
      if (!res.ok) {
        setOn(!next);
        setExpiresAt(null);
      }
    });
  }

  const restanteMs = on && expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0;
  const titleHint = on
    ? expiresAt
      ? `Disponível para amistoso. Desliga sozinho ${formatoRestante(restanteMs)}. Toque para desligar.`
      : "Disponível para amistoso. Toque para desligar."
    : "Indisponível. Toque para ligar (até 4 horas ou até desligar).";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => toggle(!on)}
      title={titleHint}
      aria-pressed={on}
      aria-label={on ? "Modo amistoso ligado. Toque para desligar." : "Modo amistoso desligado. Toque para ligar."}
      className={`inline-flex touch-manipulation items-center gap-0.5 rounded-md border px-1 py-0.5 text-[7px] font-bold uppercase leading-none tracking-[0.04em] shadow-[0_2px_6px_-4px_rgba(15,23,42,0.3)] transition disabled:opacity-50 sm:gap-1 sm:px-1.5 sm:text-[8px] ${
        on
          ? "border-emerald-700/40 bg-emerald-600/10 text-emerald-900 hover:bg-emerald-600/18 dark:border-emerald-400/45 dark:bg-emerald-500/15 dark:text-emerald-100 dark:hover:bg-emerald-500/22"
          : "border-[color:var(--eid-border-subtle)] bg-[color-mix(in_srgb,var(--eid-surface)_40%,transparent)] text-eid-text-secondary hover:bg-eid-surface/50 dark:hover:bg-eid-surface/35"
      } ${className ?? ""}`}
    >
      <Handshake
        className={`h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3 ${on ? "text-emerald-800 dark:text-emerald-200" : "text-eid-text-secondary opacity-90"}`}
        strokeWidth={2.25}
        aria-hidden
      />
      <span className="whitespace-nowrap">{pending ? "…" : on ? "Amistoso ON" : "Amistoso OFF"}</span>
    </button>
  );
}
