import { EidCityState } from "@/components/ui/eid-city-state";
import { EidSealPill, type EidSealPillVariant } from "@/components/ui/eid-seal-pill";

/**
 * Selo EID em cápsula (carvão + faixa azul): cores em `globals.css` via `--eid-seal-*` (claro/escuro).
 */
type Props = {
  notaEid: number;
  className?: string;
  title?: string;
  /** Selo menor (ex.: sobre a foto no radar Match). */
  compact?: boolean;
  /** Variante visual do selo EID (só o chip; meta/local não muda). Default: `compact` se `compact`, senão `default`. */
  sealVariant?: Extract<EidSealPillVariant, "compact" | "emphasis" | "default">;
  /** Ex.: "Campinas - SP" */
  locationLabel?: string | null;
  /** Distância até o usuário em km. */
  distanceKm?: number | null;
};

function kmLabel(distanceKm?: number | null): string | null {
  const km = Number(distanceKm ?? NaN);
  const hasKm = Number.isFinite(km) && km >= 0 && km < 9000;
  if (!hasKm) return null;
  return `${km.toFixed(1).replace(".", ",")} km de você`;
}

export function ProfileEidPerformanceSeal({
  notaEid,
  className = "",
  title = "Nota EID no esporte",
  compact,
  sealVariant,
  locationLabel,
  distanceKm,
}: Props) {
  const v = Number.isFinite(notaEid) ? notaEid : 0;
  const hasLoc = Boolean(String(locationLabel ?? "").trim());
  const kmTxt = kmLabel(distanceKm);
  const showMeta = hasLoc || Boolean(kmTxt);
  const pillVariant: EidSealPillVariant =
    sealVariant ?? (compact ? "compact" : "default");

  if (compact) {
    return (
      <div className={`inline-flex shrink-0 flex-col items-center gap-0.5 ${className}`} title={title}>
        <EidSealPill value={v} variant={pillVariant} />
        {showMeta ? (
          <div className="flex max-w-[130px] flex-col items-center gap-0.5">
            {hasLoc ? <EidCityState location={locationLabel} compact align="center" className="w-full" /> : null}
            {kmTxt ? (
              <span className="text-center text-[8px] leading-tight text-eid-text-secondary">{kmTxt}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div className={`inline-flex shrink-0 flex-col items-center gap-1 ${className}`} title={title}>
      <EidSealPill value={v} variant={pillVariant} />
      {showMeta ? (
        <div className="flex max-w-[220px] flex-col items-center gap-0.5">
          {hasLoc ? <EidCityState location={locationLabel} align="center" className="w-full" /> : null}
          {kmTxt ? (
            <span className="text-center text-[10px] leading-tight text-eid-text-secondary">{kmTxt}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
