import { getEspacoFinanceiro } from "@/lib/financeiro/config";

export type CalculoFinanceiroEspaco = {
  brutoCentavos: number;
  taxaGatewayCentavos: number;
  taxaFixaCentavos: number;
  comissaoPlataformaCentavos: number;
  liquidoEspacoCentavos: number;
};

export function calcularFinanceiroEspaco({
  valorCentavos,
  config,
}: {
  valorCentavos: number;
  config: unknown;
}): CalculoFinanceiroEspaco {
  const brutoCentavos = Math.max(0, Math.round(Number(valorCentavos ?? 0)));
  const financeiro = getEspacoFinanceiro(
    config as Parameters<typeof getEspacoFinanceiro>[0]
  );
  const taxaGatewayCentavos = Math.round(
    brutoCentavos * Number(financeiro.asaasTaxaPercentual ?? 0)
  );
  const taxaFixaCentavos = Math.round(Number(financeiro.taxaFixa ?? 0) * 100);
  const comissaoPlataformaCentavos =
    Math.round(
      taxaGatewayCentavos *
        Number(financeiro.plataformaSobreTaxaGateway ?? 0)
    ) + taxaFixaCentavos;
  const liquidoEspacoCentavos = Math.max(
    0,
    brutoCentavos - taxaGatewayCentavos - comissaoPlataformaCentavos
  );

  return {
    brutoCentavos,
    taxaGatewayCentavos,
    taxaFixaCentavos,
    comissaoPlataformaCentavos,
    liquidoEspacoCentavos,
  };
}
