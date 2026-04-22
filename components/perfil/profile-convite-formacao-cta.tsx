"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { convidarUsuarioParaEquipe, type TeamActionState } from "@/app/times/actions";
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

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const timesHref = `/times?create=1&from=${encodeURIComponent(perfilPath)}&convidar=${encodeURIComponent(targetUserId)}`;

  if (!targetHasEsportes) {
    return (
      <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD}`}>
        <p className="text-[11px] leading-relaxed text-eid-text-secondary">
          Quando <span className="font-semibold text-eid-fg">{targetNome}</span> configurar pelo menos um esporte no EID, você poderá convidar para a sua dupla ou time no mesmo esporte.
        </p>
      </div>
    );
  }

  return (
    <div className={`${PROFILE_CARD_BASE} ${PROFILE_CARD_PAD_MD} space-y-3`}>
      <p className="text-[11px] leading-relaxed text-eid-text-secondary">
        {targetNome} ainda não está em dupla nem time na plataforma. Envie um convite da sua formação (você precisa ser líder). A pessoa recebe o pedido em{" "}
        <Link href="/comunidade" className="font-semibold text-eid-primary-400 underline-offset-2 hover:underline">
          Social
        </Link>{" "}
        e pode aceitar ou recusar.
      </p>

      {eligibleTeams.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Suas formações (mesmo esporte no EID)</p>
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
      ) : viewerHasAnyLiderTeam ? (
        <p className="rounded-xl border border-eid-action-500/25 bg-eid-action-500/8 px-3 py-2 text-[11px] text-eid-text-secondary">
          Você já lidera formações, mas nenhuma está no mesmo esporte que este atleta cadastrou no EID. Crie uma nova dupla ou time no esporte certo ou peça para a pessoa adicionar o esporte no perfil.
        </p>
      ) : null}

      <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">Não tem dupla/time ainda?</p>
        <Link
          href={timesHref}
          className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/12 px-3 text-center text-[11px] font-bold uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/55 hover:bg-eid-primary-500/18"
        >
          Criar dupla ou time e convidar {targetNome.split(" ")[0] ?? "esta pessoa"}
        </Link>
        <p className="mt-2 text-[10px] text-eid-text-secondary">
          Depois de criar, abrimos a edição da formação para você enviar o convite automaticamente.
        </p>
      </div>

      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </div>
  );
}
