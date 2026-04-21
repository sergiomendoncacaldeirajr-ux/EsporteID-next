export type DrawStrategy = "eid" | "manual" | "random";
export type DrawStageFormat = "knockout" | "groups";
export type DrawModalidade = "individual" | "dupla" | "equipe";

export type DrawParticipant = {
  inscricaoId: number;
  entityId: string;
  nome: string;
  eid: number;
};

type DrawEntity = DrawParticipant & {
  seed: number;
};

type DrawTeam = {
  entityId: string;
  nome: string;
  membros: DrawParticipant[];
  seed: number;
};

type KnockoutMatch = {
  id: string;
  rodada: number;
  slot: number;
  lado_a?: DrawEntity | DrawTeam;
  lado_b?: DrawEntity | DrawTeam;
  fonte_a?: string;
  fonte_b?: string;
};

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function orderParticipants(
  participants: readonly DrawParticipant[],
  strategy: DrawStrategy,
  manualOrder: readonly string[]
) {
  if (strategy === "manual") {
    const priority = new Map(manualOrder.map((id, index) => [id, index]));
    return [...participants].sort((left, right) => {
      const a = priority.get(left.entityId) ?? Number.MAX_SAFE_INTEGER;
      const b = priority.get(right.entityId) ?? Number.MAX_SAFE_INTEGER;
      if (a !== b) return a - b;
      return right.eid - left.eid || left.nome.localeCompare(right.nome, "pt-BR");
    });
  }
  if (strategy === "random") {
    return shuffle(participants);
  }
  return [...participants].sort((left, right) => right.eid - left.eid || left.nome.localeCompare(right.nome, "pt-BR"));
}

function toSeededEntities(participants: readonly DrawParticipant[]): DrawEntity[] {
  return participants.map((participant, index) => ({
    ...participant,
    seed: index + 1,
  }));
}

function buildDoubles(entities: readonly DrawEntity[]): DrawTeam[] {
  if (entities.length < 2) throw new Error("São necessários ao menos 2 inscritos para montar duplas.");
  const teams: DrawTeam[] = [];
  for (let index = 0; index < entities.length; index += 2) {
    const left = entities[index];
    const right = entities[index + 1];
    if (!right) {
      throw new Error("Para sorteio de duplas, a quantidade de inscritos deve ser par.");
    }
    teams.push({
      entityId: `${left.entityId}__${right.entityId}`,
      nome: `${left.nome} / ${right.nome}`,
      membros: [left, right],
      seed: teams.length + 1,
    });
  }
  return teams;
}

function nextPow2(value: number) {
  let size = 1;
  while (size < value) size *= 2;
  return size;
}

function buildKnockoutEntities(entities: Array<DrawEntity | DrawTeam>) {
  const size = nextPow2(entities.length);
  const seeded = [...entities];
  while (seeded.length < size) {
    seeded.push({
      entityId: `bye_${seeded.length + 1}`,
      nome: "BYE",
      seed: seeded.length + 1,
      membros: [],
    } as DrawTeam);
  }

  const firstRoundMatches: KnockoutMatch[] = [];
  for (let index = 0; index < seeded.length / 2; index += 1) {
    const ladoA = seeded[index];
    const ladoB = seeded[seeded.length - 1 - index];
    firstRoundMatches.push({
      id: `r1-m${index + 1}`,
      rodada: 1,
      slot: index + 1,
      lado_a: ladoA,
      lado_b: ladoB,
    });
  }

  const rounds: Array<{ rodada: number; matches: KnockoutMatch[] }> = [
    { rodada: 1, matches: firstRoundMatches },
  ];
  let currentSize = firstRoundMatches.length;
  let currentRound = 2;
  while (currentSize > 1) {
    const matches: KnockoutMatch[] = [];
    for (let index = 0; index < currentSize / 2; index += 1) {
      matches.push({
        id: `r${currentRound}-m${index + 1}`,
        rodada: currentRound,
        slot: index + 1,
        fonte_a: `r${currentRound - 1}-m${index * 2 + 1}`,
        fonte_b: `r${currentRound - 1}-m${index * 2 + 2}`,
      });
    }
    rounds.push({ rodada: currentRound, matches });
    currentSize = matches.length;
    currentRound += 1;
  }

  return rounds;
}

