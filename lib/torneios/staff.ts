import type { SupabaseClient } from "@supabase/supabase-js";

export type TorneioStaffAccess = {
  isOrganizer: boolean;
  isScorekeeper: boolean;
};

export async function getTorneioStaffAccess(
  supabase: SupabaseClient,
  torneioId: number,
  userId: string
): Promise<TorneioStaffAccess> {
  const [{ data: torneio }, { data: staff }] = await Promise.all([
    supabase.from("torneios").select("criador_id").eq("id", torneioId).maybeSingle(),
    supabase
      .from("torneio_staff")
      .select("id")
      .eq("torneio_id", torneioId)
      .eq("usuario_id", userId)
      .eq("papel", "lancador_placar")
      .eq("status", "ativo")
      .maybeSingle(),
  ]);

  return {
    isOrganizer: torneio?.criador_id === userId,
    isScorekeeper: Boolean(staff),
  };
}

export function canManageTorneioStaff(access: TorneioStaffAccess) {
  return access.isOrganizer;
}

export function canLaunchTorneioScore(access: TorneioStaffAccess) {
  return access.isOrganizer || access.isScorekeeper;
}
