"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  getContextHomeHref,
  type ActiveAppContext,
} from "@/lib/auth/active-context";

const LABELS: Record<ActiveAppContext, string> = {
  atleta: "Modo Atleta",
  organizador: "Modo Organizador",
};

export function ActiveContextSwitch({
  activeContext,
  availableContexts,
}: {
  activeContext: ActiveAppContext;
  availableContexts: ActiveAppContext[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticContext, setOptimisticContext] = useState<ActiveAppContext>(activeContext);

  if (availableContexts.length < 2) return null;

  function changeContext(nextContext: ActiveAppContext) {
    if (pending || nextContext === optimisticContext) return;

    setOptimisticContext(nextContext);
    startTransition(async () => {
      const response = await fetch("/api/active-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: nextContext }),
      });

      if (!response.ok) {
        setOptimisticContext(activeContext);
        router.refresh();
        return;
      }

      const payload = (await response.json().catch(() => null)) as
        | { redirectTo?: string; context?: ActiveAppContext | null }
        | null;
      const targetContext = payload?.context ?? nextContext;
      const targetHref = payload?.redirectTo ?? getContextHomeHref(targetContext);
      router.replace(targetHref);
      router.refresh();
    });
  }

  return (
    <div className="hidden items-center gap-1 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/70 p-1 lg:flex">
      {availableContexts.map((context) => {
        const active = context === optimisticContext;
        return (
          <button
            key={context}
            type="button"
            onClick={() => changeContext(context)}
            disabled={pending}
            className={`rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide transition ${
              active
                ? "bg-eid-primary-500/14 text-eid-fg ring-1 ring-eid-primary-500/35"
                : "text-eid-text-secondary hover:text-eid-fg"
            } disabled:opacity-60`}
          >
            {LABELS[context]}
          </button>
        );
      })}
    </div>
  );
}
