"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createClient } from "@/lib/supabase/server";
import {
  buscarCandidatos,
  buscarParesRecentes,
  salvarSorteioSimulacao,
} from "@/lib/sorteio-rank/queries";
import { executarSorteio, toIsoDate, ultimoDiaDoMes } from "@/lib/sorteio-rank/engine";
import type { SorteioModalidade, SorteioAlgoritmoLog } from "@/lib/sorteio-rank/types";

// ── Guard ────────────────────────────────────────────────────
async function assertAdmin(): Promise<string> {
  await requirePlatformAdmin(); // redireciona se não for admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user.id;
}

// ── Simular sorteio ──────────────────────────────────────────
export type SimularSorteioState =
  | { ok: true; edicaoId: number; totalPares: number; semPar: number; modoGenero: string }
  | { ok: false; message: string };

export async function adminSimularSorteio(
  _prev: SimularSorteioState | null,
  formData: FormData
): Promise<SimularSorteioState> {
  const adminId = await assertAdmin();

  const esporteId = Number(formData.get("esporte_id"));
  const modalidade = String(formData.get("modalidade") ?? "") as SorteioModalidade;
  const mesRefStr = String(formData.get("mes_ref") ?? "");
  const substituir = formData.get("substituir") === "1";

  if (
    !Number.isFinite(esporteId) ||
    esporteId < 1 ||
    !["individual", "dupla", "time"].includes(modalidade) ||
    !mesRefStr
  ) {
    return { ok: false, message: "Parâmetros inválidos." };
  }

  if (!hasServiceRoleConfig()) {
    return { ok: false, message: "Service role não configurada." };
  }

  const mesRef = new Date(mesRefStr + "-01");
  if (Number.isNaN(mesRef.getTime())) {
    return { ok: false, message: "Mês de referência inválido." };
  }

  const db = createServiceRoleClient();

  let candidatos, paresRecentes;
  try {
    [candidatos, paresRecentes] = await Promise.all([
      buscarCandidatos(db, esporteId, modalidade),
      buscarParesRecentes(db, esporteId, modalidade, mesRef),
    ]);
  } catch (err) {
    return { ok: false, message: `Erro ao buscar candidatos: ${String(err)}` };
  }

  const resultado = executarSorteio(candidatos, paresRecentes);

  if (resultado.pares.length === 0) {
    return {
      ok: false,
      message:
        `Nenhum par viável encontrado. ` +
        `Candidatos: ${resultado.totalCandidatos}. ` +
        resultado.log.slice(-3).join(" "),
    };
  }

  const log: SorteioAlgoritmoLog = {
    totalCandidatos: resultado.totalCandidatos,
    totalPares: resultado.pares.length,
    semPar: resultado.semPar.length,
    modoGenero: resultado.modoGenero,
    log: resultado.log,
    geradoEm: new Date().toISOString(),
  };

  let edicaoId: number;
  try {
    edicaoId = await salvarSorteioSimulacao(db, {
      esporteId,
      modalidade,
      mesRef,
      pares: resultado.pares,
      log,
      criadoPor: adminId,
      substituir,
    });
  } catch (err) {
    return { ok: false, message: `Erro ao salvar simulação: ${String(err)}` };
  }

  revalidatePath("/admin/sorteio-rank");
  return {
    ok: true,
    edicaoId,
    totalPares: resultado.pares.length,
    semPar: resultado.semPar.length,
    modoGenero: resultado.modoGenero,
  };
}

// ── Promover para pendente_aprovacao ─────────────────────────
export async function adminEnviarParaAprovacao(formData: FormData) {
  await assertAdmin();
  if (!hasServiceRoleConfig()) return;

  const edicaoId = Number(formData.get("edicao_id"));
  if (!Number.isFinite(edicaoId) || edicaoId < 1) return;

  const db = createServiceRoleClient();

  const { data: edicao } = await db
    .from("sorteio_rank_edicoes")
    .select("status")
    .eq("id", edicaoId)
    .maybeSingle();

  if (!edicao || !["simulacao"].includes(edicao.status)) return;

  await db
    .from("sorteio_rank_edicoes")
    .update({ status: "pendente_aprovacao" })
    .eq("id", edicaoId);

  revalidatePath("/admin/sorteio-rank");
}

