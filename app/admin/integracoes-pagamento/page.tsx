import Link from "next/link";

function flag(ok: boolean) {
  return ok ? (
    <span className="text-emerald-300">Configurado</span>
  ) : (
    <span className="text-amber-200">Não encontrado</span>
  );
}

function envText(name: string): string {
  return String(process.env[name] ?? "").trim();
}

type EnvItem = {
  name: string;
  ok: boolean;
  where: string;
  note?: string;
};

function EnvTable({ items }: { items: EnvItem[] }) {
  return (
    <dl className="mt-3 space-y-2 text-sm">
      {items.map((item) => (
        <div key={item.name} className="border-b border-[color:var(--eid-border-subtle)]/50 py-2">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="font-mono text-xs text-eid-text-secondary">{item.name}</dt>
            <dd className="text-eid-fg">{flag(item.ok)}</dd>
          </div>
          <dd className="mt-1 text-xs text-eid-text-secondary">{item.where}</dd>
          {item.note ? <dd className="mt-1 text-xs text-eid-text-muted">{item.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

export default function AdminIntegracoesPagamentoPage() {
  const asaasBaseUrl = envText("ASAAS_API_BASE_URL") || "https://api.asaas.com/v3 (padrão)";
  const hasServiceRole = Boolean(envText("SUPABASE_SERVICE_ROLE_KEY"));
  const hasAndroidAssetLinksJson = Boolean(envText("ANDROID_ASSET_LINKS_JSON"));
  const hasAwsRegion = Boolean(envText("AWS_REGION"));
  const identityMode = envText("IDADE_VERIFY_MODE") || "simulated (padrão sem variável)";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-eid-fg">Integrações do ambiente</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Painel de diagnóstico rápido das APIs/segredos usados no servidor. Aqui mostramos somente se a variável existe no
          deploy atual (nunca exibimos valores sensíveis).
        </p>
      </div>

      <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h3 className="text-sm font-bold text-eid-fg">Base (Supabase + servidor)</h3>
        <EnvTable
          items={[
            {
              name: "NEXT_PUBLIC_SUPABASE_URL",
              ok: Boolean(envText("NEXT_PUBLIC_SUPABASE_URL")),
              where: "wrangler.toml [vars] + workflow do GitHub (build).",
            },
            {
              name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
              ok: Boolean(envText("NEXT_PUBLIC_SUPABASE_ANON_KEY")),
              where: "wrangler.toml [vars] + workflow do GitHub (build).",
            },
            {
              name: "SUPABASE_SERVICE_ROLE_KEY",
              ok: hasServiceRole,
              where: "Cloudflare Worker → Variáveis e segredos → Secret.",
              note: "Necessária para grande parte das telas do Admin.",
            },
          ]}
        />
      </section>

      <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h3 className="text-sm font-bold text-eid-fg">Push e automações (webhook/cron)</h3>
        <EnvTable
          items={[
            {
              name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
              ok: Boolean(envText("NEXT_PUBLIC_VAPID_PUBLIC_KEY")),
              where: "wrangler.toml [vars] + workflow do GitHub (build).",
            },
            {
              name: "VAPID_PRIVATE_KEY",
              ok: Boolean(envText("VAPID_PRIVATE_KEY")),
              where: "Cloudflare Worker → Variáveis e segredos → Secret.",
            },
            {
              name: "VAPID_SUBJECT",
              ok: Boolean(envText("VAPID_SUBJECT")),
              where: "Opcional. Secret ou Texto no Worker.",
              note: "Se ausente, o app usa o padrão interno.",
            },
            {
              name: "EID_PUSH_WEBHOOK_SECRET",
              ok: Boolean(envText("EID_PUSH_WEBHOOK_SECRET")),
              where: "Secret no Worker e mesmo valor no emissor do webhook.",
            },
            {
              name: "CRON_SECRET",
              ok: Boolean(envText("CRON_SECRET")),
              where: "Secret no Worker e mesmo valor no serviço de agendamento.",
            },
          ]}
        />
        <p className="mt-3 text-xs text-eid-text-secondary">
          Diagnóstico detalhado de push:
          {" "}
          <Link className="font-semibold text-eid-primary-300 hover:underline" href="/admin/push">
            Admin → Push (env)
          </Link>
          .
        </p>
      </section>

      <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h3 className="text-sm font-bold text-eid-fg">Pagamentos (Asaas)</h3>
        <EnvTable
          items={[
            {
              name: "ASAAS_API_KEY",
              ok: Boolean(envText("ASAAS_API_KEY")),
              where: "Secret no Worker. Define a conta/carteira usada via API.",
            },
            {
              name: "ASAAS_WEBHOOK_TOKEN",
              ok: Boolean(envText("ASAAS_WEBHOOK_TOKEN")),
              where: "Secret no Worker e mesmo token no painel do Asaas (webhook).",
            },
            {
              name: "ASAAS_API_BASE_URL",
              ok: true,
              where: `Texto no Worker (opcional). Atual: ${asaasBaseUrl}`,
            },
          ]}
        />
        <p className="mt-3 text-xs text-eid-text-secondary">
          Endpoint do webhook no projeto:
          {" "}
          <code className="text-eid-primary-300">/api/asaas/webhook</code>
          . Configure essa URL no Asaas.
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

      <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h3 className="text-sm font-bold text-eid-fg">Verificação de idade (AWS)</h3>
        <EnvTable
          items={[
            {
              name: "AWS_ACCESS_KEY_ID",
              ok: Boolean(envText("AWS_ACCESS_KEY_ID")),
              where: "Secret no Worker.",
            },
            {
              name: "AWS_SECRET_ACCESS_KEY",
              ok: Boolean(envText("AWS_SECRET_ACCESS_KEY")),
              where: "Secret no Worker.",
            },
            {
              name: "AWS_REGION",
              ok: hasAwsRegion,
              where: "Texto no Worker (ex.: sa-east-1).",
            },
            {
              name: "IDADE_VERIFY_MODE",
              ok: true,
              where: `Texto no Worker. Atual: ${identityMode}. Em produção, recomendado "rekognition".`,
            },
            {
              name: "IDADE_VERIFY_SIMULATED_APPROVE",
              ok: true,
              where: "Opcional (simulação). Só usar em ambiente de teste.",
            },
          ]}
        />
      </section>

      <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4">
        <h3 className="text-sm font-bold text-eid-fg">Feriados e Android/TWA</h3>
        <EnvTable
          items={[
            {
              name: "FERIADOS_API_TOKEN",
              ok: Boolean(envText("FERIADOS_API_TOKEN")),
              where: "Secret no Worker (opcional; sem ele usa fallback quando disponível).",
            },
            {
              name: "ANDROID_ASSET_LINKS_JSON",
              ok: hasAndroidAssetLinksJson,
              where: "Secret/JSON no Worker para /.well-known/assetlinks.json.",
            },
            {
              name: "TWA_ANDROID_PACKAGE_NAME",
              ok: Boolean(envText("TWA_ANDROID_PACKAGE_NAME")),
              where: "Texto no Worker (opcional).",
            },
            {
              name: "TWA_SHA256_CERT_FINGERPRINTS",
              ok: Boolean(envText("TWA_SHA256_CERT_FINGERPRINTS")),
              where: "Texto no Worker (opcional, separados por vírgula).",
            },
          ]}
        />
      </section>

      <section className="rounded-xl border border-eid-text-secondary/20 bg-eid-bg/30 p-4 text-sm text-eid-text-secondary">
        <h3 className="text-sm font-bold text-eid-fg">Boas práticas de deploy</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Variáveis públicas (`NEXT_PUBLIC_*`) em `wrangler.toml` + workflow do GitHub (build).</li>
          <li>Chaves sensíveis sempre em <strong>Secrets</strong> do Worker.</li>
          <li>Após alterar segredo/variável, rode novo deploy para aplicar no runtime.</li>
        </ul>
      </section>
    </div>
  );
}
