"use client";

import { useEffect, useState } from "react";

function storageKey(timeId: number) {
  return `eid_dismiss_formacao_cidade_aviso_${timeId}`;
}

/** Aviso sobre cidade fixa da formação — só para o líder; some ao tocar (persistido no dispositivo). */
export function FormacaoCidadeAvisoLider({ timeId }: { timeId: number }) {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(typeof window !== "undefined" && localStorage.getItem(storageKey(timeId)) === "1");
    } catch {
      setHidden(false);
    }
    setReady(true);
  }, [timeId]);

  if (!ready || hidden) return null;

  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.setItem(storageKey(timeId), "1");
        } catch {
          /* ignore */
        }
        setHidden(true);
      }}
      className="mt-1 w-full rounded-lg border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_72%,var(--eid-action-500)_28%)] bg-[color:color-mix(in_srgb,var(--eid-card)_92%,var(--eid-action-500)_8%)] px-2.5 py-2 text-left text-[10px] leading-relaxed text-eid-fg transition hover:bg-[color:color-mix(in_srgb,var(--eid-surface)_88%,var(--eid-action-500)_12%)]"
    >
      <span className="font-semibold text-eid-fg">Cidade da formação</span> é definida na criação e{" "}
      <strong className="text-eid-fg">não pode ser alterada</strong>. Para mudar de cidade no radar, crie uma nova equipe/dupla em Times.
      <span className="mt-1 block text-[9px] font-medium text-eid-text-secondary">Toque para ocultar</span>
    </button>
  );
}
