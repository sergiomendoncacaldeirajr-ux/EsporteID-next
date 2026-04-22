import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { EidBadge } from "@/components/eid/eid-badge";
import { ProfileAchievementsShelf, ProfileCompactTimeline } from "@/components/perfil/profile-history-widgets";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { ProfilePrimaryCta, ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSportsMetricsCard } from "@/components/perfil/profile-sports-metrics-card";
import { ProfileMemberCard } from "@/components/perfil/profile-team-members-cards";
import { SugerirMatchLiderForm } from "@/components/perfil/sugerir-match-lider-form";
import { PerfilTimeEditForm } from "@/components/perfil/perfil-time-edit-form";
import { resolveBackHref } from "@/lib/perfil/back-href";
import {
  formacaoTemMatchAceitoEntre,
  podeExibirWhatsappPerfilFormacao,
  waMeHref,
} from "@/lib/perfil/whatsapp-visibility";
import { loginNextWithOptionalFrom } from "@/lib/auth/login-next-path";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";
import { CONTA_ESPORTES_EID_HREF, CONTA_PERFIL_HREF, contaEditarFormacaoTimeHref } from "@/lib/routes/conta";
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

export default async function PerfilTimePage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const backHref = resolveBackHref(sp.from, "/match");

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

  async function convidarAction(formData: FormData) {
    "use server";
    const sb = await createClient();
    const uname = String(formData.get("username") ?? "").trim().toLowerCase();
    if (!uname) return;
    await sb.rpc("convidar_para_time", { p_time_id: id, p_username: uname });
    revalidatePath(`/perfil-time/${id}`);
    revalidatePath("/comunidade");
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

  const timeAmistosoOn = computeDisponivelAmistosoEffective(
    t.disponivel_amistoso,
    "disponivel_amistoso_ate" in t
      ? (t as { disponivel_amistoso_ate: string | null }).disponivel_amistoso_ate
      : null
  );

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

  const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
  const modalidade = (t.tipo ?? "time") === "dupla" ? "dupla" : "time";

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

  const temBlocoAcaoVisitante =
    linkWpp || (canChallenge && !hasAceitoRank && Boolean(t.esporte_id));
  const conquistas: string[] = [];
  if (Number(t.pontos_ranking ?? 0) >= 1000) conquistas.push("Rank 1000+");
  if (Number(t.eid_time ?? 0) >= 7) conquistas.push("EID Elite");
  if ((membros ?? []).length >= 4) conquistas.push("Elenco Completo");

  return (
    <main className={PROFILE_PUBLIC_MAIN_CLASS}>
        <PerfilBackLink href={backHref} label="Voltar" />

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
            {(t.tipo ?? "time").toUpperCase()} · {esp?.nome ?? "Esporte"}
          </span>
          <h1 className="mt-3 text-xl font-bold uppercase tracking-tight text-eid-fg sm:text-2xl">{t.nome ?? "Formação"}</h1>
          {t.username ? <p className="mt-1 text-xs font-medium text-eid-primary-300">@{t.username}</p> : null}
          <p className="mt-2 text-sm text-eid-text-secondary">{t.localizacao ?? "Localização não informada"}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-eid-text-secondary">
            Cidade da formação: definida na criação e <strong className="text-eid-fg">não editável</strong>. Para mudar de
            cidade, crie uma <strong className="text-eid-fg">nova equipe/dupla</strong> em Times.
          </p>
          {t.bio ? <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">{t.bio}</p> : null}
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            <span className="rounded-full border border-eid-action-500/30 px-2 py-0.5 text-[10px] font-semibold text-eid-action-400">
              {timeAmistosoOn ? "Amistoso (agora)" : "Só competitivo"}
            </span>
            <span className="rounded-full border border-eid-primary-500/30 px-2 py-0.5 text-[10px] font-semibold text-eid-primary-300">
              {t.interesse_rank_match ? "Rank ativo" : "Rank off"}
            </span>
          </div>

          {criador ? (
            <p className="mt-4 text-xs text-eid-text-secondary">
              Líder:{" "}
              <Link href={`/perfil/${criador.id}?from=/perfil-time/${id}`} className="font-semibold text-eid-primary-300 hover:underline">
                {criador.nome ?? "—"}
              </Link>
            </p>
          ) : null}

        </div>

        <div className="mt-6 grid gap-6">
          <section>
            <h2 className="sr-only">Ação principal</h2>
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
                {canChallenge && !hasAceitoRank && t.esporte_id ? (
                  <ProfilePrimaryCta
                    href={`/desafio?id=${id}&tipo=${encodeURIComponent(modalidade)}&esporte=${t.esporte_id}`}
                    label={linkWpp ? "⚡ Match no ranking" : undefined}
                  />
                ) : null}
              </div>
            ) : !isLeader && canChallenge && hasAceitoRank ? (
              <p className="text-xs text-eid-text-secondary">
                Match aceito nesta modalidade. Registre o resultado na agenda quando jogarem.
              </p>
            ) : t.criador_id === user.id ? (
              <p className="text-xs text-eid-text-secondary">Esta é a sua formação.</p>
            ) : (
              <p className="text-xs text-eid-text-secondary">
                Para desafiar direto, você precisa ser líder de uma {modalidade} neste esporte — ou use a sugestão abaixo
                se você já faz parte de uma formação.
              </p>
            )}
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
            <div className={`${PROFILE_CARD_BASE} mt-2 p-3`}>
              <div className="flex justify-center">
                <EidBadge score={Number(t.eid_time ?? 0)} history={eidLogs ?? []} label="EID formação" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[color:var(--eid-border-subtle)] pt-4">
                <div className="text-center">
                  <p className="text-lg font-bold tabular-nums text-eid-action-500 sm:text-xl sm:font-black">
                    {Number(t.eid_time ?? 0).toFixed(1)}
                  </p>
                  <p className="text-[9px] font-bold uppercase text-eid-text-secondary">EID</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold tabular-nums text-eid-fg sm:text-xl sm:font-black">{t.pontos_ranking ?? 0}</p>
                  <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Pts</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold tabular-nums text-eid-primary-300 sm:text-xl sm:font-black">#{posicao}</p>
                  <p className="text-[9px] font-bold uppercase text-eid-text-secondary">Posição</p>
                </div>
              </div>
              {t.esporte_id ? (
                <Link
                  href={`/perfil-time/${id}/eid/${t.esporte_id}?from=${encodeURIComponent(`/perfil-time/${id}`)}`}
                  className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-action-500/40 bg-eid-action-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-action-400 transition hover:border-eid-action-500/70 hover:bg-eid-action-500/15"
                >
                  Estatísticas completas · {esp?.nome ?? "este esporte"}
                </Link>
              ) : null}
            </div>
            <div className={`${PROFILE_CARD_BASE} mt-3 overflow-hidden p-0`}>
              <ProfileSportsMetricsCard
                sportName={esp?.nome ?? "Esporte"}
                eidValue={Number(t.eid_time ?? 0)}
                rankValue={Number(t.pontos_ranking ?? 0)}
                rankLabel="Pontos no ranking"
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
              />
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
              <form action={convidarAction} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  name="username"
                  placeholder="@username para convidar"
                  className="eid-input-dark rounded-xl px-3 py-2 text-xs text-eid-fg"
                />
                <button type="submit" className="eid-btn-primary rounded-xl px-3 py-2 text-xs font-semibold">
                  Convidar
                </button>
              </form>
            ) : null}
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
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
            <div className="eid-list-item rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">Gestão da formação</p>
              <Link
                href={`/times?from=${encodeURIComponent(`/perfil-time/${id}`)}`}
                className="mt-2 flex min-h-[38px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/65 hover:bg-eid-primary-500/16"
              >
                Gerenciar equipe
              </Link>
              <p className="mt-1 text-[10px] text-eid-text-secondary">
                Convidar atletas e convites — painel completo em Times.
              </p>
              <Link
                href={`${contaEditarFormacaoTimeHref(id)}?from=${encodeURIComponent(`/perfil-time/${id}`)}`}
                className="mt-2 flex min-h-[38px] w-full items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-[11px] font-bold uppercase tracking-wide text-eid-fg transition hover:border-eid-primary-500/40"
              >
                Editar em página dedicada
              </Link>
              <PerfilTimeEditForm
                timeId={id}
                nome={t.nome ?? ""}
                username={t.username ?? null}
                bio={t.bio ?? null}
                localizacao={t.localizacao ?? null}
                escudo={t.escudo ?? null}
                interesse_rank_match={Boolean(t.interesse_rank_match)}
                vagas_abertas={Boolean(t.vagas_abertas)}
                aceita_pedidos={Boolean(t.aceita_pedidos)}
                interesse_torneio={Boolean(t.interesse_torneio)}
                nivel_procurado={t.nivel_procurado ?? null}
              />
            </div>
          ) : null}

          {isMember || isLeader ? (
            <div className="grid gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-3">
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
              <p className="text-[10px] leading-relaxed text-eid-text-secondary">
                Seu nome, cidade e dados de atleta são pessoais. A <strong className="text-eid-fg">cidade da equipe</strong>{" "}
                (formação) aparece no topo e <strong className="text-eid-fg">não pode ser alterada</strong>; para mudar de
                cidade no radar, o líder cria uma <strong className="text-eid-fg">nova formação</strong>.
              </p>
            </div>
          ) : null}

          <ProfileSection title="Conquistas">
            <ProfileAchievementsShelf achievements={conquistas} emptyText="Conquistas aparecerão com a evolução da equipe." />
          </ProfileSection>
        </div>
      </main>
  );
}
