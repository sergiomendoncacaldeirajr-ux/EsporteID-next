import type { CSSProperties } from "react";
import { GoalsScoreboardSummary } from "@/components/placar/goals-scoreboard-summary";
import { parseScorePayloadFromPartidaMensagem } from "@/lib/perfil/parse-partida-score-payload";
import type { PublicConfronto } from "@/lib/confrontos/public-feed";
import type { MatchScorePayload } from "@/lib/match-scoring";

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function cleanMessage(message: string | null) {
  const raw = String(message ?? "").trim();
  if (!raw || raw.startsWith("score_payload:")) return null;
  const idx = raw.indexOf("score_payload:");
  return (idx >= 0 ? raw.slice(0, idx) : raw).trim() || null;
}

function SetsDetail({ item, sets }: { item: PublicConfronto; sets: NonNullable<MatchScorePayload["sets"]> }) {
  const winsA = sets.filter((set) => n(set.a) > n(set.b)).length;
  const winsB = sets.filter((set) => n(set.b) > n(set.a)).length;
  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45">
      <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] px-3 py-2">
        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-eid-primary-300">Placar por sets</p>
        <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-0.5 text-[9px] font-black text-eid-primary-200">
          {winsA} × {winsB}
        </span>
      </div>
      <div className="overflow-x-auto p-2">
        <div className="min-w-[18rem] rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60">
          <div className="grid grid-cols-[minmax(5.5rem,1fr)_repeat(var(--sets),minmax(2.25rem,0.45fr))]" style={{ "--sets": sets.length } as CSSProperties}>
            <div className="border-b border-r border-[color:var(--eid-border-subtle)] px-2 py-1 text-[8px] font-black uppercase text-eid-text-secondary">Lado</div>
            {sets.map((_, idx) => (
              <div key={idx} className="border-b border-r border-[color:var(--eid-border-subtle)] px-2 py-1 text-center text-[8px] font-black text-eid-text-secondary last:border-r-0">
                S{idx + 1}
              </div>
            ))}
            <div className="border-r border-[color:var(--eid-border-subtle)] px-2 py-2 text-[10px] font-bold text-eid-fg">{item.ladoA.name}</div>
            {sets.map((set, idx) => (
              <div key={`a-${idx}`} className="border-r border-[color:var(--eid-border-subtle)] px-2 py-2 text-center text-sm font-black tabular-nums text-eid-fg last:border-r-0">
                {n(set.a)}
                {n(set.tiebreakA) || n(set.tiebreakB) ? <sup className="ml-0.5 text-[9px] text-eid-primary-300">{n(set.tiebreakA)}</sup> : null}
              </div>
            ))}
            <div className="border-r border-t border-[color:var(--eid-border-subtle)] px-2 py-2 text-[10px] font-bold text-eid-fg">{item.ladoB.name}</div>
            {sets.map((set, idx) => (
              <div key={`b-${idx}`} className="border-r border-t border-[color:var(--eid-border-subtle)] px-2 py-2 text-center text-sm font-black tabular-nums text-eid-fg last:border-r-0">
                {n(set.b)}
                {n(set.tiebreakA) || n(set.tiebreakB) ? <sup className="ml-0.5 text-[9px] text-eid-primary-300">{n(set.tiebreakB)}</sup> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PointsDetail({ item, points }: { item: PublicConfronto; points: { a: number; b: number; overtimeA?: number; overtimeB?: number } }) {
  const otA = n(points.overtimeA);
  const otB = n(points.overtimeB);
  return (
    <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-eid-primary-300">Placar por pontos</p>
      <p className="mt-2 text-3xl font-black tabular-nums text-eid-fg">
        {n(points.a) + otA} × {n(points.b) + otB}
      </p>
      {otA || otB ? (
        <p className="mt-1 text-[10px] font-semibold text-eid-text-secondary">
          Tempo regular {n(points.a)}×{n(points.b)} · Prorrogação {otA}×{otB}
        </p>
      ) : null}
      <p className="mt-2 text-[10px] text-eid-text-secondary">{item.ladoA.name} vs {item.ladoB.name}</p>
    </div>
  );
}

function RoundsDetail({ rounds }: { rounds: NonNullable<MatchScorePayload["rounds"]> }) {
  const methodLabel: Record<string, string> = { decision: "Decisão", ko: "KO", tko: "TKO", submission: "Finalização" };
  return (
    <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-eid-primary-300">Rounds</p>
        <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/12 px-2 py-0.5 text-[9px] font-black text-eid-action-300">
          {methodLabel[rounds.method] ?? rounds.method}
        </span>
      </div>
      <div className="mt-2 grid gap-1.5">
        {rounds.items.map((round, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 px-3 py-2 text-xs">
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
  const note = cleanMessage(item.mensagem);

  return (
    <section className="mt-3 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/75 p-4">
      <h2 className="text-base font-black text-eid-fg">Resultado completo</h2>
      <div className="mt-3 grid gap-3">
        {payload?.type === "gols" && payload.goals ? (
          <GoalsScoreboardSummary goals={payload.goals} sportName={item.esporteNome} variant="hero" />
        ) : payload?.type === "sets" && Array.isArray(payload.sets) && payload.sets.length > 0 ? (
          <SetsDetail item={item} sets={payload.sets} />
        ) : payload?.type === "pontos" && payload.points ? (
          <PointsDetail item={item} points={payload.points} />
        ) : payload?.type === "rounds" && payload.rounds ? (
          <RoundsDetail rounds={payload.rounds} />
        ) : (
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-eid-primary-300">Placar final</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-eid-fg">{item.placar ?? "—"}</p>
          </div>
        )}
        {note ? (
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-eid-text-secondary">Observação</p>
            <p className="mt-1 text-xs leading-relaxed text-eid-fg">{note}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
