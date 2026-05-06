"use client";

import Link from "next/link";
import { useMemo } from "react";
import { locaisSectionTitleClass } from "@/components/locais/locais-ui-tokens";
import { normalizeEspacoDuplicateValue } from "@/lib/espacos/duplicate";
import { normalizePtBrNameCase } from "@/lib/text/pt-br-name-case";

type LocalHint = {
  id: number;
  nome_publico: string | null;
  localizacao: string | null;
};

export function NomeLocalInputSuggestions({
  locais,
  canOpenLocais = false,
  nome,
  onNomeChange,
}: {
  locais: LocalHint[];
  canOpenLocais?: boolean;
  nome: string;
  onNomeChange: (next: string) => void;
}) {
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
        if (local.nomeNormalizado === normalized) return false;
        return (
          local.nomeNormalizado.includes(normalized) ||
          normalized.includes(local.nomeNormalizado) ||
          local.nomeNormalizado.split(" ").some((token) => token.startsWith(normalized))
        );
      })
      .slice(0, 5);
  }, [locais, normalized]);

  function handleNomeChange(raw: string) {
    if (raw.endsWith(" ")) {
      const core = raw.slice(0, -1);
      if (core.length) {
        onNomeChange(`${normalizePtBrNameCase(core)} `);
        return;
      }
    }
    onNomeChange(raw);
  }

  function handleNomeBlur() {
    const fixed = normalizePtBrNameCase(nome);
    if (fixed !== nome) onNomeChange(fixed);
  }

  return (
    <div>
      <label htmlFor="nome_publico" className={locaisSectionTitleClass}>
        Nome do local
      </label>
      <div className="mt-1.5 flex items-center gap-2.5">
        <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_90%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-card)_85%,var(--eid-bg)_15%)] text-eid-primary-400">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <path d="M8 3v4M16 3v4M4 10h16" />
          </svg>
        </span>
        <input
          id="nome_publico"
          name="nome_publico"
          required
          minLength={2}
          lang="pt-BR"
          spellCheck
          autoCapitalize="words"
          enterKeyHint="next"
          placeholder="Ex.: Arena Central"
          value={nome}
          onChange={(event) => handleNomeChange(event.target.value)}
          onBlur={handleNomeBlur}
          className="eid-input-dark !min-h-[2.75rem] h-11 w-full rounded-[10px] !px-3.5 !py-2.5 !text-[15px] !leading-snug text-eid-fg placeholder:!text-[14px] placeholder:text-eid-text-secondary"
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
