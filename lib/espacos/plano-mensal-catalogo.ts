/** Texto humano para faixa de unidades do catálogo PaaS (plano mensal plataforma). */
export function descricaoFaixaUnidadesPaaS(minUnidades: number, maxUnidades: number | null): string {
  if (maxUnidades == null) {
    return `${minUnidades} ou mais quadras/unidades`;
  }
  if (minUnidades === maxUnidades) {
    return minUnidades === 1
      ? "até 1 quadra ou unidade"
      : `até ${maxUnidades} quadras ou unidades`;
  }
  return `de ${minUnidades} a ${maxUnidades} quadras ou unidades`;
}

export function detalheValorESociosPlanoPaaS(row: {
  valor_mensal_centavos: number;
  socios_mensal_modo?: string | null;
}): string {
  const valor = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Number(row.valor_mensal_centavos) || 0) / 100);
  const socios =
    row.socios_mensal_modo === "disponivel"
      ? "Gestão de mensalidade de sócios disponível no plano."
      : row.socios_mensal_modo === "em_breve"
        ? "Gestão de mensalidade de sócios em evolução neste plano."
        : "Sem gestão de mensalidade de sócios neste plano.";
  return `Mensalidade plataforma ${valor}/mês · ${socios}`;
}
