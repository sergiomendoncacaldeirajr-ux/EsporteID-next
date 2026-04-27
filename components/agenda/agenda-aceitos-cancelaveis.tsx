"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useActionState } from "react";
import { CadastrarLocalOverlayTrigger } from "@/components/locais/cadastrar-local-overlay-trigger";
import { LocalAutocompleteInput } from "@/components/locais/local-autocomplete-input";
import { gerenciarCancelamentoMatch, type GerenciarCancelamentoState } from "@/app/comunidade/actions";
import { DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";

type Item = {
  id: number;
  nomeOponente: string;
  avatarOponente: string | null;
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

function formatStatusLabel(status: string): string {
  return status
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function minDatetimeLocalNow(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function maxDatetimeLocal72h(): string {
  const dt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function addMinutesToDatetimeLocal(base: string, minutes: number): string {
  const t = new Date(base).getTime();
  if (Number.isNaN(t)) return base;
  const dt = new Date(t + minutes * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function AgendaAceitosCancelaveis({ items }: { items: Item[] }) {
  const [state, formAction, pending] = useActionState(gerenciarCancelamentoMatch, initial);
  const [openRefuseByMatch, setOpenRefuseByMatch] = useState<Record<number, boolean>>({});
  const [localPrefillByMatch, setLocalPrefillByMatch] = useState<Record<number, string>>({});
  const [datetimeValueByField, setDatetimeValueByField] = useState<Record<string, string>>({});
  const [minDateTimeLocal] = useState<string>(() => minDatetimeLocalNow());
  const [maxDateTimeLocal] = useState<string>(() => maxDatetimeLocal72h());
  const err = !state.ok ? state.message : null;
  const okMsg = state.ok ? state.message : null;
  const hasSpecialStatuses = useMemo(
    () => items.some((x) => x.status !== "Aceito"),
    [items]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const matchId = Number(params.get("reag_match") ?? "0");
    const localNome = String(params.get("novo_local_nome") ?? "").trim();
    const localizacao = String(params.get("novo_local_localizacao") ?? "").trim();
    if (!Number.isFinite(matchId) || matchId < 1) return;
    if (!localNome && !localizacao) return;
    const prefill = localizacao ? `${localNome} — ${localizacao}` : localNome;
    setOpenRefuseByMatch((prev) => ({ ...prev, [matchId]: true }));
    setLocalPrefillByMatch((prev) => ({ ...prev, [matchId]: prefill }));
    params.delete("novo_local_id");
    params.delete("novo_local_nome");
    params.delete("novo_local_localizacao");
    params.delete("reag_match");
    const nextQs = params.toString();
    const nextUrl = `${window.location.pathname}${nextQs ? `?${nextQs}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, []);

  const minMs = useMemo(() => new Date(minDateTimeLocal).getTime(), [minDateTimeLocal]);
  const maxMs = useMemo(() => new Date(maxDateTimeLocal).getTime(), [maxDateTimeLocal]);

  function clampDatetimeValue(raw: string): string {
    const t = new Date(raw).getTime();
    if (Number.isNaN(t)) return raw;
    if (t < minMs) return minDateTimeLocal;
    if (t > maxMs) return maxDateTimeLocal;
    return raw;
  }

  function handleDatetimeChange(matchId: number, optionIdx: 1 | 2 | 3, event: ChangeEvent<HTMLInputElement>) {
    const k = `${matchId}_${optionIdx}`;
    const nextRaw = String(event.target.value ?? "");
    const clamped = clampDatetimeValue(nextRaw);
    if (clamped !== nextRaw) {
      event.target.value = clamped;
      event.target.setCustomValidity("Escolha um horário entre agora e 72 horas.");
      event.target.reportValidity();
    } else {
      event.target.setCustomValidity("");
    }
    setDatetimeValueByField((prev) => ({ ...prev, [k]: clamped }));
  }

  function ensureInitialDateOptions(matchId: number) {
    const k1 = `${matchId}_1`;
    const k2 = `${matchId}_2`;
    const k3 = `${matchId}_3`;
    setDatetimeValueByField((prev) => {
      if (prev[k1] || prev[k2] || prev[k3]) return prev;
      return {
        ...prev,
        [k1]: minDateTimeLocal,
        [k2]: addMinutesToDatetimeLocal(minDateTimeLocal, 60),
        [k3]: addMinutesToDatetimeLocal(minDateTimeLocal, 120),
      };
    });
  }

  if (items.length === 0) return null;

  return (
    <section className="mt-6 md:mt-10">
      <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-text-secondary">Desafios aceitos</h2>
      <p className="mt-1 text-xs text-eid-text-secondary">
        {hasSpecialStatuses
          ? "Cancelamento com confirmação e reagendamento: responda dentro dos prazos para evitar cancelamento automático."
          : "Acompanhe o status dos desafios aceitos abaixo."}
      </p>
      <div className="mt-3 space-y-2">
        {okMsg ? (
          <p className="rounded-lg border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2 text-xs text-eid-fg">{okMsg}</p>
        ) : null}
        {err ? (
          <p className="rounded-lg border border-red-500/35 bg-red-500/12 px-3 py-2 text-xs text-[color:color-mix(in_srgb,var(--eid-danger-500)_78%,var(--eid-fg)_22%)]">
            {err}
          </p>
        ) : null}
        {items.map((m) => (
          <article
            key={m.id}
            className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-3"
          >
            <div className="flex items-center gap-2.5">
              {m.avatarOponente ? (
                <img
                  src={m.avatarOponente}
                  alt=""
                  className="h-10 w-10 rounded-full border border-[color:var(--eid-border-subtle)] object-cover"
                />
              ) : (
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-xs font-black text-eid-primary-300">
                  {m.nomeOponente.trim().slice(0, 1).toUpperCase() || "O"}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-eid-fg">{m.nomeOponente}</p>
                <p className="text-xs text-eid-text-secondary">
                  {m.esporte} · {m.modalidade}
                </p>
              </div>
              <span className="ml-auto rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
                {formatStatusLabel(m.status)}
              </span>
            </div>
            <div className="mt-2 min-w-0">
              {m.status === "CancelamentoPendente" ? (
                <p className="mt-1 text-[11px] text-[color:color-mix(in_srgb,var(--eid-warning-500)_78%,var(--eid-fg)_22%)]">
                  Aguardando resposta ao cancelamento até: <span className="font-semibold">{when(m.cancelResponseDeadlineAt)}</span>
                </p>
              ) : null}
              {m.status === "ReagendamentoPendente" ? (
                <p className="mt-1 text-[11px] text-[color:color-mix(in_srgb,var(--eid-warning-500)_78%,var(--eid-fg)_22%)]">
                  Janela de escolha até: <span className="font-semibold">{when(m.rescheduleDeadlineAt)}</span>
                </p>
              ) : null}
            </div>
            <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto">

              {m.status === "CancelamentoPendente" && !m.isRequester ? (
                <>
                  <p className="text-[10px] font-semibold text-eid-text-secondary">
                    <span className="text-eid-fg">{m.nomeOponente}</span> solicitou cancelar este desafio. Você aceita?
                  </p>
                  <div className="grid grid-cols-2 items-stretch gap-2">
                    <form action={formAction} className="flex">
                      <input type="hidden" name="intent" value="respond_cancel" />
                      <input type="hidden" name="match_id" value={String(m.id)} />
                      <input type="hidden" name="aceitar_cancelamento" value="1" />
                      <button
                        type="submit"
                        disabled={pending}
                        className="inline-flex h-5 w-full appearance-none items-center justify-center whitespace-nowrap rounded-md border border-emerald-700 bg-emerald-600 px-1 py-0 align-middle text-[6px] font-black uppercase leading-none tracking-[0.01em] text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        style={{ height: "22px", minHeight: "22px", fontSize: "9px", padding: "0 6px", lineHeight: "1" }}
                      >
                        Aceitar
                      </button>
                    </form>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setOpenRefuseByMatch((s) => {
                          const nextOpen = !s[m.id];
                          if (nextOpen) ensureInitialDateOptions(m.id);
                          return { ...s, [m.id]: nextOpen };
                        });
                      }}
                      className="inline-flex h-5 w-full appearance-none items-center justify-center whitespace-nowrap rounded-md border border-rose-700 bg-rose-600 px-1 py-0 align-middle text-[6px] font-black uppercase leading-none tracking-[0.01em] text-white transition hover:bg-rose-700 disabled:opacity-50"
                      style={{ height: "22px", minHeight: "22px", fontSize: "9px", padding: "0 6px", lineHeight: "1" }}
                    >
                      Não aceitar
                    </button>
                  </div>

                  {openRefuseByMatch[m.id] ? (
                    <form action={formAction} className="grid gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-2.5">
                      <input type="hidden" name="intent" value="respond_cancel" />
                      <input type="hidden" name="match_id" value={String(m.id)} />
                      <input type="hidden" name="aceitar_cancelamento" value="0" />
                      <input
                        name="opcao_1"
                        type="datetime-local"
                        required
                        min={minDateTimeLocal}
                        max={maxDateTimeLocal}
                        value={datetimeValueByField[`${m.id}_1`] ?? minDateTimeLocal}
                        onChange={(event) => handleDatetimeChange(m.id, 1, event)}
                        className="eid-input-dark eid-datetime-local-fix h-11 rounded-xl px-3 text-[15px] text-eid-fg placeholder:text-[15px]"
                        style={{ fontSize: "15px" }}
                      />
                      <input
                        name="opcao_2"
                        type="datetime-local"
                        required
                        min={minDateTimeLocal}
                        max={maxDateTimeLocal}
                        value={datetimeValueByField[`${m.id}_2`] ?? addMinutesToDatetimeLocal(minDateTimeLocal, 60)}
                        onChange={(event) => handleDatetimeChange(m.id, 2, event)}
                        className="eid-input-dark eid-datetime-local-fix h-11 rounded-xl px-3 text-[15px] text-eid-fg placeholder:text-[15px]"
                        style={{ fontSize: "15px" }}
                      />
                      <input
                        name="opcao_3"
                        type="datetime-local"
                        required
                        min={minDateTimeLocal}
                        max={maxDateTimeLocal}
                        value={datetimeValueByField[`${m.id}_3`] ?? addMinutesToDatetimeLocal(minDateTimeLocal, 120)}
                        onChange={(event) => handleDatetimeChange(m.id, 3, event)}
                        className="eid-input-dark eid-datetime-local-fix h-11 rounded-xl px-3 text-[15px] text-eid-fg placeholder:text-[15px]"
                        style={{ fontSize: "15px" }}
                      />
                      <LocalAutocompleteInput
                        name="local_reagendamento"
                        placeholder="Local sugerido (opcional)"
                        defaultValue={localPrefillByMatch[m.id] ?? ""}
                        minChars={3}
                        className="eid-input-dark h-11 rounded-xl px-3 text-[15px] text-eid-fg placeholder:text-[15px]"
                      />
                      <CadastrarLocalOverlayTrigger
                        href={`/locais/cadastrar?return_to=${encodeURIComponent(`/agenda?reag_match=${m.id}`)}`}
                        className={`${DESAFIO_FLOW_SECONDARY_CLASS} w-full text-center !min-h-[28px] !px-2 !text-[8px]`}
                      >
                        + Cadastrar local genérico
                      </CadastrarLocalOverlayTrigger>
                      <button
                        type="submit"
                        disabled={pending}
                        className={`${DESAFIO_FLOW_SECONDARY_CLASS} !min-h-[28px] !px-2 !text-[8px] border-eid-primary-500/35 bg-eid-primary-500/12 text-eid-primary-200 disabled:opacity-50`}
                      >
                        Enviar 3 opções (janela 72h)
                      </button>
                    </form>
                  ) : null}

                  <form action={formAction} className="flex">
                    <input type="hidden" name="intent" value="denunciar_cancelamento" />
                    <input type="hidden" name="match_id" value={String(m.id)} />
                    <input type="hidden" name="alvo_usuario_id" value={m.oponenteId} />
                    <button
                      type="submit"
                      disabled={pending}
                      className={`${DESAFIO_FLOW_SECONDARY_CLASS} w-full border-red-700 bg-red-700/20 text-red-100 hover:bg-red-700/30 disabled:opacity-50`}
                    >
                      <span aria-hidden>🚩</span>
                      <span>Denunciar tentativa indevida</span>
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
