"use client";

import { useActionState } from "react";
import { convidarUsuarioParaEquipe, type TeamActionState } from "@/app/times/actions";
import { TeamInviteComboboxForm } from "@/components/times/team-invite-combobox-form";

const initial: TeamActionState = { ok: false, message: "" };

/** Convite na página pública da equipe (líder): campo largo + sugestões após 3 letras. */
export function TeamPublicInviteBlock({ timeId, excludeUserIds }: { timeId: number; excludeUserIds: string[] }) {
  const [inviteState, inviteAction, invitePending] = useActionState(convidarUsuarioParaEquipe, initial);

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
    </div>
  );
}
