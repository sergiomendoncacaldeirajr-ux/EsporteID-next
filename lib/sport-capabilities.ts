export type SportCapability = {
  match: boolean;
  ranking: boolean;
  torneio: boolean;
  professor: boolean;
  treino: boolean;
};

const DEFAULT_CAPABILITY: SportCapability = {
  match: true,
  ranking: true,
  torneio: true,
  professor: true,
  treino: false,
};

function normalizeSportName(input: string | null | undefined): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const SPORT_CAPABILITY_BY_NAME: Record<string, SportCapability> = {
  "musculacao": { match: false, ranking: false, torneio: false, professor: true, treino: true },
  "jiu-jitsu": { match: false, ranking: false, torneio: false, professor: true, treino: false },
  corrida: { match: false, ranking: false, torneio: true, professor: true, treino: false },
  ciclismo: { match: false, ranking: false, torneio: false, professor: true, treino: false },
  yoga: { match: false, ranking: false, torneio: false, professor: true, treino: true },
  surf: { match: false, ranking: false, torneio: false, professor: true, treino: false },
  skate: { match: false, ranking: false, torneio: false, professor: true, treino: false },
  pilates: { match: false, ranking: false, torneio: false, professor: true, treino: true },
  natacao: { match: false, ranking: false, torneio: false, professor: true, treino: true },
};

export function getSportCapabilityByName(sportName: string | null | undefined): SportCapability {
  const key = normalizeSportName(sportName);
  return SPORT_CAPABILITY_BY_NAME[key] ?? DEFAULT_CAPABILITY;
}

export function isSportMatchEnabled(sportName: string | null | undefined): boolean {
  return getSportCapabilityByName(sportName).match;
}

export function isSportRankingEnabled(sportName: string | null | undefined): boolean {
  return getSportCapabilityByName(sportName).ranking;
}

export function isMusculacaoSportName(sportName: string | null | undefined): boolean {
  return normalizeSportName(sportName) === "musculacao";
}
