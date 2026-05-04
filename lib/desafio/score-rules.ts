export type ScoreRuleVariant = {
  key: string;
  label: string;
  minPlacar: number;
  maxPlacar: number;
  permitirEmpate: boolean;
  permitirWO: boolean;
  /** Campos opcionais consumidos por `buildSetFormatOptions` (ex.: vôlei melhor de 3). */
  sets_to_win?: number;
  games_per_set?: number;
  tiebreak?: boolean;
  tiebreak_points?: number;
  final_set_super_tiebreak?: boolean;
  final_set_target_points?: number;
  win_by_two?: boolean;
  points_limit?: number | null;
};

export type ScoreRulesConfig = {
  minPlacar?: number;
  maxPlacar?: number;
  permitirEmpate?: boolean;
  permitirWO?: boolean;
  variantes?: ScoreRuleVariant[];
};

type SportPreset = { modo: "simples" | "sets" | "games" | "pontos_corridos"; regras: ScoreRulesConfig };

const PRESETS: Record<string, SportPreset> = {
  tenis: {
    modo: "games",
    regras: {
      minPlacar: 0,
      maxPlacar: 7,
      permitirEmpate: false,
      permitirWO: true,
      variantes: [
        { key: "padrao_games", label: "Padrão por games (até 7)", minPlacar: 0, maxPlacar: 7, permitirEmpate: false, permitirWO: true },
        { key: "set_unico_8_games", label: "Set único de 8 games", minPlacar: 0, maxPlacar: 8, permitirEmpate: false, permitirWO: true },
      ],
    },
  },
  beach_tenis: {
    modo: "games",
    regras: {
      minPlacar: 0,
      maxPlacar: 7,
      permitirEmpate: false,
      permitirWO: true,
      variantes: [
        { key: "padrao_games", label: "Padrão por games (até 7)", minPlacar: 0, maxPlacar: 7, permitirEmpate: false, permitirWO: true },
        { key: "set_unico_8_games", label: "Set único de 8 games", minPlacar: 0, maxPlacar: 8, permitirEmpate: false, permitirWO: true },
      ],
    },
  },
  padel: {
    modo: "games",
    regras: {
      minPlacar: 0,
      maxPlacar: 7,
      permitirEmpate: false,
      permitirWO: true,
      variantes: [
        { key: "padrao_games", label: "Padrão por games (até 7)", minPlacar: 0, maxPlacar: 7, permitirEmpate: false, permitirWO: true },
        { key: "set_unico_8_games", label: "Set único de 8 games", minPlacar: 0, maxPlacar: 8, permitirEmpate: false, permitirWO: true },
      ],
    },
  },
  pickleball: {
    modo: "sets",
    regras: {
      minPlacar: 0,
      maxPlacar: 2,
      permitirEmpate: false,
      permitirWO: true,
      variantes: [
        { key: "bo3_set11", label: "Melhor de 3 sets (set até 11, vence por 2)", minPlacar: 0, maxPlacar: 2, permitirEmpate: false, permitirWO: true },
      ],
    },
  },
  tenis_de_mesa: {
    modo: "pontos_corridos",
    regras: {
      minPlacar: 0,
      maxPlacar: 21,
      permitirEmpate: false,
      permitirWO: true,
      variantes: [
        { key: "set_11", label: "Set até 11", minPlacar: 0, maxPlacar: 11, permitirEmpate: false, permitirWO: true },
        { key: "set_21", label: "Set até 21", minPlacar: 0, maxPlacar: 21, permitirEmpate: false, permitirWO: true },
      ],
    },
  },
  badminton: {
    modo: "pontos_corridos",
    regras: {
      minPlacar: 0,
      maxPlacar: 21,
      permitirEmpate: false,
      permitirWO: true,
      variantes: [
        { key: "set_21", label: "Set até 21", minPlacar: 0, maxPlacar: 21, permitirEmpate: false, permitirWO: true },
        { key: "set_15", label: "Set alternativo até 15", minPlacar: 0, maxPlacar: 15, permitirEmpate: false, permitirWO: true },
      ],
    },
  },
  volei: {
    modo: "sets",
    regras: {
      minPlacar: 0,
      maxPlacar: 2,
      permitirEmpate: false,
      permitirWO: true,
      variantes: [
        {
          key: "bo3_rally_21_15",
          label: "Melhor de 3 sets (21/21/15, vantagem de 2)",
          minPlacar: 0,
          maxPlacar: 2,
          permitirEmpate: false,
          permitirWO: true,
          sets_to_win: 2,
          games_per_set: 21,
          tiebreak: false,
          tiebreak_points: 7,
          final_set_super_tiebreak: true,
          final_set_target_points: 15,
          win_by_two: true,
        },
      ],
    },
  },
  futevolei: {
    modo: "pontos_corridos",
    regras: {
      minPlacar: 0,
      maxPlacar: 21,
      permitirEmpate: false,
      permitirWO: true,
      variantes: [
        { key: "set_21", label: "Set até 21", minPlacar: 0, maxPlacar: 21, permitirEmpate: false, permitirWO: true },
        { key: "set_18", label: "Set alternativo até 18", minPlacar: 0, maxPlacar: 18, permitirEmpate: false, permitirWO: true },
      ],
    },
  },
  futebol: {
    modo: "simples",
    regras: {
      minPlacar: 0,
      maxPlacar: 30,
      permitirEmpate: true,
      permitirWO: true,
      variantes: [
        { key: "tempo_normal", label: "Tempo normal", minPlacar: 0, maxPlacar: 30, permitirEmpate: true, permitirWO: true },
        { key: "mata_mata", label: "Mata-mata (sem empate)", minPlacar: 0, maxPlacar: 30, permitirEmpate: false, permitirWO: true },
      ],
    },
  },
  futsal: {
    modo: "simples",
    regras: {
      minPlacar: 0,
      maxPlacar: 30,
      permitirEmpate: true,
      permitirWO: true,
      variantes: [
        { key: "tempo_normal", label: "Tempo normal", minPlacar: 0, maxPlacar: 30, permitirEmpate: true, permitirWO: true },
        { key: "mata_mata", label: "Mata-mata (sem empate)", minPlacar: 0, maxPlacar: 30, permitirEmpate: false, permitirWO: true },
      ],
    },
  },
};

export function normalizeSportKey(input: string): string {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getPresetForSport(nome: string, slug?: string | null): SportPreset | null {
  const keys = [normalizeSportKey(slug ?? ""), normalizeSportKey(nome)];
  for (const key of keys) {
    if (key && PRESETS[key]) return PRESETS[key];
  }
  return null;
}

export function resolveVariantFromRules(rules: ScoreRulesConfig, variantKey: string | null | undefined): ScoreRuleVariant | null {
  const variants = Array.isArray(rules.variantes) ? rules.variantes : [];
  if (!variants.length) return null;
  const key = String(variantKey ?? "").trim();
  if (!key) return variants[0] ?? null;
  return variants.find((v) => v.key === key) ?? variants[0] ?? null;
}
