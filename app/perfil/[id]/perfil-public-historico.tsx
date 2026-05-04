import { getServerAuth } from "@/lib/auth/rsc-auth";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";
import { ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { EidIndividualPartidaRow, type EidPartidaIndividualRow } from "@/components/perfil/eid-individual-partida-row";
import {
  partidaEncerradaParaHistorico,
  resultadoPartidaIndividual,
  type PartidaColetivaRow,
} from "@/lib/perfil/formacao-eid-stats";
import type { PerfilPublicoProfileRow } from "./perfil-public-shared";

type Props = {
  profileId: string;
  viewerId: string;
  perfil: PerfilPublicoProfileRow;
  isSelf: boolean;
};

export async function PerfilPublicoHistoricoSection({ profileId, viewerId, perfil, isSelf }: Props) {
  const { supabase, user } = await getServerAuth();
  if (!user || user.id !== viewerId) return null;

  const id = profileId;
  const mostrarHistoricoPublico = perfil.mostrar_historico_publico !== false;
  const podeVerHistorico = isSelf || mostrarHistoricoPublico;

  const { data: partidasHistoricoRaw } = podeVerHistorico
    ? await supabase
        .from("partidas")
        .select(
          "id, esporte_id, modalidade, jogador1_id, jogador2_id, time1_id, time2_id, placar_1, placar_2, status, status_ranking, torneio_id, tipo_partida, data_resultado, data_registro, data_partida, local_str, local_cidade, local_espaco_id, mensagem",
        )
        .or(`jogador1_id.eq.${id},jogador2_id.eq.${id}`)
        .order("data_registro", { ascending: false })
        .limit(180)
    : { data: [] as Array<Record<string, unknown>> };

  const partidasHistorico = (partidasHistoricoRaw ?? []).filter((p) => {
    const row = p as { jogador1_id?: string | null; jogador2_id?: string | null; time1_id?: unknown; time2_id?: unknown };
    if (!row.jogador1_id || !row.jogador2_id) return false;
    if (row.time1_id != null || row.time2_id != null) return false;
    return partidaEncerradaParaHistorico(p as Pick<PartidaColetivaRow, "status" | "status_ranking" | "torneio_id">);
  });

  const oponenteIdsHistorico = [
    ...new Set(
      partidasHistorico
        .map((p) => {
          const row = p as { jogador1_id?: string; jogador2_id?: string };
          return row.jogador1_id === id ? row.jogador2_id : row.jogador1_id;
        })
        .filter((x): x is string => !!x),
    ),
  ];
  const oponenteHistoricoMap = new Map<string, { nome: string; avatarUrl: string | null }>();
  if (oponenteIdsHistorico.length > 0) {
    const { data: oponentesHistorico } = await supabase
      .from("profiles")
      .select("id, nome, avatar_url")
      .in("id", oponenteIdsHistorico);
    for (const op of oponentesHistorico ?? []) {
      if (!op.id) continue;
      oponenteHistoricoMap.set(op.id, {
        nome: op.nome ?? "Atleta",
        avatarUrl: op.avatar_url ?? null,
      });
    }
  }
  const esporteIdsHistorico = [
    ...new Set(partidasHistorico.map((p) => Number((p as { esporte_id?: number }).esporte_id)).filter((x) => Number.isFinite(x) && x > 0)),
  ];
  const esporteHistoricoMap = new Map<number, string>();
  if (esporteIdsHistorico.length > 0) {
    const { data: esportesHistoricoRows } = await supabase.from("esportes").select("id, nome").in("id", esporteIdsHistorico);
    for (const e of esportesHistoricoRows ?? []) {
      if (e.id != null) esporteHistoricoMap.set(Number(e.id), e.nome ?? "Esporte");
    }
  }
  const oponenteNotaHistoricoMap = new Map<string, number>();
  if (oponenteIdsHistorico.length > 0 && esporteIdsHistorico.length > 0) {
    const { data: notasHistoricoRows } = await supabase
      .from("usuario_eid")
      .select("usuario_id, esporte_id, nota_eid")
      .in("usuario_id", oponenteIdsHistorico)
      .in("esporte_id", esporteIdsHistorico);
    for (const row of notasHistoricoRows ?? []) {
      if (!row.usuario_id || row.esporte_id == null || row.nota_eid == null) continue;
      oponenteNotaHistoricoMap.set(`${row.usuario_id}:${Number(row.esporte_id)}`, Number(row.nota_eid));
    }
  }
  const localHistoricoMap = new Map<number, string>();
  const localHistoricoIds = [
    ...new Set(partidasHistorico.map((p) => Number((p as { local_espaco_id?: number }).local_espaco_id)).filter((x) => Number.isFinite(x) && x > 0)),
  ];
  if (localHistoricoIds.length > 0) {
    const { data: locaisHistoricoRows } = await supabase.from("espacos_genericos").select("id, nome_publico").in("id", localHistoricoIds);
    for (const loc of locaisHistoricoRows ?? []) {
      if (loc.id != null) localHistoricoMap.set(Number(loc.id), loc.nome_publico ?? "Local");
    }
  }

  type HistoricoAcc = { vitorias: number; derrotas: number; empates: number; rank: number; torneio: number };
  const historicoTotais = partidasHistorico.reduce<HistoricoAcc>(
    (acc, p) => {
      const row = p as { jogador1_id?: string; placar_1?: unknown; placar_2?: unknown; torneio_id?: unknown };
      const isP1 = row.jogador1_id === id;
      const s1 = Number(row.placar_1 ?? 0);
      const s2 = Number(row.placar_2 ?? 0);
      if (s1 === s2) acc.empates += 1;
      else if ((isP1 && s1 > s2) || (!isP1 && s2 > s1)) acc.vitorias += 1;
      else acc.derrotas += 1;
      if (row.torneio_id) acc.torneio += 1;
      else acc.rank += 1;
      return acc;
    },
    { vitorias: 0, derrotas: 0, empates: 0, rank: 0, torneio: 0 },
  );

  return (
    <div className="mt-0">
      {isSelf ? (
        <div className="-mb-5 mt-0 flex justify-end">
          <ProfileEditDrawerTrigger
            href={`/editar/historico?from=${encodeURIComponent(`/perfil/${id}`)}`}
            title="Privacidade do histórico"
            topMode="backOnly"
            className="relative top-0.5 inline-flex items-center justify-center gap-1 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2.5 py-1 text-[8px] font-bold uppercase leading-none tracking-[0.08em] text-eid-text-secondary transition-all hover:border-eid-primary-500/35 hover:bg-eid-primary-500/10 hover:text-eid-fg"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5" aria-hidden>
              <path d="M10.5 1a.75.75 0 0 1 0 1.5H5.25A2.75 2.75 0 0 0 2.5 5.25v5.5A2.75 2.75 0 0 0 5.25 13.5h5.5a2.75 2.75 0 0 0 2.75-2.75V5.5a.75.75 0 0 1 1.5 0v5.25A4.25 4.25 0 0 1 10.75 15h-5.5A4.25 4.25 0 0 1 1 10.75v-5.5A4.25 4.25 0 0 1 5.25 1h5.25Zm2.28.22a.75.75 0 0 1 1.06 0l1.94 1.94a.75.75 0 0 1 0 1.06l-5.47 5.47a.75.75 0 0 1-.33.2l-2.4.66a.75.75 0 0 1-.92-.92l.66-2.4a.75.75 0 0 1 .2-.33l5.47-5.47Z" />
            </svg>
            {mostrarHistoricoPublico ? "OCULTAR HISTÓRICO" : "MOSTRAR HISTÓRICO"}
          </ProfileEditDrawerTrigger>
        </div>
      ) : null}
      {podeVerHistorico ? (
        <ProfileSection
          title="Histórico"
          info="Partidas concluídas com placar: totais e prévia dos últimos confrontos. O próprio atleta pode ocultar esta seção no perfil público."
        >
          {partidasHistorico.length > 0 ? (
            <>
              <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
                <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Resumo</p>
                  <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/12 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-action-500)_28%)]">
                    Geral
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 p-2">
                  <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/12 px-1.5 py-1.5 text-center">
                    <p className="text-[11px] font-black text-[color:color-mix(in_srgb,var(--eid-fg)_65%,#10b981_35%)]">{historicoTotais.vitorias}</p>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_82%,#10b981_18%)]">V</p>
                  </div>
                  <div className="rounded-lg border border-rose-500/25 bg-rose-500/12 px-1.5 py-1.5 text-center">
                    <p className="text-[11px] font-black text-[color:color-mix(in_srgb,var(--eid-fg)_65%,#f43f5e_35%)]">{historicoTotais.derrotas}</p>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_82%,#f43f5e_18%)]">D</p>
                  </div>
                  <div className="rounded-lg border border-eid-primary-500/30 bg-eid-primary-500/12 px-1.5 py-1.5 text-center">
                    <p className="text-[11px] font-black text-[color:color-mix(in_srgb,var(--eid-fg)_62%,var(--eid-primary-500)_38%)]">{historicoTotais.empates}</p>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_82%,var(--eid-primary-500)_18%)]">E</p>
                  </div>
                  <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-1.5 py-1.5 text-center">
                    <p className="text-[11px] font-black text-eid-fg">{historicoTotais.rank}</p>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.06em] text-eid-text-secondary">Rank</p>
                  </div>
                  <div className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-1.5 py-1.5 text-center">
                    <p className="text-[11px] font-black text-eid-fg">{historicoTotais.torneio}</p>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.06em] text-eid-text-secondary">Torneio</p>
                  </div>
                </div>
              </div>
              <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
                <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Prévia do histórico</p>
                  <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-primary-500)_28%)]">
                    Últimos 5
                  </span>
                </div>
                <ul className="grid gap-2 p-2">
                  {partidasHistorico.slice(0, 5).map((p) => {
                    const row = p as {
                      id: string;
                      jogador1_id?: string | null;
                      jogador2_id?: string | null;
                      esporte_id?: number | null;
                      modalidade?: string | null;
                      torneio_id?: unknown;
                      tipo_partida?: string | null;
                      data_partida?: string | null;
                      data_resultado?: string | null;
                      data_registro?: string | null;
                      local_espaco_id?: number | null;
                      local_str?: string | null;
                      local_cidade?: string | null;
                      placar_1?: unknown;
                      placar_2?: unknown;
                    };
                    const oponenteId = row.jogador1_id === id ? row.jogador2_id : row.jogador1_id;
                    const op = oponenteId ? oponenteHistoricoMap.get(oponenteId) : null;
                    const modalidade = String(row.modalidade ?? "individual").trim();
                    const modalidadeFmt = modalidade ? modalidade.charAt(0).toUpperCase() + modalidade.slice(1) : "Individual";
                    const esporteNome =
                      row.esporte_id != null ? esporteHistoricoMap.get(Number(row.esporte_id)) ?? "Esporte" : "Esporte";
                    const res = resultadoPartidaIndividual(id, {
                      jogador1_id: row.jogador1_id ?? null,
                      jogador2_id: row.jogador2_id ?? null,
                      placar_1: row.placar_1 != null ? Number(row.placar_1) : null,
                      placar_2: row.placar_2 != null ? Number(row.placar_2) : null,
                    });
                    const origemLabel: "Ranking" | "Torneio" =
                      row.torneio_id != null || String(row.tipo_partida ?? "").toLowerCase() === "torneio"
                        ? "Torneio"
                        : "Ranking";
                    const confrontosMesmos = partidasHistorico.filter((h) => {
                      const hr = h as { jogador1_id?: string | null; jogador2_id?: string | null };
                      const hOid = hr.jogador1_id === id ? hr.jogador2_id : hr.jogador1_id;
                      return hOid === oponenteId;
                    });
                    const ultimosConfrontos = confrontosMesmos.slice(0, 5).map((h) => {
                      const hr = h as {
                        id: string;
                        torneio_id?: unknown;
                        tipo_partida?: string | null;
                        data_partida?: string | null;
                        data_resultado?: string | null;
                        data_registro?: string | null;
                        local_espaco_id?: number | null;
                        local_str?: string | null;
                        local_cidade?: string | null;
                        placar_1?: unknown;
                        placar_2?: unknown;
                      };
                      const origem: "Ranking" | "Torneio" =
                        hr.torneio_id != null || String(hr.tipo_partida ?? "").toLowerCase() === "torneio"
                          ? "Torneio"
                          : "Ranking";
                      const dataHora = new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(hr.data_partida ?? hr.data_resultado ?? hr.data_registro ?? Date.now()));
                      return {
                        id: hr.id,
                        dataHora,
                        local:
                          (hr.local_espaco_id != null ? localHistoricoMap.get(Number(hr.local_espaco_id)) : null) ??
                          (String(hr.local_str ?? "").trim() || String(hr.local_cidade ?? "").trim() || null),
                        localHref:
                          hr.local_espaco_id != null && Number(hr.local_espaco_id) > 0
                            ? `/local/${Number(hr.local_espaco_id)}`
                            : null,
                        placar: `${Number(hr.placar_1 ?? 0)} × ${Number(hr.placar_2 ?? 0)}`,
                        origem,
                        confronto: `${perfil.nome ?? "Atleta"} vs ${op?.nome ?? "Atleta"}`,
                        mensagem: (hr as { mensagem?: string | null }).mensagem ?? null,
                        sportLabel: esporteNome,
                      };
                    });
                    return (
                      <EidIndividualPartidaRow
                        key={row.id}
                        partida={p as EidPartidaIndividualRow}
                        selfNome={perfil.nome ?? "Atleta"}
                        selfAvatarUrl={perfil.avatar_url ?? null}
                        selfProfileHref={`/perfil/${encodeURIComponent(id)}`}
                        opponentId={oponenteId ?? id}
                        opponentNome={op?.nome ?? "Atleta"}
                        opponentAvatarUrl={op?.avatarUrl ?? null}
                        opponentNotaEid={
                          oponenteId && row.esporte_id != null
                            ? oponenteNotaHistoricoMap.get(`${oponenteId}:${Number(row.esporte_id)}`) ?? null
                            : null
                        }
                        res={res}
                        profileLinkFrom={`/perfil/${id}`}
                        torneioLabel={row.torneio_id ? "Torneio" : null}
                        origemLabel={origemLabel}
                        esporteLabel={esporteNome}
                        modalidadeLabel={modalidadeFmt}
                        totalConfrontos={confrontosMesmos.length}
                        ultimosConfrontos={ultimosConfrontos}
                      />
                    );
                  })}
                </ul>
              </div>
              <div className="mt-2 flex justify-end">
                <ProfileEditDrawerTrigger
                  href={`/perfil/${id}/historico?from=${encodeURIComponent(`/perfil/${id}`)}`}
                  title="Histórico completo"
                  fullscreen
                  topMode="backOnly"
                  className="inline-flex min-h-[30px] items-center justify-center gap-1 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/12 px-2.5 py-1 text-[8px] font-bold uppercase leading-none tracking-[0.08em] text-eid-fg transition-all hover:border-eid-primary-500/50 hover:bg-eid-primary-500/18 hover:text-eid-fg"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden>
                    <path d="M8 1.5a.75.75 0 0 1 .75.75V8h4.5a.75.75 0 0 1 0 1.5H8A.75.75 0 0 1 7.25 8V2.25A.75.75 0 0 1 8 1.5Zm0 13a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm-8-6.5a8 8 0 1 1 16 0 8 8 0 0 1-16 0Z" />
                  </svg>
                  VER HISTÓRICO COMPLETO
                </ProfileEditDrawerTrigger>
              </div>
            </>
          ) : (
            <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55">
              <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Prévia do histórico</p>
                <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/12 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-action-500)_28%)]">
                  Sem jogos
                </span>
              </div>
              <div className="p-3 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-surface/65 text-eid-primary-300">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                    <path d="M10 2.25a.75.75 0 0 1 .75.75V10h4.25a.75.75 0 0 1 0 1.5H10A.75.75 0 0 1 9.25 10V3a.75.75 0 0 1 .75-.75Zm0 15a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5ZM1.25 10a8.75 8.75 0 1 1 17.5 0 8.75 8.75 0 0 1-17.5 0Z" />
                  </svg>
                </span>
                <p className="mt-2 text-[11px] font-bold text-eid-fg">Nenhum histórico registrado ainda</p>
                <p className="mt-0.5 text-[9px] text-eid-text-secondary">Quando houver confrontos concluídos, eles aparecerão aqui.</p>
                <div className="mt-2 flex justify-center">
                  <ProfileEditDrawerTrigger
                    href={`/perfil/${id}/historico?from=${encodeURIComponent(`/perfil/${id}`)}`}
                    title="Histórico completo"
                    fullscreen
                    topMode="backOnly"
                    className="inline-flex min-h-[30px] items-center justify-center gap-1 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/12 px-2.5 py-1 text-[8px] font-bold uppercase leading-none tracking-[0.08em] text-eid-fg transition-all hover:border-eid-primary-500/50 hover:bg-eid-primary-500/18 hover:text-eid-fg"
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden>
                      <path d="M8 1.5a.75.75 0 0 1 .75.75V8h4.5a.75.75 0 0 1 0 1.5H8A.75.75 0 0 1 7.25 8V2.25A.75.75 0 0 1 8 1.5Zm0 13a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm-8-6.5a8 8 0 1 1 16 0 8 8 0 0 1-16 0Z" />
                    </svg>
                    VER HISTÓRICO COMPLETO
                  </ProfileEditDrawerTrigger>
                </div>
              </div>
            </div>
          )}
        </ProfileSection>
      ) : (
        <ProfileSection
          title="Histórico"
          info="Partidas concluídas com placar: totais e prévia dos últimos confrontos. O próprio atleta pode ocultar esta seção no perfil público."
        >
          <div className="eid-list-item mt-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 text-center">
            <div className="flex items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-eid-text-secondary">Privacidade</p>
              <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[color:color-mix(in_srgb,var(--eid-fg)_72%,var(--eid-action-500)_28%)]">
                Oculto
              </span>
            </div>
            <div className="p-3">
              <p className="text-[11px] font-bold text-eid-fg">Histórico privado</p>
              <p className="mt-0.5 text-[9px] text-eid-text-secondary">Este usuário optou por não exibir o histórico no perfil público.</p>
            </div>
          </div>
        </ProfileSection>
      )}
    </div>
  );
}
