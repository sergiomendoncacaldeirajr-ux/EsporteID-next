import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { ProfileAchievementsShelf, ProfileCompactTimeline } from "@/components/perfil/profile-history-widgets";
import { ProfilePrimaryCta, ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSportsMetricsCard } from "@/components/perfil/profile-sports-metrics-card";
import { ProfileTeamCard } from "@/components/perfil/profile-team-members-cards";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { podeExibirWhatsappPerfilPublico } from "@/lib/perfil/whatsapp-visibility";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

function waHref(whatsapp: string | null | undefined): string | null {
  const d = String(whatsapp ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
}

export default async function PerfilPublicoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const backHref = resolveBackHref(sp.from, "/match");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/perfil/${id}`);

  const { data: perfil } = await supabase
    .from("profiles")
    .select(
      "id, nome, username, avatar_url, whatsapp, localizacao, altura_cm, peso_kg, lado, foto_capa, tipo_usuario, genero, tempo_experiencia, interesse_rank_match, interesse_torneio, disponivel_amistoso, estilo_jogo, bio"
    )
    .eq("id", id)
    .maybeSingle();
  if (!perfil) notFound();

  const isSelf = user.id === id;

  const podeVerWhatsapp = await podeExibirWhatsappPerfilPublico(supabase, user.id, id, isSelf);
  const linkWpp = podeVerWhatsapp ? waHref(perfil.whatsapp) : null;

  const { data: eids } = await supabase
    .from("usuario_eid")
    .select(
      "esporte_id, nota_eid, vitorias, derrotas, pontos_ranking, partidas_jogadas, interesse_match, modalidade_match, posicao_rank, esportes(nome)"
    )
    .eq("usuario_id", id)
    .order("pontos_ranking", { ascending: false });

  const principalEid =
    eids && eids.length > 0
      ? [...eids].sort((a, b) => Number(b.nota_eid ?? 0) - Number(a.nota_eid ?? 0))[0]
      : null;
  const espPrincipal = principalEid
    ? Array.isArray(principalEid.esportes)
      ? principalEid.esportes[0]
      : principalEid.esportes
    : null;

  let vitT = 0;
  let derT = 0;
  for (const e of eids ?? []) {
    vitT += Number(e.vitorias ?? 0);
    derT += Number(e.derrotas ?? 0);
  }
  const jogosT = vitT + derT;
  const winRate = jogosT > 0 ? Math.round((vitT / jogosT) * 100) : null;

  const { data: timesLider } = await supabase
    .from("times")
    .select("id, nome, tipo, escudo, esporte_id, esportes(nome)")
    .eq("criador_id", id)
    .order("id", { ascending: false })
    .limit(12);

  const { data: duplasCadastro } = await supabase
    .from("duplas")
    .select("id, esporte_id, esportes(nome)")
    .or(`player1_id.eq.${id},player2_id.eq.${id}`)
    .limit(12);

  const primeiroEsporte = eids?.[0]?.esporte_id;

  const { data: socioRows } = await supabase
    .from("membership_requests")
    .select("espaco_generico_id, espacos_genericos!inner(id, nome_publico, localizacao)")
    .eq("usuario_id", id)
    .eq("status", "aprovado")
    .limit(20);

  const { data: frequentesRows } = await supabase
    .from("usuario_locais_frequentes")
    .select("visitas, espacos_genericos!inner(id, nome_publico, localizacao)")
    .eq("usuario_id", id)
    .order("visitas", { ascending: false })
    .limit(10);

  const { data: partidasRecentes } = await supabase
    .from("partidas")
    .select("id, jogador1_id, jogador2_id, placar_1, placar_2, status, data_resultado, data_registro")
    .or(`jogador1_id.eq.${id},jogador2_id.eq.${id}`)
    .order("data_registro", { ascending: false })
    .limit(8);

  const timeline = (partidasRecentes ?? []).map((p) => {
    const isP1 = p.jogador1_id === id;
    const isP2 = p.jogador2_id === id;
    let resultado: "V" | "D" | "—" = "—";
    if (Number.isFinite(Number(p.placar_1)) && Number.isFinite(Number(p.placar_2))) {
      const s1 = Number(p.placar_1 ?? 0);
      const s2 = Number(p.placar_2 ?? 0);
      if (isP1) resultado = s1 > s2 ? "V" : s1 < s2 ? "D" : "—";
      if (isP2) resultado = s2 > s1 ? "V" : s2 < s1 ? "D" : "—";
    }
    return { id: p.id, resultado, data: p.data_resultado ?? p.data_registro };
  });

  const conquistas: string[] = [];
  if ((eids ?? []).length >= 3) conquistas.push("Multi-esporte");
  if ((winRate ?? 0) >= 60 && jogosT >= 10) conquistas.push("Winrate 60%+");
  if ((principalEid?.posicao_rank ?? 9999) <= 10) conquistas.push("Top 10");
  if ((principalEid?.nota_eid ?? 0) >= 7) conquistas.push("EID Elite");

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-lg px-3 pb-8 pt-3 sm:max-w-2xl sm:px-6 sm:pb-10 sm:pt-4">
        <PerfilBackLink href={backHref} label="Voltar" />

        <div className="relative mt-3 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card sm:rounded-2xl">
          <div className="h-24 w-full bg-eid-surface sm:h-28 md:h-32 md:bg-gradient-to-br md:from-eid-primary-500/25 md:to-eid-card">
            {perfil.foto_capa ? (
              <img src={perfil.foto_capa} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="relative px-4 pb-4 pt-0">
            <div className="-mt-12 flex flex-col items-center sm:-mt-14 sm:flex-row sm:items-end sm:gap-4">
              {perfil.avatar_url ? (
                <img
                  src={perfil.avatar_url}
                  alt=""
                  className="h-24 w-24 shrink-0 rounded-2xl border-4 border-eid-bg object-cover shadow-md sm:h-28 sm:w-28 sm:shadow-lg"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-eid-bg bg-eid-surface text-lg font-bold text-eid-primary-300 shadow-md sm:h-28 sm:w-28 sm:shadow-lg">
                  EID
                </div>
              )}
              <div className="mt-3 w-full text-center sm:mt-0 sm:pb-1 sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="text-xl font-bold tracking-tight text-eid-fg sm:text-2xl">
                    {perfil.nome ?? "Atleta"}
                  </h1>
                  <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-eid-primary-300">
                    {perfil.tipo_usuario === "organizador" ? "Organizador" : "Atleta"}
                  </span>
                </div>
                {perfil.username ? <p className="mt-1 text-xs font-medium text-eid-primary-300">@{perfil.username}</p> : null}
                <p className="mt-1 text-sm text-eid-text-secondary">{perfil.localizacao ?? "Localização não informada"}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  <span className="rounded-full border border-eid-primary-500/30 px-2 py-0.5 text-[10px] font-semibold text-eid-primary-300">
                    {perfil.disponivel_amistoso !== false ? "Disponível para amistosos" : "Amistoso indisponível"}
                  </span>
                  <span className="rounded-full border border-eid-action-500/35 px-2 py-0.5 text-[10px] font-semibold text-eid-action-400">
                    {perfil.interesse_rank_match !== false ? "Ranking ativo" : "Somente social"}
                  </span>
                  {perfil.estilo_jogo ? (
                    <span className="rounded-full border border-[color:var(--eid-border-subtle)] px-2 py-0.5 text-[10px] font-semibold text-eid-text-secondary">
                      {perfil.estilo_jogo}
                    </span>
                  ) : null}
                </div>
                {linkWpp ? (
                  <a
                    href={linkWpp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-1.5 text-xs font-semibold text-[#25D366]"
                  >
                    WhatsApp
                  </a>
                ) : !podeVerWhatsapp && perfil.whatsapp ? (
                  <p className="mt-2 text-xs text-eid-text-secondary">
                    WhatsApp liberado quando houver match aceito entre vocês ou confronto registrado em torneio.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[color:var(--eid-border-subtle)] pt-4 text-center">
              <div>
                <p className="text-lg font-bold text-eid-fg">{vitT}</p>
                <p className="text-[10px] font-bold uppercase text-eid-text-secondary">Vitórias</p>
              </div>
              <div>
                <p className="text-lg font-bold text-eid-fg">{derT}</p>
                <p className="text-[10px] font-bold uppercase text-eid-text-secondary">Derrotas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-eid-action-500">{winRate != null ? `${winRate}%` : "—"}</p>
                <p className="text-[10px] font-bold uppercase text-eid-text-secondary">Aproveit.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <p className="text-xs text-eid-text-secondary">
                Altura: <span className="text-eid-fg">{perfil.altura_cm ?? "—"} cm</span>
              </p>
              <p className="text-xs text-eid-text-secondary">
                Peso: <span className="text-eid-fg">{perfil.peso_kg ?? "—"} kg</span>
              </p>
              <p className="text-xs text-eid-text-secondary">
                Lado: <span className="text-eid-fg">{perfil.lado ?? "—"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          <section>
            <h2 className="sr-only">Ação principal</h2>
            {!isSelf && primeiroEsporte ? (
              <ProfilePrimaryCta href={`/desafio?id=${encodeURIComponent(id)}&tipo=individual&esporte=${primeiroEsporte}`} />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <ProfilePrimaryCta href="/match" />
                <Link href="/times?create=1" className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-eid-action-500/35 px-4 text-sm font-semibold text-eid-action-400">
                  Criar Nova Dupla/Time
                </Link>
                <Link href="/onboarding" className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-[color:var(--eid-border-subtle)] px-4 text-sm font-semibold text-eid-fg">
                  Editar perfil
                </Link>
                <Link href="/conta/dados-lgpd" className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-[color:var(--eid-border-subtle)] px-4 text-sm font-semibold text-eid-fg">
                  Dados e privacidade
                </Link>
              </div>
            )}
          </section>

          <ProfileSection title="Esportes e Estatísticas">
            <div className="mt-3 grid gap-2">
              {(eids ?? []).length === 0 ? (
                <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm text-eid-text-secondary">
                  Ainda sem EID registrado por esporte.
                </p>
              ) : (
                (eids ?? []).map((e, idx) => {
                  const esp = Array.isArray(e.esportes) ? e.esportes[0] : e.esportes;
                  const soRank = e.interesse_match === "ranking";
                  const eid = Number(e.nota_eid ?? 1);
                  const rank = Number(e.pontos_ranking ?? 0);
                  const jogos = Number(e.partidas_jogadas ?? 0);
                  const p1 = Math.max(0.8, eid - 0.35);
                  const p2 = Math.max(0.8, eid - 0.1 + Number(e.vitorias ?? 0) * 0.02);
                  const p3 = Math.max(0.8, eid + Number(e.vitorias ?? 0) * 0.03 - Number(e.derrotas ?? 0) * 0.02);
                  return (
                    <details key={`${e.esporte_id}-${idx}`} className="rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)] bg-eid-card p-3.5">
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-medium text-eid-fg">{esp?.nome ?? "Esporte"}</p>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${
                              soRank
                                ? "border-[color:var(--eid-border-subtle)] bg-eid-surface text-eid-text-secondary"
                                : "border-eid-primary-500/28 bg-eid-primary-500/[0.07] text-eid-primary-300"
                            }`}
                          >
                            {soRank ? "Só ranking" : "Rank + amistoso"}
                          </span>
                        </div>
                      </summary>
                      <ProfileSportsMetricsCard
                        sportName={esp?.nome ?? "Esporte"}
                        eidValue={eid}
                        rankValue={rank}
                        trendPoints={[p1, p2, p3]}
                        footer={
                          <>
                            {jogos} jogos · {e.modalidade_match ?? "individual"}
                            {e.posicao_rank != null ? ` · pos. #${e.posicao_rank}` : ""}
                          </>
                        }
                      />
                    </details>
                  );
                })
              )}
            </div>
          </ProfileSection>

          <ProfileSection title="Minhas Equipes">
            {(timesLider ?? []).length > 0 || (duplasCadastro ?? []).length > 0 ? (
              <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1">
                {(timesLider ?? []).map((t) => {
                  const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
                  return (
                    <ProfileTeamCard
                      key={`t-${t.id}`}
                      href={`/perfil-time/${t.id}?from=/perfil/${id}`}
                      imageUrl={t.escudo}
                      title={t.nome}
                      subtitle={`${(t.tipo ?? "time").toUpperCase()} · ${esp?.nome ?? "Esporte"}`}
                    />
                  );
                })}
                {(duplasCadastro ?? []).map((d) => {
                  const esp = Array.isArray(d.esportes) ? d.esportes[0] : d.esportes;
                  return (
                    <ProfileTeamCard
                      key={`d-${d.id}`}
                      href={`/perfil-dupla/${d.id}?from=/perfil/${id}`}
                      title={`Dupla #${d.id}`}
                      subtitle={esp?.nome ?? "Esporte"}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm text-eid-text-secondary">
                Sem equipes vinculadas no momento.
              </p>
            )}
          </ProfileSection>

          {(socioRows ?? []).length > 0 || (frequentesRows ?? []).length > 0 ? (
            <ProfileSection title="Sócio e Frequência">
              {(socioRows ?? []).length > 0 ? (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-eid-text-secondary">Sócio de</p>
                  <ul className="mt-2 grid gap-2">
                    {(socioRows ?? []).map((s, idx) => {
                      const esp = Array.isArray(s.espacos_genericos) ? s.espacos_genericos[0] : s.espacos_genericos;
                      return (
                        <li key={`${s.espaco_generico_id}-${idx}`}>
                          <Link href={`/local/${esp?.id}?from=/perfil/${id}`} className="block rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-4 py-3 text-sm text-eid-fg hover:border-eid-primary-500/35">
                            {esp?.nome_publico ?? "Local"} <span className="text-xs text-eid-text-secondary">· {esp?.localizacao ?? "—"}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              {(frequentesRows ?? []).length > 0 ? (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold text-eid-text-secondary">Onde jogo</p>
                  <ul className="mt-2 grid gap-2">
                    {(frequentesRows ?? []).map((f, idx) => {
                      const esp = Array.isArray(f.espacos_genericos) ? f.espacos_genericos[0] : f.espacos_genericos;
                      return (
                        <li key={`${esp?.id}-${idx}`}>
                          <Link
                            href={`/local/${esp?.id}?from=/perfil/${id}`}
                            className="flex items-center justify-between rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-4 py-3 text-sm hover:border-eid-primary-500/35"
                          >
                            <span className="text-eid-fg">{esp?.nome_publico ?? "Local"}</span>
                            <span className="text-xs font-semibold text-eid-primary-300">{f.visitas ?? 0} visitas</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </ProfileSection>
          ) : null}

          <ProfileSection title="Histórico e Conquistas">
            <ProfileCompactTimeline
              title="Timeline (V/D)"
              emptyText="Sem jogos recentes."
              items={timeline.map((t) => ({
                id: String(t.id),
                label: `${t.resultado} · ${t.data ? new Date(t.data).toLocaleDateString("pt-BR") : "—"}`,
                tone: t.resultado === "V" ? "positive" : t.resultado === "D" ? "negative" : "neutral",
              }))}
            />
            <ProfileAchievementsShelf achievements={conquistas} emptyText="Conquistas aparecerão conforme evolução." />
          </ProfileSection>
        </div>
      </main>
    </>
  );
}
