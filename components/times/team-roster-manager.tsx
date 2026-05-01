"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  cancelarConviteDaEquipe,
  convidarUsuarioParaEquipe,
  removerMembroDaEquipe,
  transferirLiderancaDaEquipe,
  type TeamActionState,
} from "@/app/times/actions";
import { TeamInviteComboboxForm } from "@/components/times/team-invite-combobox-form";
import { TransferirLiderancaConfirmPanel } from "@/components/times/transferir-lideranca-confirm-panel";
import { EidCancelButton } from "@/components/ui/eid-cancel-button";
import { EidCityState } from "@/components/ui/eid-city-state";
import { EidInviteButton } from "@/components/ui/eid-invite-button";
import { eidPostRevalidateCurrentAndBroadcast } from "@/lib/realtime/eid-route-refresh-client";

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
  liderUsuarioId,
  membros,
  convites,
  rosterCount,
  rosterCap,
  tipoFormacao,
  prefillConvidarUsuarioId = null,
  prefillConvidarNome = null,
}: {
  timeId: number;
  /** `times.criador_id`: não exibir Remover / transferir liderança para a própria linha do líder. */
  liderUsuarioId: string;
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
  const router = useRouter();
  const [inviteState, inviteAction, invitePending] = useActionState(convidarUsuarioParaEquipe, initial);
  const [removeState, removeAction, removePending] = useActionState(removerMembroDaEquipe, initial);
  const [transferState, transferAction, transferPending] = useActionState(transferirLiderancaDaEquipe, initial);
  const [cancelInviteError, setCancelInviteError] = useState<string | null>(null);
  const [pendingCancelConviteId, setPendingCancelConviteId] = useState<number | null>(null);
  const [memberActionTarget, setMemberActionTarget] = useState<{ type: "remove" | "transfer"; userId: string } | null>(null);
  const [transferConfirm, setTransferConfirm] = useState<{
    userId: string;
    nome: string;
    avatarUrl: string | null;
  } | null>(null);

  useEffect(() => {
    if (!transferState.ok || !transferState.message) return;
    let cancelled = false;
    void (async () => {
      await eidPostRevalidateCurrentAndBroadcast();
      if (cancelled) return;
      router.refresh();
      if (cancelled) return;
      window.setTimeout(() => {
        setTransferConfirm(null);
        setMemberActionTarget(null);
      }, 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [transferState.ok, transferState.message, router]);

  useEffect(() => {
    if (!removeState.ok || !removeState.message) return;
    let cancelled = false;
    void (async () => {
      await eidPostRevalidateCurrentAndBroadcast();
      if (cancelled) return;
      router.refresh();
      if (cancelled) return;
      window.setTimeout(() => setMemberActionTarget(null), 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [removeState.ok, removeState.message, router]);

  async function handleCancelarConvite(conviteId: number) {
    if (pendingCancelConviteId != null) return;
    setPendingCancelConviteId(conviteId);
    setCancelInviteError(null);
    try {
      const fd = new FormData();
      fd.set("time_id", String(timeId));
      fd.set("convite_id", String(conviteId));
      const res = await cancelarConviteDaEquipe(undefined, fd);
      if (!res.ok) {
        setCancelInviteError(res.message);
        return;
      }
      await eidPostRevalidateCurrentAndBroadcast();
      router.refresh();
    } catch (e) {
      setCancelInviteError(e instanceof Error ? e.message : "Não foi possível cancelar o convite.");
    } finally {
      setPendingCancelConviteId(null);
    }
  }

  const excludeUserIds = membros.map((m) => m.usuarioId);
  const memberActionMsg = transferState.message || removeState.message;
  const memberActionOk = transferState.message ? transferState.ok : removeState.ok;
  const hideMemberMsgForTransferPanel =
    Boolean(transferConfirm) && Boolean(transferState.message) && !transferState.ok;

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
            {cancelInviteError ? (
              <p className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200">{cancelInviteError}</p>
            ) : null}
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
                        <div className="w-full sm:ml-auto sm:w-auto">
                          <EidCancelButton
                            type="button"
                            compact
                            loading={pendingCancelConviteId === c.conviteId}
                            label="Cancelar convite"
                            className="w-full rounded-lg !min-h-[24px] text-[9px]"
                            disabled={invitePending || pendingCancelConviteId != null}
                            onClick={() => void handleCancelarConvite(c.conviteId)}
                          />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1 text-[11px] text-eid-text-secondary">Nenhum convite pendente.</p>
            )}
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
            {memberActionMsg && !hideMemberMsgForTransferPanel ? (
              <p
                className={`mt-2 text-xs ${memberActionOk ? "text-eid-primary-700 dark:text-eid-primary-300" : "text-red-700 dark:text-red-300"}`}
              >
                {memberActionMsg}
              </p>
            ) : null}
            {membros.length > 0 ? (
              <ul className="mt-2 grid gap-2">
                {membros.map((m) => {
                  const isLiderAtual =
                    Boolean(liderUsuarioId) && m.usuarioId === liderUsuarioId;
                  return (
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
                      {isLiderAtual ? (
                        <span className="ml-1 shrink-0 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-eid-primary-300">
                          Líder
                        </span>
                      ) : (
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
                          <button
                            type="button"
                            disabled={removePending || transferPending}
                            onClick={() =>
                              setTransferConfirm({ userId: m.usuarioId, nome: m.nome, avatarUrl: m.avatarUrl })
                            }
                            className="inline-flex h-[22px] items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 text-[8px] font-black uppercase leading-none tracking-[0.04em] text-eid-primary-300 transition hover:bg-eid-primary-500/20 disabled:opacity-60"
                          >
                            Liderança
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1 text-[11px] text-eid-text-secondary">Sem membros ativos no momento.</p>
            )}
            {transferConfirm ? (
              <div className="mt-3 space-y-2">
                <TransferirLiderancaConfirmPanel
                  novoLiderNome={transferConfirm.nome}
                  novoLiderAvatarUrl={transferConfirm.avatarUrl}
                  formacaoTipo={tipoFormacao}
                  actions={
                    <>
                      <EidCancelButton
                        type="button"
                        compact
                        disabled={transferPending}
                        label="Cancelar"
                        className="!w-full border-[color:color-mix(in_srgb,var(--eid-border-subtle)_70%,transparent)] bg-eid-surface/60 text-eid-fg hover:bg-eid-surface sm:!w-auto sm:min-w-[7.5rem]"
                        onClick={() => {
                          setTransferConfirm(null);
                          setMemberActionTarget(null);
                        }}
                      />
                      <form
                        action={transferAction}
                        className="w-full sm:w-auto sm:min-w-[12rem]"
                        onSubmit={() => {
                          setMemberActionTarget({ type: "transfer", userId: transferConfirm.userId });
                        }}
                      >
                        <input type="hidden" name="time_id" value={timeId} />
                        <input type="hidden" name="novo_lider_usuario_id" value={transferConfirm.userId} />
                        <button
                          type="submit"
                          disabled={transferPending}
                          className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/14 px-4 text-[12px] font-black uppercase tracking-[0.06em] text-eid-primary-300 transition hover:bg-eid-primary-500/22 disabled:opacity-60 eid-light:border-sky-300 eid-light:bg-sky-600 eid-light:text-white eid-light:hover:bg-sky-700"
                        >
                          {transferPending && memberActionTarget?.type === "transfer" && memberActionTarget.userId === transferConfirm.userId ? (
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-eid-primary-400 border-t-transparent eid-light:border-white eid-light:border-t-transparent"
                                aria-hidden
                              />
                              Transferindo…
                            </span>
                          ) : (
                            "Confirmar transferência"
                          )}
                        </button>
                      </form>
                    </>
                  }
                />
                {transferState.message && !transferState.ok ? (
                  <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200 eid-light:text-red-800">
                    {transferState.message}
                  </p>
                ) : null}
              </div>
            ) : null}
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
