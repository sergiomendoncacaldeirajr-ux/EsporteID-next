import Link from "next/link";
import { isPushDispatchConfigured } from "@/lib/pwa/push-dispatch";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

function supabaseDashboardProjectRoot(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname;
    const ref = host.split(".")[0];
    if (!ref) return null;
    return `https://supabase.com/dashboard/project/${ref}`;
  } catch {
    return null;
  }
}

type FalhaRow = {
  notificacaoId: number;
  subscriptionId: number;
  usuarioId: string | null;
  erro: string | null;
  atualizadoEm: string | null;
};

export default async function AdminPushPage() {
  const serviceRole = hasServiceRoleConfig();
  const vapidParOk = isPushDispatchConfigured();
  const dashRoot = supabaseDashboardProjectRoot();

  const envLinhas = [
    {
      nome: "NEXT_PUBLIC_SUPABASE_URL",
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
      onde: "Vercel → Project → Settings → Environment Variables (Production/Preview). Local: `.env.local`. Valor: em Supabase → Settings → API → Project URL.",
    },
    {
      nome: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
      onde: "Mesmo lugar. Valor: Supabase → Settings → API → anon public.",
    },
    {
      nome: "SUPABASE_SERVICE_ROLE_KEY",
      ok: serviceRole,
      onde: "Só no servidor (Vercel env ou `.env.local`, nunca no front). Valor: Supabase → Settings → API → service_role (revelar e copiar). Necessário para enviar push e para várias telas do admin.",
    },
    {
      nome: "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      ok: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()),
      onde: "Vercel / `.env.local`. Par pública do Web Push (o app usa para `pushManager.subscribe`).",
    },
    {
      nome: "VAPID_PRIVATE_KEY",
      ok: Boolean(process.env.VAPID_PRIVATE_KEY?.trim()),
      onde: "Só servidor (Vercel / `.env.local`). Par secreta do Web Push — o Next usa em `web-push` ao enviar.",
    },
    {
      nome: "VAPID_SUBJECT",
      onde: `Opcional. Padrão no código: mailto do produto. Neste deploy: ${Boolean(String(process.env.VAPID_SUBJECT ?? "").trim()) ? "definido" : "não definido (usa padrão)"}.`,
      opcional: true as const,
    },
  ] as const;

  let falhasRecentes: FalhaRow[] = [];
  let subsAtivos = 0;
  let subsTotal = 0;

  if (serviceRole) {
    try {
      const db = createServiceRoleClient();
      const [{ data: failedRows }, { count: cAtivos }, { count: cTotal }] = await Promise.all([
        db
          .from("push_entregas_notificacao")
          .select("notificacao_id, subscription_id, status, ultimo_erro, atualizado_em")
          .eq("status", "failed")
          .order("atualizado_em", { ascending: false })
          .limit(40),
        db.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("ativo", true),
        db.from("push_subscriptions").select("id", { count: "exact", head: true }),
      ]);
      subsAtivos = cAtivos ?? 0;
      subsTotal = cTotal ?? 0;

      const rows = (failedRows ?? []) as Array<{
        notificacao_id?: number | null;
        subscription_id?: number | null;
        ultimo_erro?: string | null;
        atualizado_em?: string | null;
      }>;
      const subIds = [
        ...new Set(
          rows.map((r) => Number(r.subscription_id ?? 0)).filter((n) => Number.isFinite(n) && n > 0)
        ),
      ];
      const usuarioPorSub = new Map<number, string>();
      if (subIds.length > 0) {
        const { data: subs } = await db.from("push_subscriptions").select("id, usuario_id").in("id", subIds);
        for (const s of subs ?? []) {
          const id = Number((s as { id?: number }).id ?? 0);
          const uid = String((s as { usuario_id?: string | null }).usuario_id ?? "").trim();
          if (Number.isFinite(id) && id > 0 && uid) usuarioPorSub.set(id, uid);
        }
      }
      falhasRecentes = rows.slice(0, 25).map((r) => {
        const sid = Number(r.subscription_id ?? 0);
        return {
          notificacaoId: Number(r.notificacao_id ?? 0),
          subscriptionId: sid,
          usuarioId: usuarioPorSub.get(sid) ?? null,
          erro: r.ultimo_erro ?? null,
          atualizadoEm: r.atualizado_em ?? null,
        };
      });
    } catch {
      falhasRecentes = [];
    }
  }

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Push Web — diagnóstico e configuração</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">
        Resumo do ambiente deste deploy, últimas falhas de entrega no banco e onde conferir cada chave nas plataformas.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/admin#admin-push-teste"
          className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 px-3 py-2 text-xs font-semibold text-eid-primary-300 hover:border-eid-primary-500/40"
        >
          ← Teste manual na visão geral
        </Link>
        <Link
          href="/admin/operacoes-sociais"
          className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 px-3 py-2 text-xs font-semibold text-eid-primary-300 hover:border-eid-primary-500/40"
        >
          Social &amp; push (operacional)
        </Link>
      </div>

      <section className="mt-6 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4">
        <h3 className="text-sm font-bold text-eid-fg">Status neste servidor</h3>
        <ul className="mt-2 space-y-1.5 text-xs text-eid-text-secondary">
          <li>
            Par VAPID completo (público + privado):{" "}
            <span className={vapidParOk ? "font-bold text-emerald-400" : "font-bold text-rose-300"}>
              {vapidParOk ? "OK" : "incompleto"}
            </span>{" "}
            — sem isso o envio via <code className="rounded bg-eid-bg/80 px-1 font-mono text-[11px]">web-push</code> não roda.
          </li>
          <li>
            Service role no Next:{" "}
            <span className={serviceRole ? "font-bold text-emerald-400" : "font-bold text-rose-300"}>
              {serviceRole ? "OK" : "ausente"}
            </span>{" "}
            — necessário para <code className="rounded bg-eid-bg/80 px-1 font-mono text-[11px]">/api/push/flush-user</code> e disparos do admin.
          </li>
          {serviceRole ? (
            <li>
              Subscriptions no banco: <span className="font-semibold text-eid-fg">{subsAtivos}</span> ativa(s) ·{" "}
              <span className="font-semibold text-eid-fg">{subsTotal}</span> no total.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4">
        <h3 className="text-sm font-bold text-eid-fg">Variáveis de ambiente (checklist)</h3>
        <p className="mt-1 text-xs text-eid-text-secondary">
          Abaixo só indicamos se a variável <strong className="text-eid-fg">parece</strong> definida neste deploy — nunca exibimos valores.
        </p>
        <ul className="mt-3 space-y-2">
          {envLinhas.map((row) => (
            <li
              key={row.nome}
              className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2 text-xs"
            >
              <p className="font-mono text-[11px] text-eid-primary-300">{row.nome}</p>
              <p className="mt-1 text-eid-text-secondary">{row.onde}</p>
              {"opcional" in row && row.opcional ? (
                <p className="mt-1 text-[11px] text-eid-text-muted">Variável opcional.</p>
              ) : "ok" in row ? (
                <p className={`mt-1 text-[11px] font-bold ${row.ok ? "text-emerald-400" : "text-rose-300"}`}>
                  {row.ok ? "Detectada" : "Ausente ou inválida neste ambiente"}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4">
        <h3 className="text-sm font-bold text-eid-fg">Onde conferir em cada plataforma</h3>
        <ul className="mt-3 list-inside list-disc space-y-2 text-xs text-eid-text-secondary">
          <li>
            <strong className="text-eid-fg">Supabase (projeto)</strong> — chaves da API e URL do projeto:{" "}
            {dashRoot ? (
              <a className="font-semibold text-eid-primary-300 underline" href={`${dashRoot}/settings/api`} target="_blank" rel="noreferrer">
                Dashboard → Settings → API
              </a>
            ) : (
              <span>
                abra{" "}
                <a
                  className="font-semibold text-eid-primary-300 underline"
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                >
                  supabase.com/dashboard
                </a>
                , escolha o projeto → <strong className="text-eid-fg">Settings → API</strong>. Copie <code className="font-mono">Project URL</code>,{" "}
                <code className="font-mono">anon</code> e <code className="font-mono">service_role</code>.
              </span>
            )}
          </li>
          <li>
            <strong className="text-eid-fg">Vercel (ou outro host)</strong> — variáveis do app Next:{" "}
            <a
              className="font-semibold text-eid-primary-300 underline"
              href="https://vercel.com/docs/projects/environment-variables"
              target="_blank"
              rel="noreferrer"
            >
              Documentação: Environment Variables
            </a>
            . No painel: <strong className="text-eid-fg">Project → Settings → Environment Variables</strong>. Defina para{" "}
            <strong className="text-eid-fg">Production</strong> (e Preview se usar). Depois faça um <strong className="text-eid-fg">Redeploy</strong> para o
            runtime enxergar valores novos.
          </li>
          <li>
            <strong className="text-eid-fg">Desenvolvimento local (Windows / XAMPP)</strong> — arquivo{" "}
            <code className="rounded bg-eid-bg/80 px-1 font-mono text-[11px]">.env.local</code> na raiz do repositório Next (mesmo nível de{" "}
            <code className="font-mono">package.json</code>). Reinicie o processo <code className="font-mono">npm run dev</code> após alterar.
          </li>
          <li>
            <strong className="text-eid-fg">Par VAPID</strong> — pode gerar com <code className="font-mono">npx web-push generate-vapid-keys</code> (par
            pública/privada). A pública vai em <code className="font-mono">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>; a privada em{" "}
            <code className="font-mono">VAPID_PRIVATE_KEY</code> (só servidor).
          </li>
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4">
        <h3 className="text-sm font-bold text-eid-fg">Últimas falhas de entrega push</h3>
        <p className="mt-1 text-xs text-eid-text-secondary">
          Linhas da tabela <code className="font-mono">push_entregas_notificacao</code> com <code className="font-mono">status = failed</code>, mais recentes
          primeiro.
        </p>
        {!serviceRole ? (
          <p className="mt-3 text-xs text-amber-200">Configure a service role no Next para listar falhas.</p>
        ) : falhasRecentes.length === 0 ? (
          <p className="mt-3 text-xs text-eid-text-secondary">Nenhuma falha recente registrada (ou tabela vazia).</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {falhasRecentes.map((f) => (
              <li key={`${f.subscriptionId}-${f.notificacaoId}-${f.atualizadoEm ?? ""}`} className="rounded-lg border border-rose-500/25 bg-rose-500/8 p-2">
                <p className="text-[11px] text-eid-fg">
                  Notificação #{f.notificacaoId} · subscription #{f.subscriptionId}
                  {f.usuarioId ? (
                    <>
                      {" "}
                      · usuário{" "}
                      <a className="font-mono text-eid-primary-300 underline" href={`/admin/usuarios/${f.usuarioId}`}>
                        {f.usuarioId}
                      </a>
                    </>
                  ) : null}
                </p>
                {f.erro ? <p className="mt-1 text-[10px] text-rose-200">{f.erro}</p> : null}
                {f.atualizadoEm ? (
                  <p className="mt-1 text-[10px] text-eid-text-muted">{new Date(f.atualizadoEm).toLocaleString("pt-BR")}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
