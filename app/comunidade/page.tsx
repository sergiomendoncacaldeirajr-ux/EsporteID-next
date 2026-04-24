import Link from "next/link";
import { redirect } from "next/navigation";
import { FlowHeaderLink, FlowPageHeader } from "@/components/app/flow-page-header";
import {
  ComunidadeAulasSection,
  type ComunidadeProfessorProfileRow,
  type ComunidadeSolicitacaoAulaItem,
  type ComunidadeVinculoAulaItem,
} from "@/components/comunidade/comunidade-aulas-section";
import { ComunidadeNotificacoesSection, type NotifRow } from "@/components/comunidade/comunidade-notificacoes-section";
import { ComunidadeConvitesTime, type ConviteTimeItem } from "@/components/comunidade/comunidade-convites-time";
import { ComunidadePedidosMatch } from "@/components/comunidade/comunidade-pedidos-match";
import { ComunidadeSugestoesMatch, type SugestaoMatchItem } from "@/components/comunidade/comunidade-sugestoes-match";
import { PushToggleCard } from "@/components/pwa/push-toggle-card";
import { PwaQuickActions } from "@/components/pwa/pwa-quick-actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Social",
  description: "Pedidos, convites e novidades da sua rede no EsporteID",
};

export const unstable_instant = true;

export default async function ComunidadePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/comunidade");

  const { data: profile } = await supabase
    .from("profiles")
    .select("termos_aceitos_em, perfil_completo")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.termos_aceitos_em) redirect("/conta/aceitar-termos");
  if (!profile.perfil_completo) redirect("/onboarding");

  await supabase.rpc("auto_aprovar_resultados_pendentes", { p_only_user: user.id });

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

  const pedidosItems = (recebidos ?? []).map((m) => ({
    id: Number(m.id),
    desafianteNome: (m.usuario_id ? uMap.get(m.usuario_id)?.nome : null) ?? "Atleta",
    desafianteId: String(m.usuario_id ?? ""),
    esporte: (m.esporte_id ? espMap.get(m.esporte_id) : null) ?? "Esporte",
    modalidade: m.modalidade_confronto ?? "individual",
    timeNome: m.adversario_time_id ? timeMap.get(m.adversario_time_id) ?? null : null,
    finalidade: (String(m.finalidade ?? "ranking") === "amistoso" ? "amistoso" : "ranking") as "ranking" | "amistoso",
  }));

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

  return (
    <main className="mx-auto w-full max-w-lg px-3 py-3 sm:max-w-2xl sm:px-6 sm:py-4">
      <FlowPageHeader
        title="Comunidade"
        subtitle="Central de notificações, pedidos e convites para você agir rápido."
        stats={[
          { label: "não lida(s)", value: nNotifUnread, tone: "primary" },
          { label: "pedido(s) de match", value: nPedidos, tone: "action" },
          { label: "sugestão(ões)", value: nSugestoes, tone: "default" },
          { label: "convite(s) de equipe", value: conviteItems.length, tone: "primary" },
          { label: "item(ns) de aula", value: nAulas, tone: "default" },
        ]}
        actions={
          <>
            <FlowHeaderLink href="/agenda" label="Ir para Agenda" />
            <FlowHeaderLink href="/vagas" label="Abrir Vagas" tone="primary" />
            <PwaQuickActions />
          </>
        }
      />

        <div className="mt-5 space-y-6 md:mt-8 md:space-y-10">
          <PushToggleCard defaultEnabled />
          <ComunidadeNotificacoesSection items={(notificacoes ?? []) as NotifRow[]} />

          <ComunidadeAulasSection
            solicitacoes={(solicitacoes ?? []) as ComunidadeSolicitacaoAulaItem[]}
            vinculos={(vinculos ?? []) as ComunidadeVinculoAulaItem[]}
            professorMap={professorMap}
          />

          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Convites de equipe</h2>
            <p className="mt-1 hidden text-sm text-eid-text-secondary md:block">Aceite para entrar na dupla/time.</p>
            <ComunidadeConvitesTime items={conviteItems} />
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[color:color-mix(in_srgb,var(--eid-warning-400)_78%,var(--eid-fg)_22%)]">Sugestões de match (líder)</h2>
            <p className="mt-1 hidden text-sm text-eid-text-secondary md:block">
              Um atleta da equipe sugeriu um confronto; ao aprovar, o match é confirmado e todos os membros das duas
              formações são avisados.
            </p>
            <ComunidadeSugestoesMatch items={sugestoesItems} />
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Pedidos de match</h2>
            <p className="mt-1 hidden text-sm text-eid-text-secondary md:block">Aceite ou recuse com um toque.</p>
            <ComunidadePedidosMatch items={pedidosItems} />
          </section>

          <section className="eid-list-item rounded-2xl bg-eid-card/90 p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-text-secondary">Em breve</h2>
            <ul className="mt-3 space-y-2 text-sm text-eid-text-secondary">
              <li className="flex gap-2">
                <span className="text-eid-primary-500">◆</span>
                Confirmação de placar enviada pelo oponente (acompanhe também na Agenda)
              </li>
              <li className="flex gap-2">
                <span className="text-eid-primary-500">◆</span>
                Pedidos de vagas de time/dupla agora aparecem em Vagas
              </li>
            </ul>
          </section>

          <div className="flex flex-wrap gap-3 pb-8">
            <Link
              href="/times"
              className="eid-btn-soft rounded-2xl border-eid-primary-500/40 bg-eid-primary-500/10 px-5 py-2.5 text-xs font-bold"
            >
              Times
            </Link>
            <Link
              href="/vagas"
              className="eid-btn-soft rounded-2xl border-eid-primary-500/40 bg-eid-primary-500/10 px-5 py-2.5 text-xs font-bold"
            >
              Vagas
            </Link>
            <Link
              href="/torneios"
              className="eid-btn-soft rounded-2xl border-eid-primary-500/40 bg-eid-primary-500/10 px-5 py-2.5 text-xs font-bold"
            >
              Torneios
            </Link>
            <Link
              href="/agenda"
              className="eid-btn-ghost rounded-2xl px-5 py-2.5 text-xs font-bold text-eid-text-secondary hover:text-eid-fg"
            >
              Agenda
            </Link>
          </div>
        </div>
    </main>
  );
}
