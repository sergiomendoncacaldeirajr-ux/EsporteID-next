import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PartidaAgendaCard } from "@/components/agenda/partida-agenda-card";
import { userIsDesafioAgendaLeaderFromMap } from "@/lib/agenda/desafio-match-leadership";
import {
  type AgendaPartidaCardRow,
  computeAgendaPodeResponderProposta,
  firstOfRelation,
  mergeAgendaLocalDisplayed,
  resolveCancelMatchIdParaCard,
} from "@/lib/agenda/partidas-usuario";
import { pickFormacaoLadoPartida } from "@/lib/agenda/partida-formacao-lado";
import { dueloKey } from "@/app/comunidade/comunidade-shared";
import { getAgendaConfrontosPayload } from "./agenda-page-payload";

export type AgendaStreamConfrontosProps = {
  supabase: SupabaseClient;
  userId: string;
  teamClause: string;
  agendaTeamIds: number[];
};

export async function AgendaStreamConfrontos({ supabase, userId, teamClause, agendaTeamIds }: AgendaStreamConfrontosProps) {
  const p = await getAgendaConfrontosPayload(supabase, userId, teamClause, agendaTeamIds);
  if (p.partidasAgendadasVisiveis.length === 0) return null;

  return (
    <section className="mt-6 md:mt-10">
      <div className="overflow-hidden rounded-xl border border-transparent bg-eid-card/55">
        <div className="flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-3 py-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-primary-500">Confrontos</h2>
          <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-eid-primary-300">
            Agenda
          </span>
        </div>
        <p className="px-3 pt-2 text-[11px] text-eid-text-secondary md:text-xs">
          Ajuste <strong className="text-eid-fg">data e local</strong> aqui. Pedidos de cancelamento ou nova data:{" "}
          <Link href="/comunidade#desafios-aceitos-gestao" className="font-bold text-eid-primary-300 hover:underline">
            Painel social
          </Link>
          . Placar:{" "}
          <Link href="/comunidade#resultados-partida" className="font-bold text-eid-primary-300 hover:underline">
            Partidas e resultados
          </Link>
          .
        </p>
        <div className="mt-3 space-y-4 px-2.5 pb-2.5">
          {p.partidasAgendadasVisiveis.map((row) => {
              const esp = firstOfRelation(row.esportes);
              const pr = row as AgendaPartidaCardRow;
              const esporteIdCard = Number((row as { esporte_id?: number | null }).esporte_id ?? 0);
              const dueloKeyCard = dueloKey(pr.jogador1_id, pr.jogador2_id, esporteIdCard);
              const midPartida = Number(pr.match_id ?? 0);
              const acceptedSchedule =
                (Number.isFinite(midPartida) && midPartida > 0 ? p.acceptedScheduleByMatchId.get(midPartida) ?? null : null) ??
                (dueloKeyCard ? p.acceptedScheduleByDuelo.get(dueloKeyCard) ?? null : null);
              const effectiveDataRef = acceptedSchedule?.scheduledFor ?? pr.data_partida ?? pr.data_registro;
              const effectiveLocalLabel = mergeAgendaLocalDisplayed(
                acceptedSchedule?.scheduledLocation,
                pr.local_str,
                pr.local_espaco_id,
                pr.local_espaco_id ? p.locMap.get(pr.local_espaco_id) ?? null : null,
              );
              const hasScheduleDefined = Boolean((acceptedSchedule?.scheduledFor ?? pr.data_partida) && effectiveLocalLabel);
              const schedulePending = String(pr.status ?? "") === "aguardando_aceite_agendamento";
              const cancelMatchIdResolved = resolveCancelMatchIdParaCard(
                pr,
                p.cancelMatchIdByMatchId,
                p.cancelMatchIdByDuelo,
                dueloKeyCard,
              );
              const rescheduleAceito =
                (Number.isFinite(midPartida) && midPartida > 0 && p.rescheduleAcceptedMatchIdSet.has(midPartida)) ||
                (dueloKeyCard ? p.rescheduleAcceptedByDuelo.has(dueloKeyCard) : false);
              const podeGerenciarPartida = userIsDesafioAgendaLeaderFromMap(
                userId,
                {
                  usuario_id: pr.jogador1_id,
                  adversario_id: pr.jogador2_id,
                  desafiante_time_id: pr.time1_id ?? null,
                  adversario_time_id: pr.time2_id ?? null,
                  modalidade_confronto: pr.modalidade ?? null,
                },
                p.criadorPorTimeIdAgenda,
              );
              const scheduleCanRespond = computeAgendaPodeResponderProposta(pr, userId, p.criadorPorTimeIdAgenda);
              const somenteLeituraElenco = !podeGerenciarPartida;
              return (
                <PartidaAgendaCard
                  key={pr.id}
                  id={pr.id}
                  esporteNome={esp?.nome ?? "Esporte"}
                  j1Nome={pr.jogador1_id ? p.nomeMap.get(pr.jogador1_id) ?? null : null}
                  j2Nome={pr.jogador2_id ? p.nomeMap.get(pr.jogador2_id) ?? null : null}
                  j1Id={pr.jogador1_id}
                  j2Id={pr.jogador2_id}
                  j1AvatarUrl={pr.jogador1_id ? p.perfilMap.get(pr.jogador1_id)?.avatar_url ?? null : null}
                  j2AvatarUrl={pr.jogador2_id ? p.perfilMap.get(pr.jogador2_id)?.avatar_url ?? null : null}
                  j1NotaEid={pr.jogador1_id ? p.notaEidByUserSport.get(`${pr.jogador1_id}:${esporteIdCard}`) ?? 0 : 0}
                  j2NotaEid={pr.jogador2_id ? p.notaEidByUserSport.get(`${pr.jogador2_id}:${esporteIdCard}`) ?? 0 : 0}
                  formacaoJ1={pickFormacaoLadoPartida(pr, 1, p.agendaTimesCardById)}
                  formacaoJ2={pickFormacaoLadoPartida(pr, 2, p.agendaTimesCardById)}
                  esporteId={esporteIdCard}
                  dataRef={effectiveDataRef}
                  localLabel={effectiveLocalLabel}
                  variant="agendada"
                  ctaFullscreen
                  cancelMatchId={cancelMatchIdResolved}
                  ctaHidden={schedulePending || hasScheduleDefined || rescheduleAceito || somenteLeituraElenco}
                  desistMatchId={rescheduleAceito ? cancelMatchIdResolved : null}
                  agendamentoPendente={schedulePending}
                  agendamentoPodeResponder={scheduleCanRespond}
                  agendamentoDeadline={pr.agendamento_aceite_deadline ?? null}
                  somenteLeituraElenco={somenteLeituraElenco}
                  ocultarFluxoCancelamento
                />
              );
            })}
        </div>
      </div>
    </section>
  );
}
