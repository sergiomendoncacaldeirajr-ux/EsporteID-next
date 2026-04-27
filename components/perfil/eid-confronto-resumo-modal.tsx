"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Calendar, MapPin, X } from "lucide-react";
import Link from "next/link";

const MODAL_CARD =
  "overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_82%,var(--eid-primary-500)_18%)] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--eid-card)_96%,transparent)_0%,color-mix(in_srgb,var(--eid-surface)_52%,transparent)_100%)] shadow-[0_10px_36px_-18px_rgba(15,23,42,0.42)]";
const MODAL_CARD_HEAD =
  "flex items-center justify-between gap-2 border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,var(--eid-primary-500)_12%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-surface)_55%,transparent),transparent)] px-3.5 py-2.5 sm:px-4";
const AVATAR_LG =
  "h-11 w-11 shrink-0 rounded-full border-2 border-[color:color-mix(in_srgb,var(--eid-card)_70%,var(--eid-primary-500)_30%)] object-cover shadow-[0_4px_14px_-4px_rgba(15,23,42,0.45)]";
const AVATAR_FALLBACK_LG =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[color:color-mix(in_srgb,var(--eid-card)_70%,var(--eid-primary-500)_30%)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_35%,var(--eid-surface)_65%),var(--eid-surface))] text-sm font-black text-eid-primary-200 shadow-[0_4px_14px_-4px_rgba(15,23,42,0.45)]";

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

/** Primeira palavra do nome (ex.: placar por sets em linha compacta). */
function primeiroNome(completo: string): string {
  const t = completo.trim();
  if (!t) return completo;
  const first = t.split(/\s+/u)[0];
  return first || t;
}

/** Placar tipo "1 × 2" com números alinhados e separador discreto. */
function PlacarNumerosInline({
  placar,
  size = "md",
}: {
  placar: string;
  size?: "md" | "sm";
}) {
  const trimmed = placar.trim();
  const m = trimmed.match(/^(\d+)\s*[×x]\s*(\d+)$/i);
  const numCls =
    size === "md"
      ? "text-xl font-black tabular-nums tracking-tight text-eid-fg sm:text-2xl"
      : "text-base font-black tabular-nums tracking-tight text-eid-fg sm:text-lg";
  const xCls =
    size === "md"
      ? "select-none text-xs font-extrabold text-eid-text-secondary/75 sm:text-sm"
      : "select-none text-[10px] font-extrabold text-eid-text-secondary/75 sm:text-xs";
  if (!m) {
    return <p className={`text-center ${numCls}`}>{trimmed}</p>;
  }
  return (
    <p className={`flex items-center justify-center gap-2.5 ${numCls}`}>
      <span>{m[1]}</span>
      <span className={xCls} aria-hidden>
        ×
      </span>
      <span>{m[2]}</span>
    </p>
  );
}

/** Games de um lado no set; superscript = pontos desse jogador no tie-break (se houve). */
function SetSingleGamesCell({
  games,
  tieBreakPoints,
  hadTiebreak,
}: {
  games: number;
  tieBreakPoints: number;
  hadTiebreak: boolean;
}) {
  return (
    <span className="inline-flex items-baseline justify-center font-black tabular-nums leading-none text-eid-fg">
      {games}
      {hadTiebreak ? (
        <sup className="ml-px align-super text-[0.55em] font-black leading-none text-eid-primary-500 dark:text-eid-primary-300">
          {tieBreakPoints}
        </sup>
      ) : null}
    </span>
  );
}

