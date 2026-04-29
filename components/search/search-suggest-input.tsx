"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type SuggestItem = {
  id: string;
  value: string;
  title: string;
  subtitle?: string | null;
  href?: string;
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  minChars?: number;
  scope?: "global" | "times" | "torneios" | "locais";
  onPickValue?: (v: string) => void;
  withSearchIcon?: boolean;
};

export function SearchSuggestInput({
  value,
  onChange,
  name,
  id,
  placeholder,
  className,
  minChars = 3,
  scope = "global",
  onPickValue,
  withSearchIcon = false,
}: Props) {
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (q.length < minChars) return;
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}&scope=${scope}`, {
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
  }, [value, minChars, scope]);

  const canShow = value.trim().length >= minChars && open;

  return (
    <div ref={rootRef} className="relative">
      {withSearchIcon ? (
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#6F7F99]" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
        </span>
      ) : null}
      <input
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          if (items.length || value.trim().length >= minChars) setOpen(true);
        }}
        autoComplete="off"
        placeholder={placeholder}
        className={`${className ?? ""} ${withSearchIcon ? "!pl-14" : ""}`.trim()}
      />
      {canShow ? (
        <div className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-1 shadow-xl">
          {items.length ? (
            items.map((item) =>
              item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block rounded-lg px-2.5 py-2 hover:bg-eid-surface/70"
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <p className="truncate text-xs font-semibold text-eid-fg">{item.title}</p>
                  {item.subtitle ? <p className="truncate text-[11px] text-eid-text-secondary">{item.subtitle}</p> : null}
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const next = item.value;
                    onChange(next);
                    onPickValue?.(next);
                    setOpen(false);
                  }}
                  className="block w-full rounded-lg px-2.5 py-2 text-left hover:bg-eid-surface/70"
                >
                  <p className="truncate text-xs font-semibold text-eid-fg">{item.title}</p>
                  {item.subtitle ? <p className="truncate text-[11px] text-eid-text-secondary">{item.subtitle}</p> : null}
                </button>
              )
            )
          ) : (
            <p className="px-2.5 py-2 text-[11px] text-eid-text-secondary">Não encontramos nada com esse termo.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
