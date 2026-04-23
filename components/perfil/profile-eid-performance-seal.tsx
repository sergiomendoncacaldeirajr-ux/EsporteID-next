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
        className={`inline-flex shrink-0 items-center rounded-full border border-eid-primary-500/45 text-[7px] font-black uppercase leading-none text-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] ${className}`}
        title={title}
      >
        <span className="rounded-l-full bg-black px-[5px] py-px">EID</span>
        <span className="rounded-r-full bg-eid-primary-500 px-[5px] py-px tabular-nums">{v.toFixed(1)}</span>
      </div>
    );
  }
  return (
    <div
      className={`inline-flex shrink-0 items-center rounded-full border border-eid-primary-500/45 text-[10px] font-black uppercase leading-none text-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] ${className}`}
      title={title}
    >
      <span className="rounded-l-full bg-black px-[7px] py-px">EID</span>
      <span className="rounded-r-full bg-eid-primary-500 px-[7px] py-px tabular-nums">{v.toFixed(1)}</span>
    </div>
  );
}
