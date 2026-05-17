import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Suporte · EsporteID",
  description: "Canais públicos de suporte e orientações de ajuda do EsporteID",
};

export default function SuportePage() {
  return (
    <article
      data-eid-public-legal
      data-eid-touch-ui
      className="eid-public-legal-page mx-auto max-w-3xl flex-1 px-4 py-12 text-eid-text-secondary"
    >
      <p className="text-sm text-eid-text-muted">Suporte público</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-eid-fg">Suporte EsporteID</h1>
      <p className="mt-4 text-sm leading-relaxed">
        Se você precisa de ajuda com cadastro, perfil, partidas, torneios, espaços, pagamentos ou acesso à conta,
        use os canais abaixo. Para análise da App Store e atendimento inicial, esta página funciona como canal
        público de suporte do EsporteID.
      </p>

      <section className="mt-10 space-y-3 rounded-2xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-5">
        <h2 className="text-lg font-semibold text-eid-fg">Contato principal</h2>
        <p className="text-sm leading-relaxed">
          E-mail de suporte: <strong className="text-eid-fg">contato@esporteid.com</strong>
        </p>
        <p className="text-sm leading-relaxed">
          Prazo inicial de resposta: <strong className="text-eid-fg">até 2 horas úteis</strong>, conforme fila e horário de atendimento.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">Se você já tem conta</h2>
        <p className="text-sm leading-relaxed">
          Entre no app e use a central de suporte interna para abrir um chamado com a equipe. O retorno é feito pelo WhatsApp cadastrado no seu perfil. Se precisar atualizar o número antes, faça isso em{" "}
          <Link href="/editar/perfil" className="text-eid-primary-300 underline hover:text-eid-fg">
            Editar perfil
          </Link>
          .
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-eid-fg">Privacidade, LGPD e exclusão de conta</h2>
        <p className="text-sm leading-relaxed">
          As regras de tratamento de dados estão em{" "}
          <Link href="/privacidade" className="text-eid-primary-300 underline hover:text-eid-fg">
            Política de Privacidade
          </Link>
          . Os termos gerais de uso estão em{" "}
          <Link href="/termos" className="text-eid-primary-300 underline hover:text-eid-fg">
            Termos de Uso
          </Link>
          .
        </p>
        <p className="text-sm leading-relaxed">
          Se você já possui conta, pode registrar pedido de cópia de dados ou exclusão em{" "}
          <Link href="/conta/dados-lgpd" className="text-eid-primary-300 underline hover:text-eid-fg">
            Seus dados (LGPD)
          </Link>
          . Se estiver sem acesso à conta, envie um e-mail para contato@esporteid.com informando o problema.
        </p>
      </section>

      <section className="mt-8 space-y-3 rounded-2xl border border-eid-border-subtle bg-eid-card/60 p-5">
        <h2 className="text-lg font-semibold text-eid-fg">Ajuda rápida</h2>
        <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed">
          <li>Problemas de login ou cadastro</li>
          <li>Dúvidas sobre partidas, torneios, ranking e desafios</li>
          <li>Ajuda com espaços, reservas e pagamentos quando aplicável</li>
          <li>Apoio para atualização de dados da conta e contato</li>
        </ul>
      </section>
    </article>
  );
}
