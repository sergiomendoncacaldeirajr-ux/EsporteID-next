import Image from "next/image";
import Link from "next/link";
import { EidSectionInfo } from "@/components/ui/eid-section-info";
import { EidSealPill } from "@/components/ui/eid-seal-pill";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { firstOf, primeiroNome, vagasAbertasLabel } from "./dashboard-helpers";
import {
  dashboardEmptyWide,
  dashboardSectionBody,
  dashboardSectionHead,
  dashboardSectionOuter,
  dashboardSpotlightLink,
  scrollRow,
  sectionActionClass,
  sectionTitleClass,
} from "./dashboard-layout-classes";
import { getDashboardRadarVagasPayload, type DashboardRadarTeamsArgs } from "./dashboard-radar-teams-payload";

export type DashboardStreamVagasEquipesProps = DashboardRadarTeamsArgs;

export async function DashboardStreamVagasEquipes(props: DashboardStreamVagasEquipesProps) {
  const { timesFiltrados, teamRosterMap, q, hasMyCoords } = await getDashboardRadarVagasPayload(props);

  return (
    <section className={`${dashboardSectionOuter} mt-6 sm:mt-8`}>
      <div className={dashboardSectionHead}>
        <div className="flex items-center gap-1.5">
          <h2 className={sectionTitleClass}>Vagas para equipes</h2>
          <EidSectionInfo sectionLabel="Vagas para equipes">
            <strong>Duplas e times</strong> com vagas abertas, ordenados por proximidade e pelos esportes do seu perfil.
          </EidSectionInfo>
        </div>
        <Link href="/times" className={sectionActionClass}>
          Ver todos
        </Link>
      </div>
      <div className={dashboardSectionBody}>
        {timesFiltrados.length > 0 ? (
          <div className={scrollRow}>
            {timesFiltrados.map(({ t, dist }) => (
              <Link
                key={t.id}
                href={`/perfil-time/${t.id}?from=/dashboard`}
                className={`${dashboardSpotlightLink} min-w-[124px] max-w-[124px] shrink-0 snap-start`}
              >
                <p className="mb-1 truncate text-[10px] font-black tracking-tight text-eid-fg">{primeiroNome(t.nome)}</p>
                <div className="relative mx-auto h-12 w-12">
                  {t.escudo ? (
                    <Image
                      src={t.escudo}
                      alt=""
                      width={44}
                      height={44}
                      unoptimized
                      className="h-full w-full rounded-[14px] border-2 border-eid-primary-500/50 object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-[14px] border-2 border-eid-primary-500/40 bg-eid-surface text-xs font-bold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)]">
                      {String(t.tipo ?? "").toLowerCase() === "dupla" ? "D" : "T"}
                    </div>
                  )}
                  <div className="pointer-events-none absolute -bottom-1 left-1/2 z-[1] -translate-x-1/2">
                    <EidSealPill value={Number(t.eid_time ?? 0)} variant="compact" />
                  </div>
                </div>
                <p className="mt-1.5 inline-flex max-w-full items-center justify-center gap-0.5 truncate text-[8px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] leading-none">
                  <SportGlyphIcon
                    sportName={String(
                      firstOf(t.esportes as { nome?: string | null } | Array<{ nome?: string | null }> | null)?.nome ??
                        "Esporte",
                    )}
                  />
                  <span className="truncate">
                    {String(
                      firstOf(t.esportes as { nome?: string | null } | Array<{ nome?: string | null }> | null)?.nome ??
                        "Esporte",
                    )}
                  </span>
                </p>
                <p className="mt-1 inline-flex items-center justify-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-1.5 py-px text-[7px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">
                  <ModalidadeGlyphIcon modalidade={String(t.tipo ?? "").toLowerCase() === "dupla" ? "dupla" : "time"} />
                  {String(t.tipo ?? "").toLowerCase() === "dupla" ? "Dupla" : "Time"}
                </p>
                <p className="mt-1 inline-flex items-center justify-center rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-1.5 py-px text-[7px] font-black uppercase tracking-[0.08em] text-eid-action-300">
                  {vagasAbertasLabel(t.tipo, teamRosterMap.get(Number(t.id ?? 0)) ?? null)}
                </p>
                {hasMyCoords && dist < 9000 ? (
                  <p className="mt-1 inline-flex min-h-[1.2rem] items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] bg-eid-surface/55 px-2 py-0.5 text-[8px] font-bold tabular-nums text-[color:color-mix(in_srgb,var(--eid-fg)_48%,var(--eid-primary-500)_52%)]">
                    {`${dist.toFixed(1).replace(".", ",")} km`}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <div className={dashboardEmptyWide}>
            <p className="text-sm font-semibold text-eid-fg">Sem vagas listadas</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-eid-text-secondary">
              {q
                ? "Nenhuma equipe bate com a busca. Tente outro termo."
                : "Não encontramos duplas/times com vagas no seu esporte por perto. Atualize o perfil ou volte depois."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
