import Image from "next/image";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EidSectionInfo } from "@/components/ui/eid-section-info";
import { distanciaKm } from "@/lib/geo/distance-km";
import type { DashboardTorneioListRow } from "./dashboard-helpers";
import {
  dashboardEmptyWide,
  dashboardRailTorneio,
  dashboardSectionBody,
  dashboardSectionHead,
  dashboardSectionOuter,
  scrollRow,
  sectionActionClass,
  sectionTitleClass,
} from "./dashboard-layout-classes";
import { IconTorneioCard } from "./dashboard-icons";

export type DashboardStreamTorneiosProps = {
  supabase: SupabaseClient;
  canSeeTorneios: boolean;
  hasMyCoords: boolean;
  myLat: number;
  myLng: number;
  meusEsportesSet: Set<number>;
  q: string;
};

export async function DashboardStreamTorneios({
  supabase,
  canSeeTorneios,
  hasMyCoords,
  myLat,
  myLng,
  meusEsportesSet,
  q,
}: DashboardStreamTorneiosProps) {
  if (!canSeeTorneios) return null;

  const esportesParaFiltro = Array.from(meusEsportesSet);
  let torneiosQuery = supabase
    .from("torneios")
    .select("id, nome, status, data_inicio, banner, esporte_id, lat, lng")
    .eq("status", "aberto")
    .order("criado_em", { ascending: false })
    .limit(36);
  if (esportesParaFiltro.length) {
    torneiosQuery = torneiosQuery.in("esporte_id", esportesParaFiltro);
  }
  const torneiosRes = await torneiosQuery;
  const torneios = torneiosRes.data;

  const torneiosFiltrados = (torneios ?? [])
    .map((t) => {
      const dist = hasMyCoords ? distanciaKm(myLat, myLng, Number(t.lat ?? NaN), Number(t.lng ?? NaN)) : 99999;
      return { ...(t as DashboardTorneioListRow), dist };
    })
    .filter((t) => {
      if (!q) return true;
      return String(t.nome ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 12);

  return (
    <section className={`${dashboardSectionOuter} mt-6 sm:mt-8`}>
      <div className={dashboardSectionHead}>
        <div className="flex items-center gap-1.5">
          <h2 className={sectionTitleClass}>Sugestões de torneios</h2>
          <EidSectionInfo sectionLabel="Sugestões de torneios">
            Inscrições <strong>abertas</strong>, filtradas pelo seu esporte e pela <strong>distância</strong> da sua
            localização.
          </EidSectionInfo>
        </div>
        <Link href="/torneios" className={sectionActionClass}>
          Explorar
        </Link>
      </div>
      <div className={dashboardSectionBody}>
        {torneiosFiltrados.length > 0 ? (
          <div className={scrollRow}>
            {torneiosFiltrados.map((t) => (
              <Link key={t.id} href={`/torneios/${t.id}?from=/dashboard`} className={dashboardRailTorneio}>
                <div className="relative h-[100px] w-full overflow-hidden bg-[color-mix(in_srgb,var(--eid-surface)_90%,var(--eid-primary-500)_10%)]">
                  {t.banner ? (
                    <div className="relative h-full w-full">
                      <Image src={t.banner} alt="" fill unoptimized className="object-cover transition duration-300 group-hover:scale-[1.03]" />
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-0.5">
                      <IconTorneioCard className="h-8 w-8 text-[color:color-mix(in_srgb,var(--eid-fg)_35%,var(--eid-primary-500)_65%)] opacity-80" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-eid-text-secondary">Torneio</span>
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-eid-bg/80 to-transparent" aria-hidden />
                </div>
                <p className="border-t border-transparent px-3 py-2.5 text-[11px] font-bold leading-snug text-eid-fg sm:text-xs sm:font-extrabold">
                  {t.nome}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className={dashboardEmptyWide}>
            <p className="text-sm font-semibold text-eid-fg">Sem torneios na lista</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-eid-text-secondary">
              {q
                ? "Nada encontrado para essa busca. Ajuste o termo ou abra a lista completa."
                : "Não há competições com inscrição aberta no seu esporte agora. Volte mais tarde ou explore todos os torneios."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
