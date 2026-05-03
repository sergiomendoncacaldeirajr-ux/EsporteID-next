export type ScoringType = "sets" | "gols" | "pontos" | "rounds";

export type MatchUIConfig = {
  type: ScoringType;
  sets: number;
  setsToWin: number;
  gamesPerSet: number;
  tiebreakPoints: number;
  tiebreak: boolean;
  finalSetSuperTiebreak: boolean;
  finalSetTargetPoints: number;
  winByTwo: boolean;
  pointsLimit: number | null;
  hasOvertime: boolean;
  hasPenalties: boolean;
  maxRounds: number;
};

export type SetFormatOption = {
  key: string;
  name: string;
  config: MatchUIConfig;
};

type BaseMatchCtx = {
  sport?: { name?: string | null; scoring_type?: string | null } | null;
  format?: {
    sets_to_win?: number | null;
    games_per_set?: number | null;
    tiebreak?: boolean | null;
    tiebreak_points?: number | null;
    final_set_super_tiebreak?: boolean | null;
    final_set_target_points?: number | null;
    points_limit?: number | null;
    win_by_two?: boolean | null;
    has_overtime?: boolean | null;
    has_penalties?: boolean | null;
    max_rounds?: number | null;
  } | null;
};

type SetPayload = { a: number; b: number; tiebreakA?: number; tiebreakB?: number };
type RoundsPayload = { a?: number; b?: number; winner?: "a" | "b" | null };

/** Fragmento de placar por gols (regulação, prorrogação, pênaltis). Campos opcionais para JSON parseado na UI. */
export type GoalsScoreFields = {
  a?: number;
  b?: number;
  overtimeA?: number;
  overtimeB?: number;
  penaltiesA?: number;
  penaltiesB?: number;
};

export type MatchScorePayload = {
  type: ScoringType;
  goals?: GoalsScoreFields;
  points?: { a: number; b: number; overtimeA?: number; overtimeB?: number };
  sets?: SetPayload[];
  rounds?: { method: "decision" | "ko" | "tko" | "submission"; winner: "a" | "b"; items: RoundsPayload[] };
};

function toInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function toBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return fallback;
}

function getSportDefaultsByName(sportName?: string | null): Partial<MatchUIConfig> | null {
  const name = normalizeName(String(sportName ?? ""));
  if (!name) return null;

  // Pedido explícito do usuário: não mexer nas regras de tênis/beach/padel já definidas.
  if (
    name.includes("tenis") ||
    name.includes("tennis") ||
    name.includes("padel") ||
    name.includes("beach tennis") ||
    name.includes("beach tenis") ||
    (name.includes("beach") && (name.includes("tenis") || name.includes("tennis")))
  ) {
    return null;
  }

  if (name.includes("volei")) {
    return {
      type: "sets",
      setsToWin: 3,
      sets: 5,
      gamesPerSet: 25,
      tiebreak: false,
      tiebreakPoints: 7,
      finalSetSuperTiebreak: true,
      finalSetTargetPoints: 15,
      winByTwo: true,
    };
  }
  if (name.includes("futevolei")) {
    return {
      type: "sets",
      setsToWin: 2,
      sets: 3,
      gamesPerSet: 15,
      tiebreak: false,
      tiebreakPoints: 7,
      finalSetSuperTiebreak: false,
      finalSetTargetPoints: 10,
      winByTwo: true,
    };
  }
  if (name.includes("tenis de mesa")) {
    return {
      type: "sets",
      setsToWin: 3,
      sets: 5,
      gamesPerSet: 11,
      tiebreak: false,
      tiebreakPoints: 7,
      finalSetSuperTiebreak: false,
      finalSetTargetPoints: 10,
      winByTwo: true,
    };
  }
  if (name.includes("badminton")) {
    return {
      type: "sets",
      setsToWin: 2,
      sets: 3,
      gamesPerSet: 21,
      tiebreak: false,
      tiebreakPoints: 7,
      finalSetSuperTiebreak: false,
      finalSetTargetPoints: 10,
      winByTwo: true,
      pointsLimit: 30,
    };
  }
  if (name.includes("basquete")) {
    return {
      type: "pontos",
      hasOvertime: true,
      hasPenalties: false,
      pointsLimit: null,
    };
  }
  if (name.includes("futebol") || name.includes("handebol")) {
    return {
      type: "gols",
      hasOvertime: false,
      hasPenalties: true,
      pointsLimit: null,
    };
  }
  if (name.includes("jiu")) {
    return {
      type: "pontos",
      hasOvertime: false,
      hasPenalties: false,
      pointsLimit: null,
    };
  }
  if (name.includes("pickleball") || name.includes("pickeball")) {
    return {
      type: "sets",
      setsToWin: 2,
      sets: 3,
      gamesPerSet: 11,
      tiebreak: false,
      tiebreakPoints: 7,
      finalSetSuperTiebreak: false,
      finalSetTargetPoints: 11,
      winByTwo: true,
      pointsLimit: null,
    };
  }
  return null;
}