function SetsBroadcastPlayerCell({
  nome,
  nomeCompleto,
  avatarUrl,
  profileHref,
}: {
  nome: string;
  /** Tooltip / acessível: nome completo quando `nome` for só o primeiro. */
  nomeCompleto?: string | null;
  avatarUrl: string | null | undefined;
  profileHref: string | null | undefined;
}) {
  const tip = nomeCompleto?.trim() ? nomeCompleto.trim() : nome;
  const face = avatarUrl ? (
    <img
      src={avatarUrl}
      alt=""
      className="h-6 w-6 shrink-0 rounded-full border border-[color:var(--eid-border-subtle)] object-cover"
    />
  ) : (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-400">
      {nome.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
  const label = (
    <span className="min-w-0 truncate text-[9px] font-bold uppercase tracking-wide text-eid-fg">{nome}</span>
  );
  const row = (
    <div className="flex min-w-0 items-center gap-1.5">
      {face}
      {label}
    </div>
  );
  if (profileHref) {
    return (
      <Link href={profileHref} data-no-modal="1" className="min-w-0 hover:opacity-90" title={tip}>
        {row}
      </Link>
    );
  }
  return (
    <span className="min-w-0" title={tip}>
      {row}
    </span>
  );
}

function SetsScoreboardTable({
  sets,
  ladoA,
  ladoB,
  ladoAAvatarUrl,
  ladoBAvatarUrl,
  ladoAProfileHref,
  ladoBProfileHref,
}: {
  sets: NonNullable<ScorePayload["sets"]>;
  ladoA: string;
  ladoB: string;
  ladoAAvatarUrl?: string | null;
  ladoBAvatarUrl?: string | null;
  ladoAProfileHref?: string | null;
  ladoBProfileHref?: string | null;
}) {
  const n = sets.length;
  const scoreGridCols = `repeat(${n}, minmax(2rem, 1fr))`;
  const borderCell = "border-[color:color-mix(in_srgb,var(--eid-border-subtle)_92%,transparent)]";

  return (
    <div className={MODAL_CARD}>
      <div className={`${MODAL_CARD_HEAD} !py-2`}>
        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-eid-primary-300">Placar por sets</p>
        <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-1.5 py-px text-[8px] font-black uppercase tracking-[0.07em] text-eid-primary-200">
          Sets
        </span>
      </div>
      <div className="p-2 sm:p-2.5">
        <div className="overflow-x-auto rounded-md border border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_78%,var(--eid-card)_22%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:bg-[color:color-mix(in_srgb,var(--eid-bg)_55%,var(--eid-surface)_45%)]">
          <div className="flex min-w-0 w-full border-b border-[color:var(--eid-border-subtle)] bg-[color:color-mix(in_srgb,var(--eid-surface)_55%,transparent)]">
            <div className={`flex w-[7rem] shrink-0 items-center border-r ${borderCell} px-2 py-1 sm:w-[8rem]`} aria-hidden />
            <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: scoreGridCols }}>
              {sets.map((_, idx) => (
                <div
                  key={`set-h-${idx}`}
                  className={`border-r py-1 text-center text-[8px] font-black tabular-nums text-eid-text-secondary last:border-r-0 sm:text-[9px] ${borderCell}`}
                >
                  S{idx + 1}
                </div>
              ))}
            </div>
          </div>
          <div className="flex border-b border-[color:var(--eid-border-subtle)]">
            <div className={`flex w-[7rem] shrink-0 items-center border-r ${borderCell} px-2 py-1.5 sm:w-[8rem]`}>
              <SetsBroadcastPlayerCell
                nome={primeiroNome(ladoA)}
                nomeCompleto={ladoA}
                avatarUrl={ladoAAvatarUrl}
                profileHref={ladoAProfileHref ?? null}
              />
            </div>
            <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: scoreGridCols }}>
              {sets.map((set, idx) => {
                const a = Number(set.a ?? 0);
                const tba = Number(set.tiebreakA ?? 0);
                const tbb = Number(set.tiebreakB ?? 0);
                const hadTb = tba > 0 || tbb > 0;
                return (
                  <div
                    key={`set-a-${idx}`}
                    className={`flex items-center justify-center border-r px-1 py-1.5 text-sm last:border-r-0 sm:text-base ${borderCell}`}
                  >
                    <SetSingleGamesCell games={a} tieBreakPoints={tba} hadTiebreak={hadTb} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex">
            <div className={`flex w-[7rem] shrink-0 items-center border-r ${borderCell} px-2 py-1.5 sm:w-[8rem]`}>
              <SetsBroadcastPlayerCell
                nome={primeiroNome(ladoB)}
                nomeCompleto={ladoB}
                avatarUrl={ladoBAvatarUrl}
                profileHref={ladoBProfileHref ?? null}
              />
            </div>
            <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: scoreGridCols }}>
              {sets.map((set, idx) => {
                const b = Number(set.b ?? 0);
                const tba = Number(set.tiebreakA ?? 0);
                const tbb = Number(set.tiebreakB ?? 0);
                const hadTb = tba > 0 || tbb > 0;
                return (
                  <div
                    key={`set-b-${idx}`}
                    className={`flex items-center justify-center border-r px-1 py-1.5 text-sm last:border-r-0 sm:text-base ${borderCell}`}
                  >
                    <SetSingleGamesCell games={b} tieBreakPoints={tbb} hadTiebreak={hadTb} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [mounted, setMounted] = useState(false);
  const payload = useMemo(() => parseScorePayloadFromMessage(mensagem), [mensagem]);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeWithAnimation = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 170);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeWithAnimation();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, closeWithAnimation]);

  const overlay =
    mounted && open ? (
      <div
        className={`fixed inset-0 z-[850] flex items-end justify-center p-2 backdrop-blur-[2px] transition-all duration-150 sm:items-center sm:p-4 ${
          closing
            ? "bg-transparent opacity-0"
            : "bg-[color:color-mix(in_srgb,var(--eid-bg)_44%,black_56%)] opacity-100"
        }`}
        onClick={closeWithAnimation}
        role="presentation"
      >
        <div
          className={`max-h-[92vh] w-full max-w-xl overflow-hidden rounded-[1.35rem] border border-[color:color-mix(in_srgb,var(--eid-primary-500)_26%,var(--eid-border-subtle)_74%)] bg-eid-card shadow-[0_28px_64px_-28px_rgba(2,6,23,0.82),0_0_0_1px_color-mix(in_srgb,var(--eid-fg)_6%,transparent)_inset] transition-all duration-200 ${
            closing ? "translate-y-3 scale-[0.985] opacity-0" : "translate-y-0 scale-100 opacity-100"
          }`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
        >
          <div className="relative overflow-hidden border-b border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,var(--eid-border-subtle)_78%)] bg-[linear-gradient(125deg,color-mix(in_srgb,var(--eid-primary-500)_22%,var(--eid-card)_78%)_0%,var(--eid-card)_42%,color-mix(in_srgb,var(--eid-surface)_88%,transparent)_100%)] px-4 pb-3.5 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
            <div
              className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-eid-primary-500/20 blur-3xl"
              aria-hidden
            />
            <div className="pointer-events-none absolute -bottom-6 left-1/4 h-20 w-40 rounded-full bg-eid-action-500/10 blur-2xl" aria-hidden />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-balance text-base font-black leading-snug tracking-tight text-eid-fg sm:text-[1.05rem]">{titulo}</p>
                {subtitulo ? (
                  <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-eid-text-secondary sm:text-xs">{subtitulo}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeWithAnimation}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_75%,var(--eid-primary-500)_25%)] bg-[color:color-mix(in_srgb,var(--eid-card)_82%,transparent)] text-eid-text-secondary shadow-sm backdrop-blur-sm transition hover:border-eid-primary-500/35 hover:text-eid-fg"
                aria-label="Fechar resumo"
              >
                <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(92vh-5.5rem)] space-y-4 overflow-y-auto px-3.5 py-4 sm:px-5 sm:py-5">
            <div className={MODAL_CARD}>
              <div className={MODAL_CARD_HEAD}>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-primary-300">Resumo do confronto</p>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] shadow-sm ${
                    origem === "Torneio"
                      ? "border-eid-action-500/40 bg-gradient-to-br from-eid-action-500/20 to-eid-action-500/8 text-eid-action-300"
                      : "border-eid-primary-500/40 bg-gradient-to-br from-eid-primary-500/22 to-eid-primary-500/8 text-eid-primary-200"
                  }`}
                >
                  {origem}
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-3">
                  <div className="min-w-0 flex flex-col items-center gap-2 text-center">
                    {ladoAProfileHref ? (
                      <Link href={ladoAProfileHref} data-no-modal="1" className="group flex min-w-0 flex-col items-center gap-2">
                        {ladoAAvatarUrl ? (
                          <img src={ladoAAvatarUrl} alt="" className={`${AVATAR_LG} transition group-hover:ring-2 group-hover:ring-eid-primary-500/35`} />
                        ) : (
                          <span className={`${AVATAR_FALLBACK_LG} transition group-hover:ring-2 group-hover:ring-eid-primary-500/35`}>
                            {ladoA.trim().slice(0, 1).toUpperCase() || "A"}
                          </span>
                        )}
                        <span className="line-clamp-2 max-w-full text-[11px] font-bold leading-tight text-eid-fg underline-offset-2 group-hover:text-eid-primary-200 group-hover:underline sm:text-xs">
                          {ladoA}
                        </span>
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-col items-center gap-2">
                        {ladoAAvatarUrl ? (
                          <img src={ladoAAvatarUrl} alt="" className={AVATAR_LG} />
                        ) : (
                          <span className={AVATAR_FALLBACK_LG}>{ladoA.trim().slice(0, 1).toUpperCase() || "A"}</span>
                        )}
                        <span className="line-clamp-2 max-w-full text-[11px] font-bold leading-tight text-eid-fg sm:text-xs">{ladoA}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-center justify-center pt-1">
                    <span className="rounded-full border border-[color:color-mix(in_srgb,var(--eid-primary-500)_45%,var(--eid-border-subtle)_55%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_28%,var(--eid-surface)_72%),var(--eid-surface))] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-eid-primary-200 shadow-[0_2px_8px_-2px_rgba(37,99,235,0.45)]">
                      vs
                    </span>
                  </div>
                  <div className="min-w-0 flex flex-col items-center gap-2 text-center">
                    {ladoBProfileHref ? (
                      <Link href={ladoBProfileHref} data-no-modal="1" className="group flex min-w-0 flex-col items-center gap-2">
                        {ladoBAvatarUrl ? (
                          <img src={ladoBAvatarUrl} alt="" className={`${AVATAR_LG} transition group-hover:ring-2 group-hover:ring-eid-primary-500/35`} />
                        ) : (
                          <span className={`${AVATAR_FALLBACK_LG} transition group-hover:ring-2 group-hover:ring-eid-primary-500/35`}>
                            {ladoB.trim().slice(0, 1).toUpperCase() || "B"}
                          </span>
                        )}
                        <span className="line-clamp-2 max-w-full text-[11px] font-bold leading-tight text-eid-fg underline-offset-2 group-hover:text-eid-primary-200 group-hover:underline sm:text-xs">
                          {ladoB}
                        </span>
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-col items-center gap-2">
                        {ladoBAvatarUrl ? (
                          <img src={ladoBAvatarUrl} alt="" className={AVATAR_LG} />
                        ) : (
                          <span className={AVATAR_FALLBACK_LG}>{ladoB.trim().slice(0, 1).toUpperCase() || "B"}</span>
                        )}
                        <span className="line-clamp-2 max-w-full text-[11px] font-bold leading-tight text-eid-fg sm:text-xs">{ladoB}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex items-start gap-2.5 rounded-xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_90%,var(--eid-primary-500)_10%)] bg-eid-surface/35 px-3 py-2.5 sm:px-3.5">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-eid-primary-400" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Data e hora</p>
                      <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-eid-fg sm:text-sm">{dataHora}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_90%,var(--eid-primary-500)_10%)] bg-eid-surface/35 px-3 py-2.5 sm:px-3.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-eid-primary-400" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-eid-text-secondary">Local</p>
                      <p className="mt-0.5 text-[12px] font-semibold leading-snug text-eid-fg sm:text-sm">
                        {local?.trim() ? (
                          localHref ? (
                            <Link
                              href={localHref}
                              data-no-modal="1"
                              className="text-eid-primary-200 underline-offset-2 hover:underline"
                            >
                              {local}
                            </Link>
                          ) : (
                            <span>{local}</span>
                          )
                        ) : (
                          <span className="text-eid-text-secondary">Não informado</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative mt-5 overflow-hidden rounded-xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_32%,var(--eid-border-subtle)_68%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-surface)_88%)_0%,color-mix(in_srgb,var(--eid-card)_96%,transparent)_100%)] px-3 py-2.5 text-center shadow-[0_0_28px_-6px_color-mix(in_srgb,var(--eid-primary-500)_42%,transparent),0_6px_22px_-14px_rgba(37,99,235,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-4 sm:py-3">
                  <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_70%_at_50%_-30%,color-mix(in_srgb,var(--eid-primary-400)_38%,transparent),transparent_62%)] opacity-90 dark:opacity-100"
                    aria-hidden
                  />
                  <div className="pointer-events-none absolute -left-1/4 top-1/2 h-[140%] w-1/2 -translate-y-1/2 rotate-12 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.14)_50%,transparent_60%)] dark:bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.08)_50%,transparent_60%)]" aria-hidden />
                  <div className="relative z-[1]">
                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-eid-primary-300">Placar final</p>
                    <div className="mt-1">
                      <PlacarNumerosInline placar={placarBase} size="md" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {payload?.type === "sets" && Array.isArray(payload.sets) && payload.sets.length > 0 ? (
              <SetsScoreboardTable
                sets={payload.sets}
                ladoA={ladoA}
                ladoB={ladoB}
                ladoAAvatarUrl={ladoAAvatarUrl}
                ladoBAvatarUrl={ladoBAvatarUrl}
                ladoAProfileHref={ladoAProfileHref}
                ladoBProfileHref={ladoBProfileHref}
              />
            ) : null}

            {payload?.type === "gols" && payload.goals ? (
              <div className={MODAL_CARD}>
                <div className={MODAL_CARD_HEAD}>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-action-300">Placar detalhado</p>
                  <span className="rounded-full border border-eid-action-500/40 bg-gradient-to-br from-eid-action-500/22 to-eid-action-500/8 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-eid-action-200">
                    Gols
                  </span>
                </div>
                <div className="space-y-2 p-4 sm:p-5">
                  <p className="text-sm font-bold text-eid-fg">
                    <span className="font-black tabular-nums text-eid-fg">
                      {ladoA} {Number(payload.goals.a ?? 0)}
                    </span>
                    <span className="mx-1.5 text-eid-text-secondary">×</span>
                    <span className="font-black tabular-nums text-eid-fg">
                      {Number(payload.goals.b ?? 0)} {ladoB}
                    </span>
                  </p>
                  {Number(payload.goals.overtimeA ?? 0) > 0 || Number(payload.goals.overtimeB ?? 0) > 0 ? (
                    <p className="text-[11px] text-eid-text-secondary">
                      Prorrogação:{" "}
                      <span className="font-semibold tabular-nums text-eid-fg">
                        {Number(payload.goals.overtimeA ?? 0)} × {Number(payload.goals.overtimeB ?? 0)}
                      </span>
                    </p>
                  ) : null}
                  {Number(payload.goals.penaltiesA ?? 0) > 0 || Number(payload.goals.penaltiesB ?? 0) > 0 ? (
                    <p className="text-[11px] text-eid-text-secondary">
                      Pênaltis:{" "}
                      <span className="font-semibold tabular-nums text-eid-fg">
                        {Number(payload.goals.penaltiesA ?? 0)} × {Number(payload.goals.penaltiesB ?? 0)}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {payload?.type === "pontos" && payload.points ? (
              <div className={MODAL_CARD}>
                <div className={MODAL_CARD_HEAD}>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-action-300">Placar detalhado</p>
                  <span className="rounded-full border border-eid-action-500/40 bg-gradient-to-br from-eid-action-500/22 to-eid-action-500/8 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-eid-action-200">
                    Pontos
                  </span>
                </div>
                <div className="space-y-2 p-4 sm:p-5">
                  <p className="text-sm font-bold text-eid-fg">
                    <span className="font-black tabular-nums">{ladoA}</span>{" "}
                    <span className="font-black tabular-nums text-eid-fg">{Number(payload.points.a ?? 0)}</span>
                    <span className="mx-1.5 text-eid-text-secondary">×</span>
                    <span className="font-black tabular-nums text-eid-fg">{Number(payload.points.b ?? 0)}</span>{" "}
                    <span className="font-black tabular-nums">{ladoB}</span>
                  </p>
                  {Number(payload.points.overtimeA ?? 0) > 0 || Number(payload.points.overtimeB ?? 0) > 0 ? (
                    <p className="text-[11px] text-eid-text-secondary">
                      Overtime:{" "}
                      <span className="font-semibold tabular-nums text-eid-fg">
                        {Number(payload.points.overtimeA ?? 0)} × {Number(payload.points.overtimeB ?? 0)}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {payload?.type === "rounds" && payload.rounds ? (
              <div className={MODAL_CARD}>
                <div className={MODAL_CARD_HEAD}>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-action-300">Placar detalhado</p>
                  <span className="rounded-full border border-eid-action-500/40 bg-gradient-to-br from-eid-action-500/22 to-eid-action-500/8 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-eid-action-200">
                    Rounds
                  </span>
                </div>
                <div className="space-y-2 p-4 sm:p-5">
                  <p className="text-sm text-eid-fg">
                    Método: <span className="font-bold">{String(payload.rounds.method ?? "decisão")}</span>
                  </p>
                  <p className="text-[11px] text-eid-text-secondary">
                    Vencedor (registro):{" "}
                    <span className="font-semibold text-eid-fg">
                      {payload.rounds.winner === "a" ? ladoA : payload.rounds.winner === "b" ? ladoB : "—"}
                    </span>
                  </p>
                  {Array.isArray(payload.rounds.items) && payload.rounds.items.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {payload.rounds.items.map((it, idx) => (
                        <li
                          key={`rd-${idx}`}
                          className="flex items-center justify-between rounded-lg border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,transparent)] bg-eid-surface/25 px-2.5 py-1.5 text-[11px]"
                        >
                          <span className="font-semibold text-eid-text-secondary">Round {idx + 1}</span>
                          <span className="font-black tabular-nums text-eid-fg">
                            {Number(it.a ?? 0)} × {Number(it.b ?? 0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className={MODAL_CARD}>
              <div className={MODAL_CARD_HEAD}>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-primary-300">Histórico deste confronto</p>
                <span className="inline-flex min-h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-full border border-eid-primary-500/40 bg-gradient-to-br from-eid-primary-500/25 to-eid-primary-500/10 px-1.5 text-[10px] font-black text-eid-primary-100 shadow-sm">
                  {totalConfrontos}×
                </span>
              </div>
              <div className="p-3 sm:p-4">
                <p className="text-[11px] leading-snug text-eid-text-secondary">
                  Neste duelo: <span className="font-black text-eid-primary-300">{totalConfrontos}</span>{" "}
                  {totalConfrontos === 1 ? "partida registrada" : "partidas registradas"}.
                </p>
                {saldoResumo ? (
                  <p className="mt-2 rounded-lg border border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,var(--eid-border-subtle)_78%)] bg-eid-primary-500/8 px-2.5 py-1.5 text-[10px] font-semibold leading-snug text-eid-fg">
                    {saldoResumo}
                  </p>
                ) : null}
                {ultimosConfrontos.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {ultimosConfrontos.map((item) => (
                      <li
                        key={`hist-${item.id}`}
                        className="rounded-lg border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_92%,var(--eid-primary-500)_8%)] bg-[color:color-mix(in_srgb,var(--eid-surface)_45%,var(--eid-card)_55%)] px-2.5 py-2 sm:px-3 sm:py-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ${
                              item.origem === "Torneio"
                                ? "border border-eid-action-500/30 bg-eid-action-500/12 text-eid-action-300"
                                : "border border-eid-primary-500/30 bg-eid-primary-500/10 text-eid-primary-300"
                            }`}
                          >
                            {item.origem}
                          </span>
                          <time className="text-right text-[9px] font-medium tabular-nums leading-tight text-eid-text-secondary">
                            {item.dataHora}
                          </time>
                        </div>
                        {item.confronto ? (
                          <p className="mt-1.5 text-center text-[10px] font-semibold leading-tight text-eid-fg">{item.confronto}</p>
                        ) : null}
                        <div className="mt-2 border-t border-dashed border-[color:color-mix(in_srgb,var(--eid-border-subtle)_85%,transparent)] pt-2">
                          <PlacarNumerosInline placar={item.placar} size="sm" />
                        </div>
                        <p className="mt-1.5 text-center text-[9px] leading-snug text-eid-text-secondary">
                          {item.local?.trim() ? (
                            item.localHref ? (
                              <Link
                                href={item.localHref}
                                data-no-modal="1"
                                className="font-medium text-eid-primary-400 underline-offset-2 hover:underline dark:text-eid-primary-300"
                              >
                                {item.local}
                              </Link>
                            ) : (
                              item.local
                            )
                          ) : (
                            <span className="italic opacity-90">Local não informado</span>
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-lg border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/25 px-2.5 py-2.5 text-center text-[10px] leading-relaxed text-eid-text-secondary">
                    Sem outros registros deste confronto além desta partida.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null;

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

      {overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
