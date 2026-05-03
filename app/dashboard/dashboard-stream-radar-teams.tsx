import Image from "next/image";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EidSectionInfo } from "@/components/ui/eid-section-info";
import { EidSealPill } from "@/components/ui/eid-seal-pill";
import { distanciaKm } from "@/lib/geo/distance-km";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import {
  type AtletaRow,
  firstOf,
  firstProfile,
  iniciais,
  primeiroNome,
  vagasAbertasLabel,
} from "./dashboard-helpers";
import {
  dashboardEmptyWide,
  dashboardSectionBody,
  dashboardSectionHead,
  dashboardSectionOuter,
  dashboardSpotlightEmpty,
  dashboardSpotlightLink,
  scrollRow,
  sectionActionClass,
  sectionTitleClass,
} from "./dashboard-layout-classes";

export type DashboardStreamRadarTeamsProps = {
  supabase: SupabaseClient;
  userId: string;
  q: string;
  hasMyCoords: boolean;
  myLat: number;
  myLng: number;
  activeOpponentIds: Set<string>;
  meusEsportesSet: Set<number>;
  esportePrincipalId: number | null;
  esporteCardNome: string;
  dashTeamIds: number[];
  dashTeamIdSet: Set<number>;
  myTeamsInClause: string;
  matchHref: string;
};

