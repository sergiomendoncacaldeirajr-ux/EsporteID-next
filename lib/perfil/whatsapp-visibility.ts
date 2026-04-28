import type { SupabaseClient } from "@supabase/supabase-js";

/** Link wa.me a partir do número salvo no perfil (mesma regra das páginas de perfil). */
export function waMeHref(whatsapp: string | null | undefined): string | null {
  const d = String(whatsapp ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
}

/**
 * Regras de exibição do WhatsApp no perfil público (visitante vendo outro atleta):
 * - próprio perfil: sempre pode ver o próprio contato (se cadastrado);
 * - existe match com status "Aceito" entre os dois;
 * - existem partidas de torneio (torneio_id preenchido) em que ambos aparecem como jogadores.
 */
export async function podeExibirWhatsappPerfilPublico(
  supabase: SupabaseClient,
  visitanteId: string,
  perfilId: string,
  isSelf: boolean
): Promise<boolean> {
  if (isSelf) return true;

  const { data: aceitoA } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "Aceito")
    .eq("usuario_id", visitanteId)
    .eq("adversario_id", perfilId)
    .limit(1);

  const { data: aceitoB } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "Aceito")
    .eq("usuario_id", perfilId)
    .eq("adversario_id", visitanteId)
    .limit(1);

  if ((aceitoA?.length ?? 0) > 0 || (aceitoB?.length ?? 0) > 0) return true;

  const { data: t1 } = await supabase
    .from("partidas")
    .select("id")
    .not("torneio_id", "is", null)
    .gt("torneio_id", 0)
    .eq("jogador1_id", visitanteId)
    .eq("jogador2_id", perfilId)
    .limit(1);

  if ((t1?.length ?? 0) > 0) return true;

  const { data: t2 } = await supabase
    .from("partidas")
    .select("id")
    .not("torneio_id", "is", null)
    .gt("torneio_id", 0)
    .eq("jogador1_id", perfilId)
    .eq("jogador2_id", visitanteId)
    .limit(1);

  return (t2?.length ?? 0) > 0;
}

export async function podeExibirWhatsappProfessor(
  supabase: SupabaseClient,
  visitanteId: string | null | undefined,
  professorId: string,
  isSelf: boolean
): Promise<boolean> {
  if (isSelf) return true;

  const { data: perfil } = await supabase
    .from("professor_perfil")
    .select("whatsapp_visibilidade, perfil_publicado")
    .eq("usuario_id", professorId)
    .maybeSingle();

  const visibilidade = String(perfil?.whatsapp_visibilidade ?? "publico");
  if (visibilidade === "oculto") return false;
  if (visibilidade === "publico") return true;
  if (!visitanteId) return false;

  const { data: solicitacaoAceita } = await supabase
    .from("professor_solicitacoes_aula")
    .select("id")
    .eq("professor_id", professorId)
    .eq("aluno_id", visitanteId)
    .eq("status", "aceita")
    .limit(1);
  if ((solicitacaoAceita?.length ?? 0) > 0) return true;

  const { data: vinculo } = await supabase
    .from("professor_aula_alunos")
    .select("id, professor_aulas!inner(professor_id)")
    .eq("aluno_id", visitanteId)
    .eq("professor_aulas.professor_id", professorId)
    .limit(1);

  return (vinculo?.length ?? 0) > 0;
}

/**
 * Esportes em que já existe pedido de match com status "Aceito" entre os dois perfis
 * (fluxo de ranking / lançamento de resultado). Usado para não esconder "Solicitar match"
 * só porque o WhatsApp foi liberado por partida de torneio.
 */
export async function esporteIdsComMatchAceitoEntre(
  supabase: SupabaseClient,
  visitanteId: string,
  perfilId: string
): Promise<Set<number>> {
  const out = new Set<number>();

  const { data: aParaB } = await supabase
    .from("matches")
    .select("esporte_id")
    .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente"])
    .eq("finalidade", "ranking")
    .eq("usuario_id", visitanteId)
    .eq("adversario_id", perfilId);

  const { data: bParaA } = await supabase
    .from("matches")
    .select("esporte_id")
    .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente"])
    .eq("finalidade", "ranking")
    .eq("usuario_id", perfilId)
    .eq("adversario_id", visitanteId);

  for (const row of [...(aParaB ?? []), ...(bParaA ?? [])]) {
    const e = Number(row.esporte_id);
    if (Number.isFinite(e) && e > 0) out.add(e);
  }

  return out;
}