export function getMatchUIConfig(match: BaseMatchCtx): MatchUIConfig {
  const format = match.format ?? {};
  const sportDefaults = getSportDefaultsByName(match.sport?.name);
  const rawType = String(match.sport?.scoring_type ?? "")
    .trim()
    .toLowerCase();
  const typeFromSport = rawType === "gols" || rawType === "pontos" || rawType === "rounds" ? rawType : null;
  const type: ScoringType = typeFromSport ?? sportDefaults?.type ?? "sets";
  const setsToWin = toInt(format.sets_to_win, sportDefaults?.setsToWin ?? 1) || 1;
  const gamesPerSet = toInt(format.games_per_set, sportDefaults?.gamesPerSet ?? 6) || 6;
  const pointsLimitRaw = Number(format.points_limit);
  const pointsLimit =
    Number.isFinite(pointsLimitRaw) && pointsLimitRaw > 0 ? Math.floor(pointsLimitRaw) : (sportDefaults?.pointsLimit ?? null);
  const sets = Math.max(setsToWin * 2 - 1, 1);
  let hasOvertime = toBool(format.has_overtime, sportDefaults?.hasOvertime ?? false);
  /** Esporte por gols: pênaltis em empate é o padrão (só desliga se o formato marcar has_penalties explicitamente como false). */
  const hasPenaltiesDefault = type === "gols" ? (sportDefaults?.hasPenalties ?? true) : (sportDefaults?.hasPenalties ?? false);
  const hasPenalties = toBool(format.has_penalties, hasPenaltiesDefault);
  /** Gols com pênaltis: só tempo regulamentar + disputa nos pênaltis em empate (sem prorrogação no lançador). */
  if (type === "gols" && hasPenalties) {
    hasOvertime = false;
  }
  return {
    type,
    sets,
    setsToWin,
    gamesPerSet,
    tiebreakPoints: toInt(format.tiebreak_points, sportDefaults?.tiebreakPoints ?? 7) || 7,
    tiebreak: toBool(format.tiebreak, sportDefaults?.tiebreak ?? false),
    finalSetSuperTiebreak: toBool(format.final_set_super_tiebreak, sportDefaults?.finalSetSuperTiebreak ?? false),
    finalSetTargetPoints: toInt(format.final_set_target_points, sportDefaults?.finalSetTargetPoints ?? 10) || 10,
    winByTwo: toBool(format.win_by_two, sportDefaults?.winByTwo ?? false),
    pointsLimit,
    hasOvertime,
    hasPenalties,
    maxRounds: toInt(format.max_rounds, sportDefaults?.maxRounds ?? 3) || 3,
  };
}

