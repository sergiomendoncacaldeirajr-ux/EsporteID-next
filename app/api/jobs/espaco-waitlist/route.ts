import { NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/internal/cron-auth";
import { triggerPushForNotificationIdsBestEffort } from "@/lib/pwa/push-trigger";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const preferredRegion = ["gru1"];

async function run(request: Request) {
  try {
    assertCronSecret(request);
    const admin = createServiceRoleClient();

    const { data: itens } = await admin
      .from("espaco_waitlist")
      .select("id, espaco_generico_id, espaco_unidade_id, usuario_id, inicio, fim, prioridade, status")
      .eq("status", "ativa")
      .order("prioridade", { ascending: false })
      .order("id", { ascending: true })
      .limit(100);

    let notifications = 0;

    for (const item of itens ?? []) {
      const [{ data: reservas }, { data: bloqueios }, { data: espaco }] = await Promise.all([
        admin
          .from("reservas_quadra")
          .select("id")
          .eq("espaco_generico_id", item.espaco_generico_id)
          .eq("espaco_unidade_id", item.espaco_unidade_id)
          .neq("status_reserva", "cancelada")
          .lt("inicio", item.fim)
          .gt("fim", item.inicio)
          .limit(1),
        admin
          .from("espaco_bloqueios")
          .select("id")
          .eq("espaco_generico_id", item.espaco_generico_id)
          .eq("espaco_unidade_id", item.espaco_unidade_id)
          .eq("ativo", true)
          .lt("inicio", item.fim)
          .gt("fim", item.inicio)
          .limit(1),
        admin
          .from("espacos_genericos")
          .select("nome_publico")
          .eq("id", item.espaco_generico_id)
          .maybeSingle(),
      ]);

      const livre = !(reservas?.length || bloqueios?.length);
      if (!livre) continue;

      const expiraEm = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await admin
        .from("espaco_waitlist")
        .update({
          status: "notificada",
          notificado_em: new Date().toISOString(),
          expira_em: expiraEm,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", item.id);

      const { data } = await admin
        .from("notificacoes")
        .insert({
          usuario_id: item.usuario_id,
          mensagem: `Uma vaga abriu em ${espaco?.nome_publico ?? "um espaço"}. Você tem prioridade para reservar este horário.`,
          tipo: "espaco_waitlist",
          referencia_id: item.id,
          lida: false,
          remetente_id: null,
          data_criacao: new Date().toISOString(),
        })
        .select("id")
        .limit(1);
      await triggerPushForNotificationIdsBestEffort([Number((data?.[0] as { id?: number } | undefined)?.id ?? 0)], {
        source: "jobs/espaco-waitlist",
      });
      notifications += 1;
    }

    return NextResponse.json({ ok: true, notifications });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao processar fila de espera.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
