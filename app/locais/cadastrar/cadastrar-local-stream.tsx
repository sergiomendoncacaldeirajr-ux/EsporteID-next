import Link from "next/link";
import { redirect } from "next/navigation";
import { CadastrarLocalGenericoForm } from "@/components/locais/cadastrar-local-generico-form";
import {
  locaisBadgeGhostClass,
  locaisFormPanelClass,
  locaisMainWideClass,
  locaisPageH1Class,
  locaisPageLeadClass,
  locaisSectionTitleClass,
  locaisShellBgGradientClass,
  locaisShellBgRadialClass,
  locaisShellOuterClass,
} from "@/components/locais/locais-ui-tokens";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { distanciaKm } from "@/lib/geo/distance-km";
import { usuarioJaGerenciaEspaco } from "@/lib/espacos/server";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { createClient } from "@/lib/supabase/server";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";

const cadastrarHeroClass = `relative mb-5 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-4 py-4 sm:px-6 sm:py-5`;

export type CadastrarLocalStreamProps = {
  searchParams?: Promise<{
    erro?: string;
    id?: string;
    return_to?: string;
    from?: string;
    sucesso?: string;
    novo_local_nome?: string;
  }>;
};

export async function CadastrarLocalStream({ searchParams }: CadastrarLocalStreamProps) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/locais/cadastrar");
  if (await usuarioJaGerenciaEspaco(user.id)) {
    redirect("/espaco");
  }
  const viewerId = user.id;

  const returnTo = resolveBackHref(sp.return_to ?? sp.from, "/locais/cadastrar");
  const erroMsg =
    sp.erro === "nome"
      ? "Informe um nome com pelo menos 2 caracteres."
      : sp.erro === "local"
        ? "Informe o endereço completo com número, cidade e UF."
        : sp.erro === "duplicado"
          ? "Já existe um espaço com esse nome nesta mesma localização. Abra o cadastro existente ou solicite a posse oficial."
          : sp.erro === "nome_dup"
            ? "Já existe um local cadastrado com esse nome. Escolha outro nome ou abra o cadastro existente."
            : sp.erro === "gravacao"
              ? "Não foi possível salvar. Tente novamente."
              : null;
  const sucessoMsg =
    sp.sucesso === "1"
      ? `Sugestão enviada${sp.novo_local_nome ? `: ${sp.novo_local_nome}` : ""}. Um administrador pode publicar na vitrine depois de revisar — até lá o local não aparece para visitantes anônimos na lista de locais.`
      : null;

  const featureCfg = await getSystemFeatureConfig(supabase);
  const canOpenLocais = canAccessSystemFeature(featureCfg, "locais", viewerId, false);

  const duplicateId = Number(sp.erro === "duplicado" || sp.erro === "nome_dup" ? sp.id ?? "" : "");
  const [{ data: profile }, { data: locaisRaw }, { data: localDuplicado }] = await Promise.all([
    supabase.from("profiles").select("lat, lng").eq("id", viewerId).maybeSingle(),
    supabase
      .from("espacos_genericos")
      .select("id, nome_publico, localizacao, logo_arquivo, lat, lng")
      .eq("ativo_listagem", true)
      .order("id", { ascending: false })
      .limit(200),
    Number.isFinite(duplicateId) && duplicateId > 0
      ? supabase
          .from("espacos_genericos")
          .select("id, nome_publico, localizacao, logo_arquivo")
          .eq("id", duplicateId)
          .maybeSingle()
      : Promise.resolve({ data: null as { id: number; nome_publico: string | null; localizacao: string | null; logo_arquivo: string | null } | null }),
  ]);
  const myLat = Number(profile?.lat ?? NaN);
  const myLng = Number(profile?.lng ?? NaN);
  const hasCoords = Number.isFinite(myLat) && Number.isFinite(myLng);
  const locaisOrdenados = (locaisRaw ?? [])
    .map((local) => ({
      ...local,
      dist: hasCoords ? distanciaKm(myLat, myLng, Number(local.lat ?? NaN), Number(local.lng ?? NaN)) : 99999,
    }))
    .sort((a, b) => a.dist - b.dist);
  const locaisOpcoes = locaisOrdenados.slice(0, 6);
  const locaisHints = locaisOrdenados.map((local) => ({
    id: Number(local.id),
    nome_publico: local.nome_publico ?? null,
    localizacao: local.localizacao ?? null,
  }));

  return (
    <div className={locaisShellOuterClass} data-eid-locais-page>
      <div className={locaisShellBgGradientClass} aria-hidden />
      <div className={locaisShellBgRadialClass} aria-hidden />
      <main data-eid-touch-ui className={locaisMainWideClass}>
        <div className={cadastrarHeroClass}>
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eid-primary-500/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-eid-action-500/12 blur-3xl"
            aria-hidden
          />
          <div className="relative z-[1] grid grid-cols-[44px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[56px_minmax(0,1fr)] sm:items-center sm:gap-4">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[rgba(37,99,235,0.28)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_18%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-700)_10%,var(--eid-surface)))] text-eid-primary-300 shadow-[0_6px_16px_-8px_rgba(37,99,235,0.5),0_0_14px_-4px_rgba(37,99,235,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] sm:h-14 sm:w-14">
              <svg viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7" fill="currentColor" aria-hidden>
                <path d="M12 2.5A7.5 7.5 0 0 0 4.5 10c0 5.8 7.5 11.5 7.5 11.5s7.5-5.7 7.5-11.5A7.5 7.5 0 0 0 12 2.5Zm0 10.2a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className={locaisSectionTitleClass}>Sugestão de espaço</p>
              <h1 className={locaisPageH1Class}>Cadastrar local genérico</h1>
              <p className={locaisPageLeadClass}>
                Sugira um espaço esportivo com nome e endereço. A sugestão fica pendente até um administrador aprovar a
                publicação na vitrine; você pode abrir o cadastro pelo link após enviar.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <section className={locaisFormPanelClass}>
            {erroMsg ? (
              <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm leading-snug text-red-200" role="alert">
                {erroMsg}
              </p>
            ) : null}
            {sucessoMsg ? (
              <p
                className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5 text-sm leading-snug text-emerald-200"
                role="status"
              >
                {sucessoMsg}
              </p>
            ) : null}

            {localDuplicado ? (
              <div className="mb-4 rounded-xl border border-eid-action-500/30 bg-eid-action-500/10 p-3 sm:p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-action-400">Local já existente</p>
                <div className="mt-2 flex items-center gap-3">
                  {localDuplicado.logo_arquivo ? (
                    <img src={localDuplicado.logo_arquivo} alt="" className="h-12 w-12 rounded-xl border border-[color:var(--eid-border-subtle)] object-cover" />
                  ) : (
                    <div className="grid h-12 w-12 place-items-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 text-xs font-black text-eid-fg">
                      EID
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-eid-fg">{localDuplicado.nome_publico ?? "Local"}</p>
                    <p className="truncate text-xs text-eid-text-secondary">{localDuplicado.localizacao ?? "Sem localização"}</p>
                  </div>
                </div>
                {canOpenLocais ? (
                  <Link
                    href={`/local/${localDuplicado.id}?from=/locais/cadastrar`}
                    className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-3 py-2 text-xs font-bold text-eid-fg transition hover:border-eid-primary-500/35"
                  >
                    Abrir local existente
                  </Link>
                ) : (
                  <p className="mt-3 text-xs font-semibold text-eid-text-secondary">Visualização do local em breve.</p>
                )}
              </div>
            ) : null}

            <CadastrarLocalGenericoForm
              locais={locaisHints}
              canOpenLocais={canOpenLocais}
              returnTo={returnTo}
              localLogoUrl={localDuplicado?.logo_arquivo ?? null}
            />

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,var(--eid-primary-500)_12%)] bg-[color:color-mix(in_srgb,var(--eid-surface)_42%,transparent)] px-3 py-2.5 sm:px-3.5">
              <span className="mt-0.5 inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-eid-primary-500/16 text-[10px] font-black text-eid-primary-400">
                i
              </span>
              <p className="text-[11px] leading-relaxed text-eid-text-secondary sm:text-xs">
                Para ser o responsável oficial do espaço, conclua o cadastro com o papel &quot;dono de espaço&quot; no onboarding
                ou fale com o suporte após criar o perfil do local.
              </p>
            </div>
          </section>

          <aside className={locaisFormPanelClass}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] pb-2.5">
              <h2 className={locaisSectionTitleClass}>Opções na comunidade</h2>
              <span className={locaisBadgeGhostClass}>Referência</span>
            </div>
            <div className="mt-3 flex items-start gap-2">
              <span className="mt-0.5 inline-grid h-5 w-5 shrink-0 place-items-center text-eid-primary-400">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
                  <path d="M4.5 5.5h6l2 2h7v11h-6l-2-2h-7z" />
                </svg>
              </span>
              <p className="text-xs leading-relaxed text-eid-text-secondary">
                {hasCoords
                  ? "Mostrando o local público mais próximo da sua posição no perfil."
                  : "Defina sua localização no perfil para ver sugestões ordenadas por distância."}
              </p>
            </div>

            <div className="mt-3 space-y-2">
              {(locaisOpcoes ?? []).length ? (
                (() => {
                  const local = locaisOpcoes[0];
                  const itemBody = (
                    <>
                      {local.logo_arquivo ? (
                        <img src={local.logo_arquivo} alt="" className="h-11 w-[4.5rem] rounded-xl object-cover" />
                      ) : (
                        <div className="grid h-11 w-[4.5rem] place-items-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-black text-eid-fg">
                          EID
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-eid-fg">{local.nome_publico ?? "Local"}</p>
                        <p className="mt-0.5 inline-flex items-center gap-1 truncate text-[11px] text-eid-text-secondary">
                          <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 text-eid-primary-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M12 21s6-5.6 6-10a6 6 0 1 0-12 0c0 4.4 6 10 6 10z" />
                            <circle cx="12" cy="11" r="2.1" />
                          </svg>
                          <span className="truncate">{local.localizacao ?? "Sem localização"}</span>
                        </p>
                      </div>
                      <span aria-hidden className="text-base leading-none text-eid-text-secondary">
                        ›
                      </span>
                    </>
                  );

                  return canOpenLocais ? (
                    <Link
                      href={`/local/${local.id}?from=/locais/cadastrar`}
                      className="flex items-center gap-2.5 rounded-xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,transparent)] bg-eid-surface/45 px-3 py-2 transition hover:border-eid-primary-500/35 hover:bg-eid-primary-500/5"
                    >
                      {itemBody}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2.5 rounded-xl border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_88%,transparent)] bg-eid-surface/45 px-3 py-2">
                      {itemBody}
                    </div>
                  );
                })()
              ) : (
                <p className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-4 text-xs text-eid-text-secondary">
                  Ainda não há locais públicos para listar.
                </p>
              )}
            </div>

            {canOpenLocais ? (
              <Link
                href="/locais?from=/locais/cadastrar"
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--eid-primary-500)_8%,transparent)] px-3 text-[11px] font-bold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--eid-fg)_70%,var(--eid-primary-500)_30%)] transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_35%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,transparent)]"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
                  <path d="M12 21s6-5.6 6-10a6 6 0 1 0-12 0c0 4.4 6 10 6 10z" />
                  <circle cx="12" cy="11" r="2.1" />
                </svg>
                Ver todos os locais
                <span aria-hidden className="text-sm leading-none">
                  ›
                </span>
              </Link>
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  );
}
