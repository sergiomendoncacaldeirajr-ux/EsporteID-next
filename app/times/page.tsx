import Link from "next/link";
import { redirect } from "next/navigation";
import { SearchFilterForm } from "@/components/search/search-filter-form";
import { createClient } from "@/lib/supabase/server";
import { TeamManagementPanel } from "@/components/times/team-management-panel";
import { resolveBackHref } from "@/lib/perfil/back-href";

export const metadata = {
  title: "Times",
  description: "Times e recrutamento no EsporteID",
};

type Props = {
  searchParams?: Promise<{ q?: string; page?: string; create?: string; from?: string; convidar?: string }>;
};

export default async function TimesPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const voltarHref = resolveBackHref(sp.from, "/dashboard");
  const q = (sp.q ?? "").trim().toLowerCase();
  const openCreate = sp.create === "1";
  const convidar = String(sp.convidar ?? "").trim();
  const convidarOk = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(convidar);
  const fromForConvite =
    typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : convidarOk ? `/perfil/${convidar}` : "/times";
  const manageHrefTemplate =
    openCreate && convidarOk ? `/editar/time/:id?from=${encodeURIComponent(fromForConvite)}&convidar=${encodeURIComponent(convidar)}` : undefined;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 12;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/times");

  const [{ data: esportes }, { data: minhas }] = await Promise.all([
    supabase.from("esportes").select("id, nome").eq("ativo", true).order("ordem", { ascending: true }),
    supabase
      .from("times")
      .select("id, nome, tipo, esportes(nome)")
      .eq("criador_id", user.id)
      .order("id", { ascending: false })
      .limit(20),
  ]);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("times")
    .select("id, nome, localizacao, vagas_abertas, eid_time, nivel_procurado", { count: "exact" })
    .order("id", { ascending: false });
  if (q) {
    query = query.or(`nome.ilike.%${q}%,localizacao.ilike.%${q}%`);
  }
  const { data: filtrados, count } = await query.range(from, to);
  const lista = filtrados ?? [];
  const hasPrev = page > 1;
  const hasNext = count != null ? page * pageSize < count : (filtrados?.length ?? 0) === pageSize;
  const queryBase = `q=${encodeURIComponent(sp.q ?? "")}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
        <div className="relative mb-4 flex flex-col gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 sm:flex-row sm:items-end sm:justify-between md:overflow-hidden md:rounded-3xl md:border-eid-primary-500/20 md:bg-gradient-to-br md:from-eid-card md:via-eid-card md:to-eid-primary-500/10 md:p-6">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-eid-fg md:text-2xl md:font-black">Times</h1>
            <p className="mt-1 text-xs text-eid-text-secondary md:mt-2 md:text-sm">
              Formações em recrutamento — toque para ver o perfil completo.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/vagas"
              className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-2 text-center text-xs font-bold text-eid-primary-300 transition hover:border-eid-primary-500/55 sm:text-sm"
            >
              Ver vagas
            </Link>
            {sp.from?.trim() ? (
              <Link
                href={voltarHref}
                className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-2 text-center text-xs font-bold text-eid-primary-300 transition hover:border-eid-primary-500/55 sm:text-sm"
              >
                ← Voltar
              </Link>
            ) : null}
            <Link
              href="/dashboard"
              className="rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-center text-xs font-bold text-eid-text-secondary transition hover:border-eid-primary-500/35 hover:text-eid-fg sm:text-sm"
            >
              Painel
            </Link>
          </div>
        </div>
        <TeamManagementPanel
          esportes={(esportes ?? []).map((e) => ({ id: e.id, nome: e.nome }))}
          minhasEquipes={(minhas ?? []).map((t) => {
            const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
            return { id: t.id, nome: t.nome ?? "Equipe", tipo: t.tipo ?? "time", esporteNome: esp?.nome ?? "Esporte" };
          })}
          defaultOpenCreate={openCreate}
          manageHrefTemplate={manageHrefTemplate}
          convidarUsuarioIdAposCriar={convidarOk ? convidar : undefined}
          defaultTipoFormacao={convidarOk ? "dupla" : undefined}
        />
        <SearchFilterForm
          defaultValue={sp.q ?? ""}
          placeholder="Buscar time ou cidade..."
          scope="times"
          className="mb-4 flex gap-2"
          inputClassName="eid-input-dark h-10 flex-1 rounded-xl px-3 text-sm text-eid-fg placeholder:text-eid-text-secondary/85"
          buttonClassName="eid-btn-primary rounded-xl px-4 text-sm font-bold"
        />
        {q ? (
          <p className="mb-4 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2 text-xs text-eid-text-secondary">
            Busca ativa por: <span className="font-semibold text-eid-fg">{sp.q}</span>
          </p>
        ) : null}
        {lista.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((t) => (
              <Link
                key={t.id}
                href={`/perfil-time/${t.id}?from=/times`}
                className="block rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 transition hover:border-eid-primary-500/35 sm:rounded-2xl sm:p-4"
              >
                <p className="text-sm font-semibold text-eid-fg">{t.nome}</p>
                <p className="mt-1 text-xs text-eid-text-secondary">{t.localizacao ?? "Sem localização"}</p>
                <p className="mt-1 text-xs text-eid-text-secondary">
                  Nível: {t.nivel_procurado ?? "a definir"}
                </p>
                <p className="mt-1 text-xs font-medium text-eid-primary-300">
                  EID time: {Number(t.eid_time ?? 0).toFixed(1)}
                </p>
                {!t.vagas_abertas ? (
                  <p className="mt-2 text-xs text-eid-text-secondary">Sem vagas abertas no momento</p>
                ) : null}
                <p className="mt-2 text-xs text-eid-primary-300">Ver perfil da formação →</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
            <p className="text-sm text-eid-text-secondary">Nenhum time encontrado para esse filtro.</p>
            <Link href="/dashboard" className="mt-2 inline-block text-xs font-semibold text-eid-primary-300 hover:text-eid-fg">
              Voltar e explorar outros blocos
            </Link>
          </div>
        )}
        <div className="mt-5 flex items-center justify-between">
          <Link
            href={`/times?${queryBase}&page=${page - 1}`}
            aria-disabled={!hasPrev}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              hasPrev
                ? "border-[color:var(--eid-border-subtle)] text-eid-fg hover:border-eid-primary-500/35"
                : "pointer-events-none border-[color:var(--eid-border-subtle)] text-eid-text-secondary opacity-50"
            }`}
          >
            ← Anterior
          </Link>
          <span className="text-xs text-eid-text-secondary">Página {page}</span>
          <Link
            href={`/times?${queryBase}&page=${page + 1}`}
            aria-disabled={!hasNext}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              hasNext
                ? "border-[color:var(--eid-border-subtle)] text-eid-fg hover:border-eid-primary-500/35"
                : "pointer-events-none border-[color:var(--eid-border-subtle)] text-eid-text-secondary opacity-50"
            }`}
          >
            Próxima →
          </Link>
        </div>
      </div>
  );
}
