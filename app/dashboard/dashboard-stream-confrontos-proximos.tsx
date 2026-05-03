import Image from "next/image";
import Link from "next/link";
import { EidSectionInfo } from "@/components/ui/eid-section-info";
import { EidSealPill } from "@/components/ui/eid-seal-pill";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { firstOf, iniciais, primeiroNome } from "./dashboard-helpers";
import {
  dashboardEmptyWide,
  dashboardSectionBody,
  dashboardSectionHead,
  dashboardSectionOuter,
  dashboardSpotlightEmpty,
  dashboardSpotlightLink,
  sectionActionClass,
  sectionTitleClass,
} from "./dashboard-layout-classes";
import { getDashboardRadarSpotlightPayload, type DashboardRadarTeamsArgs } from "./dashboard-radar-teams-payload";

export type DashboardStreamConfrontosProximosProps = DashboardRadarTeamsArgs;

export async function DashboardStreamConfrontosProximos(props: DashboardStreamConfrontosProximosProps) {
  const {
    atletaMaisProximo,
    duplaMaisProxima,
    timeMaisProximo,
    esporteCardNome,
    matchHref,
    q,
  } = await getDashboardRadarSpotlightPayload(props);

  return (
    <section className={`${dashboardSectionOuter} mt-6 sm:mt-8`}>
      <div className={dashboardSectionHead}>
        <div className="flex items-center gap-1.5">
          <h2 className={sectionTitleClass}>Confrontos próximos</h2>
          <EidSectionInfo sectionLabel="Confrontos próximos">
            Destaques em <strong>individual</strong>, <strong>dupla</strong> e <strong>time</strong> pelo seu esporte principal e proximidade.
          </EidSectionInfo>
        </div>
        <a href={matchHref} className={sectionActionClass}>
          Ver todos
        </a>
      </div>
      <div className={dashboardSectionBody}>
        {atletaMaisProximo || duplaMaisProxima || timeMaisProximo ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {atletaMaisProximo ? (
              (() => {
                const { row, p } = atletaMaisProximo;
                const atletaAmistosoOn = computeDisponivelAmistosoEffective(
                  p?.disponivel_amistoso,
                  p?.disponivel_amistoso_ate,
                );
                return (
                  <Link
                    key={p?.id ?? "atleta-individual"}
                    href={`/perfil/${encodeURIComponent(String(p?.id ?? ""))}?from=/dashboard`}
                    className={dashboardSpotlightLink}
                  >
                    <p className="mb-1 truncate text-[10px] font-black tracking-tight text-eid-fg">{primeiroNome(p?.nome)}</p>
                    <div className="relative mx-auto h-12 w-12">
                      {p?.avatar_url ? (
                        <Image
                          src={p.avatar_url}
                          alt=""
                          fill
                          unoptimized
                          className={`h-full w-full rounded-full border-2 object-cover ${
                            atletaAmistosoOn ? "border-emerald-400/80" : "border-red-500/80"
                          }`}
                        />
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center rounded-full border-2 bg-eid-surface text-xs font-bold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] ${
                            atletaAmistosoOn ? "border-emerald-400/75" : "border-red-500/75"
                          }`}
                        >
                          {iniciais(p?.nome)}
                        </div>
                      )}
                      <div className="pointer-events-none absolute -bottom-1 left-1/2 z-[1] -translate-x-1/2">
                        <EidSealPill value={Number(row.nota_eid ?? 0)} variant="compact" />
                      </div>
                    </div>
                    <p className="mt-1.5 inline-flex max-w-full items-center justify-center gap-0.5 truncate text-[8px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] leading-none">
                      <SportGlyphIcon sportName={esporteCardNome} />
                      <span className="truncate">{esporteCardNome}</span>
                    </p>
                    <p className="mt-1 inline-flex items-center justify-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-1.5 py-px text-[7px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">
                      <ModalidadeGlyphIcon modalidade="individual" />
                      Individual
                    </p>
                  </Link>
                );
              })()
            ) : (
              <div className={dashboardSpotlightEmpty}>
                <p className="text-[11px] font-semibold text-eid-fg">Individual</p>
                <p className="mt-1 max-w-[5.5rem] text-[9px] leading-snug text-eid-text-secondary">Sem sugestão no momento</p>
              </div>
            )}

            {duplaMaisProxima ? (
              <Link href={`/perfil-time/${duplaMaisProxima.t.id}?from=/dashboard`} className={dashboardSpotlightLink}>
                <p className="mb-1 truncate text-[10px] font-black tracking-tight text-eid-fg">{primeiroNome(duplaMaisProxima.t.nome)}</p>
                <div className="relative mx-auto h-12 w-12">
                  {duplaMaisProxima.t.escudo ? (
                    <Image
                      src={duplaMaisProxima.t.escudo}
                      alt=""
                      width={44}
                      height={44}
                      unoptimized
                      className="h-full w-full rounded-[14px] border-2 border-eid-primary-500/50 object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-[14px] border-2 border-eid-primary-500/40 bg-eid-surface text-xs font-bold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)]">
                      D
                    </div>
                  )}
                  <div className="pointer-events-none absolute -bottom-1 left-1/2 z-[1] -translate-x-1/2">
                    <EidSealPill value={Number(duplaMaisProxima.t.eid_time ?? 0)} variant="compact" />
                  </div>
                </div>
                <p className="mt-1.5 inline-flex max-w-full items-center justify-center gap-0.5 truncate text-[8px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] leading-none">
                  <SportGlyphIcon
                    sportName={String(
                      firstOf(
                        duplaMaisProxima.t.esportes as { nome?: string | null } | Array<{ nome?: string | null }> | null,
                      )?.nome ?? "Esporte",
                    )}
                  />
                  <span className="truncate">
                    {String(
                      firstOf(
                        duplaMaisProxima.t.esportes as { nome?: string | null } | Array<{ nome?: string | null }> | null,
                      )?.nome ?? "Esporte",
                    )}
                  </span>
                </p>
                <p className="mt-1 inline-flex items-center justify-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-1.5 py-px text-[7px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">
                  <ModalidadeGlyphIcon modalidade="dupla" />
                  Dupla
                </p>
              </Link>
            ) : (
              <div className={dashboardSpotlightEmpty}>
                <p className="text-[11px] font-semibold text-eid-fg">Dupla</p>
                <p className="mt-1 max-w-[5.5rem] text-[9px] leading-snug text-eid-text-secondary">Sem sugestão no momento</p>
              </div>
            )}

            {timeMaisProximo ? (
              <Link href={`/perfil-time/${timeMaisProximo.t.id}?from=/dashboard`} className={dashboardSpotlightLink}>
                <p className="mb-1 truncate text-[10px] font-black tracking-tight text-eid-fg">{primeiroNome(timeMaisProximo.t.nome)}</p>
                <div className="relative mx-auto h-12 w-12">
                  {timeMaisProximo.t.escudo ? (
                    <Image
                      src={timeMaisProximo.t.escudo}
                      alt=""
                      width={44}
                      height={44}
                      unoptimized
                      className="h-full w-full rounded-[14px] border-2 border-eid-primary-500/50 object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-[14px] border-2 border-eid-primary-500/40 bg-eid-surface text-xs font-bold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)]">
                      T
                    </div>
                  )}
                  <div className="pointer-events-none absolute -bottom-1 left-1/2 z-[1] -translate-x-1/2">
                    <EidSealPill value={Number(timeMaisProximo.t.eid_time ?? 0)} variant="compact" />
                  </div>
                </div>
                <p className="mt-1.5 inline-flex max-w-full items-center justify-center gap-0.5 truncate text-[8px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] leading-none">
                  <SportGlyphIcon
                    sportName={String(
                      firstOf(
                        timeMaisProximo.t.esportes as { nome?: string | null } | Array<{ nome?: string | null }> | null,
                      )?.nome ?? "Esporte",
                    )}
                  />
                  <span className="truncate">
                    {String(
                      firstOf(
                        timeMaisProximo.t.esportes as { nome?: string | null } | Array<{ nome?: string | null }> | null,
                      )?.nome ?? "Esporte",
                    )}
                  </span>
                </p>
                <p className="mt-1 inline-flex items-center justify-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-1.5 py-px text-[7px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">
                  <ModalidadeGlyphIcon modalidade="time" />
                  Time
                </p>
              </Link>
            ) : (
              <div className={dashboardSpotlightEmpty}>
                <p className="text-[11px] font-semibold text-eid-fg">Time</p>
                <p className="mt-1 max-w-[5.5rem] text-[9px] leading-snug text-eid-text-secondary">Sem sugestão no momento</p>
              </div>
            )}
          </div>
        ) : (
          <div className={dashboardEmptyWide}>
            <p className="text-sm font-semibold text-eid-fg">Nada por aqui ainda</p>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-eid-text-secondary">
              {q
                ? "Nenhum resultado para a busca atual. Tente outro termo ou explore o radar."
                : "Quando houver sugestões no seu esporte principal, elas aparecem nesta grade."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
