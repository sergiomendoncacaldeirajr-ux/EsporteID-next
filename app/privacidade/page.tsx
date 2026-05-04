import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

export const metadata: Metadata = {
  title: "Política de Privacidade · EsporteID",
  description: "Transparência e LGPD — tratamento de dados pessoais no EsporteID",
};

export default function PrivacidadePage() {
  return (
    <article className="mx-auto max-w-3xl flex-1 px-4 py-12 text-eid-text-secondary">
      <p className="text-sm text-eid-text-muted">Versão {LEGAL_VERSIONS.privacidade}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-eid-fg">Política de Privacidade</h1>
      <p className="mt-4 text-sm leading-relaxed">
        Esta Política descreve como o EsporteID (“nós”, “operador”) trata dados pessoais na plataforma, em
        conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD). Ao usar o
        serviço, você fica ciente destas regras, em conjunto com os{" "}
        <Link href="/termos" className="font-medium text-eid-primary-300 underline hover:text-eid-fg">
          Termos de Uso
        </Link>
        .
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">1. Controlador e encarregado (DPO)</h2>
        <p className="text-sm leading-relaxed">
          O <strong className="text-eid-fg">controlador</strong> dos dados pessoais tratados por meio da
          Plataforma é <strong className="text-eid-fg">ESPORTEID</strong> — CNPJ 66.343.704/0001-75, com sede na
          Rua Quartzo, 705, Iguaçu, Ipatinga/MG, CEP 35162-113. Contato principal:{" "}
          <strong className="text-eid-fg">contato@esporteid.com</strong>. O{" "}
          <strong className="text-eid-fg">encarregado de dados (DPO)</strong>, quando formalmente indicado, será
          alcançável pelo mesmo canal ou por endereço divulgado nesta página. Você pode exercer direitos também
          pela área logada{" "}
          <Link href="/conta/dados-lgpd" className="text-eid-primary-300 underline hover:text-eid-fg">
            Seus dados (LGPD)
          </Link>
          , quando disponível.
        </p>
        <p className="text-sm leading-relaxed">
          Em caso de dúvidas sobre tratamento de dados, você pode contatar o controlador ou, se aplicável, a{" "}
          <strong className="text-eid-fg">Autoridade Nacional de Proteção de Dados (ANPD)</strong>, nos termos
          da legislação.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">2. Quais dados pessoais tratamos</h2>
        <p className="text-sm leading-relaxed">
          Conforme as funcionalidades que você utiliza, podemos tratar, entre outros:
        </p>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed">
          <li>
            <strong>Dados de cadastro e autenticação:</strong> nome, e-mail, senha (armazenada de forma
            protegida pelo provedor de autenticação), telefone/WhatsApp, data de nascimento quando informada,
            gênero quando informado.
          </li>
          <li>
            <strong>Dados de perfil e atividade esportiva:</strong> foto (avatar), localização textual ou
            aproximada, coordenadas quando você autoriza o uso no mapa/radar, esportes praticados, EID,
            disponibilidade para amistoso, papéis da conta (atleta, professor, organizador, espaço), dados de
            duplas/times e membros quando aplicável.
          </li>
          <li>
            <strong>Dados de relacionamento na Plataforma:</strong> pedidos e aceites de desafio, partidas,
            placares, mensagens operacionais, convites, sugestões de desafio, notificações in-app, histórico de
            ranking e torneios — incluindo identificação de oponentes e formações envolvidas. Dados exibidos no{" "}
            <strong className="text-eid-fg">painel (dashboard)</strong>, como resumos de agenda ou sugestões de
            confrontos, são derivados dessas informações e de preferências (esporte, localização, disponibilidade
            para amistoso, modo individual/dupla/time), conforme as telas que você utiliza.
          </li>
          <li>
            <strong>Dados técnicos e de segurança:</strong> endereço IP, agente de usuário (navegador),
            registros de data/hora em confirmações (por exemplo, maioridade para o Desafio), logs necessários à
            segurança, prevenção a fraudes e auditoria.
          </li>
          <li>
            <strong>Verificação de idade (quando utilizada):</strong> imagens ou arquivos de documento de
            identificação e autorretrato que você envia; metadados do envio; resultado do processo
            (aprovado/reprovado/pendente); dados derivados de comparação facial quando usamos serviço
            automatizado (por exemplo, <strong className="text-eid-fg">Amazon Web Services — Rekognition</strong>
            ), operado como operador ou suboperador conforme o caso, sob contratos e configurações de
            minimização. <strong className="text-eid-fg">Dados biométricos</strong> ou tratamentos sensíveis,
            quando ocorram, observam base legal específica (em geral consentimento destacado ou cumprimento de
            obrigação legal/regulatória, conforme análise do caso).
          </li>
          <li>
            <strong>Notificações push (Web Push):</strong> se você ativar, armazenamos identificadores da
            inscrição push (URL do endpoint, chaves <em>p256dh</em> e <em>auth</em>), estado ativo/inativo,
            <em>user agent</em> quando disponível e datas de criação/atualização, para entrega de alertas no
            navegador ou PWA.
          </li>
          <li>
            <strong>Conexões em tempo quase real (Realtime):</strong> para atualizar notificações e certos dados
            na interface sem recarregar a página, o navegador pode manter uma conexão assinada a canais do
            provedor de infraestrutura (por exemplo, serviços da Supabase). Tratamos o necessário para autenticar
            a sessão e entregar eventos; o conteúdo visível continua sujeito às permissões da sua conta e às
            políticas de cada tabela ou recurso.
          </li>
          <li>
            <strong>Pagamentos:</strong> dados financeiros completos (cartão etc.) em geral são tratados pelo
            gateway; podemos receber identificadores de transação, status e valores necessários à operação.
          </li>
          <li>
            <strong>Denúncias e moderação:</strong> conteúdo da denúncia, identificadores envolvidos e trilhas
            internas para análise.
          </li>
          <li>
            <strong>Comunicações opcionais de marketing:</strong> apenas se você marcar opção correspondente
            no aceite ou preferências da conta, com registro de data.
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">3. Bases legais (art. 7º da LGPD)</h2>
        <p className="text-sm leading-relaxed">
          Tratamos dados com fundamento em: <strong className="text-eid-fg">execução de contrato</strong> ou de
          procedimentos preliminares (cadastro, uso do serviço, desafios, agenda, pagamentos contratados);{" "}
          <strong className="text-eid-fg">cumprimento de obrigação legal</strong> ou regulatória;{" "}
          <strong className="text-eid-fg">legítimo interesse</strong>, quando aplicável (segurança, melhoria do
          produto, prevenção a fraudes, métricas agregadas), com balanceamento e respeito aos seus direitos;{" "}
          <strong className="text-eid-fg">consentimento</strong>, quando exigido — por exemplo, marketing não
          essencial, cookies não estritamente necessários quando implementados, verificação de idade com
          biometria quando assim tratada, ou ativação explícita de push no navegador.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">4. Compartilhamento e operadores</h2>
        <p className="text-sm leading-relaxed">
          Podemos compartilhar dados com prestadores que nos auxiliam a operar a Plataforma: hospedagem, banco
          de dados (por exemplo, Supabase), autenticação, processamento de pagamentos, envio de e-mail,
          serviços de nuvem e análise de imagem quando ativados. Esses parceiros devem tratar os dados conforme
          instruções contratuais compatíveis com a LGPD. <strong className="text-eid-fg">Outros usuários</strong>{" "}
          podem ver informações que você torna públicas no perfil ou que aparecem em fluxos de desafio, partida
          ou equipe — inclusive líderes e membros de duplas/times que recebem convites, sugestões ou dados de
          placar vinculados à formação. Transferências internacionais, se ocorrerem, observarão salvaguardas
          legais aplicáveis.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">5. Armazenamento, segurança e retenção</h2>
        <p className="text-sm leading-relaxed">
          Adotamos medidas técnicas e organizacionais razoáveis para proteger dados contra acessos não
          autorizados, perda ou alteração indevida. Nenhum sistema é totalmente isento de risco. Mantemos
          dados pelo tempo necessário às finalidades descritas, ao exercício regular de direitos, à resolução
          de litígios ou ao cumprimento de obrigações legais (inclusive fiscais e regulatórias). Após o prazo,
          dados podem ser eliminados ou anonimizados, salvo exceções legais.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">6. Seus direitos (art. 18 da LGPD)</h2>
        <p className="text-sm leading-relaxed">
          Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade (quando
          aplicável), informação sobre compartilhamentos, revogação do consentimento quando o tratamento
          depender dele e eliminação dos dados, respeitadas exceções legais e contratuais. Utilize a página{" "}
          <Link href="/conta/dados-lgpd" className="text-eid-primary-300 underline hover:text-eid-fg">
            Seus dados
          </Link>{" "}
          ou contato@esporteid.com. Responderemos no prazo legal ou informaremos motivo de prorrogação
          justificada.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">7. Cookies, PWA e tecnologias similares</h2>
        <p className="text-sm leading-relaxed">
          Podemos usar cookies, armazenamento local ou tecnologias equivalentes para sessão, preferências,
          desempenho e, quando consentido, métricas. Você pode gerenciar cookies no navegador. Cookies
          estritamente necessários ao funcionamento podem dispensar consentimento, conforme legislação e
          diretrizes aplicáveis. Aplicações instaláveis (PWA) podem usar as mesmas bases técnicas do site para
          sessão e notificações.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">8. Atualizações desta Política</h2>
        <p className="text-sm leading-relaxed">
          Podemos atualizar esta Política. A versão vigente é indicada no topo desta página. Alterações
          relevantes podem exigir novo aviso ou consentimento, conforme a lei, e serão refletidas no registro
          de documentos legais da Plataforma quando aplicável.
        </p>
      </section>
    </article>
  );
}