function normalizeName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function buildSetFormatOptions(params: {
  sportName?: string | null;
  baseConfig: MatchUIConfig;
  rules?: unknown;
}): SetFormatOption[] {
  const { sportName, baseConfig, rules } = params;
  if (baseConfig.type !== "sets") return [];
  const options: SetFormatOption[] = [];
  const nameNorm = normalizeName(String(sportName ?? ""));
  const isPadel = nameNorm.includes("padel");
  const isBeachTennis =
    nameNorm.includes("beach tennis") ||
    nameNorm.includes("beach tenis") ||
    nameNorm.includes("beachtenis") ||
    (nameNorm.includes("beach") && (nameNorm.includes("tenis") || nameNorm.includes("tennis"))) ||
    nameNorm.includes("tenis de praia");
  const isTennisLike =
    !isPadel &&
    (nameNorm.includes("tenis") ||
      nameNorm.includes("tennis") ||
      isBeachTennis);

  const bo3SuperTbOption: SetFormatOption = {
    key: "bo3_super_tb10",
    name: "Melhor de 3 (último set super tiebreak 10)",
    config: {
      ...baseConfig,
      setsToWin: 2,
      sets: 3,
      gamesPerSet: 6,
      tiebreak: true,
      tiebreakPoints: 7,
      finalSetSuperTiebreak: true,
      finalSetTargetPoints: 10,
    },
  };
  const proSet8Option: SetFormatOption = {
    key: "proset8_tb",
    name: "Pro set (8 games, TB decisivo 7 pts em 8×8)",
    config: {
      ...baseConfig,
      setsToWin: 1,
      sets: 1,
      gamesPerSet: 8,
      tiebreak: true,
      tiebreakPoints: 7,
      finalSetSuperTiebreak: false,
      finalSetTargetPoints: 10,
    },
  };

  if (isPadel) {
    options.push(bo3SuperTbOption);
  } else if (isTennisLike) {
    options.push(bo3SuperTbOption);
    options.push(proSet8Option);
  }
  const obj = rules && typeof rules === "object" && !Array.isArray(rules) ? (rules as { variantes?: unknown }) : null;
  const variants = Array.isArray(obj?.variantes) ? obj?.variantes : [];
  for (const variant of variants) {
    if (!variant || typeof variant !== "object" || Array.isArray(variant)) continue;
    const v = variant as Record<string, unknown>;
    const key = String(v.key ?? "").trim();
    if (!key) continue;
    const setsToWin = Number(v.sets_to_win ?? baseConfig.setsToWin);
    const gamesPerSet = Number(v.games_per_set ?? baseConfig.gamesPerSet);
    if (!Number.isFinite(setsToWin) || setsToWin < 1 || !Number.isFinite(gamesPerSet) || gamesPerSet < 1) continue;
    const cfg: MatchUIConfig = {
      ...baseConfig,
      setsToWin: Math.floor(setsToWin),
      sets: Math.max(Math.floor(setsToWin) * 2 - 1, 1),
      gamesPerSet: Math.floor(gamesPerSet),
      tiebreak: toBool(v.tiebreak, baseConfig.tiebreak),
      tiebreakPoints: toInt(v.tiebreak_points, baseConfig.tiebreakPoints),
      finalSetSuperTiebreak: toBool(v.final_set_super_tiebreak, baseConfig.finalSetSuperTiebreak),
      finalSetTargetPoints: toInt(v.final_set_target_points, baseConfig.finalSetTargetPoints),
      winByTwo: toBool(v.win_by_two, baseConfig.winByTwo),
      pointsLimit: Number.isFinite(Number(v.points_limit)) ? Math.floor(Number(v.points_limit)) : baseConfig.pointsLimit,
    };
    options.push({
      key: `variant:${key}`,
      name: String(v.label ?? key),
      config: cfg,
    });
  }
  const dedup = new Map<string, SetFormatOption>();
  for (const opt of options) {
    if (!dedup.has(opt.key)) dedup.set(opt.key, opt);
  }
  const list = Array.from(dedup.values());
  if (!list.length) {
    return [{ key: "default", name: "Formato padrão da partida", config: baseConfig }];
  }
  return list;
}

