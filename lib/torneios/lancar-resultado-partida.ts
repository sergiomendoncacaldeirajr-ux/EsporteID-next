import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canLaunchTorneioScore, getTorneioStaffAccess } from "@/lib/torneios/staff";

/** Contexto mínimo de `partidas` para permissões e lançamento de placar (torneio + desafio). */
export type PartidaCtx = {
  id: number;
  match_id: number | null;
  esporte_id: number | null;
  torneio_id: number | null;
  jogador1_id: string | null;
  jogador2_id: string | null;
  usuario_id: string | null;
  desafiante_id: string | null;
  desafiado_id: string | null;
  status: string | null;
  status_ranking: string | null;
  lancado_por: string | null;
  placar_1: number | null;
  placar_2: number | null;
  time1_id: number | null;
  time2_id: number | null;
  modalidade: string | null;
  esportes?: { nome?: string | null } | Array<{ nome?: string | null }> | null;
};

export type ActorScope = {
  isColetivo: boolean;
  isParticipant: boolean;
  isTeamOwner: boolean;
  isTeamMember: boolean;
};

export async function getActorScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  partida: PartidaCtx,
  userId: string
): Promise<ActorScope> {
  const modalidade = String(partida.modalidade ?? "")
    .trim()
    .toLowerCase();
  const isColetivo = modalidade === "dupla" || modalidade === "time" || Boolean(partida.time1_id || partida.time2_id);
  const isParticipant = partida.jogador1_id === userId || partida.jogador2_id === userId;
  if (!isColetivo) return { isColetivo, isParticipant, isTeamOwner: false, isTeamMember: false };

  const timeIds = [partida.time1_id, partida.time2_id].filter((v): v is number => typeof v === "number" && v > 0);
  if (!timeIds.length) return { isColetivo, isParticipant, isTeamOwner: false, isTeamMember: false };

  const [{ data: ownerRows }, { data: memberRows }] = await Promise.all([
    supabase.from("times").select("id, criador_id").in("id", timeIds),
    supabase
      .from("membros_time")
      .select("time_id, usuario_id, status")
      .in("time_id", timeIds)
      .eq("usuario_id", userId)
      .in("status", ["ativo", "aceito", "aprovado"]),
  ]);
  const isTeamOwner = (ownerRows ?? []).some((t) => t.criador_id === userId);
  const isTeamMember = (memberRows ?? []).length > 0;
  return { isColetivo, isParticipant, isTeamOwner, isTeamMember };
}

export async function loadPartidaContext(partidaId: number, userId: string) {
  const supabase = await createClient();
  const { data: partida } = await supabase
    .from("partidas")
    .select(
      "id, match_id, esporte_id, torneio_id, jogador1_id, jogador2_id, usuario_id, desafiante_id, desafiado_id, status, status_ranking, lancado_por, placar_1, placar_2, time1_id, time2_id, modalidade, esportes(nome)"
    )
    .eq("id", partidaId)
    .maybeSingle();
  if (!partida) {
    return {
      supabase,
      partida: null,
      podeRegistrarTorneio: false,
      scope: { isColetivo: false, isParticipant: false, isTeamOwner: false, isTeamMember: false } as ActorScope,
    };
  }
  const scope = await getActorScope(supabase, partida as PartidaCtx, userId);
  const torneioAccess = partida.torneio_id
    ? await getTorneioStaffAccess(supabase, Number(partida.torneio_id), userId)
    : null;
  const podeRegistrarTorneio = torneioAccess ? canLaunchTorneioScore(torneioAccess) : false;
  return { supabase, partida: partida as PartidaCtx, scope, podeRegistrarTorneio };
}

/** Revalida telas afetadas ao lançar/confirmar/contestar placar ou salvar agenda (inclui torneio quando `torneio_id` está preenchido). */
export function revalidateAfterPartidaPlacarChange(partidaId: number, torneioId: number | null | undefined) {
  revalidatePath(`/registrar-placar/${partidaId}`);
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/comunidade");
  const tid = torneioId != null && Number.isFinite(Number(torneioId)) ? Number(torneioId) : null;
  if (tid != null && tid > 0) {
    revalidatePath(`/torneios/${tid}`);
    revalidatePath(`/torneios/${tid}/operacao`);
    revalidatePath(`/torneios/${tid}/chave`);
    revalidatePath(`/conta/torneio/${tid}`);
  }
}
