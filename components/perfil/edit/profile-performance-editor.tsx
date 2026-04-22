"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePerformanceEidAction } from "@/app/editar/actions";

type Sport = {
  id: number;
  nome: string;
  permiteIndividual: boolean;
  permiteDupla: boolean;
  permiteTime: boolean;
};

type ItemState = {
  esporteId: number;
  modalidades: Array<"individual" | "dupla" | "time">;
  tempo: "Menos de 1 ano" | "1 a 3 anos" | "Mais de 3 anos";
  tempoAnos?: number;
  tempoMeses?: number;
};

type Props = {
  sports: Sport[];
  initialItems: ItemState[];
};

export function ProfilePerformanceEditor({ sports, initialItems }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<ItemState[]>(initialItems);

  const sportsMap = useMemo(() => new Map(sports.map((s) => [s.id, s])), [sports]);
  const selectedIds = new Set(items.map((it) => it.esporteId));
  const availableToAdd = sports.filter((s) => !selectedIds.has(s.id));

  function addSport(esporteId: number) {
    const sport = sportsMap.get(esporteId);
    if (!sport) return;
    const modalidades: Array<"individual" | "dupla" | "time"> = [];
    if (sport.permiteIndividual) modalidades.push("individual");
    else if (sport.permiteDupla) modalidades.push("dupla");
    else modalidades.push("time");

    setItems((prev) => [
      ...prev,
      {
        esporteId,
        interesse: "ranking_e_amistoso",
        modalidades,
        tempo: "1 a 3 anos",
      },
    ]);
  }

  function updateItem(esporteId: number, patch: Partial<ItemState>) {
    setItems((prev) => prev.map((item) => (item.esporteId === esporteId ? { ...item, ...patch } : item)));
  }

  function toggleModalidade(esporteId: number, modalidade: "individual" | "dupla" | "time") {
    setItems((prev) =>
      prev.map((item) => {
        if (item.esporteId !== esporteId) return item;
        const has = item.modalidades.includes(modalidade);
        const next = has ? item.modalidades.filter((m) => m !== modalidade) : [...item.modalidades, modalidade];
        return { ...item, modalidades: next.length > 0 ? next : item.modalidades };
      })
    );
  }

  function removeSport(esporteId: number) {
    setItems((prev) => prev.filter((item) => item.esporteId !== esporteId));
  }

  function onSave() {
    const payload = items.map((item) => ({
      ...item,
      modalidades: item.modalidades.length > 0 ? item.modalidades : ["individual"],
    }));
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    startTransition(async () => {
      const res = await savePerformanceEidAction(fd);
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setMessage("Performance EID atualizada.");
      router.refresh();
    });
  }

  return (
    <div className="eid-surface-panel rounded-2xl p-3 sm:p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Dados de performance</p>
      {message ? (
        <p className="mb-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 py-2 text-xs text-eid-fg">
          {message}
        </p>
      ) : null}
      {items.length > 0 ? (
        <div className="grid gap-2">
          {items.map((item) => {
            const sport = sportsMap.get(item.esporteId);
            if (!sport) return null;
            return (
              <div key={item.esporteId} className="eid-list-item rounded-xl bg-eid-card/55 p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-eid-fg">{sport.nome}</p>
                  <button
                    type="button"
                    onClick={() => removeSport(item.esporteId)}
                    className="text-[10px] font-semibold uppercase text-eid-text-secondary hover:text-eid-fg"
                  >
                    Remover
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={item.tempo}
                    onChange={(ev) => updateItem(item.esporteId, { tempo: ev.target.value as ItemState["tempo"] })}
                    className="eid-input-dark w-full rounded-lg px-2.5 py-1.5 text-xs text-eid-fg [&>option]:bg-[#0b1220] [&>option]:text-white"
                  >
                    <option value="Menos de 1 ano">Menos de 1 ano</option>
                    <option value="1 a 3 anos">1 a 3 anos</option>
                    <option value="Mais de 3 anos">Mais de 3 anos</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={item.tempoAnos ?? 0}
                      onChange={(ev) => updateItem(item.esporteId, { tempoAnos: Number(ev.target.value || 0) })}
                      placeholder="Anos"
                      className="eid-input-dark w-full rounded-lg px-2.5 py-1.5 text-xs text-eid-fg"
                    />
                    <input
                      type="number"
                      min={0}
                      max={11}
                      value={item.tempoMeses ?? 0}
                      onChange={(ev) => updateItem(item.esporteId, { tempoMeses: Number(ev.target.value || 0) })}
                      placeholder="Meses"
                      className="eid-input-dark w-full rounded-lg px-2.5 py-1.5 text-xs text-eid-fg"
                    />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {sport.permiteIndividual ? (
                    <button
                      type="button"
                      onClick={() => toggleModalidade(item.esporteId, "individual")}
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                        item.modalidades.includes("individual")
                          ? "border-eid-primary-500/45 bg-eid-primary-500/15 text-eid-fg"
                          : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"
                      }`}
                    >
                      Individual
                    </button>
                  ) : null}
                  {sport.permiteDupla ? (
                    <button
                      type="button"
                      onClick={() => toggleModalidade(item.esporteId, "dupla")}
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                        item.modalidades.includes("dupla")
                          ? "border-eid-primary-500/45 bg-eid-primary-500/15 text-eid-fg"
                          : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"
                      }`}
                    >
                      Dupla
                    </button>
                  ) : null}
                  {sport.permiteTime ? (
                    <button
                      type="button"
                      onClick={() => toggleModalidade(item.esporteId, "time")}
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                        item.modalidades.includes("time")
                          ? "border-eid-primary-500/45 bg-eid-primary-500/15 text-eid-fg"
                          : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"
                      }`}
                    >
                      Time
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-eid-text-secondary">Nenhum esporte selecionado ainda.</p>
      )}

      {availableToAdd.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Adicionar esporte</p>
          <div className="flex flex-wrap gap-1.5">
            {availableToAdd.map((sport) => (
              <button
                key={sport.id}
                type="button"
                onClick={() => addSport(sport.id)}
                className="rounded-full border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[10px] font-semibold text-eid-text-secondary transition-colors hover:text-eid-fg"
              >
                + {sport.nome}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/12 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-eid-fg disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar Performance"}
        </button>
      </div>
    </div>
  );
}

