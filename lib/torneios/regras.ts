import { labelCriterio, labelFormato, labelModalidade } from "@/lib/torneios/catalog";

export type RegrasPlacarParsed = {
  modalidade_participacao?: string;
  melhor_de?: number;
  vagas_max?: number;
  observacoes?: string;
};

export function parseRegrasPlacarJson(raw: string | null | undefined): RegrasPlacarParsed | null {
  if (!raw || !String(raw).trim()) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: RegrasPlacarParsed = {};
    if (typeof o.modalidade_participacao === "string") out.modalidade_participacao = o.modalidade_participacao;
    if (typeof o.melhor_de === "number" && Number.isFinite(o.melhor_de)) out.melhor_de = o.melhor_de;
    if (typeof o.vagas_max === "number" && Number.isFinite(o.vagas_max)) out.vagas_max = o.vagas_max;
    if (typeof o.observacoes === "string") out.observacoes = o.observacoes;
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

export function formatMelhorDe(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n <= 1) return "Partida única";
  return `Melhor de ${n}`;
}

export function linhasResumoRegras(
  formatoCompeticao: string | null | undefined,
  criterioDesempate: string | null | undefined,
  parsed: RegrasPlacarParsed | null
): { titulo: string; valor: string }[] {
  const linhas: { titulo: string; valor: string }[] = [
    { titulo: "Formato", valor: labelFormato(formatoCompeticao) },
    { titulo: "Critério de desempate", valor: labelCriterio(criterioDesempate) },
  ];
  if (parsed?.modalidade_participacao) {
    linhas.push({ titulo: "Modalidade de participação", valor: labelModalidade(parsed.modalidade_participacao) });
  }
  if (parsed?.melhor_de != null) {
    linhas.push({ titulo: "Partidas", valor: formatMelhorDe(parsed.melhor_de) });
  }
  if (parsed?.vagas_max != null && parsed.vagas_max > 0) {
    linhas.push({ titulo: "Vagas", valor: String(parsed.vagas_max) });
  }
  if (parsed?.observacoes?.trim()) {
    linhas.push({ titulo: "Observações", valor: parsed.observacoes.trim() });
  }
  return linhas;
}
