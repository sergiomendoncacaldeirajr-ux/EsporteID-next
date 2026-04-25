import Link from "next/link";
import { redirect } from "next/navigation";
import { FlowPageHeader } from "@/components/app/flow-page-header";
import { PartidaAgendaCard } from "@/components/agenda/partida-agenda-card";
import {
  type ComunidadeProfessorProfileRow,
} from "@/components/comunidade/comunidade-aulas-section";
import { ComunidadeConvitesTime, type ConviteTimeItem } from "@/components/comunidade/comunidade-convites-time";
import { ComunidadePedidosMatch } from "@/components/comunidade/comunidade-pedidos-match";
import { ComunidadeSugestoesMatch, type SugestaoMatchItem } from "@/components/comunidade/comunidade-sugestoes-match";
import { PushToggleCard } from "@/components/pwa/push-toggle-card";
import { fetchPedidoRankingPreview } from "@/lib/desafio/fetch-impact-preview";
import {
  type AgendaPartidaCardRow,
  fetchPartidasAgendadasUsuario,
  fetchPlacarAguardandoConfirmacao,
  firstOfRelation,
  getAgendaTeamContext,
} from "@/lib/agenda/partidas-usuario";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { getSystemFeatureConfig, SYSTEM_FEATURE_LABEL, type SystemFeatureKey } from "@/lib/system-features";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Painel de controle",
  description: "Painel de controle do EsporteID: acompanhe notificações, convites e pedidos com clareza.",
};

