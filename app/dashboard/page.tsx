import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MatchIdadeGateBanner } from "@/components/perfil/match-idade-gate-banner";
import { ProfileFriendlyStatusToggle } from "@/components/perfil/profile-friendly-status-toggle";
import { getAuthContextState } from "@/lib/auth/active-context-server";
import { distanciaKm } from "@/lib/geo/distance-km";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";
import { sportIconEmoji } from "@/lib/perfil/sport-icon-emoji";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";

export const metadata = {
  title: "Painel",
  description: "Área logada do EsporteID",
};

function primeiroNome(nome?: string | null) {
  const n = (nome ?? "").trim();
  return n ? n.split(/\s+/u)[0] : "Atleta";
}

function iniciais(nome?: string | null) {
  const n = (nome ?? "").trim();
  if (!n) return "E";
  return n
    .split(/\s+/u)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  searchParams?: Promise<{ q?: string }>;
};

type ProfileMini = {
  id?: string;
  nome?: string | null;
  avatar_url?: string | null;
  localizacao?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
  disponivel_amistoso?: boolean | null;
  disponivel_amistoso_ate?: string | null;
};

type AtletaRow = {
  nota_eid?: number | null;
  usuario_id?: string;
  profiles?: ProfileMini | ProfileMini[] | null;
};

type PartidaResumo = {
  id: number;
  data_partida: string | null;
  data_registro: string | null;
  torneio_id?: number | null;
  esportes?: { nome?: string | null } | Array<{ nome?: string | null }> | null;
};

