import { adminAddPlatformAdmin, adminRemovePlatformAdmin } from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminAdminsPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role para gerenciar administradores.</p>;
  }
  const db = createServiceRoleClient();
  const { data: rows, error } = await db.from("platform_admins").select("user_id, criado_em").order("criado_em", { ascending: true });
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;

  const ids = (rows ?? []).map((r) => r.user_id);
  const { data: profs } = ids.length ? await db.from("profiles").select("id, nome").in("id", ids) : { data: [] };
  const nomePorId = new Map((profs ?? []).map((p) => [p.id, p.nome]));

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Administradores da plataforma</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">
        Apenas e-mails com conta no Auth podem ser promovidos. A chave service role fica só no servidor.
      </p>

      <form action={adminAddPlatformAdmin} className="mt-6 flex max-w-lg flex-col gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-semibold text-eid-text-secondary">
          E-mail do usuário
          <input type="email" name="email" required placeholder="atleta@email.com" className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="eid-btn-primary min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-bold">
          Adicionar admin
        </button>
      </form>

      <ul className="mt-8 space-y-2">
        {(rows ?? []).map((r) => (
          <li
            key={r.user_id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2"
          >
            <div>
              <p className="text-sm font-semibold text-eid-fg">{nomePorId.get(r.user_id) ?? "—"}</p>
              <p className="font-mono text-[11px] text-eid-text-secondary">{r.user_id}</p>
              <p className="text-[10px] text-eid-text-muted">desde {r.criado_em ? new Date(r.criado_em).toLocaleString("pt-BR") : "—"}</p>
            </div>
            <form action={adminRemovePlatformAdmin}>
              <input type="hidden" name="user_id" value={r.user_id} />
              <button type="submit" className="rounded-lg border border-red-400/40 px-2 py-1 text-[11px] font-bold text-red-200">
                Remover
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
