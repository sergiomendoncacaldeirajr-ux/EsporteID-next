"use client";

import Link from "next/link";
import { useState } from "react";
import { SearchSuggestInput } from "@/components/search/search-suggest-input";

type Props = {
  action: string;
  defaultValue?: string;
  placeholder: string;
  scope?: "global" | "times" | "torneios" | "locais";
  label?: string;
  clearHref?: string;
  className?: string;
  inputClassName?: string;
  submitClassName?: string;
  clearClassName?: string;
};

export function SearchSuggestGetForm({
  action,
  defaultValue = "",
  placeholder,
  scope = "global",
  label = "Buscar",
  clearHref,
  className,
  inputClassName,
  submitClassName,
  clearClassName,
}: Props) {
  const [q, setQ] = useState(defaultValue);
  return (
    <form method="get" className={className} action={action}>
      <label className="grid min-w-[200px] flex-1 gap-1">
        <span className="text-[10px] font-bold uppercase text-eid-text-secondary">{label}</span>
        <SearchSuggestInput
          name="q"
          value={q}
          onChange={setQ}
          scope={scope}
          minChars={3}
          placeholder={placeholder}
          className={inputClassName}
        />
      </label>
      <button type="submit" className={submitClassName}>
        Buscar
      </button>
      {q.trim().length > 0 && clearHref ? (
        <Link href={clearHref} className={clearClassName}>
          Limpar
        </Link>
      ) : null}
    </form>
  );
}
