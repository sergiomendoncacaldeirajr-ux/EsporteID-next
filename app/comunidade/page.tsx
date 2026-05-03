import { redirect } from "next/navigation";
import {
  ComunidadeStreamDesafioSkeleton,
  ComunidadeStreamEquipeSkeleton,
  ComunidadeStreamPartidasSkeleton,
} from "@/components/loading/comunidade-stream-skeletons";
import { ComunidadeBackgroundSync } from "@/components/comunidade/comunidade-background-sync";
import { PushToggleCard } from "@/components/pwa/push-toggle-card";
import { EidStreamSection } from "@/components/eid-stream-section";
import { getAgendaTeamContext, partidaRowTemResultadoParaRevisaoOponente } from "@/lib/agenda/partidas-usuario";
import { getCachedProfileLegalRow } from "@/lib/auth/profile-legal-cache";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { legalAcceptanceIsCurrent } from "@/lib/legal/acceptance";
import { ComunidadeStreamDesafio } from "./comunidade-stream-desafio";
import { ComunidadeStreamEquipe } from "./comunidade-stream-equipe";
import { ComunidadeStreamPartidas } from "./comunidade-stream-partidas";

export const metadata = {
  title: "Ações pendentes",
  description: "Central de ações pendentes no EsporteID: desafios, equipe e placar que precisam da sua resposta.",
};

