import Link from "next/link";
import {
  adminAddPlatformAdmin,
  adminAddPlatformAdminByUserId,
  adminAddUserToFeatureTesters,
  adminAddUserToFeatureTestersByUserId,
  adminRemovePlatformAdmin,
  adminRemoveUserFromFeatureTesters,
} from "@/app/admin/actions";
import { searchProfilesForAdmin, sanitizeAdminUserSearch } from "@/lib/admin/search-profiles";
import { SYSTEM_FEATURE_LABEL, type SystemFeatureKey } from "@/lib/system-features";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

const FEATURE_KEYS: SystemFeatureKey[] = [
  "marketplace",
  "locais",
  "torneios",
  "professores",
  "organizador_torneios",
];

function collectUniqueTesterIds(raw: unknown): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const f = (raw as { features?: Record<string, unknown> }).features;
  if (!f || typeof f !== "object") return [];
  const ids = new Set<string>();
  for (const key of FEATURE_KEYS) {
    const row = f[key];
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const t = (row as { testers?: unknown }).testers;
    if (!Array.isArray(t)) continue;
    for (const x of t) {
      const s = String(x ?? "").trim();
      if (s) ids.add(s);
    }
  }
  return [...ids];
}

type PageProps = { searchParams?: Promise<{ q?: string }> };

