import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { createClient } from "@/lib/supabase/server";

export type PerfilTimeEidRouteInput = {
  params: Promise<{ id: string; esporteId: string }>;
  searchParams?: Promise<{ from?: string; embed?: string }>;
};

function parseEsporteId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.trunc(n);
}

export type PerfilTimeEidSession = {
  timeId: number;
  esporteId: number;
  isEmbed: boolean;
  backHref: string;
  nextPath: string;
  nomeEsporte: string;
  tipoLabel: string;
  posicao: number;
  t: {
    nome: string | null;
    username: string | null;
    tipo: string | null;
    escudo: string | null;
    eid_time: number | null;
    pontos_ranking: number | null;
  };
  linkPerfil: string;
};

export const loadPerfilTimeEidSession = cache(async ({ params, searchParams }: PerfilTimeEidRouteInput): Promise<PerfilTimeEidSession> => {
  const { id: rawTime, esporteId: rawEsp } = await params;
  const timeId = Number(rawTime);
  if (!Number.isFinite(timeId) || timeId < 1) notFound();

  const esporteId = parseEsporteId(rawEsp);
  if (esporteId == null) notFound();

  const sp = (await searchParams) ?? {};
  const isEmbed = sp.embed === "1";
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

  const tipoFmt = String(t.tipo ?? "time").trim().toLowerCase();
  const tipoLabel = tipoFmt === "dupla" ? "Dupla" : tipoFmt === "time" ? "Time" : t.tipo ? String(t.tipo) : "Equipe";

  const linkPerfil = `/perfil-time/${timeId}${sp.from ? `?from=${encodeURIComponent(sp.from)}` : ""}`;

  return {
    timeId,
    esporteId,
    isEmbed,
    backHref,
    nextPath,
    nomeEsporte,
    tipoLabel,
    posicao,
    t: {
      nome: t.nome,
      username: t.username,
      tipo: t.tipo,
      escudo: t.escudo,
      eid_time: t.eid_time,
      pontos_ranking: t.pontos_ranking,
    },
    linkPerfil,
  };
});
