import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { processAsaasWebhookPayload, type AsaasWebhookPayload } from "@/lib/asaas/webhook-handler";
import {
  isAsaasSimulationEnabledFor,
  type AsaasSimulationDomain,
} from "@/lib/asaas/simulate-payments";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";

type Body = {
  kind?: AsaasSimulationDomain;
  espaco_generico_id?: number;
  transacao_id?: number;
  asaas_subscription_id?: string;
  professor_pagamento_id?: number;
  torneio_id?: number;
  torneio_inscricao_id?: number;
};

function resolveKind(body: Body): AsaasSimulationDomain {
  if (body.kind === "locais" || body.kind === "professores" || body.kind === "torneios") {
    return body.kind;
  }
  if (body.professor_pagamento_id != null && Number(body.professor_pagamento_id) > 0) {
    return "professores";
  }
  if (body.torneio_inscricao_id != null && Number(body.torneio_inscricao_id) > 0) {
    return "torneios";
  }
  return "locais";
}

function isTorneioPaymentAlreadyPaid(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toLowerCase();
  return normalized === "paid" || normalized === "received" || normalized === "confirmado";
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const kind = resolveKind(body);
  if (!(await isAsaasSimulationEnabledFor(kind))) {
    return NextResponse.json({ error: "Simulação desabilitada para este domínio." }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const admin = createServiceRoleClient();

  if (kind === "professores") {
    const pagamentoId = Number(body.professor_pagamento_id ?? 0);
    if (!Number.isFinite(pagamentoId) || pagamentoId < 1) {
      return NextResponse.json({ error: "professor_pagamento_id inválido." }, { status: 400 });
    }
    const { data: pag } = await admin
      .from("professor_pagamentos")
      .select("id, professor_id, asaas_payment_id, status")
      .eq("id", pagamentoId)
      .maybeSingle();
    if (!pag) {
      return NextResponse.json({ error: "Cobrança não encontrada." }, { status: 404 });
    }
    if (pag.professor_id !== user.id) {
      return NextResponse.json({ error: "Sem permissão para esta cobrança." }, { status: 403 });
    }
    if (!pag.asaas_payment_id) {
      return NextResponse.json({ error: "Cobrança sem asaas_payment_id." }, { status: 400 });
    }
    const st = String(pag.status ?? "").toLowerCase();
    if (st === "received") {
      return NextResponse.json({ error: "Cobrança já consta como recebida." }, { status: 400 });
    }

    const proxima = new Date();
    proxima.setMonth(proxima.getMonth() + 1);
    const payload: AsaasWebhookPayload = {
      event: "PAYMENT_RECEIVED",
      payment: {
        id: String(pag.asaas_payment_id),
        status: "RECEIVED",
        dueDate: proxima.toISOString().slice(0, 10),
      },
    };
    const result = await processAsaasWebhookPayload(payload);
    if (result.ignored) {
      return NextResponse.json({ error: "Nenhum registro atualizado." }, { status: 400 });
    }
    revalidatePath("/professor/recebimentos");
    return NextResponse.json({ ok: true, kind, payment_id: pag.asaas_payment_id });
  }

  if (kind === "torneios") {
    const torneioId = Number(body.torneio_id ?? 0);
    const inscricaoId = Number(body.torneio_inscricao_id ?? 0);
    if (!Number.isFinite(torneioId) || torneioId < 1 || !Number.isFinite(inscricaoId) || inscricaoId < 1) {
      return NextResponse.json({ error: "torneio_id ou torneio_inscricao_id inválido." }, { status: 400 });
    }
    const { data: torneio } = await admin.from("torneios").select("id, criador_id").eq("id", torneioId).maybeSingle();
    if (!torneio || torneio.criador_id !== user.id) {
      return NextResponse.json({ error: "Somente o organizador pode simular pagamento de inscrição." }, { status: 403 });
    }
    const { data: insc } = await admin
      .from("torneio_inscricoes")
      .select("id, torneio_id, payment_status, status_inscricao, asaas_payment_id")
      .eq("id", inscricaoId)
      .eq("torneio_id", torneioId)
      .maybeSingle();
    if (!insc) {
      return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });
    }
    if (isTorneioPaymentAlreadyPaid(insc.payment_status)) {
      return NextResponse.json({ error: "Inscrição já consta como paga." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const novoStatusInsc =
      String(insc.status_inscricao ?? "").toLowerCase() === "pendente" ? "confirmada" : insc.status_inscricao;

    await admin
      .from("torneio_inscricoes")
      .update({
        payment_status: "paid",
        status_inscricao: novoStatusInsc,
        pagamento_confirmado_em: now,
        atualizado_em: now,
      })
      .eq("id", inscricaoId)
      .eq("torneio_id", torneioId);

    revalidatePath(`/torneios/${torneioId}`);
    revalidatePath(`/torneios/${torneioId}/operacao`);
    return NextResponse.json({
      ok: true,
      kind,
      torneio_inscricao_id: inscricaoId,
      asaas_payment_id: insc.asaas_payment_id,
    });
  }

  /* locais */
  const espacoId = Number(body.espaco_generico_id ?? 0);
  if (!Number.isFinite(espacoId) || espacoId < 1) {
    return NextResponse.json({ error: "espaco_generico_id inválido." }, { status: 400 });
  }

  const { data: espaco, error: espacoErr } = await supabase
    .from("espacos_genericos")
    .select("id, criado_por_usuario_id, responsavel_usuario_id")
    .eq("id", espacoId)
    .maybeSingle();
  if (espacoErr || !espaco) {
    return NextResponse.json({ error: espacoErr?.message ?? "Espaço não encontrado." }, { status: 404 });
  }
  const canManage =
    espaco.criado_por_usuario_id === user.id || espaco.responsavel_usuario_id === user.id;
  if (!canManage) {
    return NextResponse.json({ error: "Sem permissão para este espaço." }, { status: 403 });
  }

  let paymentId: string;
  let subscriptionId: string | null = null;

  const subInBody = String(body.asaas_subscription_id ?? "").trim();
  const transacaoId = Number(body.transacao_id ?? 0);

  if (subInBody) {
    const { data: assin } = await admin
      .from("espaco_assinaturas_plataforma")
      .select("id, asaas_subscription_id")
      .eq("espaco_generico_id", espacoId)
      .maybeSingle();
    if (!assin?.asaas_subscription_id || assin.asaas_subscription_id !== subInBody) {
      return NextResponse.json({ error: "Assinatura PaaS ou subscription_id não confere com este espaço." }, { status: 400 });
    }
    paymentId = `sim_pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    subscriptionId = subInBody;
  } else if (Number.isFinite(transacaoId) && transacaoId > 0) {
    const { data: tx } = await admin
      .from("espaco_transacoes")
      .select("id, espaco_generico_id, asaas_payment_id, status")
      .eq("id", transacaoId)
      .maybeSingle();
    if (!tx || tx.espaco_generico_id !== espacoId) {
      return NextResponse.json({ error: "Transação não encontrada neste espaço." }, { status: 404 });
    }
    if (!tx.asaas_payment_id) {
      return NextResponse.json({ error: "Transação sem asaas_payment_id." }, { status: 400 });
    }
    paymentId = String(tx.asaas_payment_id);
  } else {
    const { data: tx } = await admin
      .from("espaco_transacoes")
      .select("id, asaas_payment_id, status")
      .eq("espaco_generico_id", espacoId)
      .eq("status", "pending")
      .not("asaas_payment_id", "is", null)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!tx?.asaas_payment_id) {
      return NextResponse.json(
        { error: "Nenhuma transação pendente com cobrança Asaas. Informe transacao_id ou use simulação por assinatura." },
        { status: 400 }
      );
    }
    paymentId = String(tx.asaas_payment_id);
  }

  const proxima = new Date();
  proxima.setMonth(proxima.getMonth() + 1);
  const payload: AsaasWebhookPayload = {
    event: "PAYMENT_RECEIVED",
    payment: {
      id: paymentId,
      status: "RECEIVED",
      subscription: subscriptionId,
      dueDate: proxima.toISOString().slice(0, 10),
    },
  };

  const result = await processAsaasWebhookPayload(payload);
  if (result.ignored) {
    return NextResponse.json({ error: "Nenhum registro atualizado (pagamento não encontrado no banco)." }, { status: 400 });
  }

  revalidatePath("/espaco/financeiro");
  return NextResponse.json({ ok: true, kind: "locais" as const, payment_id: paymentId, subscription_id: subscriptionId });
}
