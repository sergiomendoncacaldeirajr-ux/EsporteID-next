import Link from "next/link";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminUsuariosPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role para listar usuários.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("profiles")
    .select("id, nome, tipo_usuario, perfil_completo, criado_em")
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error) {
    return <p className="text-sm text-red-300">{error.message}</p>;
  }

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Usuários</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">Últimos 200 perfis (ordem de cadastro).</p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Perfil</th>
              <th className="px-3 py-2">Cadastro</th>
              <th className="px-3 py-2">Ação</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr key={p.id} className="border-b border-[color:var(--eid-border-subtle)]/60">
                <td className="px-3 py-2 font-medium text-eid-fg">{p.nome ?? "—"}</td>
                <td className="px-3 py-2 text-eid-text-secondary">{p.tipo_usuario}</td>
                <td className="px-3 py-2">{p.perfil_completo ? "Completo" : "Pendente"}</td>
                <td className="px-3 py-2 text-eid-text-secondary">
                  {p.criado_em ? new Date(p.criado_em).toLocaleString("pt-BR") : "—"}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/perfil/${p.id}`} className="font-semibold text-eid-primary-300 hover:underline" target="_blank" rel="noreferrer">
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
