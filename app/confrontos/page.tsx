import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { ConfrontoCard } from "@/components/confrontos/confronto-card";
import {
  confrontoPage,
  loadPublicConfrontos,
  normalizeConfrontoStatusView,
  normalizeConfrontoTipo,
  type ConfrontoStatusView,
  type ConfrontoTipo,
} from "@/lib/confrontos/public-feed";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Confrontos | EsporteID",
};

function href(next: { view?: ConfrontoStatusView; tipo?: ConfrontoTipo; page?: number; esporte?: number | null }) {
  const params = new URLSearchParams();
  if (next.view && next.view !== "proximos") params.set("view", next.view);
  if (next.tipo && next.tipo !== "individual") params.set("tipo", next.tipo);
  if (next.esporte) params.set("esporte", String(next.esporte));
  if (next.page && next.page > 1) params.set("page", String(next.page));
  const q = params.toString();
  return q ? `/confrontos?${q}` : "/confrontos";
}

function SegLink({ active, children, href: to }: { active: boolean; children: ReactNode; href: string }) {
  return (
    <Link
      href={to}
      className={`inline-flex min-h-8 flex-1 items-center justify-center rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.06em] transition ${
        active ? "bg-eid-primary-500/20 text-eid-primary-300 shadow-[0_8px_18px_-14px_rgba(37,99,235,0.75)]" : "text-eid-text-secondary hover:bg-eid-surface/60"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function ConfrontosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/confrontos");

  const view = normalizeConfrontoStatusView(sp.view);
  const tipo = normalizeConfrontoTipo(sp.tipo);
  const page = confrontoPage(sp.page);
  const esporteParam = Array.isArray(sp.esporte) ? sp.esporte[0] : sp.esporte;
  let esporteId = Math.max(0, Number(esporteParam ?? 0) || 0) || null;
  if (!esporteId) {
    const { data: principal } = await supabase
      .from("usuario_esportes")
      .select("esporte_id")
      .eq("usuario_id", user.id)
      .order("esporte_id", { ascending: true })
      .limit(1)
      .maybeSingle();
    esporteId = Number((principal as { esporte_id?: number | null } | null)?.esporte_id ?? 0) || null;
  }
  const { items, hasMore } = await loadPublicConfrontos({
    supabase,
    viewerId: user.id,
    statusView: view,
    tipo,
    esporteId,
    page,
  });

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col px-3 pb-[calc(var(--eid-shell-content-bottom-pad)+4.75rem)] pt-3 sm:max-w-2xl sm:px-6 sm:pb-[var(--eid-shell-content-bottom-pad)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href="/ranking" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 text-eid-primary-300">
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <span className="inline-flex items-center gap-1 rounded-full border border-eid-action-500/30 bg-eid-action-500/12 px-3 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-eid-action-300">
          <CalendarDays className="h-3 w-3" aria-hidden />
          Central
        </span>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,var(--eid-primary-500)_4%),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.8)]">
        <h1 className="text-xl font-black tracking-normal text-eid-fg">Confrontos</h1>
        <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
          Próximos jogos e resultados recentes por modalidade, priorizando horário e localização.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-eid-surface/55 p-1">
          <SegLink active={view === "proximos"} href={href({ view: "proximos", tipo, esporte: esporteId })}>
            Próximos
          </SegLink>
          <SegLink active={view === "encerrados"} href={href({ view: "encerrados", tipo, esporte: esporteId })}>
            Encerrados
          </SegLink>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-eid-surface/55 p-1">
          <SegLink active={tipo === "individual"} href={href({ view, tipo: "individual", esporte: esporteId })}>
            Individual
          </SegLink>
          <SegLink active={tipo === "dupla"} href={href({ view, tipo: "dupla", esporte: esporteId })}>
            Duplas
          </SegLink>
          <SegLink active={tipo === "time"} href={href({ view, tipo: "time", esporte: esporteId })}>
            Times
          </SegLink>
        </div>
      </section>

      <section className="mt-3 grid gap-3">
        {items.length ? (
          items.map((item) => <ConfrontoCard key={item.id} item={item} />)
        ) : (
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/65 p-6 text-center">
            <p className="text-sm font-bold text-eid-fg">Nenhum confronto encontrado</p>
            <p className="mt-1 text-xs text-eid-text-secondary">Troque a modalidade ou volte mais tarde.</p>
          </div>
        )}
      </section>

      {hasMore ? (
        <Link
          href={href({ view, tipo, esporte: esporteId, page: page + 1 })}
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-2xl border border-eid-primary-500/30 bg-eid-primary-500/12 px-4 text-[11px] font-black uppercase tracking-[0.06em] text-eid-primary-300"
        >
          Ver mais
        </Link>
      ) : null}
    </main>
  );
}
