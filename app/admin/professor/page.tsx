import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminProfessorPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const [{ data: sol }, { data: aulas, error }] = await Promise.all([
    db
      .from("professor_solicitacoes_aula")
      .select("id, professor_id, aluno_id, esporte_id, status, mensagem, criado_em")
      .order("id", { ascending: false })
      .limit(100),
    db
      .from("professor_aulas")
      .select("id, professor_id, titulo, status, inicio, fim, criado_em")
      .order("id", { ascending: false })
      .limit(80),
  ]);
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Professor — solicitações e aulas</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">
        Leitura operacional. Ajustes finos de política e taxas em{" "}
        <a href="/admin/financeiro" className="font-semibold text-eid-primary-300 underline">
          Financeiro
        </a>
        ; regras de produto em{" "}
        <a href="/admin/regras" className="font-semibold text-eid-primary-300 underline">
          Ranking &amp; desafio
        </a>
        .
      </p>

      <h3 className="mt-8 text-sm font-bold text-eid-fg">Solicitações de aula (últimas 100)</h3>
      <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
        <table className="w-full min-w-[800px] text-left text-xs">
          <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
            <tr>
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Professor</th>
              <th className="px-2 py-2">Aluno</th>
              <th className="px-2 py-2">Esporte</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Criada</th>
            </tr>
          </thead>
          <tbody>
            {(sol ?? []).map((r) => (
              <tr key={r.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                <td className="px-2 py-1.5 font-mono">{r.id}</td>
                <td className="max-w-[100px] truncate px-2 py-1.5 font-mono text-[10px]">{r.professor_id}</td>
                <td className="max-w-[100px] truncate px-2 py-1.5 font-mono text-[10px]">{r.aluno_id}</td>
                <td className="px-2 py-1.5">{r.esporte_id ?? "—"}</td>
                <td className="px-2 py-1.5">{r.status ?? "—"}</td>
                <td className="px-2 py-1.5 text-eid-text-secondary">
                  {r.criado_em ? new Date(r.criado_em).toLocaleString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-10 text-sm font-bold text-eid-fg">Aulas cadastradas (últimas 80)</h3>
      <div className="mt-3 overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-[color:var(--eid-border-subtle)] bg-eid-card text-[10px] font-bold uppercase text-eid-text-secondary">
            <tr>
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Professor</th>
              <th className="px-2 py-2">Título</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Início</th>
            </tr>
          </thead>
          <tbody>
            {(aulas ?? []).map((r) => (
              <tr key={r.id} className="border-b border-[color:var(--eid-border-subtle)]/50">
                <td className="px-2 py-1.5 font-mono">{r.id}</td>
                <td className="max-w-[100px] truncate px-2 py-1.5 font-mono text-[10px]">{r.professor_id}</td>
                <td className="max-w-xs truncate px-2 py-1.5">{r.titulo ?? "—"}</td>
                <td className="px-2 py-1.5">{r.status ?? "—"}</td>
                <td className="px-2 py-1.5 text-eid-text-secondary">
                  {r.inicio ? new Date(r.inicio).toLocaleString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
