import Image from "next/image";
import { GoalsScoreboardSummary } from "@/components/placar/goals-scoreboard-summary";
import { parseScorePayloadFromPartidaMensagem } from "@/lib/perfil/parse-partida-score-payload";
import type { PublicConfronto } from "@/lib/confrontos/public-feed";
import type { MatchScorePayload } from "@/lib/match-scoring";

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function SectionHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-eid-primary-500 eid-light:text-eid-primary-600">
        {title}
      </p>
      {badge ? (
        <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/12 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-eid-primary-300 eid-light:text-eid-primary-700">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function PlayerCell({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <div className="flex items-center gap-2 px-2 py-2.5">
      <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" fill unoptimized className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[8px] font-black text-eid-primary-300">
            {(name.trim().slice(0, 2) || "—").toUpperCase()}
          </span>
        )}
      </span>
      <span className="truncate text-[10px] font-black uppercase tracking-[0.04em] text-eid-fg">{name.split(" ")[0]?.toUpperCase()}</span>
    </div>
  );
}

function SetsDetail({ item, sets }: { item: PublicConfronto; sets: NonNullable<MatchScorePayload["sets"]> }) {
  const colCount = sets.length;
  return (
    <div className="overflow-hidden rounded-3xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,var(--eid-primary-500)_4%),var(--eid-card))] shadow-[0_8px_24px_-18px_rgba(15,23,42,0.45)] eid-light:bg-white eid-light:shadow-[0_4px_16px_-12px_rgba(15,23,42,0.1)]">
      <div className="border-b border-[color:var(--eid-border-subtle)] px-4 py-3 eid-light:border-slate-100">
        <SectionHeader title="Placar por sets" badge="Sets" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[18rem] border-collapse text-center">
          <thead>
            <tr className="border-b border-[color:var(--eid-border-subtle)] eid-light:border-slate-100">
              <th className="py-2 pl-4 pr-2 text-left text-[9px] font-black uppercase tracking-[0.08em] text-eid-text-secondary">
                Jogador
              </th>
              {sets.map((_, idx) => (
                <th key={idx} className="px-2 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-eid-text-secondary">
                  {idx + 1}º Set
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[color:var(--eid-border-subtle)] eid-light:border-slate-100">
              <td className="pl-4 pr-2 text-left">
                <PlayerCell name={item.ladoA.name} avatarUrl={item.ladoA.avatarUrl} />
              </td>
              {sets.map((set, idx) => (
                <td key={`a-${idx}`} className="px-2 py-2.5 text-[15px] font-black tabular-nums text-eid-fg">
                  {n(set.a)}
                  {n(set.tiebreakA) || n(set.tiebreakB) ? (
                    <sup className="ml-0.5 text-[9px] font-bold text-eid-primary-300">{n(set.tiebreakA)}</sup>
                  ) : null}
                </td>
              ))}
            </tr>
            <tr>
              <td className="pl-4 pr-2 text-left">
                <PlayerCell name={item.ladoB.name} avatarUrl={item.ladoB.avatarUrl} />
              </td>
              {sets.map((set, idx) => (
                <td key={`b-${idx}`} className="px-2 py-2.5 text-[15px] font-black tabular-nums text-eid-fg">
                  {n(set.b)}
                  {n(set.tiebreakA) || n(set.tiebreakB) ? (
                    <sup className="ml-0.5 text-[9px] font-bold text-eid-primary-300">{n(set.tiebreakB)}</sup>
                  ) : null}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PointsDetail({ item, points }: { item: PublicConfronto; points: { a: number; b: number; overtimeA?: number; overtimeB?: number } }) {
  const otA = n(points.overtimeA);
  const otB = n(points.overtimeB);
  return (
    <div className="overflow-hidden rounded-3xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,var(--eid-primary-500)_4%),var(--eid-card))] eid-light:bg-white">
      <div className="border-b border-[color:var(--eid-border-subtle)] px-4 py-3 eid-light:border-slate-100">
        <SectionHeader title="Placar por pontos" badge="Pontos" />
      </div>
      <div className="px-4 py-4 text-center">
        <p className="text-[2.5rem] font-black tabular-nums leading-none text-eid-fg">
          {n(points.a) + otA} × {n(points.b) + otB}
        </p>
        {otA || otB ? (
          <p className="mt-2 text-[10px] font-semibold text-eid-text-secondary">
            Tempo regular {n(points.a)}×{n(points.b)} · Prorrogação {otA}×{otB}
          </p>
        ) : null}
        <p className="mt-2 text-[10px] text-eid-text-secondary">{item.ladoA.name} vs {item.ladoB.name}</p>
      </div>
    </div>
  );
}

function RoundsDetail({ rounds }: { rounds: NonNullable<MatchScorePayload["rounds"]> }) {
  const methodLabel: Record<string, string> = { decision: "Decisão", ko: "KO", tko: "TKO", submission: "Finalização" };
  return (
    <div className="overflow-hidden rounded-3xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,var(--eid-primary-500)_4%),var(--eid-card))] eid-light:bg-white">
      <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] px-4 py-3 eid-light:border-slate-100">
        <SectionHeader title="Rounds" badge={methodLabel[rounds.method] ?? rounds.method} />
      </div>
      <div className="grid gap-1.5 px-4 py-3">
        {rounds.items.map((round, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 px-3 py-2 text-xs eid-light:bg-slate-50">
            <span className="font-bold text-eid-text-secondary">Round {idx + 1}</span>
            <span className="font-black tabular-nums text-eid-fg">{n(round.a)} × {n(round.b)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConfrontoDetalheResultado({ item }: { item: PublicConfronto }) {
  const payload = parseScorePayloadFromPartidaMensagem(item.mensagem);

  const hasDetailedScore =
    (payload?.type === "gols" && payload.goals) ||
    (payload?.type === "sets" && Array.isArray(payload.sets) && payload.sets.length > 0) ||
    (payload?.type === "pontos" && payload.points) ||
    (payload?.type === "rounds" && payload.rounds);

  if (!hasDetailedScore) return null;

  return (
    <div className="grid gap-3">
      {payload?.type === "gols" && payload.goals ? (
        <GoalsScoreboardSummary goals={payload.goals} sportName={item.esporteNome} variant="hero" />
      ) : payload?.type === "sets" && Array.isArray(payload.sets) && payload.sets.length > 0 ? (
        <SetsDetail item={item} sets={payload.sets} />
      ) : payload?.type === "pontos" && payload.points ? (
        <PointsDetail item={item} points={payload.points} />
      ) : payload?.type === "rounds" && payload.rounds ? (
        <RoundsDetail rounds={payload.rounds} />
      ) : null}
    </div>
  );
}
