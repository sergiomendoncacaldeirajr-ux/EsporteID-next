import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { usuarioPodeCriarTorneio } from "@/lib/torneios/organizador";

export const metadata = {
  title: "Torneios",
  description: "Torneios disponíveis no EsporteID",
};

type Props = {
  searchParams?: Promise<{ q?: string; page?: string; esporte_id?: string }>;
};

function statusStyle(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "aberto") return "border-sky-400/40 bg-sky-500/15 text-sky-200";
  if (s.includes("andamento") || s.includes("progress")) return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
  if (s.includes("encerr") || s.includes("final")) return "border-amber-400/40 bg-amber-500/15 text-amber-200";
  if (s.includes("cancel")) return "border-red-400/35 bg-red-500/15 text-red-200";
  return "border-eid-primary-500/35 bg-eid-primary-500/10 text-eid-primary-200";
}

export default async function TorneiosPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const esporteFiltro = sp.esporte_id ? Number(sp.esporte_id) : NaN;
  const pageSize = 12;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/torneios");

  const podeCriar = await usuarioPodeCriarTorneio(supabase, user.id);
  const { data: esportesLista } = await supabase.from("esportes").select("id, nome").order("nome", { ascending: true });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("torneios")
    .select("id, nome, status, data_inicio, data_fim, valor_inscricao, esporte_id, esportes(nome)", { count: "exact" })
    .order("criado_em", { ascending: false });
  if (q) {
    query = query.ilike("nome", `%${q}%`);
  }
  if (Number.isFinite(esporteFiltro) && esporteFiltro > 0) {
    query = query.eq("esporte_id", esporteFiltro);
  }
  const { data: filtrados, count } = await query.range(from, to);
  const lista = filtrados ?? [];
  const hasPrev = page > 1;
  const hasNext = count != null ? page * pageSize < count : (filtrados?.length ?? 0) === pageSize;
  const queryBase = [`q=${encodeURIComponent(sp.q ?? "")}`, sp.esporte_id ? `esporte_id=${encodeURIComponent(sp.esporte_id)}` : ""]
    .filter(Boolean)
    .join("&");

  return (
    <>
      <DashboardTopbar />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
        <div className="relative mb-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 md:mb-6 md:overflow-hidden md:rounded-3xl md:border-eid-action-500/25 md:bg-gradient-to-br md:from-eid-card md:via-eid-card md:to-eid-action-500/10 md:p-8">
          <div className="pointer-events-none absolute -left-10 top-0 hidden h-40 w-40 rounded-full bg-eid-action-500/20 blur-3xl md:block" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:gap-4">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-eid-fg md:text-3xl md:font-black">Torneios</h1>
              <p className="mt-1 hidden max-w-xl text-sm text-eid-text-secondary md:mt-2 md:block">
                Inscrições, chaves e premiação, com destaque para datas e valores.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {podeCriar ? (
                <Link
                  href="/torneios/criar"
                  className="rounded-xl border border-eid-primary-500/40 px-4 py-2 text-center text-xs font-bold text-eid-primary-300 transition hover:bg-eid-primary-500/10"
                >
                  Criar torneio
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className="rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-center text-xs font-bold text-eid-text-secondary transition hover:border-eid-primary-500/35 hover:text-eid-fg"
              >
                Painel
              </Link>
            </div>
          </div>
        </div>

        <form className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Buscar torneio..."
            className="eid-input-dark h-11 min-w-0 flex-1 rounded-2xl px-4 text-sm text-eid-fg placeholder:text-eid-text-secondary/85"
          />
          <select
            name="esporte_id"
            defaultValue={sp.esporte_id ?? ""}
            className="eid-input-dark h-11 min-w-[160px] rounded-2xl px-4 text-sm text-eid-fg"
          >
            <option value="">Todos os esportes</option>
            {(esportesLista ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
          <button type="submit" className="eid-btn-primary h-11 shrink-0 rounded-2xl px-6 text-sm font-black uppercase tracking-wide">
            Filtrar
          </button>
        </form>

        {q || sp.esporte_id ? (
          <p className="mb-6 rounded-2xl border border-eid-primary-500/25 bg-eid-primary-500/10 px-4 py-3 text-xs text-eid-text-secondary">
            {q ? (
              <>
                Busca: <span className="font-bold text-eid-fg">{sp.q}</span>
                {sp.esporte_id ? " · " : null}
              </>
            ) : null}
            {sp.esporte_id ? (
              <>
                Esporte:{" "}
                <span className="font-bold text-eid-fg">
                  {(esportesLista ?? []).find((e) => String(e.id) === sp.esporte_id)?.nome ?? sp.esporte_id}
                </span>
              </>
            ) : null}
          </p>
        ) : null}

        {lista.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((t) => {
              const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
              return (
                <Link
                  key={t.id}
                  href={`/torneios/${t.id}?from=/torneios`}
                  className="group relative block overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card transition hover:border-eid-action-500/40 md:rounded-3xl md:shadow-lg md:shadow-black/25"
                >
                  <div className="h-1 w-full bg-gradient-to-r from-eid-primary-500 via-eid-action-500 to-eid-primary-400 md:h-2" />
                  <div className="p-3 md:p-5">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${statusStyle(t.status)}`}
                    >
                      {t.status ?? "—"}
                    </span>
                    <p className="mt-2 text-base font-bold leading-snug text-eid-fg group-hover:text-eid-action-500 md:mt-3 md:text-lg md:font-black">
                      {t.nome}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-eid-primary-300">{esp?.nome ?? "Esporte a definir"}</p>
                    <div className="mt-4 space-y-1 text-xs text-eid-text-secondary">
                      <p>
                        <span className="text-eid-fg/80">Início:</span>{" "}
                        {t.data_inicio ? new Date(t.data_inicio).toLocaleDateString("pt-BR") : "A definir"}
                      </p>
                      <p>
                        <span className="text-eid-fg/80">Término:</span>{" "}
                        {t.data_fim ? new Date(t.data_fim).toLocaleDateString("pt-BR") : "A definir"}
                      </p>
                    </div>
                    <p className="mt-4 text-lg font-black text-eid-action-500">R$ {Number(t.valor_inscricao ?? 0).toFixed(2)}</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-eid-primary-400">Ver detalhes →</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-8 text-center">
            <p className="text-sm text-eid-text-secondary">Nenhum torneio encontrado para esse filtro.</p>
            <Link href="/dashboard" className="mt-4 inline-block text-xs font-bold text-eid-primary-300 hover:underline">
              Voltar ao painel
            </Link>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Link
            href={`/torneios?${queryBase}&page=${page - 1}`}
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
            href={`/torneios?${queryBase}&page=${page + 1}`}
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
    </>
  );
}
