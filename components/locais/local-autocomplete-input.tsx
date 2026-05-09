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
  /**
   * When provided, a hidden `<input>` with this name submits the selected
   * espaco ID. Empty string when no suggestion has been selected.
   */
  espacoIdName?: string;
  /** Pre-fill the espaco ID — useful when returning from the "register new
   *  space" flow where the server already knows which espaco was just created. */
  defaultEspacoId?: number | null;
  placeholder?: string;
  className?: string;
  inputStyle?: CSSProperties;
  minChars?: number;
};

export function LocalAutocompleteInput({
  name,
  defaultValue = "",
  espacoIdName,
  defaultEspacoId = null,
  placeholder = "Digite o nome do local...",
  className,
  inputStyle,
  minChars = 3,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [selectedId, setSelectedId] = useState<number | null>(defaultEspacoId);
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const ctrlRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canSearch = useMemo(() => value.trim().length >= minChars, [value, minChars]);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    setSelectedId(defaultEspacoId);
  }, [defaultEspacoId]);

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
      {/* Hidden ID field — populated when user picks from the dropdown. */}
      {espacoIdName && (
        <input type="hidden" name={espacoIdName} value={selectedId ?? ""} />
      )}
      <input
        name={name}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          // Manual typing resets the linked espaco ID.
          setSelectedId(null);
        }}
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
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_98%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-1 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.55)]">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setValue(item.localizacao ? `${item.nome} — ${item.localizacao}` : item.nome);
                setSelectedId(item.id);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-2.5 py-2.5 text-left transition hover:bg-eid-primary-500/10"
            >
              <p className="truncate text-[13px] font-bold text-eid-fg">{item.nome}</p>
              <p className="truncate text-[11px] leading-snug text-eid-text-secondary">
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
