"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { gerenciarCancelamentoMatch, type GerenciarCancelamentoState } from "@/app/comunidade/actions";
import { DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";

type Item = {
  id: number;
  nomeOponente: string;
  oponenteId: string;
  esporte: string;
  modalidade: string;
  status: string;
  isRequester: boolean;
  cancelResponseDeadlineAt: string | null;
  rescheduleDeadlineAt: string | null;
  options: Array<{
    optionIdx: number;
    scheduledFor: string;
    location: string | null;
    status: string;
  }>;
};

const initial: GerenciarCancelamentoState = { ok: false, message: "" };

function when(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function AgendaAceitosCancelaveis({ items }: { items: Item[] }) {
  const [state, formAction, pending] = useActionState(gerenciarCancelamentoMatch, initial);
  const [openRefuseByMatch, setOpenRefuseByMatch] = useState<Record<number, boolean>>({});
  const err = !state.ok ? state.message : null;
  const okMsg = state.ok ? state.message : null;
  const hasSpecialStatuses = useMemo(
    () => items.some((x) => x.status !== "Aceito"),
    [items]
  );

  if (items.length === 0) return null;

  return (
    <section className="mt-6 md:mt-10">
      <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-text-secondary">Desafios aceitos</h2>
      <p className="mt-1 text-xs text-eid-text-secondary">
        {hasSpecialStatuses
          ? "Cancelamento com confirmação e reagendamento: responda dentro dos prazos para evitar cancelamento automático."
          : "Sem acordo de data? Você pode solicitar cancelamento com confirmação do oponente."}
      </p>
      <div className="mt-3 space-y-2">
        {okMsg ? (
          <p className="rounded-lg border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2 text-xs text-eid-fg">{okMsg}</p>
        ) : null}
        {err ? (
          <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{err}</p>
        ) : null}
        {items.map((m) => (
          <article
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-eid-fg">{m.nomeOponente}</p>
              <p className="text-xs text-eid-text-secondary">
                {m.esporte} · {m.modalidade}
              </p>
              {m.status === "CancelamentoPendente" ? (
                <p className="mt-1 text-[11px] text-amber-200">
                  Aguardando resposta ao cancelamento até: <span className="font-semibold">{when(m.cancelResponseDeadlineAt)}</span>
                </p>
              ) : null}
              {m.status === "ReagendamentoPendente" ? (
                <p className="mt-1 text-[11px] text-amber-200">
                  Janela de escolha até: <span className="font-semibold">{when(m.rescheduleDeadlineAt)}</span>
                </p>
              ) : null}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto">
              {m.status === "Aceito" ? (
                <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="intent" value="request_cancel" />
                  <input type="hidden" name="match_id" value={String(m.id)} />
                  <input
                    name="motivo"
                    placeholder="Motivo (opcional)"
                    className="eid-input-dark h-10 min-w-[13rem] rounded-xl px-3 text-xs text-eid-fg"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className={`${DESAFIO_FLOW_SECONDARY_CLASS} shrink-0 border-red-400/35 bg-red-500/10 text-red-200 hover:border-red-400/55 hover:bg-red-500/18 disabled:opacity-50`}
                  >
                    {pending ? "Enviando…" : "Solicitar cancelamento"}
                  </button>
                </form>
              ) : null}

              {m.status === "CancelamentoPendente" && !m.isRequester ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <form action={formAction}>
                      <input type="hidden" name="intent" value="respond_cancel" />
                      <input type="hidden" name="match_id" value={String(m.id)} />
                      <input type="hidden" name="aceitar_cancelamento" value="1" />
                      <button
                        type="submit"
                        disabled={pending}
                        className={`${DESAFIO_FLOW_SECONDARY_CLASS} border-emerald-500/35 bg-emerald-500/12 text-emerald-200 disabled:opacity-50`}
                      >
                        Aceitar cancelamento
                      </button>
                    </form>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setOpenRefuseByMatch((s) => ({ ...s, [m.id]: !s[m.id] }))}
                      className={`${DESAFIO_FLOW_SECONDARY_CLASS} border-amber-500/35 bg-amber-500/10 text-amber-100 disabled:opacity-50`}
                    >
                      Não aceitar (propor 3 horários)
                    </button>
                  </div>

                  {openRefuseByMatch[m.id] ? (
                    <form action={formAction} className="grid gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-2.5">
                      <input type="hidden" name="intent" value="respond_cancel" />
                      <input type="hidden" name="match_id" value={String(m.id)} />
                      <input type="hidden" name="aceitar_cancelamento" value="0" />
                      <input name="opcao_1" type="datetime-local" required className="eid-input-dark h-11 rounded-xl px-3 text-sm text-eid-fg" />
                      <input name="opcao_2" type="datetime-local" required className="eid-input-dark h-11 rounded-xl px-3 text-sm text-eid-fg" />
                      <input name="opcao_3" type="datetime-local" required className="eid-input-dark h-11 rounded-xl px-3 text-sm text-eid-fg" />
                      <input
                        name="local_reagendamento"
                        type="text"
                        placeholder="Local sugerido (opcional)"
                        className="eid-input-dark h-11 rounded-xl px-3 text-sm text-eid-fg"
                      />
                      <button
                        type="submit"
                        disabled={pending}
                        className={`${DESAFIO_FLOW_SECONDARY_CLASS} border-eid-primary-500/35 bg-eid-primary-500/12 text-eid-primary-200 disabled:opacity-50`}
                      >
                        Enviar 3 opções (janela 72h)
                      </button>
                    </form>
                  ) : null}

                  <form action={formAction} className="flex flex-col gap-2">
                    <input type="hidden" name="intent" value="denunciar_cancelamento" />
                    <input type="hidden" name="match_id" value={String(m.id)} />
                    <input type="hidden" name="alvo_usuario_id" value={m.oponenteId} />
                    <input
                      name="detalhe"
                      placeholder="Detalhe da tentativa indevida (opcional)"
                      className="eid-input-dark h-10 rounded-xl px-3 text-xs text-eid-fg"
                    />
                    <button
                      type="submit"
                      disabled={pending}
                      className={`${DESAFIO_FLOW_SECONDARY_CLASS} border-red-500/35 bg-red-500/10 text-red-200 disabled:opacity-50`}
                    >
                      Denunciar tentativa indevida
                    </button>
                  </form>
                </>
              ) : null}

              {m.status === "CancelamentoPendente" && m.isRequester ? (
                <p className="text-xs text-eid-text-secondary">Você solicitou o cancelamento. Aguardando resposta do oponente.</p>
              ) : null}

              {m.status === "ReagendamentoPendente" && m.isRequester ? (
                <div className="grid gap-2">
                  {m.options.map((op) => (
                    <div
                      key={`${m.id}-${op.optionIdx}`}
                      className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/70 p-2.5"
                    >
                      <p className="text-xs font-semibold text-eid-fg">
                        Opção {op.optionIdx}: {when(op.scheduledFor)}
                      </p>
                      {op.location ? <p className="text-[11px] text-eid-text-secondary">Local: {op.location}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <form action={formAction}>
                          <input type="hidden" name="intent" value="respond_option" />
                          <input type="hidden" name="match_id" value={String(m.id)} />
                          <input type="hidden" name="option_idx" value={String(op.optionIdx)} />
                          <input type="hidden" name="aceitar_opcao" value="1" />
                          <button
                            type="submit"
                            disabled={pending || op.status !== "pendente"}
                            className={`${DESAFIO_FLOW_SECONDARY_CLASS} border-emerald-500/35 bg-emerald-500/12 text-emerald-200 disabled:opacity-50`}
                          >
                            Aceitar
                          </button>
                        </form>
                        <form action={formAction}>
                          <input type="hidden" name="intent" value="respond_option" />
                          <input type="hidden" name="match_id" value={String(m.id)} />
                          <input type="hidden" name="option_idx" value={String(op.optionIdx)} />
                          <input type="hidden" name="aceitar_opcao" value="0" />
                          <button
                            type="submit"
                            disabled={pending || op.status !== "pendente"}
                            className={`${DESAFIO_FLOW_SECONDARY_CLASS} border-red-500/35 bg-red-500/10 text-red-200 disabled:opacity-50`}
                          >
                            Recusar
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {m.status === "ReagendamentoPendente" && !m.isRequester ? (
                <p className="text-xs text-eid-text-secondary">
                  Você recusou o cancelamento e sugeriu horários. Aguardando escolha do oponente.
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
