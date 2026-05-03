import Image from "next/image";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CadastrarLocalOverlayTrigger } from "@/components/locais/cadastrar-local-overlay-trigger";
import { EidSectionInfo } from "@/components/ui/eid-section-info";
import { distanciaKm } from "@/lib/geo/distance-km";
import { parseNumericList, type DashboardEspacoListRow } from "./dashboard-helpers";
import {
  dashboardEmptyWide,
  dashboardRailLocal,
  dashboardSectionBody,
  dashboardSectionHead,
  dashboardSectionOuter,
  scrollRow,
  sectionActionClass,
  sectionTitleClass,
} from "./dashboard-layout-classes";
import { IconMapPin } from "./dashboard-icons";

export type DashboardStreamLocaisProps = {
  supabase: SupabaseClient;
  canSeeLocais: boolean;
  hasMyCoords: boolean;
  myLat: number;
  myLng: number;
  meusEsportesSet: Set<number>;
  q: string;
};

export async function DashboardStreamLocais({
  supabase,
  canSeeLocais,
  hasMyCoords,
  myLat,
  myLng,
  meusEsportesSet,
  q,
}: DashboardStreamLocaisProps) {
  const locaisScrollPromise = canSeeLocais
    ? supabase
        .from("espacos_genericos")
        .select("id, slug, nome_publico, logo_arquivo, localizacao, lat, lng, esportes_ids, aceita_socios, modo_monetizacao, modo_reserva")
        .eq("ativo_listagem", true)
        .limit(80)
    : Promise.resolve({ data: [] as DashboardEspacoListRow[] });

  const { data: locaisScrollRaw } = await locaisScrollPromise;

  const locaisScroll = (locaisScrollRaw ?? [])
    .map((loc) => {
      const esporteIds = parseNumericList(loc.esportes_ids);
      const sportMatch = meusEsportesSet.size === 0 || esporteIds.some((id) => meusEsportesSet.has(id));
      const aceitaSocios = Boolean(loc.aceita_socios);
      const mensalidadePlataforma = String(loc.modo_monetizacao ?? "").toLowerCase() === "mensalidade_plataforma";
      const reservaPaga = ["paga", "mista"].includes(String(loc.modo_reserva ?? "").toLowerCase());
      const dist = hasMyCoords ? distanciaKm(myLat, myLng, Number(loc.lat ?? NaN), Number(loc.lng ?? NaN)) : 99999;
      const score =
        (sportMatch ? 4 : 0) + (aceitaSocios ? 2 : 0) + (mensalidadePlataforma ? 2 : 0) + (reservaPaga ? 2 : 0);
      return { ...loc, sportMatch, aceitaSocios, mensalidadePlataforma, reservaPaga, score, dist };
    })
    .filter((loc) => loc.score > 0)
    .filter((loc) => {
      if (!q) return true;
      return (
        String(loc.nome_publico ?? "").toLowerCase().includes(q) ||
        String(loc.localizacao ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.dist - b.dist || b.score - a.score)
    .slice(0, 12);

  return (
    <section className={`${dashboardSectionOuter} mt-6 sm:mt-8`}>
      <div className={dashboardSectionHead}>
        <div className="flex items-center gap-1.5">
          <h2 className={sectionTitleClass}>Locais na comunidade</h2>
          <EidSectionInfo sectionLabel="Locais na comunidade">
            Locais alinhados ao seu esporte, com preferência para <strong>sócios</strong>,{" "}
            <strong>mensalidade na plataforma</strong> e <strong>reserva paga</strong>.
          </EidSectionInfo>
        </div>
        {canSeeLocais ? (
          <Link href="/locais" className={sectionActionClass}>
            Ver lista
          </Link>
        ) : (
          <span className={sectionActionClass} aria-disabled>
            Em breve
          </span>
        )}
      </div>
      <div className={dashboardSectionBody}>
        {locaisScroll && locaisScroll.length > 0 ? (
          <div className={scrollRow}>
            {locaisScroll.map((loc) => (
              <Link
                key={loc.id}
                href={loc.slug ? `/espaco/${loc.slug}` : `/local/${loc.id}?from=/dashboard`}
                className={dashboardRailLocal}
              >
                <div className="flex h-[3.25rem] items-center justify-center overflow-hidden rounded-xl border border-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-surface)_100%,var(--eid-field-bg)_0%),color-mix(in_srgb,var(--eid-field-bg)_35%,var(--eid-surface)_65%))]">
                  {loc.logo_arquivo ? (
                    <div className="relative h-10 w-full">
                      <Image src={loc.logo_arquivo} alt="" fill unoptimized className="object-contain" />
                    </div>
                  ) : (
                    <IconMapPin className="h-6 w-6 text-eid-primary-500/50" />
                  )}
                </div>
                <p className="mt-2.5 line-clamp-2 text-[11px] font-bold leading-snug text-eid-fg">{loc.nome_publico}</p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-eid-text-secondary">{loc.localizacao}</p>
                <p className="mt-2 inline-flex items-center text-[9px] font-bold tabular-nums text-[color:color-mix(in_srgb,var(--eid-fg)_52%,var(--eid-primary-500)_48%)]">
                  <span className="mr-1 rounded-md bg-eid-primary-500/12 px-1 py-px text-[8px] font-black uppercase tracking-wide text-[color:color-mix(in_srgb,var(--eid-fg)_55%,var(--eid-primary-500)_45%)]">
                    Dist.
                  </span>
                  {hasMyCoords && loc.dist < 9000 ? `${loc.dist.toFixed(1).replace(".", ",")} km` : "—"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className={dashboardEmptyWide}>
            <p className="text-sm font-semibold text-eid-fg">Nenhum local sugerido</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-eid-text-secondary">
              Ajuste seus esportes no perfil ou cadastre um espaço para aparecer por aqui.
            </p>
          </div>
        )}

        <CadastrarLocalOverlayTrigger
          href="/locais/cadastrar?return_to=/dashboard"
          className="eid-btn-primary mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl text-xs font-extrabold uppercase tracking-wide active:scale-[0.98] sm:text-sm"
        >
          <IconMapPin className="h-5 w-5 shrink-0 text-[var(--eid-brand-ink)]" />
          Cadastrar local genérico
        </CadastrarLocalOverlayTrigger>
        <p className="mt-2 text-[10px] leading-relaxed text-eid-text-secondary sm:text-[11px]">
          Qualquer pessoa pode sugerir um espaço. Para ser o responsável oficial, envie documentação pela página do local após
          criá-lo.
        </p>
      </div>
    </section>
  );
}
