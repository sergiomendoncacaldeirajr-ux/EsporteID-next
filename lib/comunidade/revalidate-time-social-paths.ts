import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolverTimeIdParaDuplaRegistrada } from "@/lib/perfil/whatsapp-visibility";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Invalida caches das superfícies ligadas a um `time_id` (perfil-time, edição, Social, etc.)
 * e, se for formação dupla no radar, também `/perfil-dupla/[duplas.id]` (URL diferente de `/perfil-time/`).
 */
export async function revalidateAfterTimeRosterOrConviteChange(
  supabase: SupabaseClient,
  opts: { timeId: number; leaderId: string; affectedProfileIds?: string[] }
): Promise<void> {
  const { timeId, leaderId, affectedProfileIds = [] } = opts;
  if (!Number.isInteger(timeId) || timeId < 1) return;

  revalidatePath(`/editar/time/${timeId}`);
  revalidatePath(`/conta/formacao/time/${timeId}`);
  revalidatePath(`/perfil-time/${timeId}`);
  revalidatePath("/comunidade");
  revalidatePath("/times");

  if (UUID_RE.test(leaderId)) {
    revalidatePath(`/perfil/${leaderId}`);
  }
  for (const uid of affectedProfileIds) {
    const u = String(uid ?? "").trim();
    if (u && u !== leaderId && UUID_RE.test(u)) {
      revalidatePath(`/perfil/${u}`);
    }
  }

  const { data: team } = await supabase
    .from("times")
    .select("esporte_id, tipo, criador_id")
    .eq("id", timeId)
    .maybeSingle();
  if (!team || String(team.tipo ?? "").toLowerCase() !== "dupla" || team.esporte_id == null) {
    return;
  }

  const espId = Number(team.esporte_id);
  const criador = String(team.criador_id ?? "").trim();

  const { data: memRows } = await supabase
    .from("membros_time")
    .select("usuario_id")
    .eq("time_id", timeId)
    .in("status", ["ativo", "aceito", "aprovado"]);
  const memIds = [...new Set((memRows ?? []).map((r) => String(r.usuario_id ?? "").trim()).filter(Boolean))];

  let duplaId: number | null = null;

  if (memIds.length >= 2) {
    const a = memIds[0]!;
    const b = memIds[1]!;
    const { data: r1 } = await supabase
      .from("duplas")
      .select("id")
      .eq("esporte_id", espId)
      .eq("player1_id", a)
      .eq("player2_id", b)
      .maybeSingle();
    const { data: r2 } = await supabase
      .from("duplas")
      .select("id")
      .eq("esporte_id", espId)
      .eq("player1_id", b)
      .eq("player2_id", a)
      .maybeSingle();
    const id = Number(r1?.id ?? r2?.id ?? 0);
    if (Number.isFinite(id) && id > 0) duplaId = id;
  }

  if (duplaId == null && criador && UUID_RE.test(criador)) {
    const { data: candidates } = await supabase
      .from("duplas")
      .select("id, player1_id, player2_id")
      .eq("esporte_id", espId)
      .or(`player1_id.eq.${criador},player2_id.eq.${criador}`);
    for (const d of candidates ?? []) {
      const tid = await resolverTimeIdParaDuplaRegistrada(
        supabase,
        String(d.player1_id),
        String(d.player2_id),
        espId
      );
      if (tid === timeId) {
        duplaId = Number(d.id);
        break;
      }
    }
  }

  if (duplaId != null && Number.isFinite(duplaId) && duplaId > 0) {
    revalidatePath(`/perfil-dupla/${duplaId}`);
  }
}
