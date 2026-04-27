"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

type ScorePayload = {
  type?: "sets" | "gols" | "pontos" | "rounds";
  sets?: Array<{ a?: number; b?: number; tiebreakA?: number; tiebreakB?: number }>;
  goals?: { a?: number; b?: number; overtimeA?: number; overtimeB?: number; penaltiesA?: number; penaltiesB?: number };
  points?: { a?: number; b?: number; overtimeA?: number; overtimeB?: number };
  rounds?: { method?: string; winner?: "a" | "b"; items?: Array<{ a?: number; b?: number; winner?: "a" | "b" | null }> };
};

type ResumoHistoricoItem = {
  id: number | string;
  dataHora: string;
  local: string | null;
  localHref?: string | null;
  placar: string;
  origem: "Ranking" | "Torneio";
  confronto?: string | null;
};

type Props = {
  titulo: string;
  subtitulo?: string;
  ladoA: string;
  ladoB: string;
  ladoAAvatarUrl?: string | null;
  ladoBAvatarUrl?: string | null;
  ladoAProfileHref?: string | null;
  ladoBProfileHref?: string | null;
  origem: "Ranking" | "Torneio";
  dataHora: string;
  local: string | null;
  localHref?: string | null;
  placarBase: string;
  mensagem?: string | null;
  totalConfrontos: number;
  saldoResumo?: string | null;
  ultimosConfrontos: ResumoHistoricoItem[];
  children: ReactNode;
  asListItem?: boolean;
  rowClassName?: string;
};

