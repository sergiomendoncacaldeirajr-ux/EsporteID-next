"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  cancelarConviteDaEquipe,
  convidarUsuarioParaEquipe,
  type TeamActionState,
} from "@/app/times/actions";
import { TeamInviteComboboxForm } from "@/components/times/team-invite-combobox-form";

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
}: {
  timeId: number;
  excludeUserIds: string[];
  pendingInvites?: TeamPublicPendingInvite[];
}) {
  const [inviteState, inviteAction, invitePending] = useActionState(convidarUsuarioParaEquipe, initial);
  const [cancelInviteState, cancelInviteAction, cancelInvitePending] = useActionState(cancelarConviteDaEquipe, initial);

  return (
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
                  <p className="truncate text-[9px] text-eid-text-secondary">{inv.localizacao ?? "—"}</p>
                </div>
                <form action={cancelInviteAction} className="w-full sm:ml-auto sm:w-auto">
                  <input type="hidden" name="time_id" value={timeId} />
                  <input type="hidden" name="convite_id" value={inv.conviteId} />
                  <button
                    type="submit"
                    disabled={cancelInvitePending || invitePending}
                    className="inline-flex min-h-[36px] w-full items-center justify-center rounded-lg border border-rose-600/80 bg-rose-600/15 px-3 text-[10px] font-black uppercase tracking-[0.06em] text-red-700 transition hover:bg-rose-600/25 disabled:opacity-60 dark:text-red-300"
                  >
                    {cancelInvitePending ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        Cancelando...
                      </span>
                    ) : (
                      "Cancelar convite"
                    )}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {cancelInviteState.message ? (
        <p
          className={`mt-2 text-xs ${cancelInviteState.ok ? "text-eid-primary-700 dark:text-eid-primary-300" : "text-red-700 dark:text-red-300"}`}
        >
          {cancelInviteState.message}
        </p>
      ) : null}
    </div>
  );
}
