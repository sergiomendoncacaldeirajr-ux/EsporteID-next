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

export default async function AgendaPage() {
  const { supabase, user } = await getServerAuth();
  if (!user) redirect("/login?next=/agenda");

  const [profile, { teamIds: agendaTeamIds, teamClause }] = await Promise.all([
    getCachedProfileLegalRow(user.id),
    getAgendaTeamContext(supabase, user.id),
  ]);
  if (!profile || !legalAcceptanceIsCurrent(profile)) redirect("/conta/aceitar-termos");
  if (!profile.perfil_completo) redirect("/onboarding");

  return (
    <main
      data-eid-agenda-page
      data-eid-touch-ui
      className="mx-auto w-full max-w-lg px-3 pt-0 pb-[calc(var(--eid-shell-footer-offset)+1rem)] sm:max-w-2xl sm:px-6 sm:pt-1 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]"
    >
      <AgendaBackgroundSync />
      <div className={`mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-4 py-4 sm:px-6 sm:py-5`}>
        <div className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_150px] sm:gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-eid-action-400 sm:text-[12px]">Agenda</p>
            <h1 className="mt-1 text-[17px] font-black leading-[1.12] tracking-tight text-eid-fg sm:text-[28px]">
              Sua agenda (referência)
            </h1>
            <p className="mt-2 max-w-[32ch] text-[10px] leading-relaxed text-eid-text-secondary sm:mt-3 sm:text-[18px]">
              Data e local combinados aqui; cancelamento, reagendamento e respostas ficam no{" "}
              <Link href="/comunidade#desafios-aceitos-gestao" className="font-bold text-eid-primary-300 hover:underline">
                Painel social
              </Link>
              .
            </p>
          </div>
          <div className="justify-self-end" aria-hidden>
            <svg viewBox="0 0 96 96" className="h-[78px] w-[78px] drop-shadow-[0_8px_12px_rgba(249,115,22,0.28)] sm:h-[130px] sm:w-[130px]">
              <rect x="10" y="14" width="76" height="72" rx="16" fill="#FF7A00" />
              <rect x="16" y="24" width="64" height="56" rx="12" fill="#FF8B20" />
              <rect x="22" y="36" width="52" height="38" rx="8" fill="#FFF7ED" />
              <rect x="28" y="8" width="8" height="18" rx="4" fill="#FF7A00" />
              <rect x="60" y="8" width="8" height="18" rx="4" fill="#FF7A00" />
              <path
                d="m35 55 11 11 16-20"
                fill="none"
                stroke="#FF7A00"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="eid-progressive-enter space-y-0">
        <EidStreamSection fallback={<AgendaStreamConfrontosSkeleton />}>
          <AgendaStreamConfrontos
            supabase={supabase}
            userId={user.id}
            teamClause={teamClause}
            agendaTeamIds={agendaTeamIds}
          />
        </EidStreamSection>
        <EidStreamSection fallback={<AgendaStreamRestSkeleton />}>
          <AgendaStreamRest supabase={supabase} userId={user.id} teamClause={teamClause} agendaTeamIds={agendaTeamIds} />
        </EidStreamSection>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-transparent bg-eid-card/55 px-3 py-3 text-center md:mt-10 md:px-4 md:py-3.5">
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
