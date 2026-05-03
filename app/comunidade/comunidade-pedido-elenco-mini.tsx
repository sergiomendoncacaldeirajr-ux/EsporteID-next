import { MapPin } from "lucide-react";
import { splitCityState } from "@/lib/geo/split-city-state";

/** Localização nos cards de pedido ao elenco (tema claro / escuro via tokens). */
export function PedidoElencoLocationLight({
  location,
  align,
}: {
  location: string | null;
  align: "start" | "end" | "center";
}) {
  const { cidade, estado } = splitCityState(location);
  const end = align === "end";
  const center = align === "center";
  return (
    <div
      className={`mt-1.5 flex flex-col gap-0.5 ${end ? "items-end text-right" : center ? "items-center text-center" : "items-start text-left"}`}
    >
      <div
        className={`flex max-w-[11rem] items-center gap-1 text-[11px] font-normal leading-tight text-eid-text-secondary ${end ? "justify-end" : center ? "justify-center" : "justify-start"}`}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-eid-text-muted" strokeWidth={2} aria-hidden />
        <span className="min-w-0 truncate">{cidade !== "-" ? cidade : "—"}</span>
      </div>
      {estado !== "-" ? (
        <p
          className={`text-[11px] font-bold leading-tight text-eid-fg ${end ? "text-end" : center ? "text-center" : "text-start"}`}
        >
          {estado}
        </p>
      ) : null}
    </div>
  );
}

/** Selo EID compacto — usa variáveis `--eid-seal-*` (claro/escuro em `globals.css`). */
export function PedidoElencoEidSeal({ notaEid }: { notaEid: number }) {
  const v = (Number.isFinite(notaEid) ? notaEid : 0).toFixed(1);
  return (
    <div
      className="inline-flex items-stretch overflow-hidden rounded-full border text-[9px] font-black leading-none sm:text-[10px] [border-color:var(--eid-seal-border)] [box-shadow:var(--eid-seal-shadow)]"
      title="Nota EID no esporte"
    >
      <span className="flex items-center px-[7px] py-[4px] uppercase tracking-[0.08em] [background-color:var(--eid-seal-label-bg)] [color:var(--eid-seal-label-fg)]">
        EID
      </span>
      <span className="flex items-center px-[7px] py-[4px] tabular-nums [background-color:var(--eid-seal-score-bg)] [color:var(--eid-seal-score-fg)]">
        {v}
      </span>
    </div>
  );
}
