export type ProfessorSportModule = {
  key: string;
  title: string;
  description: string;
  href: string;
};

function normalize(input: string | null | undefined): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const DEFAULT_MODULES: ProfessorSportModule[] = [
  {
    key: "agenda",
    title: "Agenda e turmas",
    description: "Controle aulas, horários e presença de alunos.",
    href: "/professor/agenda",
  },
  {
    key: "alunos",
    title: "Alunos e solicitações",
    description: "Acompanhe alunos ativos e pedidos pendentes.",
    href: "/professor/alunos",
  },
];

const MUSCULACAO_MODULES: ProfessorSportModule[] = [
  {
    key: "ficha_treino",
    title: "Fichas de treino",
    description: "Monte e revise fichas por aluno e objetivo.",
    href: "/professor/musculacao",
  },
  {
    key: "avaliacao_fisica",
    title: "Avaliações físicas",
    description: "Registre evolução corporal, carga e performance.",
    href: "/professor/musculacao",
  },
  {
    key: "checkins",
    title: "Check-ins do social",
    description: "Acompanhe check-ins dos treinos executados.",
    href: "/professor/musculacao",
  },
];

export function getProfessorModulesBySportName(sportName: string | null | undefined): ProfessorSportModule[] {
  const key = normalize(sportName);
  if (key === "musculacao") return MUSCULACAO_MODULES;
  return DEFAULT_MODULES;
}