function firstProfile(p: AtletaRow["profiles"]): ProfileMini | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function whenLabel(iso: string | null) {
  if (!iso) return "em breve";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "em breve";
  const now = new Date();
  const amanha = new Date(now);
  amanha.setDate(amanha.getDate() + 1);
  const hora = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (isSameDay(dt, now)) return `hoje às ${hora}`;
  if (isSameDay(dt, amanha)) return `amanhã às ${hora}`;
  const data = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${data} às ${hora}`;
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08-.07-.12C7.59 10.71 7 8.33 7 8c0-.34.25-.66.5-.83C8.5 6.5 10 5 11 4c.33-.25.83-.25 1.17 0 .33.25.33.75 0 1l-1.5 4H16c.42 0 .67.46.42.79l-5 7c-.25.33-.79.25-1.04-.08L11 21z" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="9" cy="9" r="2.4" />
      <circle cx="15" cy="10" r="2" />
      <path d="M4.7 18.2a4.3 4.3 0 0 1 8.6 0" />
      <path d="M13.2 18.2a3.5 3.5 0 0 1 4.2-3.4" />
      <path d="M19.2 8.3v3.2" />
      <path d="M17.6 9.9h3.2" />
    </svg>
  );
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function IconTrophy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
    </svg>
  );
}

function IconMarketplace({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4.5 9.5h15l-1.2 8.8a2 2 0 0 1-2 1.7H7.7a2 2 0 0 1-2-1.7L4.5 9.5Z" />
      <path d="M8 9.5V8a4 4 0 1 1 8 0v1.5" />
      <path d="M12 12.7v3.8" />
      <path d="M10.1 14.6H13.9" />
      <path d="M15.9 6.1l1.4-1.4" />
      <path d="M6.7 6.1l1.4-1.4" />
    </svg>
  );
}

function IconLocationCard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 20.8s5.8-5.2 5.8-9.5A5.8 5.8 0 0 0 6.2 11.3c0 4.3 5.8 9.5 5.8 9.5Z" />
      <circle cx="12" cy="11.2" r="2.1" />
      <path d="M4 19.5c2.3-1.2 4.8-1.8 8-1.8s5.7.6 8 1.8" />
    </svg>
  );
}

function IconTorneioCard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4.2 6.2h3.2v3H4.2z" />
      <path d="M16.6 6.2h3.2v3h-3.2z" />
      <path d="M4.2 14.8h3.2v3H4.2z" />
      <path d="M16.6 14.8h3.2v3h-3.2z" />
      <path d="M7.4 7.7h2.4v8.6H7.4" />
      <path d="M14.2 7.7h-2.4v8.6h2.4" />
      <path d="M9.8 12h2" />
    </svg>
  );
}

const scrollRow =
  "-mx-3 flex gap-2.5 overflow-x-auto px-3 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 sm:gap-3 sm:px-6 [&::-webkit-scrollbar]:hidden";

const sectionActionClass =
  "inline-flex shrink-0 items-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.05em] text-eid-text-secondary transition hover:border-eid-primary-500/30 hover:text-eid-fg sm:text-[9px]";

const sectionTitleClass =
  "text-[9px] font-bold uppercase tracking-[0.12em] text-eid-primary-400/90 sm:text-[10px]";

const dashboardBlockClass =
  "eid-surface-panel relative overflow-hidden rounded-[1.2rem] border-eid-primary-500/25 bg-gradient-to-br from-eid-card via-eid-card to-eid-primary-950/40 px-3 py-2.5 shadow-[0_18px_40px_-22px_rgba(37,99,235,0.35)] sm:rounded-2xl sm:px-4 sm:py-3";

export default async function DashboardPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim().toLowerCase();
  const contextState = await getAuthContextState();
  const { user, activeContext } = contextState;
  const supabase = await createClient();
  if (!user) {
    redirect("/login?next=/dashboard");
  }
  if (activeContext === "organizador" && contextState.papeis.includes("organizador")) {
    redirect("/organizador");
  }
  const featureCfg = await getSystemFeatureConfig(supabase);
  const canSeeLocais = canAccessSystemFeature(featureCfg, "locais", user.id);
  const canSeeTorneios = canAccessSystemFeature(featureCfg, "torneios", user.id);
  const canSeeProfessores = canAccessSystemFeature(featureCfg, "professores", user.id);
  const canSeeOrganizador = canAccessSystemFeature(featureCfg, "organizador_torneios", user.id);
  const canSeeMarketplace = canAccessSystemFeature(featureCfg, "marketplace", user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "nome, avatar_url, localizacao, lat, lng, termos_aceitos_em, perfil_completo, match_idade_gate, disponivel_amistoso, disponivel_amistoso_ate"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.termos_aceitos_em) {
    redirect("/conta/aceitar-termos");
  }
  if (!profile.perfil_completo) {
    redirect("/onboarding");
  }

  const hasProfessor = contextState.papeis.includes("professor");
  const hasEspaco = contextState.papeis.includes("espaco");
  const amistosoLigado = computeDisponivelAmistosoEffective(profile.disponivel_amistoso, profile.disponivel_amistoso_ate);

  const myLat = Number(profile.lat ?? NaN);
  const myLng = Number(profile.lng ?? NaN);
  const hasMyCoords = Number.isFinite(myLat) && Number.isFinite(myLng);

  const { data: meusEsportes } = await supabase
    .from("usuario_eid")
    .select("esporte_id, esportes(nome)")
    .eq("usuario_id", user.id)
    .order("esporte_id", { ascending: true })
    .limit(3);
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
  const esportePrincipalId = meusEsportes?.[0]?.esporte_id ?? null;

  let atletasQuery = supabase
    .from("usuario_eid")
    .select(
      "nota_eid, usuario_id, profiles!inner(id, nome, avatar_url, localizacao, lat, lng, disponivel_amistoso, disponivel_amistoso_ate)"
    )
    .neq("usuario_id", user.id)
    .order("nota_eid", { ascending: false })
    .limit(80);
  if (esportePrincipalId != null) {
    atletasQuery = atletasQuery.eq("esporte_id", esportePrincipalId);
  }
  const { data: atletasRaw } = await atletasQuery;

  const atletasRows = (atletasRaw ?? []) as AtletaRow[];
  let atletasComDist: Array<{ row: AtletaRow; p: ProfileMini | null; dist: number }> = atletasRows.map((row) => {
    const p = firstProfile(row.profiles);
    const lat = Number(p?.lat ?? NaN);
    const lng = Number(p?.lng ?? NaN);
    const dist = hasMyCoords ? distanciaKm(myLat, myLng, lat, lng) : 99999;
    return { row, p, dist };
  });
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

  let torneiosQuery = supabase
    .from("torneios")
    .select("id, nome, status, data_inicio, banner")
    .eq("status", "aberto")
    .order("criado_em", { ascending: false })
    .limit(24);
  if (esportePrincipalId != null) {
    torneiosQuery = torneiosQuery.eq("esporte_id", esportePrincipalId);
  }
  const { data: torneios } = canSeeTorneios ? await torneiosQuery : { data: [] };
  const torneiosFiltrados = (torneios ?? []).filter((t) => {
    if (!q) return true;
    return String(t.nome ?? "").toLowerCase().includes(q);
  });

  let timesQuery = supabase
    .from("times")
    .select("id, nome, tipo, localizacao, escudo, esporte_id, vagas_abertas, lat, lng, criador_id, pontos_ranking, eid_time")
    .neq("criador_id", user.id)
    .order("pontos_ranking", { ascending: false })
    .limit(40);
  if (esportePrincipalId != null) {
    timesQuery = timesQuery.eq("esporte_id", esportePrincipalId);
  }
  const { data: timesRaw } = await timesQuery;
  const timesComDist = (timesRaw ?? []).map((t) => {
    const lat = Number(t.lat ?? NaN);
    const lng = Number(t.lng ?? NaN);
    const dist = hasMyCoords && Number.isFinite(lat) && Number.isFinite(lng) ? distanciaKm(myLat, myLng, lat, lng) : 99999;
    return { t, dist };
  });
  timesComDist.sort((a, b) => a.dist - b.dist);
  const timesFiltrados = timesComDist
    .filter(({ t }) => {
      if (!q) return true;
      return (
        String(t.nome ?? "").toLowerCase().includes(q) || String(t.localizacao ?? "").toLowerCase().includes(q)
      );
    })
    .slice(0, 12);
  const duplaMaisProxima = timesComDist.find(({ t }) => String(t.tipo ?? "").toLowerCase() === "dupla");
  const timeMaisProximo = timesComDist.find(({ t }) => String(t.tipo ?? "").toLowerCase() === "time");
  const atletaMaisProximo = atletasFiltrados[0] ?? null;
  const esporteCardNome = meusEsportesResumo[0]?.esporteNome ?? "Esporte";
  const esporteCardIcon = sportIconEmoji(esporteCardNome);

  const { data: locaisScroll } = canSeeLocais
    ? await supabase
        .from("espacos_genericos")
        .select("id, nome_publico, logo_arquivo, localizacao")
        .eq("ativo_listagem", true)
        .order("id", { ascending: false })
        .limit(12)
    : { data: [] };

  const { data: partidasAgendadasResumo } = await supabase
    .from("partidas")
    .select("id, data_partida, data_registro, torneio_id, esportes(nome)")
    .or(`jogador1_id.eq.${user.id},jogador2_id.eq.${user.id},usuario_id.eq.${user.id}`)
    .eq("status", "agendada")
    .order("data_partida", { ascending: true, nullsFirst: false })
    .limit(20);

  const { data: placarPendenteResumo } = await supabase
    .from("partidas")
    .select("id, data_partida, data_registro, torneio_id, esportes(nome)")
    .or(`jogador1_id.eq.${user.id},jogador2_id.eq.${user.id}`)
    .eq("status", "aguardando_confirmacao")
    .neq("lancado_por", user.id)
    .order("data_registro", { ascending: false })
    .limit(20);

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
      mensagemTopo = `Próxima ação: jogo ${when} em ${esporteProximaPartida}.`;
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
      ? `/match?esporte=${encodeURIComponent(String(esportePrincipalId))}&tipo=atleta`
      : "/match";

  const matchIdadeGate = String(profile.match_idade_gate ?? "ok");

  const navItems = [
    { label: "Vagas", shortLabel: "Vagas", href: "/vagas", icon: IconUsers, soon: false },
    { label: "MarketPlace", shortLabel: "Market", href: canSeeMarketplace ? "/marketplace" : undefined, icon: IconMarketplace, soon: !canSeeMarketplace },
    { label: "Locais", shortLabel: "Locais", href: canSeeLocais ? "/locais" : undefined, icon: IconLocationCard, soon: !canSeeLocais },
    { label: "Torneios", shortLabel: "Torneios", href: canSeeTorneios ? "/torneios" : undefined, icon: IconTorneioCard, soon: !canSeeTorneios },
  ];
  const quickNavMain = navItems;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-[calc(var(--eid-shell-footer-offset)-0.75rem)] pt-3 sm:px-6 sm:pb-[calc(var(--eid-shell-footer-offset)-0.5rem)] sm:pt-4">
        <div className="eid-surface-panel relative overflow-hidden rounded-[1.35rem] border-eid-primary-500/25 bg-gradient-to-br from-eid-card via-eid-card to-eid-primary-950/40 p-4 shadow-[0_24px_56px_-22px_rgba(37,99,235,0.4)] sm:rounded-2xl sm:p-6">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eid-primary-500/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-eid-action-500/12 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-wrap items-center gap-4">
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Seu avatar"
                  className={`h-[4.25rem] w-[4.25rem] rounded-full border-[3px] object-cover ring-2 ring-offset-2 ring-offset-eid-card sm:h-[4.5rem] sm:w-[4.5rem] ${
                    amistosoLigado
                      ? "border-emerald-400/80 shadow-[0_8px_24px_-6px_rgba(16,185,129,0.5)] ring-emerald-400/35"
                      : "border-red-500/80 shadow-[0_8px_24px_-6px_rgba(239,68,68,0.48)] ring-red-500/30"
                  }`}
                />
              ) : (
                <div
                  className={`flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border-[3px] bg-eid-surface text-lg font-bold text-eid-primary-300 ring-2 ring-offset-2 ring-offset-eid-card sm:h-[4.5rem] sm:w-[4.5rem] ${
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
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[1.35rem] font-extrabold leading-tight tracking-tight text-eid-fg sm:text-2xl">
                Olá, {primeiroNome(profile.nome)}!
              </h1>
              {mensagemTopoHref ? (
                <Link
                  href={mensagemTopoHref}
                  className={`mt-1 inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.04em] transition hover:brightness-110 sm:text-[11px] ${
                    mensagemTopoTom === "aviso"
                      ? "border border-eid-action-500/35 bg-eid-action-500/10 text-eid-action-400"
                      : "border border-eid-primary-500/30 bg-eid-primary-500/10 text-eid-primary-300"
                  }`}
                >
                  <span className="truncate">{mensagemTopo}</span>
                </Link>
              ) : (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-eid-primary-400 sm:text-[11px]">
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
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-eid-primary-500/25 bg-eid-surface/55 px-2 py-1 text-[10px] font-semibold text-eid-primary-300"
                        title={item.esporteNome}
                      >
                        <span aria-hidden>{sportIconEmoji(item.esporteNome)}</span>
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

          <a
            href={matchHref}
            className="eid-btn-dashboard-cta relative mt-1 mb-2 flex w-full items-center justify-center gap-2.5 sm:mt-1.5 sm:mb-2.5"
          >
            <IconBolt className="h-5 w-5 shrink-0 text-white drop-shadow-sm" />
            Encontrar desafio
          </a>
        </div>

        <div className={`mt-4 grid gap-1.5 sm:mt-5 sm:gap-2 ${navItems.length >= 4 ? "grid-cols-4" : navItems.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {quickNavMain.map((item) => {
            const Icon = item.icon;
            const cardContent = (
              <>
                {item.soon ? (
                  <span className="absolute right-1 top-1 rounded-full border border-[color:color-mix(in_srgb,var(--eid-border-subtle)_78%,var(--eid-primary-500)_22%)] bg-[color:color-mix(in_srgb,var(--eid-surface)_88%,var(--eid-card)_12%)] px-1.5 py-[1px] text-[6px] font-black uppercase tracking-[0.08em] text-eid-text-secondary sm:right-1.5 sm:top-1.5">
                    Em breve
                  </span>
                ) : null}
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border sm:h-11 sm:w-11 sm:rounded-2xl ${
                    item.soon
                      ? "border-[color:var(--eid-border-subtle)] bg-eid-surface/55 text-eid-text-secondary"
                      : "border-eid-primary-500/30 bg-eid-primary-500/14 text-eid-primary-300"
                  }`}
                >
                  <Icon className="h-[22px] w-[22px] sm:h-6 sm:w-6" />
                </span>
                <span className={`text-[8px] font-extrabold uppercase leading-tight tracking-wide sm:text-[9px] ${item.soon ? "text-eid-text-secondary" : "text-eid-fg"}`}>
                  <span className="sm:hidden">{item.shortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </span>
                <span className={`text-[7px] font-semibold leading-none sm:text-[8px] ${item.soon ? "text-eid-text-secondary/85" : "text-eid-primary-300/95"}`}>
                  {item.soon ? "indisponível" : "abrir"}
                </span>
              </>
            );

            if (!item.soon && item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="eid-list-item relative flex min-h-[4.2rem] flex-col items-center justify-center gap-0.5 rounded-xl border-[color:var(--eid-border-subtle)] bg-gradient-to-b from-eid-surface/90 to-eid-card/85 px-1 py-1.5 text-center transition hover:-translate-y-[1px] hover:border-eid-primary-500/40 hover:shadow-[0_10px_26px_-14px_rgba(37,99,235,0.5)] sm:min-h-[4.5rem] sm:rounded-2xl sm:py-2"
                >
                  {cardContent}
                </Link>
              );
            }
            return (
              <div
                key={item.label}
                aria-disabled
                className="eid-list-item relative flex min-h-[4.2rem] flex-col items-center justify-center gap-0.5 rounded-xl border-[color:var(--eid-border-subtle)] bg-gradient-to-b from-eid-surface/75 to-eid-card/75 px-1 py-1.5 text-center opacity-80 sm:min-h-[4.5rem] sm:rounded-2xl sm:py-2"
              >
                {cardContent}
              </div>
            );
          })}
        </div>

        {hasProfessor && canSeeProfessores ? (
          <Link
            href="/professor"
            className="eid-btn-soft mt-2 flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-2xl border-eid-action-500/35 bg-eid-action-500/10 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-eid-action-400 sm:text-[11px]"
          >
            <IconUsers className="h-5 w-5 shrink-0 text-eid-action-400" />
            Painel do professor
          </Link>
        ) : null}
        {hasEspaco && canSeeLocais ? (
          <Link
            href="/espaco"
            className="eid-btn-soft mt-2 flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-2xl border-eid-primary-500/35 bg-eid-primary-500/12 px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-eid-primary-300 sm:text-[11px]"
          >
            <IconMapPin className="h-5 w-5 shrink-0 text-eid-primary-300" />
            Painel do espaço
          </Link>
        ) : null}
        {q ? (
          <p className="mt-4 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2 text-xs text-eid-text-secondary">
            Busca ativa por: <span className="font-semibold text-eid-fg">{sp.q}</span>
          </p>
        ) : null}

        <section className={`mt-7 sm:mt-9 ${dashboardBlockClass}`}>
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <h2 className={sectionTitleClass}>Atletas próximos</h2>
            <a href={matchHref} className={sectionActionClass}>
              Ver todos
            </a>
          </div>
          {atletaMaisProximo || duplaMaisProxima || timeMaisProximo ? (
            <div className="grid grid-cols-3 gap-1.5">
              {atletaMaisProximo
                ? (() => {
                    const { row, p, dist } = atletaMaisProximo;
                const atletaAmistosoOn = computeDisponivelAmistosoEffective(
                  p?.disponivel_amistoso,
                  p?.disponivel_amistoso_ate
                );
                return (
                <Link
                  key={p?.id ?? "atleta-individual"}
                  href={`/perfil/${encodeURIComponent(String(p?.id ?? ""))}?from=/dashboard`}
                  className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] px-1 py-1 text-center shadow-[0_10px_20px_-14px_rgba(15,23,42,0.38)] transition hover:border-eid-primary-500/40"
                >
                  <p className="mb-px truncate text-[9px] font-extrabold text-eid-fg">{primeiroNome(p?.nome)}</p>
                  <div className="relative mx-auto h-11 w-11">
                    {p?.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt=""
                        className={`h-full w-full rounded-full border-2 object-cover ${
                          atletaAmistosoOn ? "border-emerald-400/80" : "border-red-500/80"
                        }`}
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center rounded-full border-2 bg-eid-surface text-xs font-bold text-eid-primary-300 ${
                          atletaAmistosoOn ? "border-emerald-400/75" : "border-red-500/75"
                        }`}
                      >
                        {iniciais(p?.nome)}
                      </div>
                    )}
                    <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 overflow-hidden rounded-md border border-eid-bg text-[8px] font-black leading-none">
                      <span className="bg-eid-bg px-1 py-0.5 text-eid-fg">EID</span>
                      <span className="bg-eid-primary-500 px-1 py-0.5 text-[var(--eid-brand-ink)]">
                        {Number(row.nota_eid ?? 0).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-px inline-flex max-w-full items-center gap-0.5 truncate text-[7px] font-semibold text-eid-primary-300 leading-none">
                    <span aria-hidden>{esporteCardIcon}</span>
                    <span className="truncate">{esporteCardNome}</span>
                  </p>
                  <p className="mt-0 inline-flex items-center gap-0.5 text-[7px] font-semibold uppercase tracking-[0.05em] text-eid-text-secondary leading-none">
                    <span aria-hidden>👤</span> Individual
                  </p>
                </Link>
                );
                  })()
                : (
                  <div className="rounded-2xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-1.5 py-2 text-center">
                    <p className="text-[10px] font-bold text-eid-text-secondary">Sem atleta</p>
                    <p className="mt-1 text-[9px] text-eid-text-secondary">individual</p>
                  </div>
                )}

              {duplaMaisProxima ? (
                <Link
                  href={`/perfil-time/${duplaMaisProxima.t.id}?from=/dashboard`}
                  className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] px-1 py-1 text-center shadow-[0_10px_20px_-14px_rgba(15,23,42,0.38)] transition hover:border-eid-primary-500/40"
                >
                  <p className="mb-px truncate text-[9px] font-extrabold text-eid-fg">{duplaMaisProxima.t.nome}</p>
                  <div className="mx-auto h-11 w-11">
                    {duplaMaisProxima.t.escudo ? (
                      <img src={duplaMaisProxima.t.escudo} alt="" className="h-full w-full rounded-[14px] border-2 border-eid-primary-500/50 object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-[14px] border-2 border-eid-primary-500/40 bg-eid-surface text-xs font-bold text-eid-primary-300">
                        D
                      </div>
                    )}
                  </div>
                  <p className="mt-px inline-flex max-w-full items-center gap-0.5 truncate text-[7px] font-semibold text-eid-primary-300 leading-none">
                    <span aria-hidden>{esporteCardIcon}</span>
                    <span className="truncate">{esporteCardNome}</span>
                  </p>
                  <p className="mt-0 inline-flex items-center gap-0.5 text-[7px] font-semibold uppercase tracking-[0.05em] text-eid-text-secondary leading-none">
                    <span aria-hidden>👥</span> Dupla
                  </p>
                </Link>
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-1.5 py-2 text-center">
                  <p className="text-[10px] font-bold text-eid-text-secondary">Sem dupla</p>
                  <p className="mt-1 text-[9px] text-eid-text-secondary">próxima</p>
                </div>
              )}

              {timeMaisProximo ? (
                <Link
                  href={`/perfil-time/${timeMaisProximo.t.id}?from=/dashboard`}
                  className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] px-1 py-1 text-center shadow-[0_10px_20px_-14px_rgba(15,23,42,0.38)] transition hover:border-eid-primary-500/40"
                >
                  <p className="mb-px truncate text-[9px] font-extrabold text-eid-fg">{timeMaisProximo.t.nome}</p>
                  <div className="mx-auto h-11 w-11">
                    {timeMaisProximo.t.escudo ? (
                      <img src={timeMaisProximo.t.escudo} alt="" className="h-full w-full rounded-[14px] border-2 border-eid-primary-500/50 object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-[14px] border-2 border-eid-primary-500/40 bg-eid-surface text-xs font-bold text-eid-primary-300">
                        T
                      </div>
                    )}
                  </div>
                  <p className="mt-px inline-flex max-w-full items-center gap-0.5 truncate text-[7px] font-semibold text-eid-primary-300 leading-none">
                    <span aria-hidden>{esporteCardIcon}</span>
                    <span className="truncate">{esporteCardNome}</span>
                  </p>
                  <p className="mt-0 inline-flex items-center gap-0.5 text-[7px] font-semibold uppercase tracking-[0.05em] text-eid-text-secondary leading-none">
                    <span aria-hidden>🛡️</span> Time
                  </p>
                </Link>
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-1.5 py-2 text-center">
                  <p className="text-[10px] font-bold text-eid-text-secondary">Sem time</p>
                  <p className="mt-1 text-[9px] text-eid-text-secondary">próximo</p>
                </div>
              )}
            </div>
          ) : (
            <p className="eid-list-item rounded-2xl border-dashed bg-eid-surface/45 p-4 text-sm text-eid-text-secondary">
              {q ? "Nenhum atleta encontrado para essa busca." : "Ainda não há atletas sugeridos para seu esporte principal."}
            </p>
          )}
        </section>

        {canSeeTorneios ? (
        <section className={`mt-7 sm:mt-9 ${dashboardBlockClass}`}>
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <h2 className={sectionTitleClass}>Torneios em aberto</h2>
            <Link href="/torneios" className={sectionActionClass}>
              Explorar
            </Link>
          </div>
          {torneiosFiltrados.length > 0 ? (
            <div className={scrollRow}>
              {torneiosFiltrados.map((t) => (
                <Link
                  key={t.id}
                  href={`/torneios/${t.id}?from=/dashboard`}
                  className="min-w-[210px] max-w-[210px] shrink-0 snap-start overflow-hidden rounded-[22px] border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] shadow-[0_12px_30px_-16px_rgba(15,23,42,0.4)] transition hover:border-eid-primary-500/40 hover:shadow-[0_18px_34px_-18px_rgba(37,99,235,0.38)]"
                >
                  <div className="h-[95px] w-full bg-eid-surface">
                    {t.banner ? (
                      <img src={t.banner} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] font-bold text-eid-text-secondary">Torneio</div>
                    )}
                  </div>
                  <p className="px-2.5 py-2.5 text-[11px] font-extrabold leading-snug text-eid-fg">{t.nome}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="eid-list-item rounded-2xl border-dashed bg-eid-surface/50 p-5 text-center text-sm leading-relaxed text-eid-text-secondary">
              {q ? "Nenhum torneio encontrado para essa busca." : "Sem torneios no momento."}
            </p>
          )}
        </section>
        ) : null}

        <section className={`mt-7 sm:mt-9 ${dashboardBlockClass}`}>
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <h2 className={sectionTitleClass}>Times &amp; recrutamento</h2>
            <Link href="/times" className={sectionActionClass}>
              Ver todos
            </Link>
          </div>
          {timesFiltrados.length > 0 ? (
            <div className={scrollRow}>
              {timesFiltrados.map(({ t, dist }) => (
                <Link
                  key={t.id}
                  href={`/perfil-time/${t.id}?from=/dashboard`}
                  className="min-w-[118px] max-w-[118px] shrink-0 snap-start rounded-3xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] px-2 py-3.5 text-center shadow-[0_12px_28px_-16px_rgba(15,23,42,0.38)] transition hover:border-eid-primary-500/40 hover:shadow-[0_16px_32px_-16px_rgba(37,99,235,0.34)]"
                >
                  <div className="mx-auto h-14 w-14">
                    {t.escudo ? (
                      <img src={t.escudo} alt="" className="h-full w-full rounded-[14px] border-2 border-eid-primary-500/50 object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-[14px] border-2 border-eid-primary-500/40 bg-eid-surface text-xs font-bold text-eid-primary-300">
                        T
                      </div>
                    )}
                  </div>
                  <p className="mt-3 truncate text-[11px] font-extrabold text-eid-fg">{t.nome}</p>
                  <p className="mt-0.5 text-[10px] font-bold text-eid-primary-400">
                    {hasMyCoords && dist < 9000 ? `${dist.toFixed(1).replace(".", ",")} km` : "—"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="eid-list-item rounded-2xl border-dashed bg-eid-surface/45 p-4 text-sm text-eid-text-secondary">
              {q ? "Nenhum time encontrado para essa busca." : "Nenhum time por perto."}
            </p>
          )}
        </section>

        <section className={`mt-7 sm:mt-9 ${dashboardBlockClass}`}>
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <h2 className={sectionTitleClass}>Locais na comunidade</h2>
            <Link href="/locais" className={sectionActionClass}>
              Ver lista
            </Link>
          </div>
          {locaisScroll && locaisScroll.length > 0 ? (
            <div className={scrollRow}>
              {locaisScroll.map((loc) => (
                <Link
                  key={loc.id}
                  href={`/local/${loc.id}?from=/dashboard`}
                  className="min-w-[140px] max-w-[140px] shrink-0 snap-start rounded-3xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-3 shadow-[0_12px_28px_-16px_rgba(15,23,42,0.38)] transition hover:border-eid-primary-500/40 hover:shadow-[0_16px_32px_-16px_rgba(37,99,235,0.34)]"
                >
                  <div className="flex h-12 items-center justify-center overflow-hidden rounded-xl bg-eid-surface">
                    {loc.logo_arquivo ? (
                      <img src={loc.logo_arquivo} alt="" className="max-h-10 max-w-full object-contain" />
                    ) : (
                      <IconMapPin className="h-6 w-6 text-eid-primary-500/50" />
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-[11px] font-extrabold leading-tight text-eid-fg">{loc.nome_publico}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-eid-text-secondary">{loc.localizacao}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="eid-list-item rounded-2xl border-dashed bg-eid-surface/45 p-4 text-sm text-eid-text-secondary">
              Nenhum local em destaque ainda.
            </p>
          )}

          <Link
            href="/locais/cadastrar"
            className="eid-btn-primary mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-xs font-extrabold uppercase tracking-wide active:scale-[0.98] sm:text-sm"
          >
            <IconMapPin className="h-5 w-5 shrink-0 text-[var(--eid-brand-ink)]" />
            Cadastrar local genérico
          </Link>
          <p className="mt-2 text-[10px] leading-relaxed text-eid-text-secondary sm:text-[11px]">
            Qualquer pessoa pode sugerir um espaço. Para ser o responsável oficial, envie documentação pela página do local após criá-lo.
          </p>
        </section>
    </div>
  );
}
