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
  canOpenLocais = false,
}: {
  locais: LocalHint[];
  canOpenLocais?: boolean;
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
      <label htmlFor="nome_publico" className="text-[10px] font-black uppercase tracking-[0.03em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-primary-500)_28%)]">
        Nome do local
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_90%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-card)_85%,var(--eid-bg)_15%)] text-eid-primary-400">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <path d="M8 3v4M16 3v4M4 10h16" />
          </svg>
        </span>
        <input
          id="nome_publico"
          name="nome_publico"
          required
          minLength={2}
          placeholder="Ex.: Arena Central"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          className="eid-input-dark h-9 w-full rounded-[9px] px-3 py-0 text-[13px] leading-[1.2] text-eid-fg placeholder:text-[12px] placeholder:text-eid-text-secondary"
        />
      </div>
      {similares.length ? (
        <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5">
          <p className="text-[11px] font-semibold text-amber-200">
            Encontramos locais parecidos. Confira antes de cadastrar:
          </p>
          <div className="mt-2 space-y-1.5">
            {similares.map((local) => (
              canOpenLocais ? (
                <Link
                  key={local.id}
                  href={`/local/${local.id}?from=/locais/cadastrar`}
                  className="block rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2.5 py-2 text-xs text-eid-fg hover:border-eid-primary-500/35"
                >
                  <p className="truncate font-semibold">{local.nome_publico ?? "Local"}</p>
                  <p className="truncate text-[11px] text-eid-text-secondary">{local.localizacao ?? "Sem localização"}</p>
                </Link>
              ) : (
                <div
                  key={local.id}
                  className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2.5 py-2 text-xs text-eid-fg"
                >
                  <p className="truncate font-semibold">{local.nome_publico ?? "Local"}</p>
                  <p className="truncate text-[11px] text-eid-text-secondary">{local.localizacao ?? "Sem localização"}</p>
                </div>
              )
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
