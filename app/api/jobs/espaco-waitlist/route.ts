import { NextResponse } from "next/server";
import { normalizeEspacoReservaConfig } from "@/lib/espacos/config";
import { avaliarBeneficiosSocioEspaco } from "@/lib/espacos/eligibility";
import { assertCronSecret } from "@/lib/internal/cron-auth";
import { triggerPushForNotificationIdsBestEffort } from "@/lib/pwa/push-trigger";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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

    let converted = 0;
    let skipped = 0;

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
          .select("id, nome_publico, modo_reserva, configuracao_reservas_json")
          .eq("id", item.espaco_generico_id)
          .maybeSingle(),
      ]);

      if (String(espaco?.modo_reserva ?? "").toLowerCase() === "paga") {
        await admin
          .from("espaco_waitlist")
          .update({
            status: "cancelada",
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", item.id);
        skipped += 1;
        continue;
      }

      const livre = !(reservas?.length || bloqueios?.length);
      if (!livre) continue;

      const { data: socio } = await admin
        .from("espaco_socios")
        .select("id, status, documentos_status, financeiro_status, beneficios_liberados, validade_ate, plano_socio_id")
        .eq("espaco_generico_id", item.espaco_generico_id)
        .eq("usuario_id", item.usuario_id)
        .maybeSingle();
      const { data: plano } = socio?.plano_socio_id
        ? await admin.from("espaco_planos_socio").select("*").eq("id", Number(socio.plano_socio_id)).maybeSingle()
        : { data: null };

      const benefit = avaliarBeneficiosSocioEspaco({
        socio,
        plano,
        configuracaoEspaco: espaco?.configuracao_reservas_json,
      });
      const cfgReservas = normalizeEspacoReservaConfig(espaco?.configuracao_reservas_json);
      const inicioDate = new Date(String(item.inicio));
      const antecedenciaHoras = (inicioDate.getTime() - Date.now()) / (1000 * 60 * 60);
      let elegivel = benefit.ok && cfgReservas.reservasGratisLiberadas;
      if (elegivel && antecedenciaHoras < benefit.antecedenciaMinHoras) elegivel = false;
      if (elegivel && benefit.antecedenciaMaxDias > 0 && antecedenciaHoras > benefit.antecedenciaMaxDias * 24) elegivel = false;

      const inicioDia = new Date(new Date(inicioDate).setHours(0, 0, 0, 0)).toISOString();
      const fimDia = new Date(new Date(inicioDate).setHours(23, 59, 59, 999)).toISOString();
      const inicioSemana = new Date(inicioDate);
      inicioSemana.setDate(inicioDate.getDate() - inicioDate.getDay());
      inicioSemana.setHours(0, 0, 0, 0);
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 7);
      fimSemana.setMilliseconds(-1);
      const [{ count: countDia }, { count: countSemana }, { data: ultimaReserva }] = await Promise.all([
        admin
          .from("reservas_quadra")
          .select("id", { count: "exact", head: true })
          .eq("espaco_generico_id", item.espaco_generico_id)
          .eq("usuario_solicitante_id", item.usuario_id)
          .neq("status_reserva", "cancelada")
          .gte("inicio", inicioDia)
          .lte("inicio", fimDia),
        admin
          .from("reservas_quadra")
          .select("id", { count: "exact", head: true })
          .eq("espaco_generico_id", item.espaco_generico_id)
          .eq("usuario_solicitante_id", item.usuario_id)
          .neq("status_reserva", "cancelada")
          .gte("inicio", inicioSemana.toISOString())
          .lte("inicio", fimSemana.toISOString()),
        admin
          .from("reservas_quadra")
          .select("inicio")
          .eq("espaco_generico_id", item.espaco_generico_id)
          .eq("usuario_solicitante_id", item.usuario_id)
          .order("inicio", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (elegivel && benefit.limiteReservasDia > 0 && Number(countDia ?? 0) >= benefit.limiteReservasDia) elegivel = false;
      if (elegivel && benefit.limiteReservasSemana > 0 && Number(countSemana ?? 0) >= benefit.limiteReservasSemana) elegivel = false;
      if (elegivel && benefit.cooldownHoras > 0 && ultimaReserva?.inicio) {
        const diffHours = Math.abs(inicioDate.getTime() - new Date(String(ultimaReserva.inicio)).getTime()) / (1000 * 60 * 60);
        if (diffHours < benefit.cooldownHoras) elegivel = false;
      }

      if (!elegivel) {
        await admin
          .from("espaco_waitlist")
          .update({
            status: "cancelada",
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", item.id);
        skipped += 1;
        continue;
      }

      const { data: reserva, error: reservaErr } = await admin
        .from("reservas_quadra")
        .insert({
          espaco_generico_id: item.espaco_generico_id,
          espaco_unidade_id: item.espaco_unidade_id,
          usuario_solicitante_id: item.usuario_id,
          valor_total: 0,
          payment_status: "isento",
          status_reserva: "confirmada",
          inicio: item.inicio,
          fim: item.fim,
          tipo_reserva: "socio",
          origem_reserva: "waitlist",
          reserva_gratuita: true,
          espaco_socio_id: socio?.id ?? null,
          plano_socio_id: socio?.plano_socio_id ?? null,
          detalhes_json: { origem: "fila_automatica", waitlist_id: item.id },
          atualizado_por: item.usuario_id,
        })
        .select("id")
        .single();
      if (reservaErr || !reserva?.id) {
        skipped += 1;
        continue;
      }

      await admin.from("espaco_reserva_participantes").insert({
        reserva_quadra_id: reserva.id,
        usuario_id: item.usuario_id,
        papel: "titular",
        status: "confirmado",
      });

      await admin
        .from("espaco_waitlist")
        .update({
          status: "convertida",
          reserva_quadra_id: reserva.id,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", item.id);

      const { data } = await admin
        .from("notificacoes")
        .insert({
          usuario_id: item.usuario_id,
          mensagem: `Uma vaga abriu em ${espaco?.nome_publico ?? "um espaço"} e sua reserva foi confirmada automaticamente pela fila.`,
          tipo: "espaco_waitlist",
          referencia_id: reserva.id,
          lida: false,
          remetente_id: null,
          data_criacao: new Date().toISOString(),
        })
        .select("id")
        .limit(1);
      await triggerPushForNotificationIdsBestEffort([Number((data?.[0] as { id?: number } | undefined)?.id ?? 0)], {
        source: "jobs/espaco-waitlist",
      });
      converted += 1;
    }

    return NextResponse.json({ ok: true, converted, skipped });
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
