import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FormacaoEidEsporteView } from "@/components/perfil/formacao-eid-esporte-view";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { PROFILE_CARD_BASE, PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { resolveBackHref } from "@/lib/perfil/back-href";
import {
  carregarHistoricoNotasColetivo,
  carregarPartidasColetivasDoTime,
  mapNomesTimesAdversarios,
  mapTorneioNomes,
} from "@/lib/perfil/formacao-eid-stats";
import { resolverTimeIdParaDuplaRegistrada } from "@/lib/perfil/whatsapp-visibility";
import { createClient } from "@/lib/supabase/server";

export type PerfilDuplaEidStreamProps = {
  params: Promise<{ id: string; esporteId: string }>;
  searchParams?: Promise<{ from?: string; embed?: string }>;
};

function parseEsporteId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.trunc(n);
}

export async function PerfilDuplaEidEsporteStream({ params, searchParams }: PerfilDuplaEidStreamProps) {
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
    return (
      <main className={PROFILE_PUBLIC_MAIN_CLASS}>
        <PerfilBackLink href={backHref} label="Voltar" />
        <div className={`mt-4 p-4 ${PROFILE_HERO_PANEL_CLASS}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-eid-action-500">Dupla · {nomeEsporte}</p>
          <h1 className="mt-1 text-lg font-black text-eid-fg">Dupla #{duplaId}</h1>
          {d.username ? <p className="text-xs text-eid-primary-300">@{d.username}</p> : null}
          <p className="mt-3 text-sm text-eid-text-secondary">
            Ainda não há um <strong className="text-eid-fg">time de dupla ativo</strong> no ranking com os dois atletas neste
            esporte. As estatísticas de EID em equipe aparecem quando a formação existir no radar.
          </p>
          <Link
            href={linkPerfilDupla}
            className="mt-4 inline-flex text-sm font-semibold text-eid-primary-400 hover:underline"
          >
            ← Ver perfil da dupla
          </Link>
        </div>
      </main>
    );
  }

  const { data: t } = await supabase
    .from("times")
    .select("id, nome, username, tipo, escudo, pontos_ranking, eid_time, esporte_id, esportes(nome)")
    .eq("id", timeResolvidoId)
    .maybeSingle();

  if (!t || Number(t.esporte_id) !== esporteId) {
    return (
      <main className={PROFILE_PUBLIC_MAIN_CLASS}>
        <PerfilBackLink href={backHref} label="Voltar" />
        <div className={`mt-4 p-4 ${PROFILE_CARD_BASE} border-amber-500/30`}>
          <p className="text-sm text-eid-text-secondary">
            O time vinculado a esta dupla está em outro esporte ou foi alterado. Abra o{" "}
            <Link href={linkPerfilDupla} className="font-semibold text-eid-primary-400 underline">
              perfil da dupla
            </Link>{" "}
            para conferir.
          </p>
        </div>
      </main>
    );
  }

  const timeId = Number(t.id);

  const { count: acima } = await supabase
    .from("times")
    .select("id", { count: "exact", head: true })
    .eq("esporte_id", esporteId)
    .eq("tipo", "dupla")
    .gt("pontos_ranking", t.pontos_ranking ?? 0);

  const posicao = (acima ?? 0) + 1;

  const partidas = await carregarPartidasColetivasDoTime(supabase, timeId, esporteId, user.id);
  const historicoNotas = await carregarHistoricoNotasColetivo(supabase, timeId);
  const torneioNome = await mapTorneioNomes(supabase, partidas);
  const nomeOponenteTime = await mapNomesTimesAdversarios(supabase, timeId, partidas);

  return (
    <FormacaoEidEsporteView
      backHref={backHref}
      nextPath={nextPath}
      nomeEsporte={nomeEsporte}
      titulo={t.nome ?? "Dupla"}
      subtitulo={`Dupla registrada #${duplaId}${t.username ? ` · @${t.username}` : ""}`}
      escudoUrl={t.escudo}
      escudoFallbackLetter="D"
      tipoLabel="Dupla"
      eidTime={Number(t.eid_time ?? 0)}
      pontosRanking={Number(t.pontos_ranking ?? 0)}
      posicaoRank={posicao}
      partidas={partidas}
      historicoNotas={historicoNotas}
      torneioNome={torneioNome}
      nomeOponenteTime={nomeOponenteTime}
      timeId={timeId}
      linkPerfilFormacao={linkPerfilDupla}
      duplaRegistroLinks={[{ id: duplaId, href: linkPerfilDupla }]}
      showBackLink={!isEmbed}
    />
  );
}
