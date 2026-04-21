import Link from "next/link";
import { adminSetEspacoListagem, adminSetEspacoStatus } from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminLocaisPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role para listar locais.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("espacos_genericos")
    .select("id, slug, nome_publico, localizacao, status, operacao_status, aceita_socios, ativo_listagem, criado_em")
    .order("id", { ascending: false })
    .limit(200);
  if (error) {
    return <p className="text-sm text-red-300">{error.message}</p>;
  }

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Locais (espaços genéricos)</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">Últimos 200 cadastros.</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
        <table className="w-full min-w-[800px] text-left text-xs">
          <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Status</th>
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
                <td className="px-3 py-2 text-[11px] text-eid-text-secondary">
                  {l.operacao_status ?? "rascunho"}
                </td>
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
    </div>
  );
}
