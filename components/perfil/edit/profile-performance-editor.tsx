"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { savePerformanceEidAction } from "@/app/editar/actions";

const MESES_PT = [
  { v: 1, l: "Janeiro" },
  { v: 2, l: "Fevereiro" },
  { v: 3, l: "Março" },
  { v: 4, l: "Abril" },
  { v: 5, l: "Maio" },
  { v: 6, l: "Junho" },
  { v: 7, l: "Julho" },
  { v: 8, l: "Agosto" },
  { v: 9, l: "Setembro" },
  { v: 10, l: "Outubro" },
  { v: 11, l: "Novembro" },
  { v: 12, l: "Dezembro" },
] as const;

function anosParaSelect(): number[] {
  const y = new Date().getFullYear();
  const out: number[] = [];
  for (let a = y; a >= 1970; a--) out.push(a);
  return out;
}

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
  tempoTipo: "faixa" | "inicio";
  tempo: "Menos de 1 ano" | "1 a 3 anos" | "Mais de 3 anos";
  tempoAnos?: number;
  tempoMeses?: number;
  inicioMes: number;
  inicioAno: number;
};

type Props = {
  sports: Sport[];
  initialItems: ItemState[];
};

export function ProfilePerformanceEditor({ sports, initialItems }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<ItemState[]>(initialItems);

  const sportsMap = useMemo(() => new Map(sports.map((s) => [s.id, s])), [sports]);
  const yearChoices = useMemo(() => anosParaSelect(), []);
  const selectedIds = new Set(items.map((it) => it.esporteId));
  const availableToAdd = sports.filter((s) => !selectedIds.has(s.id));

  function addSport(esporteId: number) {
    const sport = sportsMap.get(esporteId);
    if (!sport) return;
    const modalidades: Array<"individual" | "dupla" | "time"> = [];
    if (sport.permiteIndividual) modalidades.push("individual");
    else if (sport.permiteDupla) modalidades.push("dupla");
    else modalidades.push("time");

    const y = new Date().getFullYear();
    setItems((prev) => [
      ...prev,
      {
        esporteId,
        modalidades,
        tempoTipo: "inicio",
        tempo: "1 a 3 anos",
        tempoAnos: 0,
        tempoMeses: 0,
        inicioMes: 1,
        inicioAno: Math.max(1970, y - 2),
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

  async function onSave() {
    const payload = items.map((item) => ({
      ...item,
      modalidades: item.modalidades.length > 0 ? item.modalidades : ["individual"],
    }));
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    setSaving(true);
    try {
      const res = await savePerformanceEidAction(fd);
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setMessage("Performance EID atualizada.");
      router.refresh();
    } finally {
      setSaving(false);
    }
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
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">
                      Tempo de experiência neste esporte
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-eid-text-secondary">
                      Informe o <span className="font-semibold text-eid-fg">mês e o ano</span> em que começou a praticar. A faixa
                      aproximada é só se preferir não usar data.
                    </p>
                  </div>

                  {item.tempoTipo === "inicio" ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-[10px] font-medium text-eid-text-secondary">Mês de início</span>
                        <select
                          value={item.inicioMes}
                          onChange={(ev) =>
                            updateItem(item.esporteId, { inicioMes: Number(ev.target.value) })
                          }
                          className="eid-input-dark w-full rounded-lg px-2.5 py-1.5 text-xs text-eid-fg [&>option]:bg-[#0b1220] [&>option]:text-white"
                        >
                          {MESES_PT.map((m) => (
                            <option key={m.v} value={m.v}>
                              {m.l}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-[10px] font-medium text-eid-text-secondary">Ano</span>
                        <select
                          value={item.inicioAno}
                          onChange={(ev) =>
                            updateItem(item.esporteId, { inicioAno: Number(ev.target.value) })
                          }
                          className="eid-input-dark w-full rounded-lg px-2.5 py-1.5 text-xs text-eid-fg [&>option]:bg-[#0b1220] [&>option]:text-white"
                        >
                          {yearChoices.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-eid-text-secondary">
                      {item.tempoTipo === "inicio" ? "Opcional" : "Forma de informar"}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { id: "inicio" as const, label: "Mês e ano" },
                          { id: "faixa" as const, label: "Faixa aproximada (opcional)" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateItem(item.esporteId, { tempoTipo: opt.id })}
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
                            item.tempoTipo === opt.id
                              ? "border-eid-primary-500/50 bg-eid-primary-500/15 text-eid-fg"
                              : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:text-eid-fg"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {item.tempoTipo === "faixa" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={item.tempo}
                        onChange={(ev) =>
                          updateItem(item.esporteId, { tempo: ev.target.value as ItemState["tempo"] })
                        }
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
                          onChange={(ev) =>
                            updateItem(item.esporteId, { tempoAnos: Number(ev.target.value || 0) })
                          }
                          placeholder="Anos"
                          aria-label="Anos de prática"
                          className="eid-input-dark w-full rounded-lg px-2.5 py-1.5 text-xs text-eid-fg"
                        />
                        <input
                          type="number"
                          min={0}
                          max={11}
                          value={item.tempoMeses ?? 0}
                          onChange={(ev) =>
                            updateItem(item.esporteId, { tempoMeses: Number(ev.target.value || 0) })
                          }
                          placeholder="Meses"
                          aria-label="Meses além dos anos completos"
                          className="eid-input-dark w-full rounded-lg px-2.5 py-1.5 text-xs text-eid-fg"
                        />
                      </div>
                      <p className="sm:col-span-2 text-[10px] leading-snug text-eid-text-secondary">
                        Opcional: anos e meses refinam o texto (ex.: &quot;2 anos e 3 meses&quot;).
                      </p>
                    </div>
                  ) : null}
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
          disabled={saving}
          onClick={onSave}
          className="rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/12 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-eid-fg disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar Performance"}
        </button>
      </div>
    </div>
  );
}

