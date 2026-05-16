"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { CadastrarLocalOverlayTrigger } from "@/components/locais/cadastrar-local-overlay-trigger";
import { LocalAutocompleteInput } from "@/components/locais/local-autocomplete-input";
import { gerenciarCancelamentoMatch, type GerenciarCancelamentoState } from "@/app/comunidade/actions";
import { DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import { EidAcceptedBadge } from "@/components/ui/eid-accepted-badge";
import { EidCityState } from "@/components/ui/eid-city-state";
import { EidPanelHeader } from "@/components/ui/eid-panel-header";
import { EidSocialAceitarButton, EidSocialRecusarButton } from "@/components/ui/eid-social-acao-buttons";
import { iniciaisFormacaoNome } from "@/lib/comunidade/iniciais-formacao";
import { EidDateTimePicker } from "@/components/agenda/eid-date-time-picker";
import {
  maxDatetimeLocalValueHorasAFrente,
  minDatetimeLocalValue,
} from "@/lib/agenda/confronto-agendamento-janela";

export type AceitosCancelaveisItem = {
  id: number;
  nomeOponente: string;
  avatarOponente: string | null;
  /** Logo de time/dupla (bordas arredondadas), senão avatar de perfil (circular). */
  oponenteAvatarEhTime?: boolean;
  oponenteTimeId?: number | null;
  localizacaoOponente?: string | null;
  notaEidOponente?: number | null;
  oponenteId: string;
  esporteId?: number | null;
  esporte: string;
  modalidade: string;
  status: string;
  statusLabel?: string | null;
  isRequester: boolean;
  rescheduleKind?: string | null;
  rescheduleRequestedBy?: string | null;
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

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

function WhatsAppContatoButton({ href, nome }: { href: string; nome: string | null | undefined }) {
  const primeiroNome = nome ? nome.split(" ")[0] : "WhatsApp";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chamar ${primeiroNome === "WhatsApp" ? "no WhatsApp" : primeiroNome} no WhatsApp`}
      data-eid-aceitos-acao-btn="true"
      className="flex min-h-[34px] w-full items-center justify-center gap-1 rounded-[8px] bg-[#25D366] px-2 text-[8.5px] font-black uppercase tracking-[0.05em] text-white shadow-[0_4px_14px_-8px_rgba(37,211,102,0.5)] transition hover:bg-[#1fbb5a] active:scale-[0.98] active:brightness-95 sm:min-h-[36px] sm:text-[9px]"
    >
      {WA_ICON}
      <span className="truncate">WhatsApp — {primeiroNome}</span>
    </a>
  );
}

function readLocalPrefillFromUrl():
  | { matchId: number; prefill: string; nextUrl: string }
  | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const matchId = Number(params.get("reag_match") ?? "0");
  const localNome = String(params.get("novo_local_nome") ?? "").trim();
  const localizacao = String(params.get("novo_local_localizacao") ?? "").trim();
  if (!Number.isFinite(matchId) || matchId < 1) return null;
  if (!localNome && !localizacao) return null;
  const prefill = localizacao ? `${localNome} — ${localizacao}` : localNome;
  params.delete("novo_local_id");
  params.delete("novo_local_nome");
  params.delete("novo_local_localizacao");
  params.delete("reag_match");
  const nextQs = params.toString();
  const nextUrl = `${window.location.pathname}${nextQs ? `?${nextQs}` : ""}${window.location.hash}`;
  return { matchId, prefill, nextUrl };
}

type Props = {
  items: AceitosCancelaveisItem[];
  agendamentoJanelaHoras: number;
  /** Na Agenda: cancelamento e disputa ficam no Painel social; contato e reagendamento continuam disponíveis. */
  somenteInformativo?: boolean;
  /** Base para `return_to` ao cadastrar local no fluxo de recusar cancelamento (ex.: `/comunidade`). */
  cadastrarLocalReturnBase?: string;
};

export function AgendaAceitosCancelaveis({
  items,
  agendamentoJanelaHoras,
  somenteInformativo = false,
  cadastrarLocalReturnBase = "/agenda",
}: Props) {
  const [state, formAction, pending] = useActionState(gerenciarCancelamentoMatch, initial);
  const [openRefuseByMatch, setOpenRefuseByMatch] = useState<Record<number, boolean>>({});
  const [openRescheduleByMatch, setOpenRescheduleByMatch] = useState<Record<number, boolean>>({});
  const [clickedAction, setClickedAction] = useState<
    Record<number, "acceptCancel" | "rejectCancel" | "acceptOption" | "rejectOption" | "requestReschedule">
  >({});
  const [localPrefillByMatch, setLocalPrefillByMatch] = useState<Record<number, string>>({});
  const [minDateTimeLocal] = useState<string>(() => minDatetimeLocalValue());
  const [maxDateTimeLocal] = useState<string>(() =>
    maxDatetimeLocalValueHorasAFrente(agendamentoJanelaHoras)
  );
  const err = !state.ok ? state.message : null;
  const okMsg = state.ok ? state.message : null;
  const hasSpecialStatuses = useMemo(
    () => items.some((x) => x.status !== "Aceito"),
    [items]
  );

  useEffect(() => {
    const urlPrefill = readLocalPrefillFromUrl();
    if (!urlPrefill) return;
    const timer = window.setTimeout(() => {
      setOpenRefuseByMatch((prev) => ({ ...prev, [urlPrefill.matchId]: true }));
      setLocalPrefillByMatch((prev) => ({ ...prev, [urlPrefill.matchId]: urlPrefill.prefill }));
      window.history.replaceState(null, "", urlPrefill.nextUrl);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Default option times: now, now+60min, now+120min
  // Used as defaultValue for EidDateTimePicker instances
  const defaultOption2 = addMinutesToDatetimeLocal(minDateTimeLocal, 60);
  const defaultOption3 = addMinutesToDatetimeLocal(minDateTimeLocal, 120);

  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-[rgba(37,99,235,0.16)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-primary-500)_3%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] shadow-[0_4px_16px_-8px_rgba(15,23,42,0.3),inset_0_1px_0_rgba(255,255,255,0.03)]">
      <EidPanelHeader
        title="Desafios aceitos"
        badge={
          <span className="inline-flex items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300 shadow-[0_0_8px_-3px_rgba(37,99,235,0.25)]">
            {somenteInformativo ? "Status" : "Gestão social"}
          </span>
        }
        info={
          somenteInformativo ? (
            <>
              Aqui é só referência do status do ranking. Cancelamento de desafio tratamos no{" "}
              <Link href="/comunidade#desafios-aceitos-gestao" className="font-bold text-eid-primary-300 hover:underline">
                Painel social
              </Link>
              ; reagendamento pode ser pedido por aqui.
            </>
          ) : hasSpecialStatuses ? (
            "Se pedirem cancelamento ou nova data, responda no prazo."
          ) : (
            "Acompanhe o status dos desafios aceitos abaixo."
          )
        }
      />
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
        {items.map((m) => {
          const podeReagendar = m.status === "Aceito" && !m.gestaoSomenteLeitura;
          const modalidadeKey = String(m.modalidade ?? "")
            .trim()
            .toLowerCase();
          const avatarEhFormacao =
            modalidadeKey !== "individual" && Boolean(m.oponenteAvatarEhTime && Number(m.oponenteTimeId ?? 0) > 0);
          const avatarShapeClass = avatarEhFormacao ? "rounded-xl" : "rounded-full";
          const avatarFrameClass = `inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden bg-eid-surface text-sm font-black text-eid-primary-300 ${avatarShapeClass}`;
          const avatarNode = m.avatarOponente ? (
            <span className={`${avatarFrameClass} pointer-events-none relative`}>
              <Image src={m.avatarOponente} alt="" fill unoptimized className="object-cover object-center" />
            </span>
          ) : (
            <span className={`${avatarFrameClass} pointer-events-none`}>
              {iniciaisFormacaoNome(m.nomeOponente).slice(0, 2) || "O"}
            </span>
          );
          const eidHref =
            Number(m.esporteId ?? 0) > 0
              ? avatarEhFormacao
                ? `/perfil-time/${Number(m.oponenteTimeId)}/eid/${Number(m.esporteId)}?from=${encodeURIComponent("/agenda")}`
                : m.oponenteId
                  ? `/perfil/${encodeURIComponent(m.oponenteId)}/eid/${Number(m.esporteId)}?from=${encodeURIComponent("/agenda")}`
                  : null
              : null;

          return (
            <article
              key={m.id}
              className="relative rounded-2xl border border-[rgba(37,99,235,0.08)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-primary-500)_3%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] px-3 py-3 shadow-[0_2px_10px_-6px_rgba(15,23,42,0.25),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm"
            >
            {/* Status badge — absolute top-right */}
            <div className="absolute right-2.5 top-2.5">
              {String(m.status ?? "").includes("Pendente") ? (
                <EidPendingBadge label={formatStatusLabel(m.statusLabel ?? m.status)} compact className="whitespace-nowrap text-[8px]" />
              ) : String(m.statusLabel ?? "").trim().toLowerCase() === "agendado" ? (
                <span className="whitespace-nowrap rounded-full border border-sky-500/35 bg-sky-500/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-sky-300">
                  Agendado
                </span>
              ) : String(m.status ?? "").trim().toLowerCase() === "aceito" ? (
                <EidAcceptedBadge label={formatStatusLabel(m.statusLabel ?? m.status)} compact className="whitespace-nowrap text-[8px]" />
              ) : (
                <span className="whitespace-nowrap rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_68%,var(--eid-primary-500)_32%)]">
                  {formatStatusLabel(m.statusLabel ?? m.status)}
                </span>
              )}
            </div>

            {/* Main content row: large avatar left + info right */}
            <div className="flex items-start gap-3 pr-16">
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                {eidHref ? (
                  <ProfileEditDrawerTrigger
                    href={eidHref}
                    title={`Estatísticas EID de ${m.nomeOponente}`}
                    fullscreen
                    topMode="backOnly"
                    className={`block border-0 bg-transparent p-0 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-eid-primary-500 ${avatarShapeClass}`}
                  >
                    {avatarNode}
                  </ProfileEditDrawerTrigger>
                ) : (
                  avatarNode
                )}
                <ProfileEidPerformanceSeal notaEid={Number(m.notaEidOponente ?? 0)} compact />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="truncate text-[15px] font-black leading-tight text-eid-fg">{m.nomeOponente}</p>
                <p className="mt-0.5 text-[11px] text-eid-text-secondary">
                  <span className="inline-flex items-center gap-1">
                    <SportGlyphIcon sportName={m.esporte} />
                    <span>{m.esporte}</span>
                  </span>
                  <span className="mx-1 opacity-60">·</span>
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
                <div className="mt-0.5 text-[10px]">
                  <EidCityState location={m.localizacaoOponente?.trim() ? m.localizacaoOponente : null} compact align="start" />
                </div>
              </div>
            </div>

            <div className="mt-2 min-w-0">
              {m.status === "CancelamentoPendente" ? (
                <p className="text-[10px] text-[color:color-mix(in_srgb,var(--eid-warning-500)_78%,var(--eid-fg)_22%)]">
                  Aguardando resposta ao cancelamento até: <span className="font-semibold">{when(m.cancelResponseDeadlineAt)}</span>
                </p>
              ) : null}
              {m.status === "ReagendamentoPendente" ? (
                <p className="text-[10px] text-[color:color-mix(in_srgb,var(--eid-warning-500)_78%,var(--eid-fg)_22%)]">
                  Janela de escolha até: <span className="font-semibold">{when(m.rescheduleDeadlineAt)}</span>
                </p>
              ) : null}
            </div>

            <div className="mt-3 flex w-full flex-col gap-2.5 border-t border-[rgba(37,99,235,0.1)] pt-3">
              {!somenteInformativo && m.gestaoSomenteLeitura && m.status === "Aceito" ? (
                <p className="rounded-lg border border-[rgba(37,99,235,0.1)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_5%,var(--eid-surface)),var(--eid-surface))] px-2 py-1.5 text-[10px] leading-snug text-eid-text-secondary">
                  Você integra o elenco: acompanhe o status aqui. <span className="font-semibold text-eid-fg">Só o líder</span>{" "}
                  combina data/local e lança o resultado no Painel.
                </p>
              ) : null}

              {!somenteInformativo && m.gestaoSomenteLeitura && (m.status === "CancelamentoPendente" || m.status === "ReagendamentoPendente") ? (
                <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-[10px] font-semibold leading-snug text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#f59e0b_45%)]">
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

              {m.whatsappContato || podeReagendar ? (
                <div className="grid gap-2" style={{ gridTemplateColumns: m.whatsappContato && podeReagendar ? "1fr 1fr" : "1fr" }}>
                  {m.whatsappContato ? <WhatsAppContatoButton href={m.whatsappContato} nome={m.whatsappContatoNome} /> : null}

                  {podeReagendar ? (
                    <button
                      type="button"
                      disabled={pending}
                      data-eid-aceitos-acao-btn="true"
                      onClick={() => {
                        setClickedAction((prev) => ({ ...prev, [m.id]: "requestReschedule" }));
                        setOpenRescheduleByMatch((prev) => ({ ...prev, [m.id]: !prev[m.id] }));
                      }}
                      className="flex min-h-[34px] w-full items-center justify-center gap-1 rounded-[8px] border border-eid-action-500/45 bg-eid-action-500/10 px-2 text-[8.5px] font-black uppercase tracking-[0.05em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-action-500)_28%)] transition hover:border-eid-action-500/65 hover:bg-eid-action-500/18 active:scale-[0.98] disabled:opacity-50 sm:min-h-[36px] sm:text-[9px]"
                    >
                      <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0 text-eid-action-400" fill="currentColor" aria-hidden>
                        <path d="M4.5 1a.5.5 0 0 1 .5.5V2h6v-.5a.5.5 0 0 1 1 0V2h.5A1.5 1.5 0 0 1 14 3.5v9A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H4v-.5a.5.5 0 0 1 .5-.5ZM3 5.5v7a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-7H3Zm1-2.5H3.5a.5.5 0 0 0-.5.5V4.5h10V3.5a.5.5 0 0 0-.5-.5H12v.5a.5.5 0 0 1-1 0V3H5v.5a.5.5 0 0 1-1 0V3Z" />
                      </svg>
                      <span>Reagendar</span>
                    </button>
                  ) : null}
                </div>
              ) : null}

              {podeReagendar && openRescheduleByMatch[m.id] ? (
                    <form
                      action={formAction}
                      className="grid gap-2 rounded-xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_30%,var(--eid-border-subtle)_70%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_6%,var(--eid-card)_94%)] p-2.5"
                    >
                      <input type="hidden" name="intent" value="request_reschedule" />
                      <input type="hidden" name="match_id" value={String(m.id)} />
                      <p className="text-[9px] font-bold uppercase tracking-[0.07em] text-eid-text-secondary">
                        Proponha 3 novos horários
                      </p>
                      <p className="text-[10px] leading-snug text-eid-text-secondary md:text-[11px]">
                        O horário atual continua válido até {m.nomeOponente} aceitar uma opção.
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
                        placeholder="Novo local (opcional)"
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
                        className="inline-flex min-h-[34px] w-full items-center justify-center rounded-xl border border-eid-action-500/45 bg-eid-action-500 px-3 text-[9px] font-black uppercase tracking-wide text-white shadow-[0_8px_20px_-10px_rgba(249,115,22,0.7)] transition hover:bg-eid-action-600 disabled:opacity-50 md:text-[10px]"
                      >
                        Enviar pedido de reagendamento
                      </button>
                    </form>
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
                        Enviar 3 opções (janela {agendamentoJanelaHoras}h)
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

              {!somenteInformativo &&
              m.status === "ReagendamentoPendente" &&
              ((m.rescheduleKind === "direto" && !m.isRequester) || (m.rescheduleKind !== "direto" && m.isRequester)) &&
              !m.gestaoSomenteLeitura ? (
                <div className="grid gap-2">
                  {m.rescheduleKind === "direto" ? (
                    <p className="text-[10px] leading-snug text-eid-text-secondary md:text-[11px]">
                      {m.nomeOponente} pediu para reagendar. Se você não aceitar, o agendamento atual continua valendo.
                    </p>
                  ) : null}
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

              {!somenteInformativo &&
              m.status === "ReagendamentoPendente" &&
              ((m.rescheduleKind === "direto" && m.isRequester) || (m.rescheduleKind !== "direto" && !m.isRequester)) &&
              !m.gestaoSomenteLeitura ? (
                <p className="text-[11px] text-eid-text-secondary md:text-xs">
                  {m.rescheduleKind === "direto"
                    ? "Pedido de reagendamento enviado. Aguardando aceite do oponente; o agendamento atual continua valendo."
                    : "Você recusou o cancelamento e sugeriu horários. Aguardando escolha do oponente."}
                </p>
              ) : null}
            </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
