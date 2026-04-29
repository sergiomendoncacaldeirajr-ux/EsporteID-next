"use client";

import { useActionState, useState } from "react";
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
  const [memberActionTarget, setMemberActionTarget] = useState<{ type: "remove" | "transfer"; userId: string } | null>(null);

  const excludeUserIds = membros.map((m) => m.usuarioId);
  const memberActionMsg = transferState.message || removeState.message;
  const memberActionOk = transferState.message ? transferState.ok : removeState.ok;

  return (
    <section className="eid-surface-panel overflow-hidden rounded-[18px] p-0">
      <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
        <p className="text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg">Gestão do elenco</p>
        <span className="inline-flex items-center gap-1 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-eid-primary-300">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
            <path d="m5.5 7.5 6.5 5 6.5-5" />
          </svg>
          Convites
        </span>
      </div>
      <div className="p-3">
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
                loadingLabel="Adicionando..."
                className="rounded-xl px-6 py-3 text-base sm:text-lg"
              />
            </form>
          </div>
        ) : null}

        <div className="mt-2.5">
          <TeamInviteComboboxForm
            timeId={timeId}
            excludeUserIds={excludeUserIds}
            inviteAction={inviteAction}
            invitePending={invitePending}
            inviteState={inviteState}
            prefillSiblingActive={Boolean(prefillConvidarUsuarioId)}
            variant="stack"
            submitLabel="Adicionar"
            submitLoadingLabel="Adicionando..."
            inputClassName="!min-h-[42px] !rounded-xl !px-3 !py-2 !text-[12px] !leading-none placeholder:!text-[12px]"
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
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
                <path d="m5.5 7.5 6.5 5 6.5-5" />
              </svg>
              Convites
            </p>
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
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="8.5" cy="8.5" r="2.5" />
                <circle cx="15.5" cy="10" r="2.2" />
                <path d="M4 18a5 5 0 0 1 9 0" />
                <path d="M13 18a4 4 0 0 1 7 0" />
              </svg>
              Membros
            </p>
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
                    <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-emerald-300">
                      {m.status}
                    </span>
                    <div className="ml-1 flex shrink-0 items-center gap-1">
                      <form
                        action={removeAction}
                        onSubmit={(e) => {
                          const ok = window.confirm("Tem certeza que deseja remover este membro da equipe?");
                          if (!ok) {
                            e.preventDefault();
                            return;
                          }
                          setMemberActionTarget({ type: "remove", userId: m.usuarioId });
                        }}
                      >
                        <input type="hidden" name="time_id" value={timeId} />
                        <input type="hidden" name="membro_usuario_id" value={m.usuarioId} />
                        <button
                          type="submit"
                          disabled={removePending || transferPending}
                          className="inline-flex h-[22px] items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/12 px-2 text-[8px] font-black uppercase leading-none tracking-[0.04em] text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-60"
                        >
                          {removePending && memberActionTarget?.type === "remove" && memberActionTarget.userId === m.usuarioId
                            ? "Removendo..."
                            : "Remover"}
                        </button>
                      </form>
                      <form
                        action={transferAction}
                        onSubmit={(e) => {
                          const ok = window.confirm("Tem certeza que deseja transferir a liderança para este membro?");
                          if (!ok) {
                            e.preventDefault();
                            return;
                          }
                          setMemberActionTarget({ type: "transfer", userId: m.usuarioId });
                        }}
                      >
                        <input type="hidden" name="time_id" value={timeId} />
                        <input type="hidden" name="novo_lider_usuario_id" value={m.usuarioId} />
                        <button
                          type="submit"
                          disabled={removePending || transferPending}
                          className="inline-flex h-[22px] items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 text-[8px] font-black uppercase leading-none tracking-[0.04em] text-eid-primary-300 transition hover:bg-eid-primary-500/20 disabled:opacity-60"
                        >
                          {transferPending && memberActionTarget?.type === "transfer" && memberActionTarget.userId === m.usuarioId
                            ? "Transferindo..."
                            : "Liderança"}
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
          <div className="mt-3 rounded-xl border border-[#C9D8F6] bg-[#EFF5FF] px-3 py-2">
            <p className="inline-flex items-start gap-1.5 text-[11px] leading-snug text-[#556987]">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-black text-white">i</span>
              Dica de gestão: mantenha seu elenco atualizado para facilitar a comunicação e a organização da equipe.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
