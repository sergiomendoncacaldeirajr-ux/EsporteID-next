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
      className="mt-1 w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-left text-[10px] leading-relaxed text-amber-100/90 transition hover:bg-amber-500/18"
    >
      <span className="font-semibold text-amber-50/95">Cidade da formação</span> é definida na criação e{" "}
      <strong>não pode ser alterada</strong>. Para mudar de cidade no radar, crie uma nova equipe/dupla em Times.
      <span className="mt-1 block text-[9px] font-medium text-amber-200/70">Toque para ocultar</span>
    </button>
  );
}
