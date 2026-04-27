"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

type SuggestItem = {
  id: number;
  slug: string | null;
  nome: string;
  localizacao: string | null;
  distKm: number | null;
};

type Props = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  inputStyle?: CSSProperties;
  minChars?: number;
};

export function LocalAutocompleteInput({
  name,
  defaultValue = "",
  placeholder = "Digite o nome do local...",
  className,
  inputStyle,
  minChars = 3,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const ctrlRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canSearch = useMemo(() => value.trim().length >= minChars, [value, minChars]);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (!canSearch) {
      return;
    }
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/locais/suggest?q=${encodeURIComponent(value.trim())}`, {
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
  }, [canSearch, value]);

  return (
    <div ref={rootRef} className="relative">
      <input
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => {
          if (items.length) setOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
        style={inputStyle}
      />
      {value.trim().length > 0 && value.trim().length < minChars ? (
        <p className="mt-1 text-[11px] text-eid-text-secondary">Digite pelo menos {minChars} letras para sugerir locais.</p>
      ) : null}
      {canSearch && open && items.length ? (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-1 shadow-xl">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setValue(item.localizacao ? `${item.nome} — ${item.localizacao}` : item.nome);
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
