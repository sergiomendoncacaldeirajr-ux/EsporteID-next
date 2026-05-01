"use client";

import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  formationName: string;
  /** “equipe” | “dupla” — ajusta o texto. */
  formacaoTipo?: "time" | "dupla";
  actions: ReactNode;
};

export function SairDaEquipeConfirmPanel({ formationName, formacaoTipo = "time", actions }: Props) {
  const label = formacaoTipo === "dupla" ? "dupla" : "equipe";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-red-500/35 bg-[color:color-mix(in_srgb,var(--eid-card)_88%,var(--eid-danger-500)_12%)] shadow-[0_10px_32px_-14px_color-mix(in_srgb,var(--eid-danger-500)_45%,transparent)] eid-light:border-red-200/90 eid-light:bg-gradient-to-br eid-light:from-white eid-light:to-red-50/90"
      role="region"
      aria-labelledby="eid-sair-equipe-title"
      aria-describedby="eid-sair-equipe-desc"
    >
      <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-red-500/12 blur-2xl eid-light:bg-red-200/40" aria-hidden />
      <div className="relative p-4 sm:p-5">
        <div className="flex gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/35 bg-red-500/12 text-red-300 eid-light:border-red-200 eid-light:bg-red-100/90 eid-light:text-red-700">
            <LogOut className="h-5 w-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-red-400 eid-light:text-red-700">
              Sair da formação
            </p>
            <h3
              id="eid-sair-equipe-title"
              className="mt-1 text-[15px] font-bold leading-snug tracking-tight text-eid-fg sm:text-base"
            >
              Sair de <span className="text-red-300 eid-light:text-red-800">{formationName}</span>?
            </h3>
            <p id="eid-sair-equipe-desc" className="mt-2 text-[12px] leading-relaxed text-eid-text-secondary">
              Você deixa de aparecer no elenco como membro ativo. A {label}, a liderança e o histórico da formação permanecem
              no EsporteID — só a sua participação como membro é encerrada.
            </p>
          </div>
        </div>
        <div className="mt-4 flex w-full flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">{actions}</div>
      </div>
    </div>
  );
}
