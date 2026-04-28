"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useActionState } from "react";
import { CadastrarLocalOverlayTrigger } from "@/components/locais/cadastrar-local-overlay-trigger";
import { LocalAutocompleteInput } from "@/components/locais/local-autocomplete-input";
import { gerenciarCancelamentoMatch, type GerenciarCancelamentoState } from "@/app/comunidade/actions";
import { DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";

type Item = {
  id: number;
  nomeOponente: string;
  avatarOponente: string | null;
  localizacaoOponente?: string | null;
  notaEidOponente?: number | null;
  oponenteId: string;
  esporte: string;
  modalidade: string;
  status: string;
  statusLabel?: string | null;
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
      <div className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
      <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-text-secondary">Desafios aceitos</h2>
        <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
          Gestão
        </span>
      </div>
      <p className="px-3 pt-2 text-[11px] text-eid-text-secondary md:text-xs">
        {hasSpecialStatuses
          ? "Cancelamento com confirmação e reagendamento: responda dentro dos prazos para evitar cancelamento automático."
          : "Acompanhe o status dos desafios aceitos abaixo."}
      </p>
      <div className="m-2.5 space-y-1.5 md:m-3 md:space-y-2">
        {okMsg ? (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-[11px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#10b981_45%)] md:text-xs">
            {okMsg}
          </p>
        ) : null}
        {err ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center text-[11px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#f43f5e_45%)] md:text-xs">
            {err}
          </p>
        ) : null}
        {items.map((m) => (
          <article
            key={m.id}
            className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-2.5 py-2.5 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.18)] backdrop-blur-sm md:px-3 md:py-3"
          >
            <div className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2 md:grid-cols-[40px_minmax(0,1fr)_auto]">
              <div className="flex w-[40px] shrink-0 flex-col items-center">
                {m.avatarOponente ? (
                  <img
                    src={m.avatarOponente}
                    alt=""
                    className="h-9 w-9 rounded-full border border-[color:var(--eid-border-subtle)] object-cover md:h-10 md:w-10"
                  />
                ) : (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[11px] font-black text-eid-primary-300 md:h-10 md:w-10 md:text-xs">
                    {m.nomeOponente.trim().slice(0, 1).toUpperCase() || "O"}
                  </span>
                )}
                <div className="mt-1">
                  <ProfileEidPerformanceSeal notaEid={Number(m.notaEidOponente ?? 0)} compact />
                </div>
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-eid-fg md:text-sm">{m.nomeOponente}</p>
                <p className="text-[11px] text-eid-text-secondary md:text-xs">
                  <span className="inline-flex items-center gap-1">
                    <SportGlyphIcon sportName={m.esporte} />
                    <span>{m.esporte}</span>
                  </span>
                  <span className="mx-1 opacity-70">|</span>
                  <span className="inline-flex items-center gap-1">
                    <ModalidadeGlyphIcon
                      modalidade={
                        String(m.modalidade).trim().toLowerCase() === "time"
                          ? "time"
                          : String(m.modalidade).trim().toLowerCase() === "individual"
                            ? "individual"
                            : "dupla"
                      }
                    />
                    <span>{m.modalidade}</span>
                  </span>
                </p>
                <p className="text-[10px] text-eid-text-secondary md:text-[11px]">
                  {m.localizacaoOponente?.trim() ? m.localizacaoOponente : "Localização não informada"}
                </p>
              </div>
              <span className="whitespace-nowrap rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-0.5 text-left text-[8px] font-black uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_68%,var(--eid-primary-500)_32%)] md:text-[9px]">
                {formatStatusLabel(m.statusLabel ?? m.status)}
              </span>
            </div>
            <div className="mt-1.5 min-w-0 md:mt-2">
              {m.status === "CancelamentoPendente" ? (
                <p className="mt-1 text-[10px] text-[color:color-mix(in_srgb,var(--eid-warning-500)_78%,var(--eid-fg)_22%)] md:text-[11px]">
                  Aguardando resposta ao cancelamento até: <span className="font-semibold">{when(m.cancelResponseDeadlineAt)}</span>
                </p>
              ) : null}
              {m.status === "ReagendamentoPendente" ? (
                <p className="mt-1 text-[10px] text-[color:color-mix(in_srgb,var(--eid-warning-500)_78%,var(--eid-fg)_22%)] md:text-[11px]">
                  Janela de escolha até: <span className="font-semibold">{when(m.rescheduleDeadlineAt)}</span>
                </p>
              ) : null}
            </div>
            <div className="mt-1.5 flex w-full flex-col gap-1.5 sm:w-auto md:mt-2 md:gap-2">

              {m.status === "CancelamentoPendente" && !m.isRequester ? (
                <>
                  <p className="text-[9px] font-semibold text-eid-text-secondary md:text-[10px]">
                    <span className="text-eid-fg">{m.nomeOponente}</span> solicitou cancelar este desafio. Você aceita?
                  </p>
                  <div className="grid grid-cols-2 items-stretch gap-2">
                    <form action={formAction} className="flex min-w-0">
                      <input type="hidden" name="intent" value="respond_cancel" />
                      <input type="hidden" name="match_id" value={String(m.id)} />
                      <input type="hidden" name="aceitar_cancelamento" value="1" />
                      <button
                        type="submit"
                        disabled={pending}
                        className="inline-flex min-h-[34px] w-full items-center justify-center rounded-xl border border-emerald-600 bg-emerald-600 px-2 text-[9px] font-black uppercase tracking-wide text-white shadow-[0_4px_14px_-4px_rgba(16,185,129,0.35)] transition hover:bg-emerald-700 disabled:opacity-50 md:text-[10px]"
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
                      className="inline-flex min-h-[34px] w-full items-center justify-center rounded-xl border border-rose-600 bg-rose-600 px-2 text-[9px] font-black uppercase tracking-wide text-white shadow-[0_4px_14px_-4px_rgba(244,63,94,0.35)] transition hover:bg-rose-700 disabled:opacity-50 md:text-[10px]"
                    >
                      Não aceitar
                    </button>
                  </div>

                  {openRefuseByMatch[m.id] ? (
                    <form
                      action={formAction}
                      className="grid gap-1.5 rounded-xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_35%,var(--eid-border-subtle)_65%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_8%,var(--eid-card)_92%)] p-2 md:gap-2 md:p-2.5"
                    >
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
                        className={`${DESAFIO_FLOW_SECONDARY_CLASS} w-full rounded-xl text-center !min-h-[32px] !px-2 !text-[9px]`}
                      >
                        + Cadastrar local genérico
                      </CadastrarLocalOverlayTrigger>
                      <button
                        type="submit"
                        disabled={pending}
                        className="inline-flex min-h-[34px] w-full items-center justify-center rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/15 px-3 text-[9px] font-black uppercase tracking-wide text-[color:color-mix(in_srgb,var(--eid-fg)_68%,var(--eid-primary-500)_32%)] shadow-[0_4px_14px_-6px_rgba(37,99,235,0.25)] transition hover:bg-eid-primary-500/22 disabled:opacity-50 md:text-[10px]"
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
                      className={`${DESAFIO_FLOW_SECONDARY_CLASS} w-full rounded-xl !min-h-[34px] border border-red-500/35 bg-red-500/12 text-[color:color-mix(in_srgb,var(--eid-fg)_62%,#f43f5e_38%)] hover:bg-red-500/18 disabled:opacity-50`}
                    >
                      <span aria-hidden>🚩</span>
                      <span>Denunciar tentativa indevida</span>
                    </button>
                  </form>
                </>
              ) : null}

              {m.status === "CancelamentoPendente" && m.isRequester ? (
                <p className="text-[11px] text-eid-text-secondary md:text-xs">Você solicitou o cancelamento. Aguardando resposta do oponente.</p>
              ) : null}

              {m.status === "ReagendamentoPendente" && m.isRequester ? (
                <div className="grid gap-2">
                  {m.options.map((op) => (
                    <div
                      key={`${m.id}-${op.optionIdx}`}
                    className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-2 md:p-2.5"
                    >
                      <p className="text-[11px] font-semibold text-eid-fg md:text-xs">
                        Opção {op.optionIdx}: {when(op.scheduledFor)}
                      </p>
                      {op.location ? <p className="text-[10px] text-eid-text-secondary md:text-[11px]">Local: {op.location}</p> : null}
                      <div className="mt-1.5 flex flex-wrap gap-1.5 md:mt-2 md:gap-2">
                        <form action={formAction} className="min-w-0 flex-1 sm:flex-none">
                          <input type="hidden" name="intent" value="respond_option" />
                          <input type="hidden" name="match_id" value={String(m.id)} />
                          <input type="hidden" name="option_idx" value={String(op.optionIdx)} />
                          <input type="hidden" name="aceitar_opcao" value="1" />
                          <button
                            type="submit"
                            disabled={pending || op.status !== "pendente"}
                            className={`${DESAFIO_FLOW_SECONDARY_CLASS} w-full min-h-[32px] rounded-xl border-emerald-500/40 bg-emerald-500/15 text-[color:color-mix(in_srgb,var(--eid-fg)_60%,#10b981_40%)] hover:bg-emerald-500/22 disabled:opacity-50 sm:w-auto sm:min-w-[7rem]`}
                          >
                            Aceitar
                          </button>
                        </form>
                        <form action={formAction} className="min-w-0 flex-1 sm:flex-none">
                          <input type="hidden" name="intent" value="respond_option" />
                          <input type="hidden" name="match_id" value={String(m.id)} />
                          <input type="hidden" name="option_idx" value={String(op.optionIdx)} />
                          <input type="hidden" name="aceitar_opcao" value="0" />
                          <button
                            type="submit"
                            disabled={pending || op.status !== "pendente"}
                            className={`${DESAFIO_FLOW_SECONDARY_CLASS} w-full min-h-[32px] rounded-xl border-red-500/35 bg-red-500/12 text-[color:color-mix(in_srgb,var(--eid-fg)_60%,#f43f5e_40%)] hover:bg-red-500/18 disabled:opacity-50 sm:w-auto sm:min-w-[7rem]`}
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
                <p className="text-[11px] text-eid-text-secondary md:text-xs">
                  Você recusou o cancelamento e sugeriu horários. Aguardando escolha do oponente.
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      </div>
    </section>
  );
}
