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
      <details className="eid-surface-panel rounded-2xl p-3 sm:p-4" open={defaultOpenCreate}>
        <summary className="cursor-pointer text-sm font-semibold text-eid-fg">Criar Nova Dupla/Time</summary>
        <p className="mt-2 text-[11px] text-eid-text-secondary">Preencha os dados da formação e envie uma foto obrigatória para criar.</p>
        <form action={createAction} className="mt-3 grid gap-2 sm:grid-cols-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary sm:col-span-2">Dados principais</p>
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

          <div className="rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 px-3 py-2 sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-primary-300">Foto obrigatória</p>
            <p className="mt-1 text-[10px] text-eid-text-secondary">Adicione o escudo/foto da dupla ou do time para concluir o cadastro.</p>
            <input
              type="file"
              name="escudo_file"
              accept="image/*"
              required
              className="mt-2 block w-full text-[11px] text-eid-text-secondary file:mr-2 file:rounded-lg file:border file:border-[color:var(--eid-border-subtle)] file:bg-eid-surface/70 file:px-2.5 file:py-1 file:text-[10px] file:font-semibold file:text-eid-fg"
            />
          </div>

          <button
            type="submit"
            disabled={createPending}
            className="rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/12 px-4 py-2.5 text-sm font-bold uppercase tracking-[0.08em] text-eid-fg transition-all duration-200 hover:-translate-y-[1px] hover:border-eid-primary-500/60 hover:bg-eid-primary-500/18 disabled:opacity-60 sm:col-span-2"
          >
            {createPending ? "Criando..." : "Criar equipe"}
          </button>
          {createState.message ? (
            <p className={`text-xs sm:col-span-2 ${createState.ok ? "text-eid-primary-300" : "text-red-300"}`}>{createState.message}</p>
          ) : null}
        </form>
      </details>

      {minhasEquipes.length > 0 ? (
        <details className="eid-surface-panel rounded-2xl p-3 sm:p-4">
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
