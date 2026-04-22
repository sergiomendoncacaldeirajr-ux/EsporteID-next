"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { setViewerDisponivelAmistoso } from "@/app/match/actions";
import { AMISTOSO_DURACAO_MS, computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";

type Props = {
  initialOn: boolean;
  initialExpiresAt: string | null;
  userId: string;
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

/** Modo amistoso: liga por até 4 h; desliga sozinho se não renovar. */
export function MatchFriendlyToggle({ initialOn, initialExpiresAt, userId }: Props) {
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

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-eid-primary-300">Modo amistoso</p>
        <p className="text-[10px] text-eid-text-secondary">
          {on && expiresAt
            ? `Desliga sozinho ${formatoRestante(restanteMs)}. Você pode desligar antes.`
            : "Ligue quando quiser jogos casuais; fica até 4 horas ou até você desligar."}
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => toggle(!on)}
        className={`relative flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-[11px] font-bold uppercase tracking-wide transition ${
          on
            ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/50"
            : "bg-red-500/15 text-red-300 ring-1 ring-red-400/40"
        } ${pending ? "opacity-70" : ""}`}
        aria-pressed={on}
      >
        <span className={`h-2 w-2 rounded-full ${on ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" : "bg-red-400"}`} />
        {on ? "Disponível" : "Indisponível"}
      </button>
    </div>
  );
}
