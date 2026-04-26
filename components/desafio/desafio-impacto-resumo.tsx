import type { ColetivoImpactPreview, DesafioImpactPerspective } from "@/lib/desafio/impact-preview";

function fmtEid(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function fmtDeltaEid(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${fmtEid(n)}`;
}

function fmtDeltaPts(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

type Props = {
  esporteNome: string;
  regras: { pontos_vitoria: number; pontos_derrota: number };
  individual?: DesafioImpactPerspective | null;
  coletivo?: ColetivoImpactPreview | null;
};

export function DesafioImpactoResumo({ esporteNome, regras, individual, coletivo }: Props) {
  if (!individual && !coletivo) return null;

  return (
    <section
      className="mt-4 rounded-2xl border border-eid-action-500/30 bg-eid-action-500/[0.07] p-4 text-sm"
      aria-label="Estimativa de impacto no ranking e EID"
    >
      <p className="eid-desafio-impact-heading text-[11px] font-black uppercase tracking-[0.14em]">Impacto estimado · {esporteNome}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
        Valores para partida de ranking. Vitória no ranking: base{" "}
        <span className="font-semibold text-eid-fg">{regras.pontos_vitoria} pts</span>
        {regras.pontos_derrota !== 0 ? (
          <>
            {" "}
            · derrota: <span className="font-semibold text-eid-fg">{fmtDeltaPts(regras.pontos_derrota)} pts</span> no ranking
          </>
        ) : null}
        . Bônus extra se você vencer quem tem mais pontos no ranking (20% fixo dos pontos de vitória base).
      </p>

      {individual ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
            <p className="eid-desafio-impact-win-title text-[10px] font-bold uppercase tracking-wide">Se você vencer</p>
            <ul className="mt-2 space-y-1.5 text-xs text-eid-text-secondary">
              <li>
                Ranking: <span className="font-bold text-eid-fg">{fmtDeltaPts(individual.ifWin.rankingDelta)} pts</span>
                {individual.ifWin.rankingUpsetBonus > 0 ? (
                  <span className="text-eid-text-secondary"> (inclui {individual.ifWin.rankingUpsetBonus} de bônus zebra)</span>
                ) : null}
              </li>
              <li>
                EID: <span className="font-bold text-eid-fg">{fmtDeltaEid(individual.ifWin.eidDelta)}</span> → ~{" "}
                <span className="font-semibold text-eid-fg">{fmtEid(individual.ifWin.eidAfter)}</span>
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Se você perder</p>
            <ul className="mt-2 space-y-1.5 text-xs text-eid-text-secondary">
              <li>
                Ranking: <span className="font-bold text-eid-fg">{fmtDeltaPts(individual.ifLose.rankingDelta)} pts</span>
              </li>
              <li>
                EID: <span className="font-bold text-eid-fg">{fmtDeltaEid(individual.ifLose.eidDelta)}</span> → ~{" "}
                <span className="font-semibold text-eid-fg">{fmtEid(individual.ifLose.eidAfter)}</span>
              </li>
            </ul>
          </div>
        </div>
      ) : null}

      {coletivo ? (
        <div className="mt-3 space-y-3">
          <p className="text-[11px] text-eid-text-secondary">
            <span className="font-semibold text-eid-fg">{coletivo.selfTeam.nome}</span> ({coletivo.selfTeam.pontosRanking} pts / EID{" "}
            {fmtEid(coletivo.selfTeam.eidTime)}) × <span className="font-semibold text-eid-fg">{coletivo.opponentTeam.nome}</span> (
            {coletivo.opponentTeam.pontosRanking} pts / EID {fmtEid(coletivo.opponentTeam.eidTime)})
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3">
              <p className="eid-desafio-impact-win-title text-[10px] font-bold uppercase tracking-wide">Se sua formação vencer</p>
              <ul className="mt-2 space-y-1.5 text-xs text-eid-text-secondary">
                <li>
                  Ranking da equipe: <span className="font-bold text-eid-fg">{fmtDeltaPts(coletivo.teamIfWin.rankingDelta)} pts</span>
                  {coletivo.teamIfWin.rankingUpsetBonus > 0 ? (
                    <span className="text-eid-text-secondary"> (inclui {coletivo.teamIfWin.rankingUpsetBonus} bônus)</span>
                  ) : null}
                </li>
                <li>
                  EID da equipe: <span className="font-bold text-eid-fg">{fmtDeltaEid(coletivo.teamIfWin.eidDelta)}</span> → ~{" "}
                  <span className="font-semibold text-eid-fg">{fmtEid(coletivo.teamIfWin.eidAfter)}</span>
                </li>
                <li>
                  Seu EID no esporte (transbordo): <span className="font-bold text-eid-fg">{fmtDeltaEid(coletivo.memberIfWin.eidDelta)}</span>{" "}
                  → ~ <span className="font-semibold text-eid-fg">{fmtEid(coletivo.memberIfWin.eidAfter)}</span>
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Se sua formação perder</p>
              <ul className="mt-2 space-y-1.5 text-xs text-eid-text-secondary">
                <li>
                  Ranking da equipe: <span className="font-bold text-eid-fg">{fmtDeltaPts(coletivo.teamIfLose.rankingDelta)} pts</span>
                </li>
                <li>
                  EID da equipe: <span className="font-bold text-eid-fg">{fmtDeltaEid(coletivo.teamIfLose.eidDelta)}</span> → ~{" "}
                  <span className="font-semibold text-eid-fg">{fmtEid(coletivo.teamIfLose.eidAfter)}</span>
                </li>
                <li>
                  Seu EID no esporte (transbordo): <span className="font-bold text-eid-fg">{fmtDeltaEid(coletivo.memberIfLose.eidDelta)}</span>{" "}
                  → ~ <span className="font-semibold text-eid-fg">{fmtEid(coletivo.memberIfLose.eidAfter)}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
