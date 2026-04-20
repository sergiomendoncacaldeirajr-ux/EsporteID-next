import { notFound, redirect } from "next/navigation";
import { FormacaoEidEsporteView } from "@/components/perfil/formacao-eid-esporte-view";
import { resolveBackHref } from "@/lib/perfil/back-href";
import {
  carregarHistoricoNotasColetivo,
  carregarPartidasColetivasDoTime,
  mapNomesTimesAdversarios,
  mapTorneioNomes,
} from "@/lib/perfil/formacao-eid-stats";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string; esporteId: string }>;
  searchParams?: Promise<{ from?: string }>;
};

function parseEsporteId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.trunc(n);
}

export default async function PerfilTimeEidEsportePage({ params, searchParams }: Props) {
  const { id: rawTime, esporteId: rawEsp } = await params;
  const timeId = Number(rawTime);
  if (!Number.isFinite(timeId) || timeId < 1) notFound();

  const esporteId = parseEsporteId(rawEsp);
  if (esporteId == null) notFound();

  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath = `/perfil-time/${timeId}/eid/${esporteId}${sp.from ? `?from=${encodeURIComponent(sp.from)}` : ""}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  const backHref = resolveBackHref(sp.from, `/perfil-time/${timeId}`);

  const { data: t } = await supabase
    .from("times")
    .select("id, nome, username, tipo, escudo, pontos_ranking, eid_time, esporte_id, esportes(nome)")
    .eq("id", timeId)
    .maybeSingle();

  if (!t) notFound();
  if (Number(t.esporte_id) !== esporteId) notFound();

  const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
  const nomeEsporte = esp?.nome ?? "Esporte";

  const { count: acima } = await supabase
    .from("times")
    .select("id", { count: "exact", head: true })
    .eq("esporte_id", esporteId)
    .eq("tipo", t.tipo ?? "time")
    .gt("pontos_ranking", t.pontos_ranking ?? 0);

  const posicao = (acima ?? 0) + 1;

  const partidas = await carregarPartidasColetivasDoTime(supabase, timeId, esporteId, user.id);
  const historicoNotas = await carregarHistoricoNotasColetivo(supabase, timeId);
  const torneioNome = await mapTorneioNomes(supabase, partidas);
  const nomeOponenteTime = await mapNomesTimesAdversarios(supabase, timeId, partidas);

  const tipoFmt = String(t.tipo ?? "time").trim().toLowerCase();
  const tipoLabel = tipoFmt === "dupla" ? "Dupla" : tipoFmt === "time" ? "Time" : t.tipo ? String(t.tipo) : "Equipe";

  const linkPerfil = `/perfil-time/${timeId}${sp.from ? `?from=${encodeURIComponent(sp.from)}` : ""}`;

  return (
    <FormacaoEidEsporteView
      backHref={backHref}
      nextPath={nextPath}
      nomeEsporte={nomeEsporte}
      titulo={t.nome ?? "Formação"}
      subtitulo={t.username ? `@${t.username}` : null}
      escudoUrl={t.escudo}
      escudoFallbackLetter={(t.tipo ?? "T").toUpperCase().slice(0, 1)}
      tipoLabel={tipoLabel}
      eidTime={Number(t.eid_time ?? 1)}
      pontosRanking={Number(t.pontos_ranking ?? 0)}
      posicaoRank={posicao}
      partidas={partidas}
      historicoNotas={historicoNotas}
      torneioNome={torneioNome}
      nomeOponenteTime={nomeOponenteTime}
      timeId={timeId}
      linkPerfilFormacao={linkPerfil}
    />
  );
}
