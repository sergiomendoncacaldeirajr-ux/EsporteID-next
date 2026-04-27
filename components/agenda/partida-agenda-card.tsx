"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { DesafioFlowCtaIcon } from "@/components/desafio/desafio-flow-cta-icon";
import { gerenciarCancelamentoMatch, type GerenciarCancelamentoState } from "@/app/comunidade/actions";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { DESAFIO_FLOW_CTA_BLOCK_CLASS } from "@/lib/desafio/flow-ui";
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
};

const cancelInitial: GerenciarCancelamentoState = { ok: false, message: "" };

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

const cardBase =
  "rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-3 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.24)] backdrop-blur-sm transition md:p-4";

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
}: Props) {
  const isPlacar = variant === "placar";
  const [openCancel, setOpenCancel] = useState(false);
  const [openDesist, setOpenDesist] = useState(false);
  const [showCancelHint, setShowCancelHint] = useState(Boolean(cancelMatchId) && !isPlacar);
  const [state, formAction, pending] = useActionState(gerenciarCancelamentoMatch, cancelInitial);
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
      className={
        isPlacar
          ? `${cardBase} border-[color:color-mix(in_srgb,var(--eid-action-500)_38%,var(--eid-border-subtle)_62%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-action-500)_12%,var(--eid-card)_88%),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] shadow-[0_12px_24px_-14px_color-mix(in_srgb,var(--eid-action-500)_28%,transparent)]`
          : cardBase
      }
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
          className="absolute left-1/2 top-2 z-[3] inline-flex items-center justify-center rounded-md border border-red-600 bg-red-600 text-white"
            style={{
            transform: `translateX(calc(-50% + ${topActionShiftXPx}px))`,
              minHeight: "14px",
              height: "14px",
              padding: "0 7px",
              fontSize: "9px",
              lineHeight: "1",
              letterSpacing: "0.02em",
              fontWeight: 900,
              textTransform: "uppercase",
            }}
          >
            Cancelar
          </button>
        </>
      ) : null}
      {desistMatchId && !isPlacar ? (
        <button
          type="button"
          onClick={() => setOpenDesist(true)}
          className="absolute left-1/2 top-2 z-[3] inline-flex items-center justify-center rounded-md border border-amber-700 bg-amber-700 text-white"
          style={{
            transform: `translateX(calc(-50% + ${topActionShiftXPx}px))`,
            minHeight: "14px",
            height: "14px",
            padding: "0 7px",
            fontSize: "9px",
            lineHeight: "1",
            letterSpacing: "0.02em",
            fontWeight: 900,
            textTransform: "uppercase",
          }}
        >
          Cancelar e desistir
        </button>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-wide text-eid-primary-400 md:text-[10px] md:font-black">
        <span className="inline-flex items-center gap-1">
          <span aria-hidden>⏱</span>
          {formatWhen(dataRef)}
        </span>
        <span className="ml-auto text-eid-primary-300">{esporteNome}</span>
      </div>

      <div className="relative mt-3 flex items-start justify-between gap-2 md:mt-4">
        <div className="min-w-0 flex-1 pt-5 text-center">
          <p className="truncate text-sm font-bold tracking-tight text-eid-fg md:text-base md:font-black">{primeiroNome(j1Nome)}</p>
          <div className="mt-1 flex justify-center">
            {j1Id && esporteId ? (
              <div className="relative flex flex-col items-center">
                <ProfileEditDrawerTrigger
                  href={`/perfil/${j1Id}/eid/${esporteId}?from=${encodeURIComponent("/agenda")}`}
                  title={`Estatísticas EID de ${primeiroNome(j1Nome)}`}
                  fullscreen
                  topMode="backOnly"
                  className="relative block h-16 w-16 appearance-none overflow-hidden rounded-full border-0 bg-transparent p-0 shadow-none"
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
        <div className="shrink-0 self-end pb-1 text-center">
          <span className="block">
            <svg viewBox="0 0 36 36" aria-hidden className="h-[22px] w-[22px]">
              <text x="7" y="22" fontSize="14" fontWeight="900" fill="currentColor" className="text-eid-fg">
                V
              </text>
              <text x="21" y="26" fontSize="14" fontWeight="900" fill="currentColor" className="text-eid-fg">
                S
              </text>
              <path d="M22 3 16 16h4l-5 17 13-17h-4l5-13Z" fill="currentColor" className="text-eid-action-400" />
            </svg>
          </span>
        </div>
        <div className="min-w-0 flex-1 pt-5 text-center">
          <p className="truncate text-sm font-bold tracking-tight text-eid-fg md:text-base md:font-black">{primeiroNome(j2Nome)}</p>
          <div className="mt-1 flex justify-center">
            {j2Id && esporteId ? (
              <div className="relative flex flex-col items-center">
                <ProfileEditDrawerTrigger
                  href={`/perfil/${j2Id}/eid/${esporteId}?from=${encodeURIComponent("/agenda")}`}
                  title={`Estatísticas EID de ${primeiroNome(j2Nome)}`}
                  fullscreen
                  topMode="backOnly"
                  className="relative block h-16 w-16 appearance-none overflow-hidden rounded-full border-0 bg-transparent p-0 shadow-none"
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
        <p className="mt-3 text-center text-[11px] text-eid-text-secondary">
          📍 <span className="text-eid-fg/90">{localLabel}</span>
        </p>
      ) : null}

      {isPlacar ? (
        <p className="mt-2 hidden text-center text-xs text-eid-text-secondary md:mt-3 md:block">
          O oponente registrou um placar. Toque em &quot;Revisar placar&quot; para confirmar ou contestar.
        </p>
      ) : null}

      {!ctaHidden ? (
        ctaFullscreen ? (
          <ProfileEditDrawerTrigger
            href={ctaHref}
            title={ctaText}
            fullscreen
            topMode="backOnly"
            className={`${DESAFIO_FLOW_CTA_BLOCK_CLASS} mt-3 w-full text-center text-[11px] font-bold uppercase tracking-wide md:mt-4 md:min-h-[48px] md:text-xs`}
          >
            <>
              <DesafioFlowCtaIcon />
              <span>{ctaText}</span>
            </>
          </ProfileEditDrawerTrigger>
        ) : (
          <Link
            href={ctaHref}
            className={`${DESAFIO_FLOW_CTA_BLOCK_CLASS} mt-3 text-center text-[11px] font-bold uppercase tracking-wide md:mt-4 md:min-h-[48px] md:text-xs`}
          >
            <DesafioFlowCtaIcon />
            <span>{ctaText}</span>
          </Link>
        )
      ) : (
        <p className="mt-3 text-center text-[11px] font-semibold text-eid-primary-300 md:mt-4 md:text-xs">
          Data, horário e local já definidos pelo reagendamento aceito.
        </p>
      )}

      {openCancel && cancelMatchId && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 backdrop-blur-[1.5px] sm:items-center">
              <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/98 p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.78)]">
                <p className="text-sm font-black uppercase tracking-[0.08em] text-eid-primary-300">Solicitar cancelamento</p>
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
                      className="inline-flex min-h-[32px] flex-1 items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-3 text-xs font-bold text-eid-fg"
                      onClick={() => setOpenCancel(false)}
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={pending}
                      className="inline-flex min-h-[32px] flex-1 items-center justify-center rounded-lg border border-red-700 bg-red-700 px-3 text-xs font-black text-white"
                    >
                      {pending ? "Enviando..." : "Confirmar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
      {openDesist && desistMatchId && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 backdrop-blur-[1.5px] sm:items-center">
              <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/98 p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.78)]">
                <p className="text-sm font-black uppercase tracking-[0.08em] text-amber-400">Solicitar desistência</p>
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
                      className="inline-flex min-h-[32px] flex-1 items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-3 text-xs font-bold text-eid-fg"
                      onClick={() => setOpenDesist(false)}
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={pending}
                      className="inline-flex min-h-[32px] flex-1 items-center justify-center rounded-lg border border-amber-700 bg-amber-700 px-3 text-xs font-black text-white"
                    >
                      {pending ? "Enviando..." : "Confirmar"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </article>
  );
}
