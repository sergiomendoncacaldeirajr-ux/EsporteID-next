import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { publicarChaveTorneio } from "@/app/torneios/actions";
import { DrawPlannerForm } from "@/components/torneios/draw-planner-form";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { createClient } from "@/lib/supabase/server";
import { getTorneioStaffAccess } from "@/lib/torneios/staff";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

type DrawMeta = {
  publicado?: boolean;
};

type DrawParticipantView = {
  entityId: string;
  nome: string;
  seed: number;
};

type DrawGroupView = {
  id: string;
  nome: string;
  participantes?: DrawParticipantView[];
};

type DrawRoundMatchView = {
  id: string;
  lado_a?: { nome?: string | null } | null;
  lado_b?: { nome?: string | null } | null;
  fonte_a?: string | null;
  fonte_b?: string | null;
};

type DrawRoundView = {
  rodada: number;
  matches?: DrawRoundMatchView[];
};

type DrawDataView = {
  meta?: DrawMeta;
  groups?: DrawGroupView[];
  rounds?: DrawRoundView[];
};

export default async function TorneioChavePage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const backHref = resolveBackHref(sp.from, `/torneios/${id}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/torneios/${id}/chave`);

  const { data: t } = await supabase
    .from("torneios")
    .select("id, nome, criador_id, esporte_id")
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();

  const access = await getTorneioStaffAccess(supabase, id, user.id);
  const isOrganizer = t.criador_id === user.id;

  const [{ data: chave }, { data: inscricoes }, { data: jogos }] = await Promise.all([
    supabase.from("torneio_chaves").select("formato, dados_json, atualizado_em").eq("torneio_id", id).maybeSingle(),
    supabase.from("torneio_inscricoes").select("usuario_id, seed_ordem").eq("torneio_id", id).order("seed_ordem", { ascending: true }),
    supabase
      .from("torneio_jogos")
      .select("id, rodada, idx_rodada, status, observacoes")
      .eq("torneio_id", id)
      .order("rodada", { ascending: true })
      .order("idx_rodada", { ascending: true }),
  ]);

  const participantIds = [...new Set((inscricoes ?? []).map((item) => String(item.usuario_id ?? "")).filter(Boolean))];
  const [{ data: profiles }, { data: eids }] = await Promise.all([
    participantIds.length
      ? supabase.from("profiles").select("id, nome").in("id", participantIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string | null }> }),
    participantIds.length && t.esporte_id
      ? supabase.from("usuario_eid").select("usuario_id, nota_eid").eq("esporte_id", t.esporte_id).in("usuario_id", participantIds)
      : Promise.resolve({ data: [] as Array<{ usuario_id: string; nota_eid: number | null }> }),
  ]);
  const profileMap = new Map((profiles ?? []).map((profile) => [String(profile.id), profile.nome ?? "Atleta"]));
  const eidMap = new Map((eids ?? []).map((row) => [String(row.usuario_id), Number(row.nota_eid ?? 0)]));

  const drawData =
    chave?.dados_json && typeof chave.dados_json === "object" ? (chave.dados_json as DrawDataView) : null;
  const isPublished = Boolean(drawData?.meta?.publicado);
  const canSeeDraft = isOrganizer || access.isScorekeeper;
  const showDraw = isPublished || canSeeDraft;

  return (
    <main data-eid-touch-ui className="mx-auto w-full max-w-5xl px-3 pb-10 pt-3 sm:px-6 sm:pb-12 sm:pt-4">
        <PerfilBackLink href={backHref} label="Voltar ao torneio" />

        <div className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 md:rounded-3xl md:p-8">
          <div className="h-1 w-full rounded-full bg-gradient-to-r from-eid-primary-500 via-eid-action-500 to-eid-primary-400 md:h-1.5" />
          <h1 className="mt-4 text-xl font-black text-eid-fg md:text-2xl">Chaveamento</h1>
          <p className="mt-1 text-sm text-eid-text-secondary">{t.nome}</p>
        </div>

        {isOrganizer ? (
          <section className="mt-6">
            <DrawPlannerForm
              torneioId={id}
              participants={(inscricoes ?? []).map((item) => ({
                entityId: String(item.usuario_id),
                nome: profileMap.get(String(item.usuario_id)) ?? "Atleta",
                eid: eidMap.get(String(item.usuario_id)) ?? 0,
              }))}
            />
          </section>
        ) : null}

        {drawData && showDraw ? (
          <section className="mt-6 space-y-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 md:rounded-3xl md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Formato registrado</p>
                <p className="mt-2 text-sm text-eid-fg">{chave?.formato ?? "—"}</p>
                {chave?.atualizado_em ? (
                  <p className="mt-2 text-xs text-eid-text-secondary">
                    Atualizado em {new Date(chave.atualizado_em).toLocaleString("pt-BR")}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-eid-action-400">
                  {isPublished ? "Publicado" : "Rascunho"}
                </span>
                {isOrganizer && !isPublished ? (
                  <form action={publicarChaveTorneio}>
                    <input type="hidden" name="torneio_id" value={id} />
                    <button
                      type="submit"
                      className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1 text-[11px] font-bold text-eid-primary-300"
                    >
                      Publicar chave
                    </button>
                  </form>
                ) : null}
              </div>
            </div>

            {Array.isArray(drawData.groups) ? (
              <div className="grid gap-4 md:grid-cols-2">
                {drawData.groups.map((group) => (
                  <div key={group.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-4">
                    <p className="text-sm font-bold text-eid-fg">{group.nome}</p>
                    <ul className="mt-3 space-y-1 text-sm text-eid-text-secondary">
                      {(group.participantes ?? []).map((participant) => (
                        <li key={participant.entityId}>
                          <span className="font-semibold text-eid-fg">{participant.nome}</span> · seed {participant.seed}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}

            {Array.isArray(drawData.rounds) ? (
              <div className="grid gap-4">
                {drawData.rounds.map((round) => (
                  <div key={round.rodada} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-4">
                    <p className="text-sm font-bold text-eid-fg">Rodada {round.rodada}</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {(round.matches ?? []).map((match) => (
                        <div key={match.id} className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-3 text-sm">
                          <p className="font-semibold text-eid-fg">
                            {match.lado_a?.nome ?? match.fonte_a ?? "A definir"} x {match.lado_b?.nome ?? match.fonte_b ?? "A definir"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 p-4">
              <p className="text-sm font-bold text-eid-fg">Jogos publicados</p>
              {(jogos ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-eid-text-secondary">A chave ainda não gerou jogos operacionais.</p>
              ) : (
                <div className="mt-3 grid gap-2">
                  {(jogos ?? []).map((jogo) => (
                    <div key={jogo.id} className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-3 text-sm">
                      <p className="font-semibold text-eid-fg">
                        Rodada {jogo.rodada} · Jogo {jogo.idx_rodada}
                      </p>
                      <p className="mt-1 text-xs text-eid-text-secondary">
                        {jogo.status ?? "pendente"}
                        {jogo.observacoes ? ` · ${jogo.observacoes}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-8 text-center md:rounded-3xl">
            <p className="text-sm text-eid-text-secondary">
              {isOrganizer
                ? "Ainda não há chave gerada para este torneio. Use o formulário acima para criar um rascunho por EID, ordem manual ou sorteio aleatório."
                : "A chave deste torneio ainda não foi publicada pelo organizador."}
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-eid-text-secondary">
          <Link href={`/torneios/${id}?from=/torneios/${id}/chave`} className="font-bold text-eid-primary-300 hover:underline">
            Ver página do torneio
          </Link>
        </p>
      </main>
  );
}
