"use client";

import { useActionState } from "react";
import { atualizarMinhaEquipe, type TeamActionState } from "@/app/times/actions";

const initial: TeamActionState = { ok: false, message: "" };

export function PerfilTimeEditForm({
  timeId,
  nome,
  username,
  bio,
  localizacao,
  escudo,
  interesse_rank_match,
  disponivel_amistoso,
  vagas_abertas,
  aceita_pedidos,
  interesse_torneio,
  nivel_procurado,
}: {
  timeId: number;
  nome: string;
  username: string | null;
  bio: string | null;
  localizacao: string | null;
  escudo: string | null;
  interesse_rank_match: boolean;
  disponivel_amistoso: boolean;
  vagas_abertas: boolean;
  aceita_pedidos: boolean;
  interesse_torneio: boolean;
  nivel_procurado: string | null;
}) {
  const [state, formAction, pending] = useActionState(atualizarMinhaEquipe, initial);

  return (
    <details className="mt-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-3 text-left">
      <summary className="cursor-pointer text-sm font-semibold text-eid-fg">Editar dados da formação</summary>
      <form action={formAction} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="time_id" value={timeId} />
        <input
          name="nome"
          required
          defaultValue={nome}
          placeholder="Nome da equipe"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
        />
        <input
          name="username"
          defaultValue={username ?? ""}
          placeholder="@username (opcional)"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
        />
        <input
          name="localizacao"
          defaultValue={localizacao ?? ""}
          placeholder="Cidade / Estado"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
        />
        <input
          name="escudo"
          defaultValue={escudo ?? ""}
          placeholder="URL do escudo (imagem)"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
        />
        <textarea
          name="bio"
          rows={2}
          defaultValue={bio ?? ""}
          placeholder="Bio da equipe"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
        />
        <input
          name="nivel_procurado"
          defaultValue={nivel_procurado ?? ""}
          placeholder="Nível procurado (opcional)"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
        />
        <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
          <input type="checkbox" name="interesse_rank_match" defaultChecked={interesse_rank_match} className="rounded border-eid-border-subtle" />
          Interesse em match no ranking
        </label>
        <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
          <input type="checkbox" name="disponivel_amistoso" defaultChecked={disponivel_amistoso} className="rounded border-eid-border-subtle" />
          Disponível para amistoso
        </label>
        <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
          <input type="checkbox" name="vagas_abertas" defaultChecked={vagas_abertas} className="rounded border-eid-border-subtle" />
          Vagas abertas
        </label>
        <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
          <input type="checkbox" name="aceita_pedidos" defaultChecked={aceita_pedidos} className="rounded border-eid-border-subtle" />
          Aceita pedidos / convites
        </label>
        <label className="flex items-center gap-2 text-xs text-eid-text-secondary sm:col-span-2">
          <input type="checkbox" name="interesse_torneio" defaultChecked={interesse_torneio} className="rounded border-eid-border-subtle" />
          Interesse em torneios
        </label>
        <button
          type="submit"
          disabled={pending}
          className="eid-btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold sm:col-span-2"
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
        {state.message ? (
          <p className={`text-xs sm:col-span-2 ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
        ) : null}
      </form>
    </details>
  );
}
