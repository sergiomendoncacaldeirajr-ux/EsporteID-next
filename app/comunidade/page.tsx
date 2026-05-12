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

type ComunidadePendingSectionsProps = {
  supabase: Awaited<ReturnType<typeof getServerAuth>>["supabase"];
  userId: string;
};

export default async function ComunidadePage() {
  const { supabase, user } = await getServerAuth();
  if (!user) redirect("/login?next=/comunidade");

  const gate = await getCachedProfileLegalRow(user.id);
  if (!gate || !legalAcceptanceIsCurrent(gate)) redirect("/conta/aceitar-termos");
  if (!gate.perfil_completo) redirect("/onboarding");

  return (
    <main
      data-eid-comunidade-panel
      data-eid-touch-ui
      data-eid-touch-ui-compact="true"
      className="mx-auto w-full max-w-3xl px-2.5 py-3 pb-[var(--eid-shell-content-bottom-pad)] sm:max-w-6xl sm:px-5 sm:py-4 sm:pb-[var(--eid-shell-content-bottom-pad)]"
    >
      <ComunidadeBackgroundSync />

      <div className="relative mb-3 overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.055)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_98%,var(--eid-primary-500)_2%),color-mix(in_srgb,var(--eid-surface)_96%,var(--eid-primary-900)_4%))] px-4 py-3.5 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.5),0_0_0_1px_rgba(37,99,235,0.07),inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-5 sm:py-4 md:mb-4">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-eid-primary-500/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-6 left-4 h-24 w-24 rounded-full bg-eid-action-500/8 blur-3xl" aria-hidden />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-eid-primary-400 sm:text-[11px]">Painel social</p>
            <h1 className="mt-0.5 text-[16px] font-black leading-tight tracking-tight text-eid-fg sm:text-[22px]">Ações pendentes</h1>
            <p className="mt-1.5 max-w-[44ch] text-[9px] leading-relaxed text-eid-text-secondary sm:text-[11px]">
              Desafios recebidos, equipe e placares que precisam da sua resposta.
            </p>
          </div>
          <div className="shrink-0" aria-hidden>
            <svg viewBox="0 0 72 72" className="h-[52px] w-[52px] drop-shadow-[0_6px_12px_rgba(37,99,235,0.3)] sm:h-[64px] sm:w-[64px]">
              <circle cx="36" cy="36" r="32" fill="url(#com-grad)" />
              <defs>
                <linearGradient id="com-grad" x1="4" y1="4" x2="68" y2="68" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3B82F6" />
                  <stop offset="1" stopColor="#1D4ED8" />
                </linearGradient>
              </defs>
              <path d="M22 28h28M22 36h20M22 44h16" stroke="rgba(255,255,255,0.9)" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="52" cy="44" r="9" fill="#F97316" />
              <path d="M49 44h6M52 41v6" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mb-3 md:mb-4">
        <PushToggleCard defaultEnabled />
      </div>

      <EidStreamSection
        className="space-y-3 md:space-y-5"
        fallback={
          <div className="eid-progressive-enter space-y-3 md:space-y-5">
            <ComunidadeStreamPartidasSkeleton />
            <ComunidadeStreamDesafioSkeleton />
            <ComunidadeStreamEquipeSkeleton />
          </div>
        }
      >
        <ComunidadePendingSections supabase={supabase} userId={user.id} />
      </EidStreamSection>
    </main>
  );
}

async function ComunidadePendingSections({ supabase, userId }: ComunidadePendingSectionsProps) {
  const uidEq = userId;
  const [{ data: profileExtra }, { teamIds: comunidadeAgendaTeamIds, teamClause: comunidadeAgendaTeamClause, ownedTeamIds: meusTimeIdsLider }] =
    await Promise.all([
      supabase.from("profiles").select("nome, avatar_url, localizacao, lat, lng").eq("id", userId).maybeSingle(),
      getAgendaTeamContext(supabase, uidEq),
    ]);
  if (!profileExtra) redirect("/onboarding");
  const profile = { ...profileExtra, perfil_completo: true };
  const myLat = Number((profile as { lat?: number | null }).lat ?? NaN);
  const myLng = Number((profile as { lng?: number | null }).lng ?? NaN);
  const hasMyCoords = Number.isFinite(myLat) && Number.isFinite(myLng);

  const matchRankFlowOr =
    comunidadeAgendaTeamIds.length > 0
      ? `usuario_id.eq.${uidEq},adversario_id.eq.${uidEq},desafiante_time_id.in.(${comunidadeAgendaTeamIds.join(",")}),adversario_time_id.in.(${comunidadeAgendaTeamIds.join(",")})`
      : `usuario_id.eq.${uidEq},adversario_id.eq.${uidEq}`;
  const partidasPainelCountOr = `jogador1_id.eq.${uidEq},jogador2_id.eq.${uidEq},usuario_id.eq.${uidEq}${comunidadeAgendaTeamClause}`;
  const cntCandLiderPromise =
    meusTimeIdsLider.length > 0
      ? supabase
          .from("time_candidaturas")
          .select("id", { count: "exact", head: true })
          .in("time_id", meusTimeIdsLider.slice(0, 100))
          .eq("status", "pendente")
          .then(({ count }) => count ?? 0)
      : Promise.resolve(0);

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
    cntCandLider,
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
    cntCandLiderPromise,
  ]);

  const needEquipe =
    (cntSugRec ?? 0) > 0 ||
    (cntSugEnv ?? 0) > 0 ||
    (cntConvRec ?? 0) > 0 ||
    (cntConvEnv ?? 0) > 0 ||
    cntCandLider > 0 ||
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
      <div className="space-y-3 md:space-y-5">
        {nadaPendentePelasContagens ? (
          <div className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_96%,var(--eid-primary-700)_4%),color-mix(in_srgb,var(--eid-surface)_98%,transparent))] px-4 py-6 text-center shadow-[0_8px_28px_-16px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-sm text-eid-text-secondary">Nada pendente por aqui no momento.</p>
          </div>
        ) : null}

        <div className="eid-progressive-enter space-y-3 md:space-y-5">
          {needPartidas ? (
            <EidStreamSection fallback={<ComunidadeStreamPartidasSkeleton />}>
              <ComunidadeStreamPartidas
                supabase={supabase}
                userId={userId}
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
              <ComunidadeStreamDesafio supabase={supabase} viewerUserId={userId} />
            </EidStreamSection>
          ) : null}

          {needEquipe ? (
            <EidStreamSection fallback={<ComunidadeStreamEquipeSkeleton />}>
              <ComunidadeStreamEquipe
                supabase={supabase}
                viewerUserId={userId}
                profile={profileShell}
                hasMyCoords={hasMyCoords}
                myLat={myLat}
                myLng={myLng}
              />
            </EidStreamSection>
          ) : null}
        </div>
      </div>
  );
}
