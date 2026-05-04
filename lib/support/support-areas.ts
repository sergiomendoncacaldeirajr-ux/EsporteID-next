import type { SystemFeatureKey } from "@/lib/system-features";

export type SupportChamadoArea =
  | "dashboard"
  | "desafio_match"
  | "ranking"
  | "vagas"
  | "perfil"
  | "torneios"
  | "locais"
  | "comunidade"
  | "conta"
  | "outro";

export type SupportChamadoAreaEntry = {
  value: SupportChamadoArea;
  label: string;
  /** Área some do select de chamado se algum destes módulos estiver `em_breve`. */
  ocultarSeModulosEmBreve?: SystemFeatureKey[];
};

export const SUPPORT_CHAMADO_AREAS: SupportChamadoAreaEntry[] = [
  { value: "dashboard", label: "Dashboard" },
  { value: "desafio_match", label: "Desafio" },
  { value: "ranking", label: "Ranking" },
  { value: "vagas", label: "Vagas / Times / Elenco" },
  { value: "perfil", label: "Perfil público / EID" },
  {
    value: "torneios",
    label: "Torneios",
    ocultarSeModulosEmBreve: ["torneios", "organizador_torneios"],
  },
  { value: "locais", label: "Locais / Reservas", ocultarSeModulosEmBreve: ["locais"] },
  { value: "comunidade", label: "Comunidade / Social" },
  { value: "conta", label: "Conta / login / termos" },
  { value: "outro", label: "Outro" },
];

const AREA_SET = new Set<string>(SUPPORT_CHAMADO_AREAS.map((a) => a.value));

export function isSupportChamadoArea(v: string): v is SupportChamadoArea {
  return AREA_SET.has(v);
}

export type SupportFaqItem = {
  id: string;
  pergunta: string;
  resposta: string;
  /** Se algum destes módulos estiver em `em_breve` na config global, o item some da ajuda (só produção). */
  ocultarSeModulosEmBreve?: SystemFeatureKey[];
};

/** FAQ ou área de chamado some quando algum módulo listado está `em_breve` na config global. */
export function supportFaqVisivelEmProducao(
  item: { ocultarSeModulosEmBreve?: SystemFeatureKey[] },
  modulosEmBreve: readonly SystemFeatureKey[]
): boolean {
  const keys = item.ocultarSeModulosEmBreve;
  if (!keys?.length) return true;
  const set = new Set(modulosEmBreve);
  return !keys.some((k) => set.has(k));
}

export const SUPPORT_FAQ_ITEMS: SupportFaqItem[] = [
  {
    id: "ranking-sem-posicao",
    pergunta: "Não consigo ver o ranking ou apareço sem posição",
    resposta:
      "Confira se o esporte está selecionado no filtro, se o gênero do ranking bate com o do seu perfil e se você já tem EID cadastrado naquele esporte. Partidas ainda não validadas podem demorar a refletir.",
  },
  {
    id: "desafio-travado",
    pergunta: "Desafio não aparece ou está travado",
    resposta:
      "Veja na Agenda se há pendência de aceite ou placar. Em dupla/time, só o líder pode certas ações. Se houver carência de ranking, o sistema pode bloquear novo desafio contra o mesmo adversário.",
  },
  {
    id: "amistoso-radar",
    pergunta: "Modo amistoso ou radar sem sugestões",
    resposta:
      "O amistoso usa janela de disponibilidade e filtros de perfil. Ative o modo amistoso no seu perfil, confira localização/coordenadas e se o esporte permite desafio individual.",
  },
  {
    id: "vagas-time",
    pergunta: "Não encontro vaga ou convite de time",
    resposta:
      "Vagas dependem do esporte da formação e do que o capitão publicou. Confirme se você está no papel certo (atleta) e se o time está ativo naquele esporte.",
  },
  {
    id: "reserva-espaco",
    pergunta: "Problema com reserva ou espaço",
    resposta:
      "Verifique se o espaço aceita reserva, horários disponíveis e se há bloqueio administrativo. Em dúvida sobre pagamento, use o histórico na sua conta.",
    ocultarSeModulosEmBreve: ["locais"],
  },
];

/** Dúvidas sobre perfil individual, dupla e time (conteúdo estável; não amarra a módulo em breve). */
export const SUPPORT_PERFIL_FORMACOES_FAQ: SupportFaqItem[] = [
  {
    id: "perfil-individual-dupla-time",
    pergunta: "Qual a diferença entre perfil individual, dupla e time?",
    resposta:
      "Individual é só você no ranking e nos desafios daquele esporte. Dupla reune dois atletas com ranking/EID próprios, com um líder da dupla para aceites e gestão. Time é a formação em elenco (vários jogadores), com capitão/líder definido pelo time — convites, vagas e parte da agenda seguem as regras do time.",
  },
  {
    id: "perfil-esporte-eid",
    pergunta: "Como funciona esporte principal e EID no perfil?",
    resposta:
      "Você pode ter vários esportes no perfil; o filtro e o ranking usam o esporte selecionado. O EID é o índice daquele esporte — precisa estar cadastrado e com partidas válidas para posição estável. Troque o esporte no perfil ou no seletor do ranking quando quiser ver outro contexto.",
  },
  {
    id: "perfil-lider-dupla-time",
    pergunta: "Quem é o “líder” na dupla ou no time?",
    resposta:
      "Na dupla, o líder é quem assume aceite de desafios, certas confirmações e gestão da dupla. No time, o capitão (ou papel equivalente definido pelo time) concentra convites, elenco e publicação de vagas. Se algo “não aparece” para você, confira se a ação é só do líder.",
  },
];
