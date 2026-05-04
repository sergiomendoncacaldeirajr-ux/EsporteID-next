import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { resolverTimeIdParaDuplaRegistrada } from "@/lib/perfil/whatsapp-visibility";
import { createClient } from "@/lib/supabase/server";

export type PerfilDuplaEidRouteInput = {
  params: Promise<{ id: string; esporteId: string }>;
  searchParams?: Promise<{ from?: string; embed?: string }>;
};

function parseEsporteId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.trunc(n);
}

type DuplaRow = {
  id: number;
  username: string | null;
  player1_id: string;
  player2_id: string;
  esporte_id: number;
};

export type PerfilDuplaEidSessionNoTeam = {
  kind: "no_team";
  duplaId: number;
  esporteId: number;
  isEmbed: boolean;
  backHref: string;
  nextPath: string;
  nomeEsporte: string;
  linkPerfilDupla: string;
  dupla: DuplaRow;
};

export type PerfilDuplaEidSessionBadTeam = {
  kind: "bad_team";
  duplaId: number;
  isEmbed: boolean;
  backHref: string;
  linkPerfilDupla: string;
};

export type PerfilDuplaEidSessionOk = {
  kind: "ok";
  timeId: number;
  esporteId: number;
  duplaId: number;
  isEmbed: boolean;
  backHref: string;
  nextPath: string;
  nomeEsporte: string;
  linkPerfilDupla: string;
  posicao: number;
  subtitulo: string;
  t: {
    nome: string | null;
    username: string | null;
    tipo: string | null;
    escudo: string | null;
    eid_time: number | null;
    pontos_ranking: number | null;
  };
};

export type PerfilDuplaEidSession = PerfilDuplaEidSessionNoTeam | PerfilDuplaEidSessionBadTeam | PerfilDuplaEidSessionOk;

export const loadPerfilDuplaEidSession = cache(async ({ params, searchParams }: PerfilDuplaEidRouteInput): Promise<PerfilDuplaEidSession> => {
  const { id: rawDupla, esporteId: rawEsp } = await params;
  const duplaId = Number(rawDupla);
  if (!Number.isFinite(duplaId) || duplaId < 1) notFound();

  const esporteId = parseEsporteId(rawEsp);
  if (esporteId == null) notFound();

  const sp = (await searchParams) ?? {};
  const isEmbed = sp.embed === "1";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextPath = `/perfil-dupla/${duplaId}/eid/${esporteId}${sp.from ? `?from=${encodeURIComponent(sp.from)}` : ""}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  const backHref = resolveBackHref(sp.from, `/perfil-dupla/${duplaId}`);

  const { data: d } = await supabase
    .from("duplas")
    .select("id, username, player1_id, player2_id, esporte_id, esportes(nome)")
    .eq("id", duplaId)
    .maybeSingle();

  if (!d) notFound();
  if (Number(d.esporte_id) !== esporteId) notFound();

  const esp = Array.isArray(d.esportes) ? d.esportes[0] : d.esportes;
  const nomeEsporte = esp?.nome ?? "Esporte";

  const timeResolvidoId = await resolverTimeIdParaDuplaRegistrada(
    supabase,
    d.player1_id,
    d.player2_id,
    esporteId
  );

  const linkPerfilDupla = `/perfil-dupla/${duplaId}${sp.from ? `?from=${encodeURIComponent(sp.from)}` : ""}`;

  if (timeResolvidoId == null) {
    return {
      kind: "no_team",
      duplaId,
      esporteId,
      isEmbed,
      backHref,
      nextPath,
      nomeEsporte,
      linkPerfilDupla,
      dupla: d as DuplaRow,
    };
  }

  const { data: t } = await supabase
    .from("times")
    .select("id, nome, username, tipo, escudo, pontos_ranking, eid_time, esporte_id, esportes(nome)")
    .eq("id", timeResolvidoId)
    .maybeSingle();

  if (!t || Number(t.esporte_id) !== esporteId) {
    return {
      kind: "bad_team",
      duplaId,
      isEmbed,
      backHref,
      linkPerfilDupla,
    };
  }

  const timeId = Number(t.id);

  const { count: acima } = await supabase
    .from("times")
    .select("id", { count: "exact", head: true })
    .eq("esporte_id", esporteId)
    .eq("tipo", "dupla")
    .gt("pontos_ranking", t.pontos_ranking ?? 0);

  const posicao = (acima ?? 0) + 1;

  const subtitulo = `Dupla registrada #${duplaId}${t.username ? ` · @${t.username}` : ""}`;

  return {
    kind: "ok",
    timeId,
    esporteId,
    duplaId,
    isEmbed,
    backHref,
    nextPath,
    nomeEsporte,
    linkPerfilDupla,
    posicao,
    subtitulo,
    t: {
      nome: t.nome,
      username: t.username,
      tipo: t.tipo,
      escudo: t.escudo,
      eid_time: t.eid_time,
      pontos_ranking: t.pontos_ranking,
    },
  };
});
