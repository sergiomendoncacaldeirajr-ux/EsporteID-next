import { getEspacoFinanceiro } from "@/lib/financeiro/config";

export type CalculoFinanceiroEspaco = {
  /** Valor pago à quadra / local, antes da taxa EsporteID por reserva. */
  valorLocalCentavos: number;
  /** Complemento cobrado do cliente a favor da plataforma, por reserva (líquido alvo, antes de split de gateway). */
  taxaReservaPlataformaCentavos: number;
  brutoCentavos: number;
  taxaGatewayCentavos: number;
  taxaFixaCentavos: number;
  comissaoPlataformaCentavos: number;
  liquidoEspacoCentavos: number;
};

/**
 * `valorCentavos` = preço do horário (local). Opcional `taxaReservaPlataformaCentavos` = valor fixo
 * embutido na cobrança, que integra a comissão plataforma (a parte do gateway continua no % sobre o bruto).
 */
export function calcularFinanceiroEspaco({
  valorCentavos,
  config,
  taxaReservaPlataformaCentavos: taxaReservaIn = 0,
}: {
  valorCentavos: number;
  config: unknown;
  /** Centavos por reserva para a plataforma (junto ao valor do local, total cobrado = local + taxa). */
  taxaReservaPlataformaCentavos?: number;
}): CalculoFinanceiroEspaco {
  const valorLocalCentavos = Math.max(0, Math.round(Number(valorCentavos ?? 0)));
  const taxaRes = Math.max(0, Math.round(Number(taxaReservaIn ?? 0)));
  const brutoCentavos = valorLocalCentavos + taxaRes;
  const financeiro = getEspacoFinanceiro(
    config as Parameters<typeof getEspacoFinanceiro>[0]
  );
  const taxaGatewayCentavos = Math.round(
    brutoCentavos * Number(financeiro.asaasTaxaPercentual ?? 0)
  );
  const taxaFixaCentavos = Math.round(Number(financeiro.taxaFixa ?? 0) * 100);
  const comissaoPlataformaCentavos =
    Math.round(
      taxaGatewayCentavos * Number(financeiro.plataformaSobreTaxaGateway ?? 0)
    ) +
    taxaFixaCentavos +
    taxaRes;
  const liquidoEspacoCentavos = Math.max(
    0,
    brutoCentavos - taxaGatewayCentavos - comissaoPlataformaCentavos
  );

  return {
    valorLocalCentavos,
    taxaReservaPlataformaCentavos: taxaRes,
    brutoCentavos,
    taxaGatewayCentavos,
    taxaFixaCentavos,
    comissaoPlataformaCentavos,
    liquidoEspacoCentavos,
  };
}

/**
 * Dono paga mensalidade PaaS: cobrança **para** a plataforma. Após o MDR (Asaas), o saldo
 * é comissão/receita da plataforma; o espaço não retém nada nessa fatura.
 */
export function calcularCobrancaMensalidadePlataformaEspaco({
  valorMensalCentavos,
  config,
}: {
  valorMensalCentavos: number;
  config: unknown;
}): Pick<
  CalculoFinanceiroEspaco,
  "brutoCentavos" | "taxaGatewayCentavos" | "taxaFixaCentavos" | "comissaoPlataformaCentavos" | "liquidoEspacoCentavos"
> {
  const brutoCentavos = Math.max(0, Math.round(Number(valorMensalCentavos ?? 0)));
  const financeiro = getEspacoFinanceiro(
    config as Parameters<typeof getEspacoFinanceiro>[0]
  );
  const taxaGatewayCentavos = Math.round(
    brutoCentavos * Number(financeiro.asaasTaxaPercentual ?? 0)
  );
  return {
    brutoCentavos,
    taxaGatewayCentavos,
    taxaFixaCentavos: 0,
    comissaoPlataformaCentavos: Math.max(0, brutoCentavos - taxaGatewayCentavos),
    liquidoEspacoCentavos: 0,
  };
}
