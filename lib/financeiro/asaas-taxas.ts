import { normalizeFinanceiroConfig } from "@/lib/financeiro/config";

export type MetodoPagamentoTaxa = "PIX" | "BOLETO" | "CREDIT_CARD" | "DEBIT_CARD";

export type TaxaMetodoResumo = {
  metodo: MetodoPagamentoTaxa;
  label: string;
  taxaPercentual: number;
  taxaFixaCentavos: number;
  baseAsaasCentavos: number;
  comissaoPlataformaCentavos: number;
  custoTotalCentavos: number;
  liquidoEspacoCentavos: number;
};

function cents(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
}

function percent(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
}

export function calcularTaxasAsaasEspaco(input: {
  valorCentavos: number;
  config: unknown;
}): TaxaMetodoResumo[] {
  const valor = Math.max(0, Math.round(Number(input.valorCentavos ?? 0)));
  const cfg = normalizeFinanceiroConfig(input.config as Parameters<typeof normalizeFinanceiroConfig>[0]);
  const share = Math.max(0, Number(cfg.espaco_plataforma_sobre_taxa_gateway ?? 0.5));
  const raw = (input.config ?? {}) as Record<string, unknown>;
  const rows: Array<{
    metodo: MetodoPagamentoTaxa;
    label: string;
    taxaPercentual: number;
    taxaFixaCentavos: number;
  }> = [
    {
      metodo: "PIX",
      label: "Pix",
      taxaPercentual: 0,
      taxaFixaCentavos: cents(raw.asaas_pix_taxa_fixa_centavos, 199),
    },
    {
      metodo: "BOLETO",
      label: "Boleto",
      taxaPercentual: 0,
      taxaFixaCentavos: cents(raw.asaas_boleto_taxa_fixa_centavos, 199),
    },
    {
      metodo: "CREDIT_CARD",
      label: "Cartão de crédito",
      taxaPercentual: percent(raw.asaas_credito_taxa_percentual, 0.0499),
      taxaFixaCentavos: cents(raw.asaas_credito_taxa_fixa_centavos, 0),
    },
    {
      metodo: "DEBIT_CARD",
      label: "Cartão de débito",
      taxaPercentual: percent(raw.asaas_debito_taxa_percentual, 0.0299),
      taxaFixaCentavos: cents(raw.asaas_debito_taxa_fixa_centavos, 0),
    },
  ];
  return rows.map((row) => {
    const baseAsaasCentavos = Math.round(valor * row.taxaPercentual) + row.taxaFixaCentavos;
    const comissaoPlataformaCentavos = Math.round(baseAsaasCentavos * share);
    const custoTotalCentavos = baseAsaasCentavos + comissaoPlataformaCentavos;
    return {
      ...row,
      baseAsaasCentavos,
      comissaoPlataformaCentavos,
      custoTotalCentavos,
      liquidoEspacoCentavos: Math.max(0, valor - custoTotalCentavos),
    };
  });
}

export function taxaMetodoLabel(value: string | null | undefined) {
  const key = String(value ?? "").toUpperCase();
  if (key === "PIX") return "Pix";
  if (key === "BOLETO") return "Boleto";
  if (key === "CREDIT_CARD") return "Cartão de crédito";
  if (key === "DEBIT_CARD") return "Cartão de débito";
  return key || "Método não informado";
}
