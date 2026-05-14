import { EidIndividualPartidaRow } from "@/components/perfil/eid-individual-partida-row";
import type { EidPartidaIndividualRow } from "@/components/perfil/eid-individual-partida-row";
import { createClient } from "@/lib/supabase/server";

type PartidaHistoricoRow = EidPartidaIndividualRow & {
  esporte_id?: number | null;
  modalidade?: string | null;
  local_cidade?: string | null;
};

type Props = {
  profileId: string;
  perfilNome: string;
  partidas: PartidaHistoricoRow[];
};

/**
 * Enriquecimento (oponentes, esportes, notas, locais) + lista — stream separado do cabeçalho/totais.
 */
export async function PerfilHistoricoCompletoListaStream({ profileId, perfilNome, partidas }: Props) {
  const id = profileId;
  const supabase = await createClient();

  const oponenteIds = [
    ...new Set(partidas.map((p) => (p.jogador1_id === id ? p.jogador2_id : p.jogador1_id)).filter((x): x is string => !!x)),
  ];

  const partidasPorOponente = new Map<string, PartidaHistoricoRow[]>();
  for (const p of partidas) {
    const oid = p.jogador1_id === id ? p.jogador2_id : p.jogador1_id;
    if (!oid) continue;
    const arr = partidasPorOponente.get(oid);
    if (arr) arr.push(p);
    else partidasPorOponente.set(oid, [p]);
  }

  const esporteIds = [...new Set(partidas.map((p) => Number(p.esporte_id)).filter((x) => Number.isFinite(x) && x > 0))];
  const localEspacoIds = [...new Set(partidas.map((p) => Number(p.local_espaco_id)).filter((x) => Number.isFinite(x) && x > 0))];

  const [oponentesRes, esportesRowsRes, notasRowsRes, locaisRowsRes] = await Promise.all([
    oponenteIds.length > 0
      ? supabase.from("profiles").select("id, nome, avatar_url, username").in("id", oponenteIds)
      : Promise.resolve({ data: [] as { id: string; nome: string | null; avatar_url: string | null }[] }),
    esporteIds.length > 0
      ? supabase.from("esportes").select("id, nome").in("id", esporteIds)
      : Promise.resolve({ data: [] as { id: number; nome: string | null }[] }),
    oponenteIds.length > 0 && esporteIds.length > 0
      ? supabase
          .from("usuario_eid")
          .select("usuario_id, esporte_id, nota_eid")
          .in("usuario_id", oponenteIds)
          .in("esporte_id", esporteIds)
      : Promise.resolve({ data: [] as { usuario_id: string; esporte_id: number; nota_eid: number | null }[] }),
    localEspacoIds.length > 0
      ? supabase.from("espacos_genericos").select("id, nome_publico, logo_arquivo").in("id", localEspacoIds)
      : Promise.resolve({ data: [] as { id: number; nome_publico: string | null; logo_arquivo: string | null }[] }),
  ]);

  const oponenteMap = new Map<string, { nome: string; avatarUrl: string | null }>();
  for (const op of oponentesRes.data ?? []) {
    if (!op.id) continue;
    oponenteMap.set(op.id, {
      nome: op.nome ?? "Atleta",
      avatarUrl: op.avatar_url ?? null,
    });
  }

  const esporteNomeMap = new Map<number, string>();
  for (const e of esportesRowsRes.data ?? []) {
    if (e.id != null) esporteNomeMap.set(Number(e.id), e.nome ?? "Esporte");
  }

  const oponenteNotaMap = new Map<string, number>();
  for (const row of notasRowsRes.data ?? []) {
    if (!row.usuario_id || row.esporte_id == null || row.nota_eid == null) continue;
    oponenteNotaMap.set(`${row.usuario_id}:${Number(row.esporte_id)}`, Number(row.nota_eid));
  }

  const localEspacoNomeMap = new Map<number, string>();
  const localEspacoLogoMap = new Map<number, string>();
  for (const loc of locaisRowsRes.data ?? []) {
    if (loc.id != null) localEspacoNomeMap.set(Number(loc.id), loc.nome_publico ?? "Local");
    if (loc.id != null && loc.logo_arquivo?.trim()) localEspacoLogoMap.set(Number(loc.id), loc.logo_arquivo.trim());
  }

  return (
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
        const esporteNome = p.esporte_id != null ? esporteNomeMap.get(Number(p.esporte_id)) ?? "Esporte" : "Esporte";
        const modalidade = String(p.modalidade ?? "individual").trim();
        const modalidadeFmt = modalidade ? modalidade.charAt(0).toUpperCase() + modalidade.slice(1) : "Individual";
        const res = {
          label: resultado as "V" | "D" | "E",
          tone: resultado === "V" ? "text-emerald-300" : resultado === "D" ? "text-rose-300" : "text-eid-primary-300",
        };
        const oponenteNota =
          oponenteId && p.esporte_id != null ? oponenteNotaMap.get(`${oponenteId}:${Number(p.esporte_id)}`) ?? null : null;
        const confrontosMesmos = oponenteId ? (partidasPorOponente.get(oponenteId) ?? []) : [];
        const ultimosConfrontos = confrontosMesmos.slice(0, 5).map((h) => {
          const origem: "Ranking" | "Torneio" =
            h.torneio_id != null || String(h.tipo_partida ?? "").toLowerCase() === "torneio" ? "Torneio" : "Ranking";
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
              h.local_espaco_id != null && Number(h.local_espaco_id) > 0 ? `/local/${Number(h.local_espaco_id)}` : null,
            localLogoUrl:
              h.local_espaco_id != null && Number(h.local_espaco_id) > 0 ? localEspacoLogoMap.get(Number(h.local_espaco_id)) ?? null : null,
            placar: h.jogador1_id === id
              ? `${Number(h.placar_1 ?? 0)} × ${Number(h.placar_2 ?? 0)}`
              : `${Number(h.placar_2 ?? 0)} × ${Number(h.placar_1 ?? 0)}`,
            origem,
            confronto: `${perfilNome} vs ${oponenteNome}`,
            mensagem: h.mensagem ?? null,
            sportLabel: h.esporte_id != null ? esporteNomeMap.get(Number(h.esporte_id)) ?? "Esporte" : "Esporte",
          };
        });
        return (
          <EidIndividualPartidaRow
            key={p.id}
            partida={{
              ...p,
              localLogoUrl: p.local_espaco_id != null && Number(p.local_espaco_id) > 0 ? localEspacoLogoMap.get(Number(p.local_espaco_id)) ?? null : null,
            }}
            selfNome={perfilNome}
            opponentId={oponenteId ?? id}
            opponentNome={oponenteNome}
            opponentAvatarUrl={oponente?.avatarUrl ?? null}
            opponentEidHref={
              oponenteId && p.esporte_id != null
                ? `/perfil/${encodeURIComponent(oponenteId)}/eid/${Number(p.esporte_id)}?from=${encodeURIComponent(`/perfil/${id}/historico`)}`
                : null
            }
            opponentNotaEid={oponenteNota}
            res={res}
            profileLinkFrom={`/perfil/${id}/historico`}
            torneioLabel={p.torneio_id ? "Torneio" : null}
            esporteLabel={esporteNome}
            modalidadeLabel={modalidadeFmt}
            totalConfrontos={confrontosMesmos.length}
            ultimosConfrontos={ultimosConfrontos}
          />
        );
      })}
    </ul>
  );
}