/**
 * Desafio / ranking (partida sem torneio): uma única config de sets, sem UI de escolha.
 * Prefere melhor de 3 + super TB 10 (`bo3_super_tb10`) quando existir; senão a única opção retornada por `buildSetFormatOptions`.
 */
export function getDesafioRankLockedSetFormat(params: {
  baseConfig: MatchUIConfig;
  sportName?: string | null;
  rules?: unknown;
}): { config: MatchUIConfig; formatKey: string } | null {
  if (params.baseConfig.type !== "sets") return null;
  const options = buildSetFormatOptions(params);
  if (!options.length) return null;
  const bo3 = options.find((o) => o.key === "bo3_super_tb10");
  if (bo3) return { config: bo3.config, formatKey: bo3.key };
  if (options.length === 1) return { config: options[0].config, formatKey: options[0].key };
  return { config: options[0].config, formatKey: options[0].key };
}

/** Set único pró: 8 games, vantagem mínima de 2; 7×7 segue até 9 games; 8×8 → super tiebreak a 7 pts (9×8). */
export function isProSet8Format(config: MatchUIConfig): boolean {
  return (
    config.type === "sets" &&
    config.setsToWin === 1 &&
    config.gamesPerSet === 8 &&
    config.tiebreak === true &&
    config.finalSetSuperTiebreak === false
  );
}

function validateSet(
  set: SetPayload,
  config: MatchUIConfig,
  isLastPossibleSet: boolean
): { ok: boolean; winner: "a" | "b" | null; requiresTb: boolean } {
  const a = toInt(set.a, -1);
  const b = toInt(set.b, -1);
  if (a < 0 || b < 0) return { ok: false, winner: null, requiresTb: false };

  const winner = a > b ? "a" : "b";
  const winnerScore = Math.max(a, b);
  const loserScore = Math.min(a, b);

  if (isProSet8Format(config)) {
    if (a === b) {
      return { ok: false, winner: null, requiresTb: a === 8 && config.tiebreak };
    }
    const tbClear = (set.tiebreakA ?? 0) === 0 && (set.tiebreakB ?? 0) === 0;
    if (config.tiebreak && loserScore === 8 && winnerScore === 9) {
      const tbA = toInt(set.tiebreakA, -1);
      const tbB = toInt(set.tiebreakB, -1);
      if (tbA < 0 || tbB < 0 || tbA === tbB) return { ok: false, winner: null, requiresTb: true };
      const tbWinner = tbA > tbB ? "a" : "b";
      if (tbWinner !== winner) return { ok: false, winner: null, requiresTb: true };
      const maxTb = Math.max(tbA, tbB);
      const minTb = Math.min(tbA, tbB);
      if (maxTb < config.tiebreakPoints || maxTb - minTb < 2) return { ok: false, winner: null, requiresTb: true };
      return { ok: true, winner, requiresTb: false };
    }
    if (winnerScore === 8 && loserScore <= 6 && winnerScore - loserScore >= 2) {
      if (!tbClear) return { ok: false, winner: null, requiresTb: false };
      return { ok: true, winner, requiresTb: false };
    }
    if (winnerScore === 9 && loserScore === 7) {
      if (!tbClear) return { ok: false, winner: null, requiresTb: false };
      return { ok: true, winner, requiresTb: false };
    }
    return { ok: false, winner: null, requiresTb: false };
  }

  if (a === b) return { ok: false, winner: null, requiresTb: false };

  if (config.finalSetSuperTiebreak && isLastPossibleSet) {
    if (winnerScore < config.finalSetTargetPoints || winnerScore - loserScore < 2) {
      return { ok: false, winner: null, requiresTb: false };
    }
    return { ok: true, winner, requiresTb: false };
  }

  const limit = config.pointsLimit ?? config.gamesPerSet;
  const needsTwo = config.winByTwo || config.type === "sets";
  const melhorDe3SetComum =
    config.type === "sets" &&
    config.setsToWin === 2 &&
    config.gamesPerSet === 6 &&
    config.finalSetSuperTiebreak &&
    !isLastPossibleSet;

  if (winnerScore === limit && (!needsTwo || winnerScore - loserScore >= 2)) {
    return { ok: true, winner, requiresTb: false };
  }

  if (config.tiebreak && loserScore === limit && winnerScore === limit + 1) {
    const tbA = toInt(set.tiebreakA, -1);
    const tbB = toInt(set.tiebreakB, -1);
    if (tbA < 0 || tbB < 0 || tbA === tbB) return { ok: false, winner: null, requiresTb: true };
    const tbWinner = tbA > tbB ? "a" : "b";
    if (tbWinner !== winner) return { ok: false, winner: null, requiresTb: true };
    const maxTb = Math.max(tbA, tbB);
    const minTb = Math.min(tbA, tbB);
    if (maxTb < config.tiebreakPoints || maxTb - minTb < 2) return { ok: false, winner: null, requiresTb: true };
    return { ok: true, winner, requiresTb: false };
  }

  if (needsTwo && winnerScore > limit) {
    if (melhorDe3SetComum && loserScore < limit) {
      return { ok: false, winner: null, requiresTb: false };
    }
    if (winnerScore - loserScore >= 2 && (!config.pointsLimit || winnerScore <= config.pointsLimit)) {
      return { ok: true, winner, requiresTb: false };
    }
  }
  return { ok: false, winner: null, requiresTb: false };
}

