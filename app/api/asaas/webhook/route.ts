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

  const { data: espacoPagamento } = await admin
    .from("espaco_transacoes")
    .select("id, espaco_generico_id, usuario_id, espaco_socio_id, reserva_quadra_id, tipo")
    .eq("asaas_payment_id", paymentId)
    .maybeSingle();

  if (!pagamento && !espacoPagamento) {
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
      if (transacao) {
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
      await admin.from("notificacoes").insert({
        usuario_id: parceiroUsuarioId,
        mensagem:
          mapped.pagamento === "received"
            ? `Pagamento confirmado no espaço ${espaco?.nome_publico ?? "EsporteID"}.`
            : `Cobrança do espaço atualizada para ${mapped.pagamento}.`,
        tipo: "espaco_pagamento",
        referencia_id: espacoPagamento.id,
        lida: false,
        remetente_id: espacoPagamento.usuario_id,
        data_criacao: new Date().toISOString(),
      });
    }

    if (espacoPagamento.usuario_id) {
      await admin.from("notificacoes").insert({
        usuario_id: espacoPagamento.usuario_id,
        mensagem:
          mapped.pagamento === "received"
            ? "Seu pagamento do espaço foi confirmado."
            : `Seu pagamento do espaço foi atualizado para ${mapped.pagamento}.`,
        tipo: "espaco_pagamento",
        referencia_id: espacoPagamento.id,
        lida: false,
        remetente_id: parceiroUsuarioId,
        data_criacao: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
