"use client";

import { useActionState } from "react";
import { convidarUsuarioParaEquipe, type TeamActionState } from "@/app/times/actions";

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
  prefillConvidarUsuarioId = null,
  prefillConvidarNome = null,
}: {
  timeId: number;
  membros: MemberItem[];
  convites: InviteItem[];
  prefillConvidarUsuarioId?: string | null;
  prefillConvidarNome?: string | null;
}) {
  const [inviteState, inviteAction, invitePending] = useActionState(convidarUsuarioParaEquipe, initial);

  return (
    <section className="eid-surface-panel overflow-hidden rounded-2xl p-0">
      <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Gestão do elenco</p>
        <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
          Convites
        </span>
      </div>
      <div className="p-3 sm:p-4">
      <p className="text-[11px] text-eid-text-secondary">Adicione atletas por @username e acompanhe status de pendente/aprovado.</p>

      {prefillConvidarUsuarioId ? (
        <div className="mt-3 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-eid-primary-300">Convite rápido</p>
          <p className="mt-1 text-[11px] text-eid-text-secondary">
            Enviar convite para <span className="font-semibold text-eid-fg">{prefillConvidarNome ?? "atleta"}</span> entrar nesta formação.
          </p>
          <form action={inviteAction} className="mt-2">
            <input type="hidden" name="time_id" value={timeId} />
            <input type="hidden" name="convidado_usuario_id" value={prefillConvidarUsuarioId} />
            <button
              type="submit"
              disabled={invitePending}
              className="eid-btn-primary w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-60"
            >
              {invitePending ? "Enviando..." : "Enviar convite"}
            </button>
          </form>
        </div>
      ) : null}

      <form action={inviteAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input type="hidden" name="time_id" value={timeId} />
        <input
          name="username"
          required={!prefillConvidarUsuarioId}
          placeholder="@username do atleta"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
        />
        <button type="submit" disabled={invitePending} className="eid-btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
          {invitePending ? "Enviando..." : "Adicionar"}
        </button>
      </form>
      {inviteState.message ? (
        <p className={`mt-2 text-xs ${inviteState.ok ? "text-eid-primary-300" : "text-red-300"}`}>{inviteState.message}</p>
      ) : null}

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Convites</p>
          {convites.length > 0 ? (
            <ul className="mt-2 grid gap-2">
              {convites.map((c) => (
                <li key={c.conviteId} className="eid-list-item flex items-center gap-2 rounded-xl bg-eid-card/55 p-2">
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt={c.nome} className="h-9 w-9 rounded-full border border-[color:var(--eid-border-subtle)] object-cover" />
                  ) : (
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300">
                      {c.nome.trim().slice(0, 1).toUpperCase() || "A"}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-eid-fg">{c.nome}</p>
                    <p className="truncate text-[9px] text-eid-text-secondary">{c.localizacao ?? "Localização não informada"}</p>
                  </div>
                  <span className="rounded-full border border-[color:var(--eid-border-subtle)] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-eid-fg">
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[11px] text-eid-text-secondary">Nenhum convite pendente.</p>
          )}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Membros</p>
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
                    <p className="truncate text-[9px] text-eid-text-secondary">{m.localizacao ?? "Localização não informada"}</p>
                  </div>
                  <span className="rounded-full border border-[color:var(--eid-border-subtle)] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-eid-fg">
                    {m.status}
                  </span>
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

