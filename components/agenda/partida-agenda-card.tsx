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
import { DESAFIO_FLOW_CTA_BLOCK_CLASS, PEDIDO_CANCELAR_COMPACT_BTN_CLASS } from "@/lib/desafio/flow-ui";
import { createPortal } from "react-dom";

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
  esporteId?: number | null;
  dataRef: string | null;
  localLabel: string | null;
  variant: "agendada" | "placar";
  /** Se omitido: agendada → `?modo=agenda`; placar → página completa. */
  href?: string;
  ctaLabel?: string;
  cancelMatchId?: number | null;
  ctaFullscreen?: boolean;
  ctaHidden?: boolean;
  desistMatchId?: number | null;
  topActionShiftXPx?: number;
  agendamentoPendente?: boolean;
  agendamentoPodeResponder?: boolean;
  agendamentoDeadline?: string | null;
};

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

const cardBase =
  "rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-2.5 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.24)] backdrop-blur-sm transition md:p-4";

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
  esporteId,
  dataRef,
  localLabel,
  variant,
  href,
  ctaLabel,
  cancelMatchId,
  ctaFullscreen = false,
  ctaHidden = false,
  desistMatchId = null,
  topActionShiftXPx = 0,
  agendamentoPendente = false,
  agendamentoPodeResponder = false,
  agendamentoDeadline = null,
}: Props) {
  const isPlacar = variant === "placar";
  const [openCancel, setOpenCancel] = useState(false);
  const [openDesist, setOpenDesist] = useState(false);
  const [showCancelHint, setShowCancelHint] = useState(Boolean(cancelMatchId) && !isPlacar);
  const [state, formAction, pending] = useActionState(gerenciarCancelamentoMatch, cancelInitial);
  const [agendaState, agendaAction, agendaPending] = useActionState(responderAgendamentoPartidaAction, agendaInitial);
  useEffect(() => {
    if (!showCancelHint) return;
    const hideHint = () => setShowCancelHint(false);
    window.addEventListener("pointerdown", hideHint, { once: true });
    return () => window.removeEventListener("pointerdown", hideHint);
  }, [showCancelHint]);
  useEffect(() => {
    if (state.ok) setOpenCancel(false);
    if (state.ok) setOpenDesist(false);
  }, [state.ok]);
  const ctaHref =
    href ??
    (isPlacar ? `/registrar-placar/${id}?from=/comunidade` : `/registrar-placar/${id}?modo=agenda`);
  const ctaText = ctaLabel ?? (isPlacar ? "Revisar resultado" : "Agendar data e local");
  return (
    <article
      className={`relative ${
        isPlacar
          ? `${cardBase} border-[color:color-mix(in_srgb,var(--eid-action-500)_38%,var(--eid-border-subtle)_62%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-action-500)_12%,var(--eid-card)_88%),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_12px_24px_-14px_color-mix(in_srgb,var(--eid-action-500)_28%,transparent)]`
          : cardBase
      }`}
    >
      {cancelMatchId && !isPlacar && !desistMatchId ? (
        <>
          {showCancelHint ? (
            <p className="absolute left-1/2 -top-5 z-[3] w-[88%] -translate-x-1/2 rounded-md border border-eid-primary-500/40 bg-eid-card/95 px-2 py-1 text-center text-[9px] font-semibold leading-tight text-eid-text-secondary">
              Sem acordo de data? Toque em &quot;Cancelar&quot; para abrir as opções.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setShowCancelHint(false);
              setOpenCancel(true);
            }}
            className={`absolute left-1/2 top-2.5 z-[3] active:scale-[0.98] ${PEDIDO_CANCELAR_COMPACT_BTN_CLASS}`}
            style={{ transform: `translateX(calc(-50% + ${topActionShiftXPx}px))` }}
          >
            Cancelar
          </button>
        </>
      ) : null}
      {desistMatchId && !isPlacar ? (
        <button
          type="button"
          onClick={() => setOpenDesist(true)}
          className="absolute left-1/2 top-2.5 z-[3] inline-flex min-h-[26px] max-w-[min(100%,14rem)] items-center justify-center rounded-xl border border-amber-700/95 bg-amber-700 px-2 text-[8px] font-black uppercase leading-tight tracking-[0.05em] text-white shadow-[0_4px_14px_-4px_rgba(180,83,9,0.45)] transition hover:bg-amber-800 active:scale-[0.98] sm:text-[9px]"
          style={{ transform: `translateX(calc(-50% + ${topActionShiftXPx}px))` }}
        >
          Cancelar e desistir
        </button>
      ) : null}
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
        <div className="min-w-0 flex-1 pt-4 text-center">
          <p className="truncate text-sm font-black tracking-tight text-eid-fg md:text-base">{primeiroNome(j1Nome)}</p>
          <div className="mt-1 flex justify-center">
            {j1Id && esporteId ? (
              <div className="relative flex flex-col items-center">
                <ProfileEditDrawerTrigger
                  href={`/perfil/${j1Id}/eid/${esporteId}?from=${encodeURIComponent("/agenda")}`}
                  title={`Estatísticas EID de ${primeiroNome(j1Nome)}`}
                  fullscreen
                  topMode="backOnly"
                  className="relative block h-14 w-14 appearance-none overflow-hidden rounded-full border-0 bg-transparent p-0 shadow-none md:h-16 md:w-16"
                >
                  {j1AvatarUrl ? (
                    <Image
                      src={j1AvatarUrl}
                      alt=""
                      fill
                      unoptimized
                      className="h-full w-full rounded-full border-0 !object-cover object-center shadow-none"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full border-[3px] border-eid-card bg-gradient-to-br from-eid-primary-700 to-eid-primary-900 text-[8px] font-black tracking-widest text-eid-primary-200 shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)]">
                      {primeiroNome(j1Nome).slice(0, 1).toUpperCase() || "?"}
                    </div>
                  )}
                </ProfileEditDrawerTrigger>
                <div className="-mt-0.5">
                  <ProfileEidPerformanceSeal notaEid={Number(j1NotaEid ?? 0)} compact className="scale-125" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 self-end pb-0.5 text-center">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-eid-action-500/35 bg-eid-action-500/12 text-[9px] font-black uppercase tracking-[0.08em] text-eid-action-300 shadow-[0_6px_16px_-10px_rgba(249,115,22,0.6)] md:h-8 md:w-8 md:text-[10px]">
            VS
          </span>
        </div>
        <div className="min-w-0 flex-1 pt-4 text-center">
          <p className="truncate text-sm font-black tracking-tight text-eid-fg md:text-base">{primeiroNome(j2Nome)}</p>
          <div className="mt-1 flex justify-center">
            {j2Id && esporteId ? (
              <div className="relative flex flex-col items-center">
                <ProfileEditDrawerTrigger
                  href={`/perfil/${j2Id}/eid/${esporteId}?from=${encodeURIComponent("/agenda")}`}
                  title={`Estatísticas EID de ${primeiroNome(j2Nome)}`}
                  fullscreen
                  topMode="backOnly"
                  className="relative block h-14 w-14 appearance-none overflow-hidden rounded-full border-0 bg-transparent p-0 shadow-none md:h-16 md:w-16"
                >
                  {j2AvatarUrl ? (
                    <Image
                      src={j2AvatarUrl}
                      alt=""
                      fill
                      unoptimized
                      className="h-full w-full rounded-full border-0 !object-cover object-center shadow-none"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full border-[3px] border-eid-card bg-gradient-to-br from-eid-primary-700 to-eid-primary-900 text-[8px] font-black tracking-widest text-eid-primary-200 shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)]">
                      {primeiroNome(j2Nome).slice(0, 1).toUpperCase() || "?"}
                    </div>
                  )}
                </ProfileEditDrawerTrigger>
                <div className="-mt-0.5">
                  <ProfileEidPerformanceSeal notaEid={Number(j2NotaEid ?? 0)} compact className="scale-125" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {localLabel ? (
        <p className="mt-2.5 text-center text-[10px] text-eid-text-secondary md:mt-3 md:text-[11px]">
          📍 <span className="font-semibold text-eid-fg/90">{localLabel}</span>
        </p>
      ) : null}

      {isPlacar ? (
        <p className="mt-2 hidden text-center text-xs text-eid-text-secondary md:mt-3 md:block">
          O oponente registrou um placar. Toque em &quot;Revisar placar&quot; para confirmar ou contestar.
        </p>
      ) : null}

      {agendamentoPendente ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_40%,var(--eid-border-subtle)_60%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-card)_88%)] p-0">
          <div className="flex items-center justify-between gap-2 border-b border-[color:color-mix(in_srgb,var(--eid-primary-500)_30%,var(--eid-border-subtle)_70%)] bg-eid-surface/45 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-primary-500)_28%)]">
              Agendamento pendente
            </p>
            <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_65%,var(--eid-primary-500)_35%)]">
              Responder
            </span>
          </div>
          <div className="p-2.5 md:p-3">
            {agendamentoPodeResponder ? (
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
                    <button
                      type="submit"
                      disabled={agendaPending}
                      className="inline-flex min-h-[36px] w-full items-center justify-center rounded-xl border border-emerald-600 bg-emerald-600 px-2 text-[10px] font-black uppercase tracking-wide text-white shadow-[0_4px_14px_-4px_rgba(16,185,129,0.35)] transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {agendaPending ? "Enviando..." : "Aceitar"}
                    </button>
                  </form>
                  <form action={agendaAction} className="min-w-0 flex-1">
                    <input type="hidden" name="partida_id" value={String(id)} />
                    <input type="hidden" name="accept" value="0" />
                    <button
                      type="submit"
                      disabled={agendaPending}
                      className="inline-flex min-h-[36px] w-full items-center justify-center rounded-xl border border-rose-600 bg-rose-600 px-2 text-[10px] font-black uppercase tracking-wide text-white shadow-[0_4px_14px_-4px_rgba(244,63,94,0.35)] transition hover:bg-rose-700 disabled:opacity-50"
                    >
                      {agendaPending ? "Enviando..." : "Recusar"}
                    </button>
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
            className={`${DESAFIO_FLOW_CTA_BLOCK_CLASS} mt-2.5 w-full text-center text-[10px] font-bold uppercase tracking-wide md:mt-4 md:min-h-[48px] md:text-xs`}
          >
            <>
              <DesafioFlowCtaIcon />
              <span>{ctaText}</span>
            </>
          </ProfileEditDrawerTrigger>
        ) : (
          <Link
            href={ctaHref}
            className={`${DESAFIO_FLOW_CTA_BLOCK_CLASS} mt-2.5 text-center text-[10px] font-bold uppercase tracking-wide md:mt-4 md:min-h-[48px] md:text-xs`}
          >
            <DesafioFlowCtaIcon />
            <span>{ctaText}</span>
          </Link>
        )
      ) : (
        <div className="mt-2.5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-2.5 py-2 text-center md:mt-4">
          <p className="text-[10px] font-semibold leading-snug text-eid-text-secondary md:text-xs">
            {agendamentoPendente
              ? "Agendamento enviado. Aguardando aceite do oponente."
              : "Data, horário e local já definidos pelo reagendamento aceito."}
          </p>
        </div>
      )}

      {openCancel && cancelMatchId && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 backdrop-blur-[1.5px] sm:items-center">
              <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/98 p-0 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.78)]">
                <div className="flex items-center justify-between gap-2 border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-4 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Confirmação</p>
                  <span className="rounded-full border border-red-500/35 bg-red-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#f87171_45%)]">
                    Cancelamento
                  </span>
                </div>
                <div className="p-4">
                <p className="text-sm font-black uppercase tracking-[0.08em] text-[color:color-mix(in_srgb,var(--eid-fg)_62%,var(--eid-primary-500)_38%)]">
                  Solicitar cancelamento
                </p>
                <p className="mt-2 text-sm text-eid-text-secondary">
                  Sem acordo de data/local? Envie a solicitação e o oponente terá prazo para responder.
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
      {openDesist && desistMatchId && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 backdrop-blur-[1.5px] sm:items-center">
              <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/98 p-0 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.78)]">
                <div className="flex items-center justify-between gap-2 border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-4 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Confirmação</p>
                  <span className="rounded-full border border-amber-500/35 bg-amber-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_55%,#f59e0b_45%)]">
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
