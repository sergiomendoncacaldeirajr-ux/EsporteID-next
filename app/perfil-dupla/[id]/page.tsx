import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EidBadge } from "@/components/eid/eid-badge";
import { ProfileAchievementsShelf, ProfileCompactTimeline } from "@/components/perfil/profile-history-widgets";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { ProfilePrimaryCta, ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSportsMetricsCard } from "@/components/perfil/profile-sports-metrics-card";
import { ProfileMemberCard } from "@/components/perfil/profile-team-members-cards";
import { PerfilDuplaEditForm } from "@/components/perfil/perfil-dupla-edit-form";
import { SugerirMatchLiderForm } from "@/components/perfil/sugerir-match-lider-form";
import { resolveBackHref } from "@/lib/perfil/back-href";
import {
  formacaoTemMatchAceitoEntre,
  podeExibirWhatsappPerfilFormacao,
  podeExibirWhatsappPerfilPublico,
  resolverTimeIdParaDuplaRegistrada,
  waMeHref,
} from "@/lib/perfil/whatsapp-visibility";
import { loginNextWithOptionalFrom } from "@/lib/auth/login-next-path";
import { CONTA_ESPORTES_EID_HREF, CONTA_PERFIL_HREF, contaEditarDuplaRegistradaHref } from "@/lib/routes/conta";
import { ProfileFormacaoResultados } from "@/components/perfil/profile-formacao-resultados";
import { PROFILE_CARD_BASE, PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { buildFormacaoResultadosPerfil } from "@/lib/perfil/build-formacao-resultados-perfil";
import {
  carregarPartidasColetivasDoTime,
  mapNomesTimesAdversarios,
  mapTorneioNomes,
} from "@/lib/perfil/formacao-eid-stats";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function PerfilDuplaPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const backHref = resolveBackHref(sp.from, "/match");

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
    ? await supabase.from("profiles").select("id, nome, whatsapp").eq("id", timeResolvido.criador_id).maybeSingle()
    : { data: null };

  const isMembroDupla = user.id === d.player1_id || user.id === d.player2_id;
  const donoDuplaId = d.criador_id ?? d.player1_id;
  const isDonoDupla = user.id === donoDuplaId;

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
        <PerfilBackLink href={backHref} label="Voltar" />

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
            DUPLA · {esp?.nome ?? "Esporte"}
          </span>
          <h1 className="mt-3 text-xl font-bold uppercase tracking-tight text-eid-fg sm:text-2xl">{nomeExibicao}</h1>
          {usernameExibicao ? (
            <p className="mt-1 text-xs font-medium text-eid-primary-300">@{usernameExibicao}</p>
          ) : null}
          <p className="mt-2 text-sm text-eid-text-secondary">{localExibicao ?? "Localização não informada"}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-eid-text-secondary">
            Par fixo de atletas no mesmo esporte. Com time ativo no radar, escudo e cidade da <strong className="text-eid-fg">formação</strong> vêm do ranking.
          </p>
          {d.bio ? <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">{d.bio}</p> : null}
          {liderDupla ? (
            <p className="mt-3 text-xs text-eid-text-secondary">
              Líder:{" "}
              <Link
                href={`/perfil/${liderDupla.id}?from=/perfil-dupla/${id}`}
                className="font-semibold text-eid-primary-300 hover:underline"
              >
                {liderDupla.nome ?? "—"}
              </Link>
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-6">
          <section>
            <h2 className="sr-only">Ação principal</h2>
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
                {canChallengeDupla && !hasAceitoRankDupla && timeResolvidoId ? (
                  <ProfilePrimaryCta
                    href={`/desafio?id=${timeResolvidoId}&tipo=dupla&esporte=${d.esporte_id}`}
                    label={linkWpp ? "⚡ Match no ranking" : undefined}
                  />
                ) : hasAceitoRankDupla && timeResolvidoId ? (
                  <p className="text-xs text-eid-text-secondary">
                    Match aceito nesta dupla. Registre o resultado na agenda quando jogarem.
                  </p>
                ) : (
                  <ProfilePrimaryCta
                    href={`/match?tipo=dupla&esporte=${d.esporte_id}`}
                    label="Duplas no radar"
                  />
                )}
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

          <ProfileSection title="EID e estatísticas">
            {timeResolvido ? (
              <>
                <div className={`${PROFILE_CARD_BASE} mt-2 p-3`}>
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
                    <Link
                      href={`/perfil-dupla/${id}/eid/${d.esporte_id}?from=${encodeURIComponent(`/perfil-dupla/${id}`)}`}
                      className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-action-500/40 bg-eid-action-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-action-400 transition hover:border-eid-action-500/70 hover:bg-eid-action-500/15"
                    >
                      Estatísticas completas · {esp?.nome ?? "este esporte"}
                    </Link>
                  ) : null}
                </div>
                <div className={`${PROFILE_CARD_BASE} mt-3 overflow-hidden p-0`}>
                  <ProfileSportsMetricsCard
                    sportName={esp?.nome ?? "Esporte"}
                    eidValue={Number(timeResolvido.eid_time ?? 0)}
                    rankValue={Number(timeResolvido.pontos_ranking ?? 0)}
                    rankLabel="Pontos no ranking"
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
                  />
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
              <div className={`${PROFILE_CARD_BASE} mt-2 p-3`}>
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
                  <Link
                    href={`/perfil-dupla/${id}/eid/${d.esporte_id}?from=${encodeURIComponent(`/perfil-dupla/${id}`)}`}
                    className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-action-500/40 bg-eid-action-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-action-400 transition hover:border-eid-action-500/70 hover:bg-eid-action-500/15"
                  >
                    Abrir estatísticas · {esp?.nome ?? "este esporte"}
                  </Link>
                ) : null}
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
                Match → Duplas
              </Link>
              .
            </p>
          </ProfileSection>

          <ProfileSection title="Participantes">
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
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
                    avatarSize="lg"
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
            <div className="eid-list-item rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-3">
              {isDonoDupla ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">Sua dupla registrada</p>
                  <Link
                    href={`${contaEditarDuplaRegistradaHref(id)}?from=${encodeURIComponent(`/perfil-dupla/${id}`)}`}
                    className="mt-2 flex min-h-[38px] w-full items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-[11px] font-bold uppercase tracking-wide text-eid-fg transition hover:border-eid-primary-500/40"
                  >
                    Editar em página dedicada
                  </Link>
                  <PerfilDuplaEditForm
                    duplaId={id}
                    username={d.username ?? null}
                    bio={d.bio ?? null}
                    timeFormacaoRadarId={timeResolvidoId}
                  />
                </>
              ) : null}
              <div className={`grid gap-2 ${isDonoDupla ? "mt-3" : ""}`}>
                <Link
                  href={CONTA_PERFIL_HREF}
                  className="flex min-h-[38px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/65 hover:bg-eid-primary-500/16"
                >
                  Editar perfil pessoal
                </Link>
                <Link
                  href={CONTA_ESPORTES_EID_HREF}
                  className="flex min-h-[38px] w-full items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-[11px] font-black uppercase tracking-wide text-eid-fg transition hover:border-eid-primary-500/40"
                >
                  Esportes e ranking (EID)
                </Link>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-eid-text-secondary">
                {isDonoDupla
                  ? "Só o dono edita @ e bio da dupla registrada. Cidade da formação no radar segue o time ativo."
                  : "Só o dono edita @ e bio da dupla registrada."}
              </p>
            </div>
          ) : null}

          <ProfileSection title="Conquistas">
            <ProfileAchievementsShelf achievements={conquistas} emptyText="Conquistas aparecerão conforme evolução da dupla." />
          </ProfileSection>
        </div>
      </main>
  );
}
