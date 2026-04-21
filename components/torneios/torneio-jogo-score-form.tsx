"use client";

import { useActionState } from "react";
import { atualizarPlacarTorneioJogo, type TorneioStaffActionState } from "@/app/torneios/actions";

const initialState: TorneioStaffActionState = { ok: false, message: "" };

export function TorneioJogoScoreForm({
  torneioId,
  jogo,
}: {
  torneioId: number;
  jogo: {
    id: number;
    status: string | null;
    quadra: string | null;
    horario_inicio: string | null;
    observacoes: string | null;
    placar_json: string | null;
    jogador_a_id: string | null;
    jogador_b_id: string | null;
    vencedor_id: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(atualizarPlacarTorneioJogo, initialState);
  let placarA = "";
  let placarB = "";
  try {
    const parsed = jogo.placar_json ? (JSON.parse(jogo.placar_json) as { lado_a?: string; lado_b?: string }) : null;
    placarA = parsed?.lado_a ?? "";
    placarB = parsed?.lado_b ?? "";
  } catch {
    placarA = "";
    placarB = "";
  }

  return (
    <form action={formAction} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-4">
      <input type="hidden" name="torneio_id" value={torneioId} />
      <input type="hidden" name="jogo_id" value={jogo.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          name="status"
          defaultValue={jogo.status ?? "pendente"}
          className="eid-input-dark rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        >
          <option value="pendente">Pendente</option>
          <option value="agendado">Agendado</option>
          <option value="em_andamento">Em andamento</option>
          <option value="finalizado">Finalizado</option>
        </select>
        <input
          name="quadra"
          defaultValue={jogo.quadra ?? ""}
          placeholder="Quadra / arena"
          className="eid-input-dark rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
        <input
          name="placar_a"
          defaultValue={placarA}
          placeholder="Placar lado A"
          className="eid-input-dark rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
        <input
          name="placar_b"
          defaultValue={placarB}
          placeholder="Placar lado B"
          className="eid-input-dark rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
        <input
          name="horario_inicio"
          type="datetime-local"
          defaultValue={jogo.horario_inicio ? String(jogo.horario_inicio).slice(0, 16) : ""}
          className="eid-input-dark rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        />
        <select
          name="vencedor_id"
          defaultValue={jogo.vencedor_id ?? ""}
          className="eid-input-dark rounded-xl px-3 py-2.5 text-sm text-eid-fg"
        >
          <option value="">Sem vencedor</option>
          {jogo.jogador_a_id ? <option value={jogo.jogador_a_id}>Vencedor lado A</option> : null}
          {jogo.jogador_b_id ? <option value={jogo.jogador_b_id}>Vencedor lado B</option> : null}
        </select>
      </div>
      <textarea
        name="observacoes"
        rows={2}
        defaultValue={jogo.observacoes ?? ""}
        placeholder="Observações da súmula"
        className="eid-input-dark mt-3 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
      />
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-xl bg-eid-primary-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-eid-fg disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar placar"}
      </button>
      {state.message ? (
        <p className={`mt-3 text-xs ${state.ok ? "text-emerald-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
