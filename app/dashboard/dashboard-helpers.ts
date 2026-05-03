export type ProfileMini = {
  id?: string;
  nome?: string | null;
  avatar_url?: string | null;
  localizacao?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
  disponivel_amistoso?: boolean | null;
  disponivel_amistoso_ate?: string | null;
  match_maioridade_confirmada?: boolean | null;
};

export type AtletaRow = {
  nota_eid?: number | null;
  usuario_id?: string;
  profiles?: ProfileMini | ProfileMini[] | null;
};

export type PartidaResumo = {
  id: number;
  data_partida: string | null;
  data_registro: string | null;
  torneio_id?: number | null;
  esportes?: { nome?: string | null } | Array<{ nome?: string | null }> | null;
};

/** Linhas retornadas pelas queries de torneios / locais no painel (fallback `[]` tipado). */
export type DashboardTorneioListRow = {
  id: number;
  nome: string | null;
  status: string | null;
  data_inicio: string | null;
  banner: string | null;
  esporte_id: number | null;
  lat: string | number | null;
  lng: string | number | null;
};

export type DashboardEspacoListRow = {
  id: number;
  slug: string | null;
  nome_publico: string | null;
  logo_arquivo: string | null;
  localizacao: string | null;
  lat: string | number | null;
  lng: string | number | null;
  esportes_ids: unknown;
  aceita_socios: boolean | null;
  modo_monetizacao: string | null;
  modo_reserva: string | null;
};

export function primeiroNome(nome?: string | null) {
  const n = (nome ?? "").trim();
  return n ? n.split(/\s+/u)[0] : "Atleta";
}

export function iniciais(nome?: string | null) {
  const n = (nome ?? "").trim();
  if (!n) return "E";
  return n
    .split(/\s+/u)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function firstProfile(p: AtletaRow["profiles"]): ProfileMini | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

export function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export function parseNumericList(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function whenLabel(iso: string | null) {
  if (!iso) return "em breve";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "em breve";
  const now = new Date();
  const amanha = new Date(now);
  amanha.setDate(amanha.getDate() + 1);
  const hora = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (isSameDay(dt, now)) return `hoje às ${hora}`;
  if (isSameDay(dt, amanha)) return `amanhã às ${hora}`;
  const data = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${data} às ${hora}`;
}

function rosterCapForTipo(tipo: string | null | undefined): number {
  return String(tipo ?? "").trim().toLowerCase() === "dupla" ? 2 : 18;
}

export function vagasAbertasLabel(tipo: string | null | undefined, rosterCount: number | null | undefined): string {
  const cap = rosterCapForTipo(tipo);
  const ocupacao = Number.isFinite(Number(rosterCount)) ? Math.max(0, Number(rosterCount)) : 0;
  const vagas = Math.max(0, cap - ocupacao);
  return vagas === 1 ? "1 vaga" : `${vagas} vagas`;
}
