import { MapPin } from "lucide-react";
import type { HTMLAttributes } from "react";
import { splitCityState } from "@/lib/geo/split-city-state";

type Props = HTMLAttributes<HTMLDivElement> & {
  /** Texto único (ex.: perfil/times); quebra automática em cidade / estado. */
  location?: string | null;
  cidade?: string | null;
  estado?: string | null;
  compact?: boolean;
  align?: "start" | "center" | "end";
  /** `stacked` = cidade e estado em linhas separadas; `inline` = "Cidade - Estado" na mesma linha. */
  layout?: "stacked" | "inline";
  /** Quando não há cidade nem estado (ou string vazia). */
  emptyLabel?: string;
};

export function EidCityState({
  location,
  cidade,
  estado,
  compact = false,
  align = "start",
  layout = "stacked",
  emptyLabel = "Localização não informada",
  className = "",
  ...props
}: Props) {
  const hasExplicit = cidade != null || estado != null;
  const { cidade: c0, estado: e0 } = hasExplicit
    ? {
        cidade: String(cidade ?? "").trim() || "-",
        estado: String(estado ?? "").trim() || "-",
      }
    : splitCityState(location);

  const isEmpty = c0 === "-" && e0 === "-";
  const showState = !isEmpty && e0 !== "-";

  const alignItems =
    align === "center" ? "items-center" : align === "end" ? "items-end" : "items-start";
  const rowJustify =
    align === "center" ? "justify-center" : align === "end" ? "justify-end" : "justify-start";
  const textAlign = align === "center" ? "text-center" : align === "end" ? "text-end" : "text-start";

  const citySize = compact ? "text-[9px] leading-tight" : "text-xs leading-snug";
  const stateSize = compact ? "text-[10px] leading-tight" : "text-sm leading-tight";
  const iconClass = compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5";

  const cityMuted =
    "text-[color:color-mix(in_srgb,var(--eid-text-secondary)_88%,var(--eid-primary-400)_12%)]";

  if (isEmpty) {
    return (
      <div className={`flex min-w-0 flex-col gap-0 ${alignItems} ${className}`.trim()} {...props}>
        <div className={`flex min-w-0 max-w-full items-center gap-1 ${rowJustify} ${cityMuted} ${citySize} font-normal`}>
          <MapPin className={`${iconClass} shrink-0 opacity-90`} strokeWidth={2.25} aria-hidden />
          <span className="min-w-0 truncate">{emptyLabel}</span>
        </div>
      </div>
    );
  }

  if (layout === "inline") {
    return (
      <div
        className={`flex min-w-0 max-w-full items-center gap-1 ${rowJustify} ${citySize} ${className}`.trim()}
        {...props}
      >
        <MapPin className={`${iconClass} shrink-0 opacity-90 ${cityMuted}`} strokeWidth={2.25} aria-hidden />
        <span className="min-w-0 truncate text-eid-fg">
          {showState ? (
            <>
              <span className={`font-semibold ${cityMuted}`}>{c0 !== "-" ? c0 : "—"}</span>
              <span className="font-normal text-eid-text-secondary"> - </span>
              <span className="font-bold">{e0}</span>
            </>
          ) : (
            <span className="font-semibold">{c0 !== "-" ? c0 : "—"}</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${alignItems} ${className}`.trim()} {...props}>
      <div className={`flex min-w-0 max-w-full items-center gap-1 ${rowJustify} ${cityMuted} ${citySize} font-normal`}>
        <MapPin className={`${iconClass} shrink-0 opacity-90`} strokeWidth={2.25} aria-hidden />
        <span className="min-w-0 truncate">{c0 !== "-" ? c0 : "—"}</span>
      </div>
      {showState ? (
        <p className={`min-w-0 max-w-full truncate font-bold text-eid-fg ${stateSize} ${textAlign}`}>{e0}</p>
      ) : null}
    </div>
  );
}
