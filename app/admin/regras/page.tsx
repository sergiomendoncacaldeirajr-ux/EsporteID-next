import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminRegrasPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const [rr, rrm] = await Promise.all([
    db.from("regras_ranking").select("*, esportes(nome)").order("esporte_id", { ascending: true }).limit(100),
    db.from("regras_ranking_match").select("*, esportes(nome)").order("esporte_id", { ascending: true }).limit(100),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-base font-bold text-eid-fg">Regras de ranking (modalidade)</h2>
        <p className="mt-1 text-sm text-eid-text-secondary">Leitura via service role — ajustes finos podem ser feitos por migração SQL.</p>
        {rr.error ? <p className="text-red-300">{rr.error.message}</p> : null}
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">Esporte</th>
                <th className="px-2 py-2">Modalidade</th>
                <th className="px-2 py-2">Vitória</th>
                <th className="px-2 py-2">Derrota</th>
              </tr>
            </thead>
            <tbody>
              {(rr.data ?? []).map((r: Record<string, unknown>, i: number) => {
                const esp = r.esportes as { nome?: string } | null;
                return (
                  <tr key={`rr-${i}`} className="border-b border-[color:var(--eid-border-subtle)]/50">
                    <td className="px-2 py-1.5">{esp?.nome ?? r.esporte_id}</td>
                    <td className="px-2 py-1.5">{String(r.modalidade ?? "")}</td>
                    <td className="px-2 py-1.5">{String(r.pontos_vitoria ?? "")}</td>
                    <td className="px-2 py-1.5">{String(r.pontos_derrota ?? "")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-eid-fg">Regras ranking match (EID)</h2>
        {rrm.error ? <p className="text-red-300">{rrm.error.message}</p> : null}
        <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
              <tr>
                <th className="px-2 py-2">Esporte</th>
                <th className="px-2 py-2">K</th>
                <th className="px-2 py-2">Vitória</th>
                <th className="px-2 py-2">Derrota</th>
              </tr>
            </thead>
            <tbody>
              {(rrm.data ?? []).map((r: Record<string, unknown>, i: number) => {
                const esp = r.esportes as { nome?: string } | null;
                return (
                  <tr key={`rrm-${i}`} className="border-b border-[color:var(--eid-border-subtle)]/50">
                    <td className="px-2 py-1.5">{esp?.nome ?? r.esporte_id}</td>
                    <td className="px-2 py-1.5">{String(r.k_factor ?? "")}</td>
                    <td className="px-2 py-1.5">{String(r.pontos_vitoria ?? "")}</td>
                    <td className="px-2 py-1.5">{String(r.pontos_derrota ?? "")}</td>
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
