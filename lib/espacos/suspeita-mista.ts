import type { SupabaseClient } from "@supabase/supabase-js";

const FRAUDE_DIAS = 15;

export type EspacoSuspeitoMista = {
  id: number;
  nome_publico: string | null;
  ownership_verificado_em: string | null;
  diasDesdePosse: number;
  reservasGratuitas: number;
  reservasPagas: number;
};

/**
 * Reservas mista + verificação há 15+ dias, pelo menos 1 reserva "gratuita" (valor zero ou reserva_gratuita) e 0 reservas pagas (valor > 0) não canceladas.
 * Atualiza a coluna de alerta no banco.
 */
export async function recalcularFlagSuspeitoMistaSohGratuitas(
  db: SupabaseClient,
  espacoIds: number[] | "all" = "all"
): Promise<EspacoSuspeitoMista[]> {
  const lim = new Date();
  lim.setDate(lim.getDate() - FRAUDE_DIAS);
  const limIso = lim.toISOString();
  const limiteMs = lim.getTime();

  let q = db
    .from("espacos_genericos")
    .select("id, nome_publico, ownership_verificado_em, modo_reserva, ownership_status")
    .eq("modo_reserva", "mista")
    .eq("ownership_status", "verificado")
    .not("ownership_verificado_em", "is", null)
    .lt("ownership_verificado_em", limIso);
  if (espacoIds !== "all" && espacoIds.length) {
    q = q.in("id", espacoIds);
  }
  const { data: candidatos, error: e1 } = await q;
  if (e1) {
    console.error(e1);
    return [];
  }
  await db
    .from("espacos_genericos")
    .update({ operacao_suspeita_somente_reservas_gratis: false, operacao_suspeita_observacao: null })
    .eq("modo_reserva", "mista");
  if (!candidatos?.length) {
    return [];
  }

  const out: EspacoSuspeitoMista[] = [];
  for (const c of candidatos) {
    const eid = Number(c.id);
    if (!Number.isFinite(eid)) continue;
    const verT = c.ownership_verificado_em
      ? new Date(String(c.ownership_verificado_em)).getTime()
      : 0;
    if (!verT || verT > limiteMs) continue;

    const { data: rlist, error: rerr } = await db
      .from("reservas_quadra")
      .select("id, valor_total, reserva_gratuita")
      .eq("espaco_generico_id", eid)
      .not("status_reserva", "eq", "cancelada");
    if (rerr) {
      continue;
    }
    const list = (rlist ?? []) as { valor_total: number | null; reserva_gratuita: boolean }[];
    const nPagas = list.filter(
      (r) => !r.reserva_gratuita && (Number(r.valor_total) || 0) > 0.01
    ).length;
    if (nPagas > 0) {
      await db
        .from("espacos_genericos")
        .update({ operacao_suspeita_somente_reservas_gratis: false, operacao_suspeita_observacao: null })
        .eq("id", eid);
      continue;
    }
    const ng = list.filter((r) => r.reserva_gratuita || (Number(r.valor_total) || 0) <= 0.01).length;
    if (ng < 1) {
      await db
        .from("espacos_genericos")
        .update({ operacao_suspeita_somente_reservas_gratis: false })
        .eq("id", eid);
      continue;
    }
    const obs = `Após ${FRAUDE_DIAS}+ dias de posse verificada, há ${ng} reserva(s) aparentemente gratuita(s) e nenhuma paga. Revise risco de fraude.`;
    await db
      .from("espacos_genericos")
      .update({ operacao_suspeita_somente_reservas_gratis: true, operacao_suspeita_observacao: obs })
      .eq("id", eid);
    out.push({
      id: eid,
      nome_publico: c.nome_publico,
      ownership_verificado_em: c.ownership_verificado_em as string,
      diasDesdePosse: Math.floor((Date.now() - verT) / 86400000),
      reservasGratuitas: ng,
      reservasPagas: 0,
    });
  }
  return out;
}