export async function DashboardStreamRadarTeams({
  supabase,
  userId,
  q,
  hasMyCoords,
  myLat,
  myLng,
  activeOpponentIds,
  meusEsportesSet,
  esportePrincipalId,
  esporteCardNome,
  dashTeamIds,
  dashTeamIdSet,
  myTeamsInClause,
  matchHref,
}: DashboardStreamRadarTeamsProps) {
  let atletasQuery = supabase
    .from("usuario_eid")
    .select(
      "nota_eid, usuario_id, profiles!inner(id, nome, avatar_url, localizacao, lat, lng, disponivel_amistoso, disponivel_amistoso_ate, match_maioridade_confirmada)",
    )
    .neq("usuario_id", userId)
    .order("nota_eid", { ascending: false })
    .limit(80);
  if (esportePrincipalId != null) {
    atletasQuery = atletasQuery.eq("esporte_id", esportePrincipalId);
  }

  const esportesParaFiltro = Array.from(meusEsportesSet);
  let timesQuery = supabase
    .from("times")
    .select("id, nome, tipo, localizacao, escudo, esporte_id, vagas_abertas, aceita_pedidos, lat, lng, criador_id, pontos_ranking, eid_time, esportes(nome)")
    .neq("criador_id", userId)
    .order("pontos_ranking", { ascending: false })
    .limit(50);
  if (esportesParaFiltro.length) {
    timesQuery = timesQuery.in("esporte_id", esportesParaFiltro);
  }

  const [{ data: atletasRaw }, { data: timesRaw }, { data: minhasFormacoesMembro }, { data: pendingColetivoRows }] =
    await Promise.all([
      atletasQuery,
      timesQuery,
      supabase.from("membros_time").select("time_id").eq("usuario_id", userId).in("status", ["ativo", "aceito", "aprovado"]),
      dashTeamIds.length > 0
        ? supabase
            .from("matches")
            .select("desafiante_time_id, adversario_time_id")
            .eq("status", "Pendente")
            .eq("finalidade", "ranking")
            .in("modalidade_confronto", ["dupla", "time"])
            .or(`desafiante_time_id.in.(${myTeamsInClause}),adversario_time_id.in.(${myTeamsInClause})`)
        : Promise.resolve({ data: [] as Array<{ desafiante_time_id?: number | null; adversario_time_id?: number | null }> }),
    ]);

  const atletasRows = (atletasRaw ?? []) as AtletaRow[];
  const atletasRowsFiltered = atletasRows.filter((row) => {
    const p = firstProfile(row.profiles);
    const id = String(p?.id ?? row.usuario_id ?? "");
    const maioridadeOk = p?.match_maioridade_confirmada === true;
    return id ? !activeOpponentIds.has(id) && maioridadeOk : false;
  });
  let atletasComDist: Array<{ row: AtletaRow; p: ReturnType<typeof firstProfile>; dist: number }> = atletasRowsFiltered.map(
    (row) => {
      const p = firstProfile(row.profiles);
      const lat = Number(p?.lat ?? NaN);
      const lng = Number(p?.lng ?? NaN);
      const dist = hasMyCoords ? distanciaKm(myLat, myLng, lat, lng) : 99999;
      return { row, p, dist };
    },
  );
  atletasComDist.sort((a, b) => {
    if (hasMyCoords) return a.dist - b.dist;
    return Number(b.row.nota_eid ?? 0) - Number(a.row.nota_eid ?? 0);
  });
  const seenAtleta = new Set<string>();
  atletasComDist = atletasComDist.filter(({ p }) => {
    const id = String(p?.id ?? "");
    if (!id) return false;
    if (seenAtleta.has(id)) return false;
    seenAtleta.add(id);
    return true;
  });
  const atletasFiltrados = atletasComDist
    .filter(({ p }) => {
      if (!q) return true;
      const nome = String(p?.nome ?? "").toLowerCase();
      const loc = String(p?.localizacao ?? "").toLowerCase();
      return nome.includes(q) || loc.includes(q);
    })
    .slice(0, 12);

  const timeIdsComDesafioRankingPendente = new Set<number>();
  for (const m of pendingColetivoRows ?? []) {
    const a = Number((m as { desafiante_time_id?: number | null }).desafiante_time_id ?? 0);
    const b = Number((m as { adversario_time_id?: number | null }).adversario_time_id ?? 0);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < 1) continue;
    if (dashTeamIdSet.has(a)) timeIdsComDesafioRankingPendente.add(b);
    if (dashTeamIdSet.has(b)) timeIdsComDesafioRankingPendente.add(a);
  }
  const meusTimesMembroIds = new Set(
    (minhasFormacoesMembro ?? [])
      .map((row) => Number((row as { time_id?: number | null }).time_id ?? 0))
      .filter((id) => Number.isFinite(id) && id > 0),
  );
  const timeCriadorIds = [...new Set((timesRaw ?? []).map((t) => String(t.criador_id ?? "")).filter(Boolean))];
  const { data: timeCriadoresProfiles } =
    timeCriadorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, match_maioridade_confirmada")
          .in("id", timeCriadorIds)
      : { data: [] as Array<{ id: string; match_maioridade_confirmada: boolean | null }> };
  const criadoresComMaioridade = new Set(
    (timeCriadoresProfiles ?? [])
      .filter((p) => p.match_maioridade_confirmada === true)
      .map((p) => String(p.id)),
  );
  const timesSemAtivos = (timesRaw ?? []).filter(
    (t) =>
      !meusTimesMembroIds.has(Number(t.id ?? 0)) &&
      !activeOpponentIds.has(String(t.criador_id ?? "")) &&
      criadoresComMaioridade.has(String(t.criador_id ?? "")) &&
      !timeIdsComDesafioRankingPendente.has(Number(t.id ?? 0)),
  );
  const timesComDist = timesSemAtivos.map((t) => {
    const lat = Number(t.lat ?? NaN);
    const lng = Number(t.lng ?? NaN);
    const dist = hasMyCoords && Number.isFinite(lat) && Number.isFinite(lng) ? distanciaKm(myLat, myLng, lat, lng) : 99999;
    return { t, dist };
  });
  timesComDist.sort((a, b) => a.dist - b.dist);
  const timesComBusca = timesComDist
    .filter(({ t }) => {
      if (!q) return true;
      return String(t.nome ?? "").toLowerCase().includes(q) || String(t.localizacao ?? "").toLowerCase().includes(q);
    })
    .filter(({ t }) => meusEsportesSet.size === 0 || meusEsportesSet.has(Number(t.esporte_id ?? 0)));
  const atletaMaisProximo = atletasFiltrados[0] ?? null;
  const duplaMaisProxima = timesComBusca.find(({ t }) => String(t.tipo ?? "").toLowerCase() === "dupla");
  const timeMaisProximo = timesComBusca.find(({ t }) => String(t.tipo ?? "").toLowerCase() === "time");

  const teamRosterIds = [
    ...new Set([...timesComBusca.map(({ t }) => Number(t.id ?? 0))].filter((id) => Number.isFinite(id) && id > 0)),
  ];
  const teamRosterMap = new Map<number, number>();
  if (teamRosterIds.length > 0) {
    const { data: headBatch, error: headBatchErr } = await supabase.rpc("time_roster_headcount_many", {
      p_time_ids: teamRosterIds,
    });
    if (!headBatchErr && Array.isArray(headBatch)) {
      for (const row of headBatch as Array<{ time_id?: number | null; headcount?: number | null }>) {
        const timeId = Number(row.time_id ?? 0);
        const hc = Number(row.headcount ?? 0);
        if (Number.isFinite(timeId) && timeId > 0) {
          teamRosterMap.set(timeId, Number.isFinite(hc) ? Math.max(0, hc) : 0);
        }
      }
    } else {
      const { data: rosterRows } = await supabase
        .from("membros_time")
        .select("time_id")
        .in("time_id", teamRosterIds)
        .in("status", ["ativo", "aceito", "aprovado"]);
      for (const row of rosterRows ?? []) {
        const timeId = Number((row as { time_id?: number | null }).time_id ?? 0);
        if (!Number.isFinite(timeId) || timeId <= 0) continue;
        teamRosterMap.set(timeId, (teamRosterMap.get(timeId) ?? 0) + 1);
      }
    }
    for (const timeId of teamRosterIds) {
      if (!teamRosterMap.has(timeId)) teamRosterMap.set(timeId, 0);
    }
  }
  const vagasDisponiveisMap = new Map<number, number>(
    timesComBusca.map(({ t }) => {
      const cap = String(t.tipo ?? "").trim().toLowerCase() === "dupla" ? 2 : 18;
      const head = teamRosterMap.get(Number(t.id ?? 0)) ?? 1;
      return [Number(t.id), Math.max(0, cap - head)] as const;
    }),
  );
  const timesComBuscaEVaga = timesComBusca.filter(
    ({ t }) =>
      Boolean(t.vagas_abertas) &&
      Boolean(t.aceita_pedidos) &&
      (vagasDisponiveisMap.get(Number(t.id ?? 0)) ?? 0) > 0,
  );
  const timesFiltrados = timesComBuscaEVaga.slice(0, 12);

  return (
    <>
      <section className={`${dashboardSectionOuter} mt-6 sm:mt-8`}>
        <div className={dashboardSectionHead}>
          <div className="flex items-center gap-1.5">
            <h2 className={sectionTitleClass}>Confrontos próximos</h2>
            <EidSectionInfo sectionLabel="Confrontos próximos">
              Destaques em <strong>individual</strong>, <strong>dupla</strong> e <strong>time</strong> pelo seu esporte
              principal e proximidade.
            </EidSectionInfo>
          </div>
          <a href={matchHref} className={sectionActionClass}>
            Ver todos
          </a>
        </div>
        <div className={dashboardSectionBody}>
          {atletaMaisProximo || duplaMaisProxima || timeMaisProximo ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {atletaMaisProximo
                ? (() => {
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
                : (
                    <div className={dashboardSpotlightEmpty}>
                      <p className="text-[11px] font-semibold text-eid-fg">Individual</p>
                      <p className="mt-1 max-w-[5.5rem] text-[9px] leading-snug text-eid-text-secondary">Sem sugestão no momento</p>
                    </div>
                  )}

              {duplaMaisProxima ? (
                <Link href={`/perfil-time/${duplaMaisProxima.t.id}?from=/dashboard`} className={dashboardSpotlightLink}>
                  <p className="mb-1 truncate text-[10px] font-black tracking-tight text-eid-fg">
                    {primeiroNome(duplaMaisProxima.t.nome)}
                  </p>
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
                          duplaMaisProxima.t.esportes as
                            | { nome?: string | null }
                            | Array<{ nome?: string | null }>
                            | null,
                        )?.nome ?? "Esporte",
                      )}
                    />
                    <span className="truncate">
                      {String(
                        firstOf(
                          duplaMaisProxima.t.esportes as
                            | { nome?: string | null }
                            | Array<{ nome?: string | null }>
                            | null,
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
    </>
  );
}
