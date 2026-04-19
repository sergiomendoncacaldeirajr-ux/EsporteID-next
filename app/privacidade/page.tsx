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
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-eid-fg">
        Política de Privacidade
      </h1>
      <p className="mt-4 text-sm leading-relaxed">
        Esta Política descreve como o EsporteID (“nós”) trata dados pessoais na
        plataforma, em conformidade com a Lei nº 13.709/2018 (Lei Geral de
        Proteção de Dados Pessoais — LGPD). Ao usar o serviço, você fica ciente
        destas regras, em conjunto com os{" "}
        <Link href="/termos" className="font-medium text-eid-primary-300 underline hover:text-eid-fg">
          Termos de Uso
        </Link>
        .
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          1. Controlador e encarregado
        </h2>
        <p className="text-sm leading-relaxed">
          O controlador dos dados pessoais tratados por meio da Plataforma é
          ESPORTEID - CNPJ 66.343.704/0001-75, com sede na Rua Quartzo, 705, Iguaçu, Ipatinga/MG,
          CEP 35162-113, e contato principal em contato@esporteid.com. O
          encarregado de proteção de dados (DPO), quando nomeado, poderá ser
          contatado pelo canal divulgado no site ou no aplicativo. Você também
          pode exercer seus direitos pela área{" "}
          <Link href="/conta/dados-lgpd" className="text-eid-primary-300 underline hover:text-eid-fg">
            Seus dados
          </Link>
          , quando logado.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          2. Quais dados coletamos
        </h2>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed">
          <li>
            <strong>Dados de cadastro e perfil:</strong> nome, e-mail, telefone,
            localização, foto, preferências esportivas e demais campos que você
            optar por preencher.
          </li>
          <li>
            <strong>Dados de uso:</strong> interações na Plataforma (partidas,
            torneios, notificações, logs técnicos necessários à segurança).
          </li>
          <li>
            <strong>Dados de pagamento:</strong> quando houver transações,
            dados podem ser tratados diretamente por provedores de pagamento
            certificados; podemos receber identificadores de transação e status.
          </li>
          <li>
            <strong>Dados sensíveis:</strong> só serão tratados quando
            estritamente necessários e com base legal adequada (ex.: consentimento
            específico), conforme a LGPD.
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          3. Bases legais (art. 7º da LGPD)
        </h2>
        <p className="text-sm leading-relaxed">
          Tratamos dados com fundamento em: execução de contrato ou de
          procedimentos preliminares (cadastro e uso do serviço); cumprimento de
          obrigação legal; legítimo interesse, quando aplicável (segurança,
          melhoria do produto, prevenção a fraudes), observados seus direitos;
          e consentimento, quando exigido — por exemplo, comunicações de
          marketing opcionais ou cookies não essenciais, quando implementados.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          4. Com quem compartilhamos
        </h2>
        <p className="text-sm leading-relaxed">
          Podemos compartilhar dados com prestadores que nos auxiliam a operar a
          Plataforma, como hospedagem, banco de dados em nuvem e autenticação,
          processamento de pagamentos (ex.: Asaas ou outros gateways) e
          ferramentas de e-mail. Esses parceiros devem tratar os dados conforme
          instruções e contratos compatíveis com a LGPD. Transferências
          internacionais, se ocorrerem, observarão as salvaguardas legais
          aplicáveis.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          5. Armazenamento e segurança
        </h2>
        <p className="text-sm leading-relaxed">
          Adotamos medidas técnicas e organizacionais razoáveis para proteger dados
          contra acessos não autorizados, perda ou alteração indevida. Nenhum
          sistema é totalmente isento de risco; por isso reforçamos o uso de senha
          forte e a não compartilhamento de credenciais.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          6. Seus direitos (art. 18 da LGPD)
        </h2>
        <p className="text-sm leading-relaxed">
          Você pode solicitar confirmação de tratamento, acesso, correção,
          anonimização, portabilidade, informação sobre compartilhamento,
          revogação do consentimento (quando aplicável) e eliminação dos dados
          tratados com seu consentimento, respeitadas as exceções legais. Use a
          página{" "}
          <Link href="/conta/dados-lgpd" className="text-eid-primary-300 underline hover:text-eid-fg">
            Seus dados
          </Link>{" "}
          ou os canais de contato quando disponíveis. Responderemos no prazo
          legal ou informaremos motivo de prorrogação justificada.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          7. Retenção
        </h2>
        <p className="text-sm leading-relaxed">
          Mantemos dados pelo tempo necessário para cumprir as finalidades
          descritas, obrigações legais (ex.: fiscais) ou resolução de litígios.
          Após isso, dados podem ser eliminados ou anonimizados.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          8. Cookies e tecnologias semelhantes
        </h2>
        <p className="text-sm leading-relaxed">
          Podemos usar cookies ou tecnologias equivalentes para sessão, preferências
          e métricas. Você pode gerenciar cookies no navegador. Cookies estritamente
          necessários ao funcionamento do serviço podem não exigir consentimento,
          conforme a legislação e diretrizes aplicáveis.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">
          9. Atualizações
        </h2>
        <p className="text-sm leading-relaxed">
          Podemos atualizar esta Política. A versão vigente será indicada no topo
          desta página. Alterações relevantes podem exigir novo consentimento ou
          aviso destacado, conforme a lei.
        </p>
      </section>
    </article>
  );
}
