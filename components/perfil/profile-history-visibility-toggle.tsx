"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { setViewerHistoricoPublicoAction } from "@/app/perfil/actions";

type Props = {
  userId: string;
  initialOn: boolean;
  canToggle: boolean;
};

export function ProfileHistoryVisibilityToggle({ userId, initialOn, canToggle }: Props) {
  const [on, setOn] = useState(initialOn);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setOn(initialOn);
  }, [initialOn]);

  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel(`perfil-historico-publico-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { mostrar_historico_publico?: boolean | null };
          setOn(row.mostrar_historico_publico !== false);
        }
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [userId]);

  function toggle() {
    if (!canToggle || pending) return;
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const res = await setViewerHistoricoPublicoAction(next);
      if (!res.ok) setOn(!next);
    });
  }

  const tone = on
    ? "border-[color:color-mix(in_srgb,var(--eid-success-500)_44%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-success-500)_14%,transparent)] text-[color:color-mix(in_srgb,var(--eid-success-400)_82%,var(--eid-fg)_18%)]"
    : "border-[color:color-mix(in_srgb,var(--eid-danger-500)_44%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-danger-500)_14%,transparent)] text-[color:color-mix(in_srgb,var(--eid-danger-400)_82%,var(--eid-fg)_18%)]";

  const dotTone = on ? "bg-eid-success-500" : "bg-eid-danger-500";

  if (!canToggle) {
    return (
      <span className={`inline-flex min-h-[22px] items-center gap-1 rounded-full border px-2 py-px text-[10px] font-semibold ${tone}`}>
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
      aria-label={`Histórico público ${on ? "ligado" : "desligado"}`}
      title="Alternar visibilidade pública do histórico"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotTone}`} />
      {on ? "ON" : "OFF"}
    </button>
  );
}

