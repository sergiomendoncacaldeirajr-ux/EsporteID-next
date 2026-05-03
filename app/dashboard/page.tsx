import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DashboardStreamConfrontosProximosSkeleton,
  DashboardStreamLocaisSkeleton,
  DashboardStreamTorneiosSkeleton,
  DashboardStreamVagasEquipesSkeleton,
} from "@/components/loading/dashboard-stream-skeletons";
import { MatchIdadeGateBanner } from "@/components/perfil/match-idade-gate-banner";
import { ProfileFriendlyStatusToggle } from "@/components/perfil/profile-friendly-status-toggle";
import { AmistosoDailyHint } from "@/components/dashboard/amistoso-daily-hint";
import { FindChallengeCta } from "@/components/dashboard/find-challenge-cta";
import { EidStreamSection } from "@/components/eid-stream-section";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { getAuthContextState } from "@/lib/auth/active-context-server";
import { getCachedProfileLegalRow } from "@/lib/auth/profile-legal-cache";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { legalAcceptanceIsCurrent } from "@/lib/legal/acceptance";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";
import { SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { getAgendaTeamContext, partidaRowTemResultadoParaRevisaoOponente } from "@/lib/agenda/partidas-usuario";
import { firstOf, iniciais, primeiroNome, whenLabel, type PartidaResumo } from "./dashboard-helpers";
import { dashboardAppNavClass } from "./dashboard-layout-classes";
import {
  IconLocationCard,
  IconMapPin,
  IconMarketplace,
  IconReservaRapida,
  IconTorneioCard,
  IconUsers,
} from "./dashboard-icons";
import { DashboardStreamLocais } from "./dashboard-stream-locais";
import { DashboardStreamConfrontosProximos } from "./dashboard-stream-confrontos-proximos";
import { DashboardStreamTorneios } from "./dashboard-stream-torneios";
import { DashboardStreamVagasEquipes } from "./dashboard-stream-vagas-equipes";

export const metadata = {
  title: "Painel",
  description: "Área logada do EsporteID",
};

type Props = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim().toLowerCase();
  const contextState = await getAuthContextState();
  const { user, activeContext } = contextState;
  const { supabase } = await getServerAuth();
  if (!user) {
    redirect("/login?next=/dashboard");
  }
  if (activeContext === "organizador" && contextState.papeis.includes("organizador")) {
    redirect("/organizador");
  }
  const gate = await getCachedProfileLegalRow(user.id);
  if (!gate || !legalAcceptanceIsCurrent(gate)) {
    redirect("/conta/aceitar-termos");
  }
  if (!gate.perfil_completo) {
    redirect("/onboarding");
  }

  const [featureCfg, profileRes] = await Promise.all([
    getSystemFeatureConfig(supabase),
    supabase
      .from("profiles")
      .select("nome, avatar_url, localizacao, lat, lng, match_idade_gate, disponivel_amistoso, disponivel_amistoso_ate, perfil_completo")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const canSeeLocais = canAccessSystemFeature(featureCfg, "locais", user.id);
  const canSeeTorneios = canAccessSystemFeature(featureCfg, "torneios", user.id);
  const canSeeProfessores = canAccessSystemFeature(featureCfg, "professores", user.id);
  const canSeeMarketplace = canAccessSystemFeature(featureCfg, "marketplace", user.id);
  const profile = profileRes.data;

  if (!profile) {
    redirect("/onboarding");
  }

  const hasProfessor = contextState.papeis.includes("professor");
  const hasEspaco = contextState.papeis.includes("espaco");
  const amistosoLigado = computeDisponivelAmistosoEffective(profile.disponivel_amistoso, profile.disponivel_amistoso_ate);

  const myLat = Number(profile.lat ?? NaN);
  const myLng = Number(profile.lng ?? NaN);
  const hasMyCoords = Number.isFinite(myLat) && Number.isFinite(myLng);

  const { teamIds: dashTeamIds, teamClause: dashTeamClause } = await getAgendaTeamContext(supabase, user.id);
  const dashMatchOr =
    dashTeamIds.length > 0
      ? `usuario_id.eq.${user.id},adversario_id.eq.${user.id},desafiante_time_id.in.(${dashTeamIds.join(",")}),adversario_time_id.in.(${dashTeamIds.join(",")})`
      : `usuario_id.eq.${user.id},adversario_id.eq.${user.id}`;
  const partidasDashOr = `jogador1_id.eq.${user.id},jogador2_id.eq.${user.id},usuario_id.eq.${user.id}${dashTeamClause}`;

  const partidasAgendadasResumoPromise = supabase
    .from("partidas")
    .select("id, data_partida, data_registro, torneio_id, esportes(nome)")
    .or(partidasDashOr)
    .eq("status", "agendada")
    .order("data_partida", { ascending: true, nullsFirst: false })
    .limit(20);

  const placarPendenteResumoPromise = supabase
    .from("partidas")
    .select("id, data_partida, data_registro, torneio_id, esportes(nome), data_resultado, placar_1, placar_2")
    .or(partidasDashOr)
    .eq("status", "aguardando_confirmacao")
    .neq("lancado_por", user.id)
    .order("data_registro", { ascending: false })
    .limit(40)
    .then(({ data, error }) => ({
      data: (data ?? []).filter(partidaRowTemResultadoParaRevisaoOponente).slice(0, 20),
      error,
    }));

  const [
    { data: activeMatches },
    { data: meusEsportes },
    { data: partidasAgendadasResumo },
    { data: placarPendenteResumo },
    reservaRowsBundle,
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("usuario_id, adversario_id, status")
      .or(dashMatchOr)
      .in("status", ["Pendente", "Aceito", "CancelamentoPendente", "ReagendamentoPendente"]),
    supabase
      .from("usuario_eid")
      .select("esporte_id, esportes(nome)")
      .eq("usuario_id", user.id)
      .order("esporte_id", { ascending: true })
      .limit(3),
    partidasAgendadasResumoPromise,
    placarPendenteResumoPromise,
    canSeeLocais
      ? Promise.all([
          supabase
            .from("espaco_socios")
            .select("espaco_generico_id, espacos_genericos!inner(id, slug, nome_publico, ativo_listagem)")
            .eq("usuario_id", user.id)
            .eq("status", "ativo"),
          supabase
            .from("espaco_reserva_atalhos")
            .select("espaco_generico_id, espacos_genericos!inner(id, slug, nome_publico, ativo_listagem)")
            .eq("usuario_id", user.id),
        ])
      : Promise.resolve(null),
  ]);

  const activeOpponentIds = new Set<string>();
  for (const m of activeMatches ?? []) {
    const usuarioId = String((m as { usuario_id?: string | null }).usuario_id ?? "");
    const adversarioId = String((m as { adversario_id?: string | null }).adversario_id ?? "");
    if (usuarioId === user.id && adversarioId) activeOpponentIds.add(adversarioId);
    else if (adversarioId === user.id && usuarioId) activeOpponentIds.add(usuarioId);
  }

  const meusEsportesResumo = (meusEsportes ?? [])
    .map((row) => {
      const esporteNome =
        (Array.isArray(row.esportes) ? row.esportes[0] : row.esportes)?.nome?.trim() || `Esporte ${row.esporte_id}`;
      return {
        esporteId: Number(row.esporte_id ?? 0),
        esporteNome,
      };
    })
    .filter((item) => Number.isFinite(item.esporteId) && item.esporteId > 0);
  const meusEsportesSet = new Set(meusEsportesResumo.map((item) => item.esporteId));
  const esportePrincipalId = meusEsportes?.[0]?.esporte_id ?? null;
  const esporteCardNome = meusEsportesResumo[0]?.esporteNome ?? "Esporte";

  const reservaRapidaMap = new Map<number, { id: number; slug: string | null; nome_publico: string | null }>();
  if (reservaRowsBundle) {
    const [sociosRes, atalhosRes] = reservaRowsBundle;
    const sociosAtivosRows = sociosRes.data;
    const atalhosRows = atalhosRes.data;
    for (const row of [...(sociosAtivosRows ?? []), ...(atalhosRows ?? [])]) {
      const espacoRaw = Array.isArray(row.espacos_genericos) ? row.espacos_genericos[0] : row.espacos_genericos;
      const espacoId = Number(espacoRaw?.id ?? row.espaco_generico_id ?? 0);
      if (!Number.isFinite(espacoId) || espacoId < 1) continue;
      if (!espacoRaw?.ativo_listagem) continue;
      if (reservaRapidaMap.has(espacoId)) continue;
      reservaRapidaMap.set(espacoId, {
        id: espacoId,
        slug: String(espacoRaw?.slug ?? "") || null,
        nome_publico: espacoRaw?.nome_publico ?? "Espaço",
      });
    }
  }
  const espacosReservaRapida = Array.from(reservaRapidaMap.values());
  const reservaHref =
    espacosReservaRapida.length <= 1 && espacosReservaRapida[0]?.slug
      ? `/reservar/${encodeURIComponent(String(espacosReservaRapida[0].slug))}`
      : "/reservar";
  const mostrarReservarRapido = espacosReservaRapida.length > 0;

  const agora = new Date();
  const agoraMs = agora.getTime();
  const proximasPartidas = (partidasAgendadasResumo ?? [])
    .map((p) => ({ raw: p as PartidaResumo, atMs: p.data_partida ? new Date(p.data_partida).getTime() : Number.NaN }))
    .filter((x) => Number.isFinite(x.atMs))
    .sort((a, b) => a.atMs - b.atMs);
  const proximaPartida = proximasPartidas.find((x) => x.atMs >= agoraMs)?.raw ?? proximasPartidas[0]?.raw ?? null;
  const esporteProximaPartida = firstOf(proximaPartida?.esportes)?.nome ?? "seu esporte";
  const hasPlacarPendente = (placarPendenteResumo?.length ?? 0) > 0;

  let mensagemTopo = "Sua evolução está em dia";
  let mensagemTopoHref: string | null = null;
  let mensagemTopoTom: "ok" | "aviso" = "ok";

  if (proximaPartida?.data_partida) {
    const when = whenLabel(proximaPartida.data_partida);
    if (proximaPartida.torneio_id) {
      mensagemTopo = `Prioridade: partida de torneio ${when}. Confira na agenda.`;
    } else {
      mensagemTopo = `Jogo ${when} em ${esporteProximaPartida}.`;
    }
    mensagemTopoHref = "/agenda";
    mensagemTopoTom = "aviso";
  } else if (hasPlacarPendente) {
    const qtd = placarPendenteResumo?.length ?? 0;
    mensagemTopo = qtd === 1 ? "Você tem 1 placar aguardando sua revisão." : `Você tem ${qtd} placares aguardando sua revisão.`;
    mensagemTopoHref = "/agenda#placares";
    mensagemTopoTom = "aviso";
  }

  const matchHref =
    esportePrincipalId != null
      ? `/match?esporte=${encodeURIComponent(String(esportePrincipalId))}&tipo=todas`
      : "/match?tipo=todas";

  const matchIdadeGate = String(profile.match_idade_gate ?? "ok");

  const statusFromFeature = (
    canSee: boolean,
    mode: "ativo" | "em_breve" | "desenvolvimento" | "teste",
  ): "active" | "coming" | "testing" | "blocked" => {
    if (canSee) return "active";
    if (mode === "em_breve") return "coming";
    if (mode === "teste") return "testing";
    return "blocked";
  };

  const navItems = [
    {
      label: "Locais",
      shortLabel: "Locais",
      href: canSeeLocais ? "/locais" : undefined,
      icon: IconLocationCard,
      status: statusFromFeature(canSeeLocais, featureCfg.locais.mode),
    },
    ...(mostrarReservarRapido
      ? [
          {
            label: "Reservar",
            shortLabel: "Reservar",
            href: reservaHref,
            icon: IconReservaRapida,
            status: "active" as const,
          },
        ]
      : []),
    {
      label: "Vagas",
      shortLabel: "Vagas",
      href: "/times",
      icon: IconUsers,
      status: "active" as const,
    },
    {
      label: "Torneios",
      shortLabel: "Torneios",
      href: canSeeTorneios ? "/torneios" : undefined,
      icon: IconTorneioCard,
      status: statusFromFeature(canSeeTorneios, featureCfg.torneios.mode),
    },
    {
      label: "MarketPlace",
      shortLabel: "Market",
      href: canSeeMarketplace ? "/comunidade" : undefined,
      icon: IconMarketplace,
      status: statusFromFeature(canSeeMarketplace, featureCfg.marketplace.mode),
    },
  ];
  const quickNavMain = navItems;

  const myTeamsInClause = dashTeamIds.length > 0 ? dashTeamIds.join(",") : "";
  const dashTeamIdSet = new Set(dashTeamIds);

  return (
    <div
      className="relative z-0 mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col px-3 pb-[calc(var(--eid-shell-footer-offset)+1rem)] pt-0 sm:max-w-2xl sm:px-6 sm:pt-1 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]"
      data-eid-dashboard-page
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-44 bg-[radial-gradient(ellipse_95%_60%_at_50%_-10%,rgba(37,99,235,0.1),transparent_55%)] sm:h-52" aria-hidden />
      <div className={`eid-dashboard-hero relative mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-4`}>
        <div
          className="eid-dashboard-hero-glow pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eid-primary-500/15 blur-3xl"
          aria-hidden
        />
        <div
          className="eid-dashboard-hero-glow pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-eid-action-500/12 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="relative flex shrink-0 flex-col items-center gap-1.5">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt="Seu avatar"
                width={72}
                height={72}
                unoptimized
                className={`h-[4.25rem] w-[4.25rem] rounded-full border-[3px] object-cover ring-2 ring-offset-2 ring-offset-eid-card sm:h-[4.5rem] sm:w-[4.5rem] ${
                  amistosoLigado
                    ? "border-emerald-400/80 shadow-[0_8px_24px_-6px_rgba(16,185,129,0.5)] ring-emerald-400/35"
                    : "border-red-500/80 shadow-[0_8px_24px_-6px_rgba(239,68,68,0.48)] ring-red-500/30"
                }`}
              />
            ) : (
              <div
                className={`flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border-[3px] bg-eid-surface text-lg font-bold text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)] ring-2 ring-offset-2 ring-offset-eid-card sm:h-[4.5rem] sm:w-[4.5rem] ${
                  amistosoLigado
                    ? "border-emerald-400/80 shadow-[0_8px_24px_-6px_rgba(16,185,129,0.5)] ring-emerald-400/35"
                    : "border-red-500/80 shadow-[0_8px_24px_-6px_rgba(239,68,68,0.48)] ring-red-500/30"
                }`}
              >
                {iniciais(profile.nome)}
              </div>
            )}
            <ProfileFriendlyStatusToggle
              userId={user.id}
              initialOn={amistosoLigado}
              initialExpiresAt={profile.disponivel_amistoso_ate ? String(profile.disponivel_amistoso_ate) : null}
              canToggle
            />
            <AmistosoDailyHint />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-eid-action-400">Painel</p>
            <h1 className="mt-0.5 text-base font-black leading-tight text-eid-fg sm:text-lg">Olá, {primeiroNome(profile.nome)}!</h1>
            {mensagemTopoHref ? (
              <Link
                href={mensagemTopoHref}
                className={`mt-1.5 inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.04em] transition hover:brightness-110 sm:text-[11px] ${
                  mensagemTopoTom === "aviso"
                    ? "border border-eid-action-500/35 bg-eid-action-500/10 text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-action-500)_42%)]"
                    : "border border-eid-primary-500/35 bg-eid-primary-500/12 text-[color:color-mix(in_srgb,var(--eid-fg)_65%,var(--eid-primary-500)_35%)]"
                }`}
              >
                <span className="truncate">{mensagemTopo}</span>
              </Link>
            ) : (
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:color-mix(in_srgb,var(--eid-fg)_52%,var(--eid-primary-500)_48%)] sm:text-[11px]">
                {mensagemTopo}
              </p>
            )}
            {profile.localizacao ? (
              <p className="mt-1.5 truncate text-xs text-eid-text-secondary">{profile.localizacao}</p>
            ) : null}
            {meusEsportesResumo.length > 0 ? (
              <div className="-mx-1 mt-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-max min-w-full items-center gap-1.5">
                  {meusEsportesResumo.map((item) => (
                    <span
                      key={item.esporteId}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-1 text-[10px] font-semibold text-[color:color-mix(in_srgb,var(--eid-fg)_62%,var(--eid-primary-500)_38%)]"
                      title={item.esporteNome}
                    >
                      <SportGlyphIcon sportName={item.esporteNome} />
                      <span className="truncate">{item.esporteNome}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <MatchIdadeGateBanner gate={matchIdadeGate} />
        </div>

        <FindChallengeCta href={matchHref} />
      </div>

      <nav aria-label="Atalhos do app" className={`${dashboardAppNavClass} mt-4 sm:mt-5`}>
        <div className={`grid gap-1.5 sm:gap-2 ${navItems.length >= 4 ? "grid-cols-4" : navItems.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {quickNavMain.map((item) => {
            const Icon = item.icon;
            const cardContent = (
              <>
                {item.status === "coming" ? (
                  <span className="absolute right-1 top-1 rounded-full border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] bg-[color:color-mix(in_srgb,var(--eid-surface)_88%,var(--eid-card)_12%)] px-1.5 py-[1px] text-[6px] font-black uppercase tracking-[0.08em] text-eid-text-secondary sm:right-1.5 sm:top-1.5">
                    Em breve
                  </span>
                ) : item.status === "testing" ? (
                  <span className="absolute right-1 top-1 rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-1.5 py-[1px] text-[6px] font-black uppercase tracking-[0.08em] text-eid-action-400 sm:right-1.5 sm:top-1.5">
                    Em teste
                  </span>
                ) : null}
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border sm:h-11 sm:w-11 sm:rounded-2xl ${
                    item.status !== "active"
                      ? "border-transparent bg-eid-surface/45 text-eid-text-secondary"
                      : "border-transparent bg-eid-primary-500/14 text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)]"
                  }`}
                >
                  <Icon className="h-[22px] w-[22px] sm:h-6 sm:w-6" />
                </span>
                <span
                  className={`text-[8px] font-extrabold uppercase leading-tight tracking-wide sm:text-[9px] ${item.status !== "active" ? "text-eid-text-secondary" : "text-eid-fg"}`}
                >
                  <span className="sm:hidden">{item.shortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </span>
                {item.status === "coming" ? (
                  <span className="text-[7px] font-semibold leading-none text-eid-text-secondary/85 sm:text-[8px]">em breve</span>
                ) : item.status === "testing" ? (
                  <span className="text-[7px] font-semibold leading-none text-eid-action-400/90 sm:text-[8px]">pilotos</span>
                ) : item.status === "blocked" ? (
                  <span className="text-[7px] font-semibold leading-none text-eid-text-secondary/85 sm:text-[8px]">indisponível</span>
                ) : null}
              </>
            );

            if (item.status === "active" && item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="eid-dashboard-app-nav-item eid-list-item relative flex min-h-[4rem] flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent bg-transparent px-1 py-1.5 text-center transition hover:border-[color:color-mix(in_srgb,var(--eid-primary-500)_28%,transparent)] hover:bg-eid-primary-500/10 active:scale-[0.98] sm:min-h-[4.35rem] sm:rounded-xl sm:py-2"
                >
                  {cardContent}
                </Link>
              );
            }
            return (
              <div
                key={item.label}
                aria-disabled
                className="eid-dashboard-app-nav-item eid-list-item relative flex min-h-[4rem] flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent bg-transparent px-1 py-1.5 text-center opacity-75 sm:min-h-[4.35rem] sm:rounded-xl sm:py-2"
              >
                {cardContent}
              </div>
            );
          })}
        </div>
      </nav>

      {hasProfessor && canSeeProfessores ? (
        <Link
          href="/professor"
          className="eid-btn-soft mt-3 flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl border-eid-action-500/35 bg-eid-action-500/10 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-[color:color-mix(in_srgb,var(--eid-fg)_55%,var(--eid-action-500)_45%)] sm:mt-4 sm:text-[11px]"
        >
          <IconUsers className="h-5 w-5 shrink-0 text-eid-action-400" />
          Painel do professor
        </Link>
      ) : null}
      {hasEspaco && canSeeLocais ? (
        <Link
          href="/espaco"
          className="eid-btn-soft mt-3 flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-xl border-eid-primary-500/35 bg-eid-primary-500/12 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-[color:color-mix(in_srgb,var(--eid-fg)_62%,var(--eid-primary-500)_38%)] sm:mt-4 sm:text-[11px]"
        >
          <IconMapPin className="h-5 w-5 shrink-0 text-[color:color-mix(in_srgb,var(--eid-fg)_58%,var(--eid-primary-500)_42%)]" />
          Painel do espaço
        </Link>
      ) : null}
      {q ? (
        <p className="mt-4 rounded-xl border border-transparent bg-eid-surface/40 px-3 py-2 text-xs text-eid-text-secondary shadow-none">
          Busca ativa por: <span className="font-semibold text-eid-fg">{sp.q}</span>
        </p>
      ) : null}

      <div className="eid-progressive-enter space-y-0">
        <EidStreamSection fallback={<DashboardStreamConfrontosProximosSkeleton />}>
          <DashboardStreamConfrontosProximos
            supabase={supabase}
            userId={user.id}
            q={q}
            hasMyCoords={hasMyCoords}
            myLat={myLat}
            myLng={myLng}
            activeOpponentIds={activeOpponentIds}
            meusEsportesSet={meusEsportesSet}
            esportePrincipalId={esportePrincipalId != null ? Number(esportePrincipalId) : null}
            esporteCardNome={esporteCardNome}
            dashTeamIds={dashTeamIds}
            dashTeamIdSet={dashTeamIdSet}
            myTeamsInClause={myTeamsInClause}
            matchHref={matchHref}
          />
        </EidStreamSection>
        <EidStreamSection fallback={<DashboardStreamVagasEquipesSkeleton />}>
          <DashboardStreamVagasEquipes
            supabase={supabase}
            userId={user.id}
            q={q}
            hasMyCoords={hasMyCoords}
            myLat={myLat}
            myLng={myLng}
            activeOpponentIds={activeOpponentIds}
            meusEsportesSet={meusEsportesSet}
            esportePrincipalId={esportePrincipalId != null ? Number(esportePrincipalId) : null}
            esporteCardNome={esporteCardNome}
            dashTeamIds={dashTeamIds}
            dashTeamIdSet={dashTeamIdSet}
            myTeamsInClause={myTeamsInClause}
            matchHref={matchHref}
          />
        </EidStreamSection>
        <EidStreamSection fallback={<DashboardStreamTorneiosSkeleton />}>
          <DashboardStreamTorneios
            supabase={supabase}
            canSeeTorneios={canSeeTorneios}
            hasMyCoords={hasMyCoords}
            myLat={myLat}
            myLng={myLng}
            meusEsportesSet={meusEsportesSet}
            q={q}
          />
        </EidStreamSection>
        <EidStreamSection fallback={<DashboardStreamLocaisSkeleton />}>
          <DashboardStreamLocais
            supabase={supabase}
            canSeeLocais={canSeeLocais}
            hasMyCoords={hasMyCoords}
            myLat={myLat}
            myLng={myLng}
            meusEsportesSet={meusEsportesSet}
            q={q}
          />
        </EidStreamSection>
      </div>
    </div>
  );
}
