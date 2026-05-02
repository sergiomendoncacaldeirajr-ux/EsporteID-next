import type { SupabaseClient } from "@supabase/supabase-js";

/** Membro “vale” no elenco para limite global (alinhado a `time_roster_headcount` / vagas). */
export const MEMBRO_TIME_STATUS_ATIVO = ["ativo", "aceito", "aprovado"] as const;

export type FormacaoSlotsUsados = {
  /** IDs de `times` tipo dupla onde o usuário é líder ou membro ativo. */
  duplaTimeIds: number[];
  /** IDs de `times` que não são dupla (time ou tipo vazio). */
  timeTimeIds: number[];
};

export function bucketFormacaoTipo(tipoRaw: string | null | undefined): "dupla" | "time" {
  return String(tipoRaw ?? "")
    .trim()
    .toLowerCase() === "dupla"
    ? "dupla"
    : "time";
}

/** Texto curto para callouts (candidatura / convite / criação). */
export const AVISO_REGRA_LIMITE_FORMACAO_GLOBAL =
  "Na plataforma cada atleta pode integrar no máximo uma dupla e um time ao mesmo tempo (sendo líder ou membro). Pode combinar os dois tipos, mas não duas duplas nem dois times.";

export const MSG_CANDIDATURA_BLOQUEADA_JA_TEM_DUPLA =
  "Você já integra outra dupla. Só é permitida uma dupla por vez (podendo também integrar um time). Saia da outra dupla ou peça ao líder que remova você antes de se candidatar aqui.";

export const MSG_CANDIDATURA_BLOQUEADA_JA_TEM_TIME =
  "Você já integra outro time. Só é permitido um time por vez (podendo também integrar uma dupla). Saia do outro time ou peça ao líder que remova você antes de se candidatar aqui.";

export const MSG_CONVITE_BLOQUEADO_ALVO_DUPLA =
  "Este atleta já integra outra dupla. Cada pessoa pode estar em no máximo uma dupla e um time ao mesmo tempo (podendo combinar os dois).";

export const MSG_CONVITE_BLOQUEADO_ALVO_TIME =
  "Este atleta já integra outro time. Cada pessoa pode estar em no máximo uma dupla e um time ao mesmo tempo (podendo combinar os dois).";

export const MSG_ACEITAR_CANDIDATURA_BLOQUEADA_DUPLA =
  "Não foi possível aceitar: o candidato já integra outra dupla. Ele precisa sair da outra formação ou ser removido dela antes.";

export const MSG_ACEITAR_CANDIDATURA_BLOQUEADA_TIME =
  "Não foi possível aceitar: o candidato já integra outro time. Ele precisa sair da outra formação ou ser removido dela antes.";

export const MSG_CRIAR_FORMACAO_BLOQUEADA_DUPLA =
  "Você já integra uma dupla (como líder ou membro). Só é permitida uma dupla por vez. Saia da atual ou transfira a liderança antes de criar outra.";

export const MSG_CRIAR_FORMACAO_BLOQUEADA_TIME =
  "Você já integra um time (como líder ou membro). Só é permitido um time por vez. Saia do atual ou transfira a liderança antes de criar outro.";

export async function getFormacaoSlotsUsadosPorUsuario(
  supabase: SupabaseClient,
  usuarioId: string
): Promise<FormacaoSlotsUsados> {
  const duplaIds = new Set<number>();
  const timeIds = new Set<number>();

  const { data: owned } = await supabase.from("times").select("id, tipo").eq("criador_id", usuarioId);
  for (const row of owned ?? []) {
    const id = Number(row.id);
    if (!Number.isFinite(id) || id < 1) continue;
    if (bucketFormacaoTipo(row.tipo) === "dupla") duplaIds.add(id);
    else timeIds.add(id);
  }

  const { data: mem } = await supabase
    .from("membros_time")
    .select("time_id, times(id, tipo)")
    .eq("usuario_id", usuarioId)
    .in("status", [...MEMBRO_TIME_STATUS_ATIVO]);

  for (const row of mem ?? []) {
    const tid = Number(row.time_id);
    if (!Number.isFinite(tid) || tid < 1) continue;
    const t = row.times as { id?: number; tipo?: string | null } | { id?: number; tipo?: string | null }[] | null;
    const tOne = Array.isArray(t) ? t[0] : t;
    const tipo = tOne?.tipo ?? null;
    if (bucketFormacaoTipo(tipo) === "dupla") duplaIds.add(tid);
    else timeIds.add(tid);
  }

  return {
    duplaTimeIds: [...duplaIds],
    timeTimeIds: [...timeIds],
  };
}

/** Bloqueio ao entrar em `timeId` (candidatura, convite, aceite) — ignora a própria formação se já for a mesma. */
export function violacaoLimiteGlobalAoIngressar(
  slots: FormacaoSlotsUsados,
  targetTipo: string | null | undefined,
  targetTimeId: number
): boolean {
  const bucket = bucketFormacaoTipo(targetTipo);
  const same = bucket === "dupla" ? slots.duplaTimeIds : slots.timeTimeIds;
  return same.some((id) => id !== targetTimeId);
}

export function mensagemBloqueioCandidatura(targetTipo: string | null | undefined): string {
  return bucketFormacaoTipo(targetTipo) === "dupla" ? MSG_CANDIDATURA_BLOQUEADA_JA_TEM_DUPLA : MSG_CANDIDATURA_BLOQUEADA_JA_TEM_TIME;
}

export function mensagemBloqueioConviteParaLider(targetTipo: string | null | undefined): string {
  return bucketFormacaoTipo(targetTipo) === "dupla" ? MSG_CONVITE_BLOQUEADO_ALVO_DUPLA : MSG_CONVITE_BLOQUEADO_ALVO_TIME;
}

export function mensagemBloqueioAceitarCandidatura(targetTipo: string | null | undefined): string {
  return bucketFormacaoTipo(targetTipo) === "dupla" ? MSG_ACEITAR_CANDIDATURA_BLOQUEADA_DUPLA : MSG_ACEITAR_CANDIDATURA_BLOQUEADA_TIME;
}
