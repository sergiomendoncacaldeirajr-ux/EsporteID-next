import { NextResponse } from "next/server";
import { assertCronSecret } from "@/lib/internal/cron-auth";
import { triggerPushForNotificationIdsBestEffort } from "@/lib/pwa/push-trigger";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const preferredRegion = ["gru1"];

async function run(request: Request) {
  try {
    assertCronSecret(request);
    const admin = createServiceRoleClient();

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { data: aulas } = await admin
      .from("professor_aulas")
      .select("id, professor_id, inicio, espacos_genericos(nome_publico), professor_aula_alunos(aluno_id)")
      .eq("status", "agendada")
      .gte("inicio", now.toISOString())
      .lte("inicio", in24h);

    let notifications = 0;
    for (const aula of aulas ?? []) {
      const espaco = Array.isArray(aula.espacos_genericos) ? aula.espacos_genericos[0] : aula.espacos_genericos;
      const when = aula.inicio ? new Date(aula.inicio) : null;
      const diff = when ? when.getTime() - now.getTime() : 0;
      const tipoJanela = diff <= 2 * 60 * 60 * 1000 ? "2 horas" : "24 horas";
      const mensagem = `Lembrete: sua aula será em ${tipoJanela}, no local ${espaco?.nome_publico ?? "definido na agenda"}.`;

      if (aula.professor_id) {
        const { data } = await admin
          .from("notificacoes")
          .insert({
            usuario_id: aula.professor_id,
            mensagem,
            tipo: "professor_lembrete",
            referencia_id: aula.id,
            lida: false,
            remetente_id: null,
            data_criacao: new Date().toISOString(),
          })
          .select("id")
          .limit(1);
        await triggerPushForNotificationIdsBestEffort([Number((data?.[0] as { id?: number } | undefined)?.id ?? 0)], {
          source: "jobs/professor-lembretes.professor",
        });
        notifications += 1;
      }

      for (const alunoItem of aula.professor_aula_alunos ?? []) {
        if (!alunoItem?.aluno_id) continue;
        const { data } = await admin
          .from("notificacoes")
          .insert({
            usuario_id: alunoItem.aluno_id,
            mensagem,
            tipo: "professor_lembrete",
            referencia_id: aula.id,
            lida: false,
            remetente_id: aula.professor_id,
            data_criacao: new Date().toISOString(),
          })
          .select("id")
          .limit(1);
        await triggerPushForNotificationIdsBestEffort([Number((data?.[0] as { id?: number } | undefined)?.id ?? 0)], {
          source: "jobs/professor-lembretes.aluno",
        });
        notifications += 1;
      }
    }

    return NextResponse.json({ ok: true, notifications });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao enviar lembretes." },
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
