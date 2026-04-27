"use server";

import { revalidatePath } from "next/cache";
import { triggerPushForNotificationIdsBestEffort } from "@/lib/pwa/push-trigger";
import { createClient } from "@/lib/supabase/server";

export type VagaActionState = { ok: true; message: string } | { ok: false; message: string };

async function getAuthUserOrFail() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };
  return { supabase, user };
}

export async function candidatarEmVagaAction(
  _prev: VagaActionState | undefined,
  formData: FormData
): Promise<VagaActionState> {
  const { supabase, user } = await getAuthUserOrFail();
  if (!user) return { ok: false, message: "Sessão expirada. Faça login novamente." };

  const timeId = Number(formData.get("time_id"));
  const mensagemRaw = String(formData.get("mensagem") ?? "").trim();
  const mensagem = mensagemRaw ? mensagemRaw.slice(0, 280) : null;
  if (!Number.isFinite(timeId) || timeId < 1) return { ok: false, message: "Vaga inválida." };

  const { data: team, error: teamErr } = await supabase
    .from("times")
    .select("id, nome, criador_id, vagas_abertas, aceita_pedidos")
    .eq("id", timeId)
    .maybeSingle();
  if (teamErr) return { ok: false, message: teamErr.message };
  if (!team) return { ok: false, message: "Formação não encontrada." };
  if (team.criador_id === user.id) return { ok: false, message: "Você já é líder desta formação." };
  if (!team.vagas_abertas || !team.aceita_pedidos) {
    return { ok: false, message: "Esta formação não está recebendo candidaturas no momento." };
  }

  const { data: membro } = await supabase
    .from("membros_time")
    .select("usuario_id")
    .eq("time_id", timeId)
    .eq("usuario_id", user.id)
    .eq("status", "ativo")
    .maybeSingle();
  if (membro) return { ok: false, message: "Você já faz parte desta formação." };

  const { error: upsertErr } = await supabase.from("time_candidaturas").upsert(
    {
      time_id: timeId,
      candidato_usuario_id: user.id,
      status: "pendente",
      mensagem,
      respondido_por_usuario_id: null,
      respondido_em: null,
    },
    { onConflict: "time_id,candidato_usuario_id" }
  );
  if (upsertErr) return { ok: false, message: upsertErr.message };

  const { data: notifCandidatura } = await supabase
    .from("notificacoes")
    .insert({
      usuario_id: team.criador_id,
      remetente_id: user.id,
      mensagem: `Novo pedido para entrar em "${team.nome ?? "sua formação"}".`,
      tipo: "candidatura_time",
      referencia_id: timeId,
      lida: false,
      data_criacao: new Date().toISOString(),
    })
    .select("id")
    .limit(1);
  await triggerPushForNotificationIdsBestEffort([Number((notifCandidatura?.[0] as { id?: number } | undefined)?.id ?? 0)], {
    source: "vagas/actions.candidatar",
  });

  revalidatePath("/vagas");
  revalidatePath("/comunidade");
  revalidatePath(`/perfil-time/${timeId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Candidatura enviada. O líder será notificado no Social." };
}

export async function cancelarCandidaturaAction(
  _prev: VagaActionState | undefined,
  formData: FormData
): Promise<VagaActionState> {
  const { supabase, user } = await getAuthUserOrFail();
  if (!user) return { ok: false, message: "Sessão expirada." };
  const candidaturaId = Number(formData.get("candidatura_id"));
  if (!Number.isFinite(candidaturaId) || candidaturaId < 1) return { ok: false, message: "Candidatura inválida." };

  const { data: row, error: rowErr } = await supabase
    .from("time_candidaturas")
    .select("id, status")
    .eq("id", candidaturaId)
    .eq("candidato_usuario_id", user.id)
    .maybeSingle();
  if (rowErr) return { ok: false, message: rowErr.message };
  if (!row) return { ok: false, message: "Candidatura não encontrada." };
  if (row.status !== "pendente") return { ok: false, message: "Só é possível cancelar candidaturas pendentes." };

  const { error } = await supabase
    .from("time_candidaturas")
    .update({ status: "cancelada", respondido_em: new Date().toISOString(), respondido_por_usuario_id: user.id })
    .eq("id", candidaturaId)
    .eq("candidato_usuario_id", user.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/vagas");
  revalidatePath("/comunidade");
  revalidatePath("/dashboard");
  return { ok: true, message: "Candidatura cancelada." };
}

export async function responderCandidaturaAction(
  _prev: VagaActionState | undefined,
  formData: FormData
): Promise<VagaActionState> {
  const { supabase, user } = await getAuthUserOrFail();
  if (!user) return { ok: false, message: "Sessão expirada." };
  const candidaturaId = Number(formData.get("candidatura_id"));
  const aceitar = String(formData.get("aceitar") ?? "") === "true";
  if (!Number.isFinite(candidaturaId) || candidaturaId < 1) return { ok: false, message: "Candidatura inválida." };

  const { data: row, error: rowErr } = await supabase
    .from("time_candidaturas")
    .select("id, time_id, candidato_usuario_id, status, times!inner(id, nome, criador_id)")
    .eq("id", candidaturaId)
    .maybeSingle();
  if (rowErr) return { ok: false, message: rowErr.message };
  if (!row) return { ok: false, message: "Candidatura não encontrada." };

  const team = Array.isArray(row.times) ? row.times[0] : row.times;
  if (!team || team.criador_id !== user.id) return { ok: false, message: "Sem permissão para responder." };
  if (row.status !== "pendente") return { ok: false, message: "Essa candidatura já foi respondida." };

  if (aceitar) {
    const { error: membroErr } = await supabase.from("membros_time").upsert(
      {
        time_id: row.time_id,
        usuario_id: row.candidato_usuario_id,
        cargo: "Membro",
        status: "ativo",
        data_adesao: new Date().toISOString(),
      },
      { onConflict: "time_id,usuario_id" }
    );
    if (membroErr) return { ok: false, message: membroErr.message };
  }

  const nextStatus = aceitar ? "aceita" : "recusada";
  const { error: updateErr } = await supabase
    .from("time_candidaturas")
    .update({
      status: nextStatus,
      respondido_por_usuario_id: user.id,
      respondido_em: new Date().toISOString(),
    })
    .eq("id", candidaturaId);
  if (updateErr) return { ok: false, message: updateErr.message };

  const { data: notifResposta } = await supabase
    .from("notificacoes")
    .insert({
      usuario_id: row.candidato_usuario_id,
      remetente_id: user.id,
      mensagem: aceitar
        ? `Sua candidatura para "${team.nome ?? "a formação"}" foi aceita.`
        : `Sua candidatura para "${team.nome ?? "a formação"}" foi recusada.`,
      tipo: "candidatura_time",
      referencia_id: candidaturaId,
      lida: false,
      data_criacao: new Date().toISOString(),
    })
    .select("id")
    .limit(1);
  await triggerPushForNotificationIdsBestEffort([Number((notifResposta?.[0] as { id?: number } | undefined)?.id ?? 0)], {
    source: "vagas/actions.responder",
  });

  revalidatePath("/vagas");
  revalidatePath("/comunidade");
  revalidatePath(`/perfil-time/${row.time_id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: aceitar ? "Candidatura aceita e membro adicionado." : "Candidatura recusada." };
}
