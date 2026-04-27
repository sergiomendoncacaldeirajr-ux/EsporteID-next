import Link from "next/link";
import { adminCancelarLimparPartida } from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminPartidasPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("partidas")
    .select("id, match_id, status, esporte_id, jogador1_id, jogador2_id, time1_id, time2_id, torneio_id, data_partida, criado_em")
    .order("id", { ascending: false })
    .limit(200);
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Partidas</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">Últimas 200.</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
            <tr>
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Match</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Esp.</th>
              <th className="px-2 py-2">Torneio</th>
              <th className="px-2 py-2">Quando</th>
              <th className="px-2 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr key={p.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                <td className="px-2 py-1.5 font-mono text-eid-text-secondary">{p.id}</td>
                <td className="px-2 py-1.5 font-mono text-eid-text-secondary">{p.match_id ?? "—"}</td>
                <td className="px-2 py-1.5">{p.status ?? "—"}</td>
                <td className="px-2 py-1.5">{p.esporte_id ?? "—"}</td>
                <td className="px-2 py-1.5">
                  {p.torneio_id ? (
                    <Link href={`/torneios/${p.torneio_id}`} className="text-eid-primary-300 hover:underline" target="_blank" rel="noreferrer">
                      {p.torneio_id}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-2 py-1.5 text-eid-text-secondary">
                  {p.data_partida ? new Date(p.data_partida).toLocaleString("pt-BR") : p.criado_em ? new Date(p.criado_em).toLocaleString("pt-BR") : "—"}
                </td>
                <td className="px-2 py-1.5">
                  <form action={adminCancelarLimparPartida}>
                    <input type="hidden" name="partida_id" value={p.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-rose-200 hover:bg-rose-500/25"
                    >
                      Cancelar/Limpar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
