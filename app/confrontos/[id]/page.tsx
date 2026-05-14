import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPin, Trophy } from "lucide-react";
import { ConfrontoCard } from "@/components/confrontos/confronto-card";
import { ConfrontoDetalheResultado } from "@/components/confrontos/confronto-detalhe-resultado";
import { loadPublicConfrontos, normalizeConfrontoTipo, type ConfrontoTipo } from "@/lib/confrontos/public-feed";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Detalhe do confronto | EsporteID",
};

export default async function ConfrontoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const embed = (Array.isArray(sp.embed) ? sp.embed[0] : sp.embed) === "1";
  const confrontoId = Number(id);
  if (!Number.isFinite(confrontoId) || confrontoId < 1) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/confrontos/${confrontoId}`);

  const { data: raw } = await supabase
    .from("partidas")
    .select("id, modalidade, esporte_id, status")
    .eq("id", confrontoId)
    .maybeSingle();
  if (!raw) notFound();
  const tipo: ConfrontoTipo = normalizeConfrontoTipo(String((raw as { modalidade?: string | null }).modalidade ?? "individual"));
  const status = String((raw as { status?: string | null }).status ?? "").trim().toLowerCase();
  const view = ["concluida", "concluída", "finalizada", "encerrada", "validada"].includes(status) ? "encerrados" : "proximos";
  const esporteId = Number((raw as { esporte_id?: number | null }).esporte_id ?? 0) || null;
  const { items } = await loadPublicConfrontos({
    supabase,
    viewerId: user.id,
    statusView: view,
    tipo,
    esporteId,
    page: 8,
  });
  const item = items.find((x) => x.id === confrontoId);
  if (!item) notFound();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col px-3 pb-[calc(var(--eid-shell-content-bottom-pad)+4.75rem)] pt-3 sm:max-w-2xl sm:px-6 sm:pb-[var(--eid-shell-content-bottom-pad)]">
      <div className={`mb-3 flex items-center gap-2 ${embed ? "justify-end" : "justify-between"}`}>
        {!embed ? (
          <Link href={`/confrontos?view=${view}${tipo !== "individual" ? `&tipo=${tipo}` : ""}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 text-eid-primary-300">
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
        <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/12 px-3 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-eid-primary-300">
          {item.origem} · {item.tipo}
        </span>
      </div>

      <ConfrontoCard item={item} />

      {item.statusView === "encerrados" || item.placar ? <ConfrontoDetalheResultado item={item} /> : null}

      <section className="mt-3 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/75 p-4">
        <h1 className="text-base font-black text-eid-fg">Informações do confronto</h1>
        <div className="mt-3 grid gap-2 text-sm">
          <p className="flex items-center gap-2 text-eid-fg">
            <CalendarClock className="h-4 w-4 text-eid-primary-300" aria-hidden />
            {item.dataHora ?? "Data a confirmar"}
          </p>
          <p className="flex items-center gap-2 text-eid-text-secondary">
            <MapPin className="h-4 w-4 text-eid-primary-300" aria-hidden />
            {item.localHref ? (
              <Link href={item.localHref} className="font-bold text-eid-primary-300 hover:underline">
                {item.local ?? "Local"}
              </Link>
            ) : (
              item.local ?? "Local a confirmar"
            )}
          </p>
          {item.placar ? (
            <p className="flex items-center gap-2 text-eid-fg">
              <Trophy className="h-4 w-4 text-eid-action-400" aria-hidden />
              Resultado: <span className="font-black">{item.placar}</span>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
