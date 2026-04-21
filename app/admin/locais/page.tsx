import Link from "next/link";
import { adminReviewEspacoClaim, adminSetEspacoListagem, adminSetEspacoStatus } from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminLocaisPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role para listar locais.</p>;
  }
  const db = createServiceRoleClient();
  const [locaisRes, claimsRes] = await Promise.all([
    db
      .from("espacos_genericos")
      .select("id, slug, nome_publico, localizacao, status, operacao_status, aceita_socios, ativo_listagem, ownership_status, criado_em")
      .order("id", { ascending: false })
      .limit(200),
    db
      .from("espaco_reivindicacoes")
      .select("id, espaco_generico_id, solicitante_id, documento_arquivo, mensagem, status, criado_em, revisado_em, observacoes_admin")
      .order("criado_em", { ascending: false })
      .limit(80),
  ]);
  const data = locaisRes.data;
  const error = locaisRes.error;
  if (error) {
    return <p className="text-sm text-red-300">{error.message}</p>;
  }

  const claims = claimsRes.data ?? [];
  const espacoIds = [...new Set(claims.map((claim) => Number(claim.espaco_generico_id)).filter(Number.isFinite))];
  const solicitanteIds = [...new Set(claims.map((claim) => String(claim.solicitante_id ?? "")).filter(Boolean))];
  const [{ data: espacosMapRows }, { data: perfisMapRows }] = await Promise.all([
    espacoIds.length
      ? db.from("espacos_genericos").select("id, nome_publico, localizacao").in("id", espacoIds)
      : Promise.resolve({ data: [] as Array<{ id: number; nome_publico: string | null; localizacao: string | null }> }),
    solicitanteIds.length
      ? db.from("profiles").select("id, nome").in("id", solicitanteIds)
      : Promise.resolve({ data: [] as Array<{ id: string; nome: string | null }> }),
  ]);
  const espacoMap = new Map((espacosMapRows ?? []).map((item) => [Number(item.id), item]));
  const perfilMap = new Map((perfisMapRows ?? []).map((item) => [String(item.id), item]));
  const signedUrls = await Promise.all(
    claims.map(async (claim) => {
      if (!claim.documento_arquivo) return [claim.id, null] as const;
      const { data: signed } = await db.storage.from("espaco-documentos").createSignedUrl(claim.documento_arquivo, 60 * 30);
      return [claim.id, signed?.signedUrl ?? null] as const;
    })
  );
  const signedUrlMap = new Map<number, string | null>(signedUrls);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-base font-bold text-eid-fg">Locais (espaços genéricos)</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">Últimos 200 cadastros.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Posse</th>
                <th className="px-3 py-2">Operação</th>
                <th className="px-3 py-2">Listagem</th>
                <th className="px-3 py-2">App</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((l) => (
                <tr key={l.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                  <td className="px-3 py-2 font-mono text-eid-text-secondary">{l.id}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium text-eid-fg">{l.nome_publico}</span>
                    <span className="mt-0.5 block text-[11px] text-eid-text-secondary">{l.localizacao}</span>
                    <span className="mt-0.5 block text-[11px] text-eid-text-secondary">
                      {l.slug ? `/${l.slug}` : "Sem slug"} · {l.aceita_socios ? "aceita sócios" : "sem adesão"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <form action={adminSetEspacoStatus} className="flex flex-wrap items-center gap-1">
                      <input type="hidden" name="id" value={l.id} />
                      <input type="text" name="status" defaultValue={l.status ?? ""} className="eid-input-dark w-28 rounded px-1 py-0.5 text-[11px]" />
                      <button type="submit" className="text-[10px] font-bold text-eid-primary-300">
                        Salvar
                      </button>
                    </form>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-eid-text-secondary">{l.ownership_status ?? "generico"}</td>
                  <td className="px-3 py-2 text-[11px] text-eid-text-secondary">{l.operacao_status ?? "rascunho"}</td>
                  <td className="px-3 py-2">
                    {l.ativo_listagem ? (
                      <form action={adminSetEspacoListagem}>
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="ativo_listagem" value="false" />
                        <button type="submit" className="text-[11px] font-bold text-amber-200">
                          Ocultar lista
                        </button>
                      </form>
                    ) : (
                      <form action={adminSetEspacoListagem}>
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="ativo_listagem" value="true" />
                        <button type="submit" className="text-[11px] font-bold text-eid-primary-300">
                          Publicar lista
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Link href={l.slug ? `/espaco/${l.slug}` : `/local/${l.id}`} className="text-eid-primary-300 hover:underline" target="_blank" rel="noreferrer">
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-eid-fg">Reivindicações de posse</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">Pedidos com documento comprobatório para validação oficial.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-3 py-2">Espaço</th>
                <th className="px-3 py-2">Solicitante</th>
                <th className="px-3 py-2">Documento</th>
                <th className="px-3 py-2">Mensagem</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Decisão</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => {
                const espaco = espacoMap.get(Number(claim.espaco_generico_id));
                const profile = perfilMap.get(String(claim.solicitante_id ?? ""));
                return (
                  <tr key={claim.id} className="border-b border-[color:var(--eid-border-subtle)]/50 align-top">
                    <td className="px-3 py-2">
                      <p className="font-medium text-eid-fg">{espaco?.nome_publico ?? `Espaço #${claim.espaco_generico_id}`}</p>
                      <p className="mt-0.5 text-[11px] text-eid-text-secondary">{espaco?.localizacao ?? "Localização não informada"}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-eid-fg">{profile?.nome ?? claim.solicitante_id}</p>
                      <p className="mt-0.5 text-[11px] text-eid-text-secondary">
                        {claim.criado_em ? new Date(claim.criado_em).toLocaleString("pt-BR") : "—"}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      {signedUrlMap.get(claim.id) ? (
                        <a
                          href={signedUrlMap.get(claim.id) ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-eid-primary-300 hover:underline"
                        >
                          Abrir arquivo
                        </a>
                      ) : (
                        <span className="text-eid-text-secondary">Sem arquivo</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-eid-text-secondary">
                      {claim.mensagem ?? "Sem mensagem"}
                      {claim.observacoes_admin ? <p className="mt-1 text-amber-200">Admin: {claim.observacoes_admin}</p> : null}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-eid-text-secondary">
                      <p>{claim.status ?? "pendente"}</p>
                      {claim.revisado_em ? <p className="mt-0.5">Revisto em {new Date(claim.revisado_em).toLocaleString("pt-BR")}</p> : null}
                    </td>
                    <td className="px-3 py-2">
                      <form action={adminReviewEspacoClaim} className="space-y-2">
                        <input type="hidden" name="claim_id" value={claim.id} />
                        <textarea
                          name="observacoes_admin"
                          rows={3}
                          defaultValue={claim.observacoes_admin ?? ""}
                          className="eid-input-dark w-64 rounded px-2 py-1 text-[11px]"
                          placeholder="Observações da revisão"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            name="decision"
                            value="aprovar"
                            className="rounded border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-200"
                          >
                            Aprovar
                          </button>
                          <button
                            type="submit"
                            name="decision"
                            value="rejeitar"
                            className="rounded border border-red-500/35 bg-red-500/10 px-2 py-1 text-[11px] font-bold text-red-200"
                          >
                            Rejeitar
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
