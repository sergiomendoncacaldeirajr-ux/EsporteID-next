import Link from "next/link";
import { redirect } from "next/navigation";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { createClient } from "@/lib/supabase/server";
import { getAuthContextState } from "@/lib/auth/active-context-server";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";

export const metadata = {
  title: "Buscar",
  description: "Busca atletas, locais, times e torneios no EsporteID",
};

type Props = {
  searchParams?: Promise<{ q?: string }>;
};

/** Evita `%` / `_` soltos virarem curingas amplos no `ilike`. */
function sanitizeBusca(term: string) {
  return term.trim().slice(0, 96).replace(/[%_]/g, "").trim();
}

function primeiroNome(nome?: string | null) {
  const n = (nome ?? "").trim();
  return n ? n.split(/\s+/u)[0] : "Atleta";
}

export default async function BuscarPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const rawDisplay = (sp.q ?? "").trim();
  const qSafe = sanitizeBusca(rawDisplay);

  const contextState = await getAuthContextState();
  const { user } = contextState;
  if (!user) {
    const next = `/buscar${rawDisplay ? `?q=${encodeURIComponent(rawDisplay)}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();
  const featureCfg = await getSystemFeatureConfig(supabase);
  const canOpenLocais = canAccessSystemFeature(featureCfg, "locais", user.id);
  const { data: gate } = await supabase
    .from("profiles")
    .select(`perfil_completo, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`)
    .eq("id", user.id)
    .maybeSingle();
  if (!gate || !legalAcceptanceIsCurrent(gate)) {
    redirect(`/conta/aceitar-termos?next=${encodeURIComponent(`/buscar${rawDisplay ? `?q=${encodeURIComponent(rawDisplay)}` : ""}`)}`);
  }
  if (!gate.perfil_completo) {
    redirect("/onboarding");
  }

  const empty = {
    atletas: [] as Array<{
      id: string;
      nome: string | null;
      username: string | null;
      avatar_url: string | null;
      localizacao: string | null;
      disponivel_amistoso: boolean | null;
      disponivel_amistoso_ate: string | null;
    }>,
    locais: [] as Array<{ id: number; nome_publico: string | null; localizacao: string | null; logo_arquivo: string | null }>,
    times: [] as Array<{ id: number; nome: string | null; localizacao: string | null; escudo: string | null; tipo: string | null }>,
    torneios: [] as Array<{ id: number; nome: string | null; banner: string | null }>,
  };

  let resultados = empty;
  if (qSafe) {
    const [atletasRes, locaisRes, timesRes, torneiosRes] = await Promise.all([
      supabase.rpc("api_fold_search_atletas_buscar", {
        p_search: qSafe,
        p_exclude_user: user.id,
        p_limit: 28,
      }),
      supabase.rpc("api_fold_search_espacos_buscar", {
        p_search: qSafe,
        p_limit: 20,
      }),
      supabase.rpc("api_fold_search_times_buscar", {
        p_search: qSafe,
        p_exclude_creator: user.id,
        p_limit: 20,
      }),
      supabase.rpc("api_fold_search_torneios_abertos_buscar", {
        p_search: qSafe,
        p_limit: 20,
      }),
    ]);
    if (atletasRes.error) console.error("[buscar] atletas", atletasRes.error);
    if (locaisRes.error) console.error("[buscar] locais", locaisRes.error);
    if (timesRes.error) console.error("[buscar] times", timesRes.error);
    if (torneiosRes.error) console.error("[buscar] torneios", torneiosRes.error);
    resultados = {
      atletas: (atletasRes.data ?? []) as typeof empty.atletas,
      locais: (locaisRes.data ?? []) as typeof empty.locais,
      times: (timesRes.data ?? []) as typeof empty.times,
      torneios: (torneiosRes.data ?? []) as typeof empty.torneios,
    };
  }

  const total =
    resultados.atletas.length +
    resultados.locais.length +
    resultados.times.length +
    resultados.torneios.length;

  const sectionTitle = "text-[11px] font-extrabold uppercase tracking-[0.14em] text-eid-primary-400";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-eid-text-secondary">Busca global</p>
        <h1 className="mt-1 text-xl font-black tracking-tight text-eid-fg sm:text-2xl">Resultados</h1>
        {qSafe ? (
          <p className="mt-2 max-w-2xl text-sm text-eid-text-secondary">
            Termo: <span className="font-semibold text-eid-fg">{rawDisplay || qSafe}</span>
            {total > 0 ? (
              <span className="text-eid-text-secondary"> · {total} resultado{total !== 1 ? "s" : ""}</span>
            ) : null}
          </p>
        ) : (
          <p className="mt-2 max-w-2xl text-sm text-eid-text-secondary">
            Use o campo de busca no topo, confirme com Enter e veja atletas, locais, times e torneios em aberto.
          </p>
        )}
      </div>

      {!qSafe ? (
        <div className="eid-surface-panel rounded-2xl border border-[color:var(--eid-border-subtle)] p-6 text-center text-sm text-eid-text-secondary">
          Nenhum termo na URL. Digite na barra de busca acima e pressione Enter.
        </div>
      ) : total === 0 ? (
        <div className="eid-surface-panel rounded-2xl border border-[color:var(--eid-border-subtle)] p-8 text-center">
          <p className="text-sm font-semibold text-eid-fg">Nada encontrado</p>
          <p className="mt-2 text-sm text-eid-text-secondary">
            Tente outro nome, cidade ou parte do @username. Times e torneios usam o texto cadastrado no nome.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/locais" className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2 text-xs font-bold text-eid-primary-300">
              Explorar locais
            </Link>
            <Link href="/times" className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2 text-xs font-bold text-eid-primary-300">
              Ver times
            </Link>
            <Link href="/torneios" className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2 text-xs font-bold text-eid-primary-300">
              Torneios
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {resultados.atletas.length > 0 ? (
            <section>
              <h2 className={sectionTitle}>Atletas ({resultados.atletas.length})</h2>
              <ul className="mt-3 divide-y divide-[color:var(--eid-border-subtle)] rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80">
                {resultados.atletas.map((a) => {
                  const amistosoOn = computeDisponivelAmistosoEffective(a.disponivel_amistoso, a.disponivel_amistoso_ate);
                  return (
                  <li key={a.id}>
                    <Link
                      href={`/perfil/${encodeURIComponent(a.id)}?from=/buscar`}
                      className="flex items-center gap-3 px-3 py-3 transition hover:bg-eid-surface/50"
                    >
                      {a.avatar_url ? (
                        <img
                          src={a.avatar_url}
                          alt=""
                          className={`h-11 w-11 shrink-0 rounded-full border object-cover ${
                            amistosoOn ? "border-emerald-400/75" : "border-red-500/75"
                          }`}
                        />
                      ) : (
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-eid-surface text-xs font-black text-eid-primary-300 ${
                            amistosoOn ? "border-emerald-400/70" : "border-red-500/70"
                          }`}
                        >
                          {primeiroNome(a.nome).slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-eid-fg">{a.nome ?? "Atleta"}</p>
                        <p className="truncate text-xs text-eid-text-secondary">
                          {a.username ? `@${a.username}` : "—"}
                          {a.localizacao ? ` · ${a.localizacao}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold uppercase text-eid-primary-400">Ver perfil</span>
                    </Link>
                  </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {resultados.locais.length > 0 ? (
            <section>
              <h2 className={sectionTitle}>Locais ({resultados.locais.length})</h2>
              <ul className="mt-3 divide-y divide-[color:var(--eid-border-subtle)] rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80">
                {resultados.locais.map((loc) => (
                  <li key={loc.id}>
                    {canOpenLocais ? (
                      <Link
                        href={`/local/${loc.id}?from=/buscar`}
                        className="flex items-center gap-3 px-3 py-3 transition hover:bg-eid-surface/50"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface">
                          {loc.logo_arquivo ? (
                            <img src={loc.logo_arquivo} alt="" className="h-full w-full object-contain p-1" />
                          ) : (
                            <span className="text-[10px] font-black text-eid-primary-400">LOC</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-eid-fg">{loc.nome_publico ?? "Local"}</p>
                          <p className="truncate text-xs text-eid-text-secondary">{loc.localizacao ?? "—"}</p>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-3 py-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface">
                          {loc.logo_arquivo ? (
                            <img src={loc.logo_arquivo} alt="" className="h-full w-full object-contain p-1" />
                          ) : (
                            <span className="text-[10px] font-black text-eid-primary-400">LOC</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-eid-fg">{loc.nome_publico ?? "Local"}</p>
                          <p className="truncate text-xs text-eid-text-secondary">{loc.localizacao ?? "—"}</p>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {resultados.times.length > 0 ? (
            <section>
              <h2 className={sectionTitle}>Times e duplas ({resultados.times.length})</h2>
              <ul className="mt-3 divide-y divide-[color:var(--eid-border-subtle)] rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80">
                {resultados.times.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/perfil-time/${t.id}?from=/buscar`}
                      className="flex items-center gap-3 px-3 py-3 transition hover:bg-eid-surface/50"
                    >
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface">
                        {t.escudo ? (
                          <img src={t.escudo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-eid-primary-300">
                            {(t.tipo ?? "time").toLowerCase() === "dupla" ? "D" : "T"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-eid-fg">{t.nome ?? "Formação"}</p>
                        <p className="truncate text-xs text-eid-text-secondary">
                          {(t.tipo ?? "time").toLowerCase() === "dupla" ? "Dupla" : "Time"}
                          {t.localizacao ? ` · ${t.localizacao}` : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {resultados.torneios.length > 0 ? (
            <section>
              <h2 className={sectionTitle}>Torneios em aberto ({resultados.torneios.length})</h2>
              <ul className="mt-3 divide-y divide-[color:var(--eid-border-subtle)] rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80">
                {resultados.torneios.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/torneios/${t.id}?from=/buscar`}
                      className="flex items-center gap-3 px-3 py-3 transition hover:bg-eid-surface/50"
                    >
                      <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface">
                        {t.banner ? (
                          <img src={t.banner} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-eid-text-secondary">Torneio</div>
                        )}
                      </div>
                      <p className="min-w-0 flex-1 font-bold leading-snug text-eid-fg">{t.nome ?? `Torneio #${t.id}`}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
