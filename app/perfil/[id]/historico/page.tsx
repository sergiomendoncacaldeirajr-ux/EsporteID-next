import { notFound, redirect } from "next/navigation";
import { EidIndividualPartidaRow } from "@/components/perfil/eid-individual-partida-row";
import { PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { loginNextWithOptionalFrom } from "@/lib/auth/login-next-path";
import { partidaEncerradaParaHistorico } from "@/lib/perfil/formacao-eid-stats";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function PerfilHistoricoCompletoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginNextWithOptionalFrom(`/perfil/${id}/historico`, sp));

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, nome, mostrar_historico_publico")
    .eq("id", id)
    .maybeSingle();
  if (!perfil) notFound();
  const isSelf = user.id === id;
  if (!isSelf && perfil.mostrar_historico_publico === false) {
    redirect(`/perfil/${id}`);
  }

  const { data: partidasRaw } = await supabase
    .from("partidas")
    .select(
      "id, esporte_id, modalidade, jogador1_id, jogador2_id, time1_id, time2_id, placar_1, placar_2, status, status_ranking, torneio_id, tipo_partida, data_resultado, data_registro, data_partida, local_str, local_cidade, local_espaco_id, mensagem"
    )
    .or(`jogador1_id.eq.${id},jogador2_id.eq.${id}`)
    .order("data_registro", { ascending: false })
    .limit(300);

  const partidas = (partidasRaw ?? []).filter((p) => {
    if (!p.jogador1_id || !p.jogador2_id) return false;
    if (p.time1_id != null || p.time2_id != null) return false;
    return partidaEncerradaParaHistorico(p);
  });

  const oponenteIds = [
    ...new Set(partidas.map((p) => (p.jogador1_id === id ? p.jogador2_id : p.jogador1_id)).filter((x): x is string => !!x)),
  ];
  const oponenteMap = new Map<string, { nome: string; avatarUrl: string | null }>();
  if (oponenteIds.length > 0) {
    const { data: oponentes } = await supabase.from("profiles").select("id, nome, avatar_url, username").in("id", oponenteIds);
    for (const op of oponentes ?? []) {
      if (!op.id) continue;
      oponenteMap.set(op.id, {
        nome: op.nome ?? "Atleta",
        avatarUrl: op.avatar_url ?? null,
      });
    }
  }

  const esporteIds = [...new Set(partidas.map((p) => Number(p.esporte_id)).filter((x) => Number.isFinite(x) && x > 0))];
  const esporteNomeMap = new Map<number, string>();
  if (esporteIds.length > 0) {
    const { data: esportesRows } = await supabase.from("esportes").select("id, nome").in("id", esporteIds);
    for (const e of esportesRows ?? []) {
      if (e.id != null) esporteNomeMap.set(Number(e.id), e.nome ?? "Esporte");
    }
  }

  const oponenteNotaMap = new Map<string, number>();
  if (oponenteIds.length > 0 && esporteIds.length > 0) {
    const { data: notasRows } = await supabase
      .from("usuario_eid")
      .select("usuario_id, esporte_id, nota_eid")
      .in("usuario_id", oponenteIds)
      .in("esporte_id", esporteIds);
    for (const row of notasRows ?? []) {
      if (!row.usuario_id || row.esporte_id == null || row.nota_eid == null) continue;
      oponenteNotaMap.set(`${row.usuario_id}:${Number(row.esporte_id)}`, Number(row.nota_eid));
    }
  }

  const localEspacoIds = [...new Set(partidas.map((p) => Number(p.local_espaco_id)).filter((x) => Number.isFinite(x) && x > 0))];
  const localEspacoNomeMap = new Map<number, string>();
  if (localEspacoIds.length > 0) {
    const { data: locaisRows } = await supabase
      .from("espacos_genericos")
      .select("id, nome_publico")
      .in("id", localEspacoIds);
    for (const loc of locaisRows ?? []) {
      if (loc.id != null) localEspacoNomeMap.set(Number(loc.id), loc.nome_publico ?? "Local");
    }
  }

  const totais = partidas.reduce(
    (acc, p) => {
      const isP1 = p.jogador1_id === id;
      const s1 = Number(p.placar_1 ?? 0);
      const s2 = Number(p.placar_2 ?? 0);
      if (s1 === s2) acc.empates += 1;
      else if ((isP1 && s1 > s2) || (!isP1 && s2 > s1)) acc.vitorias += 1;
      else acc.derrotas += 1;
      if (p.torneio_id) acc.torneio += 1;
      else acc.rank += 1;
      return acc;
    },
    { vitorias: 0, derrotas: 0, empates: 0, rank: 0, torneio: 0 }
  );

  return (
    <main className={PROFILE_PUBLIC_MAIN_CLASS}>
      <div className={`${PROFILE_HERO_PANEL_CLASS} p-3 sm:p-4`}>
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-sm font-black uppercase tracking-[0.08em] text-eid-fg">Histórico completo</h1>
          </div>
          <p className="mt-0.5 text-[10px] text-eid-text-secondary">{perfil.nome ?? "Atleta"} · somente confrontos individuais</p>
          <p className="mt-1 text-[9px] text-eid-text-secondary">
            Aqui estão todos os confrontos deste perfil. Para ver resultados por esporte, volte ao perfil e acesse as estatísticas no EID de cada esporte.
          </p>

          <div className="mt-3 grid grid-cols-5 gap-1.5">
            <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
              <p className="text-[12px] font-black text-emerald-300">{totais.vitorias}</p>
              <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">V</p>
            </div>
            <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
              <p className="text-[12px] font-black text-red-300">{totais.derrotas}</p>
              <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">D</p>
            </div>
            <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
              <p className="text-[12px] font-black text-eid-primary-300">{totais.empates}</p>
              <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">E</p>
            </div>
            <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
              <p className="text-[12px] font-black text-eid-fg">{totais.rank}</p>
              <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">Rank</p>
            </div>
            <div className="eid-list-item rounded-lg bg-eid-surface/45 px-1.5 py-1 text-center">
              <p className="text-[12px] font-black text-eid-fg">{totais.torneio}</p>
              <p className="text-[8px] font-semibold uppercase text-eid-text-secondary">Torneio</p>
            </div>
          </div>

          {partidas.length > 0 ? (
            <ul className="mt-3 grid gap-1.5">
              {partidas.map((p) => {
                const isP1 = p.jogador1_id === id;
                const s1 = Number(p.placar_1 ?? 0);
                const s2 = Number(p.placar_2 ?? 0);
                const empatou = s1 === s2;
                const venceu = isP1 ? s1 > s2 : s2 > s1;
                const resultado = empatou ? "E" : venceu ? "V" : "D";
                const oponenteId = isP1 ? p.jogador2_id : p.jogador1_id;
                const oponente = oponenteId ? oponenteMap.get(oponenteId) : null;
                const oponenteNome = oponente?.nome ?? "Atleta";
                const data = p.data_resultado ?? p.data_partida ?? p.data_registro;
                const esporteNome = p.esporte_id != null ? esporteNomeMap.get(Number(p.esporte_id)) ?? "Esporte" : "Esporte";
                const modalidade = String(p.modalidade ?? "individual").trim();
                const modalidadeFmt = modalidade ? modalidade.charAt(0).toUpperCase() + modalidade.slice(1) : "Individual";
                const localNome =
                  (p.local_espaco_id != null ? localEspacoNomeMap.get(Number(p.local_espaco_id)) : null) ??
                  (String(p.local_str ?? "").trim() ||
                    String(p.local_cidade ?? "").trim() ||
                    "Local não informado");
                const res = {
                  label: resultado as "V" | "D" | "E",
                  tone: resultado === "V" ? "text-emerald-300" : resultado === "D" ? "text-rose-300" : "text-eid-primary-300",
                };
                const oponenteNota =
                  oponenteId && p.esporte_id != null ? oponenteNotaMap.get(`${oponenteId}:${Number(p.esporte_id)}`) ?? null : null;
                const confrontosMesmos = partidas.filter((h) => {
                  const hOid = h.jogador1_id === id ? h.jogador2_id : h.jogador1_id;
                  return hOid === oponenteId;
                });
                const ultimosConfrontos = confrontosMesmos.slice(0, 5).map((h) => {
                  const origem: "Ranking" | "Torneio" =
                    h.torneio_id != null || String(h.tipo_partida ?? "").toLowerCase() === "torneio"
                      ? "Torneio"
                      : "Ranking";
                  const dataHora = new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(h.data_partida ?? h.data_resultado ?? h.data_registro ?? Date.now()));
                  return {
                    id: h.id,
                    dataHora,
                    local:
                      (h.local_espaco_id != null ? localEspacoNomeMap.get(Number(h.local_espaco_id)) : null) ??
                      (String(h.local_str ?? "").trim() || String(h.local_cidade ?? "").trim() || null),
                    localHref:
                      h.local_espaco_id != null && Number(h.local_espaco_id) > 0
                        ? `/local/${Number(h.local_espaco_id)}`
                        : null,
                    placar: `${Number(h.placar_1 ?? 0)} × ${Number(h.placar_2 ?? 0)}`,
                    origem,
                    confronto: `${perfil.nome ?? "Atleta"} vs ${oponenteNome}`,
                  };
                });
                return (
                  <EidIndividualPartidaRow
                    key={p.id}
                    partida={p}
                    selfNome={perfil.nome ?? "Atleta"}
                    opponentId={oponenteId ?? id}
                    opponentNome={oponenteNome}
                    opponentAvatarUrl={oponente?.avatarUrl ?? null}
                    opponentNotaEid={oponenteNota}
                    res={res}
                    profileLinkFrom={`/perfil/${id}/historico`}
                    torneioLabel={p.torneio_id ? "Torneio" : "Rank"}
                    esporteLabel={esporteNome}
                    modalidadeLabel={modalidadeFmt}
                    totalConfrontos={confrontosMesmos.length}
                    ultimosConfrontos={ultimosConfrontos}
                  />
                );
              })}
            </ul>
          ) : (
            <div className="eid-list-item mt-3 flex min-h-[110px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-eid-primary-500/35 bg-eid-primary-500/[0.06] p-4 text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-surface/65 text-eid-primary-300">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                  <path d="M10 2.25a.75.75 0 0 1 .75.75V10h4.25a.75.75 0 0 1 0 1.5H10A.75.75 0 0 1 9.25 10V3a.75.75 0 0 1 .75-.75Zm0 15a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5ZM1.25 10a8.75 8.75 0 1 1 17.5 0 8.75 8.75 0 0 1-17.5 0Z" />
                </svg>
              </span>
              <p className="text-[12px] font-bold text-eid-fg">Nenhum histórico encontrado</p>
              <p className="text-[10px] text-eid-text-secondary">
                Ainda não há partidas individuais concluídas de rank ou torneio para este perfil.
              </p>
            </div>
          )}
      </div>
    </main>
  );
}

