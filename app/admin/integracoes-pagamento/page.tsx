import Link from "next/link";

function flag(ok: boolean) {
  return ok ? (
    <span className="text-emerald-300">Configurado</span>
  ) : (
    <span className="text-amber-200">Não encontrado</span>
  );
}

export default function AdminIntegracoesPagamentoPage() {
  const hasKey = Boolean(process.env.ASAAS_API_KEY?.trim());
  const baseUrl = process.env.ASAAS_API_BASE_URL?.trim() || "https://api.asaas.com/v3 (padrão)";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-eid-fg">Asaas — conta de recebimento</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          No Asaas, o <strong>API token</strong> da sua conta define para qual carteira os pagamentos criados pela API serão
          creditados. Não há “segunda conta” no app: configure a chave no ambiente do servidor (Vercel, Hostinger, Docker, etc.).
        </p>
      </div>

      <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h3 className="text-sm font-bold text-eid-fg">Variáveis de ambiente</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2 border-b border-[color:var(--eid-border-subtle)]/50 py-2">
            <dt className="font-mono text-xs text-eid-text-secondary">ASAAS_API_KEY</dt>
            <dd className="text-eid-fg">{flag(hasKey)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-b border-[color:var(--eid-border-subtle)]/50 py-2">
            <dt className="font-mono text-xs text-eid-text-secondary">ASAAS_API_BASE_URL</dt>
            <dd className="max-w-md text-right text-xs text-eid-fg">{baseUrl}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-eid-text-secondary">
          A chave nunca é exibida aqui. Em produção, use o token do painel Asaas em <strong>Integrações → API</strong>.
        </p>
        <a
          href="https://www.asaas.com/painel/integracoes"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm font-semibold text-eid-primary-300 underline"
        >
          Abrir Asaas (integrações)
        </a>
      </section>

      <section className="rounded-xl border border-eid-text-secondary/20 bg-eid-bg/30 p-4 text-sm text-eid-text-secondary">
        <h3 className="text-sm font-bold text-eid-fg">Webhooks</h3>
        <p className="mt-2">
          O endpoint de webhook do projeto (se habilitado) fica em <code className="text-eid-primary-300">/api/asaas/webhook</code> —
          aponte a URL pública do seu deploy no Asaas para atualizar status de pagamentos.
        </p>
        <p className="mt-2">
          Dúvidas de taxa global e percentuais sobre o gateway:{" "}
          <Link className="font-semibold text-eid-primary-300 hover:underline" href="/admin/financeiro">
            Admin → Financeiro
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
