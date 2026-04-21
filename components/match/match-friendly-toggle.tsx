"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { setViewerDisponivelAmistoso } from "@/app/match/actions";

type Props = {
  initialOn: boolean;
  userId: string;
};

/** Modo amistoso: ON = disponível agora (verde), OFF = indisponível (vermelho). Sincroniza com Realtime no próprio perfil. */
export function MatchFriendlyToggle({ initialOn, userId }: Props) {
  const [on, setOn] = useState(initialOn);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setOn(initialOn);
  }, [initialOn]);

  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel(`match-profile-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { disponivel_amistoso?: boolean };
          if (typeof row.disponivel_amistoso === "boolean") {
            setOn(row.disponivel_amistoso);
          }
        }
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [userId]);

  function toggle(next: boolean) {
    setOn(next);
    startTransition(async () => {
      const res = await setViewerDisponivelAmistoso(next);
      if (!res.ok) {
        setOn(!next);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-eid-primary-300">Modo amistoso</p>
        <p className="text-[10px] text-eid-text-secondary">Mostre que aceita jogos casuais agora</p>
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
