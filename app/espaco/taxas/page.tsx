import { calcularTaxasAsaasEspaco } from "@/lib/financeiro/asaas-taxas";
import { fiscalCentavosToCurrency } from "@/lib/fiscal/nfse";
import { getEspacoSelecionado } from "@/lib/espacos/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { CreditCard } from "lucide-react";

type Props = {
  searchParams?: Promise<{ espaco?: string; valor?: string }>;
};

function pct(value: number | null | undefined) {
  return `${(Number(value ?? 0) * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export default async function EspacoTaxasPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const espacoId = Number(sp.espaco ?? 0) || null;
  const valorReferenciaCentavos = Math.max(100, Math.round((Number(sp.valor ?? 100) || 100) * 100));
  const { selectedSpace } = await getEspacoSelecionado({
    nextPath: "/espaco/taxas",
    espacoId,
  });
  const admin = createServiceRoleClient();
  const { data: config } = await admin.from("ei_financeiro_config").select("*").eq("id", 1).maybeSingle();
  const taxas = calcularTaxasAsaasEspaco({ valorCentavos: valorReferenciaCentavos, config });
  const atualizadas = (config as Record<string, unknown> | null)?.asaas_taxas_atualizadas_em;
  const fonteTaxas = String((config as Record<string, unknown> | null)?.asaas_taxas_fonte ?? "admin");

  return (
    <div className="space-y-5">
      <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-eid-primary-300">Taxas</p>
        <h2 className="mt-1 text-2xl font-black text-eid-fg">Taxas de transação</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-eid-text-secondary">
          Estimativa por método de pagamento para {selectedSpace.nome_publico}. Veja o custo total da transação e o
          líquido previsto para o espaço.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-eid-text-secondary">
          <form className="flex w-full flex-col gap-2 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3 sm:w-auto sm:min-w-80 sm:flex-row sm:items-end">
            {espacoId ? <input type="hidden" name="espaco" value={espacoId} /> : null}
            <label className="min-w-0 flex-1 text-[11px] font-semibold text-eid-text-secondary">
              Valor da cobrança
              <input
                name="valor"
                type="number"
                min="1"
                step="0.01"
                defaultValue={(valorReferenciaCentavos / 100).toFixed(2)}
                className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm font-bold text-eid-fg"
              />
            </label>
            <button className="eid-btn-primary rounded-xl px-4 py-2 text-xs font-black sm:mb-0.5">
              Calcular
            </button>
          </form>
          <span className="rounded-full border border-[color:var(--eid-border-subtle)] px-3 py-1">
            Fonte: {fonteTaxas}
          </span>
          {typeof atualizadas === "string" ? (
            <span className="rounded-full border border-[color:var(--eid-border-subtle)] px-3 py-1">
              Atualizado em {new Date(atualizadas).toLocaleString("pt-BR")}
            </span>
          ) : null}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {taxas.map((taxa) => (
          <div key={taxa.metodo} className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4">
            <CreditCard className="h-5 w-5 text-eid-primary-300" aria-hidden />
            <p className="mt-3 text-sm font-black text-eid-fg">{taxa.label}</p>
            <p className="mt-1 text-xs text-eid-text-secondary">
              {taxa.taxaPercentual > 0 ? `${pct(taxa.taxaPercentual)} + ` : ""}
              {fiscalCentavosToCurrency(taxa.taxaFixaCentavos)}
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-eid-text-secondary">Taxa total estimada</span>
                <span className="font-bold text-eid-fg">{fiscalCentavosToCurrency(taxa.custoTotalCentavos)}</span>
              </div>
              <div className="flex justify-between gap-3 border-t border-[color:var(--eid-border-subtle)] pt-2">
                <span className="text-eid-text-secondary">Líquido estimado</span>
                <span className="font-black text-eid-action-300">{fiscalCentavosToCurrency(taxa.liquidoEspacoCentavos)}</span>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