/** Partida de torneio registrada entre duas formações (times). */
export async function temPartidaTorneioEntreTimes(
  supabase: SupabaseClient,
  timeIdA: number,
  timeIdB: number
): Promise<boolean> {
  if (!Number.isFinite(timeIdA) || !Number.isFinite(timeIdB) || timeIdA < 1 || timeIdB < 1 || timeIdA === timeIdB) {
    return false;
  }
  const { data: ab } = await supabase
    .from("partidas")
    .select("id")
    .not("torneio_id", "is", null)
    .gt("torneio_id", 0)
    .eq("time1_id", timeIdA)
    .eq("time2_id", timeIdB)
    .limit(1);
  if ((ab?.length ?? 0) > 0) return true;
  const { data: ba } = await supabase
    .from("partidas")
    .select("id")
    .not("torneio_id", "is", null)
    .gt("torneio_id", 0)
    .eq("time1_id", timeIdB)
    .eq("time2_id", timeIdA)
    .limit(1);
  return (ba?.length ?? 0) > 0;
}

/**
 * WhatsApp no perfil de uma formação (time/dupla): mesmo critério que atleta x líder,
 * ou confronto de torneio entre o time do visitante e o time visitado.
 */
export async function podeExibirWhatsappPerfilFormacao(
  supabase: SupabaseClient,
  visitanteId: string,
  criadorId: string,
  alvoTimeId: number,
  visitanteTimeId: number | null
): Promise<boolean> {
  if (visitanteId === criadorId) return true;
  if (await podeExibirWhatsappPerfilPublico(supabase, visitanteId, criadorId, false)) return true;

  const { data: membroAlvo } = await supabase
    .from("membros_time")
    .select("id")
    .eq("time_id", alvoTimeId)
    .eq("usuario_id", visitanteId)
    .eq("status", "ativo")
    .limit(1);
  if ((membroAlvo?.length ?? 0) > 0) return true;

  if (visitanteTimeId != null && visitanteTimeId > 0) {
    if (await temPartidaTorneioEntreTimes(supabase, visitanteTimeId, alvoTimeId)) return true;
  }
  return false;
}

/**
 * Já existe match Aceito entre a formação do visitante e o time alvo (ranking).
 * visitanteTimeId pode ser null se o visitante não for líder de formação naquele esporte —
 * ainda assim vale o caso em que ele foi quem desafiou (usuario_id + adversario_time_id).
 */
export async function formacaoTemMatchAceitoEntre(
  supabase: SupabaseClient,
  visitanteId: string,
  visitanteTimeId: number | null,
  alvoTimeId: number,
  alvoCriadorId: string,
  esporteId: number,
  modalidade: "dupla" | "time"
): Promise<boolean> {
  const { data: comoDesafiante } = await supabase
    .from("matches")
    .select("id")
    .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente"])
    .eq("finalidade", "ranking")
    .eq("usuario_id", visitanteId)
    .eq("adversario_time_id", alvoTimeId)
    .eq("esporte_id", esporteId)
    .eq("modalidade_confronto", modalidade)
    .limit(1);
  if ((comoDesafiante?.length ?? 0) > 0) return true;
  if (visitanteTimeId != null && visitanteTimeId > 0) {
    const { data: comoDesafiado } = await supabase
      .from("matches")
      .select("id")
      .in("status", ["Aceito", "CancelamentoPendente", "ReagendamentoPendente"])
      .eq("finalidade", "ranking")
      .eq("usuario_id", alvoCriadorId)
      .eq("adversario_id", visitanteId)
      .eq("adversario_time_id", visitanteTimeId)
      .eq("esporte_id", esporteId)
      .eq("modalidade_confronto", modalidade)
      .limit(1);
    if ((comoDesafiado?.length ?? 0) > 0) return true;
  }
  return false;
}

/** Dupla registrada na tabela `duplas` → `times.id` quando os dois jogadores são membros ativos da mesma formação dupla no esporte. */
export async function resolverTimeIdParaDuplaRegistrada(
  supabase: SupabaseClient,
  player1Id: string,
  player2Id: string,
  esporteId: number
): Promise<number | null> {
  const { data: m1 } = await supabase
    .from("membros_time")
    .select("time_id")
    .eq("usuario_id", player1Id)
    .eq("status", "ativo");
  const candidatos = [...new Set((m1 ?? []).map((r) => r.time_id).filter((id) => id != null))] as number[];
  if (candidatos.length === 0) return null;
  const { data: m2 } = await supabase
    .from("membros_time")
    .select("time_id")
    .eq("usuario_id", player2Id)
    .eq("status", "ativo")
    .in("time_id", candidatos);
  const comum = [...new Set((m2 ?? []).map((r) => r.time_id).filter((id) => id != null))] as number[];
  if (comum.length === 0) return null;
  const { data: timesRows } = await supabase.from("times").select("id, tipo").in("id", comum).eq("esporte_id", esporteId);
  const dupla = (timesRows ?? []).find((t) => String(t.tipo ?? "").trim().toLowerCase() === "dupla");
  return dupla?.id ?? null;
}