function buildGroupsEntities(entities: Array<DrawEntity | DrawTeam>, groupCount: number) {
  const groups = Array.from({ length: Math.max(2, groupCount) }, (_, index) => ({
    id: `grupo-${index + 1}`,
    nome: `Grupo ${String.fromCharCode(65 + index)}`,
    participantes: [] as Array<DrawEntity | DrawTeam>,
  }));

  let direction = 1;
  let pointer = 0;
  for (const entity of entities) {
    groups[pointer].participantes.push(entity);
    if (pointer === groups.length - 1) direction = -1;
    else if (pointer === 0) direction = 1;
    pointer += direction;
    if (pointer < 0) pointer = 0;
    if (pointer >= groups.length) pointer = groups.length - 1;
  }

  const groupGames = groups.map((group) => ({
    ...group,
    jogos: group.participantes.flatMap((left, leftIndex) =>
      group.participantes.slice(leftIndex + 1).map((right, rightIndex) => ({
        id: `${group.id}-j${leftIndex + rightIndex + 1}`,
        rodada: 1,
        slot: leftIndex + rightIndex + 1,
        grupo_id: group.id,
        lado_a: left,
        lado_b: right,
      }))
    ),
  }));

  return groupGames;
}

function mapGamesFromRounds(
  torneioId: number,
  rounds: Array<{
    rodada: number;
    matches: Array<Record<string, unknown>>;
  }>
) {
  return rounds.flatMap((round) =>
    round.matches.map((match) => ({
      torneio_id: torneioId,
      rodada: round.rodada,
      idx_rodada: Number(match.slot ?? 1),
      jogador_a_id:
        typeof match.lado_a === "object" && match.lado_a && "entityId" in match.lado_a
          ? String((match.lado_a as { entityId: string }).entityId).includes("__") || String((match.lado_a as { entityId: string }).entityId).startsWith("bye_")
            ? null
            : String((match.lado_a as { entityId: string }).entityId)
          : null,
      jogador_b_id:
        typeof match.lado_b === "object" && match.lado_b && "entityId" in match.lado_b
          ? String((match.lado_b as { entityId: string }).entityId).includes("__") || String((match.lado_b as { entityId: string }).entityId).startsWith("bye_")
            ? null
            : String((match.lado_b as { entityId: string }).entityId)
          : null,
      status: "pendente",
      observacoes:
        typeof match.grupo_id === "string" ? `Fase de grupos · ${String(match.grupo_id).replace("-", " ")}` : null,
    }))
  );
}

export function generateTorneioDraw(input: {
  torneioId: number;
  strategy: DrawStrategy;
  modalidade: DrawModalidade;
  formatoCompeticao: string | null | undefined;
  participants: DrawParticipant[];
  manualOrder: string[];
  groupCount: number;
}) {
  if (input.participants.length < 2) {
    throw new Error("São necessários ao menos 2 inscritos para gerar a chave.");
  }

  const ordered = orderParticipants(input.participants, input.strategy, input.manualOrder);
  const seededParticipants = toSeededEntities(ordered);
  const entities: Array<DrawEntity | DrawTeam> =
    input.modalidade === "dupla" ? buildDoubles(seededParticipants) : [...seededParticipants];

  const stageFormat: DrawStageFormat =
    input.formatoCompeticao === "grupos_mata_mata" || input.formatoCompeticao === "todos_contra_todos"
      ? "groups"
      : "knockout";

  const payload =
    stageFormat === "groups"
      ? {
          meta: {
            strategy: input.strategy,
            formato: stageFormat,
            modalidade: input.modalidade,
            publicado: false,
            gerado_em: new Date().toISOString(),
          },
          participants: entities,
          groups: buildGroupsEntities(entities, input.groupCount),
        }
      : {
          meta: {
            strategy: input.strategy,
            formato: stageFormat,
            modalidade: input.modalidade,
            publicado: false,
            gerado_em: new Date().toISOString(),
          },
          participants: entities,
          rounds: buildKnockoutEntities(entities),
        };

  const rounds =
    stageFormat === "groups"
      ? payload.groups.map((group, index) => ({
          rodada: index + 1,
          matches: group.jogos,
        }))
      : payload.rounds;

  return {
    ...payload,
    jogos: mapGamesFromRounds(input.torneioId, rounds),
    seedOrder: seededParticipants.map((participant) => ({
      inscricaoId: participant.inscricaoId,
      seed: participant.seed,
    })),
  };
}
