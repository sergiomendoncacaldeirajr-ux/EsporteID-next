import type { TimesVagaCardData } from "@/components/times/times-vaga-recrutamento-card";

/** Limite de formações carregadas para a lista (sem paginação por URL). */
export const RECRUTAMENTO_VAGAS_FETCH_LIMIT = 300;

export type TimeListRow = {
  id: number;
  nome: string | null;
  localizacao: string | null;
  vagas_abertas: boolean | null;
  aceita_pedidos: boolean | null;
  eid_time: number | null;
  nivel_procurado: string | null;
  escudo: string | null;
  tipo: string | null;
  criador_id: string;
  esportes: { nome: string | null } | { nome: string | null }[] | null;
};

export type RosterHeadcountBatchRow = {
  time_id: number;
  headcount: number;
};

export type MinhasTimeShellRow = {
  id: number;
  nome: string | null;
  tipo: string | null;
  esportes: { nome: string | null } | { nome: string | null }[] | null;
};

export function esporteNomeFromRow(row: TimeListRow): string | null {
  const esp = row.esportes;
  if (Array.isArray(esp)) return esp[0]?.nome ?? null;
  if (esp && typeof esp === "object" && "nome" in esp) return esp.nome ?? null;
  return null;
}

export function rowToCardData(row: TimeListRow): TimesVagaCardData {
  return {
    id: row.id,
    nome: row.nome,
    localizacao: row.localizacao,
    escudo: row.escudo,
    eid_time: row.eid_time,
    nivel_procurado: row.nivel_procurado,
    tipo: row.tipo,
    esporteNome: esporteNomeFromRow(row),
    vagas_abertas: Boolean(row.vagas_abertas),
    aceita_pedidos: Boolean(row.aceita_pedidos),
    vagas_disponiveis: null,
    criador_id: row.criador_id,
  };
}

/** Caminho com a mesma busca para `from` nos fluxos em tela cheia (`embed=1`). */
export function timesEmbedReturnHref(sp: { q?: string; create?: string; convidar?: string }) {
  const p = new URLSearchParams();
  const qv = (sp.q ?? "").trim();
  if (qv) p.set("q", qv);
  if (sp.create === "1") p.set("create", "1");
  const conv = String(sp.convidar ?? "").trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conv)) p.set("convidar", conv);
  const s = p.toString();
  return s ? `/times?${s}` : "/times";
}
