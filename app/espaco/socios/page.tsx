import { gerarCobrancaSocioEspacoAction, revisarDocumentoSocioEspacoAction, revisarSocioEspacoAction } from "@/app/espaco/actions";
import { getEspacoSelecionado } from "@/lib/espacos/server";

type Props = {
  searchParams?: Promise<{ espaco?: string }>;
};

export default async function EspacoSociosPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const espacoId = Number(sp.espaco ?? 0) || null;
  const { supabase, selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco/socios",
    espacoId,
  });

  const [{ data: socios }, { data: planos }, { data: documentos }] = await Promise.all([
    supabase
      .from("espaco_socios")
      .select("id, usuario_id, matricula, status, documentos_status, financeiro_status, motivo_rejeicao, motivo_bloqueio, profiles(nome), plano_socio_id")
      .eq("espaco_generico_id", selectedSpace.id)
      .order("id", { ascending: false }),
    supabase
      .from("espaco_planos_socio")
      .select("id, nome")
      .eq("espaco_generico_id", selectedSpace.id)
      .eq("ativo", true)
      .order("ordem", { ascending: true }),
    supabase
      .from("espaco_documentos_socio")
      .select("id, espaco_socio_id, tipo_documento, status, motivo_rejeicao, arquivo_path")
      .eq("espaco_generico_id", selectedSpace.id)
      .order("id", { ascending: false }),
  ]);

  const docsBySocio = new Map<number, typeof documentos>();
  for (const doc of documentos ?? []) {
    const key = Number(doc.espaco_socio_id ?? 0);
    if (!docsBySocio.has(key)) docsBySocio.set(key, []);
    docsBySocio.get(key)?.push(doc);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h2 className="text-lg font-bold text-eid-fg">Sócios e análise documental</h2>
        <div className="mt-4 space-y-4">
          {(socios ?? []).length ? (
            (socios ?? []).map((socio) => {
              const profile = Array.isArray(socio.profiles) ? socio.profiles[0] : socio.profiles;
              const docs = docsBySocio.get(Number(socio.id)) ?? [];
              return (
                <div
                  key={socio.id}
                  className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-eid-fg">
                        {profile?.nome ?? "Sócio"} · {socio.matricula ?? "Sem matrícula"}
                      </p>
                      <p className="mt-1 text-xs text-eid-text-secondary">
                        Status {socio.status} · docs {socio.documentos_status} · financeiro {socio.financeiro_status}
                      </p>
                      {socio.motivo_rejeicao ? (
                        <p className="mt-1 text-xs text-red-300">
                          Rejeição: {socio.motivo_rejeicao}
                        </p>
                      ) : null}
                      {socio.motivo_bloqueio ? (
                        <p className="mt-1 text-xs text-amber-200">
                          Bloqueio: {socio.motivo_bloqueio}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-full border border-eid-primary-500/25 bg-eid-primary-500/10 px-3 py-1 text-[11px] font-semibold text-eid-primary-300">
                      {docs.length} documento(s)
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-2">
                      {docs.length ? (
                        docs.map((doc) => (
                          <div
                            key={doc.id}
                            className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-3"
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide text-eid-fg">
                              {doc.tipo_documento}
                            </p>
                            <p className="mt-1 text-[11px] text-eid-text-secondary">
                              Status {doc.status}
                            </p>
                            {doc.motivo_rejeicao ? (
                              <p className="mt-1 text-[11px] text-red-300">
                                {doc.motivo_rejeicao}
                              </p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <form action={revisarDocumentoSocioEspacoAction}>
                                <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                                <input type="hidden" name="documento_id" value={doc.id} />
                                <input type="hidden" name="status" value="aprovado" />
                                <button className="rounded-lg border border-eid-primary-500/35 px-3 py-1.5 text-[11px] font-semibold text-eid-primary-300">
                                  Aprovar
                                </button>
                              </form>
                              <form action={revisarDocumentoSocioEspacoAction} className="flex flex-wrap gap-2">
                                <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                                <input type="hidden" name="documento_id" value={doc.id} />
                                <input type="hidden" name="status" value="rejeitado" />
                                <input
                                  name="motivo_rejeicao"
                                  placeholder="Motivo"
                                  className="eid-input-dark rounded-lg px-2 py-1 text-[11px]"
                                />
                                <button className="rounded-lg border border-red-400/35 px-3 py-1.5 text-[11px] font-semibold text-red-300">
                                  Rejeitar
                                </button>
                              </form>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-eid-text-secondary">
                          Nenhum documento enviado ainda.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-3">
                      <h3 className="text-sm font-bold text-eid-fg">Ações do sócio</h3>
                      <form action={revisarSocioEspacoAction} className="grid gap-2">
                        <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                        <input type="hidden" name="socio_id" value={socio.id} />
                        <select
                          name="plano_socio_id"
                          defaultValue={String(socio.plano_socio_id ?? planos?.[0]?.id ?? "")}
                          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                        >
                          <option value="">Sem plano</option>
                          {(planos ?? []).map((plano) => (
                            <option key={plano.id} value={plano.id}>
                              {plano.nome}
                            </option>
                          ))}
                        </select>
                        <textarea
                          name="motivo"
                          rows={2}
                          placeholder="Motivo/opcional"
                          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
                        />
                        <div className="flex flex-wrap gap-2">
                          {["ativo", "suspenso", "inadimplente", "rejeitado"].map((status) => (
                            <button
                              key={status}
                              type="submit"
                              name="status"
                              value={status}
                              className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-[11px] font-semibold text-eid-fg"
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </form>
                      <form action={gerarCobrancaSocioEspacoAction}>
                        <input type="hidden" name="espaco_id" value={selectedSpace.id} />
                        <input type="hidden" name="socio_id" value={socio.id} />
                        <button className="mt-2 w-full rounded-xl border border-eid-action-500/35 bg-eid-action-500/10 px-3 py-2 text-xs font-bold text-eid-action-400">
                          Gerar cobrança de mensalidade
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-eid-text-secondary">
              Nenhum sócio cadastrado ou em análise ainda.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h2 className="text-lg font-bold text-eid-fg">Status geral</h2>
        <div className="mt-4 space-y-2 text-sm text-eid-text-secondary">
          <p>Espaço: {selectedSpace.nome_publico}</p>
          <p>Sócios totais: {(socios ?? []).length}</p>
          <p>Documentos pendentes: {(documentos ?? []).filter((doc) => doc.status === "pendente").length}</p>
          <p>Documentos rejeitados: {(documentos ?? []).filter((doc) => doc.status === "rejeitado").length}</p>
        </div>
      </section>
    </div>
  );
}
