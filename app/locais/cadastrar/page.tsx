import Link from "next/link";
import { redirect } from "next/navigation";
import { NomeLocalInputSuggestions } from "@/components/locais/nome-local-input-suggestions";
import { LocalSubmitButton } from "@/components/locais/local-submit-button";
import { distanciaKm } from "@/lib/geo/distance-km";
import { usuarioJaGerenciaEspaco } from "@/lib/espacos/server";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { createClient } from "@/lib/supabase/server";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";
import { cadastrarLocalGenerico } from "./actions";

export const metadata = {
  title: "Cadastrar local",
  description: "Sugerir um espaço esportivo na comunidade EsporteID",
};

export default async function CadastrarLocalPage({
  searchParams,
}: {
  searchParams?: Promise<{ erro?: string; id?: string; return_to?: string; from?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const returnTo = resolveBackHref(sp.return_to ?? sp.from, "/locais/cadastrar");
  const erroMsg =
    sp.erro === "nome"
      ? "Informe um nome com pelo menos 2 caracteres."
      : sp.erro === "local"
        ? "Informe cidade/região ou endereço (mín. 3 caracteres)."
        : sp.erro === "duplicado"
          ? "Já existe um espaço com esse nome nesta mesma localização. Abra o cadastro existente ou solicite a posse oficial."
        : sp.erro === "gravacao"
          ? "Não foi possível salvar. Tente novamente."
          : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/locais/cadastrar");
  const featureCfg = await getSystemFeatureConfig(supabase);
  const canOpenLocais = canAccessSystemFeature(featureCfg, "locais", user.id);
  if (await usuarioJaGerenciaEspaco(user.id)) {
    redirect("/espaco");
  }

  const duplicateId = Number(sp.erro === "duplicado" ? sp.id : "");
  const [{ data: profile }, { data: locaisRaw }, { data: localDuplicado }] = await Promise.all([
    supabase.from("profiles").select("lat, lng").eq("id", user.id).maybeSingle(),
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
  const locaisHints = locaisOrdenados.slice(0, 80).map((local) => ({
    id: Number(local.id),
    nome_publico: local.nome_publico ?? null,
    localizacao: local.localizacao ?? null,
  }));

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-3 sm:px-6 sm:py-4">
      <div className="relative mb-5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 md:overflow-hidden md:rounded-3xl md:border-eid-action-500/25 md:bg-gradient-to-br md:from-eid-card md:via-eid-card md:to-eid-action-500/10 md:p-8">
        <div className="pointer-events-none absolute -left-10 top-0 hidden h-40 w-40 rounded-full bg-eid-action-500/20 blur-3xl md:block" />
        <div className="relative">
          <h1 className="text-xl font-black tracking-tight text-eid-fg md:text-3xl">Cadastrar local genérico</h1>
          <p className="mt-2 max-w-2xl text-sm text-eid-text-secondary">
            Sugira um espaço esportivo para a comunidade com nome e localização. Depois é possível complementar dados e validar propriedade.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 sm:p-6 md:rounded-3xl">
          {erroMsg ? (
            <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
              {erroMsg}
            </p>
          ) : null}

          {localDuplicado ? (
            <div className="mb-4 rounded-xl border border-eid-action-500/30 bg-eid-action-500/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-eid-action-400">Local já existente</p>
              <div className="mt-2 flex items-center gap-3">
                {localDuplicado.logo_arquivo ? (
                  <img src={localDuplicado.logo_arquivo} alt="" className="h-11 w-11 rounded-xl object-cover" />
                ) : (
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 text-xs font-black text-eid-fg">
                    EID
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-eid-fg">{localDuplicado.nome_publico ?? "Local"}</p>
                  <p className="truncate text-xs text-eid-text-secondary">{localDuplicado.localizacao ?? "Sem localização"}</p>
                </div>
              </div>
              {canOpenLocais ? (
                <Link
                  href={`/local/${localDuplicado.id}?from=/locais/cadastrar`}
                  className="mt-3 inline-flex rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg"
                >
                  Abrir local existente
                </Link>
              ) : (
                <p className="mt-3 text-xs font-semibold text-eid-text-secondary">Visualização do local em breve.</p>
              )}
            </div>
          ) : null}

          <form action={cadastrarLocalGenerico} className="space-y-4">
            <input type="hidden" name="return_to" value={returnTo} />
            <NomeLocalInputSuggestions locais={locaisHints} canOpenLocais={canOpenLocais} />
            <div>
              <label htmlFor="localizacao" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                Cidade / região ou endereço
              </label>
              <input
                id="localizacao"
                name="localizacao"
                required
                minLength={3}
                placeholder="Ex.: Ipatinga — MG"
                className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
              />
            </div>
            <div>
              <label htmlFor="logo_file" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
                Foto / logo do local (opcional)
              </label>
              <input
                id="logo_file"
                name="logo_file"
                type="file"
                accept="image/*"
                className="mt-1.5 block w-full text-xs text-eid-text-secondary file:mr-2 file:rounded-lg file:border file:border-[color:var(--eid-border-subtle)] file:bg-eid-surface/70 file:px-2.5 file:py-1.5 file:text-[11px] file:font-semibold file:text-eid-fg"
              />
              <p className="mt-1 text-[11px] text-eid-text-secondary">PNG, JPG ou WEBP até 5MB.</p>
            </div>
            <LocalSubmitButton />
          </form>

          <p className="mt-4 text-[11px] leading-relaxed text-eid-text-secondary">
            Para ser o responsável oficial do espaço, conclua o cadastro com o papel &quot;dono de espaço&quot; no onboarding ou fale com o
            suporte após criar o perfil do local.
          </p>
        </section>

        <aside className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 sm:p-5 md:rounded-3xl">
          <h2 className="text-sm font-bold text-eid-fg">Opções já cadastradas</h2>
          <p className="mt-1 text-xs text-eid-text-secondary">
            {hasCoords
              ? "Mostrando os locais mais próximos da sua localização."
              : "Defina sua localização no perfil para ver os locais mais próximos."}
          </p>
          <div className="mt-3 space-y-2">
            {(locaisOpcoes ?? []).length ? (
              (locaisOpcoes ?? []).map((local) =>
                canOpenLocais ? (
                  <Link
                    key={local.id}
                    href={`/local/${local.id}?from=/locais/cadastrar`}
                    className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2.5 py-2 transition hover:border-eid-primary-500/35"
                  >
                    {local.logo_arquivo ? (
                      <img src={local.logo_arquivo} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-black text-eid-fg">
                        EID
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-eid-fg">{local.nome_publico ?? "Local"}</p>
                      <p className="truncate text-[11px] text-eid-text-secondary">{local.localizacao ?? "Sem localização"}</p>
                      {Number.isFinite(local.dist) && local.dist < 9000 ? (
                        <p className="truncate text-[10px] text-eid-primary-300">
                          {local.dist.toFixed(1).replace(".", ",")} km
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ) : (
                  <div
                    key={local.id}
                    className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2.5 py-2"
                  >
                    {local.logo_arquivo ? (
                      <img src={local.logo_arquivo} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-black text-eid-fg">
                        EID
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-eid-fg">{local.nome_publico ?? "Local"}</p>
                      <p className="truncate text-[11px] text-eid-text-secondary">{local.localizacao ?? "Sem localização"}</p>
                      {Number.isFinite(local.dist) && local.dist < 9000 ? (
                        <p className="truncate text-[10px] text-eid-primary-300">
                          {local.dist.toFixed(1).replace(".", ",")} km
                        </p>
                      ) : null}
                    </div>
                  </div>
                )
              )
            ) : (
              <p className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-4 text-xs text-eid-text-secondary">
                Ainda não há locais públicos para listar.
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
