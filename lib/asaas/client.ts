type AsaasRequestInit = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

function getAsaasConfig() {
  const apiKey = process.env.ASAAS_API_KEY?.trim();
  const baseUrl = process.env.ASAAS_API_BASE_URL?.trim() || "https://api.asaas.com/v3";
  if (!apiKey) {
    throw new Error("ASAAS_API_KEY ausente.");
  }
  return { apiKey, baseUrl };
}

export async function asaasFetch<T>(path: string, init: AsaasRequestInit = {}): Promise<T> {
  const { apiKey, baseUrl } = getAsaasConfig();
  const response = await fetch(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as T & { errors?: Array<{ description?: string }> };
  if (!response.ok) {
    const description = Array.isArray(payload.errors)
      ? payload.errors.map((item) => item.description).filter(Boolean).join(" | ")
      : "";
    throw new Error(description || `Erro Asaas ${response.status}`);
  }
  return payload;
}

export type AsaasCustomerPayload = {
  name: string;
  email?: string | null;
  mobilePhone?: string | null;
  externalReference?: string | null;
};

export async function createAsaasCustomer(payload: AsaasCustomerPayload) {
  return asaasFetch<{ id: string }>("/customers", {
    method: "POST",
    body: payload,
  });
}

export async function createAsaasPayment(payload: Record<string, unknown>) {
  return asaasFetch<{
    id: string;
    invoiceUrl?: string | null;
    bankSlipUrl?: string | null;
    status?: string;
  }>("/payments", {
    method: "POST",
    body: payload,
  });
}

export async function refundAsaasPayment(paymentId: string) {
  const safeId = String(paymentId ?? "").trim();
  if (!safeId) throw new Error("Pagamento Asaas inválido para estorno.");
  return asaasFetch<{ id?: string; status?: string }>(`/payments/${safeId}/refund`, {
    method: "POST",
  });
}
