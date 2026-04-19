import { adminUpdateFinanceiro } from "@/app/admin/actions";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";

export default async function AdminFinanceiroPage() {
  if (!hasServiceRoleConfig()) {
    return <p className="text-sm text-eid-text-secondary">Configure a service role.</p>;
  }
  const db = createServiceRoleClient();
  const { data, error } = await db.from("ei_financeiro_config").select("*").eq("id", 1).maybeSingle();
  if (error) return <p className="text-sm text-red-300">{error.message}</p>;
  if (!data) return <p className="text-sm text-eid-text-secondary">Sem linha em ei_financeiro_config.</p>;

  return (
    <div>
      <h2 className="text-base font-bold text-eid-fg">Financeiro (configuração)</h2>
      <p className="mt-1 text-sm text-eid-text-secondary">Valores usados em taxas de torneio, promoções e clube.</p>
      <form action={adminUpdateFinanceiro} className="mt-6 max-w-md space-y-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
        <label className="block text-xs font-semibold text-eid-text-secondary">
          Taxa fixa torneio (R$)
          <input type="number" step="0.01" name="torneio_taxa_fixa" defaultValue={Number(data.torneio_taxa_fixa)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="block text-xs font-semibold text-eid-text-secondary">
          Taxa promocional torneio (R$)
          <input type="number" step="0.01" name="torneio_taxa_promo" defaultValue={Number(data.torneio_taxa_promo)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="block text-xs font-semibold text-eid-text-secondary">
          Dias de promoção
          <input type="number" name="promocao_dias" defaultValue={data.promocao_dias} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="block text-xs font-semibold text-eid-text-secondary">
          Mensalidade clube (R$)
          <input type="number" step="0.01" name="clube_mensalidade" defaultValue={Number(data.clube_mensalidade)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="block text-xs font-semibold text-eid-text-secondary">
          Asaas taxa % (decimal)
          <input type="number" step="0.000001" name="asaas_taxa_percentual" defaultValue={Number(data.asaas_taxa_percentual)} className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="block text-xs font-semibold text-eid-text-secondary">
          Plataforma sobre taxa gateway
          <input
            type="number"
            step="0.000001"
            name="plataforma_sobre_taxa_gateway"
            defaultValue={Number(data.plataforma_sobre_taxa_gateway)}
            className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-semibold text-eid-text-secondary">
          Plataforma sobre taxa gateway (promo)
          <input
            type="number"
            step="0.000001"
            name="plataforma_sobre_taxa_gateway_promo"
            defaultValue={Number(data.plataforma_sobre_taxa_gateway_promo)}
            className="eid-input-dark mt-1 w-full rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <button type="submit" className="eid-btn-primary mt-2 w-full min-h-[44px] rounded-xl text-sm font-bold">
          Salvar
        </button>
      </form>
    </div>
  );
}
