"use client";

import { Headset, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { submitSupportChamado, type SupportChamadoSubmitState } from "@/app/support/actions";
import { SUPPORT_CHAMADO_AREAS, SUPPORT_FAQ_ITEMS } from "@/lib/support/support-areas";

const initialSubmit: SupportChamadoSubmitState = { ok: false, message: "" };

function pathOcultaSuporte(pathname: string): boolean {
  const p = pathname || "";
  return p.startsWith("/admin") || p.startsWith("/api/");
}

export function SupportCenterFloat() {
  const pathname = usePathname() ?? "";
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<"ajuda" | "chamado">("ajuda");
  const [faqAberto, setFaqAberto] = useState<number | null>(0);
  const [formKey, setFormKey] = useState(0);

  const [submitState, formAction, submitPending] = useActionState(submitSupportChamado, initialSubmit);

  useEffect(() => {
    if (!submitState.ok || !submitState.message) return;
    setFormKey((k) => k + 1);
  }, [submitState.ok, submitState.message]);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto]);

  if (pathOcultaSuporte(pathname)) return null;

  return (
    <>
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls="eid-support-panel"
        aria-label="Abrir central de suporte"
        onClick={() => setAberto((v) => !v)}
        className="fixed bottom-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] right-3 z-[58] flex h-12 w-12 items-center justify-center rounded-full border border-eid-primary-500/50 bg-eid-primary-500/25 text-eid-fg shadow-lg shadow-black/25 backdrop-blur-sm transition hover:border-eid-primary-500/70 hover:bg-eid-primary-500/35 md:bottom-8 md:right-5 md:h-11 md:w-11"
      >
        <Headset className="h-5 w-5 md:h-[1.15rem] md:w-[1.15rem]" aria-hidden />
      </button>

      {aberto ? (
        <>
          <button
            type="button"
            aria-label="Fechar suporte"
            className="fixed inset-0 z-[56] bg-black/45 md:bg-black/35"
            onClick={() => setAberto(false)}
          />
          <div
            id="eid-support-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="eid-support-title"
            className="fixed bottom-[max(4.75rem,calc(4rem+env(safe-area-inset-bottom))] right-3 z-[57] flex max-h-[min(78vh,28rem)] w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-2xl md:bottom-24 md:right-5 md:max-h-[min(82vh,32rem)] md:w-[24rem]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-3 py-2.5">
              <h2 id="eid-support-title" className="text-sm font-bold text-eid-fg">
                Suporte EsporteID
              </h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setAberto(false)}
                className="rounded-lg p-1.5 text-eid-text-secondary hover:bg-eid-bg hover:text-eid-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex shrink-0 gap-1 border-b border-[color:var(--eid-border-subtle)] px-2 py-1.5">
              <button
                type="button"
                onClick={() => setAba("ajuda")}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
                  aba === "ajuda" ? "bg-eid-primary-500/20 text-eid-fg" : "text-eid-text-secondary hover:bg-eid-bg/80"
                }`}
              >
                Ajuda rápida
              </button>
              <button
                type="button"
                onClick={() => setAba("chamado")}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
                  aba === "chamado" ? "bg-eid-primary-500/20 text-eid-fg" : "text-eid-text-secondary hover:bg-eid-bg/80"
                }`}
              >
                Abrir chamado
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              {aba === "ajuda" ? (
                <div className="space-y-3">
                  <p className="text-[11px] leading-snug text-eid-text-secondary">
                    Veja dúvidas frequentes. Se não resolver, use a aba <strong>Abrir chamado</strong> — enviamos para a equipe com o WhatsApp do seu perfil.
                  </p>
                  <ul className="space-y-2">
                    {SUPPORT_FAQ_ITEMS.map((item, i) => {
                      const open = faqAberto === i;
                      return (
                        <li key={item.pergunta} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40">
                          <button
                            type="button"
                            className="flex w-full items-start justify-between gap-2 px-2.5 py-2 text-left text-xs font-semibold text-eid-fg"
                            aria-expanded={open}
                            onClick={() => setFaqAberto(open ? null : i)}
                          >
                            <span>{item.pergunta}</span>
                            <span className="shrink-0 text-[10px] text-eid-text-secondary">{open ? "−" : "+"}</span>
                          </button>
                          {open ? (
                            <p className="border-t border-[color:var(--eid-border-subtle)]/60 px-2.5 pb-2.5 pt-1.5 text-[11px] leading-relaxed text-eid-text-secondary">
                              {item.resposta}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setAba("chamado")}
                    className="mt-1 w-full rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/15 py-2.5 text-xs font-bold text-eid-fg"
                  >
                    Não resolveu — abrir chamado
                  </button>
                </div>
              ) : (
                <form key={formKey} action={formAction} className="space-y-3">
                  <label className="grid gap-1">
                    <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Onde ocorreu?</span>
                    <select
                      name="area"
                      required
                      className="eid-input-dark h-9 rounded-lg px-2 text-xs text-eid-fg"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Selecione a área
                      </option>
                      {SUPPORT_CHAMADO_AREAS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Descreva o problema</span>
                    <textarea
                      name="mensagem"
                      required
                      rows={4}
                      minLength={12}
                      maxLength={4000}
                      placeholder="Ex.: no ranking do tênis não atualizou após registrar o placar…"
                      className="eid-input-dark resize-none rounded-lg px-2 py-2 text-xs text-eid-fg"
                    />
                  </label>
                  <p className="text-[10px] leading-snug text-eid-text-secondary">
                    Usamos o <strong>WhatsApp cadastrado no seu perfil</strong> para retorno.{" "}
                    <Link
                      href="/conta/perfil"
                      className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline"
                      onClick={() => setAberto(false)}
                    >
                      Ajustar no perfil da conta
                    </Link>
                    .
                  </p>
                  {submitState.message ? (
                    <p
                      role="status"
                      className={`rounded-lg px-2 py-1.5 text-[11px] font-medium ${
                        submitState.ok
                          ? "border border-emerald-500/35 bg-emerald-500/10 text-emerald-100"
                          : "border border-amber-500/35 bg-amber-500/10 text-amber-100"
                      }`}
                    >
                      {submitState.message}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={submitPending}
                    className="w-full rounded-xl border border-eid-primary-500/50 bg-eid-primary-500/20 py-2.5 text-xs font-bold text-eid-fg disabled:opacity-50"
                  >
                    {submitPending ? "Enviando…" : "Enviar chamado"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
