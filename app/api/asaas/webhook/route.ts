import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function mapPaymentStatus(raw?: string | null) {
  const status = String(raw ?? "").toUpperCase();
  if (status === "RECEIVED" || status === "CONFIRMED" || status === "RECEIVED_IN_CASH") {
    return { pagamento: "received", aluno: "pago" };
  }
  if (status === "PENDING") return { pagamento: "pending", aluno: "pendente" };
  if (status === "OVERDUE") return { pagamento: "overdue", aluno: "falhou" };
  if (status === "REFUNDED") return { pagamento: "refunded", aluno: "estornado" };
  if (status === "DELETED" || status === "CANCELLED") return { pagamento: "cancelled", aluno: "falhou" };
  return { pagamento: "processing", aluno: "processando" };
}

export async function POST(request: Request) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (expectedToken) {
    const receivedToken = request.headers.get("asaas-access-token")?.trim() || request.headers.get("x-asaas-token")?.trim();
    if (!receivedToken || receivedToken !== expectedToken) {
      return NextResponse.json({ error: "Webhook não autorizado." }, { status: 401 });
    }
  }

  const payload = (await request.json().catch(() => null)) as {
    event?: string;
    payment?: { id?: string; status?: string; value?: number; invoiceUrl?: string | null; bankSlipUrl?: string | null };
  } | null;
  const paymentId = payload?.payment?.id;
  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  const admin = createServiceRoleClient();
  const { data: pagamento } = await admin
    .from("professor_pagamentos")
    .select("id, aula_aluno_id, professor_id, aluno_id")
    .eq("asaas_payment_id", paymentId)
    .maybeSingle();

  if (!pagamento) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const mapped = mapPaymentStatus(payload?.payment?.status);
  const chargeUrl = payload?.payment?.invoiceUrl ?? payload?.payment?.bankSlipUrl ?? null;

  await admin
    .from("professor_pagamentos")
    .update({
      status: mapped.pagamento,
      asaas_charge_url: chargeUrl,
      payload_resumo_json: payload ?? {},
      pago_em: mapped.pagamento === "received" ? new Date().toISOString() : null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", pagamento.id);

  if (pagamento.aula_aluno_id) {
    await admin
      .from("professor_aula_alunos")
      .update({
        status_pagamento: mapped.aluno,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", pagamento.aula_aluno_id);
  }

  if (pagamento.professor_id) {
    await admin.from("notificacoes").insert({
      usuario_id: pagamento.professor_id,
      mensagem:
        mapped.pagamento === "received"
          ? "Uma aula foi paga com sucesso pela plataforma."
          : `Atualização de cobrança recebida: ${mapped.pagamento}.`,
      tipo: "professor_pagamento",
      referencia_id: pagamento.id,
      lida: false,
      remetente_id: pagamento.aluno_id,
      data_criacao: new Date().toISOString(),
    });
  }

  if (pagamento.aluno_id) {
    await admin.from("notificacoes").insert({
      usuario_id: pagamento.aluno_id,
      mensagem:
        mapped.pagamento === "received"
          ? "Seu pagamento da aula foi confirmado."
          : `Seu pagamento da aula foi atualizado para ${mapped.pagamento}.`,
      tipo: "professor_pagamento",
      referencia_id: pagamento.id,
      lida: false,
      remetente_id: pagamento.professor_id,
      data_criacao: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
