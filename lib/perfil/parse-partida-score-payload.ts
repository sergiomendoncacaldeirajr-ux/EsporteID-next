import type { MatchScorePayload } from "@/lib/match-scoring";

/** Extrai o JSON salvo em `partidas.mensagem` após `score_payload:` (ver registrar-placar). */
export function parseScorePayloadFromPartidaMensagem(message: string | null | undefined): MatchScorePayload | null {
  const raw = String(message ?? "").trim();
  if (!raw) return null;
  const marker = "score_payload:";
  const idx = raw.indexOf(marker);
  if (idx < 0) return null;
  const jsonRaw = raw.slice(idx + marker.length).trim();
  if (!jsonRaw) return null;
  try {
    const parsed = JSON.parse(jsonRaw) as MatchScorePayload;
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
