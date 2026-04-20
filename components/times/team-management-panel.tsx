"use client";

import { useActionState } from "react";
import { criarEquipe, convidarUsuarioParaEquipe, type TeamActionState } from "@/app/times/actions";

const initial: TeamActionState = { ok: false, message: "" };

type Sport = { id: number; nome: string };
type Team = { id: number; nome: string; tipo: string | null; esporteNome: string };

export function TeamManagementPanel({
  esportes,
  minhasEquipes,
  defaultOpenCreate,
}: {
  esportes: Sport[];
  minhasEquipes: Team[];
  defaultOpenCreate?: boolean;
}) {
  const [createState, createAction, createPending] = useActionState(criarEquipe, initial);
  const [inviteState, inviteAction, invitePending] = useActionState(convidarUsuarioParaEquipe, initial);

  return (
    <section className="mb-4 space-y-3">
      <details className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3" open={defaultOpenCreate}>
        <summary className="cursor-pointer text-sm font-semibold text-eid-fg">Criar Nova Dupla/Time</summary>
        <form action={createAction} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input name="nome" required placeholder="Nome da equipe" className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2" />
          <input name="username" placeholder="@username da equipe (opcional)" className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg" />
          <select name="tipo" defaultValue="time" className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg">
            <option value="time">Time</option>
            <option value="dupla">Dupla</option>
          </select>
          <select name="esporte_id" required className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg">
            <option value="">Esporte</option>
            {esportes.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
          <input name="localizacao" placeholder="Cidade / Estado" className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg" />
          <textarea name="bio" rows={2} placeholder="Bio da equipe (opcional)" className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2" />
          <button type="submit" disabled={createPending} className="eid-btn-match-cta rounded-2xl px-4 py-2.5 text-sm font-semibold sm:col-span-2">
            {createPending ? "Criando..." : "Criar equipe"}
          </button>
          {createState.message ? (
            <p className={`text-xs sm:col-span-2 ${createState.ok ? "text-eid-primary-300" : "text-red-300"}`}>{createState.message}</p>
          ) : null}
        </form>
      </details>

      {minhasEquipes.length > 0 ? (
        <details className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3">
          <summary className="cursor-pointer text-sm font-semibold text-eid-fg">Convidar atleta por @username</summary>
          <form action={inviteAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <select name="time_id" required className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg">
              <option value="">Selecione a equipe</option>
              {minhasEquipes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({(t.tipo ?? "time").toUpperCase()} · {t.esporteNome})
                </option>
              ))}
            </select>
            <input name="username" required placeholder="@username do atleta" className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg" />
            <button type="submit" disabled={invitePending} className="eid-btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
              {invitePending ? "Enviando..." : "Convidar"}
            </button>
            {inviteState.message ? (
              <p className={`text-xs sm:col-span-3 ${inviteState.ok ? "text-eid-primary-300" : "text-red-300"}`}>{inviteState.message}</p>
            ) : null}
          </form>
        </details>
      ) : null}
    </section>
  );
}
