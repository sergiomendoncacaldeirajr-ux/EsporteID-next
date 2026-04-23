"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { convidarUsuarioParaEquipe, type TeamActionState } from "@/app/times/actions";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { PROFILE_CARD_BASE, PROFILE_CARD_PAD_MD } from "@/components/perfil/profile-ui-tokens";

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
      <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
        <p className="text-center text-[11px] text-eid-text-secondary">
          Com esportes no EID, dá para convidar <span className="font-medium text-eid-fg">{primeiro}</span> para sua dupla/time no mesmo esporte.
        </p>
      </div>
    );
  }

  return (
    <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} space-y-2.5`}>
      {eligibleTeams.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-center text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">Convidar · seu esporte</p>
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
                  <button
                    type="submit"
                    disabled={pending}
                    className="eid-btn-primary shrink-0 rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wide disabled:opacity-60"
                  >
                    {pending ? "…" : "Convidar"}
                  </button>
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
          className="mx-auto flex min-h-10 w-full max-w-sm items-center justify-center rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/12 px-3 text-center text-[11px] font-bold uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/55 hover:bg-eid-primary-500/18"
        >
          Criar dupla ou time e convidar {primeiro}
        </ProfileEditDrawerTrigger>
      </div>
    </div>
  );
}
