"use client";

import { useState, useActionState } from "react";
import { solicitarPropriedadeOficialLocal, type LocalActionState } from "@/app/locais/actions";
import { locaisFormPanelClass, locaisSectionTitleClass } from "@/components/locais/locais-ui-tokens";

const initialState: LocalActionState = { ok: false, message: "" };

export function LocalClaimModal({ espacoId }: { espacoId: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(solicitarPropriedadeOficialLocal, initialState);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] text-eid-text-secondary underline-offset-2 transition hover:text-eid-primary-300 hover:underline"
      >
        Sou o responsável por este local — solicitar posse
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <div
            className="absolute inset-0 bg-eid-brand-ink/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className={`relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl ${locaisFormPanelClass} !rounded-t-3xl sm:!rounded-2xl`}
          >
            {/* Handle bar (mobile) */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-eid-border-subtle sm:hidden" />

            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className={locaisSectionTitleClass}>Posse oficial</p>
                <h2 className="mt-1 text-base font-black tracking-tight text-eid-fg">
                  Solicitar vínculo com o espaço
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-eid-text-secondary">
                  Envie um comprovante. Nossa equipe analisa e valida você como responsável.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-eid-text-secondary transition hover:bg-eid-surface hover:text-eid-fg"
                aria-label="Fechar"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {state.ok ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <svg className="h-7 w-7" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.78 5.22L6.75 10.25l-2.53-2.53a.75.75 0 0 0-1.06 1.06l3.06 3.06a.75.75 0 0 0 1.06 0l5.56-5.56a.75.75 0 0 0-1.06-1.06Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-eid-fg">Solicitação enviada!</p>
                  <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">{state.message}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-1 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-5 py-2 text-xs font-bold text-eid-primary-300 transition hover:bg-eid-primary-500/18"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form action={formAction} className="grid gap-4">
                <input type="hidden" name="espaco_id" value={espacoId} />

                <div>
                  <label
                    htmlFor={`doc-${espacoId}`}
                    className="block text-[10px] font-black uppercase tracking-[0.08em] text-eid-fg/70"
                  >
                    Documento comprobatório <span className="text-eid-action-400">*</span>
                  </label>
                  <input
                    id={`doc-${espacoId}`}
                    name="documento"
                    type="file"
                    required
                    className="mt-1.5 block w-full text-xs text-eid-text-secondary file:mr-3 file:rounded-xl file:border file:border-eid-primary-500/30 file:bg-eid-primary-500/12 file:px-3 file:py-2 file:text-[11px] file:font-bold file:text-eid-primary-300 file:transition hover:file:bg-eid-primary-500/18"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`msg-${espacoId}`}
                    className="block text-[10px] font-black uppercase tracking-[0.08em] text-eid-fg/70"
                  >
                    Mensagem (opcional)
                  </label>
                  <textarea
                    id={`msg-${espacoId}`}
                    name="mensagem"
                    rows={3}
                    className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg placeholder:text-eid-text-secondary"
                    placeholder="Descreva seu vínculo com este espaço…"
                  />
                </div>

                {state.message && !state.ok ? (
                  <p className="text-xs text-red-300">{state.message}</p>
                ) : null}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-eid-border-subtle px-3 py-2.5 text-xs font-bold text-eid-text-secondary transition hover:border-eid-primary-500/30 hover:text-eid-fg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="eid-btn-primary flex-[2] min-h-[40px] rounded-xl px-4 text-xs font-black uppercase tracking-wide transition disabled:opacity-60"
                  >
                    {pending ? "Enviando…" : "Enviar solicitação"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
