"use client";

import { useActionState } from "react";
import {
  cancelarConviteDaEquipe,
  convidarUsuarioParaEquipe,
  removerMembroDaEquipe,
  transferirLiderancaDaEquipe,
  type TeamActionState,
} from "@/app/times/actions";
import { TeamInviteComboboxForm } from "@/components/times/team-invite-combobox-form";
import { EidCancelButton } from "@/components/ui/eid-cancel-button";
import { EidCityState } from "@/components/ui/eid-city-state";
import { EidInviteButton } from "@/components/ui/eid-invite-button";

const initial: TeamActionState = { ok: false, message: "" };

type MemberItem = {
  usuarioId: string;
  nome: string;
  avatarUrl: string | null;
  localizacao: string | null;
  status: string;
  cargo: string | null;
};

type InviteItem = {
  conviteId: number;
  nome: string;
  avatarUrl: string | null;
  localizacao: string | null;
  status: string;
};

export function TeamRosterManager({
  timeId,
  membros,
  convites,
  rosterCount,
  rosterCap,
  tipoFormacao,
  prefillConvidarUsuarioId = null,
  prefillConvidarNome = null,
}: {
  timeId: number;
  membros: MemberItem[];
  convites: InviteItem[];
  /** Tamanho atual do elenco (líder + membros ativos, contagem distinta). */
  rosterCount: number;
  /** Máximo: 2 dupla, 18 time. */
  rosterCap: number;
  tipoFormacao: "dupla" | "time";
  prefillConvidarUsuarioId?: string | null;
  prefillConvidarNome?: string | null;
}) {
  const [inviteState, inviteAction, invitePending] = useActionState(convidarUsuarioParaEquipe, initial);
  const [cancelInviteState, cancelInviteAction, cancelInvitePending] = useActionState(cancelarConviteDaEquipe, initial);
  const [removeState, removeAction, removePending] = useActionState(removerMembroDaEquipe, initial);
  const [transferState, transferAction, transferPending] = useActionState(transferirLiderancaDaEquipe, initial);

  const excludeUserIds = membros.map((m) => m.usuarioId);
  const memberActionMsg = transferState.message || removeState.message;
  const memberActionOk = transferState.message ? transferState.ok : removeState.ok;

  return (
    <section className="eid-surface-panel overflow-hidden rounded-2xl p-0">
      <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Gestão do elenco</p>
        <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
          Convites
        </span>
      </div>
      <div className="p-3 sm:p-4">
        <p className="text-[11px] text-eid-text-secondary">
          Digite pelo menos 3 letras do nome ou do @ para ver sugestões, ou informe o @ manualmente.{" "}
          <span className="font-semibold text-eid-fg">
            {tipoFormacao === "dupla" ? "Dupla" : "Time"}: elenco {rosterCount}/{rosterCap} (inclui o líder). Para convidar
            alguém novo com elenco cheio, remova um membro antes.
          </span>
        </p>

        {prefillConvidarUsuarioId ? (
          <div className="mt-3 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-eid-primary-300">Convite rápido</p>
            <p className="mt-1 text-[11px] text-eid-text-secondary">
              Enviar convite para <span className="font-semibold text-eid-fg">{prefillConvidarNome ?? "atleta"}</span> entrar nesta formação.
            </p>
            <form action={inviteAction} className="mt-2 flex justify-start">
              <input type="hidden" name="time_id" value={timeId} />
              <input type="hidden" name="convidado_usuario_id" value={prefillConvidarUsuarioId} />
              <EidInviteButton
                type="submit"
                loading={invitePending}
                label="Enviar convite"
                className="rounded-xl px-6 py-3 text-base sm:text-lg"
              />
            </form>
          </div>
        ) : null}

        <div className="mt-3">
          <TeamInviteComboboxForm
            timeId={timeId}
            excludeUserIds={excludeUserIds}
            inviteAction={inviteAction}
            invitePending={invitePending}
            inviteState={inviteState}
            prefillSiblingActive={Boolean(prefillConvidarUsuarioId)}
          />
        </div>
        {inviteState.message ? (
          <p
            className={`mt-2 text-xs ${inviteState.ok ? "text-eid-primary-700 dark:text-eid-primary-300" : "text-red-700 dark:text-red-300"}`}
          >
            {inviteState.message}
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Convites</p>
            {convites.length > 0 ? (
              <ul className="mt-2 grid gap-2">
                {convites.map((c) => {
                  const pendente = String(c.status ?? "").trim().toLowerCase() === "pendente";
                  return (
                    <li
                      key={c.conviteId}
                      className="eid-list-item flex flex-wrap items-center gap-2 rounded-xl bg-eid-card/55 p-2"
                    >
                      {c.avatarUrl ? (
                        <img
                          src={c.avatarUrl}
                          alt={c.nome}
                          className="h-9 w-9 rounded-full border border-[color:var(--eid-border-subtle)] object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300">
                          {c.nome.trim().slice(0, 1).toUpperCase() || "A"}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold text-eid-fg">{c.nome}</p>
                        <EidCityState location={c.localizacao} compact align="start" className="w-full" />
                      </div>
                      <span className="rounded-full border border-[color:var(--eid-border-subtle)] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-eid-fg">
                        {c.status}
                      </span>
                      {pendente ? (
                        <form action={cancelInviteAction} className="w-full sm:ml-auto sm:w-auto">
                          <input type="hidden" name="time_id" value={timeId} />
                          <input type="hidden" name="convite_id" value={c.conviteId} />
                          <EidCancelButton
                            type="submit"
                            compact
                            loading={cancelInvitePending}
                            label="Cancelar convite"
                            className="w-full rounded-lg !min-h-[24px] text-[9px]"
                            disabled={invitePending}
                          />
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1 text-[11px] text-eid-text-secondary">Nenhum convite pendente.</p>
            )}
            {cancelInviteState.message ? (
              <p
                className={`mt-2 text-xs ${cancelInviteState.ok ? "text-eid-primary-700 dark:text-eid-primary-300" : "text-red-700 dark:text-red-300"}`}
              >
                {cancelInviteState.message}
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Membros</p>
            {memberActionMsg ? (
              <p
                className={`mt-2 text-xs ${memberActionOk ? "text-eid-primary-700 dark:text-eid-primary-300" : "text-red-700 dark:text-red-300"}`}
              >
                {memberActionMsg}
              </p>
            ) : null}
            {membros.length > 0 ? (
              <ul className="mt-2 grid gap-2">
                {membros.map((m) => (
                  <li key={m.usuarioId} className="eid-list-item flex items-center gap-2 rounded-xl bg-eid-card/55 p-2">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.nome} className="h-9 w-9 rounded-full border border-[color:var(--eid-border-subtle)] object-cover" />
                    ) : (
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300">
                        {m.nome.trim().slice(0, 1).toUpperCase() || "A"}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-eid-fg">{m.nome}</p>
                      <EidCityState location={m.localizacao} compact align="start" className="w-full" />
                    </div>
                    <span className="rounded-full border border-[color:var(--eid-border-subtle)] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-eid-fg">
                      {m.status}
                    </span>
                    <div className="ml-1 flex shrink-0 items-center gap-1">
                      <form action={removeAction}>
                        <input type="hidden" name="time_id" value={timeId} />
                        <input type="hidden" name="membro_usuario_id" value={m.usuarioId} />
                        <button
                          type="submit"
                          disabled={removePending || transferPending}
                          className="inline-flex h-[18px] items-center justify-center rounded-full border border-rose-600/90 bg-rose-600 px-1.5 text-[8px] font-black uppercase leading-none tracking-[0.04em] text-white transition hover:bg-rose-700 disabled:opacity-60"
                        >
                          Remover
                        </button>
                      </form>
                      <form action={transferAction}>
                        <input type="hidden" name="time_id" value={timeId} />
                        <input type="hidden" name="novo_lider_usuario_id" value={m.usuarioId} />
                        <button
                          type="submit"
                          disabled={removePending || transferPending}
                          className="inline-flex h-[18px] items-center justify-center rounded-full border border-emerald-600/90 bg-emerald-600 px-1.5 text-[8px] font-black uppercase leading-none tracking-[0.04em] text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Liderança
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[11px] text-eid-text-secondary">Sem membros ativos no momento.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
