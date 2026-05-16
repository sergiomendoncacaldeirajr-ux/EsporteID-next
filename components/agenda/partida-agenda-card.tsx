"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { DesafioFlowCtaIcon } from "@/components/desafio/desafio-flow-cta-icon";
import { gerenciarCancelamentoMatch, type GerenciarCancelamentoState } from "@/app/comunidade/actions";
import {
  responderAgendamentoPartidaAction,
  type ResponderAgendamentoState,
} from "@/app/agenda/actions";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { CadastrarLocalOverlayTrigger } from "@/components/locais/cadastrar-local-overlay-trigger";
import { LocalAutocompleteInput } from "@/components/locais/local-autocomplete-input";
import { EidDateTimePicker } from "@/components/agenda/eid-date-time-picker";
import { DESAFIO_FLOW_CTA_BLOCK_CLASS, DESAFIO_FLOW_SECONDARY_CLASS } from "@/lib/desafio/flow-ui";
import { EidSocialAceitarButton, EidSocialRecusarButton } from "@/components/ui/eid-social-acao-buttons";
import { createPortal } from "react-dom";
import { Capacitor } from "@capacitor/core";
import { EidCancelButton } from "@/components/ui/eid-cancel-button";
import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import type { PartidaAgendaFormacaoLado } from "@/lib/agenda/partida-formacao-lado";
import { iniciaisFormacaoNome } from "@/lib/comunidade/iniciais-formacao";
import { isNativeAndroidApp } from "@/lib/pwa/push-client";
import {
  maxDatetimeLocalValueHorasAFrente,
  minDatetimeLocalValue,
} from "@/lib/agenda/confronto-agendamento-janela";
import { Bell, CalendarClock, CalendarPlus, MapPin } from "lucide-react";

export type { PartidaAgendaFormacaoLado } from "@/lib/agenda/partida-formacao-lado";

type Props = {
  id: number;
  esporteNome: string;
  j1Nome: string | null;
  j2Nome: string | null;
  j1Id?: string | null;
  j2Id?: string | null;
  j1AvatarUrl?: string | null;
  j2AvatarUrl?: string | null;
  j1NotaEid?: number | null;
  j2NotaEid?: number | null;
  /** Em dupla/time: exibir formação (nome + escudo + EID do time), não o capitão. */
  formacaoJ1?: PartidaAgendaFormacaoLado;
  formacaoJ2?: PartidaAgendaFormacaoLado;
  esporteId?: number | null;
  dataRef: string | null;
  localLabel: string | null;
  /** Logo/escudo do espaço cadastrado — exibido como miniatura antes do nome do local. */
  localLogoUrl?: string | null;
  variant: "agendada" | "placar";
  /** Se omitido: agendada → `?modo=agenda`; placar → página completa. */
  href?: string;
  ctaLabel?: string;
  cancelMatchId?: number | null;
  ctaFullscreen?: boolean;
  ctaHidden?: boolean;
  desistMatchId?: number | null;
  agendamentoPendente?: boolean;
  agendamentoPodeResponder?: boolean;
  agendamentoDeadline?: string | null;
  /** Membro do elenco (não líder): só acompanha; não agenda nem cancela pelo card. */
  somenteLeituraElenco?: boolean;
  /** Na Agenda (só informação): não exibe solicitar/responder cancelamento nem desistência. */
  ocultarFluxoCancelamento?: boolean;
  /** Na Agenda (só informação): não exibe aprovar/recusar proposta de data/hora; ação fica no Painel social. */
  ocultarFluxoAgendamento?: boolean;
  whatsappContato?: string | null;
  whatsappContatoNome?: string | null;
  reagendamentoMatchId?: number | null;
  agendamentoJanelaHoras?: number;
  /** Query `from=` nos links de EID (ex.: `/comunidade` no painel). */
  perfilEidFrom?: string;
};

declare global {
  interface Window {
    eidNativeAddCalendarEvent?: (payload: {
      title?: string;
      location?: string | null;
      description?: string | null;
      startMs?: number;
      endMs?: number;
    }) => Promise<void>;
    EsporteIDAndroid?: {
      addCalendarEvent?: (payload: string) => void;
    };
  }
}