function parseScorePayloadFromMessage(message: string | null | undefined): ScorePayload | null {
  const raw = String(message ?? "").trim();
  if (!raw) return null;
  const marker = "score_payload:";
  const idx = raw.indexOf(marker);
  if (idx < 0) return null;
  const jsonRaw = raw.slice(idx + marker.length).trim();
  if (!jsonRaw) return null;
  try {
    const parsed = JSON.parse(jsonRaw) as ScorePayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function EidConfrontoResumoModal({
  titulo,
  subtitulo,
  ladoA,
  ladoB,
  ladoAAvatarUrl,
  ladoBAvatarUrl,
  ladoAProfileHref,
  ladoBProfileHref,
  origem,
  dataHora,
  local,
  localHref,
  placarBase,
  mensagem,
  totalConfrontos,
  saldoResumo,
  ultimosConfrontos,
  children,
  asListItem = false,
  rowClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const payload = useMemo(() => parseScorePayloadFromMessage(mensagem), [mensagem]);
  const [closing, setClosing] = useState(false);

  const closeWithAnimation = () => {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 170);
  };

  return (
    <>
      {asListItem ? (
        <li
          role="button"
          tabIndex={0}
          onClick={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("a, button, [data-no-modal='1']")) return;
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(true);
            }
          }}
          className={rowClassName ?? "cursor-pointer"}
        >
          {children}
        </li>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("a, button, [data-no-modal='1']")) return;
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(true);
            }
          }}
          className={rowClassName ?? "cursor-pointer"}
        >
          {children}
        </div>
      )}

      {open ? (
        <div
          className={`fixed inset-0 z-[100] flex items-end justify-center p-2 backdrop-blur-[2px] transition-all duration-150 sm:items-center sm:p-4 ${
            closing
              ? "bg-transparent opacity-0"
              : "bg-[color:color-mix(in_srgb,var(--eid-bg)_44%,black_56%)] opacity-100"
          }`}
          onClick={closeWithAnimation}
        >
          <div
            className={`max-h-[90vh] w-full max-w-xl overflow-hidden rounded-3xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_28%,var(--eid-border-subtle)_72%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_88%,var(--eid-primary-500)_12%),var(--eid-card))] shadow-[0_26px_54px_-28px_rgba(2,6,23,0.75)] transition-all duration-200 ${
              closing ? "translate-y-3 scale-[0.985] opacity-0" : "translate-y-0 scale-100 opacity-100"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[color:var(--eid-border-subtle)] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-black leading-tight text-eid-fg">{titulo}</p>
                {subtitulo ? <p className="mt-0.5 truncate text-[11px] leading-relaxed font-medium text-eid-text-secondary">{subtitulo}</p> : null}
              </div>
              <button
                type="button"
                onClick={closeWithAnimation}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/80 text-lg leading-none text-eid-fg transition hover:scale-[1.04] hover:bg-eid-surface"
                aria-label="Fechar resumo"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(90vh-58px)] space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
              <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_66%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--eid-fg)_8%,transparent)]">
                <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Resumo do confronto</p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] ${
                      origem === "Torneio"
                        ? "border-eid-action-500/35 bg-eid-action-500/12 text-eid-action-400"
                        : "border-eid-primary-500/35 bg-eid-primary-500/12 text-eid-primary-300"
                    }`}
                  >
                    {origem}
                  </span>
                </div>
                <div className="p-3">
                <div className="mt-1 flex items-center justify-between gap-2">
                  {ladoAProfileHref ? (
                    <Link href={ladoAProfileHref} data-no-modal="1" className="min-w-0 flex items-center gap-1.5">
                      {ladoAAvatarUrl ? (
                        <img src={ladoAAvatarUrl} alt="" className="h-7 w-7 rounded-full border border-[color:var(--eid-border-subtle)] object-cover" />
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300">
                          {ladoA.trim().slice(0, 1).toUpperCase() || "A"}
                        </span>
                      )}
                      <span className="truncate text-[10px] font-semibold text-eid-fg hover:underline">{ladoA}</span>
                    </Link>
                  ) : (
                    <div className="min-w-0 flex items-center gap-1.5">
                      {ladoAAvatarUrl ? (
                        <img src={ladoAAvatarUrl} alt="" className="h-7 w-7 rounded-full border border-[color:var(--eid-border-subtle)] object-cover" />
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300">
                          {ladoA.trim().slice(0, 1).toUpperCase() || "A"}
                        </span>
                      )}
                      <span className="truncate text-[10px] font-semibold text-eid-fg">{ladoA}</span>
                    </div>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-[0.06em] text-eid-text-secondary">vs</span>
                  {ladoBProfileHref ? (
                    <Link href={ladoBProfileHref} data-no-modal="1" className="min-w-0 flex items-center gap-1.5 text-right">
                      <span className="truncate text-[10px] font-semibold text-eid-fg hover:underline">{ladoB}</span>
                      {ladoBAvatarUrl ? (
                        <img src={ladoBAvatarUrl} alt="" className="h-7 w-7 rounded-full border border-[color:var(--eid-border-subtle)] object-cover" />
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300">
                          {ladoB.trim().slice(0, 1).toUpperCase() || "B"}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <div className="min-w-0 flex items-center gap-1.5 text-right">
                      <span className="truncate text-[10px] font-semibold text-eid-fg">{ladoB}</span>
                      {ladoBAvatarUrl ? (
                        <img src={ladoBAvatarUrl} alt="" className="h-7 w-7 rounded-full border border-[color:var(--eid-border-subtle)] object-cover" />
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300">
                          {ladoB.trim().slice(0, 1).toUpperCase() || "B"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[12px] text-eid-fg">{dataHora}</p>
                <p className="mt-0.5 text-[11px] text-eid-text-secondary">
                  Local:{" "}
                  {local?.trim() ? (
                    localHref ? (
                      <Link
                        href={localHref}
                        data-no-modal="1"
                        className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline"
                      >
                        {local}
                      </Link>
                    ) : (
                      <span>{local}</span>
                    )
                  ) : (
                    "Não informado"
                  )}
                </p>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-eid-primary-300">Placar</span>
                  <span className="text-[12px] font-black text-eid-fg">{placarBase}</span>
                </div>
                </div>
              </div>

              {payload?.type === "sets" && Array.isArray(payload.sets) && payload.sets.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_66%,transparent)]">
                  <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Placar detalhado por sets</p>
                    <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
                      Sets
                    </span>
                  </div>
                  <div className="overflow-x-auto p-3">
                    <table className="w-full min-w-[220px] text-left text-[11px]">
                      <thead>
                        <tr className="text-eid-text-secondary">
                          <th className="py-1 pr-2">Set</th>
                          <th className="py-1 pr-2">{ladoA}</th>
                          <th className="py-1 pr-2">{ladoB}</th>
                          <th className="py-1">TB</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payload.sets.map((set, idx) => {
                          const hasTb = Number(set.tiebreakA ?? 0) > 0 || Number(set.tiebreakB ?? 0) > 0;
                          return (
                            <tr key={`set-${idx}`} className="border-t border-[color:var(--eid-border-subtle)] text-eid-fg">
                              <td className="py-1 pr-2 font-semibold">{idx + 1}</td>
                              <td className="py-1 pr-2 font-black">{Number(set.a ?? 0)}</td>
                              <td className="py-1 pr-2 font-black">{Number(set.b ?? 0)}</td>
                              <td className="py-1">{hasTb ? `${Number(set.tiebreakA ?? 0)}-${Number(set.tiebreakB ?? 0)}` : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {payload?.type === "gols" && payload.goals ? (
                <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_66%,transparent)]">
                  <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Placar detalhado</p>
                    <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-action-400">
                      Gols
                    </span>
                  </div>
                  <div className="p-3">
                  <p className="mt-1 text-[11px] text-eid-fg">
                    Gols: <span className="font-black">{ladoA} {Number(payload.goals.a ?? 0)} × {Number(payload.goals.b ?? 0)} {ladoB}</span>
                  </p>
                  {(Number(payload.goals.overtimeA ?? 0) > 0 || Number(payload.goals.overtimeB ?? 0) > 0) ? (
                    <p className="mt-0.5 text-[10px] text-eid-text-secondary">
                      Prorrogação: {Number(payload.goals.overtimeA ?? 0)} × {Number(payload.goals.overtimeB ?? 0)}
                    </p>
                  ) : null}
                  {(Number(payload.goals.penaltiesA ?? 0) > 0 || Number(payload.goals.penaltiesB ?? 0) > 0) ? (
                    <p className="mt-0.5 text-[10px] text-eid-text-secondary">
                      Pênaltis: {Number(payload.goals.penaltiesA ?? 0)} × {Number(payload.goals.penaltiesB ?? 0)}
                    </p>
                  ) : null}
                  </div>
                </div>
              ) : null}

              {payload?.type === "pontos" && payload.points ? (
                <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_66%,transparent)]">
                  <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Placar detalhado</p>
                    <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-action-400">
                      Pontos
                    </span>
                  </div>
                  <div className="p-3">
                  <p className="mt-1 text-[11px] text-eid-fg">
                    Pontos: <span className="font-black">{ladoA} {Number(payload.points.a ?? 0)} × {Number(payload.points.b ?? 0)} {ladoB}</span>
                  </p>
                  {(Number(payload.points.overtimeA ?? 0) > 0 || Number(payload.points.overtimeB ?? 0) > 0) ? (
                    <p className="mt-0.5 text-[10px] text-eid-text-secondary">
                      Overtime: {Number(payload.points.overtimeA ?? 0)} × {Number(payload.points.overtimeB ?? 0)}
                    </p>
                  ) : null}
                  </div>
                </div>
              ) : null}

              {payload?.type === "rounds" && payload.rounds ? (
                <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_66%,transparent)]">
                  <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Placar detalhado</p>
                    <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-action-400">
                      Rounds
                    </span>
                  </div>
                  <div className="p-3">
                  <p className="mt-1 text-[11px] text-eid-fg">
                    Método: <span className="font-semibold">{String(payload.rounds.method ?? "decisão")}</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-eid-text-secondary">
                    Vencedor no payload: {payload.rounds.winner === "a" ? "Lado A" : payload.rounds.winner === "b" ? "Lado B" : "—"}
                  </p>
                  {Array.isArray(payload.rounds.items) && payload.rounds.items.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {payload.rounds.items.map((it, idx) => (
                        <li key={`rd-${idx}`} className="text-[10px] text-eid-text-secondary">
                          Round {idx + 1}: {Number(it.a ?? 0)} × {Number(it.b ?? 0)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  </div>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_66%,transparent)]">
                <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">
                    Histórico deste confronto
                  </p>
                  <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
                    {totalConfrontos}x
                  </span>
                </div>
                <div className="p-3">
                <p className="mt-1 text-[11px] text-eid-fg">
                  Já aconteceu <span className="font-black">{totalConfrontos}</span> vez(es).
                </p>
                {saldoResumo ? <p className="mt-0.5 text-[10px] font-semibold text-eid-primary-300">{saldoResumo}</p> : null}
                {ultimosConfrontos.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {ultimosConfrontos.map((item) => (
                      <li key={`hist-${item.id}`} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-card)_86%,var(--eid-surface)_14%)] px-2.5 py-2">
                        {item.confronto ? <p className="text-[10px] font-semibold text-eid-fg">{item.confronto}</p> : null}
                        <p className="text-[11px] font-bold text-eid-fg">{item.placar}</p>
                        <p className="text-[10px] text-eid-text-secondary">
                          <span className={item.origem === "Torneio" ? "font-bold text-eid-action-400" : "font-bold text-eid-primary-300"}>
                            {item.origem}
                          </span>
                          <span className="mx-1">·</span>
                          {item.dataHora}
                          <span className="mx-1">·</span>
                          {item.local?.trim() ? (
                            item.localHref ? (
                              <Link
                                href={item.localHref}
                                data-no-modal="1"
                                className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline"
                              >
                                {item.local}
                              </Link>
                            ) : (
                              item.local
                            )
                          ) : (
                            "Local não informado"
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-[10px] text-eid-text-secondary">Sem histórico anterior para este confronto.</p>
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
