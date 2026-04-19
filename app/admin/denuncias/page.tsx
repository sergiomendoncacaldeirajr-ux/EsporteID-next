import { adminSetDenunciaStatus } from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

const ST = ["aberta", "em_analise", "resolvida", "arquivada"];

export default async function AdminDenunciasPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db.from("denuncias").select("*").order("id", { ascending: false }).limit(200);
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Denúncias</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">Últimas 200.</p>
      <div className="mt-4 space-y-3">
        {(data ?? []).map((d) => (
          <div key={d.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-xs font-mono text-eid-text-secondary">#{d.id}</p>
              <form action={adminSetDenunciaStatus} className="flex items-center gap-1">
                <input type="hidden" name="id" value={d.id} />
                <select name="status" defaultValue={d.status ?? "aberta"} className="eid-input-dark rounded-lg px-2 py-1 text-[11px]">
                  {ST.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button type="submit" className="rounded border border-eid-primary-500/40 px-2 py-1 text-[10px] font-bold text-eid-primary-300">
                  Salvar
                </button>
              </form>
            </div>
            <p className="mt-2 text-sm font-semibold text-eid-fg">{d.motivo}</p>
            {d.texto ? <p className="mt-1 text-sm text-eid-text-secondary">{d.texto}</p> : null}
            <p className="mt-2 text-[11px] text-eid-text-secondary">
              Alvo: {d.alvo_tipo} #{d.alvo_id} · denunciante: <span className="font-mono">{d.denunciante_id}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