export default async function ComunidadePage() {
  const { supabase, user } = await getServerAuth();
  if (!user) redirect("/login?next=/comunidade");

  const uidEq = user.id;
  const [
    gate,
    { data: profileExtra },
    { teamIds: comunidadeAgendaTeamIds, teamClause: comunidadeAgendaTeamClause },
    { data: meusTimesLider },
  ] = await Promise.all([
    getCachedProfileLegalRow(user.id),
    supabase.from("profiles").select("nome, avatar_url, localizacao, lat, lng").eq("id", user.id).maybeSingle(),
    getAgendaTeamContext(supabase, uidEq),
    supabase.from("times").select("id").eq("criador_id", uidEq),
  ]);
  if (!gate || !legalAcceptanceIsCurrent(gate)) redirect("/conta/aceitar-termos");
  if (!gate.perfil_completo) redirect("/onboarding");
  if (!profileExtra) redirect("/onboarding");
  const profile = { ...profileExtra, perfil_completo: gate.perfil_completo };
  const myLat = Number((profile as { lat?: number | null }).lat ?? NaN);
  const myLng = Number((profile as { lng?: number | null }).lng ?? NaN);
  const hasMyCoords = Number.isFinite(myLat) && Number.isFinite(myLng);

  const matchRankFlowOr =
    comunidadeAgendaTeamIds.length > 0
      ? `usuario_id.eq.${uidEq},adversario_id.eq.${uidEq},desafiante_time_id.in.(${comunidadeAgendaTeamIds.join(",")}),adversario_time_id.in.(${comunidadeAgendaTeamIds.join(",")})`
      : `usuario_id.eq.${uidEq},adversario_id.eq.${uidEq}`;
  const partidasPainelCountOr = `jogador1_id.eq.${uidEq},jogador2_id.eq.${uidEq},usuario_id.eq.${uidEq}${comunidadeAgendaTeamClause}`;
  const meusTimeIdsLider = [
    ...new Set(
      (meusTimesLider ?? [])
        .map((t) => Number((t as { id?: number | null }).id ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  let cntCandLider = 0;
  if (meusTimeIdsLider.length > 0) {
    const { count: candLiderCount } = await supabase
      .from("time_candidaturas")
      .select("id", { count: "exact", head: true })
      .in("time_id", meusTimeIdsLider.slice(0, 100))
      .eq("status", "pendente");
    cntCandLider = candLiderCount ?? 0;
  }

  const [
    { count: cntMatchIn },
    { count: cntMatchOut },
    { count: cntSugRec },
    { count: cntSugEnv },
    { count: cntConvRec },
    { count: cntConvEnv },
    { count: cntCandMine },
    { count: cntPartAguarda },
    { count: cntPartAgend },
    { count: cntPartRelaunchPosContestacao },
    { count: cntMatchRankFlow },
  ] = await Promise.all([
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("adversario_id", uidEq).eq("status", "Pendente"),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("usuario_id", uidEq).eq("status", "Pendente"),
    supabase.from("match_sugestoes").select("id", { count: "exact", head: true }).eq("alvo_dono_id", uidEq).eq("status", "pendente"),
    supabase
      .from("match_sugestoes")
      .select("id", { count: "exact", head: true })
      .eq("sugeridor_id", uidEq)
      .eq("status", "pendente")
      .neq("oculto_sugeridor", true),
    supabase.from("time_convites").select("id", { count: "exact", head: true }).eq("convidado_usuario_id", uidEq).eq("status", "pendente"),
    supabase.from("time_convites").select("id", { count: "exact", head: true }).eq("convidado_por_usuario_id", uidEq).eq("status", "pendente"),
    supabase.from("time_candidaturas").select("id", { count: "exact", head: true }).eq("candidato_usuario_id", uidEq).eq("status", "pendente"),
    (async () => {
      const { data: revisaoRows } = await supabase
        .from("partidas")
        .select("id,data_resultado,placar_1,placar_2")
        .or(partidasPainelCountOr)
        .eq("status", "aguardando_confirmacao")
        .neq("lancado_por", uidEq)
        .limit(120);
      return { count: (revisaoRows ?? []).filter(partidaRowTemResultadoParaRevisaoOponente).length };
    })(),
    supabase
      .from("partidas")
      .select("id", { count: "exact", head: true })
      .or(partidasPainelCountOr)
      .eq("status", "agendada"),
    supabase
      .from("partidas")
      .select("id", { count: "exact", head: true })
      .or(partidasPainelCountOr)
      .eq("status", "aguardando_confirmacao")
      .eq("lancado_por", uidEq)
      .eq("status_ranking", "resultado_contestado"),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(matchRankFlowOr)
      .eq("finalidade", "ranking")
      .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente"]),
  ]);

  const needEquipe =
    (cntSugRec ?? 0) > 0 ||
    (cntSugEnv ?? 0) > 0 ||
    (cntConvRec ?? 0) > 0 ||
    (cntConvEnv ?? 0) > 0 ||
    (cntCandLider ?? 0) > 0 ||
    (cntCandMine ?? 0) > 0;
  const needPlacarAguardando = (cntPartAguarda ?? 0) > 0;
  const needAgendadaLaunch = (cntPartAgend ?? 0) > 0 || (cntPartRelaunchPosContestacao ?? 0) > 0;
  const needMatchAceitosGestao = (cntMatchRankFlow ?? 0) > 0;
  const needPartidas = needPlacarAguardando || needAgendadaLaunch || needMatchAceitosGestao;
  const needDesafioPedidos = (cntMatchIn ?? 0) > 0 || (cntMatchOut ?? 0) > 0;

  const nadaPendentePelasContagens = !(needPartidas || needDesafioPedidos || needEquipe);
  const profileShell = {
    nome: profile.nome ?? null,
    avatar_url: profile.avatar_url ?? null,
    localizacao: profile.localizacao ?? null,
  };

  return (
    <main
      data-eid-comunidade-panel
      data-eid-touch-ui
      data-eid-touch-ui-compact="true"
      className="mx-auto w-full max-w-3xl px-2.5 py-3 pb-[calc(var(--eid-shell-footer-offset)+1rem)] sm:max-w-6xl sm:px-5 sm:py-4 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]"
    >
      <ComunidadeBackgroundSync />
      <div className="mb-3 md:mb-4">
        <PushToggleCard defaultEnabled />
      </div>

      <div className="space-y-3 md:space-y-5">
        {nadaPendentePelasContagens ? (
          <p className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 px-3 py-4 text-center text-sm text-eid-text-secondary">
            Nada pendente por aqui no momento.
          </p>
        ) : null}

        <div className="eid-progressive-enter space-y-3 md:space-y-5">
          {needPartidas ? (
            <EidStreamSection fallback={<ComunidadeStreamPartidasSkeleton />}>
              <ComunidadeStreamPartidas
                supabase={supabase}
                userId={user.id}
                comunidadeAgendaTeamIds={comunidadeAgendaTeamIds}
                comunidadeAgendaTeamClause={comunidadeAgendaTeamClause}
                needPlacarAguardando={needPlacarAguardando}
                needAgendadaLaunch={needAgendadaLaunch}
                needMatchAceitosGestao={needMatchAceitosGestao}
              />
            </EidStreamSection>
          ) : null}

          {needDesafioPedidos ? (
            <EidStreamSection fallback={<ComunidadeStreamDesafioSkeleton />}>
              <ComunidadeStreamDesafio supabase={supabase} viewerUserId={user.id} />
            </EidStreamSection>
          ) : null}

          {needEquipe ? (
            <EidStreamSection fallback={<ComunidadeStreamEquipeSkeleton />}>
              <ComunidadeStreamEquipe
                supabase={supabase}
                viewerUserId={user.id}
                profile={profileShell}
                hasMyCoords={hasMyCoords}
                myLat={myLat}
                myLng={myLng}
              />
            </EidStreamSection>
          ) : null}
        </div>
      </div>
    </main>
  );
}
