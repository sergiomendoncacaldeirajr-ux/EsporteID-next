"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { convidarUsuarioParaEquipe, type TeamActionState } from "@/app/times/actions";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { PROFILE_CARD_BASE, PROFILE_CARD_PAD_MD } from "@/components/perfil/profile-ui-tokens";
import { EID_INVITE_ACTION_CLASS, EidInviteButton } from "@/components/ui/eid-invite-button";

const initial: TeamActionState = { ok: false, message: "" };

export type EligibleFormation = {
  id: number;
  nome: string;
  tipo: string | null;
  esporteNome: string;
};

type Props = {
  targetUserId: string;
  targetNome: string;
  targetHasEsportes: boolean;
  eligibleTeams: EligibleFormation[];
  viewerHasAnyLiderTeam: boolean;
  perfilPath: string;
};

function primeiroNome(nome: string) {
  const p = nome.trim().split(/\s+/)[0];
  return p || nome;
}

export function ProfileConviteFormacaoCta({
  targetUserId,
  targetNome,
  targetHasEsportes,
  eligibleTeams,
  viewerHasAnyLiderTeam,
  perfilPath,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(convidarUsuarioParaEquipe, initial);
  const primeiro = primeiroNome(targetNome);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const cadastrarHref = `/editar/equipes/cadastrar?from=${encodeURIComponent(perfilPath)}&convidar=${encodeURIComponent(targetUserId)}`;

  if (!targetHasEsportes) {
    return (
      <div className={`overflow-hidden ${PROFILE_CARD_BASE}`}>
        <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Convites</p>
          <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-action-400">
            Indisponível
          </span>
        </div>
        <div className={PROFILE_CARD_PAD_MD}>
        <p className="text-center text-[11px] text-eid-text-secondary">
          Com esportes no EID, dá para convidar <span className="font-medium text-eid-fg">{primeiro}</span> para sua dupla/time no mesmo esporte.
        </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${PROFILE_CARD_BASE}`}>
      <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Convites para formação</p>
        <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
          Dupla/Time
        </span>
      </div>
      <div className={`${PROFILE_CARD_PAD_MD} space-y-2.5`}>
      {eligibleTeams.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Convidar · seu esporte</p>
          <ul className="grid gap-2">
            {eligibleTeams.map((t) => (
              <li key={t.id}>
                <form action={formAction} className="flex flex-wrap items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-2">
                  <input type="hidden" name="time_id" value={String(t.id)} />
                  <input type="hidden" name="convidado_usuario_id" value={targetUserId} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold text-eid-fg">{t.nome}</p>
                    <p className="truncate text-[10px] text-eid-text-secondary">
                      {(t.tipo ?? "time").toLowerCase() === "dupla" ? "Dupla" : "Time"} · {t.esporteNome}
                    </p>
                  </div>
                  <EidInviteButton
                    type="submit"
                    loading={pending}
                    label="Convidar"
                    loadingLabel="Enviando..."
                    compact
                    className="shrink-0 rounded-xl"
                  />
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {eligibleTeams.length === 0 && viewerHasAnyLiderTeam ? (
        <p className="text-center text-[11px] text-eid-text-secondary">
          Suas formações não batem no esporte EID de {primeiro}. Ajuste o esporte na formação ou peça para incluir no perfil.
        </p>
      ) : null}

      {eligibleTeams.length === 0 && !viewerHasAnyLiderTeam ? (
        <p className="text-center text-[11px] text-eid-text-secondary">Crie uma formação como líder para convidar {primeiro}.</p>
      ) : null}

      {state.message ? (
        <p className={`text-center text-xs leading-snug ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}

      <div className="border-t border-[color:var(--eid-border-subtle)] pt-2.5">
        <ProfileEditDrawerTrigger
          href={cadastrarHref}
          title="Nova formação"
          className={`${EID_INVITE_ACTION_CLASS} mx-auto flex min-h-10 w-full max-w-sm rounded-xl px-3 text-center text-[11px] font-black uppercase tracking-wide`}
        >
          Criar dupla ou time e convidar {primeiro}
        </ProfileEditDrawerTrigger>
      </div>
      </div>
    </div>
  );
}
