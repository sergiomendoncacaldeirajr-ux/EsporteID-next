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
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-eid-fg">
        Termos de Uso
      </h1>
      <p className="mt-4 text-sm leading-relaxed">
        Estes Termos regem o uso da plataforma EsporteID (“Plataforma”), operada
        de forma a conectar atletas, organizadores, espaços esportivos e demais
        usuários. Ao criar conta ou utilizar os serviços, você declara ter lido
        e concordado com estes Termos e com a nossa{" "}
        <Link href="/privacidade" className="font-medium text-eid-primary-300 underline hover:text-eid-fg">
          Política de Privacidade
        </Link>
        .
      </p>
      <div className="mt-4 rounded-xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-4 text-sm leading-relaxed">
        <p>
          <strong className="font-semibold text-eid-fg">Operador da Plataforma:</strong>{" "}
          ESPORTEID - CNPJ 66.343.704/0001-75.
        </p>
        <p className="mt-2">
          <strong className="font-semibold text-eid-fg">Endereço:</strong> Rua Quartzo, 705, Iguaçu,
          Ipatinga/MG, CEP 35162-113.
        </p>
        <p className="mt-2">
          <strong className="font-semibold text-eid-fg">Contato:</strong> contato@esporteid.com
        </p>
      </div>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          1. Definições e aceite
        </h2>
        <p className="text-sm leading-relaxed">
          O uso da Plataforma implica aceite integral destes Termos e das
          políticas vigentes. Se não concordar, não utilize o serviço. Podemos
          atualizar os Termos; a versão aplicável será a publicada no site, com
          indicação de data ou versão. O uso continuado após alterações constitui
          ciência, salvo quando a lei exigir consentimento específico.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-eid-fg">
          2. Cadastro e conta
        </h2>
        <p className="text-sm leading-relaxed">
          Você deve fornecer dados verídicos e manter login e senha sob sua
          responsabilidade. É proibido criar perfis falsos, suplantar terceiros
          ou usar a Plataforma para fins ilícitos. Podemos suspender ou encerrar
          contas que violem estes Termos, a lei ou direitos de terceiros.
        </p>
        <div className="space-y-2 rounded-xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-4">
          <h3 className="text-base font-semibold text-eid-fg">
            2.1 Número de WhatsApp (obrigatório) e comunicações
          </h3>
          <p className="text-sm leading-relaxed">
            O cadastro na Plataforma exige o fornecimento de um{" "}
            <strong className="font-semibold text-eid-fg">
              número de telefone móvel associado a uma conta WhatsApp
            </strong>{" "}
            válida, ativa e acessível ao titular da conta. Esse requisito tem
            caráter <strong className="font-semibold text-eid-fg">obrigatório</strong>{" "}
            para a celebração e a execução do contrato de uso dos serviços,
            na medida em que o WhatsApp é adotado como{" "}
            <strong className="font-semibold text-eid-fg">
              canal principal de comunicação
            </strong>{" "}
            entre a Plataforma e o usuário para fins operacionais, incluindo,
            de forma exemplificativa: avisos sobre serviços, partidas, torneios e
            eventos; confirmações e autenticações quando aplicáveis; e suporte
            relacionado ao uso da Plataforma, no limite necessário à prestação do
            serviço e ao cumprimento de obrigações legais ou regulatórias.
          </p>
          <p className="text-sm leading-relaxed">
            Ao informar o número, você declara ser titular da linha ou possuir
            autorização para utilizá-la neste contexto e{" "}
            <strong className="font-semibold text-eid-fg">
              consente em receber comunicações
            </strong>{" "}
            da Plataforma nesse canal, estritamente relacionadas à relação
            contratual e ao serviço contratado. É sua responsabilidade{" "}
            <strong className="font-semibold text-eid-fg">
              manter o número correto e atualizado
            </strong>{" "}
            nas configurações da conta; a indisponibilidade, incorreção ou
            bloqueio de comunicações pode afetar o uso de funcionalidades ou a
            continuidade do serviço, nos limites da lei.
          </p>
          <p className="text-sm leading-relaxed">
            O aplicativo WhatsApp é <strong className="font-semibold text-eid-fg">serviço de terceiro</strong>{" "}
            (Meta Platforms, Inc. e empresas do grupo), regido por termos e
            políticas próprios; o uso do WhatsApp pelo usuário permanece sujeito
            àqueles instrumentos. O{" "}
            <strong className="font-semibold text-eid-fg">tratamento dos dados pessoais</strong>{" "}
            fornecidos no cadastro, inclusive número de telefone e metadados
            técnicos eventualmente gerados no fluxo de comunicação, é descrito na{" "}
            <Link href="/privacidade" className="font-medium text-eid-primary-300 underline hover:text-eid-fg">
              Política de Privacidade
            </Link>
            , em conformidade com a Lei nº 13.709/2018 (LGPD).
          </p>
        </div>
        <div className="space-y-2 rounded-xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-4">
          <h3 className="text-base font-semibold text-eid-fg">
            2.2 Idade mínima, cadastro e encontros entre usuários
          </h3>
          <p className="text-sm leading-relaxed">
            O cadastro na Plataforma é permitido apenas a pessoas{" "}
            <strong className="font-semibold text-eid-fg">maiores de 18 (dezoito) anos</strong>, com
            capacidade civil compatível com o uso dos serviços. Ao criar conta, você declara que as
            informações fornecidas — inclusive{" "}
            <strong className="font-semibold text-eid-fg">data de nascimento</strong> — são
            verdadeiras e que atende a esse requisito etário.
          </p>
          <p className="text-sm leading-relaxed">
            A EsporteID é uma plataforma de esporte e relacionamento entre usuários (por exemplo,
            combinar <strong className="font-semibold text-eid-fg">partidas, treinos, encontros
            esportivos ou contato após match</strong>). No ordenamento jurídico brasileiro, crianças e
            adolescentes merecem proteção especial (inclusive sob a perspectiva do Estatuto da
            Criança e do Adolescente — Lei nº 8.069/1990). Por isso,{" "}
            <strong className="font-semibold text-eid-fg">
              funcionalidades que envolvam interação direta entre usuários, marcação de encontros
              presenciais ou uso de canais como o WhatsApp para esse fim são destinadas exclusivamente
              a maiores de 18 anos
            </strong>
            . É vedado o uso da Plataforma por menores de 18 anos; a violação pode implicar suspensão
            ou exclusão da conta e comunicações às autoridades quando a lei assim exigir.
          </p>
          <p className="text-sm leading-relaxed">
            A Plataforma não se destina a fins de relacionamento romântico ou sexual entre adultos e
            menores; conteúdo ou conduta ilícita, inclusive envolvendo menores, pode ser removido e
            reportado conforme a legislação aplicável.
          </p>
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          3. Serviços e limitações
        </h2>
        <p className="text-sm leading-relaxed">
          A Plataforma oferece ferramentas de cadastro, agenda, partidas,
          torneios, rankings e integrações (incluindo pagamentos quando
          disponíveis). Funcionalidades podem mudar ou ficar indisponíveis por
          manutenção ou força maior. Resultados esportivos e classificações têm
          caráter informativo; organizadores e atletas são responsáveis pela
          conferência em campo.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          4. Conteúdo e conduta
        </h2>
        <p className="text-sm leading-relaxed">
          Você é responsável pelo conteúdo que publica (textos, imagens, vídeos).
          Não é permitido assédio, discurso de ódio, pornografia envolvendo
          menores, incitação à violência ou qualquer uso que viole a legislação
          brasileira. Podemos remover conteúdo e cooperar com autoridades quando
          exigido por lei.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          5. Pagamentos e terceiros
        </h2>
        <p className="text-sm leading-relaxed">
          Transações financeiras podem ser processadas por parceiros (por
          exemplo, gateways de pagamento). Condições comerciais, taxas e
          estornos segem o contrato entre as partes e as regras do provedor de
          pagamento. A Plataforma não se substitui a assessoria jurídica ou
          contábil.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          6. Propriedade intelectual
        </h2>
        <p className="text-sm leading-relaxed">
          Marcas, layout, código e conteúdo da Plataforma são protegidos. É
          vedada cópia não autorizada. Você concede licença não exclusiva para
          exibir, no serviço, o conteúdo que enviar, na medida necessária à
          operação da Plataforma.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          7. Limitação de responsabilidade
        </h2>
        <p className="text-sm leading-relaxed">
          Na extensão permitida pela lei aplicável, a Plataforma é oferecida “no
          estado em que se encontra”. Não garantimos disponibilidade ininterrupta
          ou ausência de erros. Não nos responsabilizamos por danos indiretos,
          lucros cessantes ou perdas decorrentes de uso de links de terceiros.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          8. Lei e foro
        </h2>
        <p className="text-sm leading-relaxed">
          Estes Termos são regidos pelas leis da República Federativa do Brasil.
          Fica eleito o foro da comarca de domicílio do consumidor para
          demandas em que for aplicável o Código de Defesa do Consumidor; nos
          demais casos, aplicam-se as regras processuais vigentes.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          9. Contato
        </h2>
        <p className="text-sm leading-relaxed">
          Para questões sobre estes Termos ou sobre tratamento de dados pessoais, utilize
          contato@esporteid.com, os canais indicados na Política de Privacidade ou o
          próprio aplicativo, quando disponíveis.
        </p>
      </section>
    </article>
  );
}
