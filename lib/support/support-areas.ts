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

/** Ícone decorativo no painel de ajuda (mapeado em `support-center-float`). */
export type SupportFaqIconKey =
  | "ranking"
  | "challenge"
  | "friendly"
  | "team"
  | "venue"
  | "solo"
  | "sport"
  | "captain";

export type SupportFaqItem = {
  id: string;
  pergunta: string;
  resposta: string;
  icone: SupportFaqIconKey;
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
    icone: "ranking",
    pergunta: "Por que não apareço no ranking ou minha posição não bate?",
    resposta:
      "Na maioria das vezes é só conferir três coisas: o esporte que você está vendo na tela é o mesmo do seu cadastro; o ranking masculino/feminino combina com o que está no seu perfil; e você já tem histórico válido naquele esporte (as partidas precisam estar registradas e confirmadas — enquanto o resultado ainda está em análise, a lista pode demorar um pouquinho para atualizar). Troque o esporte no filtro ou no seu perfil se quiser ver outro contexto.",
  },
  {
    id: "desafio-travado",
    icone: "challenge",
    pergunta: "Meu desafio sumiu, travou ou não consigo continuar — o que faço?",
    resposta:
      "Abra a Agenda: costuma ter algo esperando — um aceite, um placar para registrar ou confirmar. Se você joga em dupla ou em time, quem organiza a dupla ou o capitão é quem fecha algumas etapas; se você não é essa pessoa, pode ser normal não ver o botão. Também existe regra de tempo mínimo entre um jogo e outro com o mesmo adversário: se acabou de jogar com a pessoa, pode ser preciso esperar um pouco antes de desafiar de novo.",
  },
  {
    id: "amistoso-radar",
    icone: "friendly",
    pergunta: "Ativei o jeito “amistoso” mas não aparece ninguém — por quê?",
    resposta:
      "Esse modo junta pessoas com perfil e horários parecidos com os seus. Vale checar se o amistoso está ligado no seu perfil, se a localização ou cidade estão certas, e se você marcou quando costuma jogar. Em alguns esportes o pareamento é só no modelo individual — se o seu cadastro for outro formato, as sugestões podem ficar vazias.",
  },
  {
    id: "vagas-time",
    icone: "team",
    pergunta: "Não acho vaga no time ou não recebo convite",
    resposta:
      "Vagas e convites dependem do que o time publicou e do esporte da formação. Confira se você entrou como atleta na conta certa e se o time ainda está ativo naquele esporte. Se o capitão não abriu vaga ou o elenco já está fechado, a lista pode ficar sem opções — nesse caso o caminho é falar com quem administra o time.",
  },
  {
    id: "reserva-espaco",
    icone: "venue",
    pergunta: "Trouxe problema ao reservar quadra ou espaço",
    resposta:
      "Veja se o local aceita reserva pelo app, se o horário ainda está livre e se não há bloqueio ou manutenção. Se envolver pagamento, use o histórico na sua conta para acompanhar. Se nada disso bater com o que você vê na tela, use a aba Chamado — a gente olha com você.",
    ocultarSeModulosEmBreve: ["locais"],
  },
];

/** Dúvidas sobre perfil individual, dupla e time (conteúdo estável; não amarra a módulo em breve). */
export const SUPPORT_PERFIL_FORMACOES_FAQ: SupportFaqItem[] = [
  {
    id: "perfil-individual-dupla-time",
    icone: "solo",
    pergunta: "Individual, dupla e time — o que muda no dia a dia?",
    resposta:
      "No individual é só você: ranking e desafios contam só a sua participação naquele esporte. Na dupla são dois atletas com histórico próprio, e uma das pessoas vira referência para aceitar desafio e organizar a dupla. No time entram vários jogadores, com capitão (ou quem o time definiu) cuidando de convites, vagas e parte da rotina — por isso alguns botões só aparecem para quem tem esse papel.",
  },
  {
    id: "perfil-esporte-eid",
    icone: "sport",
    pergunta: "Tenho mais de um esporte — como leio ranking e “meu número” no esporte?",
    resposta:
      "Você pode cadastrar vários esportes no perfil. O ranking e as telas seguem o esporte que estiver selecionado no momento (no filtro ou no seu perfil). O número do esporte é o seu desempenho naquele esporte específico: quanto mais jogos válidos e consistentes, mais estável fica a posição. Quer ver outro esporte? É só trocar a seleção — cada um tem histórico separado.",
  },
  {
    id: "perfil-lider-dupla-time",
    icone: "captain",
    pergunta: "Quem manda na dupla e no time? Por que não vejo um botão?",
    resposta:
      "Na dupla, quem “lidera” é quem aceita desafio e fecha algumas confirmações por vocês dois. No time, quem organiza convites, elenco e vagas costuma ser o capitão ou o papel que o time definiu. Se um botão não aparece para você, pode ser porque só quem tem esse papel pode usar — vale combinar com a outra pessoa da dupla ou com o capitão.",
  },
];
