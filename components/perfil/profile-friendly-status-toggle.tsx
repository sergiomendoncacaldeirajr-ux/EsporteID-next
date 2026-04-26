"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { setViewerDisponivelAmistoso } from "@/app/match/actions";
import {
  AMISTOSO_4H_AVISO_TEXTO,
  amistoso4hFirstUseWarningJaAceito,
  marcarAmistoso4hFirstUseWarningAceito,
} from "@/lib/perfil/amistoso-4h-first-warning";
import { AMISTOSO_DURACAO_MS, computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";

type Props = {
  userId: string;
  initialOn: boolean;
  initialExpiresAt: string | null;
  canToggle: boolean;
};

export function ProfileFriendlyStatusToggle({ userId, initialOn, initialExpiresAt, canToggle }: Props) {
  const [on, setOn] = useState(initialOn);
  const [expiresAt, setExpiresAt] = useState<string | null>(initialExpiresAt);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel(`perfil-amistoso-${userId}`)
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

  function toggle() {
    if (!canToggle || pending) return;
    const next = !on;
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

  const tone = effectiveOn
    ? "border-[color:color-mix(in_srgb,var(--eid-success-500)_44%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-success-500)_14%,transparent)] text-[color:color-mix(in_srgb,var(--eid-success-400)_82%,var(--eid-fg)_18%)]"
    : "border-[color:color-mix(in_srgb,var(--eid-danger-500)_44%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-danger-500)_14%,transparent)] text-[color:color-mix(in_srgb,var(--eid-danger-400)_82%,var(--eid-fg)_18%)]";

  const dotTone = effectiveOn ? "bg-eid-success-500" : "bg-eid-danger-500";

  const titleExtra =
    effectiveOn && effectiveExpiresAt
      ? ` · até ${new Date(effectiveExpiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
      : "";

  if (!canToggle) {
    return (
      <span
        className={`inline-flex min-h-[22px] items-center gap-1 rounded-full border px-2 py-px text-[10px] font-semibold ${tone}`}
        title={
          effectiveOn && effectiveExpiresAt
            ? `Expira às ${new Date(effectiveExpiresAt).toLocaleString("pt-BR")}`
            : undefined
        }
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dotTone}`} />
        {effectiveOn ? "ON" : "OFF"}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`inline-flex min-h-[22px] items-center gap-1 rounded-full border px-2 py-px text-[10px] font-semibold transition-all duration-200 ${tone} ${pending ? "opacity-70" : ""}`}
      aria-pressed={effectiveOn}
      aria-label={`Amistoso ${effectiveOn ? "ligado" : "desligado"}${titleExtra}`}
      title={`Alternar disponibilidade para amistoso (até 4 h ligado)${titleExtra}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotTone}`} />
      {effectiveOn ? "ON" : "OFF"}
    </button>
  );
}
