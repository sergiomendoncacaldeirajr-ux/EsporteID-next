import { NextResponse } from "next/server";
import { createAsaasCustomer, createAsaasPayment } from "@/lib/asaas/client";
import { getProfessorFinanceiro } from "@/lib/financeiro/config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const preferredRegion = ["gru1"];

function mapAsaasStatus(status?: string | null) {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "RECEIVED" || normalized === "CONFIRMED") return "received";
  if (normalized === "PENDING") return "pending";
  if (normalized === "OVERDUE") return "overdue";
  if (normalized === "REFUNDED") return "refunded";
  if (normalized === "RECEIVED_IN_CASH") return "received";
  return "processing";
}

export async function POST(request: Request) {
  const supabase = await createRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { aulaAlunoId?: number };
  const aulaAlunoId = Number(body.aulaAlunoId ?? 0);
  if (!aulaAlunoId) {
    return NextResponse.json({ error: "aulaAlunoId inválido." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: vinculo, error: vinculoErr } = await admin
    .from("professor_aula_alunos")
    .select("id, aula_id, aluno_id, valor_centavos, status_pagamento, professor_aulas!inner(id, professor_id, titulo, inicio)")
    .eq("id", aulaAlunoId)
    .maybeSingle();
  if (vinculoErr) {
    return NextResponse.json({ error: vinculoErr.message }, { status: 400 });
  }
  if (!vinculo) {
    return NextResponse.json({ error: "Vínculo aula-aluno não encontrado." }, { status: 404 });
  }

  const aula = Array.isArray(vinculo.professor_aulas) ? vinculo.professor_aulas[0] : vinculo.professor_aulas;
  if (aula?.professor_id !== user.id) {
    return NextResponse.json({ error: "Sem permissão para gerar cobrança desta aula." }, { status: 403 });
  }

  const { data: pagamentoExistente } = await admin
    .from("professor_pagamentos")
    .select("id, asaas_payment_id, asaas_charge_url, status")
    .eq("aula_aluno_id", aulaAlunoId)
    .maybeSingle();
  if (pagamentoExistente?.asaas_payment_id) {
    return NextResponse.json({ paymentId: pagamentoExistente.asaas_payment_id, chargeUrl: pagamentoExistente.asaas_charge_url, reused: true });
  }

  const { data: alunoProfile, error: alunoProfileErr } = await admin
    .from("profiles")
    .select("id, nome, whatsapp, asaas_customer_id")
    .eq("id", vinculo.aluno_id)
    .maybeSingle();
  if (alunoProfileErr || !alunoProfile) {
    return NextResponse.json({ error: alunoProfileErr?.message ?? "Aluno não encontrado." }, { status: 400 });
  }

  try {
    let customerId = alunoProfile.asaas_customer_id ?? null;
    if (!customerId) {
      const authUser = await admin.auth.admin.getUserById(alunoProfile.id);
      const created = await createAsaasCustomer({
        name: alunoProfile.nome ?? authUser.data.user?.email ?? "Aluno EsporteID",
        email: authUser.data.user?.email ?? null,
        mobilePhone: alunoProfile.whatsapp ?? null,
        externalReference: alunoProfile.id,
      });
      customerId = created.id;
      await admin
        .from("profiles")
        .update({ asaas_customer_id: customerId, atualizado_em: new Date().toISOString() })
        .eq("id", alunoProfile.id);
    }

    const payment = await createAsaasPayment({
      customer: customerId,
      billingType: "PIX",
      value: Number(vinculo.valor_centavos ?? 0) / 100,
      dueDate: new Date().toISOString().slice(0, 10),
      description: aula?.titulo
        ? `Aula EsporteID: ${aula.titulo}`
        : `Aula EsporteID #${vinculo.aula_id}`,
      externalReference: `professor_aula_aluno:${aulaAlunoId}`,
    });

    const { data: cfg } = await admin
      .from("ei_financeiro_config")
      .select(
        "asaas_taxa_percentual, plataforma_sobre_taxa_gateway, plataforma_sobre_taxa_gateway_promo, professor_taxa_fixa, professor_taxa_fixa_promo, professor_plataforma_sobre_taxa_gateway, professor_plataforma_sobre_taxa_gateway_promo, professor_promocao_ativa, professor_promocao_ate"
      )
      .eq("id", 1)
      .maybeSingle();

    const professorFinanceiro = getProfessorFinanceiro(cfg);
    const bruto = Number(vinculo.valor_centavos ?? 0);
    const taxaGateway = Math.round(bruto * professorFinanceiro.asaasTaxaPercentual);
    const taxaFixa = Math.round(professorFinanceiro.taxaFixa * 100);
    const comissao =
      Math.round(taxaGateway * professorFinanceiro.plataformaSobreTaxaGateway) + taxaFixa;
    const liquido = Math.max(0, bruto - taxaGateway - comissao);
    const status = mapAsaasStatus(payment.status);
    const chargeUrl = payment.invoiceUrl ?? payment.bankSlipUrl ?? null;

    await admin.from("professor_pagamentos").upsert(
      {
        aula_id: vinculo.aula_id,
        aula_aluno_id: vinculo.id,
        professor_id: aula?.professor_id,
        aluno_id: vinculo.aluno_id,
        asaas_payment_id: payment.id,
        asaas_customer_id: customerId,
        asaas_charge_url: chargeUrl,
        billing_type: "PIX",
        status,
        valor_bruto_centavos: bruto,
        taxa_gateway_centavos: taxaGateway,
        comissao_plataforma_centavos: comissao,
        valor_liquido_professor_centavos: liquido,
        payload_resumo_json: { payment },
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "asaas_payment_id" }
    );

    await admin
      .from("professor_aula_alunos")
      .update({
        status_pagamento: status === "received" ? "pago" : "processando",
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", vinculo.id);

    return NextResponse.json({ paymentId: payment.id, chargeUrl, reused: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao criar cobrança no Asaas." },
      { status: 500 }
    );
  }
}