export function evaluateSetForConfig(
  set: { a: number; b: number; tiebreakA?: number; tiebreakB?: number },
  config: MatchUIConfig,
  isLastPossibleSet: boolean
): { ok: boolean; winner: "a" | "b" | null; requiresTb: boolean } {
  return validateSet(set, config, isLastPossibleSet);
}

/**
 * Com games em 6x6, ao fechar o tiebreak (7 pts c/ 2 de diferença), ajusta o placar de games para 7x6 / 6x7.
 * Se o tiebreak deixar de ser válido e havia pontos lançados, volta games de 7x6 para 6x6.
 */
export function syncSetGamesFromTiebreak(
  set: SetPayload,
  config: MatchUIConfig
): SetPayload {
  if (!config.tiebreak || config.type !== "sets") return set;
  const limit = config.gamesPerSet;
  const tbPts = config.tiebreakPoints;
  const ta = set.tiebreakA ?? 0;
  const tb = set.tiebreakB ?? 0;
  const a = set.a;
  const b = set.b;
  const tbTouched = ta > 0 || tb > 0;
  const tbComplete = ta !== tb && Math.max(ta, tb) >= tbPts && Math.max(ta, tb) - Math.min(ta, tb) >= 2;

  if (tbComplete && a === limit && b === limit) {
    if (ta > tb) return { ...set, a: limit + 1, b: limit, tiebreakA: ta, tiebreakB: tb };
    return { ...set, a: limit, b: limit + 1, tiebreakA: ta, tiebreakB: tb };
  }

  if (!tbComplete && tbTouched && ((a === limit + 1 && b === limit) || (a === limit && b === limit + 1))) {
    return { ...set, a: limit, b: limit, tiebreakA: ta, tiebreakB: tb };
  }

  return { ...set, tiebreakA: ta, tiebreakB: tb };
}

/**
 * Melhor de 3 (sets 1 e 2): no contador manual o teto é sempre 6 games.
 * O 7×6 / 6×7 só entra pelo sistema após tiebreak válido (syncSetGamesFromTiebreak).
 */
export function maxGamesMelhorDe3RegularSet(_set: SetPayload, _side: "a" | "b", gamesPerSet: number): number {
  return gamesPerSet;
}

/**
 * Pro set 8: o 9 nos games só entra (1) fechando 9×7 a partir de 8×7 no contador, ou (2) via syncSetGamesFromTiebreak no 8×8.
 * Em 8×8 os dois ficam travados em 8 no +; não dá para ir a 9×8 manual.
 */
