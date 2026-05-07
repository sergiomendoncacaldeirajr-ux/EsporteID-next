import type { SystemFeatureKey } from "@/lib/system-features";

export type SupportChamadoArea =
  | "dashboard"
  | "desafio_match"
  | "ranking"
  | "vagas"
  | "perfil"
  | "torneios"
  | "locais"
  | "marketplace"
  | "professores"
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
  { value: "marketplace", label: "MarketPlace", ocultarSeModulosEmBreve: ["marketplace"] },
  { value: "professores", label: "Professores", ocultarSeModulosEmBreve: ["professores"] },
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
  | "captain"
  | "calendar"
  | "store"
  | "graduation"
  | "account"
  | "community";

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
      "Confira três coisas: o esporte exibido na tela é o mesmo do seu cadastro; o ranking masculino/feminino combina com o que está no seu perfil; e você já tem histórico válido naquele esporte — resultados ainda em análise podem demorar para atualizar. Troque o esporte no filtro ou no perfil para ver outro contexto.",
  },
  {
    id: "desafio-travado",
    icone: "challenge",
    pergunta: "Meu desafio sumiu, travou ou não consigo continuar — o que faço?",
    resposta:
      "Abra a Agenda: costuma ter algo esperando — um aceite, um placar para registrar ou confirmar. Em dupla ou time, quem organiza ou o capitão fecha algumas etapas; se você não tiver esse papel, pode ser normal não ver o botão. Existe também regra de tempo mínimo entre jogos com o mesmo adversário.",
  },
  {
    id: "amistoso-radar",
    icone: "friendly",
    pergunta: "Ativei o modo amistoso mas não aparece ninguém — por quê?",
    resposta:
      "Esse modo junta pessoas com perfil e horários parecidos. Vale checar se o amistoso está ligado no seu perfil, se localização e cidade estão corretas, e se você marcou quando costuma jogar. Em alguns esportes o pareamento é só no modelo individual — se seu cadastro for outro formato, as sugestões podem ficar vazias.",
  },
  {
    id: "vagas-time",
    icone: "team",
    pergunta: "Não acho vaga no time ou não recebo convite",
    resposta:
      "Vagas e convites dependem do que o time publicou e do esporte da formação. Confira se você entrou como atleta na conta certa e se o time ainda está ativo naquele esporte. Se o capitão não abriu vaga ou o elenco já está fechado, a lista pode ficar sem opções — fale com quem administra o time.",
  },
  {
    id: "reserva-espaco",
    icone: "venue",
    pergunta: "Problema ao reservar quadra ou espaço esportivo",
    resposta:
      "Veja se o local aceita reserva pelo app, se o horário ainda está livre e se não há bloqueio ou manutenção. Se envolver pagamento, acompanhe no histórico da sua conta. Se nada bater com o que você vê na tela, use a aba Chamado.",
    ocultarSeModulosEmBreve: ["locais"],
  },
  {
    id: "torneios-inscricao",
    icone: "calendar",
    pergunta: "Como me inscrevo em um torneio?",
    resposta:
      "Acesse o módulo de Torneios no menu e veja os eventos abertos no seu esporte. Cada torneio tem data limite de inscrição, formato (individual, dupla ou time) e critérios de participação. Clique em participar e siga as etapas — em time, o capitão costuma ser quem confirma a inscrição pela formação.",
    ocultarSeModulosEmBreve: ["torneios", "organizador_torneios"],
  },
  {
    id: "marketplace-uso",
    icone: "store",
    pergunta: "Como compro, vendo ou anuncio no MarketPlace?",
    resposta:
      "No MarketPlace você encontra equipamentos, serviços e oportunidades ligadas ao esporte. Para anunciar, crie seu item com fotos, preço e contato. Para comprar, navegue pelos itens e entre em contato com quem anunciou. Todas as transações são acertadas diretamente entre as partes.",
    ocultarSeModulosEmBreve: ["marketplace"],
  },
  {
    id: "professores-contratar",
    icone: "graduation",
    pergunta: "Como encontrar ou contratar um professor?",
    resposta:
      "Acesse a área de Professores e filtre por esporte, localização ou disponibilidade. Cada professor tem um perfil com especialidades. Para contratar, entre em contato pelo botão disponível no perfil — horário e pagamento são combinados diretamente com o profissional.",
    ocultarSeModulosEmBreve: ["professores"],
  },
  {
    id: "conta-acesso",
    icone: "account",
    pergunta: "Não consigo entrar — email não chegou ou senha não funciona",
    resposta:
      "Primeiro confira a pasta de spam. Se o email de confirmação não aparecer em até 5 minutos, tente Esqueci minha senha na tela de login — você receberá um link para redefinir. Se ainda assim não conseguir entrar, abra um chamado na aba ao lado informando o email usado no cadastro.",
  },
];

/** Dúvidas sobre perfil individual, dupla e time (conteúdo estável; não amarra a módulo em breve). */
export const SUPPORT_PERFIL_FORMACOES_FAQ: SupportFaqItem[] = [
  {
    id: "perfil-individual-dupla-time",
    icone: "solo",
    pergunta: "Individual, dupla e time — o que muda no dia a dia?",
    resposta:
      "No individual é só você: ranking e desafios contam apenas a sua participação naquele esporte. Na dupla são dois atletas com histórico próprio, e uma das pessoas vira referência para aceitar desafios e organizar a dupla. No time entram vários jogadores, com capitão cuidando de convites, vagas e parte da rotina — por isso alguns botões só aparecem para quem tem esse papel.",
  },
  {
    id: "perfil-esporte-eid",
    icone: "sport",
    pergunta: "Tenho mais de um esporte — como leio ranking e meu número no esporte?",
    resposta:
      "Você pode cadastrar vários esportes no perfil. O ranking e as telas seguem o esporte selecionado no momento (no filtro ou no seu perfil). O número do esporte reflete seu desempenho naquele esporte específico: quanto mais jogos válidos e consistentes, mais estável fica a posição. Quer ver outro esporte? Só trocar a seleção — cada um tem histórico separado.",
  },
  {
    id: "perfil-lider-dupla-time",
    icone: "captain",
    pergunta: "Quem manda na dupla e no time? Por que não vejo um botão?",
    resposta:
      "Na dupla, quem lidera é quem aceita desafios e fecha algumas confirmações por vocês dois. No time, quem organiza convites, elenco e vagas costuma ser o capitão ou o papel que o time definiu. Se um botão não aparece para você, pode ser porque só quem tem esse papel pode usá-lo — vale combinar com o parceiro de dupla ou com o capitão.",
  },
  {
    id: "perfil-comunidade",
    icone: "community",
    pergunta: "Como funciona a rede social e comunidade da plataforma?",
    resposta:
      "A comunidade conecta atletas, professores e espaços esportivos. Você pode seguir outros perfis, ver atividades do seu círculo e interagir com publicações. Acesse pelo menu lateral — novos recursos são adicionados continuamente. Se quiser sugerir algo ou reportar um problema, use a aba Chamado.",
  },
];
