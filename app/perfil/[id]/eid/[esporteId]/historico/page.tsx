import { notFound, redirect } from "next/navigation";
import { EidIndividualPartidaRow } from "@/components/perfil/eid-individual-partida-row";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { PARTIDA_STATUS_CONCLUIDA, resultadoPartidaIndividual } from "@/lib/perfil/formacao-eid-stats";
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
      "id, esporte_id, modalidade, jogador1_id, jogador2_id, placar_1, placar_2, status, torneio_id, data_resultado, data_registro, tipo_partida"
    )
    .eq("esporte_id", esporteId)
    .or(`jogador1_id.eq.${profileId},jogador2_id.eq.${profileId}`)
    .order("data_registro", { ascending: false })
    .limit(400);

  const lista = (partidas ?? []).filter((p) => {
    if (p.jogador1_id !== profileId && p.jogador2_id !== profileId) return false;
    if (!p.jogador1_id || !p.jogador2_id) return false;
    const st = (p.status ?? "").toLowerCase();
    if (PARTIDA_STATUS_CONCLUIDA.has(st)) return true;
    return user.id === profileId;
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
  const oponenteInfo = new Map<string, { nome: string; avatar_url: string | null }>();
  if (opponentIds.length > 0) {
    const { data: opRows } = await supabase.from("profiles").select("id, nome, avatar_url").in("id", opponentIds);
    for (const r of opRows ?? []) {
      if (r.id) oponenteInfo.set(r.id, { nome: r.nome ?? "Atleta", avatar_url: r.avatar_url ?? null });
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg px-2.5 pb-8 pt-2 sm:max-w-2xl sm:px-5 sm:pt-3">
      {!isEmbed ? <PerfilBackLink href={backHref} label="Voltar" /> : null}

      <div className="mt-3 overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.3)] sm:px-4 sm:py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-eid-action-400">{nomeEsporte}</p>
        <h1 className="mt-1 text-base font-black leading-tight text-eid-fg sm:text-lg">Histórico individual</h1>
        <p className="mt-1 text-[10px] text-eid-text-secondary">{perfil.nome ?? "Atleta"} · todas as partidas 1v1 neste esporte</p>
      </div>

      {lista.length === 0 ? (
        <p className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-[11px] text-eid-text-secondary">
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
            return (
              <EidIndividualPartidaRow
                key={p.id}
                partida={p}
                opponentId={oid}
                opponentNome={op?.nome ?? "Atleta"}
                opponentAvatarUrl={op?.avatar_url ?? null}
                res={res}
                profileLinkFrom={historicoPageHref}
                torneioLabel={torLabel}
              />
            );
          })}
        </ul>
      )}
    </main>
  );
}
