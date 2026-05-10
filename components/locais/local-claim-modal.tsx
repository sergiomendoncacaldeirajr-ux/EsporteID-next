"use client";

import { useState, useActionState } from "react";
import { solicitarPropriedadeOficialLocal, type LocalActionState } from "@/app/locais/actions";
import { locaisFormPanelClass } from "@/components/locais/locais-ui-tokens";

const initialState: LocalActionState = { ok: false, message: "" };

export function LocalClaimModal({ espacoId }: { espacoId: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(solicitarPropriedadeOficialLocal, initialState);

  return (
    <>
      {/* Trigger — bordered dashed button, discreto mas presente */}
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(255,255,255,0.09)] bg-transparent px-4 py-3.5 text-[11px] font-medium text-eid-text-secondary transition hover:border-eid-primary-500/30 hover:text-eid-primary-300"
      >
        <svg className="h-4 w-4 shrink-0 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Sou o responsável por este local — solicitar posse oficial
      </button>

      {/* Modal overlay */}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#080d13]/85 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Sheet / Dialog */}
          <div className={`relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl ${locaisFormPanelClass} !p-0`}>
            {/* Mobile drag handle */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-[rgba(255,255,255,0.12)]" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.05)] px-5 pb-4 pt-4 sm:pt-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-500">
                  Posse oficial
                </p>
                <h2 className="mt-1 text-[15px] font-black tracking-tight text-eid-fg">
                  Solicitar vínculo com o espaço
                </h2>
                <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-eid-text-secondary">
                  Envie um comprovante e nossa equipe valida você como responsável oficial.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-eid-text-secondary transition hover:bg-[rgba(255,255,255,0.06)] hover:text-eid-fg"
                aria-label="Fechar"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-5 pb-5 pt-4">
              {state.ok ? (
                /* Success state */
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 shadow-[0_0_24px_-4px_rgba(16,185,129,0.2)]">
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-eid-fg">Solicitação enviada!</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">{state.message}</p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-1 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-5 py-2 text-xs font-bold text-eid-primary-300 transition hover:bg-eid-primary-500/18"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                /* Form */
                <form action={formAction} className="grid gap-4">
                  <input type="hidden" name="espaco_id" value={espacoId} />

                  <div>
                    <label
                      htmlFor={`doc-${espacoId}`}
                      className="block text-[10px] font-black uppercase tracking-[0.1em] text-eid-fg/65"
                    >
                      Documento comprobatório{" "}
                      <span className="text-eid-action-400">*</span>
                    </label>
                    <p className="mb-2 mt-0.5 text-[10px] text-eid-text-secondary">
                      Contrato de locação, alvará, nota fiscal ou foto da fachada.
                    </p>
                    <label
                      htmlFor={`doc-${espacoId}`}
                      className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-eid-primary-500/30 bg-eid-primary-500/5 px-4 py-4 text-center transition hover:border-eid-primary-500/50 hover:bg-eid-primary-500/8"
                    >
                      <svg className="h-6 w-6 text-eid-primary-400/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-[11px] font-semibold text-eid-primary-300">
                        Clique para selecionar arquivo
                      </span>
                      <span className="text-[10px] text-eid-text-secondary">PDF, JPG, PNG — até 10 MB</span>
                      <input
                        id={`doc-${espacoId}`}
                        name="documento"
                        type="file"
                        required
                        className="sr-only"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                      />
                    </label>
                  </div>

                  <div>
                    <label
                      htmlFor={`msg-${espacoId}`}
                      className="block text-[10px] font-black uppercase tracking-[0.1em] text-eid-fg/65"
                    >
                      Mensagem{" "}
                      <span className="font-normal normal-case tracking-normal text-eid-text-secondary">(opcional)</span>
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
                    <p className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-300">
                      {state.message}
                    </p>
                  ) : null}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="flex-1 rounded-xl border border-[rgba(255,255,255,0.08)] px-3 py-2.5 text-xs font-bold text-eid-text-secondary transition hover:border-[rgba(255,255,255,0.14)] hover:text-eid-fg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={pending}
                      className="flex-[2] min-h-[42px] rounded-xl bg-eid-primary-500 px-4 text-xs font-black uppercase tracking-wide text-white shadow-[0_4px_14px_-4px_rgba(37,99,235,0.5)] transition hover:bg-eid-primary-600 disabled:opacity-50"
                    >
                      {pending ? "Enviando…" : "Enviar solicitação"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
