import Link from "next/link";
import { adminSetTorneioStatus } from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

const STATUS = ["aberto", "em_andamento", "encerrado", "cancelado"];

export default async function AdminTorneiosPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role para listar torneios.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db.from("torneios").select("id, nome, status, data_inicio, criador_id").order("id", { ascending: false }).limit(200);
  if (error) {
    return <p className="text-sm text-red-300">{error.message}</p>;
  }

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Torneios</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">Últimos 200 torneios.</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Início</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">App</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((t) => (
              <tr key={t.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                <td className="px-3 py-2 font-mono text-eid-text-secondary">{t.id}</td>
                <td className="px-3 py-2 font-medium text-eid-fg">{t.nome}</td>
                <td className="px-3 py-2 text-eid-text-secondary">
                  {t.data_inicio ? new Date(t.data_inicio).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="px-3 py-2">
                  <form action={adminSetTorneioStatus} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={t.id} />
                    <select name="status" defaultValue={t.status ?? "aberto"} className="eid-input-dark max-w-[140px] rounded-lg px-1 py-1 text-[11px]">
                      {STATUS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded border border-eid-primary-500/40 px-2 py-0.5 text-[10px] font-bold text-eid-primary-300">
                      OK
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/torneios/${t.id}`} className="text-eid-primary-300 hover:underline" target="_blank" rel="noreferrer">
                    Ver
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
