import Link from "next/link";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfilePrimaryCta, ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSolicitarMatchMenu } from "@/components/perfil/profile-solicitar-match-menu";
import { MatchIdadeGateBanner } from "@/components/perfil/match-idade-gate-banner";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { ProfileConviteFormacaoCta } from "@/components/perfil/profile-convite-formacao-cta";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { isEsportePermitidoDesafioPerfilIndividual } from "@/lib/match/esporte-match-individual-policy";
import { isSportMatchEnabled } from "@/lib/sport-capabilities";
import {
  esporteIdsComMatchAceitoEntre,
  podeExibirWhatsappProfessor,
  podeExibirWhatsappPerfilPublico,
  waMeHref,
} from "@/lib/perfil/whatsapp-visibility";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import { EidStreamSection } from "@/components/eid-stream-section";
import { ProfilePublicHistoricoStreamSkeleton } from "@/components/loading/profile-app-skeletons";
import { PerfilPublicoHistoricoSection } from "./perfil-public-historico";
import type { PerfilPublicoEidRow, PerfilPublicoProfileRow } from "./perfil-public-shared";

export type PerfilPublicoBelowFoldProps = {
  profileId: string;
  viewerId: string;
  perfil: PerfilPublicoProfileRow;
  canOpenLocais: boolean;
  isSelf: boolean;
  hasProfessor: boolean;
  eids: PerfilPublicoEidRow[] | null;
  /** Mesmo valor usado no hero (toggle amistoso + menu de desafio). */
  amistosoPerfilOn: boolean;
};

