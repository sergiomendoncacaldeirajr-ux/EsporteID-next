import { getPerfilDuplaPartidasBundle } from "./perfil-dupla-payload";

export type PerfilDuplaHeroWinStatsProps = {
  duplaId: number;
  viewerId: string;
};

export async function PerfilDuplaHeroWinStats({ duplaId, viewerId }: PerfilDuplaHeroWinStatsProps) {
  const { vitoriasDupla, derrotasDupla, winRateDupla, jogosDupla } = await getPerfilDuplaPartidasBundle(duplaId, viewerId);

  return (
    <div className="mt-4 grid grid-cols-4 divide-x divide-transparent rounded-xl border border-transparent bg-eid-surface/40 text-center shadow-none">
      <div className="py-2">
        <p className="text-sm font-black text-eid-fg">{vitoriasDupla}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Vitórias</p>
      </div>
      <div className="py-2">
        <p className="text-sm font-black text-eid-fg">{derrotasDupla}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Derrotas</p>
      </div>
      <div className="py-2">
        <p className="text-sm font-black text-eid-action-500">{winRateDupla != null ? `${winRateDupla}%` : "—"}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Win Rate</p>
      </div>
      <div className="py-2">
        <p className="text-sm font-black text-eid-primary-400">{jogosDupla}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Jogos</p>
      </div>
    </div>
  );
}
