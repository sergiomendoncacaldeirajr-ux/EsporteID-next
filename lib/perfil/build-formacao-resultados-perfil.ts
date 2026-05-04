import type { FormacaoResultadoItem } from "@/components/perfil/profile-formacao-resultados";
import {
  fmtDataPtBr,
  resultadoColetivo,
  type OponenteTimeDetalhe,
  type PartidaColetivaRow,
} from "@/lib/perfil/formacao-eid-stats";

function modalidadeExibicao(raw: string | null | undefined, fallback: string): string {
  const m = String(raw ?? "").trim();
  if (m) return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
  return fallback;
}

export type FormacaoResultadosBundle = {
  items: FormacaoResultadoItem[];
  totais: { vitorias: number; derrotas: number; empates: number; rank: number; torneio: number };
};

export function buildFormacaoResultadosPerfil(
  partidas: PartidaColetivaRow[],
  timeId: number,
  oponenteDetalhes: Map<number, OponenteTimeDetalhe>,
  torneioNome: Map<number, string>,
  formacaoTipoFallback = "Equipe"
): FormacaoResultadosBundle {
  const totais = { vitorias: 0, derrotas: 0, empates: 0, rank: 0, torneio: 0 };
  const items: FormacaoResultadoItem[] = [];

  for (const p of partidas) {
    const res = resultadoColetivo(timeId, p);
    const t1 = p.time1_id != null ? Number(p.time1_id) : null;
    const t2 = p.time2_id != null ? Number(p.time2_id) : null;
    const oppId = t1 === timeId ? t2 : t1;
    const det = oppId != null ? oponenteDetalhes.get(oppId) : undefined;
    const adversarioLabel = det?.nome ?? (oppId != null ? `Equipe #${oppId}` : "—");

    const s1 = Number(p.placar_1 ?? 0);
    const s2 = Number(p.placar_2 ?? 0);
    if (s1 === s2) totais.empates += 1;
    else if (res.label === "V") totais.vitorias += 1;
    else if (res.label === "D") totais.derrotas += 1;

    const torId = p.torneio_id != null ? Number(p.torneio_id) : null;
    if (torId) totais.torneio += 1;
    else totais.rank += 1;

    const dataIso = p.data_resultado ?? p.data_registro;
    const dataHoraIso = p.data_partida ?? p.data_resultado ?? p.data_registro;
    const torneioLabel = torId ? torneioNome.get(torId) ?? null : null;

    items.push({
      id: String(p.id),
      resultado: res.label,
      origem: torId ? "Torneio" : "Rank",
      placar: `${s1}x${s2}`,
      dataFmt: dataIso ? fmtDataPtBr(dataIso) : "—",
      dataHora: dataHoraIso
        ? new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(dataHoraIso))
        : "—",
      tone: res.label === "V" ? "positive" : res.label === "D" ? "negative" : "neutral",
      adversarioLabel,
      torneioLabel,
      local: String(p.local_str ?? "").trim() || null,
      localHref: p.local_espaco_id != null && Number(p.local_espaco_id) > 0 ? `/local/${Number(p.local_espaco_id)}` : null,
      mensagem: p.mensagem ?? null,
      partida: p,
      opponentTimeId: oppId ?? undefined,
      opponentEscudoUrl: det?.escudo ?? null,
      opponentNotaEid: det != null && Number.isFinite(det.eid_time) ? det.eid_time : null,
      modalidadeLinha: modalidadeExibicao(p.modalidade, formacaoTipoFallback),
    });
  }

  return { items, totais };
}
