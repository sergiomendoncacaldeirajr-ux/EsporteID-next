"use client";

import { useActionState, useMemo, useState } from "react";
import { gerarChaveTorneio, type TorneioStaffActionState } from "@/app/torneios/actions";

const initialState: TorneioStaffActionState = { ok: false, message: "" };

type Participant = {
  entityId: string;
  nome: string;
  eid: number;
};

export function DrawPlannerForm({
  torneioId,
  participants,
}: {
  torneioId: number;
  participants: Participant[];
}) {
  const [state, formAction, pending] = useActionState(gerarChaveTorneio, initialState);
  const [strategy, setStrategy] = useState<"eid" | "manual" | "random">("eid");
  const [groupCount, setGroupCount] = useState("2");
  const [manualOrder, setManualOrder] = useState<string[]>(() => participants.map((participant) => participant.entityId));
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const participantMap = useMemo(
    () => new Map(participants.map((participant) => [participant.entityId, participant])),
    [participants]
  );

  function moveItem(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    setManualOrder((current) => {
      const next = [...current];
      const from = next.indexOf(draggingId);
      const to = next.indexOf(targetId);
      if (from < 0 || to < 0) return current;
      next.splice(from, 1);
      next.splice(to, 0, draggingId);
      return next;
    });
  }

  return (
    <form action={formAction} className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
      <input type="hidden" name="torneio_id" value={torneioId} />
      <input type="hidden" name="manual_order" value={manualOrder.join(",")} />
      <h2 className="text-sm font-bold text-eid-fg">Gerar sorteio</h2>
      <p className="mt-1 text-xs text-eid-text-secondary">
        Escolha a estratégia e publique a chave depois de revisar a distribuição.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {([
          { id: "eid", label: "EID / seed" },
          { id: "manual", label: "Manual" },
          { id: "random", label: "Aleatório" },
        ] as const).map((item) => (
          <label
            key={item.id}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
              strategy === item.id
                ? "border-eid-primary-500/45 bg-eid-primary-500/10 text-eid-fg"
                : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"
            }`}
          >
            <input
              type="radio"
              name="draw_strategy"
              value={item.id}
              checked={strategy === item.id}
              onChange={() => setStrategy(item.id)}
            />
            {item.label}
          </label>
        ))}
      </div>

      <div className="mt-4">
        <label htmlFor="group_count" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Grupos (quando aplicável)
        </label>
        <input
          id="group_count"
          name="group_count"
          type="number"
          min={2}
          value={groupCount}
          onChange={(event) => setGroupCount(event.target.value)}
          className="eid-input-dark mt-1.5 w-28 rounded-xl px-3 py-2 text-sm text-eid-fg"
        />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Ordem manual ({participants.length} inscritos)
        </p>
        <div className="mt-2 grid gap-2">
          {manualOrder.map((entityId, index) => {
            const participant = participantMap.get(entityId);
            if (!participant) return null;
            return (
              <div
                key={entityId}
                draggable
                onDragStart={() => setDraggingId(entityId)}
                onDragOver={(event) => {
                  event.preventDefault();
                  moveItem(entityId);
                }}
                onDragEnd={() => setDraggingId(null)}
                className={`cursor-move rounded-xl border px-3 py-2 text-sm transition ${
                  draggingId === entityId
                    ? "border-eid-action-500/45 bg-eid-action-500/10 text-eid-fg"
                    : "border-[color:var(--eid-border-subtle)] bg-eid-bg/40 text-eid-fg"
                }`}
              >
                <span className="font-black text-eid-primary-300">{index + 1}.</span> {participant.nome}
                <span className="ml-2 text-xs text-eid-text-secondary">EID {participant.eid.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-xl bg-eid-action-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-[var(--eid-brand-ink)] disabled:opacity-60"
      >
        {pending ? "Gerando..." : "Gerar rascunho"}
      </button>
      {state.message ? (
        <p className={`mt-3 text-xs ${state.ok ? "text-emerald-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
