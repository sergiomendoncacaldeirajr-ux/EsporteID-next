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

// ── Rich FAQ content blocks ───────────────────────────────────────────────────
export type RichFaqStep = {
  emoji: string;
  titulo: string;
  desc: string;
};

export type RichFaqStat = {
  rotulo: string;
  valor: string;
  cor: "azul" | "verde" | "laranja" | "roxo";
};

export type RichFaqBlock =
  | { tipo: "intro"; texto: string }
  | { tipo: "steps"; itens: RichFaqStep[] }
  | { tipo: "stats"; itens: RichFaqStat[] }
  | { tipo: "dica"; texto: string }
  | { tipo: "aviso"; texto: string };

export type SupportFaqItem = {
  id: string;
  pergunta: string;
  resposta: string;
  icone: SupportFaqIconKey;
  /** Conteúdo visual rico exibido no lugar de `resposta` quando presente. */
  blocos?: RichFaqBlock[];
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
  // ── Nota EID ────────────────────────────────────────────────────────────────
  {
    id: "nota-eid-como-funciona",
    icone: "sport",
    pergunta: "O que é a Nota EID e como ela é calculada?",
    resposta:
      "A Nota EID é uma pontuação de desempenho por esporte — sobe conforme você acumula resultados consistentes em partidas de ranking. Não reinicia: é um histórico permanente do seu nível.",
    blocos: [
      {
        tipo: "intro",
        texto:
          "A Nota EID é uma pontuação de desempenho individual por esporte — inspirada em sistemas de rating usados no xadrez e no tênis profissional. Ela não reinicia: é um histórico permanente do seu nível.",
      },
      {
        tipo: "steps",
        itens: [
          {
            emoji: "🎯",
            titulo: "Só partidas de ranking contam",
            desc: "Desafios do tipo ranking alimentam a nota. Amistosos não entram no cálculo — eles são para treino.",
          },
          {
            emoji: "🏆",
            titulo: "Qualidade do adversário pesa",
            desc: "Vencer alguém com nota mais alta impulsiona mais a sua Nota EID do que vencer quem está abaixo de você. A plataforma valoriza o desafio real.",
          },
          {
            emoji: "📈",
            titulo: "Consistência supera quantidade",
            desc: "Jogar regularmente e manter bom desempenho vale mais do que acumular muitas partidas de uma vez. Ritmo constante constrói nota mais sólida.",
          },
          {
            emoji: "♾️",
            titulo: "Acumulativa e permanente",
            desc: "A Nota EID não zera com o mês ou o ano. É uma linha do tempo do seu histórico — quanto mais tempo e dedicação, mais ela reflete seu nível real.",
          },
        ],
      },
      {
        tipo: "dica",
        texto:
          "Veja sua Nota EID no perfil público e no ranking. No filtro 'EID' do ranking, a classificação usa essa nota — não os pontos do período.",
      },
    ],
  },
  // ── Pontos do Ranking ────────────────────────────────────────────────────────
  {
    id: "pontos-ranking-como-funciona",
    icone: "ranking",
    pergunta: "Como funcionam os Pontos do Ranking?",
    resposta:
      "A cada partida de ranking você ganha pontos — vitória vale mais, mas derrota também pontua. Os pontos reiniciam por período (mês ou ano) e determinam sua posição no ranking de desafios.",
    blocos: [
      {
        tipo: "intro",
        texto:
          "Os Pontos do Ranking medem seu desempenho em partidas de desafio dentro de um período (mês ou ano). Ao contrário da Nota EID, eles reiniciam a cada ciclo — o que mantém o ranking sempre competitivo.",
      },
      {
        tipo: "stats",
        itens: [
          { rotulo: "Vitória", valor: "10 pts", cor: "verde" },
          { rotulo: "Derrota", valor: "4 pts", cor: "azul" },
          { rotulo: "Bônus virada", valor: "+até 20%", cor: "laranja" },
          { rotulo: "Reinício", valor: "Mensal / Anual", cor: "roxo" },
        ],
      },
      {
        tipo: "steps",
        itens: [
          {
            emoji: "📅",
            titulo: "Duas temporadas: mês e ano",
            desc: "Os pontos são separados por período. Você pode estar em 1º no ranking mensal e em outro lugar no anual — cada um tem sua própria contagem.",
          },
          {
            emoji: "⚡",
            titulo: "Bônus por virada (upset)",
            desc: "Se você vencer alguém que tem mais pontos do que você no momento, ganha até +20% de bônus extra. A plataforma recompensa quem arrisca contra favoritos.",
          },
          {
            emoji: "🎮",
            titulo: "Derrota também vale",
            desc: "Perder uma partida de ranking ainda rende pontos (4 padrão). Então jogar sempre é melhor do que ficar esperando uma vitória certa.",
          },
          {
            emoji: "🔢",
            titulo: "Pontos variam por esporte",
            desc: "Os valores padrão são 10 (vitória) e 4 (derrota), mas cada esporte pode ter regras próprias configuradas pela plataforma.",
          },
        ],
      },
      {
        tipo: "aviso",
        texto:
          "Pontos do Ranking e Nota EID são independentes: você pode ter muitos pontos no mês (jogou muito) e ainda ter Nota EID crescendo — ou vice-versa. Os dois filtros aparecem no ranking.",
      },
    ],
  },
  // ── Desafios ─────────────────────────────────────────────────────────────────
  {
    id: "desafio-como-funciona",
    icone: "challenge",
    pergunta: "Como funciona o sistema de Desafios?",
    resposta:
      "Desafios são partidas de ranking entre dois jogadores, duplas ou times. Você desafia, o adversário aceita, vocês jogam, registram o placar — e os pontos entram no ranking de ambos.",
    blocos: [
      {
        tipo: "intro",
        texto:
          "O Desafio é o coração do EsporteID: partidas de ranking reais que somam pontos e movem sua posição na classificação. Funciona em 4 etapas simples.",
      },
      {
        tipo: "steps",
        itens: [
          {
            emoji: "1️⃣",
            titulo: "Você desafia",
            desc: "Encontre um adversário no Radar de Desafio e envie o desafio. Você pode desafiar no individual, na dupla ou pelo seu time.",
          },
          {
            emoji: "2️⃣",
            titulo: "O adversário aceita",
            desc: "Ele recebe a notificação e aceita (ou recusa). Só depois que os dois concordam o desafio está ativo.",
          },
          {
            emoji: "3️⃣",
            titulo: "Acontece o jogo",
            desc: "Combinem local e horário, joguem de verdade. O agendamento fica na Agenda para os dois acompanharem.",
          },
          {
            emoji: "4️⃣",
            titulo: "Registrar o placar",
            desc: "Após o jogo, um dos dois lança o placar no app. O outro confirma — ou contesta se o resultado estiver errado. Confirmado, os pontos entram no ranking.",
          },
        ],
      },
      {
        tipo: "stats",
        itens: [
          { rotulo: "Vitória", valor: "10 pts", cor: "verde" },
          { rotulo: "Derrota", valor: "4 pts", cor: "azul" },
          { rotulo: "Bônus virada", valor: "+até 20%", cor: "laranja" },
          { rotulo: "Amistoso", valor: "Sem pts", cor: "roxo" },
        ],
      },
      {
        tipo: "dica",
        texto:
          "Desafio de ranking e Amistoso são coisas diferentes. Amistoso é para treino — não soma pontos nem afeta a Nota EID. Só desafios de ranking contam para a classificação.",
      },
    ],
  },
  // ── demais itens ─────────────────────────────────────────────────────────────
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

/** Dúvidas específicas para donos/gestores de locais esportivos. */
export const SUPPORT_ESPACO_DONO_FAQ: SupportFaqItem[] = [
  {
    id: "espaco-primeiros-passos",
    icone: "venue",
    pergunta: "O que preciso configurar para meu local aparecer direito?",
    resposta:
      "Comece pelo Perfil público: nome, cidade, WhatsApp, site/Instagram e descrição. Depois cadastre quadras/unidades, horários de funcionamento e regras de reserva. Quanto mais completo estiver, mais fácil o atleta entende onde joga, quando pode reservar e como falar com o local.",
    blocos: [
      {
        tipo: "steps",
        itens: [
          {
            emoji: "1",
            titulo: "Perfil público",
            desc: "Preencha nome, cidade, contatos e uma descrição clara do espaço.",
          },
          {
            emoji: "2",
            titulo: "Quadras e unidades",
            desc: "Cadastre cada quadra/campo com tipo, superfície, capacidade e recursos.",
          },
          {
            emoji: "3",
            titulo: "Horários e feriados",
            desc: "Defina abertura por dia da semana e ajuste datas especiais para evitar reservas indevidas.",
          },
          {
            emoji: "4",
            titulo: "Financeiro e planos",
            desc: "Configure cobrança, mensalidade da plataforma e planos de sócios quando usar reservas pagas ou associação.",
          },
        ],
      },
    ],
    ocultarSeModulosEmBreve: ["locais"],
  },
  {
    id: "espaco-reservas-agenda",
    icone: "calendar",
    pergunta: "Como acompanho reservas e horários do meu espaço?",
    resposta:
      "Use a Agenda do painel do espaço. Ela concentra reservas, horários configurados e disponibilidade das unidades. Se um horário não aparece para o atleta, confira se a unidade está ativa, se o dia está aberto e se não há bloqueio por feriado, pagamento ou limite do plano.",
    ocultarSeModulosEmBreve: ["locais"],
  },
  {
    id: "espaco-socios-planos",
    icone: "team",
    pergunta: "Para que serve a área de Sócios?",
    resposta:
      "A área de Sócios organiza membros do local, planos de associação e benefícios. Ela é útil para clubes e espaços que têm mensalidade, reservas gratuitas por semana, filas ou regras diferentes para associados e avulsos.",
    ocultarSeModulosEmBreve: ["locais"],
  },
  {
    id: "espaco-financeiro-paas",
    icone: "store",
    pergunta: "Por que o painel fala de Financeiro, mensalidade ou Asaas?",
    resposta:
      "O Financeiro cuida de dois lados: a mensalidade da plataforma para manter o painel ativo e a integração de recebimentos para reservas ou planos pagos. O Asaas é usado quando o espaço precisa gerar cobranças online e organizar pagamentos.",
    ocultarSeModulosEmBreve: ["locais"],
  },
  {
    id: "espaco-nao-consigo-publicar",
    icone: "account",
    pergunta: "Não consigo publicar ou continuar a configuração. O que verifico?",
    resposta:
      "Confira se o perfil do espaço tem nome/cidade, se existe pelo menos uma unidade cadastrada e se os horários foram definidos. Em alguns modelos, também é preciso resolver pendências de mensalidade, integração de pagamento ou validação do espaço.",
    ocultarSeModulosEmBreve: ["locais"],
  },
];

export const SUPPORT_ESPACO_OPERACAO_FAQ: SupportFaqItem[] = [
  {
    id: "espaco-gratuita-paga-mista",
    icone: "venue",
    pergunta: "Qual a diferença entre reserva gratuita, paga e mista?",
    resposta:
      "Gratuita é indicada para locais em que sócios reservam sem cobrança por reserva. Paga cobra toda reserva. Mista combina os dois: sócios podem ter benefício ou gratuidade, enquanto avulsos pagam para reservar.",
    ocultarSeModulosEmBreve: ["locais"],
  },
  {
    id: "espaco-unidades-limite",
    icone: "venue",
    pergunta: "Por que não consigo adicionar mais quadras/unidades?",
    resposta:
      "O limite pode estar ligado ao plano contratado da plataforma ou a uma pendência financeira. Veja a área Financeiro do painel; se o plano atual não comporta mais unidades, altere o plano ou fale com suporte.",
    ocultarSeModulosEmBreve: ["locais"],
  },
  {
    id: "espaco-whatsapp-contato",
    icone: "account",
    pergunta: "Qual WhatsApp aparece para atletas?",
    resposta:
      "O WhatsApp de contato do Perfil público do espaço é o canal exibido para atletas e usado pela equipe em suporte operacional do local. Use um número do atendimento do espaço, com país e DDD corretos.",
    ocultarSeModulosEmBreve: ["locais"],
  },
  {
    id: "espaco-asaas-integracao",
    icone: "store",
    pergunta: "Quando preciso configurar o Asaas?",
    resposta:
      "Configure o Asaas quando quiser receber pagamentos online por reservas, planos de sócios ou outras cobranças do espaço. Se o local operar apenas com reservas gratuitas, a integração pode ficar para depois, dependendo do modelo escolhido.",
    ocultarSeModulosEmBreve: ["locais"],
  },
];
