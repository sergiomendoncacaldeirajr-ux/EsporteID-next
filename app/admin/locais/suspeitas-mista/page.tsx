import Link from "next/link";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";
import { recalcularFlagSuspeitoMistaSohGratuitas } from "@/lib/espacos/suspeita-mista";

export const dynamic = "force-dynamic";

export default async function AdminLocaisSuspeitaMistaPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Service role necessária.</p>;
  }
  const db = createServiceRoleClient();
  const alertas = await recalcularFlagSuspeitoMistaSohGratuitas(db, "all");

  const { data: marcados } = await db
    .from("espacos_genericos")
    .select("id, nome_publico, ownership_verificado_em, operacao_suspeita_observacao, modo_reserva, ownership_status")
    .eq("operacao_suspeita_somente_reservas_gratis", true)
    .order("id", { ascending: false })
    .limit(100);

  return (
    <div className="max-w-4xl space-y-4">
      <p className="text-[11px] text-eid-text-secondary">
        <Link href="/admin/locais" className="font-semibold text-eid-primary-300 hover:underline">
          ← Locais
        </Link>
      </p>
      <h1 className="text-lg font-bold text-eid-fg">Suspeita: reservas mista só com vagas “gratuitas”</h1>
      <p className="text-sm text-eid-text-secondary">
        Locais com modo de reservas <strong className="text-eid-fg">mista</strong>, posse verificada há mais de 15 dias, com pelo menos uma
        reserva de valor aparentemente gratuito e nenhuma reserva paga (não cancelada). A lista é recalculada a cada acesso. Use
        isso para contato, bloqueio de listagem ou ajuste de regras, não para banir sem revisão.
      </p>
      {alertas.length > 0 ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-sm text-amber-50">
          <p className="font-bold">Nesta rodada, {alertas.length} local(is) atingiram o critério (flag grava no banco).</p>
        </div>
      ) : (
        <p className="text-sm text-eid-text-secondary">Nenhum espaço com critério completo na última análise.</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-[color:var(--eid-border-subtle)]">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="bg-eid-card/80 text-[10px] font-bold uppercase text-eid-text-secondary">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Espaço</th>
              <th className="px-3 py-2">Verificação</th>
              <th className="px-3 py-2">Nota</th>
            </tr>
          </thead>
          <tbody>
            {(marcados ?? []).map((row) => (
              <tr key={row.id} className="border-t border-[color:var(--eid-border-subtle)]/50">
                <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                <td className="px-3 py-2 font-medium text-eid-fg">{row.nome_publico}</td>
                <td className="px-3 py-2 text-xs text-eid-text-secondary">
                  {row.ownership_verificado_em
                    ? new Date(row.ownership_verificado_em).toLocaleString("pt-BR")
                    : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-red-200/90">{row.operacao_suspeita_observacao ?? "—"}</td>
              </tr>
            ))}
            {(marcados ?? []).length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-eid-text-secondary" colSpan={4}>
                  Nada marcado no banco com a flag de suspeita.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
