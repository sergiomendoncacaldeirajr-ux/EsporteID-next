import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { EidBadge } from "@/components/eid/eid-badge";
import { ProfileCompactTimeline } from "@/components/perfil/profile-history-widgets";
import { FormacaoCidadeAvisoLider } from "@/components/perfil/formacao-cidade-aviso-lider";
import { ProfilePrimaryCta, ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSportsMetricsCard } from "@/components/perfil/profile-sports-metrics-card";
import { ProfileMemberCard } from "@/components/perfil/profile-team-members-cards";
import { SugerirMatchLiderForm } from "@/components/perfil/sugerir-match-lider-form";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import {
  formacaoTemMatchAceitoEntre,
  podeExibirWhatsappPerfilFormacao,
  waMeHref,
} from "@/lib/perfil/whatsapp-visibility";
import { loginNextWithOptionalFrom } from "@/lib/auth/login-next-path";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import { computeRankingBlockedUntilColetivo } from "@/lib/match/coletivo-ranking-cooldown";
import { formatCooldownRemaining } from "@/lib/match/cooldown-remaining";
import { ProfileFormacaoResultados } from "@/components/perfil/profile-formacao-resultados";
import { PROFILE_CARD_BASE, PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { buildFormacaoResultadosPerfil } from "@/lib/perfil/build-formacao-resultados-perfil";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import {
  carregarPartidasColetivasDoTime,
  mapNomesTimesAdversarios,
  mapTorneioNomes,
} from "@/lib/perfil/formacao-eid-stats";
import { createClient } from "@/lib/supabase/server";
import { TeamPublicInviteBlock, type TeamPublicPendingInvite } from "@/components/times/team-public-invite-block";
import { EidCityState } from "@/components/ui/eid-city-state";
import { FormacaoCandidaturaCta } from "@/components/times/formacao-candidatura-cta";
import { FormacaoElencoCallout } from "@/components/times/formacao-elenco-callout";
import { SairDaEquipeExitButton } from "@/components/times/sair-da-equipe-exit-button";
import { PerfilTimeMembroLiderAcoes } from "@/components/times/perfil-time-membro-lider-acoes";
import { BarChart3, ChevronRight } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function PerfilTimePage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginNextWithOptionalFrom(`/perfil-time/${id}`, sp));

  async function sairEquipeAction() {
    "use server";
    const sb = await createClient();
    const {
      data: { user: actionUser },
    } = await sb.auth.getUser();
    if (!actionUser) return;
    await sb.rpc("sair_da_equipe", { p_time_id: id });
    revalidatePath(`/perfil-time/${id}`);
    revalidatePath(`/perfil/${actionUser.id}`);
  }

  async function removerMembroAction(formData: FormData) {
    "use server";
    const sb = await createClient();
    const uid = String(formData.get("usuario_id") ?? "");
    if (!uid) return;
    await sb.rpc("remover_membro_time", { p_time_id: id, p_usuario_id: uid });
    revalidatePath(`/perfil-time/${id}`);
    revalidatePath(`/perfil/${uid}`);
  }

  const { data: t } = await supabase
    .from("times")
    .select(
      "id, nome, username, bio, tipo, localizacao, escudo, pontos_ranking, eid_time, esporte_id, criador_id, interesse_rank_match, disponivel_amistoso, disponivel_amistoso_ate, vagas_abertas, aceita_pedidos, interesse_torneio, nivel_procurado, esportes(nome)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();

  const [{ data: criador }, { count: acima }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nome, avatar_url, whatsapp")
      .eq("id", t.criador_id)
      .maybeSingle(),
    supabase
      .from("times")
      .select("id", { count: "exact", head: true })
      .eq("esporte_id", t.esporte_id)
      .eq("tipo", t.tipo ?? "time")
      .gt("pontos_ranking", t.pontos_ranking ?? 0),
  ]);

  const posicao = (acima ?? 0) + 1;

  const esporteIdNum = t.esporte_id != null ? Number(t.esporte_id) : 0;
  const partidasColetivas =
    esporteIdNum > 0 ? await carregarPartidasColetivasDoTime(supabase, id, esporteIdNum, user.id) : [];
  const torneioNomeMap = await mapTorneioNomes(supabase, partidasColetivas);
  const nomeOponenteMap = await mapNomesTimesAdversarios(supabase, id, partidasColetivas);
  const bundleResultados = buildFormacaoResultadosPerfil(partidasColetivas, id, nomeOponenteMap, torneioNomeMap);
  const vitoriasTime = Number(bundleResultados.totais.vitorias ?? 0);
  const derrotasTime = Number(bundleResultados.totais.derrotas ?? 0);
  const jogosTime = vitoriasTime + derrotasTime;
  const winRateTime = jogosTime > 0 ? Math.round((vitoriasTime / jogosTime) * 100) : null;

  const [{ data: hist }, { data: eidLogs }, { data: membros }, { data: minhaCandidaturaPendente }] =
    await Promise.all([
      supabase
        .from("historico_eid_coletivo")
        .select("nota_nova, data_alteracao")
        .eq("time_id", id)
        .order("data_alteracao", { ascending: false })
        .limit(12),
      supabase
        .from("eid_logs")
        .select("change_amount, reason, created_at, esportes(nome)")
        .eq("entity_kind", "time")
        .eq("entity_time_id", id)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("membros_time")
        .select("usuario_id, cargo, status, profiles(id, nome, avatar_url)")
        .eq("time_id", id)
        .eq("status", "ativo")
        .order("data_criacao", { ascending: true })
        .limit(40),
      supabase
        .from("time_candidaturas")
        .select("id")
        .eq("time_id", id)
        .eq("candidato_usuario_id", user.id)
        .eq("status", "pendente")
        .maybeSingle(),
    ]);
  const modalidade = (t.tipo ?? "time") === "dupla" ? "dupla" : "time";
  const rosterCap = modalidade === "dupla" ? 2 : 18;
  const { data: rosterHeadRaw, error: rosterHeadErr } = await supabase.rpc("time_roster_headcount", { p_time_id: id });
  const rosterHeadCount =
    !rosterHeadErr && rosterHeadRaw != null && Number.isFinite(Number(rosterHeadRaw)) ? Math.max(1, Number(rosterHeadRaw)) : 1;
  const vagasDisponiveis = Math.max(0, rosterCap - rosterHeadCount);

  const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;

  const { data: minhaFormacao } = await supabase
    .from("times")
    .select("id")
    .eq("criador_id", user.id)
    .eq("tipo", t.tipo ?? "time")
    .eq("esporte_id", t.esporte_id)
    .limit(1);

  const canChallenge = (minhaFormacao?.length ?? 0) > 0 && t.criador_id !== user.id;
  const meuTimeId = minhaFormacao?.[0]?.id ?? null;
  const isMember = (membros ?? []).some((m) => m.usuario_id === user.id);
  const canLeaveTeam = isMember && t.criador_id !== user.id;
  const isLeader = t.criador_id === user.id;

  const { data: membroOutrosTimes } = await supabase
    .from("membros_time")
    .select("time_id, times!inner(id, nome, criador_id, esporte_id, tipo)")
    .eq("usuario_id", user.id)
    .eq("status", "ativo");

  const tipoAlvoNorm = (t.tipo ?? "time").trim().toLowerCase();
  const espAlvo = t.esporte_id != null ? Number(t.esporte_id) : null;

  const formacoesMembroNaoLider: { id: number; nome: string }[] = [];
  for (const row of membroOutrosTimes ?? []) {
    const tm = Array.isArray(row.times) ? row.times[0] : row.times;
    if (!tm || tm.criador_id === user.id) continue;
    if (espAlvo == null || Number(tm.esporte_id) !== espAlvo) continue;
    if (String(tm.tipo ?? "").trim().toLowerCase() !== tipoAlvoNorm) continue;
    if (Number(tm.id) === id) continue;
    formacoesMembroNaoLider.push({ id: Number(tm.id), nome: tm.nome ?? "Formação" });
  }

  const canSugerirMatch =
    !isMember &&
    t.criador_id !== user.id &&
    formacoesMembroNaoLider.length > 0 &&
    espAlvo != null &&
    !canChallenge;

  const podeVerWhatsappFormacao =
    !isLeader &&
    (await podeExibirWhatsappPerfilFormacao(supabase, user.id, t.criador_id, id, meuTimeId));
  const linkWpp = podeVerWhatsappFormacao ? waMeHref(criador?.whatsapp) : null;

  const hasAceitoRank =
    canChallenge &&
    meuTimeId != null &&
    t.esporte_id != null &&
    (await formacaoTemMatchAceitoEntre(
      supabase,
      user.id,
      meuTimeId,
      id,
      t.criador_id,
      Number(t.esporte_id),
      modalidade
    ));

  const cooldownMeses = await getMatchRankCooldownMeses(supabase);
  let rankingBlockedUntilTime: string | null = null;
  if (canChallenge && t.esporte_id != null && meuTimeId != null) {
    rankingBlockedUntilTime = await computeRankingBlockedUntilColetivo(supabase, {
      esporteId: Number(t.esporte_id),
      modalidade,
      meuTimeId,
      alvoTimeId: id,
      cooldownMeses,
      fallbackViewerId: user.id,
      fallbackOpponentLeaderId: t.criador_id ?? undefined,
    });
  }

  const temBlocoAcaoVisitante =
    linkWpp || (canChallenge && !hasAceitoRank && Boolean(t.esporte_id));
  const fromPublic = `/perfil-time/${id}`;
  const editarTimeHref = `/editar/time/${id}?from=${encodeURIComponent(fromPublic)}`;
  const idsExcluirConvite = [
    ...new Set(
      [...(membros ?? []).map((m) => String(m.usuario_id)), String(t.criador_id ?? "")]
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];

  let convitesPendentesPublic: TeamPublicPendingInvite[] = [];
  if (isLeader) {
    const { data: pendRows } = await supabase
      .from("time_convites")
      .select("id, convidado_usuario_id")
      .eq("time_id", id)
      .eq("status", "pendente")
      .order("id", { ascending: false });
    const pids = [...new Set((pendRows ?? []).map((r) => String(r.convidado_usuario_id ?? "")).filter(Boolean))];
    if (pids.length > 0) {
      const { data: profsPend } = await supabase
        .from("profiles")
        .select("id, nome, avatar_url, localizacao")
        .in("id", pids);
      const pmap = new Map((profsPend ?? []).map((p) => [String(p.id), p]));
      convitesPendentesPublic = (pendRows ?? [])
        .map((r) => {
          const pid = String(r.convidado_usuario_id ?? "");
          const pr = pmap.get(pid);
          return {
            conviteId: Number(r.id),
            nome: pr?.nome ?? "Atleta",
            avatarUrl: pr?.avatar_url ?? null,
            localizacao: pr?.localizacao ?? null,
          };
        })
        .filter((x) => Number.isFinite(x.conviteId) && x.conviteId > 0);
    }
  }

  return (
    <main data-eid-formacao-page className={PROFILE_PUBLIC_MAIN_CLASS}>
        <div className={`${PROFILE_HERO_PANEL_CLASS} mt-2 p-3 sm:p-4`}>
          {canLeaveTeam ? (
            <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
              <SairDaEquipeExitButton
                leaveAction={sairEquipeAction}
                formationName={t.nome ?? "Formação"}
                formacaoTipo="time"
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <div className="flex shrink-0 flex-col items-center sm:items-start">
              {t.escudo ? (
                <img
                  src={t.escudo}
                  alt=""
                  className="h-24 w-24 rounded-2xl border-2 border-eid-action-500/50 object-cover shadow-lg sm:h-28 sm:w-28"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-eid-primary-500/40 bg-eid-surface text-sm font-bold text-eid-primary-300 sm:h-28 sm:w-28">
                  {(t.tipo ?? "T").toUpperCase().slice(0, 1)}
                </div>
              )}
            </div>
            <div
              className={`min-w-0 flex-1 space-y-2 text-center sm:text-left ${canLeaveTeam ? "pr-10 sm:pr-12" : ""}`}
            >
              <span className="inline-block rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-eid-primary-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1">
                    <ModalidadeGlyphIcon modalidade={String(t.tipo ?? "").trim().toLowerCase() === "time" ? "time" : "dupla"} />
                    <span>{(t.tipo ?? "time").toUpperCase()}</span>
                  </span>
                  <span aria-hidden className="opacity-70">|</span>
                  <span className="inline-flex items-center gap-1">
                    <SportGlyphIcon sportName={esp?.nome} />
                    <span>{esp?.nome ?? "Esporte"}</span>
                  </span>
                </span>
              </span>
              <h1 className="text-xl font-bold uppercase tracking-tight text-eid-fg sm:text-2xl">{t.nome ?? "Formação"}</h1>
              {t.username ? (
                <p className="block w-full text-center text-xs font-medium text-eid-primary-300">@{t.username}</p>
              ) : null}
              <div className="flex justify-center px-2 sm:justify-start sm:px-0">
                <EidCityState location={t.localizacao} align="start" />
              </div>
            </div>
          </div>
          {isLeader ? <FormacaoCidadeAvisoLider timeId={id} /> : null}
          {t.bio ? <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary sm:mt-3">{t.bio}</p> : null}
          <div className="mt-4 grid grid-cols-4 divide-x divide-transparent rounded-xl border border-transparent bg-eid-surface/40 text-center shadow-none">
            <div className="py-2">
              <p className="text-sm font-black text-eid-fg">{vitoriasTime}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Vitórias</p>
            </div>
            <div className="py-2">
              <p className="text-sm font-black text-eid-fg">{derrotasTime}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Derrotas</p>
            </div>
            <div className="py-2">
              <p className="text-sm font-black text-eid-action-500">{winRateTime != null ? `${winRateTime}%` : "—"}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Win Rate</p>
            </div>
            <div className="py-2">
              <p className="text-sm font-black text-eid-primary-400">{jogosTime}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Jogos</p>
            </div>
          </div>

          {criador ? (
            <div className="mt-4 flex w-full min-w-0 flex-col items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2.5">
              <Link
                href={`/perfil/${criador.id}?from=/perfil-time/${id}`}
                className="inline-flex max-w-full min-w-0 items-center gap-3 rounded-lg text-left transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eid-primary-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-eid-card"
                aria-label={`Abrir perfil de ${criador.nome ?? "líder"}`}
              >
                {criador.avatar_url ? (
                  <img
                    src={criador.avatar_url}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full border border-[color:var(--eid-border-subtle)] object-cover sm:h-10 sm:w-10"
                  />
                ) : (
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[11px] font-black text-eid-primary-300 sm:h-10 sm:w-10">
                    {(criador.nome ?? "L").trim().slice(0, 1).toUpperCase() || "L"}
                  </span>
                )}
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary/90">Líder</span>
                  <span className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline">{criador.nome ?? "—"}</span>
                </div>
              </Link>
            </div>
          ) : null}

        </div>

        {!isLeader ? (
          <FormacaoElencoCallout>
            <FormacaoCandidaturaCta
              timeId={id}
              vagasAbertas={Boolean(t.vagas_abertas)}
              aceitaPedidos={Boolean(t.aceita_pedidos)}
              vagasDisponiveis={vagasDisponiveis}
              minhaCandidaturaPendenteId={minhaCandidaturaPendente?.id ?? null}
              jaSouMembro={isMember}
              textAlign="start"
            />
          </FormacaoElencoCallout>
        ) : null}

        <div className="mt-6 grid gap-6">
          {/* Líder: cartão “Ação principal” ficava só com cabeçalho (desafio é para visitantes). */}
          {!isLeader ? (
          <section className="overflow-hidden rounded-xl border border-transparent bg-eid-card/55 p-3">
            <h2 className="sr-only">Ação principal</h2>
            <div className="mb-2 flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Ação principal</p>
              <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
                Desafio
              </span>
            </div>
            {temBlocoAcaoVisitante ? (
              <div className="grid gap-3">
                {linkWpp ? (
                  <a
                    href={linkWpp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-[13px] font-black uppercase tracking-[0.1em] text-white shadow-[0_0_18px_rgba(37,211,102,0.45)] transition hover:bg-[#1da851]"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.534 5.853L.054 23.25a.75.75 0 0 0 .916.916l5.396-1.479A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.986 0-3.84-.552-5.418-1.51l-.388-.232-4.021 1.1 1.1-4.022-.232-.388A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                    </svg>
                    Chamar no WhatsApp (líder)
                  </a>
                ) : null}
                {canChallenge && !hasAceitoRank && t.esporte_id && !rankingBlockedUntilTime ? (
                  <ProfilePrimaryCta
                    href={`/desafio?id=${id}&tipo=${encodeURIComponent(modalidade)}&esporte=${t.esporte_id}`}
                    label={linkWpp ? "⚡ Desafio no ranking" : undefined}
                  />
                ) : null}
                {canChallenge && !hasAceitoRank && rankingBlockedUntilTime ? (
                  <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2 text-[11px] text-eid-text-secondary">
                    Carência ativa para novo desafio de ranking nesta formação até{" "}
                    <span className="font-semibold text-eid-fg">
                      {new Date(rankingBlockedUntilTime).toLocaleDateString("pt-BR")}
                    </span>
                    .{" "}
                    <span className="font-semibold text-eid-fg">{formatCooldownRemaining(rankingBlockedUntilTime)}</span>
                  </p>
                ) : null}
              </div>
            ) : canChallenge && hasAceitoRank ? (
              <p className="text-xs text-eid-text-secondary">
                Desafio aceito nesta modalidade. Registre o resultado na agenda quando jogarem.
              </p>
            ) : (
              <p className="text-xs text-eid-text-secondary">
                Para desafiar direto, você precisa ser líder de uma {modalidade} neste esporte — ou use a sugestão abaixo
                se você já faz parte de uma formação.
              </p>
            )}
            {canSugerirMatch ? (
              <div className="mt-3">
                <SugerirMatchLiderForm
                  alvoTimeId={id}
                  alvoNome={t.nome ?? "Formação"}
                  modalidadeLabel={modalidade === "dupla" ? "dupla" : "equipe"}
                  formacoesMinhas={formacoesMembroNaoLider}
                />
              </div>
            ) : null}
          </section>
          ) : null}

          <ProfileSection
            title="EID e estatísticas"
            info="Nota e métricas do time neste esporte: ranking, jogos e desempenho coletivo."
          >
            <div className={`${PROFILE_CARD_BASE} mt-2 overflow-hidden p-3 sm:rounded-2xl sm:p-4`}>
              <p className="text-[11px] font-semibold leading-snug sm:text-[12px]">
                <span className="text-eid-text-secondary">Esporte: </span>
                <span className="font-bold text-eid-primary-300">{esp?.nome ?? "Esporte não definido"}</span>
              </p>
              <div className="mt-2">
                <div className="flex justify-center">
                  <EidBadge
                    score={Number(t.eid_time ?? 0)}
                    history={eidLogs ?? []}
                    label={`EID · ${(esp?.nome ?? "Esporte").toUpperCase()}`}
                    className="px-3 py-1.5 text-[11px] shadow-[0_8px_20px_-14px_rgba(249,115,22,0.45)]"
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[color:var(--eid-border-subtle)] pt-3">
                  <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2.5 text-center shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
                    <p className="text-base font-bold tabular-nums text-eid-action-500 sm:text-lg">{Number(t.eid_time ?? 0).toFixed(1)}</p>
                    <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Nota EID</p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2.5 text-center shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
                    <p className="text-base font-bold tabular-nums text-eid-fg sm:text-lg">{t.pontos_ranking ?? 0}</p>
                    <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Pontos</p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2.5 text-center shadow-[0_10px_24px_-18px_rgba(15,23,42,0.18)]">
                    <p className="text-base font-bold tabular-nums text-eid-primary-300 sm:text-lg">#{posicao}</p>
                    <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Posição</p>
                  </div>
                </div>
                {t.esporte_id ? (
                  <ProfileEditDrawerTrigger
                    href={`/perfil-time/${id}/eid/${t.esporte_id}?from=${encodeURIComponent(fromPublic)}`}
                    title={`Estatísticas · ${esp?.nome ?? "Esporte"}`}
                    fullscreen
                    topMode="backOnly"
                    className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-eid-action-500/45 bg-eid-action-500/10 px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-eid-action-400 transition hover:border-eid-action-500/70 hover:bg-eid-action-500/15"
                  >
                    <BarChart3 className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
                    <span className="min-w-0 flex-1 text-center leading-tight">
                      Estatísticas completas · {(esp?.nome ?? "este esporte").toUpperCase()}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-85" strokeWidth={2.5} aria-hidden />
                  </ProfileEditDrawerTrigger>
                ) : null}
                <ProfileSportsMetricsCard
                  sportName={esp?.nome ?? "Esporte"}
                  eidValue={Number(t.eid_time ?? 0)}
                  rankValue={Number(t.pontos_ranking ?? 0)}
                  trendLabel="Evolução EID"
                  trendPoints={
                    (hist ?? []).length >= 3
                      ? ([
                          Number((hist ?? [])[2]?.nota_nova ?? t.eid_time ?? 0),
                          Number((hist ?? [])[1]?.nota_nova ?? t.eid_time ?? 0),
                          Number((hist ?? [])[0]?.nota_nova ?? t.eid_time ?? 0),
                        ] as [number, number, number])
                      : [Number(t.eid_time ?? 0), Number(t.eid_time ?? 0), Number(t.eid_time ?? 0)]
                  }
                  showScoreTiles={false}
                />
              </div>
            </div>
            <ProfileCompactTimeline
              title="Histórico de notas EID"
              emptyText="Sem histórico recente de EID."
              items={[...(hist ?? [])]
                .reverse()
                .map((h, i) => ({
                  id: `${h.data_alteracao ?? "sem-data"}-${i}`,
                  label: `${Number(h.nota_nova).toFixed(1)} ${h.data_alteracao ? new Date(h.data_alteracao).toLocaleDateString("pt-BR") : ""}`.trim(),
                  tone: "neutral" as const,
                }))}
            />
          </ProfileSection>

          <ProfileSection
            title="Histórico de confrontos"
            info="Mesmo padrão do perfil de atleta: totais de vitórias/derrotas/empates e lista dos confrontos da formação."
          >
            <ProfileFormacaoResultados
              totais={bundleResultados.totais}
              items={bundleResultados.items}
              emptyText="Nenhuma partida em equipe concluída listada ainda para esta formação."
            />
          </ProfileSection>

          <ProfileSection
            title="Participantes"
            info="Elenco: líderes e membros com link para o perfil de cada atleta."
          >
            {isLeader ? (
              <div className="mt-2 space-y-3">
                <p className="text-[11px] leading-relaxed text-eid-text-secondary">
                  Convide por nome ou <span className="font-semibold text-eid-fg">@usuário</span>. Com três letras aparecem
                  sugestões para escolher o atleta.
                </p>
                <TeamPublicInviteBlock
                  timeId={id}
                  excludeUserIds={idsExcluirConvite}
                  pendingInvites={convitesPendentesPublic}
                  collapsibleTrigger
                />
              </div>
            ) : null}
            <ul className="mt-4 flex flex-col gap-2.5">
              {(membros ?? []).map((m, idx) => {
                const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                if (!p?.id) return null;
                return (
                  <li key={`${m.usuario_id}-${idx}`}>
                    <ProfileMemberCard
                      href={`/perfil/${p.id}?from=/perfil-time/${id}`}
                      name={p.nome ?? "Membro"}
                      subtitle={p.id === t.criador_id ? "Líder" : (m.cargo ?? "Membro")}
                      avatarUrl={p.avatar_url}
                      layout="list"
                      avatarSize="sm"
                      trailing={
                        isLeader && p.id !== t.criador_id ? (
                          <PerfilTimeMembroLiderAcoes
                            timeId={id}
                            membroUsuarioId={p.id}
                            membroNome={p.nome ?? "Membro"}
                            membroAvatarUrl={p.avatar_url ?? null}
                            transferButtonClassName="flex h-9 min-h-9 w-full min-w-0 items-center justify-center rounded-lg border border-eid-primary-500/45 px-1.5 py-0 text-center text-[10px] font-semibold leading-snug text-eid-primary-300 transition hover:bg-eid-primary-500/10 disabled:opacity-60 eid-light:border-sky-700/40 eid-light:bg-sky-50 eid-light:text-sky-950 eid-light:hover:bg-sky-100 sm:px-2 sm:text-[11px]"
                            removerAction={removerMembroAction}
                            removerButtonClassName="flex h-9 min-h-9 w-full items-center justify-center rounded-lg border border-red-400/50 px-1.5 py-0 text-center text-[10px] font-semibold leading-snug text-red-300 transition hover:bg-red-500/12 eid-light:border-red-700/45 eid-light:bg-red-50 eid-light:text-red-900 eid-light:hover:bg-red-100 sm:px-2 sm:text-[11px]"
                          />
                        ) : null
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </ProfileSection>

          {isLeader ? (
            <div className="eid-list-item overflow-hidden rounded-xl border border-transparent bg-eid-card/55">
              <div className="flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Gestão da formação</p>
                <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-action-400">
                  Líder
                </span>
              </div>
              <div className="p-3">
                <ProfileEditDrawerTrigger
                  href={editarTimeHref}
                  title="Gerenciar equipe"
                  fullscreen
                  topMode="backOnly"
                  className="mt-1 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/65 hover:bg-eid-primary-500/16"
                >
                  <span>Gerenciar equipe</span>
                </ProfileEditDrawerTrigger>
                <p className="mt-1.5 text-[10px] leading-relaxed text-eid-text-secondary">
                  Elenco, convites, dados e escudo — mesmo painel em tela cheia da área Editar.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </main>
  );
}
