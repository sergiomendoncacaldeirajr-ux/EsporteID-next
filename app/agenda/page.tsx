import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AgendaStreamConfrontosSkeleton,
  AgendaStreamRestSkeleton,
} from "@/components/loading/agenda-stream-skeletons";
import { AgendaBackgroundSync } from "@/components/agenda/agenda-background-sync";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { EidStreamSection } from "@/components/eid-stream-section";
import { getAgendaTeamContext } from "@/lib/agenda/partidas-usuario";
import { getCachedProfileLegalRow } from "@/lib/auth/profile-legal-cache";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { legalAcceptanceIsCurrent } from "@/lib/legal/acceptance";
import { AgendaStreamConfrontos } from "./agenda-stream-confrontos";
import { AgendaStreamRest } from "./agenda-stream-rest";

export const metadata = {
  title: "Agenda",
  description: "Jogos agendados e lembretes no EsporteID",
};

type AgendaStreamContentProps = {
  supabase: Awaited<ReturnType<typeof getServerAuth>>["supabase"];
  userId: string;
};

export default async function AgendaPage() {
  const { supabase, user } = await getServerAuth();
  if (!user) redirect("/login?next=/agenda");

  const profile = await getCachedProfileLegalRow(user.id);
  if (!profile || !legalAcceptanceIsCurrent(profile)) redirect("/conta/aceitar-termos");
  if (!profile.perfil_completo) redirect("/onboarding");

  return (
    <main
      data-eid-agenda-page
      data-eid-touch-ui
      className="mx-auto w-full max-w-lg px-3 pt-0 pb-[var(--eid-shell-content-bottom-pad)] sm:max-w-2xl sm:px-6 sm:pt-1 sm:pb-[var(--eid-shell-content-bottom-pad)]"
    >
      <AgendaBackgroundSync />
      <div className={`mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-4 py-4 sm:px-6 sm:py-5`}>
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-eid-action-500/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-6 left-4 h-24 w-24 rounded-full bg-eid-primary-500/12 blur-3xl"
          aria-hidden
        />
        <div className="relative grid grid-cols-[minmax(0,1fr)_88px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_150px] sm:gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-eid-action-400 sm:text-[12px]">Agenda</p>
            <h1 className="mt-1 text-[17px] font-black leading-[1.12] tracking-tight text-eid-fg sm:text-[28px]">
              Sua agenda
            </h1>
            <p className="mt-2 max-w-[32ch] text-[10px] leading-relaxed text-eid-text-secondary sm:mt-3 sm:text-[12px]">
              Data e local combinados aqui; cancelamento, reagendamento e respostas ficam no{" "}
              <Link href="/comunidade#desafios-aceitos-gestao" className="font-bold text-eid-primary-300 underline-offset-2 hover:underline">
                Painel social
              </Link>
              .
            </p>
          </div>
          <div className="justify-self-end" aria-hidden>
            <svg viewBox="0 0 96 96" className="h-[78px] w-[78px] drop-shadow-[0_8px_18px_rgba(249,115,22,0.35)] sm:h-[120px] sm:w-[120px]">
              <rect x="10" y="14" width="76" height="72" rx="16" fill="url(#ag-grad1)" />
              <defs>
                <linearGradient id="ag-grad1" x1="10" y1="14" x2="86" y2="86" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FB923C" />
                  <stop offset="1" stopColor="#EA580C" />
                </linearGradient>
              </defs>
              <rect x="16" y="24" width="64" height="56" rx="12" fill="rgba(255,150,60,0.85)" />
              <rect x="22" y="36" width="52" height="38" rx="8" fill="rgba(255,247,237,0.95)" />
              <rect x="28" y="8" width="8" height="18" rx="4" fill="#EA580C" />
              <rect x="60" y="8" width="8" height="18" rx="4" fill="#EA580C" />
              <path
                d="m35 55 11 11 16-20"
                fill="none"
                stroke="#EA580C"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="eid-progressive-enter space-y-0">
        <EidStreamSection
          fallback={
            <>
              <AgendaStreamConfrontosSkeleton />
              <AgendaStreamRestSkeleton />
            </>
          }
        >
          <AgendaStreamContent supabase={supabase} userId={user.id} />
        </EidStreamSection>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.045)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--eid-card)_90%,transparent),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:mt-10 md:px-4 md:py-3.5">
        <p className="text-[11px] leading-relaxed text-eid-text-secondary md:text-xs">
          Pedidos recebidos para aceitar estão no{" "}
          <Link href="/comunidade" className="font-bold text-eid-primary-300 hover:underline">
            Painel de controle
          </Link>
          . Resultados e placares:{" "}
          <Link href="/comunidade#resultados-partida" className="font-bold text-eid-primary-300 hover:underline">
            Partidas e resultados
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

async function AgendaStreamContent({ supabase, userId }: AgendaStreamContentProps) {
  const { teamIds: agendaTeamIds, teamClause } = await getAgendaTeamContext(supabase, userId);

  return (
    <>
      <EidStreamSection fallback={<AgendaStreamConfrontosSkeleton />}>
        <AgendaStreamConfrontos
          supabase={supabase}
          userId={userId}
          teamClause={teamClause}
          agendaTeamIds={agendaTeamIds}
        />
      </EidStreamSection>
      <EidStreamSection fallback={<AgendaStreamRestSkeleton />}>
        <AgendaStreamRest supabase={supabase} userId={userId} teamClause={teamClause} agendaTeamIds={agendaTeamIds} />
      </EidStreamSection>
    </>
  );
}
