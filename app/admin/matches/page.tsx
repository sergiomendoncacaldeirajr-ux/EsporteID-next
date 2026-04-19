import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminMatchesPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("matches")
    .select("id, status, esporte_id, modalidade_confronto, usuario_id, adversario_id, data_solicitacao, data_registro")
    .order("id", { ascending: false })
    .limit(200);
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Pedidos de match</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">Tabela `matches` — últimos 200.</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
        <table className="w-full min-w-[800px] text-left text-xs">
          <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
            <tr>
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Modalidade</th>
              <th className="px-2 py-2">Solicitante</th>
              <th className="px-2 py-2">Adversário</th>
              <th className="px-2 py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((m) => (
              <tr key={m.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                <td className="px-2 py-1.5 font-mono">{m.id}</td>
                <td className="px-2 py-1.5">{m.status ?? "—"}</td>
                <td className="px-2 py-1.5">{m.modalidade_confronto ?? "—"}</td>
                <td className="max-w-[120px] truncate px-2 py-1.5 font-mono text-[10px] text-eid-text-secondary">{m.usuario_id ?? "—"}</td>
                <td className="max-w-[120px] truncate px-2 py-1.5 font-mono text-[10px] text-eid-text-secondary">{m.adversario_id ?? "—"}</td>
                <td className="px-2 py-1.5 text-eid-text-secondary">
                  {m.data_solicitacao
                    ? new Date(m.data_solicitacao).toLocaleString("pt-BR")
                    : m.data_registro
                      ? new Date(m.data_registro).toLocaleString("pt-BR")
                      : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
