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
import { DESAFIO_FLOW_CTA_BLOCK_CLASS } from "@/lib/desafio/flow-ui";
import { EidSocialAceitarButton, EidSocialRecusarButton } from "@/components/ui/eid-social-acao-buttons";
import { createPortal } from "react-dom";
import { EidCancelButton } from "@/components/ui/eid-cancel-button";
import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import type { PartidaAgendaFormacaoLado } from "@/lib/agenda/partida-formacao-lado";
import { iniciaisFormacaoNome } from "@/lib/comunidade/iniciais-formacao";

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
  /** Query `from=` nos links de EID (ex.: `/comunidade` no painel). */
  perfilEidFrom?: string;
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
  "rounded-2xl border border-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-2.5 shadow-none backdrop-blur-sm transition md:p-4";

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
  perfilEidFrom = "/agenda",
}: Props) {
  const isPlacar = variant === "placar";
  const [openCancel, setOpenCancel] = useState(false);
  const [openDesist, setOpenDesist] = useState(false);
  const [agendaActionClicked, setAgendaActionClicked] = useState<"accept" | "reject" | null>(null);
  const [state, formAction, pending] = useActionState(gerenciarCancelamentoMatch, cancelInitial);
  const [agendaState, agendaAction, agendaPending] = useActionState(responderAgendamentoPartidaAction, agendaInitial);
  useEffect(() => {
    if (state.ok) setOpenCancel(false);
    if (state.ok) setOpenDesist(false);
  }, [state.ok]);
  const ctaHref =
    href ??
    (isPlacar ? `/registrar-placar/${id}?from=/comunidade` : `/registrar-placar/${id}?modo=agenda`);
  const ctaText = ctaLabel ?? (isPlacar ? "Revisar resultado" : "Agendar data e local");
  const fromPath = perfilEidFrom;

  function tituloLado(formacao: PartidaAgendaFormacaoLado | undefined, nomePerfil: string | null) {
    if (formacao?.nome) return formacao.nome;
    return primeiroNome(nomePerfil);
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
                className={`relative block appearance-none overflow-hidden border-0 bg-transparent p-0 shadow-none ${
                  isTime ? "h-14 w-14 rounded-xl md:h-16 md:w-16" : "h-14 w-14 rounded-full md:h-16 md:w-16"
                }`}
              >
                {formacao?.escudoUrl ? (
                  <Image
                    src={formacao.escudoUrl}
                    alt=""
                    fill
                    unoptimized
                    className={`h-full w-full border-0 !object-cover object-center shadow-none ${
                      isTime ? "rounded-xl ring-1 ring-[color:var(--eid-border-subtle)]" : "rounded-full"
                    }`}
                  />
                ) : !formacao && userId && avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    fill
                    unoptimized
                    className="h-full w-full rounded-full border-0 !object-cover object-center shadow-none"
                  />
                ) : (
                  <div
                    className={`flex h-full w-full items-center justify-center border-[3px] border-eid-card bg-gradient-to-br from-eid-primary-700 to-eid-primary-900 text-[8px] font-black tracking-widest text-eid-primary-200 shadow-[0_0_0_2px_rgba(249,115,22,0.55),0_6px_20px_rgba(0,0,0,0.5)] ${
                      isTime ? "rounded-xl" : "rounded-full"
                    }`}
                  >
                    {iniciaisFormacaoNome(isTime ? formacao?.nome : nomePerfil).slice(0, 2) || "?"}
                  </div>
                )}
              </ProfileEditDrawerTrigger>
              <div className="-mt-0.5">
                <ProfileEidPerformanceSeal notaEid={notaEid} compact className="scale-150" />
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
        <div className="shrink-0 self-end pb-0.5 text-center">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-eid-action-500/35 bg-eid-action-500/12 text-[9px] font-black uppercase tracking-[0.08em] text-eid-action-300 shadow-[0_6px_16px_-10px_rgba(249,115,22,0.6)] md:h-8 md:w-8 md:text-[10px]">
            VS
          </span>
        </div>
        {renderLadoCol(formacaoJ2, j2Nome, j2Id ?? null, j2AvatarUrl, Number(j2NotaEid ?? 0))}
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
            <EidPendingBadge label="Agendamento pendente" />
            <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_65%,var(--eid-primary-500)_35%)]">
              {ocultarFluxoAgendamento ? "Status" : "Responder"}
            </span>
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
          <p className="text-[10px] font-semibold leading-snug text-eid-text-secondary md:text-xs">
            {somenteLeituraElenco
              ? "Você acompanha como membro do elenco. O líder define data e local e lança o resultado no Painel."
              : agendamentoPendente
                ? "Agendamento enviado. Aguardando aceite do oponente."
                : "Data, horário e local já definidos pelo reagendamento aceito."}
          </p>
        </div>
      )}

      {!isPlacar &&
      !ocultarFluxoCancelamento &&
      (cancelMatchId || desistMatchId) &&
      !somenteLeituraElenco ? (
        <div className="mt-3 border-t border-transparent pt-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {cancelMatchId && !desistMatchId ? (
              <EidCancelButton
                type="button"
                compact
                inline
                label="Cancelar"
                className="shrink-0 !min-h-[28px] rounded-lg !px-2.5 active:scale-[0.98]"
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
      ) : null}

      {!ocultarFluxoCancelamento &&
      openCancel &&
      cancelMatchId &&
      typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 backdrop-blur-[1.5px] sm:items-center">
              <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/98 p-0 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.78)]">
                <div className="border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-4 py-2">
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
                <div className="flex items-center justify-between gap-2 border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-4 py-2">
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
