"use client";

import { useEffect, useRef, useState } from "react";

type SuggestItem = {
  id: number;
  slug: string | null;
  nome: string;
  localizacao: string | null;
  distKm: number | null;
};

type Props = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minChars?: number;
  className?: string;
};

export function LocalSelectAutocomplete({
  name,
  value,
  onChange,
  placeholder = "Selecione o local...",
  minChars = 3,
  className,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const ctrlRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    const q = inputValue.trim();
    if (q.length < minChars) {
      return;
    }
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/locais/suggest?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { items?: SuggestItem[] };
        setItems(json.items ?? []);
        setOpen(true);
      } catch {
        /* ignore */
      }
    }, 220);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [inputValue, minChars]);

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <input
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
          onChange("0");
        }}
        onFocus={() => {
          if (items.length) setOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {inputValue.trim().length > 0 && inputValue.trim().length < minChars ? (
        <p className="mt-1 text-[11px] text-eid-text-secondary">Digite pelo menos {minChars} letras para sugerir locais.</p>
      ) : null}
      {inputValue.trim().length >= minChars && open && items.length ? (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-1 shadow-xl">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onChange(String(item.id));
                setInputValue(item.localizacao ? `${item.nome} — ${item.localizacao}` : item.nome);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-eid-surface/70"
            >
              <p className="truncate text-xs font-semibold text-eid-fg">{item.nome}</p>
              <p className="truncate text-[11px] text-eid-text-secondary">
                {item.localizacao ?? "Sem localização"}
                {item.distKm != null ? ` · ${String(item.distKm).replace(".", ",")} km` : ""}
              </p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
