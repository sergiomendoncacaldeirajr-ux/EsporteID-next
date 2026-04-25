"use client";

import { useState } from "react";
import { SearchSuggestInput } from "@/components/search/search-suggest-input";

type Props = {
  defaultQ?: string;
  defaultEsporteId?: string;
  esportes: Array<{ id: number; nome: string }>;
};

export function TorneiosSearchForm({ defaultQ = "", defaultEsporteId = "", esportes }: Props) {
  const [q, setQ] = useState(defaultQ);
  return (
    <form className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <SearchSuggestInput
        name="q"
        value={q}
        onChange={setQ}
        scope="torneios"
        minChars={3}
        placeholder="Buscar torneio..."
        className="eid-input-dark h-11 min-w-0 flex-1 rounded-2xl px-4 text-sm text-eid-fg placeholder:text-eid-text-secondary/85"
      />
      <select
        name="esporte_id"
        defaultValue={defaultEsporteId}
        className="eid-input-dark h-11 min-w-[160px] rounded-2xl px-4 text-sm text-eid-fg"
      >
        <option value="">Todos os esportes</option>
        {esportes.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nome}
          </option>
        ))}
      </select>
      <button type="submit" className="eid-btn-primary h-11 shrink-0 rounded-2xl px-6 text-sm font-black uppercase tracking-wide">
        Filtrar
      </button>
    </form>
  );
}