export default async function AdminAdminsPage({ searchParams }: PageProps) {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role para gerenciar administradores.</p>;
  }
  const sp = (await searchParams) ?? {};
  const rawSearch = (sp.q ?? "").trim();

  const db = createServiceRoleClient();

  const { data: busca, error: buscaErr } = await searchProfilesForAdmin(db, rawSearch, { whenEmpty: "none", searchLimit: 40 });
  const { data: featureRow } = await db.from("app_config").select("value_json").eq("key", "system_feature_modes_v1").maybeSingle();
  const testerIds = collectUniqueTesterIds(featureRow?.value_json);
  const { data: rows, error } = await db.from("platform_admins").select("user_id, criado_em").order("criado_em", { ascending: true });
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;

  const ids = (rows ?? []).map((r) => r.user_id);
  const allProfileIds = [...new Set([...ids, ...testerIds])];
  const { data: profs } = allProfileIds.length ? await db.from("profiles").select("id, nome").in("id", allProfileIds) : { data: [] };
  const nomePorId = new Map((profs ?? []).map((p) => [p.id, p.nome]));

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-eid-text-secondary/15 bg-eid-bg/20 p-4 sm:p-5">
        <h2 className="text-base font-bold text-eid-fg">Buscar pessoa cadastrada</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Por nome, <code className="text-eid-primary-300">@username</code>, e-mail de login ou ID (UUID). Depois escolha se a pessoa vira <strong>admin</strong> ou
          <strong> testador</strong>.
        </p>
        {buscaErr ? <p className="mt-2 text-sm text-red-300">{buscaErr.message}</p> : null}
        <form method="get" className="mt-4 flex max-w-2xl flex-wrap items-end gap-2" action="/admin/admins">
          <label className="min-w-0 flex-1 text-xs font-semibold text-eid-text-secondary">
            Termo
            <input
              name="q"
              type="search"
              defaultValue={rawSearch}
              placeholder="ex.: João, @joao, email@... ou colar o UUID"
              className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <button type="submit" className="eid-btn-primary min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-bold">
            Buscar
          </button>
          {rawSearch ? (
            <Link
              href="/admin/admins"
              className="min-h-[44px] self-end rounded-xl border border-eid-text-secondary/30 px-4 py-2.5 text-sm font-bold text-eid-text-secondary"
            >
              Limpar
            </Link>
          ) : null}
        </form>
        {rawSearch && sanitizeAdminUserSearch(rawSearch) && (busca?.length ?? 0) === 0 && !buscaErr ? (
          <p className="mt-4 text-sm text-eid-text-secondary">Nenhum perfil encontrado.</p>
        ) : null}
        {busca && busca.length > 0 ? (
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-lg border border-[color:var(--eid-border-subtle)] p-2">
            {busca.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-lg border border-[color:var(--eid-border-subtle)]/60 bg-eid-card/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-eid-fg">{p.nome ?? "—"}</p>
                  <p className="text-[11px] text-eid-text-secondary">
                    {p.username ? `@${p.username} · ` : null}
                    <span className="font-mono text-[10px]">{p.id}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={adminAddPlatformAdminByUserId} className="inline">
                    <input type="hidden" name="user_id" value={p.id} />
                    {rawSearch ? <input type="hidden" name="q" value={rawSearch} /> : null}
                    <button
                      type="submit"
                      className="rounded-lg border border-eid-primary-500/45 bg-eid-primary-500/15 px-2 py-1.5 text-[11px] font-bold text-eid-fg"
                    >
                      Tornar admin
                    </button>
                  </form>
                  <form action={adminAddUserToFeatureTestersByUserId} className="inline">
                    <input type="hidden" name="user_id" value={p.id} />
                    {rawSearch ? <input type="hidden" name="q" value={rawSearch} /> : null}
                    <button
                      type="submit"
                      className="rounded-lg border border-amber-400/45 bg-amber-500/10 px-2 py-1.5 text-[11px] font-bold text-amber-100"
                    >
                      Incluir em testes
                    </button>
                  </form>
                  <Link
                    href={`/admin/usuarios/${p.id}`}
                    className="self-center text-[11px] font-bold text-eid-text-secondary underline hover:text-eid-fg"
                  >
                    Abrir
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-[10px] text-eid-text-muted">Dica: a mesma busca está em Admin → Usuários se precisar de listas maiores.</p>
      </section>

      <section>
      <h2 className="text-base font-bold text-eid-fg">Administradores da plataforma</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">
        Apenas contas reais do Auth. Você pode promover alguém pelo e-mail abaixo ou com a <strong>busca acima</strong>. A chave service role fica só no servidor.
      </p>

      <form action={adminAddPlatformAdmin} className="mt-6 flex max-w-lg flex-col gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-semibold text-eid-text-secondary">
          E-mail do usuário
          <input type="email" name="email" required placeholder="atleta@email.com" className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="eid-btn-primary min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-bold">
          Adicionar admin
        </button>
      </form>

      <ul className="mt-8 space-y-2">
        {(rows ?? []).map((r) => (
          <li
            key={r.user_id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-eid-fg">{nomePorId.get(r.user_id) ?? "—"}</p>
              <p className="font-mono text-[11px] text-eid-text-secondary">{r.user_id}</p>
              <p className="text-[10px] text-eid-text-muted">desde {r.criado_em ? new Date(r.criado_em).toLocaleString("pt-BR") : "—"}</p>
            </div>
            <form action={adminRemovePlatformAdmin}>
              <input type="hidden" name="user_id" value={r.user_id} />
              <button type="submit" className="rounded-lg border border-red-400/40 px-2 py-1 text-[11px] font-bold text-red-200">
                Remover
              </button>
            </form>
          </li>
        ))}
      </ul>
      </section>

      <section className="rounded-xl border border-eid-primary-500/20 bg-eid-primary-500/[0.06] p-4 sm:p-5">
        <h2 className="text-base font-bold text-eid-fg">Testadores (funções em modo teste)</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">
          Quem você adicionar aqui passa a constar na lista de testadores de <strong>todas</strong> as funcionalidades
          (Marketplace, Locais, Torneios, Professores, Organizador). Use a <strong>busca no topo</strong> ou o e-mail abaixo. A
          pessoa só <strong>vê</strong> esses recursos no app quando a função estiver em modo <strong>teste</strong> em{" "}
          <a className="font-semibold text-eid-primary-300 underline hover:text-eid-fg" href="/admin/funcionalidades-do-app">
            Admin → Funcionalidades do app
          </a>
          .
        </p>

        <form
          action={adminAddUserToFeatureTesters}
          className="mt-4 flex max-w-lg flex-col gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-xs font-semibold text-eid-text-secondary">
            E-mail do testador
            <input
              type="email"
              name="email"
              required
              placeholder="atleta@email.com"
              className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <button type="submit" className="eid-btn-primary min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-bold">
            Adicionar testador
          </button>
        </form>

        {testerIds.length > 0 ? (
          <ul className="mt-6 space-y-2">
            {testerIds.map((uid) => (
              <li
                key={uid}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-eid-fg">{nomePorId.get(uid) ?? "—"}</p>
                  <p className="font-mono text-[11px] text-eid-text-secondary">{uid}</p>
                  <p className="mt-1 text-[10px] text-eid-text-muted">Incluído nas listas de testadores: {FEATURE_KEYS.map((k) => SYSTEM_FEATURE_LABEL[k]).join(", ")}</p>
                </div>
                <form action={adminRemoveUserFromFeatureTesters}>
                  <input type="hidden" name="user_id" value={uid} />
                  <button
                    type="submit"
                    className="rounded-lg border border-amber-400/40 px-2 py-1 text-[11px] font-bold text-amber-100"
                  >
                    Remover dos testes
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-eid-text-muted">Nenhum testador extra cadastrado ainda (além do que você colar manualmente em cada função em Ranking).</p>
        )}
      </section>
    </div>
  );
}
