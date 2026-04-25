"use client";

import { useState } from "react";

type Props = {
  tituloBotao: string;
  titulo: string;
  linhas: Array<{ label: string; valor: string }>;
};

export function ReservaDetalhesModal({ tituloBotao, titulo, linhas }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1.5 text-[11px] font-semibold text-eid-primary-300"
      >
        {tituloBotao}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-bold text-eid-fg">{titulo}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2 py-1 text-xs font-semibold text-eid-fg"
              >
                Fechar
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {linhas.map((item) => (
                <div
                  key={`${item.label}-${item.valor}`}
                  className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-3 py-2"
                >
                  <p className="text-[11px] text-eid-text-secondary">{item.label}</p>
                  <p className="text-sm font-semibold text-eid-fg">{item.valor}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
