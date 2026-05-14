"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import NextImage from "next/image";
import { Calendar, Download, ImageIcon, Loader2, MapPin, RotateCcw, Share2, X } from "lucide-react";
import Link from "next/link";
import { GoalsScoreboardSummary } from "@/components/placar/goals-scoreboard-summary";
import { EID_LOGO_WORDMARK_SRC } from "@/lib/branding";
import { SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import {
  goalsPayloadHasAny,
  goalsTotalsBeforePenaltiesDisplay,
  pointsTotalsAccumulatedForDisplay,
  sportLooksLikeBasquete,
  type MatchScorePayload,
} from "@/lib/match-scoring";
import { parseScorePayloadFromPartidaMensagem } from "@/lib/perfil/parse-partida-score-payload";

const MODAL_CARD =
  "overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_82%,var(--eid-primary-500)_18%)] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--eid-card)_96%,transparent)_0%,color-mix(in_srgb,var(--eid-surface)_52%,transparent)_100%)] shadow-[0_10px_36px_-18px_rgba(15,23,42,0.42)]";
const MODAL_CARD_HEAD =
  "flex items-center justify-between gap-2 border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,var(--eid-primary-500)_12%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-surface)_55%,transparent),transparent)] px-3.5 py-2.5 sm:px-4";
const AVATAR_LG =
  "h-11 w-11 shrink-0 rounded-full border-2 border-[color:color-mix(in_srgb,var(--eid-card)_70%,var(--eid-primary-500)_30%)] object-cover shadow-[0_4px_14px_-4px_rgba(15,23,42,0.45)]";
const AVATAR_FALLBACK_LG =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[color:color-mix(in_srgb,var(--eid-card)_70%,var(--eid-primary-500)_30%)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_35%,var(--eid-surface)_65%),var(--eid-surface))] text-sm font-black text-eid-primary-200 shadow-[0_4px_14px_-4px_rgba(15,23,42,0.45)]";
const RESULT_SHARE_BUTTON =
  "inline-flex min-h-[2.55rem] flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-black transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-70";

type ResumoHistoricoItem = {
  id: number | string;
  dataHora: string;
  local: string | null;
  localHref?: string | null;
  localLogoUrl?: string | null;
  placar: string;
  origem: "Ranking" | "Torneio";
  confronto?: string | null;
  /** Mesma `mensagem` da partida (incl. `score_payload:` para pênaltis / gols). */
  mensagem?: string | null;
  sportLabel?: string | null;
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
  localLogoUrl?: string | null;
  placarBase: string;
  mensagem?: string | null;
  totalConfrontos: number;
  saldoResumo?: string | null;
  ultimosConfrontos: ResumoHistoricoItem[];
  children: ReactNode;
  asListItem?: boolean;
  rowClassName?: string;
  /** Nome do esporte (placar estilizado em jogos por gols + pênaltis). */
  sportLabel?: string | null;
  /** Fallback de link quando `ladoAProfileHref` não vier preenchido (ex.: `/perfil-time/{id}`). */
  ladoATimeId?: number | null;
  ladoBTimeId?: number | null;
  /** `formacao`: escudo time/dupla com cantos mais quadrados, alinhado ao restante do app. */
  avatarVariant?: "circle" | "formacao";
  /**
   * Quando true, inverte set.a ↔ set.b no placar por sets.
   * Necessário quando o "self" (ladoA) é jogador2 na partida — os dados brutos
   * sempre têm set.a = jogador1 e set.b = jogador2.
   */
  swapSets?: boolean;
};

type ResultadoSharePayload = {
  ladoA: string;
  ladoB: string;
  placar: string;
  origem: "Ranking" | "Torneio";
  dataHora: string;
  local: string | null;
  sportLabel: string | null;
  mensagem?: string | null;
  ladoAAvatarUrl?: string | null;
  ladoBAvatarUrl?: string | null;
  backgroundDataUrl?: string | null;
  overlayPosition: { x: number; y: number };
  overlayScale: number;
  brandLogoScale: number;
  shareLayout: "slim" | "complete";
  cardVariant: "dark" | "light" | "glass" | "compact";
  backgroundFilter: "normal" | "dim" | "blur";
  showMeta: boolean;
  showBrand: boolean;
};

const RESULT_SHARE_STORAGE_KEY = "eid:result-share-editor:v1";

function cleanShareText(value: string | null | undefined, fallback = "EsporteID") {
  const clean = String(value ?? "").replace(/\s+/g, " ").trim();
  return clean || fallback;
}

function shareFirstName(name: string) {
  return primeiroNome(cleanShareText(name, "Atleta"));
}

