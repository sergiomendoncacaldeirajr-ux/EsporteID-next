"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { CadastrarLocalOverlayTrigger } from "@/components/locais/cadastrar-local-overlay-trigger";
import { LocalAutocompleteInput } from "@/components/locais/local-autocomplete-input";
import { gerenciarCancelamentoMatch, type GerenciarCancelamentoState } from "@/app/comunidade/actions";
import { DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import { EidAcceptedBadge } from "@/components/ui/eid-accepted-badge";
import { EidCityState } from "@/components/ui/eid-city-state";
import { EidSocialAceitarButton, EidSocialRecusarButton } from "@/components/ui/eid-social-acao-buttons";
import { iniciaisFormacaoNome } from "@/lib/comunidade/iniciais-formacao";
import { EidDateTimePicker } from "@/components/agenda/eid-date-time-picker";
import {
  CONFRONTO_AGENDAMENTO_JANELA_HORAS,
  maxDatetimeLocalValueHorasAFrente,
  minDatetimeLocalValue,
} from "@/lib/agenda/confronto-agendamento-janela";

export type AceitosCancelaveisItem = {
  id: number;
  nomeOponente: string;
  avatarOponente: string | null;
  /** Logo de time/dupla (bordas arredondadas), senão avatar de perfil (circular). */
  oponenteAvatarEhTime?: boolean;
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
  /** Membro do elenco (não líder): vê status, sem ações de cancelamento/reagendamento. */
  gestaoSomenteLeitura?: boolean;
  /**
   * Link wa.me pré-computado para o contato relevante:
   * - individual → WhatsApp do oponente
   * - líder de time/dupla → WhatsApp do líder adversário
   * - membro de time/dupla → WhatsApp do líder do SEU time (nunca do adversário)
   */
  whatsappContato?: string | null;
  /** Primeiro nome do contato para exibir no botão. */
  whatsappContatoNome?: string | null;
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

function addMinutesToDatetimeLocal(base: string, minutes: number): string {
  const t = new Date(base).getTime();
  if (Number.isNaN(t)) return base;
  const dt = new Date(t + minutes * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

type Props = {
  items: AceitosCancelaveisItem[];
  /** Na Agenda: só status e prazos; ações ficam no Painel social (Comunidade). */
  somenteInformativo?: boolean;
  /** Base para `return_to` ao cadastrar local no fluxo de recusar cancelamento (ex.: `/comunidade`). */
  cadastrarLocalReturnBase?: string;
};

export function AgendaAceitosCancelaveis({
  items,
  somenteInformativo = false,
  cadastrarLocalReturnBase = "/agenda",
}: Props) {
  const [state, formAction, pending] = useActionState(gerenciarCancelamentoMatch, initial);
  const [openRefuseByMatch, setOpenRefuseByMatch] = useState<Record<number, boolean>>({});
  const [clickedAction, setClickedAction] = useState<Record<number, "acceptCancel" | "rejectCancel" | "acceptOption" | "rejectOption">>({});
  const [localPrefillByMatch, setLocalPrefillByMatch] = useState<Record<number, string>>({});
  const [minDateTimeLocal] = useState<string>(() => minDatetimeLocalValue());
  const [maxDateTimeLocal] = useState<string>(() =>
    maxDatetimeLocalValueHorasAFrente(CONFRONTO_AGENDAMENTO_JANELA_HORAS)
  );
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

  // Default option times: now, now+60min, now+120min
  // Used as defaultValue for EidDateTimePicker instances
  const defaultOption2 = addMinutesToDatetimeLocal(minDateTimeLocal, 60);
  const defaultOption3 = addMinutesToDatetimeLocal(minDateTimeLocal, 120);

  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-[rgba(37,99,235,0.16)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-primary-500)_3%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] shadow-[0_4px_16px_-8px_rgba(15,23,42,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between border-b border-[rgba(37,99,235,0.12)] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--eid-primary-500)_9%,var(--eid-surface)),color-mix(in_srgb,var(--eid-primary-500)_4%,var(--eid-surface)))] px-3 py-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-primary-200">Desafios aceitos</h2>
        <span className="inline-flex items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300 shadow-[0_0_8px_-3px_rgba(37,99,235,0.25)]">
          {somenteInformativo ? "Status" : "Gestão social"}
        </span>
      </div>
      <p className="px-3 pt-2 text-[11px] text-eid-text-secondary md:text-xs">
        {somenteInformativo ? (
          <>
            Aqui é só referência do status do ranking. Cancelamento e reagendamento de desafio tratamos no{" "}
            <Link href="/comunidade#desafios-aceitos-gestao" className="font-bold text-eid-primary-300 hover:underline">
              Painel social
            </Link>
            .
          </>
        ) : hasSpecialStatuses ? (
          "Se pedirem cancelamento ou nova data, responda no prazo."
        ) : (
          "Acompanhe o status dos desafios aceitos abaixo."
        )}
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
            className="rounded-2xl border border-[rgba(37,99,235,0.08)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-primary-500)_3%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] px-2.5 py-2.5 shadow-[0_2px_10px_-6px_rgba(15,23,42,0.25),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm md:px-3 md:py-3"
          >
            <div className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-stretch gap-2 md:grid-cols-[40px_minmax(0,1fr)_auto]">
              <div className="flex w-[40px] shrink-0 flex-col items-center">
                {m.avatarOponente ? (
                  <img
                    src={m.avatarOponente}
                    alt=""
                    className={
                      m.oponenteAvatarEhTime
                        ? "h-9 w-9 rounded-xl border border-[color:var(--eid-border-subtle)] object-cover md:h-10 md:w-10"
                        : "h-9 w-9 rounded-full border border-[color:var(--eid-border-subtle)] object-cover md:h-10 md:w-10"
                    }
                  />
                ) : (
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[11px] font-black text-eid-primary-300 md:h-10 md:w-10 md:text-xs ${
                      m.oponenteAvatarEhTime ? "rounded-xl" : "rounded-full"
                    }`}
                  >
                    {iniciaisFormacaoNome(m.nomeOponente).slice(0, 2) || "O"}
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
                <div className="text-[10px] md:text-[11px]">
                  <EidCityState location={m.localizacaoOponente?.trim() ? m.localizacaoOponente : null} compact align="start" />
                </div>
              </div>
              {/* 3rd column: status badge top + WhatsApp button bottom */}
              <div className="flex flex-col items-end justify-between gap-2">
                {/* Status badge — top right */}
                {String(m.status ?? "").includes("Pendente") ? (
                  <EidPendingBadge label={formatStatusLabel(m.statusLabel ?? m.status)} compact className="whitespace-nowrap md:text-[9px]" />
                ) : String(m.statusLabel ?? "")
                    .trim()
                    .toLowerCase() === "agendado" ? (
                  <span className="whitespace-nowrap rounded-full border border-sky-500/35 bg-sky-500/12 px-2 py-0.5 text-left text-[8px] font-black uppercase tracking-[0.06em] text-sky-300 md:text-[9px]">
                    Agendado
                  </span>
                ) : String(m.status ?? "").trim().toLowerCase() === "aceito" ? (
                  <EidAcceptedBadge label={formatStatusLabel(m.statusLabel ?? m.status)} compact className="whitespace-nowrap md:text-[9px]" />
                ) : (
                  <span className="whitespace-nowrap rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-0.5 text-left text-[8px] font-black uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_68%,var(--eid-primary-500)_32%)] md:text-[9px]">
                    {formatStatusLabel(m.statusLabel ?? m.status)}
                  </span>
                )}

                {/* WhatsApp button — bottom right, solid fill so it reads as action, not badge */}
                {m.whatsappContato ? (
                  <a
                    href={m.whatsappContato}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Chamar ${m.whatsappContatoNome ? m.whatsappContatoNome.split(" ")[0] : "no WhatsApp"} no WhatsApp`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-2.5 py-[3px] text-[9px] font-black text-white shadow-[0_2px_10px_-3px_rgba(37,211,102,0.55)] transition hover:bg-[#1fbb5a] active:scale-[0.97] md:py-1 md:text-[10px]"
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="currentColor" aria-hidden>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    <span>
                      {m.whatsappContatoNome
                        ? m.whatsappContatoNome.split(" ")[0]
                        : "WhatsApp"}
                    </span>
                  </a>
                ) : null}
              </div>
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
              {somenteInformativo ? (
                <p className="rounded-lg border border-[rgba(37,99,235,0.1)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_5%,var(--eid-surface)),var(--eid-surface))] px-2 py-1.5 text-[10px] leading-snug text-eid-text-secondary md:text-[11px]">
                  Alterações de desafio (cancelar, aceitar cancelamento, opções de data):{" "}
                  <Link href="/comunidade#desafios-aceitos-gestao" className="font-semibold text-eid-primary-300 hover:underline">
                    abrir na Comunidade
                  </Link>
                  .
                </p>
              ) : null}

              {!somenteInformativo && m.gestaoSomenteLeitura && m.status === "Aceito" ? (
                <p className="rounded-lg border border-[rgba(37,99,235,0.1)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_5%,var(--eid-surface)),var(--eid-surface))] px-2 py-1.5 text-[10px] leading-snug text-eid-text-secondary md:text-[11px]">
                  Você integra o elenco: acompanhe o status aqui. <span className="font-semibold text-eid-fg">Só o líder</span>{" "}
                  combina data/local e lança o resultado no Painel.
                </p>
              ) : null}

              {!somenteInformativo && m.gestaoSomenteLeitura && (m.status === "CancelamentoPendente" || m.status === "ReagendamentoPendente") ? (
                <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-[10px] font-semibold leading-snug text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#f59e0b_45%)] md:text-[11px]">
                  {m.status === "CancelamentoPendente" ? (
                    <>
                      Pedido de cancelamento em andamento. <span className="text-eid-fg">Só o líder</span> da sua formação
                      pode aceitar ou recusar com opções de data. Você acompanha o status aqui e nas notificações.
                    </>
                  ) : (
                    <>
                      Reagendamento em andamento. <span className="text-eid-fg">Só o líder</span> da formação pode concluir
                      as etapas. Acompanhe aqui e nas notificações.
                    </>
                  )}
                </p>
              ) : null}

              {!somenteInformativo && m.status === "CancelamentoPendente" && !m.isRequester && !m.gestaoSomenteLeitura ? (
                <>
                  <p className="text-[9px] font-semibold text-eid-text-secondary md:text-[10px]">
                    <span className="text-eid-fg">{m.nomeOponente}</span> solicitou cancelar este desafio. Você aceita?
                  </p>
                  <div className="grid grid-cols-2 items-stretch gap-2">
                    <form action={formAction} className="flex min-w-0">
                      <input type="hidden" name="intent" value="respond_cancel" />
                      <input type="hidden" name="match_id" value={String(m.id)} />
                      <input type="hidden" name="aceitar_cancelamento" value="1" />
                      <EidSocialAceitarButton
                        pending={pending}
                        busy={pending && clickedAction[m.id] === "acceptCancel"}
                        actionLabel="aprovar"
                        onClick={() => setClickedAction((prev) => ({ ...prev, [m.id]: "acceptCancel" }))}
                        className="min-h-[28px] rounded-xl text-[8px] md:text-[9px]"
                      />
                    </form>
                    <EidSocialRecusarButton
                      type="button"
                      pending={pending}
                      busy={false}
                      onClick={() => {
                        setClickedAction((prev) => ({ ...prev, [m.id]: "rejectCancel" }));
                        setOpenRefuseByMatch((s) => ({ ...s, [m.id]: !s[m.id] }));
                      }}
                      className="min-h-[28px] rounded-xl text-[8px] md:text-[9px]"
                    />
                  </div>

                  {openRefuseByMatch[m.id] ? (
                    <form
                      action={formAction}
                      className="grid gap-2 rounded-xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_30%,var(--eid-border-subtle)_70%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_6%,var(--eid-card)_94%)] p-2.5"
                    >
                      <input type="hidden" name="intent" value="respond_cancel" />
                      <input type="hidden" name="match_id" value={String(m.id)} />
                      <input type="hidden" name="aceitar_cancelamento" value="0" />
                      <p className="text-[9px] font-bold uppercase tracking-[0.07em] text-eid-text-secondary">
                        Sugira 3 horários alternativos
                      </p>
                      <EidDateTimePicker
                        name="opcao_1"
                        defaultValue={minDateTimeLocal}
                        min={minDateTimeLocal}
                        max={maxDateTimeLocal}
                        required
                        optionNumber={1}
                      />
                      <EidDateTimePicker
                        name="opcao_2"
                        defaultValue={defaultOption2}
                        min={minDateTimeLocal}
                        max={maxDateTimeLocal}
                        required
                        optionNumber={2}
                      />
                      <EidDateTimePicker
                        name="opcao_3"
                        defaultValue={defaultOption3}
                        min={minDateTimeLocal}
                        max={maxDateTimeLocal}
                        required
                        optionNumber={3}
                      />
                      <LocalAutocompleteInput
                        name="local_reagendamento"
                        placeholder="Local sugerido (opcional)"
                        defaultValue={localPrefillByMatch[m.id] ?? ""}
                        minChars={3}
                        className="eid-input-dark h-11 rounded-xl px-3 text-[15px] text-eid-fg placeholder:text-[15px]"
                      />
                      <CadastrarLocalOverlayTrigger
                        href={`/locais/cadastrar?return_to=${encodeURIComponent(`${cadastrarLocalReturnBase}?reag_match=${m.id}${cadastrarLocalReturnBase.startsWith("/comunidade") ? "#desafios-aceitos-gestao" : ""}`)}`}
                        className={`${DESAFIO_FLOW_SECONDARY_CLASS} w-full rounded-xl text-center !min-h-[32px] !px-2 !text-[9px]`}
                      >
                        + Cadastrar local genérico
                      </CadastrarLocalOverlayTrigger>
                      <button
                        type="submit"
                        disabled={pending}
                        className="inline-flex min-h-[34px] w-full items-center justify-center rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/15 px-3 text-[9px] font-black uppercase tracking-wide text-[color:color-mix(in_srgb,var(--eid-fg)_68%,var(--eid-primary-500)_32%)] shadow-[0_4px_14px_-6px_rgba(37,99,235,0.25)] transition hover:bg-eid-primary-500/22 disabled:opacity-50 md:text-[10px]"
                      >
                        Enviar 3 opções (janela {CONFRONTO_AGENDAMENTO_JANELA_HORAS}h)
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

              {!somenteInformativo && m.status === "CancelamentoPendente" && m.isRequester && !m.gestaoSomenteLeitura ? (
                <p className="text-[11px] text-eid-text-secondary md:text-xs">Você solicitou o cancelamento. Aguardando resposta do oponente.</p>
              ) : null}

              {!somenteInformativo && m.status === "ReagendamentoPendente" && m.isRequester && !m.gestaoSomenteLeitura ? (
                <div className="grid gap-2">
                  {m.options.map((op) => (
                    <div
                      key={`${m.id}-${op.optionIdx}`}
                    className="rounded-xl border border-[rgba(37,99,235,0.12)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_7%,var(--eid-surface)),var(--eid-surface))] p-2 md:p-2.5"
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
                          <EidSocialAceitarButton
                            pending={pending || op.status !== "pendente"}
                            busy={pending && clickedAction[m.id] === "acceptOption"}
                            actionLabel="aprovar"
                            onClick={() => setClickedAction((prev) => ({ ...prev, [m.id]: "acceptOption" }))}
                            className="min-h-[28px] rounded-xl text-[8px] sm:min-w-[7rem] sm:text-[9px]"
                          />
                        </form>
                        <form action={formAction} className="min-w-0 flex-1 sm:flex-none">
                          <input type="hidden" name="intent" value="respond_option" />
                          <input type="hidden" name="match_id" value={String(m.id)} />
                          <input type="hidden" name="option_idx" value={String(op.optionIdx)} />
                          <input type="hidden" name="aceitar_opcao" value="0" />
                          <EidSocialRecusarButton
                            pending={pending || op.status !== "pendente"}
                            busy={pending && clickedAction[m.id] === "rejectOption"}
                            onClick={() => setClickedAction((prev) => ({ ...prev, [m.id]: "rejectOption" }))}
                            className="min-h-[28px] rounded-xl text-[8px] sm:min-w-[7rem] sm:text-[9px]"
                          />
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {!somenteInformativo && m.status === "ReagendamentoPendente" && !m.isRequester && !m.gestaoSomenteLeitura ? (
                <p className="text-[11px] text-eid-text-secondary md:text-xs">
                  Você recusou o cancelamento e sugeriu horários. Aguardando escolha do oponente.
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
