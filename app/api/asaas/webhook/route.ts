import { NextResponse } from "next/server";
import { triggerPushForNotificationIdsBestEffort } from "@/lib/pwa/push-trigger";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const preferredRegion = ["gru1"];

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
  if (process.env.NODE_ENV === "production" && !expectedToken) {
    return NextResponse.json({ error: "Webhook Asaas não configurado (defina ASAAS_WEBHOOK_TOKEN)." }, { status: 503 });
  }
  if (expectedToken) {
    const receivedToken = request.headers.get("asaas-access-token")?.trim() || request.headers.get("x-asaas-token")?.trim();
    if (!receivedToken || receivedToken !== expectedToken) {
      return NextResponse.json({ error: "Webhook não autorizado." }, { status: 401 });
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.warn("[asaas/webhook] ASAAS_WEBHOOK_TOKEN ausente — em produção o webhook fica bloqueado.");
  }

  const payload = (await request.json().catch(() => null)) as {
    event?: string;
    payment?: {
      id?: string;
      status?: string;
      value?: number;
      invoiceUrl?: string | null;
      bankSlipUrl?: string | null;
      subscription?: string | null;
      dueDate?: string | null;
    };
  } | null;
  const paymentId = payload?.payment?.id;
  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  const admin = createServiceRoleClient();
  async function sendNotificationAndPush(payload: {
    usuario_id: string | null | undefined;
    mensagem: string;
    tipo: string;
    referencia_id: number | null | undefined;
    remetente_id: string | null | undefined;
  }) {
    if (!payload.usuario_id) return;
    const { data } = await admin
      .from("notificacoes")
      .insert({
        usuario_id: payload.usuario_id,
        mensagem: payload.mensagem,
        tipo: payload.tipo,
        referencia_id: payload.referencia_id ?? null,
        lida: false,
        remetente_id: payload.remetente_id ?? null,
        data_criacao: new Date().toISOString(),
      })
      .select("id")
      .limit(1);
    await triggerPushForNotificationIdsBestEffort([Number((data?.[0] as { id?: number } | undefined)?.id ?? 0)], {
      source: "api/asaas-webhook",
    });
  }
  const { data: pagamento } = await admin
    .from("professor_pagamentos")
    .select("id, aula_aluno_id, professor_id, aluno_id")
    .eq("asaas_payment_id", paymentId)
    .maybeSingle();

  const { data: espacoPagamento } = await admin
    .from("espaco_transacoes")
    .select("id, espaco_generico_id, usuario_id, espaco_socio_id, reserva_quadra_id, assinatura_plataforma_id, tipo")
    .eq("asaas_payment_id", paymentId)
    .maybeSingle();

  const paymentSubscriptionId = String(payload?.payment?.subscription ?? "").trim();
  const { data: assinaturaBySubscription } =
    !espacoPagamento && paymentSubscriptionId
      ? await admin
          .from("espaco_assinaturas_plataforma")
          .select("id, espaco_generico_id")
          .eq("asaas_subscription_id", paymentSubscriptionId)
          .maybeSingle()
      : { data: null };

  if (!pagamento && !espacoPagamento && !assinaturaBySubscription) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const mapped = mapPaymentStatus(payload?.payment?.status);
  const chargeUrl = payload?.payment?.invoiceUrl ?? payload?.payment?.bankSlipUrl ?? null;

  if (pagamento) {
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
      await sendNotificationAndPush({
        usuario_id: pagamento.professor_id,
        mensagem:
          mapped.pagamento === "received"
            ? "Uma aula foi paga com sucesso pela plataforma."
            : `Atualização de cobrança recebida: ${mapped.pagamento}.`,
        tipo: "professor_pagamento",
        referencia_id: pagamento.id,
        remetente_id: pagamento.aluno_id,
      });
    }

    if (pagamento.aluno_id) {
      await sendNotificationAndPush({
        usuario_id: pagamento.aluno_id,
        mensagem:
          mapped.pagamento === "received"
            ? "Seu pagamento da aula foi confirmado."
            : `Seu pagamento da aula foi atualizado para ${mapped.pagamento}.`,
        tipo: "professor_pagamento",
        referencia_id: pagamento.id,
        remetente_id: pagamento.professor_id,
      });
    }
  }

  if (espacoPagamento) {
    const { data: espaco } = await admin
      .from("espacos_genericos")
      .select("id, nome_publico, criado_por_usuario_id, responsavel_usuario_id")
      .eq("id", espacoPagamento.espaco_generico_id)
      .maybeSingle();

    await admin
      .from("espaco_transacoes")
      .update({
        status: mapped.pagamento,
        asaas_charge_url: chargeUrl,
        detalhes_json: payload ?? {},
        pago_em: mapped.pagamento === "received" ? new Date().toISOString() : null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", espacoPagamento.id);

    if (espacoPagamento.assinatura_plataforma_id && espacoPagamento.tipo === "mensalidade_plataforma_espaco" && mapped.pagamento === "received") {
      const proxima = new Date();
      proxima.setMonth(proxima.getMonth() + 1);
      await admin
        .from("espaco_assinaturas_plataforma")
        .update({
          status: "active",
          proxima_cobranca: proxima.toISOString().slice(0, 10),
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", espacoPagamento.assinatura_plataforma_id);
      if (espacoPagamento.espaco_generico_id) {
        const { data: eg0 } = await admin
          .from("espacos_genericos")
          .select("paas_primeiro_pagamento_mensal_recebido_em")
          .eq("id", espacoPagamento.espaco_generico_id)
          .maybeSingle();
        if (eg0 && (eg0 as { paas_primeiro_pagamento_mensal_recebido_em?: string | null }).paas_primeiro_pagamento_mensal_recebido_em == null) {
          await admin
            .from("espacos_genericos")
            .update({ paas_primeiro_pagamento_mensal_recebido_em: new Date().toISOString() })
            .eq("id", espacoPagamento.espaco_generico_id);
        }
      }
    }

    if (espacoPagamento.reserva_quadra_id) {
      await admin
        .from("reservas_quadra")
        .update({
          payment_status: mapped.pagamento,
          status_reserva:
            mapped.pagamento === "received"
              ? "confirmada"
              : mapped.pagamento === "overdue" || mapped.pagamento === "cancelled"
                ? "cancelada"
                : "aguardando_pagamento",
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", espacoPagamento.reserva_quadra_id);
    }

    if (espacoPagamento.espaco_socio_id) {
      const { data: socioAtual } = await admin
        .from("espaco_socios")
        .select("id, status, documentos_status")
        .eq("id", espacoPagamento.espaco_socio_id)
        .maybeSingle();

      await admin
        .from("espaco_socios")
        .update({
          financeiro_status: mapped.pagamento === "received" ? "em_dia" : mapped.pagamento === "overdue" ? "inadimplente" : "pendente",
          beneficios_liberados:
            mapped.pagamento === "received" &&
            socioAtual?.status === "ativo" &&
            socioAtual?.documentos_status === "aprovado",
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", espacoPagamento.espaco_socio_id);
    }

    const parceiroUsuarioId =
      espaco?.responsavel_usuario_id ?? espaco?.criado_por_usuario_id ?? null;
    if (mapped.pagamento === "received" && parceiroUsuarioId) {
      const { data: transacao } = await admin
        .from("espaco_transacoes")
        .select(
          "id, tipo, reserva_quadra_id, valor_bruto_centavos, taxa_gateway_centavos, comissao_plataforma_centavos, valor_liquido_espaco_centavos, asaas_payment_id"
        )
        .eq("id", espacoPagamento.id)
        .maybeSingle();
      if (transacao && transacao.tipo !== "mensalidade_plataforma_espaco") {
        await admin.from("extrato_lancamentos").insert({
          parceiro_usuario_id: parceiroUsuarioId,
          tipo: transacao.tipo,
          referencia_tipo: "espaco_transacao",
          referencia_id: transacao.id,
          valor_pago_cliente: Number(transacao.valor_bruto_centavos ?? 0) / 100,
          taxa_gateway: Number(transacao.taxa_gateway_centavos ?? 0) / 100,
          comissao_plataforma:
            Number(transacao.comissao_plataforma_centavos ?? 0) / 100,
          valor_liquido_parceiro:
            Number(transacao.valor_liquido_espaco_centavos ?? 0) / 100,
          asaas_payment_id: transacao.asaas_payment_id,
          detalhes_json: JSON.stringify(payload ?? {}),
        });
      }
    }

    if (parceiroUsuarioId) {
      await sendNotificationAndPush({
        usuario_id: parceiroUsuarioId,
        mensagem:
          mapped.pagamento === "received"
            ? `Pagamento confirmado no espaço ${espaco?.nome_publico ?? "EsporteID"}.`
            : `Cobrança do espaço atualizada para ${mapped.pagamento}.`,
        tipo: "espaco_pagamento",
        referencia_id: espacoPagamento.id,
        remetente_id: espacoPagamento.usuario_id,
      });
    }

    if (espacoPagamento.usuario_id) {
      await sendNotificationAndPush({
        usuario_id: espacoPagamento.usuario_id,
        mensagem:
          mapped.pagamento === "received"
            ? "Seu pagamento do espaço foi confirmado."
            : `Seu pagamento do espaço foi atualizado para ${mapped.pagamento}.`,
        tipo: "espaco_pagamento",
        referencia_id: espacoPagamento.id,
        remetente_id: parceiroUsuarioId,
      });
    }
  }

  if (assinaturaBySubscription && mapped.pagamento === "received") {
    const proxima = new Date();
    proxima.setMonth(proxima.getMonth() + 1);
    await admin
      .from("espaco_assinaturas_plataforma")
      .update({
        status: "active",
        proxima_cobranca: payload?.payment?.dueDate ?? proxima.toISOString().slice(0, 10),
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", assinaturaBySubscription.id);
    await admin
      .from("espacos_genericos")
      .update({ paas_primeiro_pagamento_mensal_recebido_em: new Date().toISOString() })
      .eq("id", assinaturaBySubscription.espaco_generico_id)
      .is("paas_primeiro_pagamento_mensal_recebido_em", null);
  }

  return NextResponse.json({ ok: true });
}
