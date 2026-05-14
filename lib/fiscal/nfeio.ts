type NfeioRequestInit = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

function getNfeioConfig() {
  const invoiceKey = process.env.NFEIO_INVOICE_KEY?.trim();
  const baseUrl = process.env.NFEIO_NFSE_BASE_URL?.trim() || "https://api.nfe.io";
  if (!invoiceKey) {
    throw new Error("NFEIO_INVOICE_KEY ausente.");
  }
  return { invoiceKey, baseUrl };
}

export async function nfeioFetch<T>(path: string, init: NfeioRequestInit = {}): Promise<T> {
  const { invoiceKey, baseUrl } = getNfeioConfig();
  const response = await fetch(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: invoiceKey,
      "Content-Type": "application/json",
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    Errors?: Array<{ Message?: string; Code?: string | number }>;
    errors?: Array<{ message?: string; description?: string }>;
  };
  if (!response.ok) {
    const upper = Array.isArray(payload.Errors)
      ? payload.Errors.map((item) => item.Message || item.Code).filter(Boolean).join(" | ")
      : "";
    const lower = Array.isArray(payload.errors)
      ? payload.errors.map((item) => item.message || item.description).filter(Boolean).join(" | ")
      : "";
    throw new Error(upper || lower || `Erro NFE.io ${response.status}`);
  }
  return payload;
}

export type NfeioServiceInvoicePayload = {
  borrower: {
    name: string;
    federalTaxNumber: string;
    email?: string | null;
  };
  services: Array<{
    description: string;
    amount: number;
    cityServiceCode?: string | null;
  }>;
  externalId?: string | null;
};

export async function createNfeioServiceInvoice(companyId: string, payload: NfeioServiceInvoicePayload) {
  return nfeioFetch<{
    id?: string;
    status?: string;
    number?: string;
    verificationCode?: string;
    pdf?: string;
    pdfUrl?: string;
    xml?: string;
    xmlUrl?: string;
  }>(`/v2/companies/${encodeURIComponent(companyId)}/serviceinvoices`, {
    method: "POST",
    body: payload,
  });
}