export function maxGamesProSet8(set: SetPayload, side: "a" | "b", gamesPerSet: number): number {
  const g = gamesPerSet;
  const self = side === "a" ? set.a : set.b;
  const opp = side === "a" ? set.b : set.a;

  if (self >= g + 1) return self;

  if (opp >= g + 1 && self < g + 1) {
    if (opp === g + 1 && self === g) return g;
    if (opp === g + 1 && self === g - 1) return g - 1;
  }

  if (set.a === g && set.b === g) return g;

  if (self === g && opp <= g - 2) return g;
  if (opp === g && self <= g - 2) return g;

  if (self === g && opp === g - 1) return g + 1;
  if (self === g - 1 && opp === g) return g;

  return g;
}

/**
 * Totais exibidos como “placar antes dos pênaltis”: regulação + prorrogação quando havia empate na regulação
 * e existem gols de prorrogação. Usado na UI (independe de has_overtime no formato, para não esconder OT legada).
 */
export function goalsTotalsBeforePenaltiesDisplay(
  score: { a?: number; b?: number; overtimeA?: number; overtimeB?: number } | undefined
): { a: number; b: number } {
  let a = toInt(score?.a, 0);
  let b = toInt(score?.b, 0);
  const ota = toInt(score?.overtimeA, 0);
  const otb = toInt(score?.overtimeB, 0);
  if (a === b && (ota > 0 || otb > 0)) {
    a += ota;
    b += otb;
  }
  return { a, b };
}

export function goalsPayloadHasAny(goals: GoalsScoreFields | undefined | null): boolean {
  if (!goals) return false;
  return (
    toInt(goals.a, 0) > 0 ||
    toInt(goals.b, 0) > 0 ||
    toInt(goals.overtimeA, 0) > 0 ||
    toInt(goals.overtimeB, 0) > 0 ||
    toInt(goals.penaltiesA, 0) > 0 ||
    toInt(goals.penaltiesB, 0) > 0
  );
}

export type GoalsScoreboardVisualStyle = "football" | "ice_hockey" | "handball" | "default";

/** Estética do placar (gols + pênaltis) conforme o esporte — só afeta apresentação. */
export function resolveGoalsScoreboardVisualStyle(sportName?: string | null): GoalsScoreboardVisualStyle {
  const name = normalizeName(String(sportName ?? ""));
  if (!name) return "default";
  if (name.includes("hockey") || name.includes("hoquei") || name.includes("hóquei")) return "ice_hockey";
  if (name.includes("handebol") || name.includes("handball")) return "handball";
  if (
    name.includes("futebol") ||
    name.includes("futsal") ||
    name.includes("society") ||
    name.includes("soccer") ||
    (name.includes("campo") && name.includes("fute"))
  ) {
    return "football";
  }
  return "default";
}

/** Totais após tempo regulamentar + prorrogação (somente se empatados na regulação), antes dos pênaltis. */
export function goalsTotalsAfterRegulationAndOvertime(
  score: { a?: number; b?: number; overtimeA?: number; overtimeB?: number } | undefined,
  hasOvertime: boolean
): { a: number; b: number } {
  let a = toInt(score?.a, 0);
  let b = toInt(score?.b, 0);
  if (a === b && hasOvertime) {
    a += toInt(score?.overtimeA, 0);
    b += toInt(score?.overtimeB, 0);
  }
  return { a, b };
}

/** Formato com pênaltis e placar (após OT se houver) empatado — exibir lançador de pênaltis na UI. */
export function goalsRequiresPenaltyShootoutSection(
  config: Pick<MatchUIConfig, "hasOvertime" | "hasPenalties">,
  score: { a?: number; b?: number; overtimeA?: number; overtimeB?: number } | undefined
): boolean {
  if (!config.hasPenalties) return false;
  const { a, b } = goalsTotalsAfterRegulationAndOvertime(score, config.hasOvertime);
  return a === b;
}