// ── Publicar sorteio ─────────────────────────────────────────
export async function adminPublicarSorteio(formData: FormData) {
  const adminId = await assertAdmin();
  if (!hasServiceRoleConfig()) return;

  const edicaoId = Number(formData.get("edicao_id"));
  if (!Number.isFinite(edicaoId) || edicaoId < 1) return;

  const db = createServiceRoleClient();

  const { data: edicao } = await db
    .from("sorteio_rank_edicoes")
    .select("status, esporte_id, modalidade, mes_ref")
    .eq("id", edicaoId)
    .maybeSingle();

  if (!edicao || !["simulacao", "pendente_aprovacao"].includes(edicao.status)) return;

  // Publica
  await db
    .from("sorteio_rank_edicoes")
    .update({
      status: "publicado",
      publicado_por: adminId,
      publicado_em: new Date().toISOString(),
    })
    .eq("id", edicaoId);

  // Notifica os usuários envolvidos
  const { data: confrontos } = await db
    .from("sorteio_rank_confrontos")
    .select(
      "id, lado1_usuario_id, lado2_usuario_id, lado1_time_id, lado2_time_id, data_limite"
    )
    .eq("edicao_id", edicaoId)
    .eq("status", "pendente");

  if (confrontos?.length) {
    const notifs: object[] = [];
    const mesRef = String(edicao.mes_ref).slice(0, 7); // "YYYY-MM"
    const modalidade = String(edicao.modalidade);
    const modLabel =
      modalidade === "dupla" ? "dupla" : modalidade === "time" ? "time" : "individual";

    for (const c of confrontos) {
      const limite = String(c.data_limite);

      const buildNotif = (uid: string) => ({
        usuario_id: uid,
        tipo: "sorteio_rank",
        mensagem:
          `Sorteio de Ranking (${modLabel}) — seu confronto do mês ${mesRef} está disponível. ` +
          `Agende com seu oponente até ${limite}.`,
        referencia_id: c.id,
        lida: false,
        data_criacao: new Date().toISOString(),
      });

      // Lado 1
      if (c.lado1_usuario_id) notifs.push(buildNotif(String(c.lado1_usuario_id)));
      // Lado 2
      if (c.lado2_usuario_id) notifs.push(buildNotif(String(c.lado2_usuario_id)));

      // Para times: notifica o líder (criador_id)
      if (c.lado1_time_id) {
        const { data: t } = await db
          .from("times")
          .select("criador_id")
          .eq("id", c.lado1_time_id)
          .maybeSingle();
        if (t?.criador_id) notifs.push(buildNotif(String(t.criador_id)));
      }
      if (c.lado2_time_id) {
        const { data: t } = await db
          .from("times")
          .select("criador_id")
          .eq("id", c.lado2_time_id)
          .maybeSingle();
        if (t?.criador_id) notifs.push(buildNotif(String(t.criador_id)));
      }
    }

    if (notifs.length > 0) {
      await db.from("notificacoes").insert(notifs);
    }
  }

  revalidatePath("/admin/sorteio-rank");
}

// ── Cancelar edição ──────────────────────────────────────────
export async function adminCancelarEdicao(formData: FormData) {
  await assertAdmin();
  if (!hasServiceRoleConfig()) return;

  const edicaoId = Number(formData.get("edicao_id"));
  if (!Number.isFinite(edicaoId) || edicaoId < 1) return;

  const db = createServiceRoleClient();
  await db
    .from("sorteio_rank_edicoes")
    .update({ status: "cancelado" })
    .eq("id", edicaoId)
    .not("status", "eq", "publicado"); // Não cancela o já publicado pelo admin aqui

  revalidatePath("/admin/sorteio-rank");
}

// ── Editar par (trocar um lado do confronto) ─────────────────
export type EditarParState =
  | { ok: true }
  | { ok: false; message: string };

export async function adminEditarPar(
  _prev: EditarParState | null,
  formData: FormData
): Promise<EditarParState> {
  await assertAdmin();
  if (!hasServiceRoleConfig()) {
    return { ok: false, message: "Service role não configurada." };
  }

  const confrontoId = Number(formData.get("confronto_id"));
  const lado = String(formData.get("lado") ?? ""); // "lado1" | "lado2"
  const novoUsuarioId = String(formData.get("novo_usuario_id") ?? "").trim();
  const novoTimeId = Number(formData.get("novo_time_id") ?? 0);

  if (!Number.isFinite(confrontoId) || confrontoId < 1) {
    return { ok: false, message: "ID do confronto inválido." };
  }
  if (!["lado1", "lado2"].includes(lado)) {
    return { ok: false, message: "Lado inválido." };
  }

  const db = createServiceRoleClient();

  // Verifica que o confronto existe e está em edição (simulacao/pendente_aprovacao)
  const { data: confront } = await db
    .from("sorteio_rank_confrontos")
    .select("id, edicao_id, sorteio_rank_edicoes(status)")
    .eq("id", confrontoId)
    .maybeSingle();

  if (!confront) return { ok: false, message: "Confronto não encontrado." };

  const edicaoStatus = (
    (Array.isArray(confront.sorteio_rank_edicoes)
      ? confront.sorteio_rank_edicoes[0]
      : confront.sorteio_rank_edicoes) as { status?: string } | null
  )?.status;

  if (!["simulacao", "pendente_aprovacao"].includes(edicaoStatus ?? "")) {
    return {
      ok: false,
      message: "Só é possível editar confrontos de edições em simulação ou pendente aprovação.",
    };
  }

  const update: Record<string, string | number | null> =
    lado === "lado1"
      ? {
          lado1_usuario_id: novoUsuarioId || null,
          lado1_time_id: novoTimeId > 0 ? novoTimeId : null,
        }
      : {
          lado2_usuario_id: novoUsuarioId || null,
          lado2_time_id: novoTimeId > 0 ? novoTimeId : null,
        };

  await db
    .from("sorteio_rank_confrontos")
    .update(update)
    .eq("id", confrontoId);

  revalidatePath("/admin/sorteio-rank");
  return { ok: true };
}

