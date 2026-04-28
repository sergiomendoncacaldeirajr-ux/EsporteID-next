"use client";

import { useState } from "react";
import { SearchSuggestInput } from "@/components/search/search-suggest-input";

type Props = {
  defaultValue?: string;
  placeholder: string;
  scope: "global" | "times" | "torneios" | "locais";
  buttonLabel?: string;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
  /** GET action (ex.: `/times`). Se omitido, envia para a URL atual. */
  formAction?: string;
  /** Campos ocultos preservados no filtro (ex.: `{ todas: "1" }`). */
  hiddenFields?: Record<string, string>;
};

export function SearchFilterForm({
  defaultValue = "",
  placeholder,
  scope,
  buttonLabel = "Filtrar",
  className,
  inputClassName,
  buttonClassName,
  formAction,
  hiddenFields,
}: Props) {
  const [q, setQ] = useState(defaultValue);
  return (
    <form className={className} method="get" action={formAction}>
      {hiddenFields
        ? Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}
      <SearchSuggestInput
        name="q"
        value={q}
        onChange={setQ}
        scope={scope}
        minChars={3}
        placeholder={placeholder}
        className={inputClassName}
      />
      <button type="submit" className={buttonClassName}>
        {buttonLabel}
      </button>
    </form>
  );
}
