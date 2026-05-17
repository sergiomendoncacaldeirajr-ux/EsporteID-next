import type { SupabaseClient } from "@supabase/supabase-js";

export type EspacoStaffAccess = {
  isOwner: boolean;
  isOperationalStaff: boolean;
  canViewAgenda: boolean;
  canViewPayments: boolean;
  canCheckReservations: boolean;
  canEditConfiguration: boolean;
  canViewLanchonete: boolean;
  canSellLanchonete: boolean;
  canManageLanchoneteStock: boolean;
};

export async function getEspacoStaffAccess(
  supabase: SupabaseClient,
  espacoId: number,
  userId: string
): Promise<EspacoStaffAccess> {
  const [{ data: espaco }, { data: staff }] = await Promise.all([
    supabase
      .from("espacos_genericos")
      .select("criado_por_usuario_id, responsavel_usuario_id")
      .eq("id", espacoId)
      .maybeSingle(),
    supabase
      .from("espaco_staff")
      .select("id, pode_ver_agenda, pode_ver_pagamentos, pode_conferir_reservas, pode_editar_configuracao, permissoes_json")
      .eq("espaco_generico_id", espacoId)
      .eq("usuario_id", userId)
      .eq("papel", "operacao_reservas")
      .eq("status", "ativo")
      .maybeSingle(),
  ]);

  const isOwner =
    espaco?.responsavel_usuario_id === userId || espaco?.criado_por_usuario_id === userId;

  const perms = staff && typeof staff === "object" && !Array.isArray(staff)
    ? ((staff as { permissoes_json?: Record<string, unknown> | null }).permissoes_json ?? {})
    : {};
  const permsRecord = perms && typeof perms === "object" && !Array.isArray(perms)
    ? (perms as Record<string, unknown>)
    : {};
  const modulo = (key: string) => {
    const value = permsRecord[key];
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  };

  return {
    isOwner,
    isOperationalStaff: Boolean(staff),
    canViewAgenda: isOwner || Boolean(staff?.pode_ver_agenda) || Boolean(modulo("agenda").ver),
    canViewPayments: isOwner || Boolean(staff?.pode_ver_pagamentos) || Boolean(modulo("pagamentos").ver),
    canCheckReservations: isOwner || Boolean(staff?.pode_conferir_reservas) || Boolean(modulo("reservas").conferir),
    canEditConfiguration: isOwner || Boolean(staff?.pode_editar_configuracao) || Boolean(modulo("configuracao").editar),
    canViewLanchonete: isOwner || Boolean(modulo("lanchonete").ver),
    canSellLanchonete: isOwner || Boolean(modulo("lanchonete").vender),
    canManageLanchoneteStock: isOwner || Boolean(modulo("lanchonete").estoque),
  };
}