const cancelInitial: GerenciarCancelamentoState = { ok: false, message: "" };
const agendaInitial: ResponderAgendamentoState = { ok: false, message: "" };

function primeiroNome(n: string | null) {
  if (!n?.trim()) return "—";
  return n.trim().split(/\s+/)[0] ?? "—";
}

function formatWhen(iso: string | null) {
  if (!iso) return "Data a combinar";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "Data a combinar";
  }
}

function formatDeadline(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return null;
  }
}

function addMinutesToDatetimeLocal(base: string, minutes: number): string {
  const t = new Date(base).getTime();
  if (Number.isNaN(t)) return base;
  const dt = new Date(t + minutes * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function readReagendamentoLocalPrefillFromUrl():
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

const whatsappIcon = (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-[#25D366]" fill="currentColor" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

const cardBase =
  "rounded-2xl border border-[rgba(37,99,235,0.1)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-primary-500)_3%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-2.5 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm transition md:p-4";

export function PartidaAgendaCard({
  id,
  esporteNome,
  j1Nome,
  j2Nome,
  j1Id,
  j2Id,
  j1AvatarUrl,
  j2AvatarUrl,
  j1NotaEid,
  j2NotaEid,
  formacaoJ1,
  formacaoJ2,
  esporteId,
  dataRef,
  localLabel,
  localLogoUrl,
  variant,
  href,
  ctaLabel,
  cancelMatchId,
  ctaFullscreen = false,
  ctaHidden = false,
  desistMatchId = null,
  agendamentoPendente = false,
  agendamentoPodeResponder = false,
  agendamentoDeadline = null,
  somenteLeituraElenco = false,
  ocultarFluxoCancelamento = false,
  ocultarFluxoAgendamento = false,
  whatsappContato = null,
  whatsappContatoNome = null,
  reagendamentoMatchId = null,
  agendamentoJanelaHoras = 72,
  perfilEidFrom = "/agenda",
}: Props) {
  const isPlacar = variant === "placar";
  const [openCancel, setOpenCancel] = useState(false);
  const [openDesist, setOpenDesist] = useState(false);
  const [openReschedule, setOpenReschedule] = useState(false);
  const [localReagendamentoPrefill, setLocalReagendamentoPrefill] = useState("");
  const [minDateTimeLocal] = useState<string>(() => minDatetimeLocalValue());
  const [maxDateTimeLocal] = useState<string>(() =>
    maxDatetimeLocalValueHorasAFrente(agendamentoJanelaHoras)
  );
  const [agendaActionClicked, setAgendaActionClicked] = useState<"accept" | "reject" | null>(null);
  const [nativeCalendarPlatform, setNativeCalendarPlatform] = useState<"android" | "ios" | null>(null);
  const [nativeToolsAvailable, setNativeToolsAvailable] = useState(false);
  const [state, formAction, pending] = useActionState(gerenciarCancelamentoMatch, cancelInitial);
  const [agendaState, agendaAction, agendaPending] = useActionState(responderAgendamentoPartidaAction, agendaInitial);
  useEffect(() => {
    const checkNativeCalendar = () => {
      const platform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : isNativeAndroidApp() ? "android" : "web";
      const available =
        (platform === "android" || platform === "ios") &&
        (typeof window.eidNativeAddCalendarEvent === "function" ||
          typeof window.EsporteIDAndroid?.addCalendarEvent === "function");
      setNativeCalendarPlatform(available ? platform : null);
      setNativeToolsAvailable(
        (platform === "android" || platform === "ios") &&
          (typeof window.eidNativeScheduleMatchReminder === "function" || typeof window.eidNativeOpenMaps === "function")
      );
    };
    checkNativeCalendar();
    window.addEventListener("eid:native-app-ready", checkNativeCalendar);
    return () => window.removeEventListener("eid:native-app-ready", checkNativeCalendar);
  }, []);
  useEffect(() => {
    if (!state.ok) return;
    const id = window.setTimeout(() => {
      setOpenCancel(false);
      setOpenDesist(false);
    }, 0);
    return () => window.clearTimeout(id);
  }, [state.ok]);
  useEffect(() => {
    if (!reagendamentoMatchId) return;
    const urlPrefill = readReagendamentoLocalPrefillFromUrl();
    if (!urlPrefill || urlPrefill.matchId !== reagendamentoMatchId) return;
    const timer = window.setTimeout(() => {
      setOpenReschedule(true);
      setLocalReagendamentoPrefill(urlPrefill.prefill);
      window.history.replaceState(null, "", urlPrefill.nextUrl);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reagendamentoMatchId]);
  const ctaHref =
    href ??
    (isPlacar ? `/registrar-placar/${id}?from=/comunidade` : `/registrar-placar/${id}?modo=agenda`);
  const ctaText = ctaLabel ?? (isPlacar ? "Revisar resultado" : "Agendar data e local");
  const fromPath = perfilEidFrom;
  const defaultOption2 = addMinutesToDatetimeLocal(minDateTimeLocal, 60);
  const defaultOption3 = addMinutesToDatetimeLocal(minDateTimeLocal, 120);
  const canRequestReschedule = Boolean(reagendamentoMatchId && !somenteLeituraElenco && !isPlacar);
  const hasScheduleActions = Boolean((whatsappContato || canRequestReschedule) && !agendamentoPendente && !somenteLeituraElenco);
  const showFooterWhatsApp = Boolean(whatsappContato && (!ctaHidden || !hasScheduleActions));

  function tituloLado(formacao: PartidaAgendaFormacaoLado | undefined, nomePerfil: string | null) {
    if (formacao?.nome) return formacao.nome;
    return primeiroNome(nomePerfil);
  }

  const calendarTitle = `EsporteID: ${tituloLado(formacaoJ1, j1Nome)} vs ${tituloLado(formacaoJ2, j2Nome)}`;
  const calendarStartMs = dataRef ? new Date(dataRef).getTime() : Number.NaN;
  const canAddNativeCalendar =
    nativeCalendarPlatform != null &&
    Number.isFinite(calendarStartMs) &&
    calendarStartMs > 0 &&
    Boolean(localLabel?.trim()) &&
    !agendamentoPendente;

  function handleAddNativeCalendar() {
    if (!canAddNativeCalendar) return;
    const payload = {
      title: calendarTitle,
      location: localLabel,
      description: `${esporteNome} no EsporteID. Partida #${id}.`,
      startMs: calendarStartMs,
      endMs: calendarStartMs + 90 * 60 * 1000,
    };
    if (window.eidNativeAddCalendarEvent) {
      void window.eidNativeAddCalendarEvent(payload);
      return;
    }
    window.EsporteIDAndroid?.addCalendarEvent?.(
      JSON.stringify(payload)
    );
  }

  function handleNativeReminder() {
    if (!canAddNativeCalendar) return;
    void window.eidNativeScheduleMatchReminder?.({
      title: calendarTitle,
      location: localLabel,
      description: `${esporteNome} no EsporteID. Partida #${id}.`,
      startMs: calendarStartMs,
      endMs: calendarStartMs + 90 * 60 * 1000,
      matchId: id,
      url: "/agenda",
    });
  }

  function handleOpenNativeMaps() {
    if (!localLabel?.trim()) return;
    void window.eidNativeOpenMaps?.({ query: localLabel });
  }

  function renderLadoCol(
    formacao: PartidaAgendaFormacaoLado | undefined,
    nomePerfil: string | null,
    userId: string | null | undefined,
    avatarUrl: string | null | undefined,
    notaPerfil: number,
  ) {
    const statsHref = formacao
      ? `/perfil-time/${formacao.timeId}/eid/${Number(esporteId ?? 0)}?from=${encodeURIComponent(fromPath)}`
      : userId && esporteId
        ? `/perfil/${userId}/eid/${esporteId}?from=${encodeURIComponent(fromPath)}`
        : null;
    const titulo = tituloLado(formacao, nomePerfil);
    const notaEid = formacao ? formacao.eidNota : Number(notaPerfil ?? 0);
    const isTime = Boolean(formacao);
    return (
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-sm font-black tracking-tight text-eid-fg md:text-base">{titulo}</p>
        <div className="mt-1 flex justify-center">
          {statsHref ? (
            <div className="relative flex flex-col items-center">
              <ProfileEditDrawerTrigger
                href={statsHref}
                title={formacao ? `Estatísticas EID da formação ${titulo}` : `Estatísticas EID de ${titulo}`}
                fullscreen
                topMode="backOnly"
                className="relative block h-14 w-14 appearance-none border-0 bg-transparent p-0 shadow-none md:h-16 md:w-16"
              >
                {formacao?.escudoUrl ? (
                  <Image
                    src={formacao.escudoUrl}
                    alt=""
                    fill
                    unoptimized
                    className={`h-full w-full border-0 !object-cover object-center shadow-none ${
                      isTime ? "rounded-xl" : "rounded-full"
                    }`}
                  />
                ) : !formacao && userId && avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    fill
                    unoptimized
                    className="h-full w-full rounded-full !object-cover object-center"
                  />
                ) : (
                  <div
                    className={`flex h-full w-full items-center justify-center bg-eid-surface text-[8px] font-black tracking-widest text-eid-primary-200 shadow-none ${
                      isTime ? "rounded-xl" : "rounded-full"
                    }`}
                  >
                    {iniciaisFormacaoNome(isTime ? formacao?.nome : nomePerfil).slice(0, 2) || "?"}
                  </div>
                )}
              </ProfileEditDrawerTrigger>
              <div className="mt-1">
                <ProfileEidPerformanceSeal notaEid={notaEid} compact />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <article
      className={`relative ${
        isPlacar
          ? `${cardBase} border-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-action-500)_12%,var(--eid-card)_88%),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-none`
          : cardBase
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary md:text-[10px] md:font-black">
        <span className="inline-flex items-center gap-1 text-eid-fg/90">
          <span aria-hidden>⏱</span>
          {formatWhen(dataRef)}
        </span>
        <span className="ml-auto rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_65%,var(--eid-primary-500)_35%)]">
          {esporteNome}
        </span>
      </div>

      <div className="relative mt-2.5 flex items-start justify-between gap-2 md:mt-4">
        {renderLadoCol(formacaoJ1, j1Nome, j1Id ?? null, j1AvatarUrl, Number(j1NotaEid ?? 0))}
        <div className="shrink-0 self-center px-0.5 text-center">
          <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-eid-action-500/45 bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.42),transparent_28%),linear-gradient(145deg,var(--eid-action-400),var(--eid-action-600))] text-[9px] font-black uppercase tracking-[0.03em] text-white shadow-[0_0_0_2.5px_var(--eid-card),0_0_0_4.5px_color-mix(in_srgb,var(--eid-action-500)_55%,transparent),0_8px_18px_-10px_rgba(249,115,22,0.65),inset_0_1px_0_rgba(255,255,255,0.38)] md:h-9 md:w-9 md:text-[10px]">
            <span className="absolute inset-[5px] rounded-full border border-white/25" aria-hidden />
            <span className="relative leading-none drop-shadow-[0_1px_1px_rgba(124,45,18,0.45)]">VS</span>
          </span>
        </div>
        {renderLadoCol(formacaoJ2, j2Nome, j2Id ?? null, j2AvatarUrl, Number(j2NotaEid ?? 0))}
      </div>

      {localLabel ? (
        <div className="mt-2.5 flex items-center justify-center gap-1.5 md:mt-3">
          {localLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={localLogoUrl}
              alt=""
              aria-hidden
              className="h-5 w-5 shrink-0 rounded-md border border-white/10 object-cover shadow-sm"
            />
          ) : (
            <span className="shrink-0 text-[10px] leading-none">📍</span>
          )}
          <span className="text-center text-[10px] font-semibold text-eid-fg/90 md:text-[11px]">
            {localLabel}
          </span>
        </div>
      ) : null}

      {canAddNativeCalendar || (nativeToolsAvailable && localLabel?.trim()) ? (
        <div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${[canAddNativeCalendar, canAddNativeCalendar && nativeToolsAvailable, nativeToolsAvailable && Boolean(localLabel?.trim())].filter(Boolean).length}, minmax(0,1fr))` }}>
          {canAddNativeCalendar ? (
            <button
              type="button"
              onClick={handleAddNativeCalendar}
              data-eid-compact-chip-btn="true"
              className="inline-flex min-h-[28px] items-center justify-center gap-1 rounded-lg border border-eid-primary-500/25 bg-eid-primary-500/10 px-2 text-[8px] font-black uppercase leading-none tracking-[0.04em] text-eid-primary-300 transition active:scale-[0.98]"
              aria-label="Adicionar este compromisso na agenda do celular"
            >
              <CalendarPlus className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{nativeCalendarPlatform === "ios" ? "Agenda iPhone" : "Agenda"}</span>
            </button>
          ) : null}
          {canAddNativeCalendar && nativeToolsAvailable ? (
            <button
              type="button"
              onClick={handleNativeReminder}
              data-eid-compact-chip-btn="true"
              className="inline-flex min-h-[28px] items-center justify-center gap-1 rounded-lg border border-eid-action-500/25 bg-eid-action-500/10 px-2 text-[8px] font-black uppercase leading-none tracking-[0.04em] text-eid-action-400 transition active:scale-[0.98]"
              aria-label="Criar lembrete no celular"
            >
              <Bell className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">Lembrete</span>
            </button>
          ) : null}
          {nativeToolsAvailable && localLabel?.trim() ? (
            <button
              type="button"
              onClick={handleOpenNativeMaps}
              data-eid-compact-chip-btn="true"
              className="inline-flex min-h-[28px] items-center justify-center gap-1 rounded-lg border border-eid-primary-500/25 bg-eid-primary-500/10 px-2 text-[8px] font-black uppercase leading-none tracking-[0.04em] text-eid-primary-300 transition active:scale-[0.98]"
              aria-label="Abrir rota no aplicativo de mapas"
            >
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">Rota</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {isPlacar ? (
        <p className="mt-2 hidden text-center text-xs text-eid-text-secondary md:mt-3 md:block">
          O oponente registrou um placar. Toque em &quot;Revisar placar&quot; para confirmar ou contestar.
        </p>
      ) : null}

      {agendamentoPendente ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_40%,var(--eid-border-subtle)_60%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-card)_88%)] p-0">
          <div className="flex items-center justify-between gap-2 border-b border-[rgba(37,99,235,0.2)] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--eid-primary-500)_11%,var(--eid-surface)),color-mix(in_srgb,var(--eid-primary-500)_5%,var(--eid-surface)))] px-3 py-2">
            <EidPendingBadge label="Agendamento pendente" />
          </div>
          <div className="p-2.5 md:p-3">
            {ocultarFluxoAgendamento ? (
              <p className="text-center text-[11px] leading-snug text-eid-text-secondary">
                {somenteLeituraElenco ? (
                  <>
                    Proposta de agendamento pendente. <span className="font-semibold text-eid-fg">Só o líder</span> da sua
                    formação responde no{" "}
                    <Link href="/comunidade#resultados-partida" className="font-bold text-eid-primary-300 hover:underline">
                      Painel social
                    </Link>
                    .
                  </>
                ) : agendamentoPodeResponder ? (
                  <>
                    {formatDeadline(agendamentoDeadline)
                      ? `Prazo para resposta: ${formatDeadline(agendamentoDeadline)}. `
                      : "Há uma proposta de data e horário pendente. "}
                    Aceite ou recuse no{" "}
                    <Link href="/comunidade#resultados-partida" className="font-bold text-eid-primary-300 hover:underline">
                      Painel social
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    {formatDeadline(agendamentoDeadline)
                      ? `Proposta enviada. Aguardando o oponente até ${formatDeadline(agendamentoDeadline)}.`
                      : "Proposta enviada. Aguardando resposta do oponente."}{" "}
                    Acompanhe no{" "}
                    <Link href="/comunidade#resultados-partida" className="font-bold text-eid-primary-300 hover:underline">
                      Painel social
                    </Link>
                    .
                  </>
                )}
              </p>
            ) : somenteLeituraElenco ? (
              <p className="text-center text-[11px] leading-snug text-eid-text-secondary">
                Proposta de agendamento pendente. <span className="font-semibold text-eid-fg">Só o líder</span> da sua
                formação pode aceitar ou recusar.
              </p>
            ) : agendamentoPodeResponder ? (
              <>
                <p className="text-center text-[11px] leading-snug text-eid-text-secondary">
                  {formatDeadline(agendamentoDeadline)
                    ? `Prazo para resposta: ${formatDeadline(agendamentoDeadline)}.`
                    : "O oponente propôs data e horário. Aceite ou recuse."}
                </p>
                <div className="mt-2.5 flex items-stretch gap-2">
                  <form action={agendaAction} className="min-w-0 flex-1">
                    <input type="hidden" name="partida_id" value={String(id)} />
                    <input type="hidden" name="accept" value="1" />
                    <EidSocialAceitarButton
                      pending={agendaPending}
                      busy={agendaPending && agendaActionClicked === "accept"}
                      actionLabel="aprovar"
                      onClick={() => setAgendaActionClicked("accept")}
                      className="min-h-[30px] rounded-xl text-[8px] sm:text-[9px]"
                    />
                  </form>
                  <form action={agendaAction} className="min-w-0 flex-1">
                    <input type="hidden" name="partida_id" value={String(id)} />
                    <input type="hidden" name="accept" value="0" />
                    <EidSocialRecusarButton
                      pending={agendaPending}
                      busy={agendaPending && agendaActionClicked === "reject"}
                      onClick={() => setAgendaActionClicked("reject")}
                      className="min-h-[30px] rounded-xl text-[8px] sm:text-[9px]"
                    />
                  </form>
                </div>
              </>
            ) : (
              <p className="text-center text-[11px] leading-snug text-eid-text-secondary">
                {formatDeadline(agendamentoDeadline)
                  ? `Proposta enviada. Aguardando o oponente até ${formatDeadline(agendamentoDeadline)}.`
                  : "Proposta enviada. Aguardando resposta do oponente."}
              </p>
            )}
            {agendaState.ok ? (
              <p className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-center text-[10px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#10b981_45%)]">
                {agendaState.message}
              </p>
            ) : null}
            {!agendaState.ok && agendaState.message ? (
              <p className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-center text-[10px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#f43f5e_45%)]">
                {agendaState.message}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {!ctaHidden ? (
        ctaFullscreen ? (
          <ProfileEditDrawerTrigger
            href={ctaHref}
            title={ctaText}
            fullscreen
            topMode="backOnly"
            className={`${DESAFIO_FLOW_CTA_BLOCK_CLASS} mt-4 !min-h-[28px] w-full !px-2.5 text-center text-[9px] font-bold uppercase tracking-[0.04em] md:mt-5 md:!min-h-[40px] md:text-[11px]`}
          >
            <>
              <DesafioFlowCtaIcon />
              <span>{ctaText}</span>
            </>
          </ProfileEditDrawerTrigger>
        ) : (
          <Link
            href={ctaHref}
            className={`${DESAFIO_FLOW_CTA_BLOCK_CLASS} mt-4 !min-h-[28px] text-center text-[9px] font-bold uppercase tracking-[0.04em] md:mt-5 md:!min-h-[40px] md:text-[11px]`}
          >
            <DesafioFlowCtaIcon />
            <span>{ctaText}</span>
          </Link>
        )
      ) : (
        <div className="mt-2.5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-2.5 py-2 text-center md:mt-4">
          {hasScheduleActions ? (
            <div className="space-y-2">
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: whatsappContato && canRequestReschedule ? "1fr 1fr" : "1fr" }}
              >
                {whatsappContato ? (
                  <a
                    href={whatsappContato}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-eid-aceitos-acao-btn="true"
                    className="inline-flex min-h-[34px] w-full items-center justify-center gap-1.5 rounded-[8px] border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-2 text-[8.5px] font-black uppercase tracking-[0.05em] text-eid-fg transition hover:bg-eid-surface active:scale-[0.98] sm:min-h-[36px] sm:text-[9px]"
                    aria-label={`Chamar ${whatsappContatoNome?.split(" ")[0] ?? "oponente"} no WhatsApp`}
                  >
                    {whatsappIcon}
                    <span className="truncate">WhatsApp</span>
                  </a>
                ) : null}

                {canRequestReschedule ? (
                  <button
                    type="button"
                    disabled={pending}
                    data-eid-aceitos-acao-btn="true"
                    onClick={() => setOpenReschedule((v) => !v)}
                    className="inline-flex min-h-[34px] w-full items-center justify-center gap-1.5 rounded-[8px] border border-eid-action-500/45 bg-eid-action-500/10 px-2 text-[8.5px] font-black uppercase tracking-[0.05em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-action-500)_28%)] transition hover:border-eid-action-500/65 hover:bg-eid-action-500/18 active:scale-[0.98] disabled:opacity-50 sm:min-h-[36px] sm:text-[9px]"
                  >
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-eid-action-400" aria-hidden />
                    <span>Reagendar</span>
                  </button>
                ) : null}
              </div>

              {openReschedule && reagendamentoMatchId ? (
                <form
                  action={formAction}
                  className="grid gap-2 rounded-xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_30%,var(--eid-border-subtle)_70%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_6%,var(--eid-card)_94%)] p-2.5 text-left"
                >
                  <input type="hidden" name="intent" value="request_reschedule" />
                  <input type="hidden" name="match_id" value={String(reagendamentoMatchId)} />
                  <p className="text-[9px] font-bold uppercase tracking-[0.07em] text-eid-text-secondary">
                    Proponha 3 novos horários
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
                    defaultValue={localReagendamentoPrefill}
                    minChars={3}
                    className="eid-input-dark h-11 rounded-xl px-3 text-[15px] text-eid-fg placeholder:text-[15px]"
                  />
                  <CadastrarLocalOverlayTrigger
                    href={`/locais/cadastrar?return_to=${encodeURIComponent(`/agenda?reag_match=${reagendamentoMatchId}`)}`}
                    className={`${DESAFIO_FLOW_SECONDARY_CLASS} w-full rounded-xl text-center !min-h-[32px] !px-2 !text-[9px]`}
                  >
                    + Cadastrar local genérico
                  </CadastrarLocalOverlayTrigger>
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex min-h-[34px] w-full items-center justify-center rounded-xl border border-eid-action-500/45 bg-eid-action-500 px-3 text-[9px] font-black uppercase tracking-wide text-white shadow-[0_8px_20px_-10px_rgba(249,115,22,0.7)] transition hover:bg-eid-action-600 disabled:opacity-50 md:text-[10px]"
                  >
                    {pending ? "Enviando..." : "Enviar pedido de reagendamento"}
                  </button>
                  {state.ok ? (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-center text-[10px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#10b981_45%)]">
                      {state.message}
                    </p>
                  ) : null}
                  {!state.ok && state.message ? (
                    <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-center text-[10px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#f43f5e_45%)]">
                      {state.message}
                    </p>
                  ) : null}
                </form>
              ) : null}
            </div>
          ) : (
            <p className="text-[10px] font-semibold leading-snug text-eid-text-secondary md:text-xs">
              {somenteLeituraElenco
                ? "Você acompanha como membro do elenco. O líder define data e local e lança o resultado no Painel."
                : agendamentoPendente
                  ? "Agendamento enviado. Aguardando aceite do oponente."
                  : "Data e local definidos."}
            </p>
          )}
        </div>
      )}

      {!isPlacar &&
      !ocultarFluxoCancelamento &&
      (showFooterWhatsApp || cancelMatchId || desistMatchId) &&
      !somenteLeituraElenco ? (
        <div className="mt-3 border-t border-transparent pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {showFooterWhatsApp && whatsappContato ? (
              <a
                href={whatsappContato}
                target="_blank"
                rel="noopener noreferrer"
                data-eid-aceitos-acao-btn="true"
                className="inline-flex min-h-[28px] max-w-[9rem] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/65 px-2.5 text-[8px] font-black uppercase tracking-[0.05em] text-eid-fg transition hover:bg-eid-surface active:scale-[0.98] sm:text-[9px]"
                aria-label={`Chamar ${whatsappContatoNome?.split(" ")[0] ?? "oponente"} no WhatsApp`}
              >
                {whatsappIcon}
                <span>WhatsApp</span>
              </a>
            ) : null}
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {cancelMatchId && !desistMatchId ? (
                <EidCancelButton
                  type="button"
                  compact
                  inline
                  label="Cancelar"
                  className="shrink-0 active:scale-[0.98]"
                  onClick={() => setOpenCancel(true)}
                />
              ) : null}
              {desistMatchId ? (
                <button
                  type="button"
                  onClick={() => setOpenDesist(true)}
                  className="inline-flex min-h-[28px] w-auto max-w-[11rem] shrink-0 items-center justify-center rounded-lg border border-amber-700/95 bg-amber-700 px-2.5 text-[8px] font-black uppercase leading-tight tracking-[0.05em] text-white shadow-sm transition hover:bg-amber-800 active:scale-[0.98] sm:text-[9px]"
                >
                  Cancelar e desistir
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {!ocultarFluxoCancelamento &&
      openCancel &&
      cancelMatchId &&
      typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 backdrop-blur-[1.5px] sm:items-center">
              <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/98 p-0 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.78)]">
                <div className="border-b border-[rgba(220,38,38,0.15)] bg-[linear-gradient(90deg,color-mix(in_srgb,rgb(220,38,38)_9%,var(--eid-surface)),color-mix(in_srgb,rgb(220,38,38)_4%,var(--eid-surface)))] px-4 py-2">
                  <p className="text-center text-[11px] font-black uppercase tracking-[0.1em] text-eid-fg">Cancelamento</p>
                </div>
                <div className="p-4">
                <p className="text-sm text-eid-text-secondary">
                  Sem acordo de data ou local? Envie aqui e aguarde a resposta do oponente.
                </p>
                {state.ok ? <p className="mt-2 text-xs text-emerald-300">{state.message}</p> : null}
                {!state.ok && state.message ? <p className="mt-2 text-xs text-red-300">{state.message}</p> : null}
                <form action={formAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="intent" value="request_cancel" />
                  <input type="hidden" name="match_id" value={String(cancelMatchId)} />
                  <input
                    name="motivo"
                    placeholder="Motivo (opcional)"
                    className="eid-input-dark h-10 rounded-xl px-3 text-xs text-eid-fg"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="inline-flex min-h-[38px] flex-1 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 text-xs font-bold text-eid-fg transition hover:bg-eid-surface/75"
                      onClick={() => setOpenCancel(false)}
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={pending}
                      className="inline-flex min-h-[38px] flex-1 items-center justify-center rounded-xl border border-red-600 bg-red-600 px-3 text-xs font-black text-white shadow-[0_4px_14px_-4px_rgba(220,38,38,0.35)] transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {pending ? "Enviando..." : "Confirmar"}
                    </button>
                  </div>
                </form>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      {!ocultarFluxoCancelamento &&
      openDesist &&
      desistMatchId &&
      typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 backdrop-blur-[1.5px] sm:items-center">
              <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/98 p-0 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.78)]">
                <div className="flex items-center justify-between gap-2 border-b border-[rgba(217,119,6,0.18)] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--eid-warning-500)_9%,var(--eid-surface)),color-mix(in_srgb,var(--eid-warning-500)_4%,var(--eid-surface)))] px-4 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Confirmação</p>
                  <span className="shrink-0 rounded-full border border-amber-400/85 bg-[color:color-mix(in_srgb,#d97706_12%,white_88%)] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-amber-950 eid-dark:border-amber-500/35 eid-dark:bg-amber-500/12 eid-dark:text-amber-100">
                    Desistência
                  </span>
                </div>
                <div className="p-4">
                <p className="text-sm font-black uppercase tracking-[0.08em] text-[color:color-mix(in_srgb,var(--eid-fg)_60%,#f59e0b_40%)]">
                  Solicitar desistência
                </p>
                <p className="mt-2 text-sm text-eid-text-secondary">
                  Tem certeza que quer cancelar este desafio e passar a vitória para o oponente?
                </p>
                {state.ok ? <p className="mt-2 text-xs text-emerald-300">{state.message}</p> : null}
                {!state.ok && state.message ? <p className="mt-2 text-xs text-red-300">{state.message}</p> : null}
                <form action={formAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="intent" value="desist_match" />
                  <input type="hidden" name="match_id" value={String(desistMatchId)} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="inline-flex min-h-[38px] flex-1 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 text-xs font-bold text-eid-fg transition hover:bg-eid-surface/75"
                      onClick={() => setOpenDesist(false)}
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={pending}
                      className="inline-flex min-h-[38px] flex-1 items-center justify-center rounded-xl border border-amber-700 bg-amber-700 px-3 text-xs font-black text-white shadow-[0_4px_14px_-4px_rgba(180,83,9,0.35)] transition hover:bg-amber-800 disabled:opacity-50"
                    >
                      {pending ? "Enviando..." : "Confirmar"}
                    </button>
                  </div>
                </form>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </article>
  );
}
