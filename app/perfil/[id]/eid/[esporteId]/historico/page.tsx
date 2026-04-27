import { notFound, redirect } from "next/navigation";
import { EidIndividualPartidaRow } from "@/components/perfil/eid-individual-partida-row";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { PROFILE_CARD_BASE, PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { partidaEncerradaParaHistorico, resultadoPartidaIndividual } from "@/lib/perfil/formacao-eid-stats";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string; esporteId: string }>;
  searchParams?: Promise<{ from?: string; embed?: string }>;
};

function parseEsporteId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.trunc(n);
}

export default async function PerfilEidEsporteHistoricoIndividualPage({ params, searchParams }: Props) {
  const { id: profileId, esporteId: esporteRaw } = await params;
  const sp = (await searchParams) ?? {};
  const isEmbed = sp.embed === "1";
  const esporteId = parseEsporteId(esporteRaw);
  if (esporteId == null) notFound();

  const historicoSelfQs = new URLSearchParams();
  if (typeof sp.from === "string" && sp.from) historicoSelfQs.set("from", sp.from);
  if (isEmbed) historicoSelfQs.set("embed", "1");
  const historicoPageHref = `/perfil/${encodeURIComponent(profileId)}/eid/${esporteId}/historico${
    historicoSelfQs.toString() ? `?${historicoSelfQs.toString()}` : ""
  }`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(historicoPageHref)}`);

  const { data: perfil } = await supabase.from("profiles").select("id, nome").eq("id", profileId).maybeSingle();
  if (!perfil) notFound();

  const { data: ue } = await supabase
    .from("usuario_eid")
    .select("id, esporte_id, esportes(nome)")
    .eq("usuario_id", profileId)
    .eq("esporte_id", esporteId)
    .maybeSingle();
  if (!ue) notFound();

  const esp = Array.isArray(ue.esportes) ? ue.esportes[0] : ue.esportes;
  const nomeEsporte = esp?.nome ?? "Esporte";

  const backFallbackQs = new URLSearchParams();
  backFallbackQs.set("view", "individual");
  if (isEmbed) backFallbackQs.set("embed", "1");
  const backFallback = `/perfil/${encodeURIComponent(profileId)}/eid/${esporteId}?${backFallbackQs.toString()}`;
  const backHref = resolveBackHref(typeof sp.from === "string" ? sp.from : undefined, backFallback);

  const { data: partidas } = await supabase
    .from("partidas")
    .select(
      "id, esporte_id, modalidade, jogador1_id, jogador2_id, placar_1, placar_2, status, status_ranking, torneio_id, data_resultado, data_registro, tipo_partida"
    )
    .eq("esporte_id", esporteId)
    .or(`jogador1_id.eq.${profileId},jogador2_id.eq.${profileId}`)
    .order("data_registro", { ascending: false })
    .limit(400);

  const lista = (partidas ?? []).filter((p) => {
    if (p.jogador1_id !== profileId && p.jogador2_id !== profileId) return false;
    if (!p.jogador1_id || !p.jogador2_id) return false;
    return partidaEncerradaParaHistorico(p);
  });

  const torneioIds = [
    ...new Set(lista.map((p) => p.torneio_id).filter((x): x is number => x != null && Number(x) > 0)),
  ];
  const torneioNome = new Map<number, string>();
  if (torneioIds.length > 0) {
    const { data: torRows } = await supabase.from("torneios").select("id, nome").in("id", torneioIds);
    for (const t of torRows ?? []) {
      if (t.id != null) torneioNome.set(Number(t.id), t.nome ?? `Torneio #${t.id}`);
    }
  }

  const opponentIds = [
    ...new Set(
      lista.map((p) => (p.jogador1_id === profileId ? p.jogador2_id : p.jogador1_id)).filter((x): x is string => !!x)
    ),
  ];
  const oponenteInfo = new Map<string, { nome: string; avatar_url: string | null; nota_eid: number | null }>();
  if (opponentIds.length > 0) {
    const { data: opRows } = await supabase.from("profiles").select("id, nome, avatar_url").in("id", opponentIds);
    const { data: opEidRows } = await supabase
      .from("usuario_eid")
      .select("usuario_id, nota_eid")
      .eq("esporte_id", esporteId)
      .in("usuario_id", opponentIds);
    const opEidMap = new Map<string, number | null>();
    for (const eidRow of opEidRows ?? []) {
      if (!eidRow.usuario_id) continue;
      opEidMap.set(eidRow.usuario_id, eidRow.nota_eid != null ? Number(eidRow.nota_eid) : null);
    }
    for (const r of opRows ?? []) {
      if (r.id) {
        oponenteInfo.set(r.id, {
          nome: r.nome ?? "Atleta",
          avatar_url: r.avatar_url ?? null,
          nota_eid: opEidMap.get(r.id) ?? null,
        });
      }
    }
  }

  return (
    <main className={PROFILE_PUBLIC_MAIN_CLASS}>
      {!isEmbed ? <PerfilBackLink href={backHref} label="Voltar" /> : null}

      <div className={`mt-3 overflow-hidden ${PROFILE_HERO_PANEL_CLASS} px-3 py-3 sm:px-4 sm:py-4`}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-eid-action-400">{nomeEsporte}</p>
        <h1 className="mt-1 text-base font-black leading-tight text-eid-fg sm:text-lg">Histórico individual</h1>
        <p className="mt-1 text-[10px] text-eid-text-secondary">{perfil.nome ?? "Atleta"} · todas as partidas 1v1 neste esporte</p>
      </div>

      {lista.length === 0 ? (
        <p className={`mt-4 p-4 text-[11px] text-eid-text-secondary ${PROFILE_CARD_BASE}`}>
          Nenhuma partida individual listada para este esporte.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {lista
            .filter((p) => {
              const oid = p.jogador1_id === profileId ? p.jogador2_id : p.jogador1_id;
              return !!oid;
            })
            .map((p) => {
            const oid = (p.jogador1_id === profileId ? p.jogador2_id : p.jogador1_id) as string;
            const op = oponenteInfo.get(oid);
            const res = resultadoPartidaIndividual(profileId, p);
            const torLabel = p.torneio_id ? torneioNome.get(Number(p.torneio_id)) ?? `Torneio #${p.torneio_id}` : null;
            const confrontosMesmos = lista.filter((h) => {
              const hOid = h.jogador1_id === profileId ? h.jogador2_id : h.jogador1_id;
              return hOid === oid;
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
              }).format(new Date(h.data_resultado ?? h.data_registro ?? Date.now()));
              return {
                id: h.id,
                dataHora,
                local: null,
                localHref: null,
                placar: `${Number(h.placar_1 ?? 0)} × ${Number(h.placar_2 ?? 0)}`,
                origem,
                confronto: `${perfil.nome ?? "Atleta"} vs ${op?.nome ?? "Atleta"}`,
              };
            });
            return (
              <EidIndividualPartidaRow
                key={p.id}
                partida={p}
                selfNome={perfil.nome ?? "Atleta"}
                opponentId={oid}
                opponentNome={op?.nome ?? "Atleta"}
                opponentAvatarUrl={op?.avatar_url ?? null}
                opponentNotaEid={op?.nota_eid ?? null}
                res={res}
                profileLinkFrom={historicoPageHref}
                torneioLabel={torLabel}
                esporteLabel={nomeEsporte}
                modalidadeLabel={String(p.modalidade ?? "individual")}
                totalConfrontos={confrontosMesmos.length}
                ultimosConfrontos={ultimosConfrontos}
              />
            );
          })}
        </ul>
      )}
    </main>
  );
}
