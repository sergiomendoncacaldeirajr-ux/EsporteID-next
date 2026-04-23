import Link from "next/link";
import { redirect } from "next/navigation";
import { CandidatarNaVagaForm, CancelarCandidaturaForm, ResponderCandidaturaForm } from "@/components/vagas/vagas-actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Vagas",
  description: "Vagas abertas em times e duplas no EsporteID",
};

function cityHint(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.split(",")[0]?.trim().toLowerCase() ?? "";
}

export default async function VagasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/vagas");

  const [{ data: me }, { data: meusEsportes }, { data: minhasFormacoes }] = await Promise.all([
    supabase.from("profiles").select("id, localizacao").eq("id", user.id).maybeSingle(),
    supabase.from("usuario_eid").select("esporte_id").eq("usuario_id", user.id),
    supabase.from("times").select("id").eq("criador_id", user.id),
  ]);

  const meuEsporteIds = new Set((meusEsportes ?? []).map((x) => Number(x.esporte_id)).filter((n) => Number.isFinite(n)));
  const minhasFormacoesIds = new Set((minhasFormacoes ?? []).map((x) => Number(x.id)).filter((n) => Number.isFinite(n)));
  const meuHintCidade = cityHint(me?.localizacao ?? null);

  const [{ data: vagasRaw }, { data: minhasCandidaturasRaw }, { data: recebidasRaw }] = await Promise.all([
    supabase
      .from("times")
      .select("id, nome, tipo, localizacao, nivel_procurado, esporte_id, escudo, criador_id, esportes(nome), vagas_abertas, aceita_pedidos")
      .eq("vagas_abertas", true)
      .eq("aceita_pedidos", true)
      .order("id", { ascending: false })
      .limit(120),
    supabase
      .from("time_candidaturas")
      .select("id, status, mensagem, criado_em, respondido_em, time_id, times(id, nome, tipo, localizacao)")
      .eq("candidato_usuario_id", user.id)
      .order("criado_em", { ascending: false })
      .limit(50),
    supabase
      .from("time_candidaturas")
      .select("id, status, mensagem, criado_em, time_id, candidato_usuario_id, times!inner(id, nome, criador_id, tipo)")
      .eq("times.criador_id", user.id)
      .order("criado_em", { ascending: false })
      .limit(80),
  ]);

  const candidatoIds = [...new Set((recebidasRaw ?? []).map((c) => String(c.candidato_usuario_id ?? "")).filter(Boolean))];
  const { data: candidatosRows } = candidatoIds.length
    ? await supabase.from("profiles").select("id, nome, avatar_url, localizacao").in("id", candidatoIds)
    : { data: [] as Array<{ id: string; nome: string | null; avatar_url: string | null; localizacao: string | null }> };
  const candidatoMap = new Map((candidatosRows ?? []).map((p) => [String(p.id), p]));

  const minhasCandidaturasMap = new Map<number, { id: number; status: string }>();
  for (const c of minhasCandidaturasRaw ?? []) {
    const timeId = Number(c.time_id);
    if (!Number.isFinite(timeId)) continue;
    minhasCandidaturasMap.set(timeId, { id: Number(c.id), status: String(c.status ?? "pendente") });
  }

  const vagasOrdenadas = (vagasRaw ?? [])
    .filter((t) => Number(t.id) > 0 && t.criador_id !== user.id && !minhasFormacoesIds.has(Number(t.id)))
    .map((t) => {
      const esporte = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
      const esporteMatch = t.esporte_id != null && meuEsporteIds.has(Number(t.esporte_id));
      const sameCity = meuHintCidade.length > 0 && cityHint(t.localizacao).includes(meuHintCidade);
      return {
        ...t,
        esporteNome: esporte?.nome ?? "Esporte",
        score: (esporteMatch ? 3 : 0) + (sameCity ? 2 : 0),
        esporteMatch,
        sameCity,
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
      <div className="relative mb-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 md:overflow-hidden md:rounded-3xl md:border-eid-primary-500/25 md:bg-gradient-to-br md:from-eid-card md:via-eid-card md:to-eid-primary-500/10 md:p-7">
        <div className="pointer-events-none absolute -left-10 top-0 hidden h-40 w-40 rounded-full bg-eid-primary-500/20 blur-3xl md:block" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-eid-fg md:text-3xl">Vagas</h1>
            <p className="mt-1 text-sm text-eid-text-secondary">
              Encontre vagas de time/dupla, candidate-se e acompanhe aprovação em tempo real.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/times" className="rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-bold text-eid-fg">
              Gerir formações
            </Link>
            <Link href="/comunidade" className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-2 text-xs font-bold text-eid-primary-300">
              Social
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
          <h2 className="text-sm font-bold text-eid-fg">Sugestões de vagas para você</h2>
          <p className="mt-1 text-xs text-eid-text-secondary">
            Priorizamos por esporte do seu perfil e proximidade de cidade.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {vagasOrdenadas.length ? (
              vagasOrdenadas.slice(0, 24).map((vaga) => {
                const candidatura = minhasCandidaturasMap.get(Number(vaga.id));
                return (
                  <div key={vaga.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 p-3">
                    <div className="flex items-start gap-2">
                      {vaga.escudo ? (
                        <img src={vaga.escudo} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-black text-eid-fg">
                          VG
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-eid-fg">{vaga.nome ?? "Formação"}</p>
                        <p className="truncate text-[11px] text-eid-text-secondary">
                          {(vaga.tipo ?? "time").toUpperCase()} · {vaga.esporteNome}
                        </p>
                        <p className="truncate text-[11px] text-eid-text-secondary">{vaga.localizacao ?? "Sem localização"}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {vaga.esporteMatch ? (
                        <span className="rounded-full border border-eid-primary-500/35 px-2 py-0.5 text-[10px] font-semibold text-eid-primary-300">
                          Esporte compatível
                        </span>
                      ) : null}
                      {vaga.sameCity ? (
                        <span className="rounded-full border border-eid-action-500/35 px-2 py-0.5 text-[10px] font-semibold text-eid-action-400">
                          Cidade próxima
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[11px] text-eid-text-secondary">
                      Nível procurado: {vaga.nivel_procurado ?? "a definir"}
                    </p>
                    <div className="mt-3">
                      {candidatura ? (
                        <>
                          <p className="mb-2 text-[11px] font-semibold text-eid-primary-300">
                            Status da sua candidatura: {candidatura.status}
                          </p>
                          {candidatura.status === "pendente" ? (
                            <CancelarCandidaturaForm candidaturaId={candidatura.id} />
                          ) : (
                            <Link
                              href={`/perfil-time/${vaga.id}?from=/vagas`}
                              className="inline-flex rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-fg"
                            >
                              Ver formação
                            </Link>
                          )}
                        </>
                      ) : (
                        <CandidatarNaVagaForm timeId={Number(vaga.id)} />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-4 text-sm text-eid-text-secondary md:col-span-2">
                Não encontramos vagas abertas compatíveis no momento.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
            <h2 className="text-sm font-bold text-eid-fg">Minhas candidaturas</h2>
            <div className="mt-3 space-y-2">
              {(minhasCandidaturasRaw ?? []).length ? (
                (minhasCandidaturasRaw ?? []).map((c) => {
                  const time = Array.isArray(c.times) ? c.times[0] : c.times;
                  return (
                    <div key={c.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 p-3">
                      <p className="text-xs font-semibold text-eid-fg">{time?.nome ?? "Formação"}</p>
                      <p className="text-[11px] text-eid-text-secondary">
                        {(time?.tipo ?? "time").toUpperCase()} · {time?.localizacao ?? "Sem localização"}
                      </p>
                      <p className="mt-1 text-[11px] text-eid-primary-300">Status: {String(c.status ?? "pendente")}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-eid-text-secondary">Você ainda não enviou candidaturas.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
            <h2 className="text-sm font-bold text-eid-fg">Candidaturas recebidas</h2>
            <p className="mt-1 text-xs text-eid-text-secondary">Aparece para quem é líder de time/dupla.</p>
            <div className="mt-3 space-y-2">
              {(recebidasRaw ?? []).length ? (
                (recebidasRaw ?? []).map((c) => {
                  const time = Array.isArray(c.times) ? c.times[0] : c.times;
                  const candidato = candidatoMap.get(String(c.candidato_usuario_id ?? ""));
                  return (
                    <div key={c.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 p-3">
                      <div className="flex items-start gap-2">
                        {candidato?.avatar_url ? (
                          <img src={candidato.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="grid h-9 w-9 place-items-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-black text-eid-fg">
                            AT
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-eid-fg">{candidato?.nome ?? "Atleta"}</p>
                          <p className="truncate text-[11px] text-eid-text-secondary">{candidato?.localizacao ?? "Sem localização"}</p>
                          <p className="mt-1 text-[11px] text-eid-text-secondary">
                            {time?.nome ?? "Formação"} · {(time?.tipo ?? "time").toUpperCase()}
                          </p>
                        </div>
                      </div>
                      {c.mensagem ? <p className="mt-2 text-[11px] text-eid-text-secondary">{String(c.mensagem)}</p> : null}
                      <p className="mt-2 text-[11px] text-eid-primary-300">Status: {String(c.status ?? "pendente")}</p>
                      {String(c.status ?? "pendente") === "pendente" ? (
                        <div className="mt-2 flex gap-2">
                          <ResponderCandidaturaForm candidaturaId={Number(c.id)} aceitar label="Aceitar" />
                          <ResponderCandidaturaForm candidaturaId={Number(c.id)} aceitar={false} label="Recusar" />
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-eid-text-secondary">Nenhuma candidatura recebida.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
