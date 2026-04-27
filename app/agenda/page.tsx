import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ConexoesStrip, type ConexaoPeer } from "@/components/agenda/conexoes-strip";
import { AgendaAceitosCancelaveis } from "@/components/agenda/agenda-aceitos-cancelaveis";
import { PartidaAgendaCard } from "@/components/agenda/partida-agenda-card";
import { RealtimePageRefresh } from "@/components/pwa/realtime-page-refresh";
import {
  type AgendaPartidaCardRow,
  fetchPartidasAgendadasUsuario,
  firstOfRelation,
  getAgendaTeamContext,
} from "@/lib/agenda/partidas-usuario";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Agenda",
  description: "Jogos agendados e lembretes no EsporteID",
};

export default async function AgendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/agenda");

  const { data: profile } = await supabase
    .from("profiles")
    .select(`perfil_completo, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`)
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !legalAcceptanceIsCurrent(profile)) redirect("/conta/aceitar-termos");
  if (!profile.perfil_completo) redirect("/onboarding");

  await supabase.rpc("auto_aprovar_resultados_pendentes", { p_only_user: user.id });
  await supabase.rpc("processar_pendencias_cancelamento_match", { p_only_user: user.id });
  const { teamClause } = await getAgendaTeamContext(supabase, user.id);

  const { data: aceitos } = await supabase
    .from("matches")
    .select("usuario_id, adversario_id")
    .eq("status", "Aceito")
    .or(`usuario_id.eq.${user.id},adversario_id.eq.${user.id}`)
    .order("data_confirmacao", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(200);

  const seenPeer = new Set<string>();
  const peerList: string[] = [];
  for (const m of aceitos ?? []) {
    if (m.usuario_id && m.usuario_id !== user.id && !seenPeer.has(m.usuario_id)) {
      seenPeer.add(m.usuario_id);
      peerList.push(m.usuario_id);
    }
    if (m.adversario_id && m.adversario_id !== user.id && !seenPeer.has(m.adversario_id)) {
      seenPeer.add(m.adversario_id);
      peerList.push(m.adversario_id);
    }
  }

  const { data: peerProfiles } = peerList.length
    ? await supabase
        .from("profiles")
        .select("id, nome, avatar_url, disponivel_amistoso, disponivel_amistoso_ate")
        .in("id", peerList)
    : { data: [] };
  const profileById = new Map((peerProfiles ?? []).map((p) => [p.id, p]));
  const conexoes: ConexaoPeer[] = peerList
    .map((id) => profileById.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null)
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      avatar_url: p.avatar_url,
      disponivel_amistoso: p.disponivel_amistoso,
      disponivel_amistoso_ate: p.disponivel_amistoso_ate,
    }));

  const { data: partidasAgendadas } = await fetchPartidasAgendadasUsuario(supabase, user.id, teamClause);

  const allLocalIds = [
    ...new Set(
      (partidasAgendadas ?? [])
        .map((p) => p.local_espaco_id)
        .filter((x): x is number => typeof x === "number" && x > 0)
    ),
  ];
  const { data: locaisRows } = allLocalIds.length
    ? await supabase.from("espacos_genericos").select("id, nome_publico").in("id", allLocalIds)
    : { data: [] };
  const locMap = new Map((locaisRows ?? []).map((l) => [l.id, l.nome_publico]));

  const allPlayerIds = new Set<string>();
  for (const p of partidasAgendadas ?? []) {
    if (p.jogador1_id) allPlayerIds.add(p.jogador1_id);
    if (p.jogador2_id) allPlayerIds.add(p.jogador2_id);
  }
  const playerList = [...allPlayerIds];
  const { data: nomeRows } = playerList.length
    ? await supabase.from("profiles").select("id, nome, avatar_url").in("id", playerList)
    : { data: [] };
  const perfilMap = new Map((nomeRows ?? []).map((r) => [r.id, r]));
  const nomeMap = new Map((nomeRows ?? []).map((r) => [r.id, r.nome]));

  const esporteIdsPartidas = [
    ...new Set(
      (partidasAgendadas ?? [])
        .map((p) => Number((p as { esporte_id?: number | null }).esporte_id ?? 0))
        .filter((v) => Number.isFinite(v) && v > 0)
    ),
  ];
  const { data: ueRows } = playerList.length && esporteIdsPartidas.length
    ? await supabase
        .from("usuario_eid")
        .select("usuario_id, esporte_id, nota_eid")
        .in("usuario_id", playerList)
        .in("esporte_id", esporteIdsPartidas)
    : { data: [] };
  const notaEidByUserSport = new Map(
    (ueRows ?? []).map((r) => [`${String(r.usuario_id)}:${Number(r.esporte_id)}`, Number(r.nota_eid ?? 0)])
  );

  const { data: pendentesEnvio } = await supabase
    .from("matches")
    .select("id, status, modalidade_confronto, data_solicitacao, data_registro, adversario_id, esporte_id")
    .eq("usuario_id", user.id)
    .eq("status", "Pendente")
    .order("data_registro", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(20);

  const { data: aceitosCancelaveis } = await supabase
    .from("matches")
    .select(
      "id, usuario_id, adversario_id, modalidade_confronto, esporte_id, status, cancel_requested_by, cancel_requested_at, cancel_response_deadline_at, reschedule_deadline_at, reschedule_selected_option, scheduled_for, scheduled_location"
    )
    .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente"])
    .eq("finalidade", "ranking")
    .or(`usuario_id.eq.${user.id},adversario_id.eq.${user.id}`)
    .order("data_confirmacao", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(20);

  const matchIdsAceitos = (aceitosCancelaveis ?? [])
    .map((m) => Number(m.id))
    .filter((v) => Number.isFinite(v) && v > 0);
  const { data: partidasPorMatchRows } = matchIdsAceitos.length
    ? await supabase
        .from("partidas")
        .select("id, match_id, status, status_ranking")
        .in("match_id", matchIdsAceitos)
        .order("id", { ascending: false })
    : { data: [] };
  const partidaMaisRecentePorMatch = new Map<number, { status: string | null; status_ranking: string | null }>();
  for (const row of partidasPorMatchRows ?? []) {
    const mid = Number((row as { match_id?: number | null }).match_id ?? 0);
    if (!Number.isFinite(mid) || mid <= 0 || partidaMaisRecentePorMatch.has(mid)) continue;
    partidaMaisRecentePorMatch.set(mid, {
      status: (row as { status?: string | null }).status ?? null,
      status_ranking: (row as { status_ranking?: string | null }).status_ranking ?? null,
    });
  }

  const advIds = [...new Set((pendentesEnvio ?? []).map((m) => m.adversario_id).filter(Boolean))] as string[];
  const { data: adversarios } = advIds.length
    ? await supabase.from("profiles").select("id, nome, avatar_url").in("id", advIds)
    : { data: [] };
  const advMap = new Map((adversarios ?? []).map((p) => [p.id, p]));

  const eids = [...new Set((pendentesEnvio ?? []).map((m) => m.esporte_id).filter(Boolean))] as number[];
  const eidsAceitos = [...new Set((aceitosCancelaveis ?? []).map((m) => m.esporte_id).filter(Boolean))] as number[];
  const { data: esportes } = eids.length
    ? await supabase.from("esportes").select("id, nome").in("id", eids)
    : { data: [] };
  const { data: esportesAceitos } = eidsAceitos.length
    ? await supabase.from("esportes").select("id, nome").in("id", eidsAceitos)
    : { data: [] };
  const espMap = new Map((esportes ?? []).map((e) => [e.id, e.nome]));
  const espMapAceitos = new Map((esportesAceitos ?? []).map((e) => [e.id, e.nome]));

  const oponenteIdsAceitos = [
    ...new Set(
      (aceitosCancelaveis ?? [])
        .map((m) => (m.usuario_id === user.id ? m.adversario_id : m.usuario_id))
        .filter((x): x is string => typeof x === "string" && x.length > 0)
    ),
  ];
  const { data: oponentesAceitos } = oponenteIdsAceitos.length
    ? await supabase.from("profiles").select("id, nome, avatar_url").in("id", oponenteIdsAceitos)
    : { data: [] };
  const oponenteMapAceitos = new Map(
    (oponentesAceitos ?? []).map((p) => [p.id, { nome: p.nome ?? "Oponente", avatarUrl: p.avatar_url ?? null }])
  );
  const matchIdsCancel = (aceitosCancelaveis ?? []).map((m) => Number(m.id)).filter((v) => Number.isFinite(v) && v > 0);
  const { data: opcoesCancelRows } = matchIdsCancel.length
    ? await supabase
        .from("match_cancelamento_opcoes")
        .select("match_id, option_idx, scheduled_for, location, status")
        .in("match_id", matchIdsCancel)
        .order("option_idx", { ascending: true })
    : { data: [] };
  const opcoesByMatch = new Map<number, Array<{ optionIdx: number; scheduledFor: string; location: string | null; status: string }>>();
  for (const row of opcoesCancelRows ?? []) {
    const key = Number(row.match_id);
    if (!Number.isFinite(key) || !row.scheduled_for) continue;
    const list = opcoesByMatch.get(key) ?? [];
    list.push({
      optionIdx: Number(row.option_idx),
      scheduledFor: String(row.scheduled_for),
      location: row.location ? String(row.location) : null,
      status: String(row.status ?? "pendente"),
    });
    opcoesByMatch.set(key, list);
  }

  const aceitosItems = (aceitosCancelaveis ?? []).map((m) => {
    const opp = m.usuario_id === user.id ? m.adversario_id : m.usuario_id;
    const status = String(m.status ?? "Aceito");
    const partidaRecente = partidaMaisRecentePorMatch.get(Number(m.id)) ?? null;
    const partidaStatus = String(partidaRecente?.status ?? "").trim().toLowerCase();
    const partidaStatusRanking = String(partidaRecente?.status_ranking ?? "").trim().toLowerCase();
    let statusLabel: string | null = null;
    if (status === "Aceito" && partidaStatus === "aguardando_confirmacao") {
      if (partidaStatusRanking === "resultado_contestado") {
        statusLabel = "Resultado contestado";
      } else if (partidaStatusRanking === "pendente_confirmacao_revisao") {
        statusLabel = "Aguardando aprovação (revisão)";
      } else if (partidaStatusRanking === "em_analise_admin") {
        statusLabel = "Em análise do admin";
      } else {
        statusLabel = "Aguardando aprovação";
      }
    }
    const isRequester = String(m.cancel_requested_by ?? "") === user.id;
    return {
      id: Number(m.id),
      nomeOponente: (opp ? oponenteMapAceitos.get(opp)?.nome : null) ?? "Oponente",
      avatarOponente: (opp ? oponenteMapAceitos.get(opp)?.avatarUrl : null) ?? null,
      oponenteId: opp ?? "",
      esporte: (m.esporte_id ? espMapAceitos.get(m.esporte_id) : null) ?? "Esporte",
      modalidade: m.modalidade_confronto ?? "individual",
      status,
      statusLabel,
      isRequester,
      cancelResponseDeadlineAt: m.cancel_response_deadline_at ? String(m.cancel_response_deadline_at) : null,
      rescheduleDeadlineAt: m.reschedule_deadline_at ? String(m.reschedule_deadline_at) : null,
      options: opcoesByMatch.get(Number(m.id)) ?? [],
    };
  });

  function dueloKey(a: string | null | undefined, b: string | null | undefined, esporteId: number | null | undefined): string | null {
    if (!a || !b || !Number.isFinite(Number(esporteId)) || Number(esporteId) <= 0) return null;
    const [x, y] = [String(a), String(b)].sort();
    return `${Number(esporteId)}:${x}:${y}`;
  }

  const cancelMatchIdByDuelo = new Map<string, number>();
  const acceptedScheduleByDuelo = new Map<string, { scheduledFor: string | null; scheduledLocation: string | null }>();
  const rescheduleAcceptedByDuelo = new Set<string>();
  const blockedDueloByCancelFlow = new Set<string>();
  for (const m of aceitosCancelaveis ?? []) {
    const key = dueloKey(m.usuario_id, m.adversario_id, Number(m.esporte_id ?? 0));
    if (!key) continue;
    if (String(m.status ?? "") === "Aceito") {
      cancelMatchIdByDuelo.set(key, Number(m.id));
      if (Number.isFinite(Number((m as { reschedule_selected_option?: number | null }).reschedule_selected_option ?? NaN))) {
        const selected = Number((m as { reschedule_selected_option?: number | null }).reschedule_selected_option ?? 0);
        if (selected > 0) {
          rescheduleAcceptedByDuelo.add(key);
          acceptedScheduleByDuelo.set(key, {
            scheduledFor: (m as { scheduled_for?: string | null }).scheduled_for ? String((m as { scheduled_for?: string | null }).scheduled_for) : null,
            scheduledLocation: (m as { scheduled_location?: string | null }).scheduled_location
              ? String((m as { scheduled_location?: string | null }).scheduled_location)
              : null,
          });
        }
      }
    } else if (String(m.status ?? "") === "CancelamentoPendente" || String(m.status ?? "") === "ReagendamentoPendente") {
      blockedDueloByCancelFlow.add(key);
    }
  }
  const partidasAgendadasVisiveis = (partidasAgendadas ?? []).filter((row) => {
    const esporteIdCard = Number((row as { esporte_id?: number | null }).esporte_id ?? 0);
    const key = dueloKey(row.jogador1_id, row.jogador2_id, esporteIdCard);
    if (!key) return true;
    return !blockedDueloByCancelFlow.has(key);
  });

  function localLabel(p: AgendaPartidaCardRow) {
    if (p.local_str?.trim()) return p.local_str.trim();
    if (p.local_espaco_id) return locMap.get(p.local_espaco_id) ?? null;
    return null;
  }

  return (
    <main
      data-eid-touch-ui
      className="mx-auto w-full max-w-lg px-3 pt-0 pb-[calc(var(--eid-shell-footer-offset)+1rem)] sm:max-w-2xl sm:px-6 sm:pt-1 sm:pb-[calc(var(--eid-shell-footer-offset)+1rem)]"
    >
      <RealtimePageRefresh userId={user.id} />
      <ConexoesStrip peers={conexoes} />

      <section className="mt-6 md:mt-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-primary-500">Confrontos</h2>
        <p className="mt-1 hidden text-xs text-eid-text-secondary md:block">
          Ajuste <strong className="text-eid-fg">data e local</strong> aqui. Lançamento e confirmação de placar ficam no{" "}
          <Link href="/comunidade#resultados-partida" className="font-bold text-eid-primary-300 hover:underline">
            Painel de controle
          </Link>
          .
        </p>
        {partidasAgendadasVisiveis.length === 0 ? (
          <div className="eid-list-item mt-4 rounded-[22px] border-2 border-dashed bg-eid-card/40 py-10 text-center">
            <p className="text-sm font-bold text-eid-fg">Nenhuma pendência</p>
            <p className="mt-1 text-xs text-eid-text-secondary">Sua agenda está em dia. Combine um desafio no radar.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {partidasAgendadasVisiveis.map((row) => {
              const esp = firstOfRelation(row.esportes);
              const pr = row as AgendaPartidaCardRow;
              const esporteIdCard = Number((row as { esporte_id?: number | null }).esporte_id ?? 0);
              const dueloCardKey = dueloKey(pr.jogador1_id, pr.jogador2_id, esporteIdCard) ?? "__";
              const acceptedSchedule = acceptedScheduleByDuelo.get(dueloCardKey) ?? null;
              return (
                <PartidaAgendaCard
                  key={pr.id}
                  id={pr.id}
                  esporteNome={esp?.nome ?? "Esporte"}
                  j1Nome={pr.jogador1_id ? nomeMap.get(pr.jogador1_id) ?? null : null}
                  j2Nome={pr.jogador2_id ? nomeMap.get(pr.jogador2_id) ?? null : null}
                  j1Id={pr.jogador1_id}
                  j2Id={pr.jogador2_id}
                  j1AvatarUrl={pr.jogador1_id ? perfilMap.get(pr.jogador1_id)?.avatar_url ?? null : null}
                  j2AvatarUrl={pr.jogador2_id ? perfilMap.get(pr.jogador2_id)?.avatar_url ?? null : null}
                  j1NotaEid={pr.jogador1_id ? notaEidByUserSport.get(`${pr.jogador1_id}:${esporteIdCard}`) ?? 0 : 0}
                  j2NotaEid={pr.jogador2_id ? notaEidByUserSport.get(`${pr.jogador2_id}:${esporteIdCard}`) ?? 0 : 0}
                  esporteId={esporteIdCard}
                  dataRef={acceptedSchedule?.scheduledFor ?? pr.data_partida ?? pr.data_registro}
                  localLabel={acceptedSchedule?.scheduledLocation ?? localLabel(pr)}
                  variant="agendada"
                  ctaFullscreen
                  cancelMatchId={
                    cancelMatchIdByDuelo.get(
                      dueloCardKey
                    ) ?? null
                  }
                  ctaHidden={
                    rescheduleAcceptedByDuelo.has(dueloCardKey)
                  }
                  desistMatchId={
                    rescheduleAcceptedByDuelo.has(dueloCardKey)
                      ? cancelMatchIdByDuelo.get(
                          dueloCardKey
                        ) ?? null
                      : null
                  }
                  topActionShiftXPx={24}
                />
              );
            })}
          </div>
        )}
      </section>

      <AgendaAceitosCancelaveis items={aceitosItems} />

      <section className="mt-6 md:mt-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-text-secondary">Pedidos que você enviou</h2>
        {(pendentesEnvio ?? []).length === 0 ? (
          <p className="eid-list-item mt-3 rounded-2xl bg-eid-card/80 p-4 text-sm text-eid-text-secondary">
            Você não tem pedidos aguardando resposta.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(pendentesEnvio ?? []).map((m) => {
              const adv = m.adversario_id ? advMap.get(m.adversario_id) : null;
              const esp = m.esporte_id ? espMap.get(m.esporte_id) : null;
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {adv?.avatar_url ? (
                      <Image
                        src={adv.avatar_url}
                        alt=""
                        width={44}
                        height={44}
                        unoptimized
                        className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-eid-surface text-[10px] font-black text-eid-primary-300">
                        EID
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-bold text-eid-fg">{adv?.nome ?? "Oponente"}</p>
                      <p className="text-xs text-eid-text-secondary">
                        {esp ?? "Esporte"} · {m.modalidade_confronto ?? "individual"}
                      </p>
                    </div>
                  </div>
                  <span className="eid-badge-warning rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase">
                    Aguardando
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-eid-text-secondary md:mt-10">
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
    </main>
  );
}
