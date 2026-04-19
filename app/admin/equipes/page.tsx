import Link from "next/link";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminEquipesPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const [timesRes, duplasRes] = await Promise.all([
    db.from("times").select("id, nome, tipo, esporte_id, criador_id, vagas_abertas").order("id", { ascending: false }).limit(120),
    db.from("duplas").select("id, esporte_id, player1_id, player2_id").order("id", { ascending: false }).limit(120),
  ]);

  if (timesRes.error) return <p className="text-sm text-red-300">{timesRes.error.message}</p>;
  if (duplasRes.error) return <p className="text-sm text-red-300">{duplasRes.error.message}</p>;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-base font-bold text-eid-fg">Times</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">Últimos 120.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Vagas</th>
                <th className="px-3 py-2">App</th>
              </tr>
            </thead>
            <tbody>
              {(timesRes.data ?? []).map((t) => (
                <tr key={t.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                  <td className="px-3 py-2 font-mono">{t.id}</td>
                  <td className="px-3 py-2 font-medium text-eid-fg">{t.nome}</td>
                  <td className="px-3 py-2">{t.tipo}</td>
                  <td className="px-3 py-2">{t.vagas_abertas ? "sim" : "não"}</td>
                  <td className="px-3 py-2">
                    <Link href={`/perfil-time/${t.id}`} className="text-eid-primary-300 hover:underline" target="_blank" rel="noreferrer">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-eid-fg">Duplas</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">Últimos 120 registros.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Esporte</th>
                <th className="px-3 py-2">J1</th>
                <th className="px-3 py-2">J2</th>
                <th className="px-3 py-2">App</th>
              </tr>
            </thead>
            <tbody>
              {(duplasRes.data ?? []).map((d) => (
                <tr key={d.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                  <td className="px-3 py-2 font-mono">{d.id}</td>
                  <td className="px-3 py-2">{d.esporte_id}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-eid-text-secondary">{d.player1_id}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-eid-text-secondary">{d.player2_id}</td>
                  <td className="px-3 py-2">
                    <Link href={`/perfil-dupla/${d.id}`} className="text-eid-primary-300 hover:underline" target="_blank" rel="noreferrer">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
