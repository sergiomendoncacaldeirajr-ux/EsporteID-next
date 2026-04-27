/**
 * Selo EID igual ao da seção "Performance EID" no perfil público (pill preto + azul).
 */
type Props = {
  notaEid: number;
  className?: string;
  title?: string;
  /** Selo menor (ex.: sobre a foto no radar Match). */
  compact?: boolean;
};

export function ProfileEidPerformanceSeal({ notaEid, className = "", title = "Nota EID no esporte", compact }: Props) {
  const v = Number.isFinite(notaEid) ? notaEid : 0;
  if (compact) {
    return (
      <div
        className={`inline-flex shrink-0 items-center rounded-full border border-eid-primary-500/50 text-[6px] font-black uppercase leading-none text-white shadow-[0_2px_6px_rgba(2,6,23,0.28)] sm:text-[6.5px] ${className}`}
        title={title}
      >
        <span className="rounded-l-full bg-[linear-gradient(180deg,#0b0f14,#111827)] px-[4px] py-px sm:px-[4.5px]">EID</span>
        <span className="rounded-r-full bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_92%,white_8%),var(--eid-primary-500))] px-[4px] py-px tabular-nums sm:px-[4.5px]">
          {v.toFixed(1)}
        </span>
      </div>
    );
  }
  return (
    <div
      className={`inline-flex shrink-0 items-center rounded-full border border-eid-primary-500/50 text-[10px] font-black uppercase leading-none text-white shadow-[0_4px_14px_-8px_rgba(37,99,235,0.65)] ${className}`}
      title={title}
    >
      <span className="rounded-l-full bg-[linear-gradient(180deg,#0b0f14,#111827)] px-[7px] py-px">EID</span>
      <span className="rounded-r-full bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_92%,white_8%),var(--eid-primary-500))] px-[7px] py-px tabular-nums">
        {v.toFixed(1)}
      </span>
    </div>
  );
}
