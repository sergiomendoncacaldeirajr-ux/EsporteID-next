import { getPerfilTimePartidasBundle } from "./perfil-time-payload";

export type PerfilTimeHeroWinStatsProps = {
  timeId: number;
  viewerId: string;
};

export async function PerfilTimeHeroWinStats({ timeId, viewerId }: PerfilTimeHeroWinStatsProps) {
  const { vitoriasTime, derrotasTime, winRateTime, jogosTime } = await getPerfilTimePartidasBundle(timeId, viewerId);

  return (
    <div className="mt-4 grid grid-cols-4 divide-x divide-[rgba(255,255,255,0.05)] overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-surface)_82%,var(--eid-primary-900)_18%),color-mix(in_srgb,var(--eid-bg)_88%,transparent))] text-center shadow-[0_4px_16px_-10px_rgba(15,23,42,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="px-1 py-2.5">
        <p className="text-sm font-black text-eid-fg">{vitoriasTime}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Vitórias</p>
      </div>
      <div className="px-1 py-2.5">
        <p className="text-sm font-black text-eid-fg">{derrotasTime}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Derrotas</p>
      </div>
      <div className="px-1 py-2.5">
        <p className="text-sm font-black text-eid-action-500">{winRateTime != null ? `${winRateTime}%` : "—"}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Win Rate</p>
      </div>
      <div className="px-1 py-2.5">
        <p className="text-sm font-black text-eid-primary-400">{jogosTime}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Jogos</p>
      </div>
    </div>
  );
}
