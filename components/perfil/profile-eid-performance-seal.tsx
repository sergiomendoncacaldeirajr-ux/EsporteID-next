/**
 * Selo EID igual ao da seção "Performance EID" no perfil público (pill preto + azul).
 */
type Props = {
  notaEid: number;
  className?: string;
  title?: string;
  /** Selo menor (ex.: sobre a foto no radar Match). */
  compact?: boolean;
  /** Ex.: "Campinas - SP" */
  locationLabel?: string | null;
  /** Distância até o usuário em km. */
  distanceKm?: number | null;
};

function quebrarCidadeEstado(locationLabel?: string | null): { cidade: string; estado: string } | null {
  const loc = String(locationLabel ?? "").trim();
  if (!loc) return null;
  const partes = loc
    .split(/\/| - |–|—|,|\|/g)
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length >= 2) {
    return { cidade: partes[0] ?? "", estado: partes.slice(1).join(" ") };
  }
  return { cidade: loc, estado: "" };
}

function metaLinhas(locationLabel?: string | null, distanceKm?: number | null): string[] {
  const loc = quebrarCidadeEstado(locationLabel);
  const km = Number(distanceKm ?? NaN);
  const hasKm = Number.isFinite(km) && km >= 0 && km < 9000;
  if (!loc && !hasKm) return [];
  const kmTxt = hasKm ? `${km.toFixed(1).replace(".", ",")} km de você` : "";
  const linhas: string[] = [];
  if (loc?.cidade) linhas.push(loc.cidade);
  if (loc?.estado) linhas.push(loc.estado);
  if (kmTxt) linhas.push(kmTxt);
  return linhas;
}

export function ProfileEidPerformanceSeal({
  notaEid,
  className = "",
  title = "Nota EID no esporte",
  compact,
  locationLabel,
  distanceKm,
}: Props) {
  const v = Number.isFinite(notaEid) ? notaEid : 0;
  const meta = metaLinhas(locationLabel, distanceKm);
  if (compact) {
    return (
      <div className={`inline-flex shrink-0 flex-col items-center gap-0.5 ${className}`} title={title}>
        <div className="inline-flex items-center rounded-full border border-eid-primary-500/50 text-[6px] font-black uppercase leading-none text-white shadow-[0_2px_6px_rgba(2,6,23,0.28)] sm:text-[6.5px]">
          <span className="rounded-l-full bg-[linear-gradient(180deg,#0b0f14,#111827)] px-[4px] py-px sm:px-[4.5px]">EID</span>
          <span className="rounded-r-full bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_92%,white_8%),var(--eid-primary-500))] px-[4px] py-px tabular-nums sm:px-[4.5px]">
            {v.toFixed(1)}
          </span>
        </div>
        {meta.length ? (
          <span className="max-w-[130px] text-center text-[8px] leading-tight text-eid-text-secondary">
            {meta.map((linha, idx) => (
              <span key={`${linha}-${idx}`} className="block">
                {linha}
              </span>
            ))}
          </span>
        ) : null}
      </div>
    );
  }
  return (
    <div className={`inline-flex shrink-0 flex-col items-center gap-1 ${className}`} title={title}>
      <div className="inline-flex items-center rounded-full border border-eid-primary-500/50 text-[10px] font-black uppercase leading-none text-white shadow-[0_4px_14px_-8px_rgba(37,99,235,0.65)]">
        <span className="rounded-l-full bg-[linear-gradient(180deg,#0b0f14,#111827)] px-[7px] py-px">EID</span>
        <span className="rounded-r-full bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_92%,white_8%),var(--eid-primary-500))] px-[7px] py-px tabular-nums">
          {v.toFixed(1)}
        </span>
      </div>
      {meta.length ? (
        <span className="max-w-[220px] text-center text-[10px] leading-tight text-eid-text-secondary">
          {meta.map((linha, idx) => (
            <span key={`${linha}-${idx}`} className="block">
              {linha}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}
