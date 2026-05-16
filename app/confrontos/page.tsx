import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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

function href(next: { view?: ConfrontoStatusView; tipo?: ConfrontoTipo; page?: number; esporte?: number | null; embed?: boolean }) {
  const params = new URLSearchParams();
  if (next.view && next.view !== "proximos") params.set("view", next.view);
  if (next.tipo && next.tipo !== "individual") params.set("tipo", next.tipo);
  if (next.esporte) params.set("esporte", String(next.esporte));
  if (next.page && next.page > 1) params.set("page", String(next.page));
  if (next.embed) params.set("embed", "1");
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
  const embed = (Array.isArray(sp.embed) ? sp.embed[0] : sp.embed) === "1";
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
    <main data-eid-confrontos-page className="mx-auto flex w-full max-w-lg flex-col px-3 pb-[calc(var(--eid-shell-content-bottom-pad)+4.75rem)] pt-3 sm:max-w-2xl sm:px-6 sm:pb-[var(--eid-shell-content-bottom-pad)]">
      {!embed ? (
        <div className="mb-3 flex items-center">
          <Link href="/ranking" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 text-eid-primary-300">
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,var(--eid-primary-500)_4%),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.8)]">
        <div className="grid grid-cols-[minmax(0,1fr)_84px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_112px]">
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-normal text-eid-fg">Confrontos</h1>
            <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
              Próximos jogos e resultados recentes por modalidade, priorizando horário e localização.
            </p>
          </div>
          <svg
            viewBox="0 0 96 82"
            className="h-[74px] w-[84px] justify-self-end drop-shadow-[0_10px_18px_rgba(37,99,235,0.18)] sm:h-[92px] sm:w-[112px]"
            aria-hidden
          >
            <defs>
              <linearGradient id="conf-card-blue" x1="10" y1="13" x2="76" y2="69" gradientUnits="userSpaceOnUse">
                <stop stopColor="var(--eid-primary-300)" />
                <stop offset="1" stopColor="var(--eid-primary-600)" />
              </linearGradient>
              <linearGradient id="conf-card-orange" x1="24" y1="5" x2="88" y2="70" gradientUnits="userSpaceOnUse">
                <stop stopColor="var(--eid-action-300)" />
                <stop offset="1" stopColor="var(--eid-action-600)" />
              </linearGradient>
            </defs>
            <rect x="8" y="15" width="58" height="45" rx="13" fill="url(#conf-card-blue)" opacity="0.16" />
            <rect x="31" y="9" width="57" height="52" rx="15" fill="url(#conf-card-orange)" opacity="0.2" />
            <path d="M26 35h14m30 0H56" stroke="var(--eid-primary-500)" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
            <circle cx="24" cy="35" r="13" fill="var(--eid-primary-500)" />
            <circle cx="72" cy="35" r="13" fill="var(--eid-action-500)" />
            <path d="M20 35h8m44-4v8m-4-4h8" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
            <rect x="34" y="27" width="28" height="16" rx="8" fill="var(--eid-card)" />
            <text x="48" y="38" textAnchor="middle" fill="var(--eid-action-500)" className="text-[8px] font-black">VS</text>
            <rect x="21" y="56" width="54" height="10" rx="5" fill="var(--eid-surface)" opacity="0.92" />
            <path d="M31 61h34" stroke="var(--eid-primary-500)" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
            <path d="M48 46v10" stroke="var(--eid-action-500)" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-eid-surface/55 p-1">
          <SegLink active={view === "proximos"} href={href({ view: "proximos", tipo, esporte: esporteId, embed })}>
            Próximos
          </SegLink>
          <SegLink active={view === "encerrados"} href={href({ view: "encerrados", tipo, esporte: esporteId, embed })}>
            Encerrados
          </SegLink>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-eid-surface/55 p-1">
          <SegLink active={tipo === "individual"} href={href({ view, tipo: "individual", esporte: esporteId, embed })}>
            Individual
          </SegLink>
          <SegLink active={tipo === "dupla"} href={href({ view, tipo: "dupla", esporte: esporteId, embed })}>
            Duplas
          </SegLink>
          <SegLink active={tipo === "time"} href={href({ view, tipo: "time", esporte: esporteId, embed })}>
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
          href={href({ view, tipo, esporte: esporteId, page: page + 1, embed })}
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-2xl border border-eid-primary-500/30 bg-eid-primary-500/12 px-4 text-[11px] font-black uppercase tracking-[0.06em] text-eid-primary-300"
        >
          Ver mais
        </Link>
      ) : null}
    </main>
  );
}
