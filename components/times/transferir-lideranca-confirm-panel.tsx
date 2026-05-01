"use client";

import { Crown } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  novoLiderNome: string;
  novoLiderAvatarUrl?: string | null;
  formacaoTipo: "dupla" | "time";
  /** Botões: cancelar + enviar confirmação (ex.: `<form>` com submit). */
  actions: ReactNode;
};

export function TransferirLiderancaConfirmPanel({
  novoLiderNome,
  novoLiderAvatarUrl,
  formacaoTipo,
  actions,
}: Props) {
  const formacaoLabel = formacaoTipo === "dupla" ? "dupla" : "equipe";
  const clean = novoLiderNome.trim();
  const primeiroNome = clean ? (clean.split(/\s+/u)[0] ?? clean) : "Atleta";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-eid-primary-500/35 bg-[color:color-mix(in_srgb,var(--eid-card)_90%,var(--eid-primary-500)_10%)] shadow-[0_10px_32px_-14px_color-mix(in_srgb,var(--eid-primary-500)_50%,transparent)] eid-light:border-sky-200/90 eid-light:bg-gradient-to-br eid-light:from-white eid-light:to-sky-50/90"
      role="region"
      aria-labelledby="eid-transfer-lider-title"
      aria-describedby="eid-transfer-lider-desc"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-eid-primary-500/18 blur-2xl eid-light:bg-sky-300/25" aria-hidden />
      <div className="relative p-4 sm:p-5">
        <div className="flex gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/12 text-eid-primary-400 eid-light:border-sky-200 eid-light:bg-sky-100/80 eid-light:text-sky-700">
            <Crown className="h-5 w-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-eid-primary-400 eid-light:text-sky-700">
              Transferência de liderança
            </p>
            <h3
              id="eid-transfer-lider-title"
              className="mt-1 text-[15px] font-bold leading-snug tracking-tight text-eid-fg sm:text-base"
            >
              Tornar{" "}
              <span className="text-eid-primary-300 eid-light:text-sky-800">{primeiroNome}</span> o novo líder?
            </h3>
            <p id="eid-transfer-lider-desc" className="mt-2 text-[12px] leading-relaxed text-eid-text-secondary">
              Você continua na {formacaoLabel}; só a <span className="font-semibold text-eid-fg">gestão</span> (convites,
              elenco e dados da formação) passa para {primeiroNome}. Você pode receber a liderança de volta se o novo líder
              transferir de novo.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 py-2.5 eid-light:bg-white/85">
          {novoLiderAvatarUrl ? (
            <img
              src={novoLiderAvatarUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full border border-[color:var(--eid-border-subtle)] object-cover"
            />
          ) : (
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-field-bg text-sm font-black text-eid-primary-300 eid-light:bg-sky-100 eid-light:text-sky-800">
              {primeiroNome.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-eid-fg">{clean || "Atleta"}</p>
            <p className="text-[10px] text-eid-text-secondary">Passa a gerir convites e elenco desta formação</p>
          </div>
        </div>

        <div className="mt-4 flex w-full flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">{actions}</div>
      </div>
    </div>
  );
}
