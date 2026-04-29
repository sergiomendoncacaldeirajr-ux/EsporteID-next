import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EidBadge } from "@/components/eid/eid-badge";
import { ProfileAchievementsShelf, ProfileCompactTimeline } from "@/components/perfil/profile-history-widgets";
import { FormacaoCidadeAvisoLider } from "@/components/perfil/formacao-cidade-aviso-lider";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfilePrimaryCta, ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSportsMetricsCard } from "@/components/perfil/profile-sports-metrics-card";
import { ProfileMemberCard } from "@/components/perfil/profile-team-members-cards";
import { SugerirMatchLiderForm } from "@/components/perfil/sugerir-match-lider-form";
import {
  formacaoTemMatchAceitoEntre,
  podeExibirWhatsappPerfilFormacao,
  podeExibirWhatsappPerfilPublico,
  resolverTimeIdParaDuplaRegistrada,
  waMeHref,
} from "@/lib/perfil/whatsapp-visibility";
import { loginNextWithOptionalFrom } from "@/lib/auth/login-next-path";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import { formatCooldownRemaining } from "@/lib/match/cooldown-remaining";
import { ProfileFormacaoResultados } from "@/components/perfil/profile-formacao-resultados";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { PROFILE_CARD_BASE, PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { buildFormacaoResultadosPerfil } from "@/lib/perfil/build-formacao-resultados-perfil";
import {
  carregarPartidasColetivasDoTime,
  mapNomesTimesAdversarios,
  mapTorneioNomes,
} from "@/lib/perfil/formacao-eid-stats";
import { EidCityState } from "@/components/ui/eid-city-state";
import { createClient } from "@/lib/supabase/server";
import { TeamPublicInviteBlock, type TeamPublicPendingInvite } from "@/components/times/team-public-invite-block";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function PerfilDuplaPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginNextWithOptionalFrom(`/perfil-dupla/${id}`, sp));

  const { data: d } = await supabase
    .from("duplas")
    .select("id, username, bio, player1_id, player2_id, criador_id, esporte_id, esportes(nome)")
    .eq("id", id)
    .maybeSingle();
  if (!d) notFound();

  const { data: p1 } = await supabase
    .from("profiles")
    .select("id, nome, avatar_url, localizacao, whatsapp")
    .eq("id", d.player1_id)
    .maybeSingle();
  const { data: p2 } = await supabase
    .from("profiles")
    .select("id, nome, avatar_url, localizacao, whatsapp")
    .eq("id", d.player2_id)
    .maybeSingle();

  const timeResolvidoId = await resolverTimeIdParaDuplaRegistrada(
    supabase,
    d.player1_id,
    d.player2_id,
    d.esporte_id
  );

  const { data: timeResolvido } = timeResolvidoId
    ? await supabase
        .from("times")
        .select("id, criador_id, nome, username, escudo, localizacao, eid_time, pontos_ranking")
        .eq("id", timeResolvidoId)
        .maybeSingle()
    : { data: null };

  let posicaoDupla: number | null = null;
  if (timeResolvidoId && timeResolvido && d.esporte_id) {
    const { count: acimaD } = await supabase
      .from("times")
      .select("id", { count: "exact", head: true })
      .eq("esporte_id", d.esporte_id)
      .eq("tipo", "dupla")
      .gt("pontos_ranking", timeResolvido.pontos_ranking ?? 0);
    posicaoDupla = (acimaD ?? 0) + 1;
  }

  const espIdNum = d.esporte_id != null ? Number(d.esporte_id) : 0;
  const partidasColetivasDupla =
    timeResolvidoId && espIdNum > 0
      ? await carregarPartidasColetivasDoTime(supabase, timeResolvidoId, espIdNum, user.id)
      : [];
  const torneioNomeDupla = timeResolvidoId ? await mapTorneioNomes(supabase, partidasColetivasDupla) : new Map();
  const nomeOponenteDupla = timeResolvidoId
    ? await mapNomesTimesAdversarios(supabase, timeResolvidoId, partidasColetivasDupla)
    : new Map();
  const bundleResultadosDupla = timeResolvidoId
    ? buildFormacaoResultadosPerfil(partidasColetivasDupla, timeResolvidoId, nomeOponenteDupla, torneioNomeDupla)
    : { items: [], totais: { vitorias: 0, derrotas: 0, empates: 0, rank: 0, torneio: 0 } };

  const { data: eidLogsDupla } = timeResolvidoId
    ? await supabase
        .from("eid_logs")
        .select("change_amount, reason, created_at, esportes(nome)")
        .eq("entity_kind", "time")
        .eq("entity_time_id", timeResolvidoId)
        .order("created_at", { ascending: false })
        .limit(3)
    : { data: [] };

  const { data: histDupla } = timeResolvidoId
    ? await supabase
        .from("historico_eid_coletivo")
        .select("nota_nova, data_alteracao")
        .eq("time_id", timeResolvidoId)
        .order("data_alteracao", { ascending: false })
        .limit(12)
    : { data: [] };

  const { data: liderDupla } = timeResolvido?.criador_id
    ? await supabase.from("profiles").select("id, nome, whatsapp, avatar_url").eq("id", timeResolvido.criador_id).maybeSingle()
    : { data: null };

  const isMembroDupla = user.id === d.player1_id || user.id === d.player2_id;
  const donoDuplaId = d.criador_id ?? d.player1_id;
  const isDonoDupla = user.id === donoDuplaId;

  let convitesPendentesDupla: TeamPublicPendingInvite[] = [];
  const idsExcluirConviteDupla = [
    ...new Set(
      [d.player1_id, d.player2_id, user.id].map((x) => String(x ?? "").trim()).filter(Boolean)
    ),
  ];
  if (isDonoDupla && timeResolvidoId) {
    const { data: pendRowsDupla } = await supabase
      .from("time_convites")
      .select("id, convidado_usuario_id")
      .eq("time_id", timeResolvidoId)
      .eq("status", "pendente")
      .order("id", { ascending: false });
    const pidsD = [...new Set((pendRowsDupla ?? []).map((r) => String(r.convidado_usuario_id ?? "")).filter(Boolean))];
    if (pidsD.length > 0) {
      const { data: profsPendD } = await supabase
        .from("profiles")
        .select("id, nome, avatar_url, localizacao")
        .in("id", pidsD);
      const pmapD = new Map((profsPendD ?? []).map((p) => [String(p.id), p]));
      convitesPendentesDupla = (pendRowsDupla ?? [])
        .map((r) => {
          const pid = String(r.convidado_usuario_id ?? "");
          const pr = pmapD.get(pid);
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

  const formacoesMembroNaoLiderDupla: { id: number; nome: string }[] = [];
  if (!isMembroDupla && timeResolvidoId && d.esporte_id) {
    const { data: membroRowsDupla } = await supabase
      .from("membros_time")
      .select("time_id, times!inner(id, nome, criador_id, esporte_id, tipo)")
      .eq("usuario_id", user.id)
      .eq("status", "ativo");
    const espD = Number(d.esporte_id);
    for (const row of membroRowsDupla ?? []) {
      const tm = Array.isArray(row.times) ? row.times[0] : row.times;
      if (!tm || tm.criador_id === user.id) continue;
      if (Number(tm.esporte_id) !== espD) continue;
      if (String(tm.tipo ?? "").trim().toLowerCase() !== "dupla") continue;
      if (Number(tm.id) === timeResolvidoId) continue;
      formacoesMembroNaoLiderDupla.push({ id: Number(tm.id), nome: tm.nome ?? "Dupla" });
    }
  }
  const { data: minhaFormacaoDupla } = await supabase
    .from("times")
    .select("id")
    .eq("criador_id", user.id)
    .eq("tipo", "dupla")
    .eq("esporte_id", d.esporte_id)
    .limit(1);

  const meuTimeIdDupla = minhaFormacaoDupla?.[0]?.id ?? null;
  const canChallengeDupla =
    meuTimeIdDupla != null &&
    !isMembroDupla &&
    timeResolvidoId != null &&
    timeResolvido?.criador_id != null &&
    timeResolvido.criador_id !== user.id;

  const canSugerirMatchDupla =
    !isMembroDupla &&
    formacoesMembroNaoLiderDupla.length > 0 &&
    timeResolvidoId != null &&
    !canChallengeDupla;

  let linkWpp: string | null = null;
  if (!isMembroDupla && timeResolvidoId && timeResolvido?.criador_id && liderDupla) {
    const podeWa = await podeExibirWhatsappPerfilFormacao(
      supabase,
      user.id,
      timeResolvido.criador_id,
      timeResolvidoId,
      meuTimeIdDupla
    );
    linkWpp = podeWa ? waMeHref(liderDupla.whatsapp) : null;
  } else if (!isMembroDupla && p1?.id && p2?.id) {
    const v1 = await podeExibirWhatsappPerfilPublico(supabase, user.id, p1.id, false);
    const v2 = await podeExibirWhatsappPerfilPublico(supabase, user.id, p2.id, false);
    if (v1) linkWpp = waMeHref(p1.whatsapp);
    else if (v2) linkWpp = waMeHref(p2.whatsapp);
  }

  const hasAceitoRankDupla =
    canChallengeDupla &&
    meuTimeIdDupla != null &&
    timeResolvidoId != null &&
    timeResolvido?.criador_id != null &&
    (await formacaoTemMatchAceitoEntre(
      supabase,
      user.id,
      meuTimeIdDupla,
      timeResolvidoId,
      timeResolvido.criador_id,
      Number(d.esporte_id),
      "dupla"
    ));

  const cooldownMeses = await getMatchRankCooldownMeses(supabase);
  let rankingBlockedUntilDupla: string | null = null;
  if (canChallengeDupla && timeResolvido?.criador_id && d.esporte_id != null) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - cooldownMeses);
    const cutoffMs = cutoff.getTime();
    const { data: cooldownRows } = await supabase
      .from("partidas")
      .select("status, status_ranking, data_resultado, data_partida, data_registro")
      .eq("esporte_id", Number(d.esporte_id))
      .is("torneio_id", null)
      .eq("modalidade", "dupla")
      .or(
        `and(jogador1_id.eq.${user.id},jogador2_id.eq.${timeResolvido.criador_id}),and(jogador1_id.eq.${timeResolvido.criador_id},jogador2_id.eq.${user.id})`
      )
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
        rankingBlockedUntilDupla = until.toISOString();
        break;
      }
    }
  }

  const { data: eid1 } = await supabase
    .from("usuario_eid")
    .select("nota_eid, pontos_ranking")
    .eq("usuario_id", d.player1_id)
    .eq("esporte_id", d.esporte_id)
    .maybeSingle();
  const { data: eid2 } = await supabase
    .from("usuario_eid")
    .select("nota_eid, pontos_ranking")
    .eq("usuario_id", d.player2_id)
    .eq("esporte_id", d.esporte_id)
    .maybeSingle();

  const esp = Array.isArray(d.esportes) ? d.esportes[0] : d.esportes;
  const mediaEid =
    eid1?.nota_eid != null && eid2?.nota_eid != null
      ? (Number(eid1.nota_eid) + Number(eid2.nota_eid)) / 2
      : null;
  const rankTotal = Number(eid1?.pontos_ranking ?? 0) + Number(eid2?.pontos_ranking ?? 0);
  const conquistas: string[] = [];
  if ((mediaEid ?? 0) >= 7) conquistas.push("Dupla Elite");
  if (rankTotal >= 1200) conquistas.push("Rank Forte");
  if ((p1?.id ? 1 : 0) + (p2?.id ? 1 : 0) === 2) conquistas.push("Dupla Completa");

  const fromPublicDupla = `/perfil-dupla/${id}`;
  const editarDuplaHref = `/editar/dupla/${id}?from=${encodeURIComponent(fromPublicDupla)}`;

  const nomeExibicao = timeResolvido?.nome ?? `Dupla registrada #${id}`;
  const usernameExibicao = timeResolvido?.username ?? d.username;
  const localExibicao =
    timeResolvido?.localizacao?.trim() ||
    [p1?.localizacao, p2?.localizacao]
      .map((x) => (x ? String(x).trim() : ""))
      .filter(Boolean)
      .join(" · ") ||
    null;

  return (
    <main className={PROFILE_PUBLIC_MAIN_CLASS}>
        <div className={`${PROFILE_HERO_PANEL_CLASS} mt-2 p-3 text-center sm:p-4`}>
          {timeResolvido?.escudo ? (
            <img
              src={timeResolvido.escudo}
              alt=""
              className="mx-auto h-24 w-24 rounded-2xl border-2 border-eid-action-500/50 object-cover shadow-lg sm:h-28 sm:w-28"
            />
          ) : (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-eid-primary-500/40 bg-eid-surface text-sm font-black text-eid-primary-300 sm:h-28 sm:w-28">
              D
            </div>
          )}
          <span className="mt-4 inline-block rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-eid-primary-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1">
                <ModalidadeGlyphIcon modalidade="dupla" />
                <span>DUPLA</span>
              </span>
              <span aria-hidden className="opacity-70">|</span>
              <span className="inline-flex items-center gap-1">
                <SportGlyphIcon sportName={esp?.nome} />
                <span>{esp?.nome ?? "Esporte"}</span>
              </span>
            </span>
          </span>
          <h1 className="mt-3 text-xl font-bold uppercase tracking-tight text-eid-fg sm:text-2xl">{nomeExibicao}</h1>
          {usernameExibicao ? (
            <p className="mt-1 text-xs font-medium text-eid-primary-300">@{usernameExibicao}</p>
          ) : null}
          <div className="mt-2 flex justify-center px-2">
            <EidCityState location={localExibicao} align="center" />
          </div>
          {isDonoDupla && timeResolvidoId ? <FormacaoCidadeAvisoLider timeId={timeResolvidoId} /> : null}
          {d.bio ? <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">{d.bio}</p> : null}
          {liderDupla ? (
            <div className="mt-4 flex items-center justify-center gap-2.5">
              {liderDupla.avatar_url ? (
                <img
                  src={liderDupla.avatar_url}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full border border-[color:var(--eid-border-subtle)] object-cover sm:h-10 sm:w-10"
                />
              ) : (
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[11px] font-black text-eid-primary-300 sm:h-10 sm:w-10">
                  {(liderDupla.nome ?? "L").trim().slice(0, 1).toUpperCase() || "L"}
                </span>
              )}
              <p className="text-left text-xs text-eid-text-secondary">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary/90">Líder</span>
                <Link
                  href={`/perfil/${liderDupla.id}?from=/perfil-dupla/${id}`}
                  className="font-semibold text-eid-primary-300 hover:underline"
                >
                  {liderDupla.nome ?? "—"}
                </Link>
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-6">
          {/* Dono da dupla: evita cartão “Ação principal” vazio ou só com texto redundante. */}
          {!isDonoDupla ? (
          <section className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-3">
            <h2 className="sr-only">Ação principal</h2>
            <div className="mb-2 flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-2.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Ação principal</p>
              <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
                Match
              </span>
            </div>
            {!isMembroDupla ? (
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
                    Chamar no WhatsApp
                  </a>
                ) : null}
                {canChallengeDupla && !hasAceitoRankDupla && timeResolvidoId && !rankingBlockedUntilDupla ? (
                  <ProfilePrimaryCta
                    href={`/desafio?id=${timeResolvidoId}&tipo=dupla&esporte=${d.esporte_id}`}
                    label={linkWpp ? "⚡ Desafio no ranking" : undefined}
                  />
                ) : hasAceitoRankDupla && timeResolvidoId ? (
                  <p className="text-xs text-eid-text-secondary">
                    Desafio aceito nesta dupla. Registre o resultado na agenda quando jogarem.
                  </p>
                ) : !canChallengeDupla || isMembroDupla ? (
                  <ProfilePrimaryCta
                    href={`/match?tipo=dupla&esporte=${d.esporte_id}`}
                    label="Duplas no radar"
                  />
                ) : null}
                {canChallengeDupla && !hasAceitoRankDupla && rankingBlockedUntilDupla ? (
                  <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2 text-[11px] text-eid-text-secondary">
                    Carência ativa para novo desafio de ranking nesta dupla até{" "}
                    <span className="font-semibold text-eid-fg">
                      {new Date(rankingBlockedUntilDupla).toLocaleDateString("pt-BR")}
                    </span>
                    .{" "}
                    <span className="font-semibold text-eid-fg">{formatCooldownRemaining(rankingBlockedUntilDupla)}</span>
                  </p>
                ) : null}
                {canSugerirMatchDupla && timeResolvidoId ? (
                  <SugerirMatchLiderForm
                    alvoTimeId={timeResolvidoId}
                    alvoNome={timeResolvido?.nome ?? "Dupla no radar"}
                    modalidadeLabel="dupla"
                    formacoesMinhas={formacoesMembroNaoLiderDupla}
                  />
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-eid-text-secondary">Você faz parte desta dupla registrada.</p>
            )}
          </section>
          ) : null}

          <ProfileSection title="EID e estatísticas">
            {timeResolvido ? (
              <>
                <div className={`${PROFILE_CARD_BASE} mt-2 overflow-hidden p-0`}>
                  <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Resumo EID</p>
                    <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
                      Ranking
                    </span>
                  </div>
                  <div className="p-3">
                  <div className="flex justify-center">
                    <EidBadge score={Number(timeResolvido.eid_time ?? 0)} history={eidLogsDupla ?? []} label="EID dupla" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[color:var(--eid-border-subtle)] pt-4">
                    <div className="text-center">
                      <p className="text-lg font-bold tabular-nums text-eid-action-500 sm:text-xl sm:font-black">
                        {Number(timeResolvido.eid_time ?? 0).toFixed(1)}
                      </p>
                      <p className="text-[9px] font-bold uppercase text-eid-text-secondary">EID</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold tabular-nums text-eid-fg sm:text-xl sm:font-black">
                        {timeResolvido.pontos_ranking ?? 0}
                      </p>
                      <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Pts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold tabular-nums text-eid-primary-300 sm:text-xl sm:font-black">
                        {posicaoDupla != null ? `#${posicaoDupla}` : "—"}
                      </p>
                      <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Posição</p>
                    </div>
                  </div>
                  {d.esporte_id ? (
                    <ProfileEditDrawerTrigger
                      href={`/perfil-dupla/${id}/eid/${d.esporte_id}?from=${encodeURIComponent(fromPublicDupla)}`}
                      title={`Estatísticas · ${esp?.nome ?? "Esporte"}`}
                      fullscreen
                      topMode="backOnly"
                      className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-action-500/40 bg-eid-action-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-action-400 transition hover:border-eid-action-500/70 hover:bg-eid-action-500/15"
                    >
                      <span>Estatísticas completas · {esp?.nome ?? "este esporte"}</span>
                    </ProfileEditDrawerTrigger>
                  ) : null}
                  <ProfileSportsMetricsCard
                    sportName={esp?.nome ?? "Esporte"}
                    eidValue={Number(timeResolvido.eid_time ?? 0)}
                    rankValue={Number(timeResolvido.pontos_ranking ?? 0)}
                    trendLabel="Evolução EID"
                    trendPoints={
                      (histDupla ?? []).length >= 3
                        ? ([
                            Number((histDupla ?? [])[2]?.nota_nova ?? timeResolvido.eid_time ?? 0),
                            Number((histDupla ?? [])[1]?.nota_nova ?? timeResolvido.eid_time ?? 0),
                            Number((histDupla ?? [])[0]?.nota_nova ?? timeResolvido.eid_time ?? 0),
                          ] as [number, number, number])
                        : [
                            Number(timeResolvido.eid_time ?? 0),
                            Number(timeResolvido.eid_time ?? 0),
                            Number(timeResolvido.eid_time ?? 0),
                          ]
                    }
                    showScoreTiles={false}
                  />
                  </div>
                </div>
                <ProfileCompactTimeline
                  title="Histórico de notas EID"
                  emptyText="Sem histórico recente de EID."
                  items={[...(histDupla ?? [])]
                    .reverse()
                    .map((h, i) => ({
                      id: `${h.data_alteracao ?? "sem-data"}-${i}`,
                      label: `${Number(h.nota_nova).toFixed(1)} ${h.data_alteracao ? new Date(h.data_alteracao).toLocaleDateString("pt-BR") : ""}`.trim(),
                      tone: "neutral" as const,
                    }))}
                />
              </>
            ) : (
              <div className={`${PROFILE_CARD_BASE} mt-2 overflow-hidden p-0`}>
                <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Resumo EID</p>
                  <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-action-400">
                    Sem time ativo
                  </span>
                </div>
                <div className="p-3">
                <p className="text-xs text-eid-text-secondary">
                  Ainda não há <strong className="text-eid-fg">time de dupla ativo</strong> no ranking com estes dois atletas. O EID de equipe aparece quando a formação existir no radar.
                </p>
                {mediaEid != null ? (
                  <div className="mt-3">
                    <ProfileSportsMetricsCard
                      sportName={esp?.nome ?? "Esporte"}
                      eidValue={mediaEid}
                      rankValue={rankTotal}
                      eidLabel="EID médio (atletas)"
                      rankLabel="Soma pontos individuais"
                      trendLabel="Referência"
                      trendPoints={[mediaEid, mediaEid + 0.05, mediaEid + 0.1]}
                    />
                  </div>
                ) : null}
                {d.esporte_id ? (
                  <ProfileEditDrawerTrigger
                    href={`/perfil-dupla/${id}/eid/${d.esporte_id}?from=${encodeURIComponent(fromPublicDupla)}`}
                    title={`Estatísticas · ${esp?.nome ?? "Esporte"}`}
                    fullscreen
                    topMode="backOnly"
                    className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-action-500/40 bg-eid-action-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-action-400 transition hover:border-eid-action-500/70 hover:bg-eid-action-500/15"
                  >
                    <span>Abrir estatísticas · {esp?.nome ?? "este esporte"}</span>
                  </ProfileEditDrawerTrigger>
                ) : null}
                </div>
              </div>
            )}
          </ProfileSection>

          <ProfileSection title="Resultados">
            {timeResolvidoId ? (
              <ProfileFormacaoResultados
                totais={bundleResultadosDupla.totais}
                items={bundleResultadosDupla.items}
                emptyText="Nenhuma partida em dupla concluída listada ainda."
              />
            ) : (
              <p className="mt-2 text-xs text-eid-text-secondary">
                Resultados de ranking e torneio aparecem quando houver time de dupla ativo no radar.
              </p>
            )}
            <p className="mt-3 text-[10px] text-eid-text-secondary">
              Para desafiar outra dupla no radar:{" "}
              <Link href="/match?tipo=dupla" className="font-semibold text-eid-primary-300 underline">
                Desafio → Duplas
              </Link>
              .
            </p>
          </ProfileSection>

          <ProfileSection title="Participantes">
            {isDonoDupla && timeResolvidoId ? (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-eid-text-secondary">
                  Convidar integrante pelo nome ou @ — com <strong className="text-eid-fg">três letras</strong> aparecem
                  sugestões. Você pode cancelar um convite pendente a qualquer momento.
                </p>
                <TeamPublicInviteBlock
                  timeId={timeResolvidoId}
                  excludeUserIds={idsExcluirConviteDupla}
                  pendingInvites={convitesPendentesDupla}
                />
              </div>
            ) : null}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[p1, p2].map((p, i) =>
                p ? (
                  <ProfileMemberCard
                    key={p.id}
                    href={`/perfil/${p.id}?from=/perfil-dupla/${id}`}
                    name={p.nome ?? "Atleta"}
                    subtitle={p.localizacao ?? "—"}
                    avatarUrl={p.avatar_url}
                    fallbackLabel={`${i + 1}o`}
                    layout="stacked"
                    avatarSize="sm"
                    trailing={
                      <p className="text-[11px] font-semibold text-eid-primary-300">
                        EID {i === 0 ? Number(eid1?.nota_eid ?? 0).toFixed(1) : Number(eid2?.nota_eid ?? 0).toFixed(1)}
                      </p>
                    }
                  />
                ) : null
              )}
            </div>
          </ProfileSection>

          {isMembroDupla ? (
            <div className="eid-list-item overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
              <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Gestão da dupla</p>
                <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-action-400">
                  Conta
                </span>
              </div>
              <div className="p-3">
              {isDonoDupla ? (
                <div className="space-y-2">
                  <ProfileEditDrawerTrigger
                    href={editarDuplaHref}
                    title="Editar dupla"
                    fullscreen
                    topMode="backOnly"
                    className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/65 hover:bg-eid-primary-500/16"
                  >
                    <span>Editar dupla registrada</span>
                  </ProfileEditDrawerTrigger>
                  <Link
                    href={editarDuplaHref}
                    className="flex min-h-[40px] w-full items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-[10px] font-semibold uppercase tracking-wide text-eid-text-secondary transition hover:border-eid-primary-500/35 hover:text-eid-fg"
                  >
                    Abrir em página cheia (sem painel)
                  </Link>
                </div>
              ) : null}
              <div className={`grid gap-2 ${isDonoDupla ? "mt-3" : ""}`}>
                <ProfileEditDrawerTrigger
                  href={`/editar/perfil?from=${encodeURIComponent(fromPublicDupla)}`}
                  title="Editar perfil"
                  fullscreen
                  topMode="backOnly"
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/65 hover:bg-eid-primary-500/16"
                >
                  <span>Editar perfil pessoal</span>
                </ProfileEditDrawerTrigger>
                <ProfileEditDrawerTrigger
                  href={`/editar/performance-eid?from=${encodeURIComponent(fromPublicDupla)}`}
                  title="Esportes e EID"
                  fullscreen
                  topMode="backOnly"
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-[11px] font-black uppercase tracking-wide text-eid-fg transition hover:border-eid-primary-500/40"
                >
                  <span>Esportes e ranking (EID)</span>
                </ProfileEditDrawerTrigger>
              </div>
              </div>
            </div>
          ) : null}

          <ProfileSection title="Conquistas">
            <ProfileAchievementsShelf achievements={conquistas} emptyText="Conquistas aparecerão conforme evolução da dupla." />
          </ProfileSection>
        </div>
      </main>
  );
}
