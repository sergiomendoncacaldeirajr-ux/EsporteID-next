"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { savePerformanceEidAction } from "@/app/editar/actions";
import { SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";

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

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={className}>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
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
  tempoTipo: "faixa" | "inicio";
  tempo: "Menos de 1 ano" | "1 a 3 anos" | "Mais de 3 anos";
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
  const [expandedSaved, setExpandedSaved] = useState<Record<number, boolean>>({});

  const savedEsporteIds = useMemo(() => new Set(initialItems.map((i) => i.esporteId)), [initialItems]);

  const sportsMap = useMemo(() => new Map(sports.map((s) => [s.id, s])), [sports]);
  const yearChoices = useMemo(() => anosParaSelect(), []);
  const selectedIds = new Set(items.map((it) => it.esporteId));
  const availableToAdd = sports.filter((s) => !selectedIds.has(s.id));

  const savedItems = useMemo(
    () => items.filter((i) => savedEsporteIds.has(i.esporteId)),
    [items, savedEsporteIds]
  );
  const draftItems = useMemo(
    () => items.filter((i) => !savedEsporteIds.has(i.esporteId)),
    [items, savedEsporteIds]
  );

  function addSport(esporteId: number) {
    if (!sportsMap.get(esporteId)) return;
    const y = new Date().getFullYear();
    setItems((prev) => [
      ...prev,
      {
        esporteId,
        tempoTipo: "inicio",
        tempo: "1 a 3 anos",
        inicioMes: 1,
        inicioAno: Math.max(1970, y - 2),
      },
    ]);
  }

  function updateItem(esporteId: number, patch: Partial<ItemState>) {
    setItems((prev) => prev.map((item) => (item.esporteId === esporteId ? { ...item, ...patch } : item)));
  }

  function removeSport(esporteId: number) {
    setItems((prev) => prev.filter((item) => item.esporteId !== esporteId));
    setExpandedSaved((prev) => {
      const next = { ...prev };
      delete next[esporteId];
      return next;
    });
  }

  function toggleSavedExpanded(esporteId: number) {
    setExpandedSaved((prev) => ({ ...prev, [esporteId]: !prev[esporteId] }));
  }

  function renderExperienceBlock(item: ItemState) {
    return (
      <div className="space-y-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">
            Tempo de experiência neste esporte
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-eid-text-secondary">
            O principal é o <span className="font-semibold text-eid-fg">mês e o ano</span> em que você começou. A faixa
            aproximada é opcional, só se preferir não informar a data.
          </p>
        </div>

        {item.tempoTipo === "inicio" ? (
          <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/30 p-2">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-eid-primary-300">
              Mês e ano (principal)
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-[10px] font-medium text-eid-text-secondary">Mês de início</span>
                <select
                  value={item.inicioMes}
                  onChange={(ev) => updateItem(item.esporteId, { inicioMes: Number(ev.target.value) })}
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
                  onChange={(ev) => updateItem(item.esporteId, { inicioAno: Number(ev.target.value) })}
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
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-eid-text-secondary">
            {item.tempoTipo === "inicio" ? "Opcional" : "Modo atual"}
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
          <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/25 p-2">
            <label className="grid gap-1">
              <span className="text-[10px] font-medium text-eid-text-secondary">Faixa aproximada</span>
              <select
                value={item.tempo}
                onChange={(ev) => updateItem(item.esporteId, { tempo: ev.target.value as ItemState["tempo"] })}
                className="eid-input-dark w-full rounded-lg px-2.5 py-1.5 text-xs text-eid-fg [&>option]:bg-[#0b1220] [&>option]:text-white"
              >
                <option value="Menos de 1 ano">Menos de 1 ano</option>
                <option value="1 a 3 anos">1 a 3 anos</option>
                <option value="Mais de 3 anos">Mais de 3 anos</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>
    );
  }

  async function onSave() {
    const payload: ItemState[] = items.map((item) => ({ ...item }));
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
      setItems(payload);
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

      {savedItems.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">
            Esportes no perfil
          </p>
          <div className="grid gap-2">
            {savedItems.map((item) => {
              const sport = sportsMap.get(item.esporteId);
              if (!sport) return null;
              const open = Boolean(expandedSaved[item.esporteId]);
              return (
                <div key={item.esporteId} className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/40">
                  <button
                    type="button"
                    onClick={() => toggleSavedExpanded(item.esporteId)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-eid-surface/30"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 text-eid-primary-300">
                      <span className="scale-125">
                        <SportGlyphIcon sportName={sport.nome} />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-semibold text-eid-fg">{sport.nome}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-eid-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open ? (
                    <div className="border-t border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-3">
                      <div className="mb-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeSport(item.esporteId)}
                          className="text-[10px] font-semibold uppercase text-eid-text-secondary hover:text-eid-fg"
                        >
                          Remover
                        </button>
                      </div>
                      {renderExperienceBlock(item)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {draftItems.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-eid-text-secondary">
            Novos esportes (configure antes de salvar)
          </p>
          <div className="grid gap-2">
            {draftItems.map((item) => {
              const sport = sportsMap.get(item.esporteId);
              if (!sport) return null;
              return (
                <div key={item.esporteId} className="eid-list-item rounded-xl bg-eid-card/55 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 text-eid-primary-300">
                        <span className="scale-125">
                          <SportGlyphIcon sportName={sport.nome} />
                        </span>
                      </span>
                      <p className="truncate text-sm font-semibold text-eid-fg">{sport.nome}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSport(item.esporteId)}
                      className="shrink-0 text-[10px] font-semibold uppercase text-eid-text-secondary hover:text-eid-fg"
                    >
                      Remover
                    </button>
                  </div>
                  {renderExperienceBlock(item)}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="mb-3 text-xs text-eid-text-secondary">Nenhum esporte selecionado ainda.</p>
      ) : null}

      {availableToAdd.length > 0 ? (
        <div className="mt-1 border-t border-[color:var(--eid-border-subtle)] pt-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">
            Adicionar esporte ao perfil
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableToAdd.map((sport) => (
              <button
                key={sport.id}
                type="button"
                onClick={() => addSport(sport.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--eid-border-subtle)] px-2.5 py-1 text-[10px] font-semibold text-eid-text-secondary transition-colors hover:text-eid-fg"
              >
                <span className="text-eid-primary-300">
                  <SportGlyphIcon sportName={sport.nome} />
                </span>
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
