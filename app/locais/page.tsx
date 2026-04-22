import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const metadata = {
  title: "Locais",
  description: "Locais esportivos da comunidade EsporteID",
};

type Props = {
  searchParams?: Promise<{ q?: string; page?: string }>;
};

export default async function LocaisPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 12;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/locais");

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("espacos_genericos")
    .select("id, slug, nome_publico, localizacao, status, ownership_status, logo_arquivo, aceita_reserva, tipo_quadra", { count: "exact" })
    .eq("ativo_listagem", true)
    .order("id", { ascending: false });
  if (q) {
    query = query.or(`nome_publico.ilike.%${q}%,localizacao.ilike.%${q}%`);
  }
  const { data: filtrados, count } = await query.range(from, to);
  const lista = filtrados ?? [];
  const hasPrev = page > 1;
  const hasNext = count != null ? page * pageSize < count : (filtrados?.length ?? 0) === pageSize;
  const queryBase = `q=${encodeURIComponent(sp.q ?? "")}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
        <div className="relative mb-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 md:mb-6 md:overflow-hidden md:rounded-3xl md:border-eid-primary-500/20 md:bg-gradient-to-br md:from-eid-card md:via-eid-card md:to-eid-primary-500/10 md:p-8">
          <div className="pointer-events-none absolute -right-8 -top-8 hidden h-32 w-32 rounded-full bg-eid-primary-500/20 blur-3xl md:block" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:gap-4">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-eid-fg md:text-3xl md:font-black">Locais</h1>
              <p className="mt-1 hidden max-w-xl text-sm text-eid-text-secondary md:mt-2 md:block">
                Quadras, clubes e espaços cadastrados — explore, filtre e abra o perfil do local com informações em destaque.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href="/locais/cadastrar"
                className="rounded-xl border border-eid-primary-500/40 px-4 py-2 text-center text-xs font-bold text-eid-primary-300 transition hover:bg-eid-primary-500/10"
              >
                Cadastrar local
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-center text-xs font-bold text-eid-text-secondary transition hover:border-eid-primary-500/35 hover:text-eid-fg"
              >
                Painel
              </Link>
            </div>
          </div>
        </div>

        <form className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Buscar por nome ou endereço..."
            className="eid-input-dark h-11 flex-1 rounded-2xl px-4 text-sm text-eid-fg placeholder:text-eid-text-secondary/85"
          />
          <button type="submit" className="eid-btn-primary h-11 shrink-0 rounded-2xl px-6 text-sm font-black uppercase tracking-wide">
            Filtrar
          </button>
        </form>

        {q ? (
          <p className="mb-6 rounded-2xl border border-eid-primary-500/25 bg-eid-primary-500/10 px-4 py-3 text-xs text-eid-text-secondary">
            Busca ativa: <span className="font-bold text-eid-fg">{sp.q}</span>
          </p>
        ) : null}

        {lista.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((l) => (
              <Link
                key={l.id}
                href={l.slug ? `/espaco/${l.slug}` : `/local/${l.id}?from=/locais`}
                className="group relative block overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card transition hover:border-eid-primary-500/40 md:rounded-3xl md:shadow-lg md:shadow-black/20 md:hover:shadow-eid-primary-500/10"
              >
                <div className="flex h-24 items-center justify-center bg-eid-surface md:h-32 md:bg-gradient-to-br md:from-eid-primary-500/20 md:via-eid-surface md:to-eid-card">
                  {l.logo_arquivo ? (
                    <img
                      src={l.logo_arquivo}
                      alt=""
                      className="max-h-[72%] max-w-[80%] object-contain transition group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="text-3xl font-black text-eid-primary-500/25">EID</span>
                  )}
                </div>
                <div className="space-y-1.5 p-3 md:space-y-2 md:p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-eid-primary-300">
                      {l.status ?? "Ativo"}
                    </span>
                    <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-eid-action-400">
                      {l.ownership_status === "verificado" ? "Verificado" : "Genérico"}
                    </span>
                    {l.aceita_reserva ? (
                      <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-200">
                        Reserva
                      </span>
                    ) : null}
                    {l.tipo_quadra ? (
                      <span className="text-[10px] font-bold uppercase text-eid-text-secondary">{l.tipo_quadra}</span>
                    ) : null}
                  </div>
                  <p className="text-base font-bold text-eid-fg group-hover:text-eid-primary-300">{l.nome_publico}</p>
                  <p className="line-clamp-2 text-xs leading-relaxed text-eid-text-secondary">{l.localizacao ?? "Endereço não informado"}</p>
                  <p className="pt-1 text-[11px] font-bold uppercase tracking-wide text-eid-action-500">Abrir local →</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-8 text-center">
            <p className="text-sm text-eid-text-secondary">Nenhum local encontrado para esse filtro.</p>
            <Link href="/dashboard" className="mt-4 inline-block text-xs font-bold text-eid-primary-300 hover:underline">
              Voltar ao painel
            </Link>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Link
            href={`/locais?${queryBase}&page=${page - 1}`}
            aria-disabled={!hasPrev}
            className={`rounded-xl border px-4 py-2 text-xs font-bold ${
              hasPrev
                ? "border-[color:var(--eid-border-subtle)] text-eid-fg hover:border-eid-primary-500/35"
                : "pointer-events-none border-[color:var(--eid-border-subtle)] text-eid-text-secondary opacity-50"
            }`}
          >
            ← Anterior
          </Link>
          <span className="text-xs text-eid-text-secondary">Página {page}</span>
          <Link
            href={`/locais?${queryBase}&page=${page + 1}`}
            aria-disabled={!hasNext}
            className={`rounded-xl border px-4 py-2 text-xs font-bold ${
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
