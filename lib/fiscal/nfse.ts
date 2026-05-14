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

export function fiscalParseConfigJson(value: unknown) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function fiscalConfigText(config: Record<string, unknown>, key: string) {
  return typeof config[key] === "string" ? String(config[key]) : "";
}

export function fiscalConfigBool(config: Record<string, unknown>, key: string) {
  return config[key] === true;
}
