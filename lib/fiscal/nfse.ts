export const FISCAL_STATUS_LABELS: Record<string, string> = {
  solicitada: "Solicitada",
  fila_emissao: "Na fila",
  emitida: "Emitida",
  erro: "Com erro",
  cancelada: "Cancelada",
  rascunho: "Rascunho",
  pronto: "Pronto",
  pausado: "Pausado",
};

export function fiscalStatusLabel(status: string | null | undefined) {
  return FISCAL_STATUS_LABELS[String(status ?? "").toLowerCase()] ?? "Pendente";
}

export function fiscalDocumentoDigits(value: FormDataEntryValue | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function fiscalCentavosToCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((Number(value ?? 0) || 0) / 100);
}
