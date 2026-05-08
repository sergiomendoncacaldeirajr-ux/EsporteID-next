import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedProfileLegalRow } from "@/lib/auth/profile-legal-cache";
import { getAuthContextState } from "@/lib/auth/active-context-server";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { legalAcceptanceIsCurrent } from "@/lib/legal/acceptance";
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

  const { supabase } = await getServerAuth();
  const [featureCfg, gate] = await Promise.all([
    getSystemFeatureConfig(supabase),
    getCachedProfileLegalRow(user.id),
  ]);
  const canOpenLocais = canAccessSystemFeature(featureCfg, "locais", user.id, false);
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">

      {/* Hero header */}
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-[rgba(37,99,235,0.16)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-primary-500)_3%),color-mix(in_srgb,var(--eid-surface)_96%,transparent))] px-4 py-4 shadow-[0_6px_22px_-14px_rgba(15,23,42,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-eid-primary-500/8 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-6 left-6 h-20 w-20 rounded-full bg-eid-action-500/8 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[rgba(37,99,235,0.25)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_18%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-700)_10%,var(--eid-surface)))] text-eid-primary-300 shadow-[0_0_12px_-3px_rgba(37,99,235,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.2-3.2" strokeLinecap="round" />
                </svg>
              </span>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-eid-primary-400">Busca global</p>
            </div>
            <h1 className="mt-1.5 text-[17px] font-black leading-tight tracking-tight text-eid-fg sm:text-xl">
              {qSafe ? (
                <>Resultados para <span className="text-eid-primary-300">&ldquo;{rawDisplay || qSafe}&rdquo;</span></>
              ) : (
                "Buscar"
              )}
            </h1>
            {qSafe && total > 0 ? (
              <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
                <span className="font-semibold text-eid-fg">{total}</span> resultado{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
                {" — "}atletas, locais, times e torneios
              </p>
            ) : !qSafe ? (
              <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
                Use o campo de busca acima, pressione Enter e encontre atletas, locais, times e torneios.
              </p>
            ) : null}
          </div>
          {qSafe && total > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {resultados.atletas.length > 0 && (
                <span className="rounded-full border border-[rgba(37,99,235,0.25)] bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-eid-primary-300">
                  {resultados.atletas.length} atleta{resultados.atletas.length !== 1 ? "s" : ""}
                </span>
              )}
              {resultados.locais.length > 0 && (
                <span className="rounded-full border border-[rgba(249,115,22,0.25)] bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-eid-action-400">
                  {resultados.locais.length} local{resultados.locais.length !== 1 ? "is" : ""}
                </span>
              )}
              {resultados.times.length > 0 && (
                <span className="rounded-full border border-[rgba(16,185,129,0.25)] bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
                  {resultados.times.length} equipe{resultados.times.length !== 1 ? "s" : ""}
                </span>
              )}
              {resultados.torneios.length > 0 && (
                <span className="rounded-full border border-[rgba(168,85,247,0.25)] bg-purple-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-purple-400">
                  {resultados.torneios.length} torneio{resultados.torneios.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* States */}
      {!qSafe ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgba(37,99,235,0.2)] bg-eid-primary-500/[0.04] py-12 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(37,99,235,0.2)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-500)_7%,var(--eid-surface)))] text-eid-primary-300 shadow-[0_0_16px_-4px_rgba(37,99,235,0.3)]">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.2-3.2" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="text-[13px] font-bold text-eid-fg">Nenhum termo informado</p>
            <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-eid-text-secondary">
              Digite na barra de busca no topo e pressione Enter para ver atletas, locais, times e torneios.
            </p>
          </div>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgba(37,99,235,0.2)] bg-eid-primary-500/[0.04] py-12 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(37,99,235,0.2)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-500)_7%,var(--eid-surface)))] text-eid-primary-300 shadow-[0_0_16px_-4px_rgba(37,99,235,0.3)]">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.2-3.2" strokeLinecap="round" />
              <path d="M8 11h6M11 8v6" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="text-[13px] font-bold text-eid-fg">Nada encontrado</p>
            <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-eid-text-secondary">
              Tente outro nome, cidade ou @username. Times e torneios usam o nome cadastrado.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/locais" className="rounded-xl border border-[rgba(249,115,22,0.3)] bg-eid-action-500/10 px-3 py-1.5 text-[11px] font-bold text-eid-action-400 transition hover:bg-eid-action-500/18">
              Explorar locais
            </Link>
            <Link href="/times" className="rounded-xl border border-[rgba(16,185,129,0.3)] bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-400 transition hover:bg-emerald-500/18">
              Ver times
            </Link>
            <Link href="/torneios" className="rounded-xl border border-[rgba(168,85,247,0.3)] bg-purple-500/10 px-3 py-1.5 text-[11px] font-bold text-purple-400 transition hover:bg-purple-500/18">
              Torneios
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Atletas */}
          {resultados.atletas.length > 0 ? (
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[rgba(37,99,235,0.28)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_18%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-700)_10%,var(--eid-surface)))] text-eid-primary-300 shadow-[0_0_8px_-2px_rgba(37,99,235,0.4)]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <circle cx="10" cy="8" r="3" />
                    <path d="M4.5 18a6 6 0 0 1 11 0" />
                  </svg>
                </span>
                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-eid-primary-400">
                  Atletas <span className="font-bold text-eid-primary-300/60">({resultados.atletas.length})</span>
                </h2>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[rgba(37,99,235,0.14)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-primary-500)_3%),color-mix(in_srgb,var(--eid-surface)_96%,transparent))] shadow-[0_4px_16px_-10px_rgba(37,99,235,0.18),inset_0_1px_0_rgba(255,255,255,0.04)]">
                <ul className="divide-y divide-[rgba(37,99,235,0.06)]">
                  {resultados.atletas.map((a) => {
                    const amistosoOn = computeDisponivelAmistosoEffective(a.disponivel_amistoso, a.disponivel_amistoso_ate);
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/perfil/${encodeURIComponent(a.id)}?from=/buscar`}
                          className="flex items-center gap-3 px-3 py-3 transition hover:bg-eid-primary-500/[0.06]"
                        >
                          {a.avatar_url ? (
                            <img
                              src={a.avatar_url}
                              alt=""
                              className={`h-11 w-11 shrink-0 rounded-full border-2 object-cover shadow-[0_2px_8px_-4px_rgba(15,23,42,0.4)] ${
                                amistosoOn
                                  ? "border-emerald-400/70 shadow-[0_0_10px_-3px_rgba(16,185,129,0.4)]"
                                  : "border-[rgba(255,255,255,0.08)]"
                              }`}
                            />
                          ) : (
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-surface)),var(--eid-surface))] text-xs font-black text-eid-primary-300 ${
                                amistosoOn
                                  ? "border-emerald-400/60 shadow-[0_0_10px_-3px_rgba(16,185,129,0.4)]"
                                  : "border-[rgba(37,99,235,0.2)]"
                              }`}
                            >
                              {primeiroNome(a.nome).slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-eid-fg">{a.nome ?? "Atleta"}</p>
                            <p className="mt-0.5 truncate text-[11px] text-eid-text-secondary">
                              {a.username ? `@${a.username}` : "—"}
                              {a.localizacao ? ` · ${a.localizacao}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {amistosoOn ? (
                              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
                                Disponível
                              </span>
                            ) : null}
                            <span className="text-[10px] font-bold uppercase tracking-wide text-eid-primary-400">Ver →</span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ) : null}

          {/* Locais */}
          {resultados.locais.length > 0 ? (
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[rgba(249,115,22,0.3)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-action-500)_16%,var(--eid-card)),color-mix(in_srgb,var(--eid-action-500)_8%,var(--eid-surface)))] text-eid-action-300 shadow-[0_0_8px_-2px_rgba(249,115,22,0.4)]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                    <path d="M12 2.5A7.5 7.5 0 0 0 4.5 10c0 5.8 7.5 11.5 7.5 11.5s7.5-5.7 7.5-11.5A7.5 7.5 0 0 0 12 2.5Zm0 10.2a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Z" />
                  </svg>
                </span>
                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-eid-action-400">
                  Locais <span className="font-bold text-eid-action-400/60">({resultados.locais.length})</span>
                </h2>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[rgba(249,115,22,0.12)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-action-500)_3%),color-mix(in_srgb,var(--eid-surface)_96%,transparent))] shadow-[0_4px_16px_-10px_rgba(249,115,22,0.15),inset_0_1px_0_rgba(255,255,255,0.04)]">
                <ul className="divide-y divide-[rgba(249,115,22,0.06)]">
                  {resultados.locais.map((loc) => {
                    const itemContent = (
                      <>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[rgba(249,115,22,0.2)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-action-500)_10%,var(--eid-surface)),var(--eid-surface))] shadow-[0_0_8px_-3px_rgba(249,115,22,0.25)]">
                          {loc.logo_arquivo ? (
                            <img src={loc.logo_arquivo} alt="" className="h-full w-full object-contain p-1" />
                          ) : (
                            <svg viewBox="0 0 24 24" className="h-5 w-5 text-eid-action-400/70" fill="currentColor" aria-hidden>
                              <path d="M12 2.5A7.5 7.5 0 0 0 4.5 10c0 5.8 7.5 11.5 7.5 11.5s7.5-5.7 7.5-11.5A7.5 7.5 0 0 0 12 2.5Zm0 10.2a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Z" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold text-eid-fg">{loc.nome_publico ?? "Local"}</p>
                          <p className="mt-0.5 truncate text-[11px] text-eid-text-secondary">{loc.localizacao ?? "—"}</p>
                        </div>
                        {canOpenLocais ? (
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-eid-action-400">Ver →</span>
                        ) : null}
                      </>
                    );
                    return (
                      <li key={loc.id}>
                        {canOpenLocais ? (
                          <Link href={`/local/${loc.id}?from=/buscar`} className="flex items-center gap-3 px-3 py-3 transition hover:bg-eid-action-500/[0.06]">
                            {itemContent}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 px-3 py-3">{itemContent}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ) : null}

          {/* Times */}
          {resultados.times.length > 0 ? (
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[rgba(16,185,129,0.3)] bg-[linear-gradient(145deg,color-mix(in_srgb,#10b981_16%,var(--eid-card)),color-mix(in_srgb,#059669_8%,var(--eid-surface)))] text-emerald-300 shadow-[0_0_8px_-2px_rgba(16,185,129,0.4)]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <circle cx="8" cy="8.5" r="2.5" />
                    <circle cx="16" cy="8.5" r="2.5" />
                    <path d="M3.5 17a4.8 4.8 0 0 1 8.5 0" />
                    <path d="M12 17a4.8 4.8 0 0 1 8.5 0" />
                  </svg>
                </span>
                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-emerald-400">
                  Times e duplas <span className="font-bold text-emerald-400/60">({resultados.times.length})</span>
                </h2>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[rgba(16,185,129,0.12)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_97%,#10b981_3%),color-mix(in_srgb,var(--eid-surface)_96%,transparent))] shadow-[0_4px_16px_-10px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.04)]">
                <ul className="divide-y divide-[rgba(16,185,129,0.06)]">
                  {resultados.times.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/perfil-time/${t.id}?from=/buscar`}
                        className="flex items-center gap-3 px-3 py-3 transition hover:bg-emerald-500/[0.06]"
                      >
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[rgba(16,185,129,0.2)] bg-[linear-gradient(145deg,color-mix(in_srgb,#10b981_10%,var(--eid-surface)),var(--eid-surface))] shadow-[0_0_8px_-3px_rgba(16,185,129,0.25)]">
                          {t.escudo ? (
                            <img src={t.escudo} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] font-black text-emerald-400/80">
                              {(t.tipo ?? "time").toLowerCase() === "dupla" ? "D" : "T"}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold text-eid-fg">{t.nome ?? "Formação"}</p>
                          <p className="mt-0.5 truncate text-[11px] text-eid-text-secondary">
                            {(t.tipo ?? "time").toLowerCase() === "dupla" ? "Dupla" : "Time"}
                            {t.localizacao ? ` · ${t.localizacao}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-emerald-400">Ver →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {/* Torneios */}
          {resultados.torneios.length > 0 ? (
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[rgba(168,85,247,0.3)] bg-[linear-gradient(145deg,color-mix(in_srgb,#a855f7_16%,var(--eid-card)),color-mix(in_srgb,#9333ea_8%,var(--eid-surface)))] text-purple-300 shadow-[0_0_8px_-2px_rgba(168,85,247,0.4)]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <path d="M8 21h8M12 17v4" />
                    <path d="M17 3H7v8a5 5 0 0 0 10 0V3Z" />
                    <path d="M7 7H3v4a4 4 0 0 0 4 4M17 7h4v4a4 4 0 0 1-4 4" />
                  </svg>
                </span>
                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-purple-400">
                  Torneios em aberto <span className="font-bold text-purple-400/60">({resultados.torneios.length})</span>
                </h2>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[rgba(168,85,247,0.12)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_97%,#a855f7_3%),color-mix(in_srgb,var(--eid-surface)_96%,transparent))] shadow-[0_4px_16px_-10px_rgba(168,85,247,0.15),inset_0_1px_0_rgba(255,255,255,0.04)]">
                <ul className="divide-y divide-[rgba(168,85,247,0.06)]">
                  {resultados.torneios.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/torneios/${t.id}?from=/buscar`}
                        className="flex items-center gap-3 px-3 py-3 transition hover:bg-purple-500/[0.06]"
                      >
                        <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-[rgba(168,85,247,0.2)] bg-[linear-gradient(145deg,color-mix(in_srgb,#a855f7_10%,var(--eid-surface)),var(--eid-surface))] shadow-[0_0_8px_-3px_rgba(168,85,247,0.25)]">
                          {t.banner ? (
                            <img src={t.banner} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-purple-400/70">Torneio</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold leading-snug text-eid-fg">{t.nome ?? `Torneio #${t.id}`}</p>
                          <p className="mt-0.5 text-[11px] text-eid-text-secondary">Em aberto · inscrições disponíveis</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-purple-400">Ver →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

        </div>
      )}
    </div>
  );
}