/** Totais finais usados na validação e em placar_1/placar_2 (inclui pênaltis só se ainda empatado após OT). */
export function goalsFinalTotalsForValidation(
  config: Pick<MatchUIConfig, "hasOvertime" | "hasPenalties">,
  score: { a?: number; b?: number; overtimeA?: number; overtimeB?: number; penaltiesA?: number; penaltiesB?: number } | undefined
): { a: number; b: number } {
  let { a, b } = goalsTotalsAfterRegulationAndOvertime(score, config.hasOvertime);
  if (a === b && config.hasPenalties) {
    a += toInt(score?.penaltiesA, 0);
    b += toInt(score?.penaltiesB, 0);
  }
  return { a, b };
}

export function validateMatchScorePayload(
  config: MatchUIConfig,
  payload: MatchScorePayload
): { valid: boolean; message?: string; placar1?: number; placar2?: number } {
  if (payload.type !== config.type) return { valid: false, message: "Tipo de placar incompatível com o esporte." };

  if (config.type === "gols") {
    const score = payload.goals;
    if (!score) return { valid: false, message: "Placar de gols ausente." };
    if (toInt(score.a, -1) < 0 || toInt(score.b, -1) < 0) return { valid: false, message: "Placar inválido." };
    const { a, b } = goalsFinalTotalsForValidation(config, score);
    if (a === b) return { valid: false, message: "Empate final inválido para este formato." };
    return { valid: true, placar1: a, placar2: b };
  }

  if (config.type === "pontos") {
    const score = payload.points;
    if (!score) return { valid: false, message: "Placar de pontos ausente." };
    const a = toInt(score.a, -1);
    const b = toInt(score.b, -1);
    if (a < 0 || b < 0) return { valid: false, message: "Placar inválido." };
    if (config.pointsLimit != null && (a > config.pointsLimit || b > config.pointsLimit)) {
      return { valid: false, message: `Limite máximo permitido: ${config.pointsLimit}.` };
    }
    if (a === b && !config.hasOvertime) return { valid: false, message: "Empate não permitido neste formato." };
    return { valid: true, placar1: a, placar2: b };
  }

  if (config.type === "rounds") {
    const rounds = payload.rounds;
    if (!rounds) return { valid: false, message: "Dados de rounds ausentes." };
    if (rounds.winner !== "a" && rounds.winner !== "b") return { valid: false, message: "Defina o vencedor final." };
    const totalRounds = rounds.items.slice(0, config.maxRounds);
    if (!totalRounds.length) return { valid: false, message: "Informe ao menos um round." };
    let aWins = 0;
    let bWins = 0;
    for (const item of totalRounds) {
      if (rounds.method === "decision") {
        const a = toInt(item.a, -1);
        const b = toInt(item.b, -1);
        if (a < 0 || b < 0 || a === b) return { valid: false, message: "Rounds por decisão exigem pontuação válida." };
        if (a > b) aWins += 1;
        if (b > a) bWins += 1;
      } else {
        if (item.winner === "a") aWins += 1;
        if (item.winner === "b") bWins += 1;
      }
    }
    return { valid: true, placar1: aWins, placar2: bWins };
  }

  const sets = payload.sets ?? [];
  if (!sets.length) return { valid: false, message: "Informe ao menos um set." };
  let winsA = 0;
  let winsB = 0;
  for (let i = 0; i < sets.length; i += 1) {
    const isLastPossibleSet = i === config.sets - 1 && winsA === config.setsToWin - 1 && winsB === config.setsToWin - 1;
    const check = validateSet(sets[i], config, isLastPossibleSet);
    if (!check.ok || !check.winner) return { valid: false, message: `Set ${i + 1} inválido.` };
    if (check.winner === "a") winsA += 1;
    if (check.winner === "b") winsB += 1;
    if (winsA === config.setsToWin || winsB === config.setsToWin) break;
  }
  if (winsA !== config.setsToWin && winsB !== config.setsToWin) {
    return { valid: false, message: "Partida ainda não atingiu os sets necessários para vitória." };
  }
  return { valid: true, placar1: winsA, placar2: winsB };
}
