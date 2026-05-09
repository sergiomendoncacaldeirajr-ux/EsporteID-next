"use client";

import { useEffect, useRef, useState } from "react";

export type LocalClaimItem = {
  id: number;
  nome: string;
  localizacao: string;
  donoUsuarioId: string | null;
};

type Props = {
  locais: LocalClaimItem[];
  name: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: LocalClaimItem) => void;
  onClear: () => void;
  claimId: number | null;
  placeholder?: string;
  className?: string;
};

export function LocalClaimSearch({
  locais,
  name,
  value,
  onChange,
  onSelect,
  onClear,
  claimId,
  placeholder = "Nome do local",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const q = value.trim().toLowerCase();
  const suggestions =
    q.length >= 3 ? locais.filter((l) => l.nome.toLowerCase().includes(q)).slice(0, 6) : [];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <input
        name={name}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (claimId) onClear();
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length) setOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {claimId ? (
        <p className="mt-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300">
          Este local já está cadastrado — envie o comprovante abaixo para solicitar a propriedade.
        </p>
      ) : null}
      {open && suggestions.length > 0 && !claimId ? (
        <div className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-1 shadow-xl">
          {suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-eid-surface/70"
            >
              <p className="truncate text-xs font-semibold text-eid-fg">{item.nome}</p>
              <p className="truncate text-[11px] text-eid-text-secondary">
                {item.localizacao || "Sem localização"}
                {item.donoUsuarioId === null ? " · sem dono cadastrado" : ""}
              </p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