// ── Marcar WO (admin) ────────────────────────────────────────
export async function adminMarcarWo(formData: FormData) {
  await assertAdmin();
  if (!hasServiceRoleConfig()) return;

  const confrontoId = Number(formData.get("confronto_id"));
  const tipoWo = String(formData.get("tipo_wo") ?? ""); // wo_lado1 | wo_lado2 | wo_duplo

  if (
    !Number.isFinite(confrontoId) ||
    confrontoId < 1 ||
    !["wo_lado1", "wo_lado2", "wo_duplo"].includes(tipoWo)
  )
    return;

  const db = createServiceRoleClient();
  await db
    .from("sorteio_rank_confrontos")
    .update({ status: tipoWo })
    .eq("id", confrontoId);

  revalidatePath("/admin/sorteio-rank");
}

// ── Processar WOs automáticos (chamado via cron/job) ─────────
/**
 * Percorre confrontos publicados com data_limite passada e sem
 * resultado; aplica WO conforme quem tentou agendar.
 */
export async function processarWosAutomaticos(): Promise<{
  processados: number;
  erros: string[];
}> {
  if (!hasServiceRoleConfig()) return { processados: 0, erros: ["sem service role"] };

  const db = createServiceRoleClient();
  const hoje = toIsoDate(new Date());

  const { data: confrontos } = await db
    .from("sorteio_rank_confrontos")
    .select(
      `id, lado1_tentou_agendar, lado2_tentou_agendar,
       sorteio_rank_edicoes!inner(status)`
    )
    .eq("sorteio_rank_edicoes.status", "publicado")
    .eq("status", "pendente")
    .lt("data_limite", hoje)
    .limit(200);

  let processados = 0;
  const erros: string[] = [];

  for (const c of confrontos ?? []) {
    const l1 = Boolean(c.lado1_tentou_agendar);
    const l2 = Boolean(c.lado2_tentou_agendar);

    let novoStatus: string;
    if (l1 && !l2) novoStatus = "wo_lado2"; // lado 2 não tentou → WO para lado 1
    else if (!l1 && l2) novoStatus = "wo_lado1"; // lado 1 não tentou → WO para lado 2
    else novoStatus = "wo_duplo"; // ambos não tentaram ou ambos tentaram sem acordo

    const { error } = await db
      .from("sorteio_rank_confrontos")
      .update({ status: novoStatus })
      .eq("id", c.id);

    if (error) erros.push(`confronto ${c.id}: ${error.message}`);
    else processados++;
  }

  return { processados, erros };
}

// ── Admin: reativar participação de um usuário ───────────────
export async function adminReativarParticipante(formData: FormData) {
  await assertAdmin();
  const db = createServiceRoleClient();

  const usuarioId = String(formData.get("usuario_id") ?? "").trim();
  if (!usuarioId) return;

  await db
    .from("profiles")
    .update({ sorteio_rank_ativo: true })
    .eq("id", usuarioId);

  revalidatePath("/admin/sorteio-rank");
}

// ── Toggle sorteio_rank_ativo (usuário) ──────────────────────
export async function toggleSorteioRankAtivo(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const ativo = formData.get("ativo") === "1";

  await supabase
    .from("profiles")
    .update({ sorteio_rank_ativo: ativo })
    .eq("id", user.id);

  revalidatePath("/conta/perfil");
  revalidatePath("/dashboard");
}

// ── Registrar tentativa de agendamento (usuário) ─────────────
export async function registrarTentativaAgendamentoSorteio(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const confrontoId = Number(formData.get("confronto_id"));
  if (!Number.isFinite(confrontoId) || confrontoId < 1) return;

  // Verifica se o usuário é participante
  const { data: c } = await supabase
    .from("sorteio_rank_confrontos")
    .select("id, lado1_usuario_id, lado2_usuario_id")
    .eq("id", confrontoId)
    .maybeSingle();

  if (!c) return;

  const isLado1 = c.lado1_usuario_id === user.id;
  const isLado2 = c.lado2_usuario_id === user.id;
  if (!isLado1 && !isLado2) return;

  const update = isLado1
    ? { lado1_tentou_agendar: true, lado1_tentou_em: new Date().toISOString() }
    : { lado2_tentou_agendar: true, lado2_tentou_em: new Date().toISOString() };

  await supabase
    .from("sorteio_rank_confrontos")
    .update(update)
    .eq("id", confrontoId);
}