export async function PerfilPublicoBelowFold({
  profileId,
  viewerId,
  perfil,
  canOpenLocais,
  isSelf,
  hasProfessor,
  eids,
  amistosoPerfilOn,
}: PerfilPublicoBelowFoldProps) {
  const { supabase, user } = await getServerAuth();
  if (!user || user.id !== viewerId) return null;

  const id = profileId;
  const emptySet = new Set<number>();

  const [
    viewerAmRowRes,
    mgRowRes,
    { data: timesLider },
    { data: duplasCadastro },
    { data: membershipsRows },
    { data: viewerEidRowsParaDesafio },
    podeVerWhatsappAtleta,
    esportesMatchAceito,
    cooldownMeses,
    { data: viewerLiderTimesData },
  ] = await Promise.all([
    !isSelf
      ? supabase.from("profiles").select("disponivel_amistoso, disponivel_amistoso_ate").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    isSelf
      ? supabase.from("profiles").select("match_idade_gate").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("times")
      .select("id, nome, tipo, escudo, esporte_id, esportes(nome)")
      .eq("criador_id", id)
      .order("id", { ascending: false })
      .limit(12),
    supabase
      .from("duplas")
      .select("id, esporte_id, esportes(nome)")
      .or(`player1_id.eq.${id},player2_id.eq.${id}`)
      .limit(12),
    supabase
      .from("membros_time")
      .select("status, times!inner(id, nome, tipo, escudo, esporte_id, criador_id, esportes(nome))")
      .eq("usuario_id", id)
      .in("status", ["ativo", "aceito", "aprovado"])
      .order("id", { ascending: false })
      .limit(24),
    !isSelf
      ? supabase.from("usuario_eid").select("esporte_id").eq("usuario_id", user.id)
      : Promise.resolve({ data: null as { esporte_id: number }[] | null }),
    podeExibirWhatsappPerfilPublico(supabase, user.id, id, isSelf),
    isSelf ? Promise.resolve(emptySet) : esporteIdsComMatchAceitoEntre(supabase, user.id, id),
    getMatchRankCooldownMeses(supabase),
    !isSelf
      ? supabase
          .from("times")
          .select("id, nome, tipo, esporte_id, esportes(nome)")
          .eq("criador_id", user.id)
          .order("id", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] | null }),
  ]);

  let viewerAmistosoOn = false;
  if (!isSelf && viewerAmRowRes.data) {
    viewerAmistosoOn = computeDisponivelAmistosoEffective(
      viewerAmRowRes.data.disponivel_amistoso,
      viewerAmRowRes.data.disponivel_amistoso_ate,
    );
  }

  let viewerMatchIdadeGate = "ok";
  if (isSelf && mgRowRes.data) {
    viewerMatchIdadeGate = String(mgRowRes.data.match_idade_gate ?? "ok");
  }

  const [{ data: professorPerfil }, { data: professorEsportes }, { data: professorMetricas }] = hasProfessor
    ? await Promise.all([
        supabase
          .from("professor_perfil")
          .select("headline, bio_profissional, aceita_novos_alunos, perfil_publicado")
          .eq("usuario_id", id)
          .maybeSingle(),
        supabase
          .from("professor_esportes")
          .select("tipo_atuacao, valor_base_centavos, esportes(nome)")
          .eq("professor_id", id)
          .eq("ativo", true),
        supabase
          .from("professor_metricas")
          .select("nota_docente, total_avaliacoes_validas, esportes(nome)")
          .eq("professor_id", id)
          .order("nota_docente", { ascending: false }),
      ])
    : [{ data: null }, { data: [] }, { data: [] }];

  const podeVerWhatsappProfessor = hasProfessor
    ? await podeExibirWhatsappProfessor(supabase, user.id, id, isSelf)
    : false;
  const podeVerWhatsapp = podeVerWhatsappAtleta || podeVerWhatsappProfessor;
  const linkWpp = podeVerWhatsapp ? waMeHref(perfil.whatsapp) : null;

  const viewerEsporteIdsParaDesafio = new Set(
    (viewerEidRowsParaDesafio ?? [])
      .map((r) => Number(r.esporte_id))
      .filter((n) => Number.isFinite(n) && n > 0),
  );

  let minhasFormacoesLider: Array<{
    id: number;
    nome: string;
    tipo: string | null;
    esporte_id: number | null;
    esporteNome: string;
  }> = [];
  if (!isSelf && viewerLiderTimesData && viewerLiderTimesData.length > 0) {
    minhasFormacoesLider = (viewerLiderTimesData as Array<Record<string, unknown>>).map((t) => {
      const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
      return {
        id: Number(t.id),
        nome: String(t.nome ?? "").trim() || "Formação",
        tipo: (t.tipo as string | null) ?? null,
        esporte_id: t.esporte_id != null ? Number(t.esporte_id) : null,
        esporteNome: (esp as { nome?: string | null } | null)?.nome ?? "Esporte",
      };
    });
  }

  const timesParticipa: Array<{
    id: number;
    nome: string | null;
    tipo: string | null;
    escudo: string | null;
    esporte_id: number | null;
    criador_id: string | null;
    esportes: Array<{ nome: string | null }>;
  }> = [];
  for (const row of membershipsRows ?? []) {
    const team = Array.isArray(row.times) ? row.times[0] : row.times;
    if (!team?.id) continue;
    if (String(team.criador_id ?? "") === id) continue;
    timesParticipa.push({
      id: Number(team.id),
      nome: team.nome ?? null,
      tipo: team.tipo ?? null,
      escudo: team.escudo ?? null,
      esporte_id: team.esporte_id ? Number(team.esporte_id) : null,
      criador_id: team.criador_id ?? null,
      esportes: Array.isArray(team.esportes)
        ? (team.esportes as Array<{ nome: string | null }>)
        : team.esportes
          ? [team.esportes as { nome: string | null }]
          : [],
    });
  }
  const timesFormacoes = [...(timesLider ?? [])];
  for (const team of timesParticipa) {
    if (!timesFormacoes.some((item) => Number(item.id) === Number(team.id))) {
      timesFormacoes.push(team);
    }
  }
  const leaderTeamIds = new Set((timesLider ?? []).map((team) => Number(team.id)));

  const [
    { count: alvoMembrosCount },
    { count: alvoLiderTimesCount },
    { count: alvoDuplasCount },
  ] = await Promise.all([
    supabase
      .from("membros_time")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", id)
      .in("status", ["ativo", "aceito", "aprovado"]),
    supabase.from("times").select("id", { count: "exact", head: true }).eq("criador_id", id),
    supabase.from("duplas").select("id", { count: "exact", head: true }).or(`player1_id.eq.${id},player2_id.eq.${id}`),
  ]);

  const alvoSemFormacao =
    (alvoMembrosCount ?? 0) === 0 && (alvoLiderTimesCount ?? 0) === 0 && (alvoDuplasCount ?? 0) === 0;

  const semCardsEquipesPerfil = (timesFormacoes ?? []).length === 0 && (duplasCadastro ?? []).length === 0;
  const ocultarSecaoEquipesParaVisitante = !isSelf && alvoSemFormacao && semCardsEquipesPerfil;

  const targetEsporteIdsParaConvite = new Set(
    (eids ?? []).map((e) => Number(e.esporte_id)).filter((n) => Number.isFinite(n) && n > 0),
  );
  const eligibleTeamsConvite = minhasFormacoesLider.filter(
    (t) => t.esporte_id != null && targetEsporteIdsParaConvite.has(t.esporte_id),
  );

  const esportesDoPerfil = (eids ?? [])
    .map((e) => {
      const esp = Array.isArray(e.esportes) ? e.esportes[0] : e.esportes;
      return {
        esporteId: Number(e.esporte_id),
        nome: (esp as { nome?: string | null } | null)?.nome ?? "Esporte",
        tipo: (esp as { tipo?: string | null } | null)?.tipo ?? null,
        permiteIndividual: Boolean((esp as { permite_individual?: boolean | null } | null)?.permite_individual),
      };
    })
    .filter((e) => Number.isFinite(e.esporteId) && e.esporteId > 0);
  const esporteIdsPerfil = [
    ...new Set(esportesDoPerfil.map((e) => Number(e.esporteId)).filter((n) => Number.isFinite(n) && n > 0)),
  ];
  const { data: confrontosComAlvo } =
    !isSelf && esporteIdsPerfil.length > 0
      ? await supabase
          .from("partidas")
          .select("esporte_id, status, status_ranking, data_resultado, data_registro, data_partida")
          .is("torneio_id", null)
          .in("esporte_id", esporteIdsPerfil)
          .or(`and(jogador1_id.eq.${user.id},jogador2_id.eq.${id}),and(jogador1_id.eq.${id},jogador2_id.eq.${user.id})`)
          .order("id", { ascending: false })
          .limit(240)
      : { data: [] as Array<Record<string, unknown>> };

  const cooldownUntilBySport = new Map<number, string>();
  for (const c of confrontosComAlvo ?? []) {
    const esporteId = Number((c as { esporte_id?: number | null }).esporte_id ?? 0);
    if (!Number.isFinite(esporteId) || esporteId <= 0) continue;
    const status = String((c as { status?: string | null }).status ?? "").trim().toLowerCase();
    const statusRanking = String((c as { status_ranking?: string | null }).status_ranking ?? "").trim().toLowerCase();
    const valido =
      statusRanking === "validado" ||
      ["concluida", "concluída", "concluido", "concluído", "finalizada", "encerrada", "validada"].includes(status);
    if (!valido) continue;
    const dtRaw =
      (c as { data_resultado?: string | null }).data_resultado ??
      (c as { data_partida?: string | null }).data_partida ??
      (c as { data_registro?: string | null }).data_registro ??
      null;
    if (!dtRaw) continue;
    const base = new Date(dtRaw);
    if (Number.isNaN(base.getTime())) continue;
    const until = new Date(base);
    until.setMonth(until.getMonth() + cooldownMeses);
    if (until.getTime() <= Date.now()) continue;
    const prev = cooldownUntilBySport.get(esporteId);
    if (!prev || new Date(prev).getTime() < until.getTime()) {
      cooldownUntilBySport.set(esporteId, until.toISOString());
    }
  }
  const esportesParaDesafio = esportesDoPerfil
    .filter((e) => isEsportePermitidoDesafioPerfilIndividual(e.tipo, e.permiteIndividual))
    .filter((e) => isSportMatchEnabled(e.nome))
    .filter((e) => isSelf || viewerEsporteIdsParaDesafio.has(e.esporteId))
    .filter((e) => !esportesMatchAceito.has(e.esporteId))
    .map((e) => ({
      esporteId: e.esporteId,
      nome: e.nome,
      rankingBlockedUntil: cooldownUntilBySport.get(e.esporteId) ?? null,
    }));

  const [{ data: socioRows }, { data: frequentesRows }] = await Promise.all([
    supabase
      .from("membership_requests")
      .select("espaco_generico_id, espacos_genericos!inner(id, nome_publico, localizacao)")
      .eq("usuario_id", id)
      .eq("status", "aprovado")
      .limit(20),
    supabase
      .from("usuario_locais_frequentes")
      .select("visitas, espacos_genericos!inner(id, nome_publico, localizacao)")
      .eq("usuario_id", id)
      .order("visitas", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="mt-4 grid gap-4">
      {isSelf ? <MatchIdadeGateBanner gate={viewerMatchIdadeGate} /> : null}
      {!isSelf ? (
        <section>
          <h2 className="sr-only">Ação principal</h2>
          <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
            <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Ação principal</p>
              <span className="rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
                Desafio
              </span>
            </div>
            <div className="p-3">
              {linkWpp || esportesParaDesafio.length > 0 ? (
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
                  {esportesParaDesafio.length > 0 ? (
                    <ProfileSolicitarMatchMenu
                      alvoId={id}
                      esportes={esportesParaDesafio.map((e) => ({ esporteId: e.esporteId, nome: e.nome }))}
                      viewerAmistosoOn={viewerAmistosoOn}
                      alvoAmistosoOn={amistosoPerfilOn}
                      mostrarDicaWppRanking={Boolean(linkWpp)}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <ProfilePrimaryCta href="/match" className="col-span-2" />
                  {hasProfessor ? (
                    <Link
                      href={`/professor/${id}`}
                      className="eid-btn-soft col-span-2 inline-flex min-h-[36px] items-center justify-center rounded-xl border-eid-action-500/30 px-3 text-[11px] font-bold uppercase tracking-wide text-eid-action-400"
                    >
                      Ver perfil profissional
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {!isSelf && alvoSemFormacao ? (
        <ProfileSection
          title="Dupla ou time"
          info="Convites para montar dupla ou entrar em time com este atleta. Use quando ainda não há uma formação em comum cadastrada."
        >
          <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-2">
            <ProfileConviteFormacaoCta
              targetUserId={id}
              targetNome={perfil.nome ?? "Atleta"}
              targetHasEsportes={(eids ?? []).length > 0}
              eligibleTeams={eligibleTeamsConvite}
              viewerHasAnyLiderTeam={minhasFormacoesLider.length > 0}
              perfilPath={`/perfil/${id}`}
            />
          </div>
        </ProfileSection>
      ) : null}

      {hasProfessor ? (
        <ProfileSection
          title="Professor"
          info="Esportes em que atua como professor, proposta profissional, valores e avaliações docentes quando disponíveis."
        >
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-eid-action-500/24 bg-eid-action-500/8">
              <div className="flex items-center justify-between border-b border-eid-action-500/20 bg-eid-action-500/10 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Perfil profissional</p>
                <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-action-400">
                  Professor
                </span>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-eid-fg">
                  {professorPerfil?.headline ?? "Professor ativo na plataforma"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">
                  {professorPerfil?.bio_profissional ??
                    "Use o perfil profissional para divulgar aulas, treinamento e consultoria."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[color:var(--eid-border-subtle)] px-3 py-1 text-[10px] font-semibold text-eid-fg">
                    {professorPerfil?.aceita_novos_alunos ? "Aceitando novos alunos" : "Captação sob consulta"}
                  </span>
                  {professorPerfil?.perfil_publicado ? (
                    <Link
                      href={`/professor/${id}`}
                      className="rounded-full border border-eid-action-500/35 px-3 py-1 text-[10px] font-semibold text-eid-action-400"
                    >
                      Abrir página pública
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            {(professorEsportes ?? []).length ? (
              <div className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35">
                <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Modalidades</p>
                  <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-action-400">
                    Aulas
                  </span>
                </div>
                <div className="grid gap-2 p-2">
                  {(professorEsportes ?? []).map((item, idx) => {
                    const esporte = Array.isArray(item.esportes) ? item.esportes[0] : item.esportes;
                    const metrica = (professorMetricas ?? []).find((m) => {
                      const esporteM = Array.isArray(m.esportes) ? m.esportes[0] : m.esportes;
                      return esporteM?.nome === esporte?.nome;
                    });
                    const tipos = item.tipo_atuacao;
                    const tiposArr = Array.isArray(tipos) ? tipos : [];
                    return (
                      <div
                        key={`${esporte?.nome ?? "esp"}-${idx}`}
                        className="eid-list-item rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-eid-fg">{esporte?.nome ?? "Esporte"}</p>
                            <p className="mt-1 text-xs text-eid-text-secondary">{tiposArr.join(", ") || "aulas"}</p>
                          </div>
                          <p className="text-xs font-bold text-eid-action-400">
                            A partir de R$ {(Number(item.valor_base_centavos ?? 0) / 100).toFixed(2).replace(".", ",")}
                          </p>
                        </div>
                        {metrica ? (
                          <p className="mt-2 text-xs text-eid-text-secondary">
                            Nota docente {Number(metrica.nota_docente ?? 0).toFixed(2)} · {metrica.total_avaliacoes_validas ?? 0}{" "}
                            avaliações
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </ProfileSection>
      ) : null}

      <div className="-mt-3">
        {isSelf ? (
          <div className="relative z-10 mb-1 mt-0 flex justify-end">
            <ProfileEditDrawerTrigger
              href={`/editar/performance-eid?from=${encodeURIComponent(`/perfil/${id}`)}`}
              title="Editar Performance EID"
              topMode="backOnly"
              className="inline-flex items-center justify-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2.5 py-1 text-[8px] font-bold uppercase leading-none tracking-[0.08em] text-eid-text-secondary transition-all hover:border-eid-primary-500/35 hover:bg-eid-primary-500/10 hover:text-eid-fg"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5" aria-hidden>
                <path d="M11.875 1.625a1.768 1.768 0 0 1 2.5 2.5l-7.54 7.54a1 1 0 0 1-.46.262l-3.018.805a.5.5 0 0 1-.612-.612l.805-3.018a1 1 0 0 1 .262-.46l7.54-7.54Zm1.793 1.207a.768.768 0 0 0-1.086 0l-.812.812 1.086 1.086.812-.812a.768.768 0 0 0 0-1.086ZM11.149 5.29 4.314 12.126l-1.02.272.272-1.02L10.4 4.544l.75.75Z" />
              </svg>
              GERENCIAR / EDITAR
            </ProfileEditDrawerTrigger>
          </div>
        ) : null}
        <ProfileSection
          title="Performance EID"
          info="Nota EID e desempenho por esporte. Cada modalidade tem registro próprio; toque no card para abrir estatísticas e histórico daquele esporte."
        >
          <div className="eid-list-item mt-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-2">
            {(eids ?? []).length === 0 ? (
              <p className="w-full rounded-xl bg-eid-surface/45 p-3 text-[11px] text-eid-text-secondary">
                Ainda sem EID registrado por esporte.
              </p>
            ) : (
              <div className="flex snap-x gap-1 overflow-x-auto pb-1">
                {(eids ?? []).map((e, idx) => {
                  const esp = Array.isArray(e.esportes) ? e.esportes[0] : e.esportes;
                  const eid = Number(e.nota_eid ?? 0);

                  return (
                    <ProfileEditDrawerTrigger
                      key={`${e.esporte_id}-${idx}`}
                      href={`/perfil/${encodeURIComponent(id)}/eid/${e.esporte_id}?from=${encodeURIComponent(`/perfil/${id}`)}`}
                      title={`Estatística de ${(esp as { nome?: string | null } | null)?.nome ?? "esporte"}`}
                      fullscreen
                      topMode="backOnly"
                      className="relative flex w-max min-h-[48px] shrink-0 snap-start touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl bg-eid-surface/45 px-2 py-1 transition-all duration-200 ease-out motion-safe:transform-gpu hover:-translate-y-[1px] hover:bg-eid-surface/60 active:translate-y-0 active:scale-[0.98]"
                    >
                      <ProfileEidPerformanceSeal
                        notaEid={eid}
                        compact
                        sealVariant="emphasis"
                        title={`EID ${eid.toFixed(1)} · ${(esp as { nome?: string | null } | null)?.nome ?? "esporte"}`}
                      />
                      <span className="line-clamp-1 text-center text-[8px] font-black uppercase tracking-[0.09em] text-eid-fg">
                        {(esp as { nome?: string | null } | null)?.nome ?? "—"}
                      </span>
                    </ProfileEditDrawerTrigger>
                  );
                })}
              </div>
            )}
          </div>
        </ProfileSection>
      </div>

      {ocultarSecaoEquipesParaVisitante ? null : (
        <div className="mt-2">
          {isSelf ? (
            <div className="relative z-10 mb-1 mt-0 flex justify-end">
              <ProfileEditDrawerTrigger
                href={`/editar/equipes?from=${encodeURIComponent(`/perfil/${id}`)}`}
                title="Editar equipes"
                topMode="backOnly"
                className="inline-flex items-center justify-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2.5 py-1 text-[8px] font-bold uppercase leading-none tracking-[0.08em] text-eid-text-secondary transition-all hover:border-eid-primary-500/35 hover:bg-eid-primary-500/10 hover:text-eid-fg"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5" aria-hidden>
                  <path d="M11.875 1.625a1.768 1.768 0 0 1 2.5 2.5l-7.54 7.54a1 1 0 0 1-.46.262l-3.018.805a.5.5 0 0 1-.612-.612l.805-3.018a1 1 0 0 1 .262-.46l7.54-7.54Zm1.793 1.207a.768.768 0 0 0-1.086 0l-.812.812 1.086 1.086.812-.812a.768.768 0 0 0 0-1.086ZM11.149 5.29 4.314 12.126l-1.02.272.272-1.02L10.4 4.544l.75.75Z" />
                </svg>
                GERENCIAR / EDITAR
              </ProfileEditDrawerTrigger>
            </div>
          ) : null}
          <ProfileSection
            title="Equipes"
            info="Duplas e times em que este perfil está cadastrado. Toque para abrir o perfil público de cada formação."
          >
            {(timesFormacoes ?? []).length > 0 || (duplasCadastro ?? []).length > 0 ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-2">
                <div className="grid grid-cols-2 gap-2">
                  {(timesFormacoes ?? []).map((t) => {
                    const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
                    const initials = (t.nome?.trim().slice(0, 2) || "EQ").toUpperCase();
                    const nomeCurto = (t.nome ?? "Formação").trim().split(/\s+/u)[0] || "Formação";
                    const papelEquipe = leaderTeamIds.has(Number(t.id)) ? "Líder" : "Membro";
                    return (
                      <Link
                        key={`t-${t.id}`}
                        href={`/perfil-time/${t.id}?from=/perfil/${id}`}
                        className="eid-list-item flex items-center gap-2 rounded-xl bg-eid-card/55 p-2 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-eid-primary-500/30"
                        aria-label={`Abrir perfil da equipe ${t.nome}`}
                      >
                        {t.escudo ? (
                          <img
                            src={t.escudo}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-full border border-[color:var(--eid-border-subtle)] object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="truncate text-[11px] font-bold text-eid-fg">{nomeCurto}</p>
                            <span
                              className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.05em] ${
                                papelEquipe === "Líder"
                                  ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                                  : "border-sky-500/35 bg-sky-500/10 text-sky-300"
                              }`}
                            >
                              {papelEquipe}
                            </span>
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 truncate text-[9px] text-eid-text-secondary">
                            <span className="inline-flex items-center gap-1 truncate">
                              <ModalidadeGlyphIcon
                                modalidade={String(t.tipo ?? "").trim().toLowerCase() === "time" ? "time" : "dupla"}
                              />
                              <span className="truncate">{(t.tipo ?? "time").toUpperCase()}</span>
                            </span>
                            <span aria-hidden className="text-[8px] text-eid-text-secondary/70">
                              |
                            </span>
                            <span className="inline-flex min-w-0 items-center gap-1 truncate">
                              <SportGlyphIcon sportName={esp?.nome} />
                              <span className="truncate">{esp?.nome ?? "Esporte"}</span>
                            </span>
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                  {(duplasCadastro ?? []).map((d) => {
                    const esp = Array.isArray(d.esportes) ? d.esportes[0] : d.esportes;
                    return (
                      <Link
                        key={`d-${d.id}`}
                        href={`/perfil-dupla/${d.id}?from=/perfil/${id}`}
                        className="eid-list-item flex items-center gap-2 rounded-xl bg-eid-card/55 p-2 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-eid-primary-500/30"
                        aria-label={`Abrir perfil da dupla ${d.id}`}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300">
                          D{d.id}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold text-eid-fg">Dupla</p>
                          <p className="mt-1 flex items-center gap-1.5 truncate text-[9px] text-eid-text-secondary">
                            <span className="inline-flex items-center gap-1 truncate">
                              <ModalidadeGlyphIcon modalidade="dupla" />
                              <span className="truncate">DUPLA</span>
                            </span>
                            <span aria-hidden className="text-[8px] text-eid-text-secondary/70">
                              |
                            </span>
                            <span className="inline-flex min-w-0 items-center gap-1 truncate">
                              <SportGlyphIcon sportName={esp?.nome} />
                              <span className="truncate">{esp?.nome ?? "Esporte"}</span>
                            </span>
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-2">
                <ProfileEditDrawerTrigger
                  href={`/editar/equipes/cadastrar?from=${encodeURIComponent(`/perfil/${id}`)}`}
                  title="Cadastrar equipe"
                  fullscreen
                  topMode="backOnly"
                  className="eid-list-item flex w-full min-h-[84px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-eid-primary-500/35 bg-eid-primary-500/[0.06] p-3 text-center transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-eid-primary-500/[0.1]"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-surface/65 text-eid-primary-300">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                      <path d="M10 2a.75.75 0 0 1 .75.75v6.5h6.5a.75.75 0 0 1 0 1.5h-6.5v6.5a.75.75 0 0 1-1.5 0v-6.5h-6.5a.75.75 0 0 1 0-1.5h6.5v-6.5A.75.75 0 0 1 10 2Z" />
                    </svg>
                  </span>
                  <p className="text-[11px] font-bold text-eid-fg">Nenhuma equipe cadastrada</p>
                  <p className="text-[9px] text-eid-text-secondary">Toque para cadastrar equipe</p>
                </ProfileEditDrawerTrigger>
              </div>
            )}
          </ProfileSection>
        </div>
      )}

      {(socioRows ?? []).length > 0 || (frequentesRows ?? []).length > 0 ? (
        <ProfileSection
          title="Locais"
          info="Espaços ou locais de jogo associados a este perfil (quando informados)."
        >
          {(socioRows ?? []).length > 0 ? (
            <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-2">
              <ul className="grid gap-1.5">
                {(socioRows ?? []).map((s, idx) => {
                  const esp = Array.isArray(s.espacos_genericos) ? s.espacos_genericos[0] : s.espacos_genericos;
                  return (
                    <li key={`${s.espaco_generico_id}-${idx}`}>
                      {canOpenLocais ? (
                        <Link
                          href={`/local/${esp?.id}?from=/perfil/${id}`}
                          className="flex items-center justify-between rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2 text-[11px] text-eid-fg transition hover:border-eid-primary-500/30"
                        >
                          <span className="font-medium">{esp?.nome_publico ?? "Local"}</span>
                          <span className="text-[10px] text-eid-text-secondary">{esp?.localizacao ?? "—"}</span>
                        </Link>
                      ) : (
                        <div className="flex items-center justify-between rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2 text-[11px] text-eid-fg">
                          <span className="font-medium">{esp?.nome_publico ?? "Local"}</span>
                          <span className="text-[10px] text-eid-text-secondary">{esp?.localizacao ?? "—"}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {(frequentesRows ?? []).length > 0 ? (
            <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35 p-2">
              <ul className="grid gap-1.5">
                {(frequentesRows ?? []).map((f, idx) => {
                  const esp = Array.isArray(f.espacos_genericos) ? f.espacos_genericos[0] : f.espacos_genericos;
                  return (
                    <li key={`${esp?.id}-${idx}`}>
                      {canOpenLocais ? (
                        <Link
                          href={`/local/${esp?.id}?from=/perfil/${id}`}
                          className="flex items-center justify-between rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2 text-[11px] transition hover:border-eid-primary-500/30"
                        >
                          <span className="font-medium text-eid-fg">{esp?.nome_publico ?? "Local"}</span>
                          <span className="font-bold text-eid-primary-300">{f.visitas ?? 0}×</span>
                        </Link>
                      ) : (
                        <div className="flex items-center justify-between rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2 text-[11px]">
                          <span className="font-medium text-eid-fg">{esp?.nome_publico ?? "Local"}</span>
                          <span className="font-bold text-eid-primary-300">{f.visitas ?? 0}×</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </ProfileSection>
      ) : null}

      <EidStreamSection fallback={<ProfilePublicHistoricoStreamSkeleton />}>
        <PerfilPublicoHistoricoSection profileId={id} viewerId={viewerId} perfil={perfil} isSelf={isSelf} />
      </EidStreamSection>
    </div>
  );
}
