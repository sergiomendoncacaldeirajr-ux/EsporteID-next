"use server";

import { revalidatePath } from "next/cache";
import { triggerPushForNotificationIdsBestEffort } from "@/lib/pwa/push-trigger";
import { createClient } from "@/lib/supabase/server";

export type VagaActionState = { ok: true; message: string } | { ok: false; message: string };

const ROSTER_CAP_DUPLA = 2;
const ROSTER_CAP_TIME = 18;

function rosterCapForTipo(tipo: string | null | undefined): number {
  return String(tipo ?? "")
    .trim()
    .toLowerCase() === "dupla"
    ? ROSTER_CAP_DUPLA
    : ROSTER_CAP_TIME;
}

async function getRosterHeadCountWithFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  timeId: number,
  leaderId?: string | null
): Promise<number> {
  const { data: headRaw, error: headErr } = await supabase.rpc("time_roster_headcount", { p_time_id: timeId });
  if (!headErr) {
    const head = Number(headRaw);
    if (Number.isFinite(head)) return Math.max(0, head);
  }
  const { data: membrosRows } = await supabase
    .from("membros_time")
    .select("usuario_id")
    .eq("time_id", timeId)
    .in("status", ["ativo", "aceito", "aprovado"]);
  const uniq = new Set((membrosRows ?? []).map((row) => String(row.usuario_id ?? "").trim()).filter(Boolean));
  const lid = String(leaderId ?? "").trim();
  if (lid) uniq.add(lid);
  return uniq.size;
}

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
    .select("id, nome, criador_id, tipo, vagas_abertas, aceita_pedidos")
    .eq("id", timeId)
    .maybeSingle();
  if (teamErr) return { ok: false, message: teamErr.message };
  if (!team) return { ok: false, message: "Formação não encontrada." };
  if (team.criador_id === user.id) return { ok: false, message: "Você já é líder desta formação." };
  if (!team.vagas_abertas || !team.aceita_pedidos) {
    return { ok: false, message: "Esta formação não está recebendo candidaturas no momento." };
  }
  const cap = rosterCapForTipo(team.tipo);
  const head = await getRosterHeadCountWithFallback(supabase, timeId, team.criador_id);
  if (head >= cap) {
    return {
      ok: false,
      message:
        cap === ROSTER_CAP_DUPLA
          ? "Dupla completa (líder + 1 membro). Só abre candidatura quando houver vaga."
          : "Time completo no limite de integrantes. Só abre candidatura quando houver vaga.",
    };
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

  const { data: notifRpcId, error: errNotifLider } = await supabase.rpc("notificar_candidatura_time_lider", {
    p_time_id: timeId,
    p_mensagem: `Novo pedido para entrar em "${team.nome ?? "sua formação"}". Abra Social → Equipe para aprovar ou recusar.`,
  });
  const notifLiderId = Number(notifRpcId ?? 0);
  if (errNotifLider) {
    console.error("[candidatarEmVagaAction] notificação ao líder (rpc):", errNotifLider.message, errNotifLider);
  }
  const { error: errNotifSelf } = await supabase.from("notificacoes").insert({
    usuario_id: user.id,
    remetente_id: team.criador_id,
    mensagem: `Você enviou pedido para entrar em "${team.nome ?? "a formação"}".`,
    tipo: "candidatura_time",
    referencia_id: timeId,
    lida: false,
    data_criacao: new Date().toISOString(),
  });
  if (errNotifSelf) {
    console.error("[candidatarEmVagaAction] notificação ao candidato:", errNotifSelf.message, errNotifSelf);
  }
  await triggerPushForNotificationIdsBestEffort([notifLiderId], { source: "vagas/actions.candidatar" });

  revalidatePath("/vagas");
  revalidatePath("/times");
  revalidatePath("/comunidade");
  revalidatePath(`/perfil-time/${timeId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: "Candidatura enviada. O líder recebe aviso no sino e no Social." };
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
  const { data: rowMeta } = await supabase
    .from("time_candidaturas")
    .select("time_id, times(nome, criador_id)")
    .eq("id", candidaturaId)
    .maybeSingle();
  const team = rowMeta
    ? (Array.isArray((rowMeta as { times?: unknown }).times)
        ? (rowMeta as { times?: Array<{ nome?: string | null; criador_id?: string | null }> }).times?.[0]
        : (rowMeta as { times?: { nome?: string | null; criador_id?: string | null } }).times) ?? null
    : null;
  const timeId = Number((rowMeta as { time_id?: number | null } | null)?.time_id ?? 0);
  if (Number.isFinite(timeId) && timeId > 0 && team?.criador_id) {
    await supabase.rpc("limpar_notificacoes_candidatura_time", {
      p_time_id: timeId,
      p_candidato_id: user.id,
      p_lider_id: team.criador_id,
    });
  }

  revalidatePath("/vagas");
  revalidatePath("/times");
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
    .select("id, time_id, candidato_usuario_id, status, times!inner(id, nome, criador_id, tipo, esporte_id)")
    .eq("id", candidaturaId)
    .maybeSingle();
  if (rowErr) return { ok: false, message: rowErr.message };
  if (!row) return { ok: false, message: "Candidatura não encontrada." };

  const team = Array.isArray(row.times) ? row.times[0] : row.times;
  if (!team || team.criador_id !== user.id) return { ok: false, message: "Sem permissão para responder." };
  if (row.status !== "pendente") return { ok: false, message: "Essa candidatura já foi respondida." };

  if (aceitar) {
    const esporteId = Number((team as { esporte_id?: number | null }).esporte_id ?? 0);
    if (Number.isFinite(esporteId) && esporteId > 0) {
      const { data: candidatoEsporte } = await supabase
        .from("usuario_eid")
        .select("usuario_id")
        .eq("usuario_id", row.candidato_usuario_id)
        .eq("esporte_id", esporteId)
        .maybeSingle();
      if (!candidatoEsporte) {
        return {
          ok: false,
          message:
            "Não foi possível aceitar: o atleta não tem esse esporte configurado no perfil EID. Peça para configurar em Editar Performance EID.",
        };
      }
    }
    const cap = rosterCapForTipo((team as { tipo?: string | null }).tipo);
    const { data: jaMembro } = await supabase
      .from("membros_time")
      .select("id")
      .eq("time_id", row.time_id)
      .eq("usuario_id", row.candidato_usuario_id)
      .in("status", ["ativo", "aceito", "aprovado"])
      .maybeSingle();
    if (!jaMembro) {
      const head = await getRosterHeadCountWithFallback(supabase, row.time_id, team.criador_id);
      if (head >= cap) {
        return {
          ok: false,
          message:
            cap === ROSTER_CAP_DUPLA
              ? "Dupla já está com 2 integrantes (líder + 1 membro). Remova um membro antes de aceitar outra candidatura."
              : "Time já está no limite de integrantes. Remova um membro antes de aceitar outra candidatura.",
        };
      }
    }

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

  await supabase.rpc("limpar_notificacoes_candidatura_time", {
    p_time_id: row.time_id,
    p_candidato_id: row.candidato_usuario_id,
    p_lider_id: user.id,
  });

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
  revalidatePath("/times");
  revalidatePath("/comunidade");
  revalidatePath(`/perfil-time/${row.time_id}`);
  revalidatePath("/dashboard");
  return { ok: true, message: aceitar ? "Candidatura aceita e membro adicionado." : "Candidatura recusada." };
}
