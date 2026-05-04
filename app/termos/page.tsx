import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

export const metadata: Metadata = {
  title: "Termos de Uso · EsporteID",
  description: "Termos e condições gerais de uso da plataforma EsporteID",
};

export default function TermosPage() {
  return (
    <article className="mx-auto max-w-3xl flex-1 px-4 py-12 text-eid-text-secondary">
      <p className="text-sm text-eid-text-muted">Versão {LEGAL_VERSIONS.termos}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-eid-fg">Termos de Uso</h1>
      <p className="mt-4 text-sm leading-relaxed">
        Estes Termos regem o uso da plataforma EsporteID (“Plataforma”), operada para conectar atletas,
        organizadores, espaços esportivos, professores e demais usuários. Ao criar conta ou utilizar os
        serviços, você declara ter lido e concordado com estes Termos e com a nossa{" "}
        <Link href="/privacidade" className="font-medium text-eid-primary-300 underline hover:text-eid-fg">
          Política de Privacidade
        </Link>
        , em conformidade com a Lei nº 13.709/2018 (LGPD) e demais leis aplicáveis no Brasil.
      </p>
      <div className="mt-4 rounded-xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-4 text-sm leading-relaxed">
        <p>
          <strong className="font-semibold text-eid-fg">Operador da Plataforma:</strong> ESPORTEID - CNPJ
          66.343.704/0001-75.
        </p>
        <p className="mt-2">
          <strong className="font-semibold text-eid-fg">Endereço:</strong> Rua Quartzo, 705, Iguaçu, Ipatinga/MG,
          CEP 35162-113.
        </p>
        <p className="mt-2">
          <strong className="font-semibold text-eid-fg">Contato:</strong> contato@esporteid.com
        </p>
      </div>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">1. Definições e aceite</h2>
        <p className="text-sm leading-relaxed">
          O uso da Plataforma implica aceite integral destes Termos e das políticas vigentes. Se não
          concordar, não utilize o serviço. Podemos atualizar os Termos; a versão aplicável é a publicada
          neste endereço, com indicação de versão. O uso continuado após alterações constitui ciência,
          salvo quando a lei exigir consentimento específico ou novo aceite registrado (por exemplo, após
          mudança relevante dos documentos legais).
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-eid-fg">2. Cadastro e conta</h2>
        <p className="text-sm leading-relaxed">
          Você deve fornecer dados verídicos e manter login e senha sob sua responsabilidade. É proibido
          criar perfis falsos, suplantar terceiros ou usar a Plataforma para fins ilícitos. Podemos suspender
          ou encerrar contas que violem estes Termos, a lei ou direitos de terceiros, inclusive mediante
          análise de denúncias e alertas internos de moderação.
        </p>
        <div className="space-y-2 rounded-xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-4">
          <h3 className="text-base font-semibold text-eid-fg">2.1 Número de WhatsApp (obrigatório) e comunicações</h3>
          <p className="text-sm leading-relaxed">
            O cadastro exige um{" "}
            <strong className="font-semibold text-eid-fg">número de telefone móvel com WhatsApp</strong> válido
            e acessível. Esse canal é usado como{" "}
            <strong className="font-semibold text-eid-fg">meio operacional de comunicação</strong> (avisos sobre
            serviços, partidas, torneios, autenticações quando aplicáveis e suporte), no limite necessário à
            prestação do serviço e ao cumprimento de obrigações legais. Ao informar o número, você declara ser
            titular ou estar autorizado e{" "}
            <strong className="font-semibold text-eid-fg">consente em receber mensagens</strong> relacionadas à
            relação contratual. Mantenha o número atualizado. O WhatsApp é serviço de terceiro (Meta); o
            tratamento de dados pessoais está descrito na{" "}
            <Link href="/privacidade" className="font-medium text-eid-primary-300 underline hover:text-eid-fg">
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
        <div className="space-y-2 rounded-xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-4">
          <h3 className="text-base font-semibold text-eid-fg">2.2 Idade mínima, cadastro e interação entre usuários</h3>
          <p className="text-sm leading-relaxed">
            Funcionalidades que envolvam{" "}
            <strong className="font-semibold text-eid-fg">
              interação direta entre usuários para combinar partidas, desafios, encontros esportivos ou contato
              após combinar desafios
            </strong>{" "}
            (incluindo a função <strong className="font-semibold text-eid-fg">Desafio</strong> e o{" "}
            <strong className="font-semibold text-eid-fg">radar de encontros</strong>) são permitidas apenas a
            pessoas <strong className="font-semibold text-eid-fg">maiores de 18 (dezoito) anos</strong>. O
            sistema pode solicitar confirmação explícita de maioridade, com registro de data/hora, endereço IP,
            dados do navegador e metadados necessários à comprovação e à LGPD. O cadastro pode incluir data de
            nascimento; a confirmação específica para o Desafio pode ocorrer em fluxo próprio.
          </p>
          <p className="text-sm leading-relaxed">
            Em determinados casos, a Plataforma pode oferecer{" "}
            <strong className="font-semibold text-eid-fg">verificação de idade</strong> com envio de documento
            e autorretrato, podendo utilizar serviços automatizados de comparação facial (por exemplo, AWS
            Rekognition), conforme detalhado na Política de Privacidade. A recusa ou falha na verificação,
            quando exigida, pode limitar funcionalidades.
          </p>
          <p className="text-sm leading-relaxed">
            Crianças e adolescentes merecem proteção especial (ECA — Lei nº 8.069/1990). Funcionalidades que
            envolvam interação direta, marcação de encontros presenciais ou uso de canais como o WhatsApp para
            esse fim são <strong className="font-semibold text-eid-fg">destinadas exclusivamente a maiores de
            18 anos</strong>. É vedado o uso por menores nas condições descritas; a violação pode implicar
            suspensão, exclusão e comunicação às autoridades quando a lei exigir. A Plataforma não se destina a
            fins ilícitos envolvendo menores.
          </p>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-eid-fg">3. Serviços, funcionalidades e limitações</h2>
        <p className="text-sm leading-relaxed">
          A Plataforma reúne, conforme disponibilidade e configuração (incluindo modos “em breve”, “em teste”
          ou desativados pelo operador), funcionalidades tais como:
        </p>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed">
          <li>
            <strong className="text-eid-fg">Perfil e conta:</strong> dados de perfil públicos ou restritos,
            preferências de esporte, disponibilidade para amistoso, performance EID, histórico e equipamentos.
          </li>
          <li>
            <strong className="text-eid-fg">Radar / Match:</strong> descoberta de outros usuários e formações
            com base em localização, esporte e filtros; combinar desafios de ranking ou amistoso.
          </li>
          <li>
            <strong className="text-eid-fg">Desafios e partidas:</strong> pedidos de desafio (tabela{" "}
            <em>matches</em>), aceite, criação de partidas, ranking com regras e cooldown configuráveis,
            sugestões de desafio por membros de equipe e convites para times/duplas.
          </li>
          <li>
            <strong className="text-eid-fg">Agenda:</strong> visão de jogos agendados e ajuste de data/local
            quando permitido; o lançamento e a confirmação de placar podem ocorrer em fluxo próprio (por
            exemplo, painel social).
          </li>
          <li>
            <strong className="text-eid-fg">Painel social (comunidade):</strong> ações pendentes que exigem
            resposta (por exemplo desafios, convites e placar); avisos gerais ficam no sininho de notificações.
          </li>
          <li>
            <strong className="text-eid-fg">Registrar resultado:</strong> envio de placar, agendamento
            opcional, confirmação, contestação e regras de validação/autoaprovação conforme parâmetros do
            sistema.
          </li>
          <li>
            <strong className="text-eid-fg">Ranking e EID:</strong> pontuação, histórico, regras de motor e
            auditoria administrativa quando existente.
          </li>
          <li>
            <strong className="text-eid-fg">Torneios e organização:</strong> criação, chaves, inscrições e
            partidas de torneio, com permissões específicas para organizadores e staff.
          </li>
          <li>
            <strong className="text-eid-fg">Locais e espaços:</strong> cadastro, reivindicação, sócios,
            reservas e módulos financeiros associados quando ativos.
          </li>
          <li>
            <strong className="text-eid-fg">Professores e aulas:</strong> perfil de professor, solicitações,
            aulas, pagamentos e taxas quando a funcionalidade estiver ativa.
          </li>
          <li>
            <strong className="text-eid-fg">Notificações:</strong> alertas in-app e, se você ativar,{" "}
            <strong className="text-eid-fg">notificações push</strong> via navegador (Web Push), com
            armazenamento de dados da inscrição conforme a Política de Privacidade. Quando ativo, parte das
            atualizações pode ser entregue em <strong className="text-eid-fg">tempo quase real</strong> (canais
            de assinatura via infraestrutura do serviço), para refletir convites, desafios e alertas sem que
            você precise recarregar a página manualmente.
          </li>
          <li>
            <strong className="text-eid-fg">Dashboard (painel):</strong> visão personalizada após o login, com
            atalhos, resumo da sua agenda, indicadores de EID ou performance quando disponíveis, e sugestões
            operacionais (por exemplo confrontos ou formações próximas) calculadas com base em localização,
            esporte, disponibilidade e regras internas do produto — sempre sujeitas a mudança de critério ou
            indisponibilidade temporária. O painel pode apontar{" "}
            <strong className="text-eid-fg">duplas, times ou vagas em recrutamento</strong> conforme dados
            públicos ou da sua rede na Plataforma.
          </li>
          <li>
            <strong className="text-eid-fg">Desafio e radar (Match):</strong> além do{" "}
            <strong className="text-eid-fg">radar</strong> para descobrir oponentes e formações no mapa ou
            lista (filtros por esporte, distância e finalidade), existe fluxo dedicado de{" "}
            <strong className="text-eid-fg">Desafio</strong> para enviar e acompanhar pedidos de ranking ou
            amistoso, com regras de esporte, cooldown e permissões de líderes/membros quando aplicável.
          </li>
          <li>
            <strong className="text-eid-fg">Reservas em espaços:</strong> quando o espaço (academia, quadra
            etc.) disponibilizar o módulo, você pode solicitar ou gerenciar reservas de horários, sujeito às
            políticas do estabelecimento e a integrações de pagamento quando ativas.
          </li>
          <li>
            <strong className="text-eid-fg">Denúncias:</strong> canal para relatar condutas ou conteúdos; a
            moderação pode envolver analistas e administradores da plataforma.
          </li>
          <li>
            <strong className="text-eid-fg">Dados e LGPD:</strong> área logada para exercício de direitos (por
            exemplo, exportação ou pedido de exclusão, conforme possível e a lei).
          </li>
        </ul>
        <p className="text-sm leading-relaxed">
          Funcionalidades podem mudar, ser descontinuadas ou ficar temporariamente indisponíveis por manutenção
          ou força maior. Sugestões automáticas (incluindo no painel ou no radar) são auxiliares e não garantem
          disponibilidade de adversários, vagas ou horários. Resultados esportivos, rankings e placares têm
          caráter informativo no ecossistema da Plataforma; organizadores, atletas e espaços são responsáveis
          pela conferência em campo e pelo cumprimento de regulamentos aplicáveis.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">4. Conteúdo e conduta</h2>
        <p className="text-sm leading-relaxed">
          Você é responsável pelo conteúdo que publica (textos, imagens, vídeos, mensagens). Não é permitido
          assédio, discriminação ilícita, discurso de ódio, pornografia envolvendo menores, incitação à
          violência, fraude ou qualquer uso que viole a legislação brasileira. Podemos remover conteúdo,
          restringir funcionalidades e cooperar com autoridades quando exigido por lei ou por ordem judicial
          competente.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">5. Pagamentos e terceiros</h2>
        <p className="text-sm leading-relaxed">
          Transações financeiras podem ser processadas por parceiros (por exemplo, gateways de pagamento como
          Asaas ou outros). Condições comerciais, taxas, repasses e estornos seguem o contrato entre as partes
          e as regras do provedor. A Plataforma não substitui assessoria jurídica, contábil ou tributária.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">6. Propriedade intelectual</h2>
        <p className="text-sm leading-relaxed">
          Marcas, layout, código, banco de dados de titularidade do operador e conteúdo original da Plataforma
          são protegidos. É vedada cópia não autorizada. Você concede licença não exclusiva, gratuita e
          revogável na medida necessária para exibir, no serviço, o conteúdo que enviar, sem prejuízo dos seus
          direitos sobre o que for de sua autoria.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">7. Limitação de responsabilidade</h2>
        <p className="text-sm leading-relaxed">
          Na extensão permitida pela lei aplicável, a Plataforma é oferecida “no estado em que se encontra”.
          Não garantimos disponibilidade ininterrupta ou ausência de erros. Não nos responsabilizamos por danos
          indiretos, lucros cessantes ou perdas decorrentes de uso de links, serviços ou conteúdos de
          terceiros (incluindo WhatsApp, provedores de pagamento ou serviços de nuvem).
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">8. Lei aplicável e foro</h2>
        <p className="text-sm leading-relaxed">
          Estes Termos são regidos pelas leis da República Federativa do Brasil. Em relações de consumo, pode
          prevalecer o foro do domicílio do consumidor, conforme o Código de Defesa do Consumidor. Demais
          controvérsias observam a legislação e a competência processual vigentes, sem prejuízo de
          reclamações perante órgãos de defesa do consumidor ou da Autoridade Nacional de Proteção de Dados
          (ANPD), quando cabível.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">9. Contato</h2>
        <p className="text-sm leading-relaxed">
          Para questões sobre estes Termos ou sobre tratamento de dados pessoais, utilize contato@esporteid.com
          ou os canais indicados na{" "}
          <Link href="/privacidade" className="font-medium text-eid-primary-300 underline hover:text-eid-fg">
            Política de Privacidade
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
