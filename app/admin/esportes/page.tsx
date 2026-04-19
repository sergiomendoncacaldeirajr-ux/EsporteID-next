import { adminSetEsporteAtivo } from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminEsportesPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role para listar esportes.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db.from("esportes").select("*").order("ordem", { ascending: true });
  if (error) {
    return <p className="text-sm text-red-300">{error.message}</p>;
  }

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Esportes</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">Ativar ou desativar modalidades no catálogo.</p>
      <div className="mt-4 space-y-2">
        {(data ?? []).map((e) => (
          <div
            key={e.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-eid-fg">{e.nome}</p>
              <p className="text-[11px] text-eid-text-secondary">
                slug {e.slug ?? "—"} · confronto {e.categoria_processamento ?? "—"}
              </p>
            </div>
            <div className="flex gap-2">
              {e.ativo ? (
                <form action={adminSetEsporteAtivo}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="ativo" value="false" />
                  <button type="submit" className="rounded-lg border border-red-400/40 px-2 py-1 text-[11px] font-bold text-red-200">
                    Desativar
                  </button>
                </form>
              ) : (
                <form action={adminSetEsporteAtivo}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="ativo" value="true" />
                  <button type="submit" className="rounded-lg border border-eid-primary-500/40 px-2 py-1 text-[11px] font-bold text-eid-primary-300">
                    Ativar
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
