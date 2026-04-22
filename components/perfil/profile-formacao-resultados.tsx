"use client";

import { useMemo, useState } from "react";
import { PROFILE_CARD_BASE } from "@/components/perfil/profile-ui-tokens";

export type FormacaoResultadoItem = {
  id: string;
  resultado: "V" | "D" | "E";
  origem: "Rank" | "Torneio";
  placar: string;
  dataFmt: string;
  tone: "positive" | "negative" | "neutral";
  adversarioLabel: string;
  torneioLabel?: string | null;
};

type Filtro = "todos" | "rank" | "torneio";

type Props = {
  totais: { vitorias: number; derrotas: number; empates: number; rank: number; torneio: number };
  items: FormacaoResultadoItem[];
  resumoCount?: number;
  emptyText?: string;
};

export function ProfileFormacaoResultados({
  totais,
  items,
  resumoCount = 4,
  emptyText = "Nenhum resultado registrado ainda nesta formação.",
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [expandido, setExpandido] = useState(false);

  const filtrados = useMemo(() => {
    if (filtro === "rank") return items.filter((i) => i.origem === "Rank");
    if (filtro === "torneio") return items.filter((i) => i.origem === "Torneio");
    return items;
  }, [items, filtro]);

  const visiveis = expandido ? filtrados : filtrados.slice(0, resumoCount);
  const podeExpandir = filtrados.length > resumoCount;

  if (items.length === 0) {
    return (
      <div className={`${PROFILE_CARD_BASE} p-3 text-center`}>
        <p className="text-[11px] text-eid-text-secondary">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
          <p className="text-[11px] font-black text-emerald-300">{totais.vitorias}</p>
          <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">V</p>
        </div>
        <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
          <p className="text-[11px] font-black text-red-300">{totais.derrotas}</p>
          <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">D</p>
        </div>
        <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
          <p className="text-[11px] font-black text-eid-primary-300">{totais.empates}</p>
          <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">E</p>
        </div>
        <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
          <p className="text-[11px] font-black text-eid-fg">{totais.rank}</p>
          <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">Rank</p>
        </div>
        <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
          <p className="text-[11px] font-black text-eid-fg">{totais.torneio}</p>
          <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">Torneio</p>
        </div>
      </div>

      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-eid-text-secondary">Filtrar lista</p>
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: "todos" as const, label: "Todos" },
            { id: "rank" as const, label: "Só ranking" },
            { id: "torneio" as const, label: "Só torneio" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              setFiltro(opt.id);
              setExpandido(false);
            }}
            className={`rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide transition ${
              filtro === opt.id
                ? "bg-eid-primary-500/18 text-eid-fg ring-1 ring-eid-primary-500/35"
                : "bg-eid-surface/45 text-eid-text-secondary hover:text-eid-fg"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ul className="mt-1 grid gap-1.5">
        {visiveis.map((item) => (
          <li
            key={item.id}
            className={`flex flex-col gap-0.5 rounded-lg border bg-eid-surface/45 px-2 py-1.5 text-[10px] sm:flex-row sm:items-center sm:justify-between ${
              item.tone === "positive"
                ? "border-emerald-400/30"
                : item.tone === "negative"
                  ? "border-red-400/30"
                  : "border-[color:var(--eid-border-subtle)]"
            }`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-black text-eid-fg">{item.resultado}</span>
              <span className="font-semibold text-eid-text-secondary">{item.origem}</span>
              <span className="font-bold text-eid-fg">{item.placar}</span>
              <span className="text-[9px] text-eid-text-secondary">vs {item.adversarioLabel}</span>
            </div>
            <div className="flex flex-col items-start gap-0.5 sm:items-end">
              <span className="text-[9px] text-eid-text-secondary">{item.dataFmt}</span>
              {item.torneioLabel ? (
                <span className="text-[8px] font-semibold text-eid-action-400">{item.torneioLabel}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {filtrados.length === 0 ? (
        <p className="text-[10px] text-eid-text-secondary">Nenhum jogo neste filtro.</p>
      ) : null}

      {podeExpandir ? (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="text-[9px] font-bold uppercase tracking-[0.12em] text-eid-primary-400 underline-offset-2 hover:underline"
        >
          {expandido ? "Ver menos" : `Ver mais resultados (${filtrados.length})`}
        </button>
      ) : null}
    </div>
  );
}
