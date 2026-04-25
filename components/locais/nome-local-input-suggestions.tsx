"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { normalizeEspacoDuplicateValue } from "@/lib/espacos/duplicate";

type LocalHint = {
  id: number;
  nome_publico: string | null;
  localizacao: string | null;
};

export function NomeLocalInputSuggestions({
  locais,
}: {
  locais: LocalHint[];
}) {
  const [nome, setNome] = useState("");
  const normalized = useMemo(() => normalizeEspacoDuplicateValue(nome), [nome]);

  const similares = useMemo(() => {
    if (normalized.length < 3) return [];
    return locais
      .map((local) => ({
        ...local,
        nomeNormalizado: normalizeEspacoDuplicateValue(local.nome_publico ?? ""),
      }))
      .filter((local) => {
        if (!local.nomeNormalizado) return false;
        return (
          local.nomeNormalizado.includes(normalized) ||
          normalized.includes(local.nomeNormalizado) ||
          local.nomeNormalizado.split(" ").some((token) => token.startsWith(normalized))
        );
      })
      .slice(0, 5);
  }, [locais, normalized]);

  return (
    <div>
      <label htmlFor="nome_publico" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
        Nome do local
      </label>
      <input
        id="nome_publico"
        name="nome_publico"
        required
        minLength={2}
        placeholder="Ex.: Arena Central"
        value={nome}
        onChange={(event) => setNome(event.target.value)}
        className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
      />
      {similares.length ? (
        <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5">
          <p className="text-[11px] font-semibold text-amber-200">
            Encontramos locais parecidos. Confira antes de cadastrar:
          </p>
          <div className="mt-2 space-y-1.5">
            {similares.map((local) => (
              <Link
                key={local.id}
                href={`/local/${local.id}?from=/locais/cadastrar`}
                className="block rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2.5 py-2 text-xs text-eid-fg hover:border-eid-primary-500/35"
              >
                <p className="truncate font-semibold">{local.nome_publico ?? "Local"}</p>
                <p className="truncate text-[11px] text-eid-text-secondary">{local.localizacao ?? "Sem localização"}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
