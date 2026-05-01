"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { cancelarConviteDaEquipe, convidarUsuarioParaEquipe, type TeamActionState } from "@/app/times/actions";
import { TeamInviteComboboxForm } from "@/components/times/team-invite-combobox-form";
import { EidCancelButton } from "@/components/ui/eid-cancel-button";
import { EidCityState } from "@/components/ui/eid-city-state";
import { emitEidSocialDataRefresh } from "@/lib/comunidade/social-panel-layout";

const initial: TeamActionState = { ok: false, message: "" };

export type TeamPublicPendingInvite = {
  conviteId: number;
  nome: string;
  avatarUrl: string | null;
  localizacao: string | null;
};

/** Convite na página pública da equipe (líder): campo largo + sugestões após 3 letras. */
export function TeamPublicInviteBlock({
  timeId,
  excludeUserIds,
  pendingInvites = [],
  collapsibleTrigger = false,
  addParticipantLabel = "Adicionar participante",
}: {
  timeId: number;
  excludeUserIds: string[];
  pendingInvites?: TeamPublicPendingInvite[];
  /** Ex.: perfil público — botão tracejado abre o formulário de convite. */
  collapsibleTrigger?: boolean;
  addParticipantLabel?: string;
}) {
  const router = useRouter();
  const [inviteState, inviteAction, invitePending] = useActionState(convidarUsuarioParaEquipe, initial);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [pendingCancelConviteId, setPendingCancelConviteId] = useState<number | null>(null);
  const [painelAberto, setPainelAberto] = useState(
    () => !collapsibleTrigger || pendingInvites.length > 0,
  );
  const mostrarPainel = !collapsibleTrigger || painelAberto;

  async function handleCancelarConvite(conviteId: number) {
    if (pendingCancelConviteId != null) return;
    setPendingCancelConviteId(conviteId);
    setCancelError(null);
    try {
      const fd = new FormData();
      fd.set("time_id", String(timeId));
      fd.set("convite_id", String(conviteId));
      const res = await cancelarConviteDaEquipe(undefined, fd);
      if (!res.ok) {
        setCancelError(res.message);
        return;
      }
      emitEidSocialDataRefresh();
      router.refresh();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Não foi possível cancelar o convite.");
    } finally {
      setPendingCancelConviteId(null);
    }
  }

  return (
    <div className="space-y-3">
      {collapsibleTrigger && !painelAberto ? (
        <button
          type="button"
          onClick={() => setPainelAberto(true)}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[color:color-mix(in_srgb,var(--eid-primary-500)_45%,var(--eid-border-subtle)_55%)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_4%,transparent)] px-4 text-[13px] font-semibold text-eid-primary-400 transition hover:border-eid-primary-500/55 hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eid-primary-500/45"
        >
          <UserPlus className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
          {addParticipantLabel}
        </button>
      ) : null}

      {mostrarPainel ? (
    <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/35 p-3 sm:p-4">
      <TeamInviteComboboxForm
        timeId={timeId}
        excludeUserIds={excludeUserIds}
        inviteAction={inviteAction}
        invitePending={invitePending}
        inviteState={inviteState}
        submitLabel="Convidar"
        variant="stack"
      />
      {inviteState.message ? (
        <p
          className={`mt-2 text-xs ${inviteState.ok ? "text-eid-primary-700 dark:text-eid-primary-300" : "text-red-700 dark:text-red-300"}`}
        >
          {inviteState.message}
        </p>
      ) : null}

      {pendingInvites.length > 0 ? (
        <div className="mt-4 border-t border-[color:var(--eid-border-subtle)] pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Convites pendentes</p>
          {cancelError ? (
            <p className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200">{cancelError}</p>
          ) : null}
          <ul className="mt-2 grid gap-2">
            {pendingInvites.map((inv) => (
              <li
                key={inv.conviteId}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-2"
              >
                {inv.avatarUrl ? (
                  <img
                    src={inv.avatarUrl}
                    alt=""
                    className="h-9 w-9 rounded-full border border-[color:var(--eid-border-subtle)] object-cover"
                  />
                ) : (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300">
                    {inv.nome.trim().slice(0, 1).toUpperCase() || "?"}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold text-eid-fg">{inv.nome}</p>
                  <EidCityState location={inv.localizacao} compact align="start" emptyLabel="—" className="w-full" />
                </div>
                <div className="flex w-full justify-start sm:ml-auto sm:w-auto sm:justify-end">
                  <EidCancelButton
                    type="button"
                    compact
                    loading={pendingCancelConviteId === inv.conviteId}
                    label="Cancelar convite"
                    className="w-full rounded-lg !min-h-[24px] text-[9px] sm:w-auto sm:shrink-0"
                    disabled={invitePending || pendingCancelConviteId != null}
                    onClick={() => void handleCancelarConvite(inv.conviteId)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
      ) : null}
    </div>
  );
}
