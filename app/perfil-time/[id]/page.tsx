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
import { TeamPublicInviteBlock } from "@/components/times/team-public-invite-block";
import { FormacaoCandidaturaCta } from "@/components/times/formacao-candidatura-cta";

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

  async function transferirLiderancaAction(formData: FormData) {
    "use server";
    const sb = await createClient();
    const uid = String(formData.get("usuario_id") ?? "");
    if (!uid) return;
    await sb.rpc("transferir_lideranca_time", { p_time_id: id, p_novo_lider: uid });
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

  const { data: criador } = await supabase
    .from("profiles")
    .select("id, nome, avatar_url, whatsapp")
    .eq("id", t.criador_id)
    .maybeSingle();

  const { count: acima } = await supabase
    .from("times")
    .select("id", { count: "exact", head: true })
    .eq("esporte_id", t.esporte_id)
    .eq("tipo", t.tipo ?? "time")
    .gt("pontos_ranking", t.pontos_ranking ?? 0);

  const posicao = (acima ?? 0) + 1;

  const esporteIdNum = t.esporte_id != null ? Number(t.esporte_id) : 0;
  const partidasColetivas =
    esporteIdNum > 0 ? await carregarPartidasColetivasDoTime(supabase, id, esporteIdNum, user.id) : [];
  const torneioNomeMap = await mapTorneioNomes(supabase, partidasColetivas);
  const nomeOponenteMap = await mapNomesTimesAdversarios(supabase, id, partidasColetivas);
  const bundleResultados = buildFormacaoResultadosPerfil(partidasColetivas, id, nomeOponenteMap, torneioNomeMap);

  const { data: hist } = await supabase
    .from("historico_eid_coletivo")
    .select("nota_nova, data_alteracao")
    .eq("time_id", id)
    .order("data_alteracao", { ascending: false })
    .limit(12);

  const { data: eidLogs } = await supabase
    .from("eid_logs")
    .select("change_amount, reason, created_at, esportes(nome)")
    .eq("entity_kind", "time")
    .eq("entity_time_id", id)
    .order("created_at", { ascending: false })
    .limit(3);

  const { data: membros } = await supabase
    .from("membros_time")
    .select("usuario_id, cargo, status, profiles(id, nome, avatar_url)")
    .eq("time_id", id)
    .eq("status", "ativo")
    .order("data_criacao", { ascending: true })
    .limit(40);

  const { data: minhaCandidaturaPendente } = await supabase
    .from("time_candidaturas")
    .select("id")
    .eq("time_id", id)
    .eq("candidato_usuario_id", user.id)
    .eq("status", "pendente")
    .maybeSingle();
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
  if (canChallenge && t.esporte_id != null && t.criador_id) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - cooldownMeses);
    const cutoffMs = cutoff.getTime();
    const { data: cooldownRows } = await supabase
      .from("partidas")
      .select("status, status_ranking, data_resultado, data_partida, data_registro")
      .eq("esporte_id", Number(t.esporte_id))
      .is("torneio_id", null)
      .eq("modalidade", modalidade)
      .or(`and(jogador1_id.eq.${user.id},jogador2_id.eq.${t.criador_id}),and(jogador1_id.eq.${t.criador_id},jogador2_id.eq.${user.id})`)
      .order("id", { ascending: false })
      .limit(60);
    for (const r of cooldownRows ?? []) {
      const status = String((r as { status?: string | null }).status ?? "").trim().toLowerCase();
      const statusRanking = String((r as { status_ranking?: string | null }).status_ranking ?? "").trim().toLowerCase();
      const valid =
        statusRanking === "validado" ||
        ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(status);
      if (!valid) continue;
      const dtRaw =
        (r as { data_resultado?: string | null }).data_resultado ??
        (r as { data_partida?: string | null }).data_partida ??
        (r as { data_registro?: string | null }).data_registro ??
        null;
      if (!dtRaw) continue;
      const base = new Date(dtRaw);
      if (Number.isNaN(base.getTime()) || base.getTime() < cutoffMs) continue;
      const until = new Date(base);
      until.setMonth(until.getMonth() + cooldownMeses);
      if (until.getTime() > Date.now()) {
        rankingBlockedUntilTime = until.toISOString();
        break;
      }
    }
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

  return (
    <main className={PROFILE_PUBLIC_MAIN_CLASS}>
        <div className={`${PROFILE_HERO_PANEL_CLASS} mt-2 p-3 text-center sm:p-4`}>
          {t.escudo ? (
            <img
              src={t.escudo}
              alt=""
              className="mx-auto h-24 w-24 rounded-2xl border-2 border-eid-action-500/50 object-cover shadow-lg sm:h-28 sm:w-28"
            />
          ) : (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-eid-primary-500/40 bg-eid-surface text-sm font-bold text-eid-primary-300 sm:h-28 sm:w-28">
              {(t.tipo ?? "T").toUpperCase().slice(0, 1)}
            </div>
          )}
          <span className="mt-4 inline-block rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-eid-primary-300">
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
          <h1 className="mt-3 text-xl font-bold uppercase tracking-tight text-eid-fg sm:text-2xl">{t.nome ?? "Formação"}</h1>
          {t.username ? <p className="mt-1 text-xs font-medium text-eid-primary-300">@{t.username}</p> : null}
          <p className="mt-2 text-sm text-eid-text-secondary">{t.localizacao ?? "Localização não informada"}</p>
          {isLeader ? <FormacaoCidadeAvisoLider timeId={id} /> : null}
          {t.bio ? <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">{t.bio}</p> : null}

          {criador ? (
            <div className="mt-4 flex items-center justify-center gap-2.5">
              <Link
                href={`/perfil/${criador.id}?from=/perfil-time/${id}`}
                className="shrink-0 rounded-full ring-2 ring-transparent transition hover:ring-eid-primary-500/45 focus-visible:outline-none focus-visible:ring-eid-primary-500/60"
                aria-label={`Abrir perfil de ${criador.nome ?? "líder"}`}
              >
                {criador.avatar_url ? (
                  <img
                    src={criador.avatar_url}
                    alt=""
                    className="h-9 w-9 rounded-full border border-[color:var(--eid-border-subtle)] object-cover sm:h-10 sm:w-10"
                  />
                ) : (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[11px] font-black text-eid-primary-300 sm:h-10 sm:w-10">
                    {(criador.nome ?? "L").trim().slice(0, 1).toUpperCase() || "L"}
                  </span>
                )}
              </Link>
              <p className="text-left text-xs text-eid-text-secondary">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary/90">Líder</span>
                <Link
                  href={`/perfil/${criador.id}?from=/perfil-time/${id}`}
                  className="font-semibold text-eid-primary-300 hover:underline"
                >
                  {criador.nome ?? "—"}
                </Link>
              </p>
            </div>
          ) : null}

        </div>

        {!isLeader ? (
          <section
            className="mt-4 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-3"
            aria-labelledby="candidatura-elenco-heading"
          >
            <h2 id="candidatura-elenco-heading" className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">
              Entrar no elenco
            </h2>
            <div className="mt-2">
              <FormacaoCandidaturaCta
                timeId={id}
                vagasAbertas={Boolean(t.vagas_abertas)}
                aceitaPedidos={Boolean(t.aceita_pedidos)}
                vagasDisponiveis={vagasDisponiveis}
                minhaCandidaturaPendenteId={minhaCandidaturaPendente?.id ?? null}
                jaSouMembro={isMember}
              />
            </div>
          </section>
        ) : null}

        <div className="mt-6 grid gap-6">
          <section className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-3">
            <h2 className="sr-only">Ação principal</h2>
            <div className="mb-2 flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Ação principal</p>
              <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
                Desafio
              </span>
            </div>
            {!isLeader && temBlocoAcaoVisitante ? (
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
            ) : !isLeader && canChallenge && hasAceitoRank ? (
              <p className="text-xs text-eid-text-secondary">
                Desafio aceito nesta modalidade. Registre o resultado na agenda quando jogarem.
              </p>
            ) : !isLeader ? (
              <p className="text-xs text-eid-text-secondary">
                Para desafiar direto, você precisa ser líder de uma {modalidade} neste esporte — ou use a sugestão abaixo
                se você já faz parte de uma formação.
              </p>
            ) : null}
            {!isLeader && canSugerirMatch ? (
              <div className="mt-3">
                <SugerirMatchLiderForm
                  alvoTimeId={id}
                  alvoNome={t.nome ?? "Formação"}
                  modalidadeLabel={modalidade === "dupla" ? "dupla" : "equipe"}
                  formacoesMinhas={formacoesMembroNaoLider}
                />
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {canLeaveTeam ? (
                <form action={sairEquipeAction}>
                  <button
                    type="submit"
                    className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-400/35 px-3 text-xs font-semibold text-red-300"
                  >
                    Sair da equipe
                  </button>
                </form>
              ) : null}
            </div>
          </section>

          <ProfileSection title="EID e estatísticas">
            <div className={`${PROFILE_CARD_BASE} mt-2 overflow-hidden p-0`}>
              <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Resumo EID</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-eid-fg">Esporte: {esp?.nome ?? "Esporte não definido"}</p>
                </div>
                <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
                  Ranking
                </span>
              </div>
              <div className="p-3">
                <div className="flex justify-center">
                  <EidBadge score={Number(t.eid_time ?? 0)} history={eidLogs ?? []} label={`EID · ${esp?.nome ?? "Esporte"}`} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[color:var(--eid-border-subtle)] pt-3">
                  <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2 text-center">
                    <p className="text-base font-bold tabular-nums text-eid-action-500 sm:text-lg">{Number(t.eid_time ?? 0).toFixed(1)}</p>
                    <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Nota EID</p>
                  </div>
                  <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2 text-center">
                    <p className="text-base font-bold tabular-nums text-eid-fg sm:text-lg">{t.pontos_ranking ?? 0}</p>
                    <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Pontos</p>
                  </div>
                  <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-2 py-2 text-center">
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
                    className="mt-3 flex min-h-[42px] w-full items-center justify-center rounded-xl border border-eid-action-500/40 bg-eid-action-500/10 px-3 text-[10px] font-black uppercase tracking-wide text-eid-action-400 transition hover:border-eid-action-500/70 hover:bg-eid-action-500/15"
                  >
                    <span>Estatísticas completas · {esp?.nome ?? "este esporte"}</span>
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

          <ProfileSection title="Resultados">
            <ProfileFormacaoResultados
              totais={bundleResultados.totais}
              items={bundleResultados.items}
              emptyText="Nenhuma partida em equipe concluída listada ainda para esta formação."
            />
          </ProfileSection>

          <ProfileSection title="Participantes">
            {isLeader ? (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-eid-text-secondary">
                  Convide pelo nome ou @. Com <strong className="text-eid-fg">três letras</strong> aparecem sugestões para
                  escolher o atleta.
                </p>
                <TeamPublicInviteBlock timeId={id} excludeUserIds={idsExcluirConvite} />
              </div>
            ) : null}
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {(membros ?? []).map((m, idx) => {
                const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                if (!p?.id) return null;
                return (
                  <li key={`${m.usuario_id}-${idx}`}>
                    <ProfileMemberCard
                      href={`/perfil/${p.id}?from=/perfil-time/${id}`}
                      name={p.nome ?? "Membro"}
                      subtitle={m.cargo ?? "Atleta"}
                      avatarUrl={p.avatar_url}
                      layout="stacked"
                      avatarSize="sm"
                      trailing={
                        isLeader && p.id !== t.criador_id ? (
                          <div className="flex gap-2">
                            <form action={transferirLiderancaAction}>
                              <input type="hidden" name="usuario_id" value={p.id} />
                              <button
                                type="submit"
                                className="rounded-lg border border-eid-primary-500/30 px-2 py-1 text-[10px] font-semibold text-eid-primary-300"
                              >
                                Transferir liderança
                              </button>
                            </form>
                            <form action={removerMembroAction}>
                              <input type="hidden" name="usuario_id" value={p.id} />
                              <button
                                type="submit"
                                className="rounded-lg border border-red-400/30 px-2 py-1 text-[10px] font-semibold text-red-300"
                              >
                                Remover
                              </button>
                            </form>
                          </div>
                        ) : null
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </ProfileSection>

          {isLeader ? (
            <div className="eid-list-item overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
              <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
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
                <ProfileEditDrawerTrigger
                  href={`/times?from=${encodeURIComponent(fromPublic)}`}
                  title="Times e vagas"
                  fullscreen
                  topMode="backOnly"
                  className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-[11px] font-bold uppercase tracking-wide text-eid-fg transition hover:border-eid-primary-500/40"
                >
                  <span>Ver lista em Times</span>
                </ProfileEditDrawerTrigger>
              </div>
            </div>
          ) : null}
        </div>
      </main>
  );
}
