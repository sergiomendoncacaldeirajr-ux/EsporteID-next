"use client";

import { useEffect, useState, useTransition } from "react";
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
  const [tick, setTick] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setOn(initialOn);
    setExpiresAt(initialExpiresAt);
  }, [initialOn, initialExpiresAt]);

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

  const tone = on
    ? "border-[color:color-mix(in_srgb,var(--eid-success-500)_44%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-success-500)_14%,transparent)] text-[color:color-mix(in_srgb,var(--eid-success-400)_82%,var(--eid-fg)_18%)]"
    : "border-[color:color-mix(in_srgb,var(--eid-danger-500)_44%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-danger-500)_14%,transparent)] text-[color:color-mix(in_srgb,var(--eid-danger-400)_82%,var(--eid-fg)_18%)]";

  const dotTone = on ? "bg-eid-success-500" : "bg-eid-danger-500";

  const titleExtra =
    on && expiresAt
      ? ` · até ${new Date(expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
      : "";

  if (!canToggle) {
    return (
      <span
        className={`inline-flex min-h-[22px] items-center gap-1 rounded-full border px-2 py-px text-[10px] font-semibold ${tone}`}
        title={on && expiresAt ? `Expira às ${new Date(expiresAt).toLocaleString("pt-BR")}` : undefined}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dotTone}`} />
        {on ? "ON" : "OFF"}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`inline-flex min-h-[22px] items-center gap-1 rounded-full border px-2 py-px text-[10px] font-semibold transition-all duration-200 ${tone} ${pending ? "opacity-70" : ""}`}
      aria-pressed={on}
      aria-label={`Amistoso ${on ? "ligado" : "desligado"}${titleExtra}`}
      title={`Alternar disponibilidade para amistoso (até 4 h ligado)${titleExtra}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotTone}`} />
      {on ? "ON" : "OFF"}
    </button>
  );
}
