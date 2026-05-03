import Image from "next/image";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AgendaAceitosCancelaveis } from "@/components/agenda/agenda-aceitos-cancelaveis";
import { AgendaPendenteFormacaoAvatar } from "@/components/agenda/agenda-pendente-formacao-avatar";
import { ProfileEidPerformanceSeal } from "@/components/perfil/profile-eid-performance-seal";
import { EidCityState } from "@/components/ui/eid-city-state";
import { EidPendingBadge } from "@/components/ui/eid-pending-badge";
import { ModalidadeGlyphIcon, SportGlyphIcon } from "@/lib/perfil/formacao-glyphs";
import { getAgendaRestPayload } from "./agenda-page-payload";

export type AgendaStreamRestProps = {
  supabase: SupabaseClient;
  userId: string;
  teamClause: string;
  agendaTeamIds: number[];
};

export async function AgendaStreamRest({ supabase, userId, teamClause, agendaTeamIds }: AgendaStreamRestProps) {
  const p = await getAgendaRestPayload(supabase, userId, teamClause, agendaTeamIds);

  const hasRanking = p.pendentesRankingStatus.length > 0;
  const hasAceitos = p.aceitosItems.length > 0;
  const hasPedidosEnvio = (p.pendentesEnvio ?? []).length > 0;

  if (!hasRanking && !hasAceitos && !hasPedidosEnvio) return null;

  return (
    <>
      {hasRanking || hasAceitos ? (
        <section id="agenda-status-ranking" className="scroll-mt-4 mt-6 space-y-6 md:scroll-mt-6 md:mt-10">
          {hasRanking ? (
            <div className="overflow-hidden rounded-xl border border-transparent bg-eid-card/55">
              <div className="flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-3 py-2">
                <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-text-secondary">
                  Pedidos de ranking em análise
                </h2>
                <EidPendingBadge label="Pendente" />
              </div>
              <p className="px-3 pt-2 text-[11px] text-eid-text-secondary md:text-xs">
                Status para o elenco: o capitão adversário responde no{" "}
                <Link href="/comunidade#desafio-pedidos" className="font-bold text-eid-primary-300 hover:underline">
                  Painel social
                </Link>
                . Sem data/local até o pedido ser aceito.
              </p>
              <ul className="m-3 space-y-2">
                {p.pendentesRankingStatus.map((m) => {
                  const tid1 = Number(m.desafiante_time_id ?? 0);
                  const tid2 = Number(m.adversario_time_id ?? 0);
                  const row1 = Number.isFinite(tid1) && tid1 > 0 ? p.timeRowById.get(tid1) ?? null : null;
                  const row2 = Number.isFinite(tid2) && tid2 > 0 ? p.timeRowById.get(tid2) ?? null : null;
                  const nome1 = row1?.nome ?? "Formação";
                  const nome2 = row2?.nome ?? "Formação";
                  const espNome = m.esporte_id ? p.espMap.get(Number(m.esporte_id)) ?? "Esporte" : "Esporte";
                  const capitaoRecebedor = m.adversario_id === userId;
                  const noTimeDesafiado =
                    Number.isFinite(tid2) && tid2 > 0 && agendaTeamIds.includes(tid2) && !capitaoRecebedor;
                  const sublinha = capitaoRecebedor
                    ? "Você é o capitão desta formação — aceite ou recuse no Painel social."
                    : noTimeDesafiado
                      ? "Seu capitão deve aceitar ou recusar este pedido no Painel social."
                      : "Aguardando o capitão adversário aceitar ou recusar.";
                  const mod =
                    String(m.modalidade_confronto ?? "time").trim().toLowerCase() === "dupla" ? "dupla" : "time";
                  return (
                    <li
                      key={m.id}
                      className="flex flex-col gap-2.5 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-3 py-3 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.18)] backdrop-blur-sm md:gap-3 md:px-4 md:py-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 pr-1">
                          <p className="text-[11px] text-eid-text-secondary md:text-xs">
                            <span className="inline-flex items-center gap-1">
                              <SportGlyphIcon sportName={espNome} />
                              <span>{espNome}</span>
                            </span>
                            <span className="mx-1 opacity-70">|</span>
                            <span className="inline-flex items-center gap-1">
                              <ModalidadeGlyphIcon modalidade={mod} />
                              <span>{m.modalidade_confronto ?? "time"}</span>
                            </span>
                          </p>
                          <p className="mt-2 text-[11px] leading-relaxed text-eid-text-secondary md:text-xs">{sublinha}</p>
                          {capitaoRecebedor ? (
                            <p className="mt-2">
                              <Link
                                href="/comunidade#desafio-pedidos"
                                className="text-[11px] font-bold text-eid-primary-300 hover:underline md:text-xs"
                              >
                                Abrir pedidos recebidos
                              </Link>
                            </p>
                          ) : null}
                        </div>
                        <EidPendingBadge label="Pendente" compact className="shrink-0 self-start" />
                      </div>

                      <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-2 gap-y-2 border-t border-[color:var(--eid-border-subtle)]/45 pt-3">
                        <p
                          className="col-start-1 row-start-1 line-clamp-2 min-h-[2.25rem] text-center text-[11px] font-bold leading-snug text-eid-fg md:min-h-[2.5rem] md:text-xs"
                          title={nome1}
                        >
                          {nome1}
                        </p>
                        <p
                          className="col-start-3 row-start-1 line-clamp-2 min-h-[2.25rem] text-center text-[11px] font-bold leading-snug text-eid-fg md:min-h-[2.5rem] md:text-xs"
                          title={nome2}
                        >
                          {nome2}
                        </p>
                        <span
                          className="col-start-2 row-span-2 row-start-1 self-center px-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-eid-text-secondary"
                          aria-hidden
                        >
                          vs
                        </span>
                        <div className="col-start-1 row-start-2 flex justify-center">
                          {Number.isFinite(tid1) && tid1 > 0 ? (
                            <AgendaPendenteFormacaoAvatar
                              timeId={tid1}
                              nome={nome1}
                              escudoUrl={row1?.escudo ?? null}
                              eidTime={row1?.eid_time ?? 0}
                              fromPath="/agenda"
                            />
                          ) : null}
                        </div>
                        <div className="col-start-3 row-start-2 flex justify-center">
                          {Number.isFinite(tid2) && tid2 > 0 ? (
                            <AgendaPendenteFormacaoAvatar
                              timeId={tid2}
                              nome={nome2}
                              escudoUrl={row2?.escudo ?? null}
                              eidTime={row2?.eid_time ?? 0}
                              fromPath="/agenda"
                            />
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {hasAceitos ? (
            <AgendaAceitosCancelaveis items={p.aceitosItems} somenteInformativo cadastrarLocalReturnBase="/comunidade" />
          ) : null}
        </section>
      ) : null}

      {hasPedidosEnvio ? (
        <section className="mt-6 md:mt-10">
          <div className="overflow-hidden rounded-xl border border-transparent bg-eid-card/55">
            <div className="flex items-center justify-between border-b border-transparent bg-eid-surface/45 px-3 py-2">
              <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-text-secondary">Pedidos que você enviou</h2>
              <EidPendingBadge label="Pendentes" />
            </div>
            <ul className="m-3 space-y-2">
              {(p.pendentesEnvio ?? []).map((m) => {
                const adv = m.adversario_id ? p.advMap.get(m.adversario_id) : null;
                const esp = m.esporte_id ? p.espMap.get(m.esporte_id) : null;
                return (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_97%,transparent),color-mix(in_srgb,var(--eid-surface)_94%,transparent))] px-3 py-2.5 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.18)] backdrop-blur-sm md:gap-3 md:px-4 md:py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
                      <div className="flex w-[44px] shrink-0 flex-col items-center">
                        {adv?.avatar_url ? (
                          <Image
                            src={adv.avatar_url}
                            alt=""
                            width={44}
                            height={44}
                            unoptimized
                            className="h-10 w-10 rounded-xl border border-[color:var(--eid-border-subtle)] object-cover md:h-11 md:w-11"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface text-[10px] font-black text-eid-primary-300 md:h-11 md:w-11">
                            EID
                          </div>
                        )}
                        <div className="mt-1">
                          <ProfileEidPerformanceSeal
                            notaEid={adv ? (p.advEidMap.get(`${String(adv.id)}:${Number(m.esporte_id ?? 0)}`) ?? 0) : 0}
                            compact
                          />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-eid-fg md:text-sm">{adv?.nome ?? "Oponente"}</p>
                        <p className="text-[11px] text-eid-text-secondary md:text-xs">
                          {esp ?? "Esporte"} · {m.modalidade_confronto ?? "individual"}
                        </p>
                        <div className="text-[10px] md:text-[11px]">
                          <EidCityState location={adv?.localizacao?.trim() ? adv.localizacao : null} compact align="start" />
                        </div>
                      </div>
                    </div>
                    <EidPendingBadge label="Pendente" />
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