function shareInitials(name: string) {
  const parts = cleanShareText(name, "Atleta").split(/\s+/u).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function sportShareIconText(sportLabel: string | null | undefined) {
  const label = cleanShareText(sportLabel, "").toLowerCase();
  if (/fut|soccer|campo|society|futsal/u.test(label)) return "●";
  if (/tenis|tênis|padel|pickle/u.test(label)) return "◐";
  if (/basquete|basket/u.test(label)) return "◍";
  if (/volei|vôlei|volley|beach/u.test(label)) return "◉";
  if (/corrida|run|cicl|bike|triathlon/u.test(label)) return "◇";
  return "◆";
}

function shareUsesSetLines(score: ReturnType<typeof shareScoreSummary>) {
  return score.detail === "Placar por sets" && score.lines.length > 0;
}

function shareMetaLine(payload: Pick<ResultadoSharePayload, "origem" | "dataHora" | "local">) {
  return [payload.origem, cleanShareText(payload.dataHora, ""), cleanShareText(payload.local, "")]
    .filter(Boolean)
    .join(" · ");
}

function shareUsesGoalsScore(payload: Pick<ResultadoSharePayload, "sportLabel" | "mensagem">, score: ReturnType<typeof shareScoreSummary>) {
  const parsed = parseScorePayloadFromPartidaMensagem(payload.mensagem);
  if (parsed?.type === "gols") return true;
  return /fut|soccer|campo|society|futsal/u.test(cleanShareText(payload.sportLabel, "").toLowerCase()) && !shareUsesSetLines(score);
}

function LocalLogoThumb({ src }: { src?: string | null }) {
  if (!src?.trim()) return null;
  return (
    <span className="relative inline-flex h-5 w-5 shrink-0 overflow-hidden rounded-md border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_72%,white_18%)] bg-eid-card align-middle shadow-sm">
      <NextImage src={src} alt="" fill unoptimized className="object-cover" />
    </span>
  );
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = cleanShareText(text).split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\.+$/u, "")}...`;
  }
  return lines;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível gerar a imagem do resultado."));
    }, "image/png", 0.96);
  });
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao preparar imagem."));
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Imagem inválida."));
    };
    reader.readAsDataURL(file);
  });
}

function drawCenteredWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const lines = wrapCanvasText(ctx, text, maxWidth, maxLines);
  lines.forEach((line, idx) => ctx.fillText(line, x, y + idx * lineHeight));
  return y + Math.max(0, lines.length - 1) * lineHeight;
}

function canvasColorVar(styles: CSSStyleDeclaration, name: string, fallback: string) {
  return styles.getPropertyValue(name).trim() || fallback;
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem de fundo."));
    img.src = src;
  });
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const sw = width / scale;
  const sh = height / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
}

function overlayTextColor(variant: ResultadoSharePayload["cardVariant"], colors: { fg: string; ink: string }) {
  return variant === "light" ? colors.ink : colors.fg;
}

function sportShareTheme(sportLabel: string | null) {
  const label = cleanShareText(sportLabel, "").toLowerCase();
  if (/fut|soccer|campo|society|futsal/u.test(label)) return "field";
  if (/tenis|tênis|padel|beach tennis|pickle/u.test(label)) return "court";
  if (/basquete|basket/u.test(label)) return "basket";
  if (/corrida|run|cicl|bike|triathlon/u.test(label)) return "track";
  if (/volei|vôlei|volley|beach/u.test(label)) return "sand";
  return "ink";
}

function shareScoreSummary(payload: Pick<ResultadoSharePayload, "placar" | "mensagem">) {
  const score = parseScorePayloadFromPartidaMensagem(payload.mensagem);
  const fallback = cleanShareText(payload.placar, "-");
  if (score?.type === "sets" && Array.isArray(score.sets) && score.sets.length > 0) {
    let winsA = 0;
    let winsB = 0;
    const sets = score.sets.map((set) => {
      const a = Number(set.a) || 0;
      const b = Number(set.b) || 0;
      if (a > b) winsA += 1;
      if (b > a) winsB += 1;
      const tie = set.tiebreakA || set.tiebreakB ? ` (${set.tiebreakA ?? 0}-${set.tiebreakB ?? 0})` : "";
      return `${a}-${b}${tie}`;
    });
    return {
      headline: `${winsA} x ${winsB}`,
      detail: "Placar por sets",
      lines: sets,
      extra: null as string | null,
    };
  }
  if (score?.type === "gols" && score.goals && goalsPayloadHasAny(score.goals)) {
    const base = goalsTotalsBeforePenaltiesDisplay(score.goals);
    const penaltyA = Number(score.goals.penaltiesA ?? 0) || 0;
    const penaltyB = Number(score.goals.penaltiesB ?? 0) || 0;
    const overtimeA = Number(score.goals.overtimeA ?? 0) || 0;
    const overtimeB = Number(score.goals.overtimeB ?? 0) || 0;
    return {
      headline: `${base.a} x ${base.b}`,
      detail: penaltyA || penaltyB ? "Decidido nos pênaltis" : null,
      lines: penaltyA || penaltyB ? [`Pênaltis ${penaltyA} x ${penaltyB}`] : [],
      extra: overtimeA || overtimeB ? `Prorrogação ${overtimeA} x ${overtimeB}` : null,
    };
  }
  if (score?.type === "pontos" && score.points) {
    const totals = pointsTotalsAccumulatedForDisplay(score.points);
    const overtimeA = Number(score.points.overtimeA ?? 0) || 0;
    const overtimeB = Number(score.points.overtimeB ?? 0) || 0;
    return {
      headline: `${totals.a} x ${totals.b}`,
      detail: overtimeA || overtimeB ? `Prorrogação: ${overtimeA} x ${overtimeB}` : null,
      lines: [],
      extra: null as string | null,
    };
  }
  if (score?.type === "rounds" && score.rounds) {
    const winner = score.rounds.winner === "a" ? "Lado A" : "Lado B";
    const method = score.rounds.method.toUpperCase();
    return {
      headline: fallback,
      detail: `${winner} por ${method}`,
      lines: [],
      extra: `${score.rounds.items.length} round${score.rounds.items.length === 1 ? "" : "s"}`,
    };
  }
  return { headline: fallback, detail: null as string | null, lines: [] as string[], extra: null as string | null };
}

function getShareSetRows(payload: Pick<ResultadoSharePayload, "mensagem">) {
  const score = parseScorePayloadFromPartidaMensagem(payload.mensagem);
  if (score?.type !== "sets" || !Array.isArray(score.sets)) return [];
  return score.sets
    .map((set) => {
      const a = Number(set.a ?? 0) || 0;
      const b = Number(set.b ?? 0) || 0;
      const tiebreakA = Number(set.tiebreakA ?? 0) || 0;
      const tiebreakB = Number(set.tiebreakB ?? 0) || 0;
      return { a, b, tiebreakA, tiebreakB, hasTiebreak: tiebreakA > 0 || tiebreakB > 0 };
    })
    .filter((set) => set.a > 0 || set.b > 0 || set.hasTiebreak)
    .slice(0, 5);
}

function drawCanvasSetCell(
  ctx: CanvasRenderingContext2D,
  value: number,
  tiebreak: number,
  hasTiebreak: boolean,
  x: number,
  y: number,
  fontPx: number,
  color: string,
  subColor: string,
) {
  ctx.fillStyle = color;
  ctx.font = `900 ${fontPx}px Arial, sans-serif`;
  ctx.fillText(String(value), x, y);
  if (!hasTiebreak) return;
  const mainW = ctx.measureText(String(value)).width;
  ctx.fillStyle = subColor;
  ctx.font = `900 ${fontPx * 0.46}px Arial, sans-serif`;
  ctx.fillText(String(tiebreak), x + mainW / 2 + fontPx * 0.2, y - fontPx * 0.36);
}

function drawShareSetsTable(
  ctx: CanvasRenderingContext2D,
  payload: ResultadoSharePayload,
  sets: ReturnType<typeof getShareSetRows>,
  x: number,
  y: number,
  width: number,
  scale: number,
  colors: { primarySoft: string; action: string; fg: string; muted: string; ink: string },
  text: string,
  muted: string,
) {
  const cols = Math.max(1, sets.length);
  const nameW = 190 * scale;
  const rowH = 58 * scale;
  const headH = 36 * scale;
  const tableH = headH + rowH * 2;
  const colW = (width - nameW) / cols;

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.roundRect(x, y, width, tableH, 22 * scale);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  ctx.fillStyle = "rgba(37, 99, 235, 0.18)";
  ctx.roundRect(x, y, width, headH, 22 * scale);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = muted;
  ctx.font = `900 ${15 * scale}px Arial, sans-serif`;
  sets.forEach((_, idx) => ctx.fillText(`S${idx + 1}`, x + nameW + colW * idx + colW / 2, y + headH / 2));

  const names = [shareFirstName(payload.ladoA), shareFirstName(payload.ladoB)];
  names.forEach((name, rowIdx) => {
    const rowY = y + headH + rowIdx * rowH;
    ctx.fillStyle = rowIdx === 0 ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.08)";
    ctx.fillRect(x, rowY, width, rowH);
    ctx.textAlign = "left";
    ctx.fillStyle = text;
    ctx.font = `900 ${19 * scale}px Arial, sans-serif`;
    ctx.fillText(name, x + 22 * scale, rowY + rowH / 2 + 1 * scale);
  });

  ctx.textAlign = "center";
  sets.forEach((set, idx) => {
    const cx = x + nameW + colW * idx + colW / 2;
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath();
    ctx.moveTo(x + nameW + colW * idx, y);
    ctx.lineTo(x + nameW + colW * idx, y + tableH);
    ctx.stroke();
    drawCanvasSetCell(ctx, set.a, set.tiebreakA, set.hasTiebreak, cx, y + headH + rowH / 2 + 2 * scale, 27 * scale, text, colors.primarySoft);
    drawCanvasSetCell(ctx, set.b, set.tiebreakB, set.hasTiebreak, cx, y + headH + rowH + rowH / 2 + 2 * scale, 27 * scale, text, colors.primarySoft);
  });
}

function drawShareGoalsTvScore(
  ctx: CanvasRenderingContext2D,
  payload: ResultadoSharePayload,
  x: number,
  y: number,
  width: number,
  scale: number,
  colors: { primarySoft: string; action: string; fg: string; muted: string; ink: string },
  text: string,
  muted: string,
) {
  const parsed = parseScorePayloadFromPartidaMensagem(payload.mensagem);
  const goals = parsed?.type === "gols" ? parsed.goals : null;
  const score = shareScoreSummary(payload);
  const base = goals ? goalsTotalsBeforePenaltiesDisplay(goals) : null;
  const penA = Number(goals?.penaltiesA ?? 0) || 0;
  const penB = Number(goals?.penaltiesB ?? 0) || 0;
  const hasPen = penA > 0 || penB > 0;

  ctx.fillStyle = "rgba(6, 37, 22, 0.78)";
  ctx.roundRect(x, y, width, 136 * scale, 28 * scale);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.09)";
  ctx.fillRect(x + width / 2 - 1 * scale, y + 18 * scale, 2 * scale, 100 * scale);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = muted;
  ctx.font = `900 ${15 * scale}px Arial, sans-serif`;
  ctx.fillText("PLACAR FINAL", x + width / 2, y + 24 * scale);
  ctx.fillStyle = text;
  ctx.font = `900 ${27 * scale}px Arial, sans-serif`;
  ctx.fillText(shareFirstName(payload.ladoA), x + width * 0.25, y + 62 * scale);
  ctx.fillText(shareFirstName(payload.ladoB), x + width * 0.75, y + 62 * scale);
  ctx.font = `900 ${48 * scale}px Arial, sans-serif`;
  const fallbackGoals = score.headline.split(/\s*[x×]\s*/i);
  ctx.fillText(base ? String(base.a) : fallbackGoals[0] ?? "0", x + width * 0.38, y + 96 * scale);
  ctx.fillStyle = colors.primarySoft;
  ctx.font = `900 ${24 * scale}px Arial, sans-serif`;
  ctx.fillText("×", x + width / 2, y + 96 * scale);
  ctx.fillStyle = text;
  ctx.font = `900 ${48 * scale}px Arial, sans-serif`;
  ctx.fillText(base ? String(base.b) : fallbackGoals[1] ?? "0", x + width * 0.62, y + 96 * scale);
  if (hasPen) {
    ctx.fillStyle = colors.action;
    ctx.font = `900 ${16 * scale}px Arial, sans-serif`;
    ctx.fillText(`PÊNALTIS ${penA} × ${penB}`, x + width / 2, y + 122 * scale);
  }
}

function drawShareSlimResultCard(
  ctx: CanvasRenderingContext2D,
  payload: ResultadoSharePayload,
  colors: { primarySoft: string; action: string; fg: string; muted: string; ink: string },
  brandLogo?: HTMLImageElement | null,
  avatars?: { a?: HTMLImageElement | null; b?: HTMLImageElement | null },
) {
  const score = shareScoreSummary(payload);
  const setRows = getShareSetRows(payload);
  const isSets = shareUsesSetLines(score) && setRows.length > 0;
  const isGoals = shareUsesGoalsScore(payload, score);
  const scale = payload.overlayScale;
  const logoScale = Math.min(1.7, Math.max(0.75, payload.brandLogoScale || 1));
  const baseWidth = 620;
  const baseHeight = payload.showMeta ? 440 : 390;
  const cardWidth = baseWidth * scale;
  const cardHeight = baseHeight * scale;
  const x = Math.min(1080 - cardWidth - 70, Math.max(70, payload.overlayPosition.x * 1080 - cardWidth / 2));
  const y = Math.min(1920 - cardHeight - 120, Math.max(120, payload.overlayPosition.y * 1920 - cardHeight / 2));
  const center = x + cardWidth / 2;
  const text = overlayTextColor(payload.cardVariant, colors);
  const muted = payload.cardVariant === "light" ? "rgba(11, 29, 46, 0.70)" : colors.muted;

  ctx.fillStyle = "rgba(5, 14, 25, 0.36)";
  ctx.roundRect(x + 12 * scale, y + 16 * scale, cardWidth, cardHeight, 40 * scale);
  ctx.fill();
  ctx.fillStyle =
    payload.cardVariant === "light"
      ? "rgba(255, 255, 255, 0.90)"
      : payload.cardVariant === "glass"
        ? "rgba(11, 29, 46, 0.54)"
        : "rgba(11, 29, 46, 0.86)";
  ctx.roundRect(x, y, cardWidth, cardHeight, 40 * scale);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (payload.showBrand) {
    if (brandLogo) {
      const logoW = 210 * logoScale * scale;
      const logoH = 50 * logoScale * scale;
      ctx.drawImage(brandLogo, center - logoW / 2, y + 28 * scale, logoW, logoH);
    } else {
      ctx.font = `900 ${28 * logoScale * scale}px Arial, sans-serif`;
      ctx.fillStyle = text;
      ctx.fillText("ESPORTE", center - 28 * scale, y + 52 * scale);
      ctx.fillStyle = colors.action;
      ctx.fillText("ID", center + 86 * scale, y + 52 * scale);
    }
  }

  const sportY = y + (payload.showBrand ? 92 : 42) * scale;
  ctx.fillStyle = colors.primarySoft;
  ctx.font = `900 ${16 * scale}px Arial, sans-serif`;
  ctx.fillText(`${sportShareIconText(payload.sportLabel)} ${cleanShareText(payload.sportLabel, "Resultado oficial").toUpperCase()}`, center, sportY);

  const drawAvatar = (img: HTMLImageElement | null | undefined, label: string, cx: number, cy: number) => {
    const r = 34 * scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    if (img) {
      const size = r * 2;
      const coverScale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
      const sw = size / coverScale;
      const sh = size / coverScale;
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, cx - r, cy - r, size, size);
    }
    ctx.restore();
    if (!img) {
      ctx.fillStyle = colors.primarySoft;
      ctx.font = `900 ${20 * scale}px Arial, sans-serif`;
      ctx.fillText(shareInitials(label), cx, cy + 1 * scale);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.40)";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  };

  const scoreTop = sportY + 36 * scale;
  const scoreX = center - 210 * scale;
  const scoreW = 420 * scale;
  const scoreH = isSets ? 142 * scale : 112 * scale;
  ctx.fillStyle = isGoals ? "rgba(6, 37, 22, 0.82)" : "rgba(255,255,255,0.08)";
  ctx.roundRect(scoreX, scoreTop, scoreW, scoreH, 22 * scale);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.stroke();

  drawAvatar(avatars?.a, payload.ladoA, scoreX - 10 * scale, scoreTop + scoreH / 2);
  drawAvatar(avatars?.b, payload.ladoB, scoreX + scoreW + 10 * scale, scoreTop + scoreH / 2);

  ctx.fillStyle = text;
  ctx.font = `900 ${18 * scale}px Arial, sans-serif`;
  ctx.fillText(shareFirstName(payload.ladoA), scoreX - 10 * scale, scoreTop + scoreH / 2 + 50 * scale);
  ctx.fillText(shareFirstName(payload.ladoB), scoreX + scoreW + 10 * scale, scoreTop + scoreH / 2 + 50 * scale);

  if (isSets) {
    const nameW = 112 * scale;
    const headerH = 30 * scale;
    const rowH = 48 * scale;
    const colW = (scoreW - nameW) / Math.max(1, setRows.length);
    ctx.fillStyle = "rgba(37,99,235,0.16)";
    ctx.roundRect(scoreX, scoreTop, scoreW, headerH, 22 * scale);
    ctx.fill();
    ctx.fillStyle = muted;
    ctx.font = `900 ${13 * scale}px Arial, sans-serif`;
    setRows.forEach((_, idx) => ctx.fillText(`S${idx + 1}`, scoreX + nameW + colW * idx + colW / 2, scoreTop + headerH / 2));
    [payload.ladoA, payload.ladoB].forEach((name, rowIdx) => {
      const rowY = scoreTop + headerH + rowIdx * rowH;
      ctx.fillStyle = rowIdx === 0 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.08)";
      ctx.fillRect(scoreX, rowY, scoreW, rowH);
      ctx.textAlign = "left";
      ctx.fillStyle = text;
      ctx.font = `900 ${15 * scale}px Arial, sans-serif`;
      ctx.fillText(shareFirstName(name), scoreX + 14 * scale, rowY + rowH / 2 + 1 * scale);
      ctx.textAlign = "center";
      setRows.forEach((set, idx) => {
        drawCanvasSetCell(
          ctx,
          rowIdx === 0 ? set.a : set.b,
          rowIdx === 0 ? set.tiebreakA : set.tiebreakB,
          set.hasTiebreak,
          scoreX + nameW + colW * idx + colW / 2,
          rowY + rowH / 2 + 2 * scale,
          23 * scale,
          text,
          colors.primarySoft,
        );
      });
    });
  } else if (isGoals) {
    drawShareGoalsTvScore(ctx, payload, scoreX + 40 * scale, scoreTop + 10 * scale, scoreW - 80 * scale, scale * 0.72, colors, text, muted);
  } else {
    ctx.fillStyle = colors.primarySoft;
    ctx.font = `900 ${13 * scale}px Arial, sans-serif`;
    ctx.fillText("PLACAR FINAL", center, scoreTop + 28 * scale);
    ctx.fillStyle = text;
    ctx.font = `900 ${44 * scale}px Arial, sans-serif`;
    ctx.fillText(score.headline, center, scoreTop + 72 * scale);
  }

  if (payload.showMeta) {
    ctx.fillStyle = muted;
    ctx.font = `800 ${16 * scale}px Arial, sans-serif`;
    drawCenteredWrappedText(ctx, shareMetaLine(payload), center, y + cardHeight - 34 * scale, cardWidth * 0.82, 20 * scale, 2);
  }
}

function drawDefaultSportBackground(ctx: CanvasRenderingContext2D, payload: ResultadoSharePayload, colors: { ink: string; surface: string; primary: string; action: string }) {
  const theme = sportShareTheme(payload.sportLabel);
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  if (theme === "field") {
    gradient.addColorStop(0, "#062516");
    gradient.addColorStop(0.48, "#0f4a2e");
    gradient.addColorStop(1, colors.ink);
  } else if (theme === "court") {
    gradient.addColorStop(0, colors.ink);
    gradient.addColorStop(0.48, "#153f86");
    gradient.addColorStop(1, "#482313");
  } else if (theme === "basket") {
    gradient.addColorStop(0, "#20120b");
    gradient.addColorStop(0.54, "#8a3c12");
    gradient.addColorStop(1, colors.ink);
  } else if (theme === "track") {
    gradient.addColorStop(0, colors.ink);
    gradient.addColorStop(0.56, "#7a1f24");
    gradient.addColorStop(1, "#101827");
  } else if (theme === "sand") {
    gradient.addColorStop(0, "#122d45");
    gradient.addColorStop(0.58, "#936833");
    gradient.addColorStop(1, colors.ink);
  } else {
    gradient.addColorStop(0, colors.ink);
    gradient.addColorStop(0.56, colors.surface);
    gradient.addColorStop(1, colors.ink);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 36; i += 1) {
    const x = (i * 173) % 1080;
    const y = (i * 307) % 1920;
    ctx.beginPath();
    ctx.arc(x, y, 1.8 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.48;
  ctx.strokeStyle = theme === "basket" || theme === "sand" ? "rgba(255,255,255,0.62)" : "rgba(255,255,255,0.46)";
  ctx.lineWidth = 8;
  if (theme === "field") {
    for (let x = 90; x < 990; x += 180) {
      ctx.fillStyle = x % 360 === 90 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.035)";
      ctx.fillRect(x, 260, 180, 1400);
    }
    ctx.strokeRect(90, 300, 900, 1320);
    ctx.strokeRect(90, 540, 190, 840);
    ctx.strokeRect(800, 540, 190, 840);
    ctx.beginPath();
    ctx.moveTo(90, 960);
    ctx.lineTo(990, 960);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(540, 960, 150, 0, Math.PI * 2);
    ctx.stroke();
  } else if (theme === "court") {
    ctx.strokeRect(120, 300, 840, 1320);
    ctx.strokeRect(120, 300, 420, 660);
    ctx.strokeRect(540, 960, 420, 660);
    ctx.beginPath();
    ctx.moveTo(120, 960);
    ctx.lineTo(960, 960);
    ctx.moveTo(540, 300);
    ctx.lineTo(540, 1620);
    ctx.stroke();
  } else if (theme === "basket") {
    ctx.strokeStyle = "rgba(255,255,255,0.52)";
    ctx.beginPath();
    ctx.arc(540, 1130, 520, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    ctx.strokeRect(230, 360, 620, 420);
    ctx.strokeRect(390, 360, 300, 260);
    ctx.beginPath();
    ctx.arc(540, 780, 120, 0, Math.PI * 2);
    ctx.stroke();
  } else if (theme === "track") {
    ctx.strokeStyle = "rgba(255,255,255,0.44)";
    ctx.lineWidth = 7;
    for (let i = 0; i < 6; i += 1) {
      ctx.strokeRect(95 + i * 46, 300 + i * 70, 890 - i * 92, 1320 - i * 140);
    }
  } else if (theme === "sand") {
    ctx.lineWidth = 5;
    ctx.strokeRect(130, 360, 820, 1200);
    ctx.beginPath();
    ctx.moveTo(130, 960);
    ctx.lineTo(950, 960);
    ctx.stroke();
    for (let y = 360; y < 1580; y += 90) {
      ctx.beginPath();
      ctx.moveTo(130, y);
      ctx.bezierCurveTo(320, y - 36, 520, y + 36, 760, y - 16);
      ctx.bezierCurveTo(850, y - 32, 930, y - 10, 990, y + 12);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.arc(780, 420, 310, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(280, 1460, 360, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  const glowA = ctx.createRadialGradient(860, 160, 20, 860, 160, 520);
  glowA.addColorStop(0, colors.primary);
  glowA.addColorStop(1, "rgba(37, 99, 235, 0)");
  ctx.fillStyle = glowA;
  ctx.fillRect(360, -300, 900, 900);

  const glowB = ctx.createRadialGradient(160, 1610, 20, 160, 1610, 520);
  glowB.addColorStop(0, colors.action);
  glowB.addColorStop(1, "rgba(249, 115, 22, 0)");
  ctx.fillStyle = glowB;
  ctx.fillRect(-260, 1120, 880, 880);
}

function drawShareResultCard(
  ctx: CanvasRenderingContext2D,
  payload: ResultadoSharePayload,
  colors: { primarySoft: string; action: string; fg: string; muted: string; ink: string },
  brandLogo?: HTMLImageElement | null,
  avatars?: { a?: HTMLImageElement | null; b?: HTMLImageElement | null },
) {
  if (payload.shareLayout === "slim") {
    drawShareSlimResultCard(ctx, payload, colors, brandLogo, avatars);
    return;
  }

  const score = shareScoreSummary(payload);
  const setRows = getShareSetRows(payload);
  const isSets = shareUsesSetLines(score) && setRows.length > 0;
  const isGoals = shareUsesGoalsScore(payload, score);
  const hasExtraScoreLine = Boolean(score.extra) || (isGoals && score.lines.length > 0);
  const baseWidth = payload.cardVariant === "compact" ? 700 : 840;
  const baseHeight =
    payload.cardVariant === "compact"
      ? payload.showMeta
        ? 600
        : 540
      : isSets
        ? 720
        : hasExtraScoreLine
          ? 690
          : 650;
  const cardWidth = baseWidth * payload.overlayScale;
  const cardHeight = baseHeight * payload.overlayScale;
  const x = Math.min(1080 - cardWidth - 70, Math.max(70, payload.overlayPosition.x * 1080 - cardWidth / 2));
  const y = Math.min(1920 - cardHeight - 120, Math.max(120, payload.overlayPosition.y * 1920 - cardHeight / 2));
  const text = overlayTextColor(payload.cardVariant, colors);
  const muted = payload.cardVariant === "light" ? "rgba(11, 29, 46, 0.72)" : colors.muted;

  ctx.fillStyle = "rgba(5, 14, 25, 0.42)";
  ctx.roundRect(x + 16, y + 20, cardWidth, cardHeight, 54);
  ctx.fill();
  ctx.fillStyle =
    payload.cardVariant === "light"
      ? "rgba(255, 255, 255, 0.86)"
      : payload.cardVariant === "glass"
        ? "rgba(11, 29, 46, 0.48)"
        : "rgba(11, 29, 46, 0.82)";
  ctx.roundRect(x, y, cardWidth, cardHeight, 54);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const scale = payload.overlayScale;
  const center = x + cardWidth / 2;
  const firstA = shareFirstName(payload.ladoA);
  const firstB = shareFirstName(payload.ladoB);
  const drawAvatar = (img: HTMLImageElement | null | undefined, label: string, cx: number, cy: number) => {
    const r = 30 * scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    if (img) {
      const size = r * 2;
      const coverScale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
      const sw = size / coverScale;
      const sh = size / coverScale;
      ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, cx - r, cy - r, size, size);
    }
    ctx.restore();
    if (!img) {
      ctx.fillStyle = colors.primarySoft;
      ctx.font = `900 ${20 * scale}px Arial, sans-serif`;
      ctx.fillText(shareInitials(label), cx, cy + 1 * scale);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  };

  if (payload.showBrand) {
    const logoScale = Math.min(1.7, Math.max(0.75, payload.brandLogoScale || 1));
    if (brandLogo) {
      const logoW = 270 * logoScale * scale;
      const logoH = 64 * logoScale * scale;
      ctx.drawImage(brandLogo, center - logoW / 2, y + 42 * scale, logoW, logoH);
    } else {
      ctx.font = `900 ${38 * logoScale * scale}px Arial, sans-serif`;
      ctx.fillStyle = text;
      ctx.fillText("ESPORTE", center - 36 * scale, y + 70 * scale);
      ctx.fillStyle = colors.action;
      ctx.fillText("ID", center + 112 * scale, y + 70 * scale);
    }
  }

  ctx.fillStyle = "rgba(37, 99, 235, 0.20)";
  ctx.roundRect(center - 225 * scale, y + (payload.showBrand ? 126 : 52) * scale, 450 * scale, 52 * scale, 26 * scale);
  ctx.fill();
  ctx.fillStyle = colors.primarySoft;
  ctx.font = `900 ${22 * scale}px Arial, sans-serif`;
  ctx.fillText(
    `${sportShareIconText(payload.sportLabel)} ${cleanShareText(payload.sportLabel, "Resultado oficial").toUpperCase()}`,
    center,
    y + (payload.showBrand ? 153 : 79) * scale,
  );

  ctx.fillStyle = text;
  const namesY = y + (payload.cardVariant === "compact" ? 228 : 254) * scale;
  drawAvatar(avatars?.a, payload.ladoA, center - 190 * scale, namesY);
  drawAvatar(avatars?.b, payload.ladoB, center + 190 * scale, namesY);
  ctx.font = `900 ${28 * scale}px Arial, sans-serif`;
  ctx.fillText(firstA, center - 190 * scale, namesY + 48 * scale);
  ctx.fillText(firstB, center + 190 * scale, namesY + 48 * scale);
  ctx.fillStyle = colors.primarySoft;
  ctx.font = `900 ${20 * scale}px Arial, sans-serif`;
  ctx.fillText("VS", center, namesY + 15 * scale);

  const scoreY = y + (payload.cardVariant === "compact" ? 395 : 450) * scale;
  if (isSets) {
    ctx.fillStyle = colors.primarySoft;
    ctx.font = `900 ${18 * scale}px Arial, sans-serif`;
    ctx.fillText("PLACAR POR SETS", center, scoreY - 34 * scale);
    drawShareSetsTable(ctx, payload, setRows, center - 315 * scale, scoreY - 12 * scale, 630 * scale, scale, colors, text, muted);
  } else if (isGoals) {
    drawShareGoalsTvScore(ctx, payload, center - 300 * scale, scoreY - 70 * scale, 600 * scale, scale, colors, text, muted);
  } else {
    ctx.fillStyle = "rgba(249, 115, 22, 0.14)";
    ctx.roundRect(center - 230 * scale, scoreY - 50 * scale, 460 * scale, 122 * scale, 34 * scale);
    ctx.fill();
    ctx.strokeStyle = colors.action;
    ctx.lineWidth = 2.5 * scale;
    ctx.stroke();
    ctx.fillStyle = colors.primarySoft;
    ctx.font = `900 ${16 * scale}px Arial, sans-serif`;
    ctx.fillText("PLACAR FINAL", center, scoreY - 24 * scale);
    ctx.fillStyle = text;
    ctx.font = `900 ${56 * scale}px Arial, sans-serif`;
    ctx.fillText(score.headline, center, scoreY + 24 * scale);
  }
  if (score.extra && payload.cardVariant !== "compact" && !isSets) {
    ctx.fillStyle = muted;
    ctx.font = `800 ${19 * scale}px Arial, sans-serif`;
    drawCenteredWrappedText(ctx, score.extra, center, scoreY + 92 * scale, cardWidth * 0.72, 23 * scale, 1);
  }

  if (payload.showMeta) {
    ctx.fillStyle = muted;
    ctx.font = `800 ${payload.cardVariant === "compact" ? 18 * scale : 21 * scale}px Arial, sans-serif`;
    drawCenteredWrappedText(ctx, shareMetaLine(payload), center, y + cardHeight - 44 * scale, cardWidth * 0.86, 26 * scale, 2);
  }
}

async function createResultadoShareImage(payload: ResultadoSharePayload) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível para gerar o resultado.");
  const styles = getComputedStyle(document.documentElement);
  const ink = canvasColorVar(styles, "--eid-brand-ink", "rgb(11, 29, 46)");
  const surface = canvasColorVar(styles, "--eid-surface", "rgb(18, 52, 90)");
  const primary = canvasColorVar(styles, "--eid-primary-500", "rgb(37, 99, 235)");
  const primarySoft = canvasColorVar(styles, "--eid-primary-200", "rgb(191, 219, 254)");
  const action = canvasColorVar(styles, "--eid-action-500", "rgb(249, 115, 22)");
  const fg = canvasColorVar(styles, "--eid-fg", "rgb(255, 255, 255)");
  const muted = canvasColorVar(styles, "--eid-text-muted", "rgba(255, 255, 255, 0.72)");

  if (payload.backgroundDataUrl) {
    const image = await loadCanvasImage(payload.backgroundDataUrl);
    ctx.save();
    if (payload.backgroundFilter === "blur") ctx.filter = "blur(10px) saturate(1.08)";
    drawImageCover(ctx, image, 1080, 1920);
    ctx.restore();
    ctx.fillStyle = payload.backgroundFilter === "normal" ? "rgba(0, 0, 0, 0.12)" : "rgba(0, 0, 0, 0.34)";
    ctx.fillRect(0, 0, 1080, 1920);
  } else {
    drawDefaultSportBackground(ctx, payload, { ink, surface, primary, action });
  }

  let brandLogo: HTMLImageElement | null = null;
  let avatarA: HTMLImageElement | null = null;
  let avatarB: HTMLImageElement | null = null;
  if (payload.showBrand) {
    try {
      brandLogo = await loadCanvasImage(EID_LOGO_WORDMARK_SRC);
    } catch {
      brandLogo = null;
    }
  }
  try {
    avatarA = payload.ladoAAvatarUrl ? await loadCanvasImage(payload.ladoAAvatarUrl) : null;
  } catch {
    avatarA = null;
  }
  try {
    avatarB = payload.ladoBAvatarUrl ? await loadCanvasImage(payload.ladoBAvatarUrl) : null;
  } catch {
    avatarB = null;
  }

  drawShareResultCard(ctx, payload, { primarySoft, action, fg, muted, ink }, brandLogo, { a: avatarA, b: avatarB });

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = "800 30px Arial, sans-serif";
  if (payload.showBrand) ctx.fillText("esporteid.com.br", 540, 1718);

  const blob = await canvasToBlob(canvas);
  return new File([blob], `esporteid-resultado-${Date.now()}.png`, { type: "image/png" });
}

function downloadResultadoFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function HistoricoPlacarDisplay({
  item,
  sportFallback,
}: {
  item: ResumoHistoricoItem;
  sportFallback: string | null;
}) {
  const payload = parseScorePayloadFromPartidaMensagem(item.mensagem);
  const sport = item.sportLabel ?? sportFallback;
  if (payload?.type === "gols" && payload.goals && goalsPayloadHasAny(payload.goals)) {
    return (
      <GoalsScoreboardSummary
        variant="card"
        goals={payload.goals}
        sportName={sport}
        caption={null}
        className="!px-2 !py-2 sm:!px-2.5 sm:!py-2.5"
      />
    );
  }
  return <PlacarNumerosInline placar={item.placar} size="sm" />;
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
  sets: NonNullable<MatchScorePayload["sets"]>;
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
  ladoATimeId,
  ladoBTimeId,
  avatarVariant = "circle",
  swapSets = false,
  origem,
  dataHora,
  local,
  localHref,
  localLogoUrl,
  placarBase,
  mensagem,
  totalConfrontos,
  saldoResumo,
  ultimosConfrontos,
  children,
  asListItem = false,
  rowClassName,
  sportLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const payload = useMemo(() => parseScorePayloadFromPartidaMensagem(mensagem), [mensagem]);
  const [closing, setClosing] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "sharing" | "saving" | "done" | "saved" | "error">("idle");
  const [shareBackgroundDataUrl, setShareBackgroundDataUrl] = useState<string | null>(null);
  const [shareBackgroundLabel, setShareBackgroundLabel] = useState("Fundo padrão");
  const [shareOverlayPosition, setShareOverlayPosition] = useState({ x: 0.5, y: 0.58 });
  const [shareOverlayScale, setShareOverlayScale] = useState(0.92);
  const [shareBrandLogoScale, setShareBrandLogoScale] = useState(1.22);
  const [shareLayout, setShareLayout] = useState<ResultadoSharePayload["shareLayout"]>("slim");
  const [shareCardVariant, setShareCardVariant] = useState<ResultadoSharePayload["cardVariant"]>("dark");
  const [shareBackgroundFilter, setShareBackgroundFilter] = useState<ResultadoSharePayload["backgroundFilter"]>("dim");
  const [shareShowMeta, setShareShowMeta] = useState(true);
  const [shareShowBrand, setShareShowBrand] = useState(true);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const sharePreviewRef = useRef<HTMLDivElement | null>(null);
  const shareFileInputRef = useRef<HTMLInputElement | null>(null);

  const hrefA =
    (ladoAProfileHref && String(ladoAProfileHref).trim()) ||
    (ladoATimeId != null && Number.isFinite(ladoATimeId) && ladoATimeId > 0 ? `/perfil-time/${ladoATimeId}` : null);
  const hrefB =
    (ladoBProfileHref && String(ladoBProfileHref).trim()) ||
    (ladoBTimeId != null && Number.isFinite(ladoBTimeId) && ladoBTimeId > 0 ? `/perfil-time/${ladoBTimeId}` : null);

  const avatarImgClass =
    avatarVariant === "formacao"
      ? "h-12 w-12 shrink-0 rounded-2xl border-2 border-[color:color-mix(in_srgb,var(--eid-card)_70%,var(--eid-primary-500)_30%)] object-cover shadow-[0_4px_14px_-4px_rgba(15,23,42,0.45)]"
      : AVATAR_LG;
  const avatarFallbackClass =
    avatarVariant === "formacao"
      ? "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[color:color-mix(in_srgb,var(--eid-card)_70%,var(--eid-primary-500)_30%)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_35%,var(--eid-surface)_65%),var(--eid-surface))] text-sm font-black text-eid-primary-200 shadow-[0_4px_14px_-4px_rgba(15,23,42,0.45)]"
      : AVATAR_FALLBACK_LG;

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
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

  const sharePayload = useMemo<ResultadoSharePayload>(
    () => ({
      ladoA,
      ladoB,
      placar: placarBase,
      origem,
      dataHora,
      local,
      sportLabel: sportLabel ?? null,
      mensagem: mensagem ?? null,
      ladoAAvatarUrl,
      ladoBAvatarUrl,
      backgroundDataUrl: shareBackgroundDataUrl,
      overlayPosition: shareOverlayPosition,
      overlayScale: shareOverlayScale,
      brandLogoScale: shareBrandLogoScale,
      shareLayout,
      cardVariant: shareCardVariant,
      backgroundFilter: shareBackgroundFilter,
      showMeta: shareShowMeta,
      showBrand: shareShowBrand,
    }),
    [
      dataHora,
      ladoA,
      ladoB,
      local,
      origem,
      mensagem,
      placarBase,
      ladoAAvatarUrl,
      ladoBAvatarUrl,
      shareBackgroundDataUrl,
      shareBackgroundFilter,
      shareBrandLogoScale,
      shareLayout,
      shareCardVariant,
      shareOverlayPosition,
      shareOverlayScale,
      shareShowBrand,
      shareShowMeta,
      sportLabel,
    ],
  );
  const shareScore = useMemo(() => shareScoreSummary(sharePayload), [sharePayload]);
  const shareSetRows = useMemo(() => getShareSetRows(sharePayload), [sharePayload]);
  const shareIsSets = shareUsesSetLines(shareScore);
  const shareIsGoals = shareUsesGoalsScore(sharePayload, shareScore);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
    try {
      const raw = window.localStorage.getItem(RESULT_SHARE_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<ResultadoSharePayload>;
      if (saved.overlayPosition) setShareOverlayPosition(saved.overlayPosition);
      if (typeof saved.overlayScale === "number") setShareOverlayScale(Math.min(1.18, Math.max(0.74, saved.overlayScale)));
      if (typeof saved.brandLogoScale === "number") setShareBrandLogoScale(Math.min(1.7, Math.max(0.75, saved.brandLogoScale)));
      setShareLayout(saved.shareLayout === "complete" ? "complete" : "slim");
      if (saved.cardVariant) setShareCardVariant(saved.cardVariant);
      if (saved.backgroundFilter) setShareBackgroundFilter(saved.backgroundFilter);
      if (typeof saved.showMeta === "boolean") setShareShowMeta(saved.showMeta);
      if (typeof saved.showBrand === "boolean") setShareShowBrand(saved.showBrand);
    } catch {
      /* ignore */
    }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        RESULT_SHARE_STORAGE_KEY,
        JSON.stringify({
          overlayPosition: shareOverlayPosition,
          overlayScale: shareOverlayScale,
          brandLogoScale: shareBrandLogoScale,
          shareLayout,
          cardVariant: shareCardVariant,
          backgroundFilter: shareBackgroundFilter,
          showMeta: shareShowMeta,
          showBrand: shareShowBrand,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [shareBackgroundFilter, shareBrandLogoScale, shareCardVariant, shareLayout, shareOverlayPosition, shareOverlayScale, shareShowBrand, shareShowMeta]);

  const updateShareOverlayFromPointer = useCallback((clientX: number, clientY: number) => {
    const preview = sharePreviewRef.current;
    if (!preview) return;
    const rect = preview.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setShareOverlayPosition({
      x: Math.min(0.86, Math.max(0.14, (clientX - rect.left) / rect.width)),
      y: Math.min(0.82, Math.max(0.18, (clientY - rect.top) / rect.height)),
    });
  }, []);

  const handleSharePhotoChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    try {
      setShareBackgroundDataUrl(await fileToDataUrl(file));
      setShareBackgroundLabel(file.name || "Foto personalizada");
    } catch {
      setShareState("error");
      window.setTimeout(() => setShareState("idle"), 2200);
    } finally {
      event.currentTarget.value = "";
    }
  }, []);

  const resetSharePhoto = useCallback(() => {
    setShareBackgroundDataUrl(null);
    setShareBackgroundLabel("Fundo padrão");
    setShareOverlayPosition({ x: 0.5, y: 0.58 });
    setShareOverlayScale(0.92);
    setShareBrandLogoScale(1.22);
    setShareLayout("slim");
    setShareCardVariant("dark");
    setShareBackgroundFilter("dim");
    setShareShowMeta(true);
    setShareShowBrand(true);
  }, []);

  const shareCaption = useMemo(
    () =>
      `${ladoA} ${placarBase} ${ladoB}${sportLabel ? ` · ${sportLabel}` : ""}. Resultado registrado no EsporteID.`,
    [ladoA, ladoB, placarBase, sportLabel],
  );

  const handleShareResultado = useCallback(async () => {
    setShareState("sharing");
    try {
      const file = await createResultadoShareImage(sharePayload);
      if (window.eidNativeShareFile) {
        await window.eidNativeShareFile({
          url: await fileToDataUrl(file),
          fileName: file.name,
          mimeType: file.type,
          title: "Resultado EsporteID",
          text: shareCaption,
        });
        setShareState("done");
        return;
      }
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };
      const data: ShareData = {
        title: "Resultado EsporteID",
        text: shareCaption,
        files: [file],
      };
      if (nav.share && (!nav.canShare || nav.canShare(data))) {
        await nav.share(data);
        setShareState("done");
      } else {
        downloadResultadoFile(file);
        setShareState("saved");
      }
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        setShareState("idle");
        return;
      }
      setShareState("error");
    } finally {
      window.setTimeout(() => setShareState("idle"), 2200);
    }
  }, [shareCaption, sharePayload]);

  const handleSaveResultado = useCallback(async () => {
    setShareState("saving");
    try {
      const file = await createResultadoShareImage(sharePayload);
      if (window.eidNativeShareFile) {
        await window.eidNativeShareFile({
          url: await fileToDataUrl(file),
          fileName: file.name,
          mimeType: file.type,
          title: "Salvar resultado EsporteID",
          text: shareCaption,
        });
        setShareState("saved");
        return;
      }
      downloadResultadoFile(file);
      setShareState("saved");
    } catch {
      setShareState("error");
    } finally {
      window.setTimeout(() => setShareState("idle"), 2200);
    }
  }, [shareCaption, sharePayload]);

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
                    {hrefA ? (
                      <Link href={hrefA} data-no-modal="1" className="group flex min-w-0 flex-col items-center gap-2">
                        {ladoAAvatarUrl ? (
                          <img
                            src={ladoAAvatarUrl}
                            alt=""
                            className={`${avatarImgClass} transition group-hover:ring-2 group-hover:ring-eid-primary-500/35`}
                          />
                        ) : (
                          <span
                            className={`${avatarFallbackClass} transition group-hover:ring-2 group-hover:ring-eid-primary-500/35`}
                          >
                            {ladoA.trim().slice(0, 1).toUpperCase() || "A"}
                          </span>
                        )}
                        <span className="line-clamp-2 max-w-full text-[11px] font-bold leading-tight text-eid-fg group-hover:text-eid-primary-200 sm:text-xs">
                          {ladoA}
                        </span>
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-col items-center gap-2">
                        {ladoAAvatarUrl ? (
                          <img src={ladoAAvatarUrl} alt="" className={avatarImgClass} />
                        ) : (
                          <span className={avatarFallbackClass}>{ladoA.trim().slice(0, 1).toUpperCase() || "A"}</span>
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
                    {hrefB ? (
                      <Link href={hrefB} data-no-modal="1" className="group flex min-w-0 flex-col items-center gap-2">
                        {ladoBAvatarUrl ? (
                          <img
                            src={ladoBAvatarUrl}
                            alt=""
                            className={`${avatarImgClass} transition group-hover:ring-2 group-hover:ring-eid-primary-500/35`}
                          />
                        ) : (
                          <span
                            className={`${avatarFallbackClass} transition group-hover:ring-2 group-hover:ring-eid-primary-500/35`}
                          >
                            {ladoB.trim().slice(0, 1).toUpperCase() || "B"}
                          </span>
                        )}
                        <span className="line-clamp-2 max-w-full text-[11px] font-bold leading-tight text-eid-fg group-hover:text-eid-primary-200 sm:text-xs">
                          {ladoB}
                        </span>
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-col items-center gap-2">
                        {ladoBAvatarUrl ? (
                          <img src={ladoBAvatarUrl} alt="" className={avatarImgClass} />
                        ) : (
                          <span className={avatarFallbackClass}>{ladoB.trim().slice(0, 1).toUpperCase() || "B"}</span>
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
                      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] font-semibold leading-snug text-eid-fg sm:text-sm">
                        {local?.trim() ? (
                          <>
                            <LocalLogoThumb src={localLogoUrl} />
                            {localHref ? (
                              <Link
                                href={localHref}
                                data-no-modal="1"
                                className="min-w-0 truncate text-eid-primary-200 underline-offset-2 hover:underline"
                              >
                                {local}
                              </Link>
                            ) : (
                              <span className="min-w-0 truncate">{local}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-eid-text-secondary">Não informado</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {payload?.type === "gols" && payload.goals && goalsPayloadHasAny(payload.goals) ? (
                  <div className="relative mt-5 text-center">
                    <GoalsScoreboardSummary
                      variant="hero"
                      goals={payload.goals}
                      sportName={sportLabel ?? null}
                      className="shadow-[0_0_28px_-6px_rgba(0,0,0,0.35),0_6px_22px_-14px_rgba(15,23,42,0.25)]"
                    />
                  </div>
                ) : payload?.type === "pontos" && payload.points && sportLooksLikeBasquete(sportLabel) ? (
                  <div className="relative mt-5 overflow-hidden rounded-xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_32%,var(--eid-border-subtle)_68%)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-primary-500)_12%,var(--eid-surface)_88%)_0%,color-mix(in_srgb,var(--eid-card)_96%,transparent)_100%)] px-3 py-2.5 text-center shadow-[0_0_28px_-6px_color-mix(in_srgb,var(--eid-primary-500)_42%,transparent),0_6px_22px_-14px_rgba(37,99,235,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-4 sm:py-3">
                    <div
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_70%_at_50%_-30%,color-mix(in_srgb,var(--eid-primary-400)_38%,transparent),transparent_62%)] opacity-90 dark:opacity-100"
                      aria-hidden
                    />
                    <div className="pointer-events-none absolute -left-1/4 top-1/2 h-[140%] w-1/2 -translate-y-1/2 rotate-12 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.14)_50%,transparent_60%)] dark:bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.08)_50%,transparent_60%)]" aria-hidden />
                    <div className="relative z-[1]">
                      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-eid-primary-300">Placar final</p>
                      <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-xl font-black tabular-nums tracking-tight text-eid-fg sm:text-2xl">
                        <span className="text-[10px] font-black tracking-wide text-eid-primary-200 sm:text-xs">FINAL:</span>
                        <span className="max-w-[42%] truncate sm:max-w-none">{ladoA}</span>
                        <span>{pointsTotalsAccumulatedForDisplay(payload.points).a}</span>
                        <span className="select-none text-xs font-extrabold text-eid-text-secondary/75 sm:text-sm" aria-hidden>
                          ×
                        </span>
                        <span>{pointsTotalsAccumulatedForDisplay(payload.points).b}</span>
                        <span className="max-w-[42%] truncate sm:max-w-none">{ladoB}</span>
                      </p>
                    </div>
                  </div>
                ) : (
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
                )}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setSharePanelOpen((current) => !current)}
                    className="inline-flex min-h-[2.45rem] w-full items-center justify-center gap-2 rounded-xl border border-eid-action-500/38 bg-eid-action-500/14 px-3 py-2 text-[11px] font-black text-eid-action-100 shadow-[0_10px_24px_-20px_rgba(249,115,22,0.78)] transition hover:border-eid-action-400/55 hover:bg-eid-action-500/20 active:scale-[0.99]"
                    aria-expanded={sharePanelOpen}
                  >
                    <Share2 className="h-4 w-4" aria-hidden />
                    Compartilhar resultado
                  </button>
                  {sharePanelOpen ? (
                    <div className="mt-2 rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_18%,var(--eid-border-subtle)_82%)] bg-eid-surface/35 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <input
                    ref={shareFileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleSharePhotoChange}
                    aria-label="Escolher foto de fundo"
                  />
                  <div className="mb-2.5 grid gap-2 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div
                      ref={sharePreviewRef}
                      data-eid-result-share-preview
                      className="relative mx-auto aspect-[9/16] w-full max-w-[11rem] touch-none overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,var(--eid-border-subtle)_78%)] bg-[linear-gradient(155deg,var(--eid-brand-ink),color-mix(in_srgb,var(--eid-primary-500)_34%,var(--eid-surface)),var(--eid-brand-ink))] shadow-[0_12px_28px_-22px_rgba(0,0,0,0.8)]"
                      style={
                        shareBackgroundDataUrl
                          ? {
                              backgroundImage: `linear-gradient(rgba(0,0,0,${
                                shareBackgroundFilter === "normal" ? "0.12" : "0.34"
                              }),rgba(0,0,0,${shareBackgroundFilter === "normal" ? "0.12" : "0.34"})), url(${shareBackgroundDataUrl})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              filter: shareBackgroundFilter === "blur" ? "saturate(1.05)" : undefined,
                            }
                          : undefined
                      }
                      onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        updateShareOverlayFromPointer(event.clientX, event.clientY);
                      }}
                      onPointerMove={(event) => {
                        if (event.buttons !== 1) return;
                        updateShareOverlayFromPointer(event.clientX, event.clientY);
                      }}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,color-mix(in_srgb,var(--eid-primary-500)_40%,transparent),transparent_38%),radial-gradient(circle_at_18%_86%,color-mix(in_srgb,var(--eid-action-500)_30%,transparent),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_22%,rgba(0,0,0,0.18))]" />
                      <div
                        className={`absolute -translate-x-1/2 -translate-y-1/2 border text-center shadow-[0_18px_34px_-18px_rgba(0,0,0,0.95)] ${
                          shareLayout === "slim" ? "rounded-xl px-2 py-2" : "rounded-2xl px-3 py-2.5"
                        } ${
                          shareCardVariant === "light"
                            ? "border-white/60 bg-white/90 text-eid-brand-ink"
                            : shareCardVariant === "glass"
                              ? "border-white/30 bg-eid-brand-ink/60 text-eid-fg backdrop-blur-sm"
                              : "border-white/20 bg-[linear-gradient(155deg,rgba(11,29,46,0.92),rgba(12,42,78,0.86))] text-eid-fg"
                        }`}
                        style={{
                          left: `${shareOverlayPosition.x * 100}%`,
                          top: `${shareOverlayPosition.y * 100}%`,
                          width: `${(shareLayout === "slim" ? 70 : shareCardVariant === "compact" ? 64 : 78) * shareOverlayScale}%`,
                        }}
                      >
                        {shareShowBrand ? (
                          <span
                            className="relative mx-auto block h-4 w-[4.6rem]"
                            style={{
                              width: `${(shareLayout === "slim" ? 4 : 4.6) * shareBrandLogoScale}rem`,
                              height: `${(shareLayout === "slim" ? 0.86 : 1) * shareBrandLogoScale}rem`,
                            }}
                          >
                            <NextImage src={EID_LOGO_WORDMARK_SRC} alt="EsporteID" fill unoptimized className="object-contain" />
                          </span>
                        ) : null}
                        <p className={`${shareLayout === "slim" ? "mt-1 text-[6px]" : "mt-1.5 text-[7px]"} font-black uppercase tracking-[0.12em] text-eid-primary-200`}>
                          <span className="inline-flex items-center justify-center gap-1">
                            <SportGlyphIcon sportName={sportLabel} />
                            <span>{sportLabel ?? "Resultado oficial"}</span>
                          </span>
                        </p>
                        <div className={`${shareLayout === "slim" ? "mt-1" : "mt-1.5"} grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1`}>
                          <div className="min-w-0">
                            <span className={`relative mx-auto mb-1 block overflow-hidden rounded-full border border-white/25 bg-white/10 ${shareLayout === "slim" ? "h-5 w-5" : "h-7 w-7"}`}>
                              {ladoAAvatarUrl ? (
                                <NextImage src={ladoAAvatarUrl} alt="" fill unoptimized className="object-cover" />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-[9px] font-black text-eid-primary-100">
                                  {shareInitials(ladoA)}
                                </span>
                              )}
                            </span>
                            <p className={`${shareLayout === "slim" ? "text-[7px]" : "text-[9px]"} truncate font-black leading-tight text-eid-fg`}>{shareFirstName(ladoA)}</p>
                          </div>
                          <span className={`${shareLayout === "slim" ? "px-1 py-px text-[6px]" : "px-1.5 py-0.5 text-[7px]"} rounded-full border border-eid-primary-500/30 bg-eid-primary-500/12 font-black text-eid-primary-100`}>
                            VS
                          </span>
                          <div className="min-w-0">
                            <span className={`relative mx-auto mb-1 block overflow-hidden rounded-full border border-white/25 bg-white/10 ${shareLayout === "slim" ? "h-5 w-5" : "h-7 w-7"}`}>
                              {ladoBAvatarUrl ? (
                                <NextImage src={ladoBAvatarUrl} alt="" fill unoptimized className="object-cover" />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-[9px] font-black text-eid-primary-100">
                                  {shareInitials(ladoB)}
                                </span>
                              )}
                            </span>
                            <p className={`${shareLayout === "slim" ? "text-[7px]" : "text-[9px]"} truncate font-black leading-tight text-eid-fg`}>{shareFirstName(ladoB)}</p>
                          </div>
                        </div>
                        {shareIsSets ? (
                          <div className={`${shareLayout === "slim" ? "mt-1.5 rounded-md" : "mt-2 rounded-lg"} overflow-hidden border border-white/14 bg-white/10 text-eid-fg`}>
                            <div className={`${shareLayout === "slim" ? "text-[5px]" : "text-[6px]"} grid bg-eid-primary-500/15 font-black uppercase text-eid-primary-100`} style={{ gridTemplateColumns: `${shareLayout === "slim" ? "2.35rem" : "2.8rem"} repeat(${Math.max(1, shareSetRows.length)}, minmax(0,1fr))` }}>
                              <span />
                              {shareSetRows.map((_, idx) => <span key={`set-head-${idx}`} className="py-0.5">S{idx + 1}</span>)}
                            </div>
                            {[ladoA, ladoB].map((name, rowIdx) => (
                              <div key={name} className={`${shareLayout === "slim" ? "text-[7px]" : "text-[8px]"} grid border-t border-white/10 font-black`} style={{ gridTemplateColumns: `${shareLayout === "slim" ? "2.35rem" : "2.8rem"} repeat(${Math.max(1, shareSetRows.length)}, minmax(0,1fr))` }}>
                                <span className="truncate px-1 py-1 text-left">{shareFirstName(name)}</span>
                                {shareSetRows.map((set, idx) => (
                                  <span key={`${name}-${idx}`} className={`${shareLayout === "slim" ? "py-0.5" : "py-1"} tabular-nums`}>
                                    {rowIdx === 0 ? set.a : set.b}
                                    {set.hasTiebreak ? <sup className="ml-px text-[0.55em] text-eid-primary-100">{rowIdx === 0 ? set.tiebreakA : set.tiebreakB}</sup> : null}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        ) : shareIsGoals ? (
                          <div className={`${shareLayout === "slim" ? "mt-1.5 rounded-lg py-1" : "mt-2 rounded-xl py-1.5"} border border-white/15 bg-emerald-950/70 px-2 text-eid-fg`}>
                            <p className="text-[6px] font-black uppercase tracking-[0.12em] text-white/70">Placar final</p>
                            <p className={`mt-0.5 ${shareLayout === "slim" ? "text-[15px]" : "text-[18px]"} font-black leading-none tabular-nums`}>{shareScore.headline}</p>
                            {shareScore.lines[0] ? <p className="mt-1 text-[7px] font-black uppercase text-eid-action-300">{shareScore.lines[0]}</p> : null}
                          </div>
                        ) : (
                          <p className={`${shareLayout === "slim" ? "mt-1.5 rounded-lg py-1 text-[15px]" : "mt-2 rounded-xl py-1.5 text-[18px]"} border border-eid-action-500/45 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-action-500)_24%,transparent),color-mix(in_srgb,var(--eid-primary-500)_14%,transparent))] px-2 font-black leading-none tabular-nums text-eid-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]`}>
                            {shareScore.headline}
                          </p>
                        )}
                        {shareScore.extra && shareCardVariant !== "compact" ? (
                          <p className="mt-1 text-[7px] font-bold leading-tight text-eid-text-secondary">{shareScore.extra}</p>
                        ) : null}
                        {shareShowMeta ? (
                          <p className="mt-1 line-clamp-2 text-[7px] font-bold leading-tight text-eid-text-secondary">{shareMetaLine(sharePayload)}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col justify-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-primary-300">Arte para Stories</p>
                      <p className="truncate text-[11px] font-semibold text-eid-text-secondary">{shareBackgroundLabel}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => shareFileInputRef.current?.click()}
                          className={`inline-flex min-h-[2.45rem] items-center justify-center gap-1.5 rounded-xl border px-2 text-[10px] font-black transition ${
                            shareBackgroundDataUrl
                              ? "border-eid-primary-500/45 bg-eid-primary-500/16 text-eid-primary-100"
                              : "border-eid-primary-500/28 bg-eid-primary-500/8 text-eid-primary-200 hover:bg-eid-primary-500/14"
                          }`}
                        >
                          <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                          Foto
                        </button>
                        <button
                          type="button"
                          onClick={resetSharePhoto}
                          aria-pressed={!shareBackgroundDataUrl}
                          className={`inline-flex min-h-[2.45rem] items-center justify-center gap-1.5 rounded-xl border px-2 text-[10px] font-black transition ${
                            !shareBackgroundDataUrl
                              ? "border-eid-action-500/45 bg-eid-action-500/16 text-eid-action-100"
                              : "border-[color:var(--eid-border-subtle)] bg-eid-surface/70 text-eid-text-secondary hover:text-eid-fg"
                          }`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                          Padrão
                        </button>
                      </div>
                      <p className="text-[10px] leading-snug text-eid-text-secondary">
                        Arraste o cartão na prévia para posicionar o resultado sobre a foto.
                      </p>
                    </div>
                  </div>
                  <div className="mb-2.5 space-y-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/45 p-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        ["slim", "Slim"],
                        ["complete", "Completo"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setShareLayout(value as ResultadoSharePayload["shareLayout"]);
                            setShareOverlayScale(value === "slim" ? 0.92 : 1);
                          }}
                          className={`min-h-[2.15rem] rounded-lg border px-2 text-[10px] font-black transition ${
                            shareLayout === value
                              ? "border-eid-action-500/45 bg-eid-action-500/16 text-eid-action-100"
                              : "border-[color:var(--eid-border-subtle)] bg-eid-surface/70 text-eid-text-secondary"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-eid-text-secondary">
                      Tamanho
                      <input
                        type="range"
                        min="0.74"
                        max="1.18"
                        step="0.02"
                        value={shareOverlayScale}
                        onChange={(event) => setShareOverlayScale(Number(event.currentTarget.value))}
                        className="mt-1 block w-full accent-[color:var(--eid-action-500)]"
                      />
                    </label>
                    <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-eid-text-secondary">
                      Tamanho da logo
                      <input
                        type="range"
                        min="0.75"
                        max="1.7"
                        step="0.05"
                        value={shareBrandLogoScale}
                        onChange={(event) => setShareBrandLogoScale(Number(event.currentTarget.value))}
                        className="mt-1 block w-full accent-[color:var(--eid-primary-500)]"
                      />
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        ["Topo", 0.5, 0.28],
                        ["Centro", 0.5, 0.5],
                        ["Baixo", 0.5, 0.72],
                      ].map(([label, x, y]) => (
                        <button
                          key={String(label)}
                          type="button"
                          onClick={() => setShareOverlayPosition({ x: Number(x), y: Number(y) })}
                          className="min-h-[2.15rem] rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-2 text-[10px] font-black text-eid-text-secondary transition hover:text-eid-fg"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        ["dark", "Escuro"],
                        ["light", "Claro"],
                        ["glass", "Vidro"],
                        ["compact", "Mini"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setShareCardVariant(value as ResultadoSharePayload["cardVariant"])}
                          className={`min-h-[2.15rem] rounded-lg border px-1.5 text-[9px] font-black transition ${
                            shareCardVariant === value
                              ? "border-eid-primary-500/45 bg-eid-primary-500/16 text-eid-primary-100"
                              : "border-[color:var(--eid-border-subtle)] bg-eid-surface/70 text-eid-text-secondary"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        ["normal", "Natural"],
                        ["dim", "Escuro"],
                        ["blur", "Blur"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setShareBackgroundFilter(value as ResultadoSharePayload["backgroundFilter"])}
                          className={`min-h-[2.15rem] rounded-lg border px-1.5 text-[9px] font-black transition ${
                            shareBackgroundFilter === value
                              ? "border-eid-action-500/45 bg-eid-action-500/16 text-eid-action-100"
                              : "border-[color:var(--eid-border-subtle)] bg-eid-surface/70 text-eid-text-secondary"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <label className="flex min-h-[2.25rem] items-center justify-between rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-2 text-[10px] font-black text-eid-text-secondary">
                        Data/local
                        <input type="checkbox" checked={shareShowMeta} onChange={(event) => setShareShowMeta(event.currentTarget.checked)} />
                      </label>
                      <label className="flex min-h-[2.25rem] items-center justify-between rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-2 text-[10px] font-black text-eid-text-secondary">
                        Marca
                        <input type="checkbox" checked={shareShowBrand} onChange={(event) => setShareShowBrand(event.currentTarget.checked)} />
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleShareResultado}
                      disabled={shareState === "sharing" || shareState === "saving"}
                      className={`${RESULT_SHARE_BUTTON} border-eid-primary-500/38 bg-eid-primary-500/14 text-eid-primary-100 hover:border-eid-primary-400/55 hover:bg-eid-primary-500/20`}
                    >
                      {shareState === "sharing" ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Share2 className="h-4 w-4" aria-hidden />
                      )}
                      {shareState === "sharing"
                        ? "Gerando imagem"
                        : shareState === "done"
                          ? "Compartilhado"
                          : "Compartilhar resultado"}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveResultado}
                      disabled={shareState === "sharing" || shareState === "saving"}
                      className={`${RESULT_SHARE_BUTTON} border-eid-action-500/38 bg-eid-action-500/14 text-eid-action-100 hover:border-eid-action-400/55 hover:bg-eid-action-500/20`}
                    >
                      {shareState === "saving" ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Download className="h-4 w-4" aria-hidden />
                      )}
                      {shareState === "saving" ? "Salvando" : shareState === "saved" ? "Imagem salva" : "Salvar imagem"}
                    </button>
                  </div>
                  {shareState === "error" ? (
                    <p className="mt-2 text-center text-[10px] font-semibold text-rose-300">
                      Não foi possível gerar a imagem agora.
                    </p>
                  ) : (
                    <p className="mt-2 text-center text-[10px] leading-snug text-eid-text-secondary">
                      No celular, escolha Instagram, Stories ou outro app na tela de compartilhamento.
                    </p>
                  )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {payload?.type === "sets" && Array.isArray(payload.sets) && payload.sets.length > 0 ? (
              <SetsScoreboardTable
                sets={
                  swapSets
                    ? payload.sets.map((s) => ({ a: s.b, b: s.a, tiebreakA: s.tiebreakB, tiebreakB: s.tiebreakA }))
                    : payload.sets
                }
                ladoA={ladoA}
                ladoB={ladoB}
                ladoAAvatarUrl={ladoAAvatarUrl}
                ladoBAvatarUrl={ladoBAvatarUrl}
                ladoAProfileHref={hrefA}
                ladoBProfileHref={hrefB}
              />
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
                  {sportLooksLikeBasquete(sportLabel) ? (
                    <p className="text-sm font-bold text-eid-fg">
                      <span className="text-[11px] font-black tracking-wide text-eid-text-secondary">FINAL: </span>
                      <span className="font-black tabular-nums">{ladoA}</span>{" "}
                      <span className="font-black tabular-nums text-eid-fg">
                        {pointsTotalsAccumulatedForDisplay(payload.points).a}
                      </span>
                      <span className="mx-1.5 text-eid-text-secondary">×</span>
                      <span className="font-black tabular-nums text-eid-fg">
                        {pointsTotalsAccumulatedForDisplay(payload.points).b}
                      </span>{" "}
                      <span className="font-black tabular-nums">{ladoB}</span>
                    </p>
                  ) : (
                    <>
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
                    </>
                  )}
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
                          <HistoricoPlacarDisplay item={item} sportFallback={sportLabel ?? null} />
                        </div>
                        <p className="mt-1.5 flex min-w-0 items-center justify-center gap-1.5 text-center text-[9px] leading-snug text-eid-text-secondary">
                          {item.local?.trim() ? (
                            <>
                              <LocalLogoThumb src={item.localLogoUrl} />
                              {item.localHref ? (
                                <Link
                                  href={item.localHref}
                                  data-no-modal="1"
                                  className="min-w-0 truncate font-medium text-eid-primary-400 underline-offset-2 hover:underline dark:text-eid-primary-300"
                                >
                                  {item.local}
                                </Link>
                              ) : (
                                <span className="min-w-0 truncate">{item.local}</span>
                              )}
                            </>
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
          data-eid-confronto-row
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
          data-eid-confronto-row
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