export default async function ComunidadePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/comunidade");

  const { data: profile } = await supabase
    .from("profiles")
    .select(`perfil_completo, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`)
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !legalAcceptanceIsCurrent(profile)) redirect("/conta/aceitar-termos");
  if (!profile.perfil_completo) redirect("/onboarding");

  await supabase.rpc("auto_aprovar_resultados_pendentes", { p_only_user: user.id });
  const featureCfg = await getSystemFeatureConfig(supabase);

  const { data: notificacoes } = await supabase
    .from("notificacoes")
    .select("id, mensagem, tipo, lida, criada_em, data_criacao")
    .eq("usuario_id", user.id)
    .order("id", { ascending: false })
    .limit(50);

  const { data: recebidos } = await supabase
    .from("matches")
    .select("id, modalidade_confronto, data_solicitacao, data_registro, usuario_id, esporte_id, adversario_time_id, finalidade")
    .eq("adversario_id", user.id)
    .eq("status", "Pendente")
    .order("data_registro", { ascending: false })
    .limit(30);

  const uids = [...new Set((recebidos ?? []).map((m) => m.usuario_id).filter(Boolean))] as string[];
  const { data: desafiantes } = uids.length
    ? await supabase.from("profiles").select("id, nome, avatar_url").in("id", uids)
    : { data: [] };
  const uMap = new Map((desafiantes ?? []).map((p) => [p.id, p]));

  const eids = [...new Set((recebidos ?? []).map((m) => m.esporte_id).filter(Boolean))] as number[];
  const { data: esportes } = eids.length
    ? await supabase.from("esportes").select("id, nome").in("id", eids)
    : { data: [] };
  const espMap = new Map((esportes ?? []).map((e) => [e.id, e.nome]));

  const timeIds = [...new Set((recebidos ?? []).map((m) => m.adversario_time_id).filter(Boolean))] as number[];
  const { data: timesRows } = timeIds.length
    ? await supabase.from("times").select("id, nome").in("id", timeIds)
    : { data: [] };
  const timeMap = new Map((timesRows ?? []).map((t) => [t.id, t.nome]));

  const pedidosItemsBase = (recebidos ?? []).map((m) => ({
    id: Number(m.id),
    desafianteNome: (m.usuario_id ? uMap.get(m.usuario_id)?.nome : null) ?? "Atleta",
    desafianteId: String(m.usuario_id ?? ""),
    esporte: (m.esporte_id ? espMap.get(m.esporte_id) : null) ?? "Esporte",
    esporteId: Number(m.esporte_id ?? 0),
    modalidade: m.modalidade_confronto ?? "individual",
    timeNome: m.adversario_time_id ? timeMap.get(m.adversario_time_id) ?? null : null,
    adversarioTimeId: m.adversario_time_id != null ? Number(m.adversario_time_id) : null,
    finalidade: (String(m.finalidade ?? "ranking") === "amistoso" ? "amistoso" : "ranking") as "ranking" | "amistoso",
  }));

  const pedidosItems = await Promise.all(
    pedidosItemsBase.map(async (m) => ({
      ...m,
      rankingPreview:
        m.finalidade === "ranking" && m.esporteId > 0
          ? await fetchPedidoRankingPreview(supabase, {
              accepterId: user.id,
              challengerId: m.desafianteId,
              esporteId: m.esporteId,
              modalidade: m.modalidade,
              adversarioTimeId: m.adversarioTimeId,
            })
          : null,
    }))
  );

  const nPedidos = pedidosItems.length;

  const { data: sugestoesRaw } = await supabase
    .from("match_sugestoes")
    .select("id, sugeridor_id, sugeridor_time_id, alvo_time_id, esporte_id, modalidade, mensagem")
    .eq("alvo_dono_id", user.id)
    .eq("status", "pendente")
    .order("id", { ascending: false })
    .limit(25);

  const sugSugIds = [...new Set((sugestoesRaw ?? []).map((s) => s.sugeridor_id).filter(Boolean))] as string[];
  const sugTimeIds = [
    ...new Set(
      (sugestoesRaw ?? []).flatMap((s) => [s.sugeridor_time_id, s.alvo_time_id].filter((x): x is number => x != null))
    ),
  ];
  const { data: sugPerfis } = sugSugIds.length
    ? await supabase.from("profiles").select("id, nome").in("id", sugSugIds)
    : { data: [] };
  const sugPerfilMap = new Map((sugPerfis ?? []).map((p) => [p.id, p.nome]));
  const { data: sugTimes } = sugTimeIds.length
    ? await supabase.from("times").select("id, nome").in("id", sugTimeIds)
    : { data: [] };
  const sugTimeMap = new Map((sugTimes ?? []).map((t) => [t.id, t.nome]));
  const sugEspIds = [...new Set((sugestoesRaw ?? []).map((s) => s.esporte_id).filter(Boolean))] as number[];
  const { data: sugEsportes } = sugEspIds.length
    ? await supabase.from("esportes").select("id, nome").in("id", sugEspIds)
    : { data: [] };
  const sugEspMap = new Map((sugEsportes ?? []).map((e) => [e.id, e.nome]));

  const sugestoesItems: SugestaoMatchItem[] = (sugestoesRaw ?? []).map((s) => ({
    id: Number(s.id),
    sugeridorNome: sugPerfilMap.get(s.sugeridor_id) ?? "Atleta",
    sugeridorId: String(s.sugeridor_id),
    meuTimeNome: sugTimeMap.get(s.sugeridor_time_id) ?? "Formação",
    alvoTimeNome: sugTimeMap.get(s.alvo_time_id) ?? "Formação",
    esporte: (s.esporte_id ? sugEspMap.get(s.esporte_id) : null) ?? "Esporte",
    modalidade: s.modalidade ?? "time",
    mensagem: s.mensagem ?? null,
  }));
  const nSugestoes = sugestoesItems.length;
  const { data: convites } = await supabase
    .from("time_convites")
    .select("id, time_id, convidado_por_usuario_id, times!inner(id, nome, tipo, esportes(nome))")
    .eq("convidado_usuario_id", user.id)
    .eq("status", "pendente")
    .order("id", { ascending: false })
    .limit(30);
  const inviterIds = [...new Set((convites ?? []).map((c) => c.convidado_por_usuario_id).filter(Boolean))] as string[];
  const { data: inviteUsers } = inviterIds.length
    ? await supabase.from("profiles").select("id, nome").in("id", inviterIds)
    : { data: [] };
  const inviteUserMap = new Map((inviteUsers ?? []).map((u) => [u.id, u.nome]));
  const conviteItems: ConviteTimeItem[] = (convites ?? []).map((c) => {
    const t = Array.isArray(c.times) ? c.times[0] : c.times;
    const esp = t?.esportes ? (Array.isArray(t.esportes) ? t.esportes[0] : t.esportes) : null;
    return {
      id: Number(c.id),
      equipeNome: t?.nome ?? "Equipe",
      equipeId: Number(t?.id ?? 0),
      equipeTipo: String(t?.tipo ?? "time"),
      esporteNome: esp?.nome ?? "Esporte",
      convidadoPor: inviteUserMap.get(c.convidado_por_usuario_id) ?? "Líder",
    };
  });
  const nNotifUnread = (notificacoes ?? []).filter((n) => n.lida !== true).length;
  const desafioNotifs = (notificacoes ?? []).filter((n) => {
    const tipo = String(n.tipo ?? "").toLowerCase();
    const msg = String(n.mensagem ?? "").toLowerCase();
    return tipo.includes("match") || tipo.includes("desafio") || msg.includes("desafio");
  });
  const equipeNotifs = (notificacoes ?? []).filter((n) => {
    const tipo = String(n.tipo ?? "").toLowerCase();
    return tipo.includes("time") || tipo.includes("convite");
  });

  const [{ data: solicitacoes }, { data: vinculos }] = await Promise.all([
    supabase
      .from("professor_solicitacoes_aula")
      .select(
        "id, professor_id, esporte_id, mensagem, status, criado_em, respondido_em, esportes(nome)"
      )
      .eq("aluno_id", user.id)
      .order("criado_em", { ascending: false }),
    supabase
      .from("professor_aula_alunos")
      .select(
        "id, aula_id, aluno_id, valor_centavos, status_inscricao, status_pagamento, taxa_cancelamento_centavos, motivo_cancelamento, professor_aulas!inner(id, professor_id, titulo, inicio, fim, status, esportes(nome))"
      )
      .eq("aluno_id", user.id)
      .order("id", { ascending: false }),
  ]);

  const professorIds = [
    ...new Set([
      ...(solicitacoes ?? []).map((item) => item.professor_id),
      ...(vinculos ?? []).map((item) => {
        const aula = Array.isArray(item.professor_aulas)
          ? item.professor_aulas[0]
          : item.professor_aulas;
        return aula?.professor_id ?? null;
      }),
    ].filter(Boolean)),
  ] as string[];

  const [{ data: professores }, { data: professorPerfis }] = professorIds.length
    ? await Promise.all([
        supabase.from("profiles").select("id, nome, whatsapp").in("id", professorIds),
        supabase
          .from("professor_perfil")
          .select("usuario_id, whatsapp_visibilidade, headline, politica_cancelamento_json")
          .in("usuario_id", professorIds),
      ])
    : [
        { data: [] as Array<{ id: string; nome: string | null; whatsapp: string | null }> },
        {
          data: [] as Array<{
            usuario_id: string;
            whatsapp_visibilidade: string | null;
            headline: string | null;
            politica_cancelamento_json: unknown;
          }>,
        },
      ];

  const professorMap = new Map<string, ComunidadeProfessorProfileRow>();
  const professorPerfilMap = new Map(
    (professorPerfis ?? []).map((item) => [item.usuario_id, item])
  );
  for (const item of professores ?? []) {
    const professorPerfil = professorPerfilMap.get(item.id);
    professorMap.set(item.id, {
      id: item.id,
      nome: item.nome ?? null,
      whatsapp: item.whatsapp ?? null,
      whatsapp_visibilidade: professorPerfil?.whatsapp_visibilidade ?? "publico",
      headline: professorPerfil?.headline ?? null,
      politica_cancelamento_json: professorPerfil?.politica_cancelamento_json ?? null,
    });
  }

  const nAulas = (solicitacoes?.length ?? 0) + (vinculos?.length ?? 0);
  const emBreveKeys: SystemFeatureKey[] = ["marketplace", "locais", "torneios", "professores", "organizador_torneios"];
  const emBreveItems = emBreveKeys
    .map((key) => ({
      key,
      label: SYSTEM_FEATURE_LABEL[key],
      mode: featureCfg[key].mode,
    }))
    .filter((item) => item.mode !== "ativo");

  function modeLabel(mode: string) {
    if (mode === "em_breve") return "Em breve";
    if (mode === "teste") return "Em teste";
    return "Em desenvolvimento";
  }

  const { teamClause: teamClausePainel } = await getAgendaTeamContext(supabase, user.id);
  const [{ data: painelAgendadas }, { data: painelPlacarPendente }] = await Promise.all([
    fetchPartidasAgendadasUsuario(supabase, user.id, teamClausePainel),
    fetchPlacarAguardandoConfirmacao(supabase, user.id, teamClausePainel),
  ]);
  const painelPartidasAll = [...(painelAgendadas ?? []), ...(painelPlacarPendente ?? [])];
  const painelLocalIds = [
    ...new Set(
      painelPartidasAll.map((p) => p.local_espaco_id).filter((x): x is number => typeof x === "number" && x > 0)
    ),
  ];
  const { data: painelLocaisRows } = painelLocalIds.length
    ? await supabase.from("espacos_genericos").select("id, nome_publico").in("id", painelLocalIds)
    : { data: [] };
  const painelLocMap = new Map((painelLocaisRows ?? []).map((l) => [l.id, l.nome_publico]));
  const painelPlayerIds = new Set<string>();
  for (const p of painelPartidasAll) {
    if (p.jogador1_id) painelPlayerIds.add(p.jogador1_id);
    if (p.jogador2_id) painelPlayerIds.add(p.jogador2_id);
  }
  const painelPlayerList = [...painelPlayerIds];
  const { data: painelNomeRows } = painelPlayerList.length
    ? await supabase.from("profiles").select("id, nome").in("id", painelPlayerList)
    : { data: [] };
  const painelNomeMap = new Map((painelNomeRows ?? []).map((r) => [r.id, r.nome]));

  function localLabelPainel(p: AgendaPartidaCardRow) {
    if (p.local_str?.trim()) return p.local_str.trim();
    if (p.local_espaco_id) return painelLocMap.get(p.local_espaco_id) ?? null;
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-lg px-3 py-3 pb-[calc(var(--eid-shell-footer-offset)+1rem)] sm:max-w-2xl sm:px-6 sm:py-4 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]">
      <FlowPageHeader
        title="Painel de controle"
        subtitle="Acompanhe sua rede em um só lugar: notificações, convites e pedidos organizados para você decidir e agir com rapidez."
        stats={[
          { label: "não lida(s)", value: nNotifUnread, tone: "primary" },
          { label: "pedido(s) de desafio", value: nPedidos, tone: "action" },
          { label: "sugestão(ões)", value: nSugestoes, tone: "default" },
          { label: "convite(s) de equipe", value: conviteItems.length, tone: "primary" },
          { label: "item(ns) de aula", value: nAulas, tone: "default" },
        ]}
      />

        <div className="mt-5 space-y-6 md:mt-8 md:space-y-10">
          <PushToggleCard defaultEnabled />

          <section id="resultados-partida" className="eid-list-item rounded-2xl bg-eid-card/90 p-4 md:p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-action-500">Partidas e resultados</h2>
            <p className="mt-1 hidden text-sm text-eid-text-secondary md:block">
              Lançamento de placar, revisão e confirmação. Na{" "}
              <Link href="/agenda" className="font-semibold text-eid-primary-300 hover:underline">
                Agenda
              </Link>{" "}
              você combina <strong className="text-eid-fg">data e local</strong>.
            </p>

            <div className="mt-4 space-y-6">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-eid-action-400">Placar aguardando você</h3>
                {(painelPlacarPendente ?? []).length === 0 ? (
                  <p className="eid-list-item mt-3 rounded-2xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-card/50 p-4 text-center text-sm text-eid-text-secondary">
                    Nenhum placar pendente de confirmação.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {(painelPlacarPendente ?? []).map((row) => {
                      const esp = firstOfRelation(row.esportes);
                      const pr = row as AgendaPartidaCardRow;
                      return (
                        <PartidaAgendaCard
                          key={pr.id}
                          id={pr.id}
                          esporteNome={esp?.nome ?? "Esporte"}
                          j1Nome={pr.jogador1_id ? painelNomeMap.get(pr.jogador1_id) ?? null : null}
                          j2Nome={pr.jogador2_id ? painelNomeMap.get(pr.jogador2_id) ?? null : null}
                          dataRef={pr.data_partida ?? pr.data_registro}
                          localLabel={localLabelPainel(pr)}
                          variant="placar"
                          href={`/registrar-placar/${pr.id}?from=/comunidade`}
                          ctaLabel="Revisar resultado"
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-eid-primary-400">Lançar resultado</h3>
                <p className="mt-1 text-xs text-eid-text-secondary">
                  Partidas agendadas em que você pode enviar o placar após o jogo.
                </p>
                {(painelAgendadas ?? []).length === 0 ? (
                  <p className="eid-list-item mt-3 rounded-2xl bg-eid-card/60 p-4 text-center text-sm text-eid-text-secondary">
                    Nenhuma partida agendada para lançar resultado.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {(painelAgendadas ?? []).map((row) => {
                      const esp = firstOfRelation(row.esportes);
                      const pr = row as AgendaPartidaCardRow;
                      return (
                        <PartidaAgendaCard
                          key={pr.id}
                          id={pr.id}
                          esporteNome={esp?.nome ?? "Esporte"}
                          j1Nome={pr.jogador1_id ? painelNomeMap.get(pr.jogador1_id) ?? null : null}
                          j2Nome={pr.jogador2_id ? painelNomeMap.get(pr.jogador2_id) ?? null : null}
                          dataRef={pr.data_partida ?? pr.data_registro}
                          localLabel={localLabelPainel(pr)}
                          variant="agendada"
                          href={`/registrar-placar/${pr.id}?from=/comunidade`}
                          ctaLabel="Lançar resultado"
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="eid-list-item rounded-2xl bg-eid-card/90 p-4 md:p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Desafio</h2>
            <p className="mt-1 hidden text-sm text-eid-text-secondary md:block">
              Central de desafios: pedidos recebidos e notificações do fluxo de desafio.
            </p>
            <div className="mt-3 space-y-4">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-eid-primary-400">
                  Pedidos recebidos
                </h3>
                <ComunidadePedidosMatch items={pedidosItems} />
              </div>
              <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-eid-action-300">
                  Notificações de desafio
                </h3>
                {desafioNotifs.length === 0 ? (
                  <p className="mt-2 text-xs text-eid-text-secondary">Sem notificações de desafio no momento.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {desafioNotifs.slice(0, 6).map((n) => (
                      <li key={n.id} className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                        <p className={`text-xs leading-relaxed ${n.lida ? "text-eid-text-secondary" : "text-eid-fg"}`}>{n.mensagem}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="eid-list-item rounded-2xl bg-eid-card/90 p-4 md:p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Equipe</h2>
            <p className="mt-1 hidden text-sm text-eid-text-secondary md:block">
              Convites, sugestões de liderança e avisos da sua dupla/time em um único quadro.
            </p>
            <div className="mt-3 space-y-4">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:color-mix(in_srgb,var(--eid-warning-400)_78%,var(--eid-fg)_22%)]">
                  Sugestões da equipe (liderança)
                </h3>
                <ComunidadeSugestoesMatch items={sugestoesItems} />
              </div>
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-eid-primary-300">
                  Convites recebidos
                </h3>
                <ComunidadeConvitesTime items={conviteItems} />
              </div>
              <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-eid-action-300">
                  Avisos de equipe
                </h3>
                {equipeNotifs.length === 0 ? (
                  <p className="mt-2 text-xs text-eid-text-secondary">Sem avisos de equipe no momento.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {equipeNotifs.slice(0, 5).map((n) => (
                      <li key={n.id} className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                        <p className={`text-xs leading-relaxed ${n.lida ? "text-eid-text-secondary" : "text-eid-fg"}`}>{n.mensagem}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="eid-list-item rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-4 opacity-80 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-text-secondary">Minhas aulas</h2>
              <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">
                Em desenvolvimento
              </span>
            </div>
            <p className="mt-2 text-sm text-eid-text-secondary">
              Este quadro está em preparação e ficará disponível em breve.
            </p>
            <div className="mt-3 space-y-2 pointer-events-none select-none">
              <div className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2 text-xs text-eid-text-secondary">
                Pedidos de aula
              </div>
              <div className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2 text-xs text-eid-text-secondary">
                Aulas confirmadas e em andamento
              </div>
              <div className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/35 px-3 py-2 text-xs text-eid-text-secondary">
                Avisos das suas aulas
              </div>
            </div>
          </section>

          <section className="eid-list-item rounded-2xl bg-eid-card/90 p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-text-secondary">Status dos módulos do app</h2>
            {emBreveItems.length === 0 ? (
              <p className="mt-3 text-sm text-eid-text-secondary">
                Tudo que é controlado pelo painel de funcionalidades está liberado para você no momento.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-eid-text-secondary">
                {emBreveItems.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2"
                  >
                    <span className="text-eid-fg">{item.label}</span>
                    <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">
                      {modeLabel(item.mode)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>
    </main>
  );
}
