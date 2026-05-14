import Link from "next/link";
import { calcularTaxasAsaasEspaco, taxaMetodoLabel } from "@/lib/financeiro/asaas-taxas";
import { fiscalCentavosToCurrency } from "@/lib/fiscal/nfse";
import { getEspacoSelecionado } from "@/lib/espacos/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ArrowRight, CreditCard, ReceiptText } from "lucide-react";

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
  const [{ data: config }, { data: reais }] = await Promise.all([
    admin.from("ei_financeiro_config").select("*").eq("id", 1).maybeSingle(),
    admin
      .from("espaco_transacoes")
      .select("id, asaas_billing_type, valor_bruto_centavos, asaas_fee_centavos, comissao_plataforma_centavos, criado_em")
      .eq("espaco_generico_id", selectedSpace.id)
      .not("asaas_fee_centavos", "is", null)
      .order("id", { ascending: false })
      .limit(50),
  ]);
  const taxas = calcularTaxasAsaasEspaco({ valorCentavos: valorReferenciaCentavos, config });
  const share = Number((config as Record<string, unknown> | null)?.espaco_plataforma_sobre_taxa_gateway ?? 0.5);
  const atualizadas = (config as Record<string, unknown> | null)?.asaas_taxas_atualizadas_em;
  const fonteTaxas = String((config as Record<string, unknown> | null)?.asaas_taxas_fonte ?? "admin");

  const reaisPorMetodo = new Map<string, { count: number; fee: number; plataforma: number; bruto: number }>();
  for (const row of reais ?? []) {
    const key = String(row.asaas_billing_type ?? "OUTRO").toUpperCase();
    const atual = reaisPorMetodo.get(key) ?? { count: 0, fee: 0, plataforma: 0, bruto: 0 };
    atual.count += 1;
    atual.fee += Number(row.asaas_fee_centavos ?? 0);
    atual.plataforma += Number(row.comissao_plataforma_centavos ?? 0);
    atual.bruto += Number(row.valor_bruto_centavos ?? 0);
    reaisPorMetodo.set(key, atual);
  }

  return (
    <div className="space-y-5">
      <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-eid-primary-300">Taxas</p>
        <h2 className="mt-1 text-2xl font-black text-eid-fg">Taxas de transação</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-eid-text-secondary">
          Estimativa por método de pagamento para {selectedSpace.nome_publico}. A plataforma retém {pct(share)} da taxa
          base do Asaas como comissão operacional.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-eid-text-secondary">
          <span className="rounded-full border border-[color:var(--eid-border-subtle)] px-3 py-1">
            Referência: {fiscalCentavosToCurrency(valorReferenciaCentavos)}
          </span>
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
                <span className="text-eid-text-secondary">Taxa Asaas</span>
                <span className="font-bold text-eid-fg">{fiscalCentavosToCurrency(taxa.baseAsaasCentavos)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-eid-text-secondary">Comissão plataforma</span>
                <span className="font-bold text-eid-fg">{fiscalCentavosToCurrency(taxa.comissaoPlataformaCentavos)}</span>
              </div>
              <div className="flex justify-between gap-3 border-t border-[color:var(--eid-border-subtle)] pt-2">
                <span className="text-eid-text-secondary">Líquido estimado</span>
                <span className="font-black text-eid-action-300">{fiscalCentavosToCurrency(taxa.liquidoEspacoCentavos)}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-eid-action-400" aria-hidden />
              <h3 className="text-base font-black text-eid-fg">Taxas reais recebidas do Asaas</h3>
            </div>
            <p className="mt-1 text-sm text-eid-text-secondary">
              Média calculada pelas cobranças liquidadas que chegaram pelo webhook com valor líquido.
            </p>
          </div>
          <Link href="/espaco/financeiro" className="inline-flex items-center gap-2 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2 text-xs font-bold text-eid-primary-300">
            Ver financeiro
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          {Array.from(reaisPorMetodo.entries()).length ? (
            Array.from(reaisPorMetodo.entries()).map(([metodo, resumo]) => (
              <div key={metodo} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-eid-fg">{taxaMetodoLabel(metodo)}</p>
                    <p className="mt-1 text-xs text-eid-text-secondary">{resumo.count} cobrança(s) com taxa efetiva</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-eid-fg">Média Asaas {fiscalCentavosToCurrency(Math.round(resumo.fee / resumo.count))}</p>
                    <p className="mt-1 text-eid-text-secondary">Plataforma {fiscalCentavosToCurrency(Math.round(resumo.plataforma / resumo.count))}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4 text-sm text-eid-text-secondary">
              Ainda não há cobranças liquidadas com taxa efetiva recebida do Asaas.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
