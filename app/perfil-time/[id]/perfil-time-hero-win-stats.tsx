import { getPerfilTimePartidasBundle } from "./perfil-time-payload";

export type PerfilTimeHeroWinStatsProps = {
  timeId: number;
  viewerId: string;
};

export async function PerfilTimeHeroWinStats({ timeId, viewerId }: PerfilTimeHeroWinStatsProps) {
  const { vitoriasTime, derrotasTime, winRateTime, jogosTime } = await getPerfilTimePartidasBundle(timeId, viewerId);

  return (
    <div className="mt-4 grid grid-cols-4 divide-x divide-transparent rounded-xl border border-transparent bg-eid-surface/40 text-center shadow-none">
      <div className="py-2">
        <p className="text-sm font-black text-eid-fg">{vitoriasTime}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Vitórias</p>
      </div>
      <div className="py-2">
        <p className="text-sm font-black text-eid-fg">{derrotasTime}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Derrotas</p>
      </div>
      <div className="py-2">
        <p className="text-sm font-black text-eid-action-500">{winRateTime != null ? `${winRateTime}%` : "—"}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Win Rate</p>
      </div>
      <div className="py-2">
        <p className="text-sm font-black text-eid-primary-400">{jogosTime}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Jogos</p>
      </div>
    </div>
  );
}
