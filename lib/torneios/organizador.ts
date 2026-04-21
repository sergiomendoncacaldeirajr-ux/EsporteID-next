import type { SupabaseClient } from "@supabase/supabase-js";

/** Organizador: perfil ou papel explícito no onboarding. */
export async function usuarioPodeCriarTorneio(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: papel } = await supabase
    .from("usuario_papeis")
    .select("papel")
    .eq("usuario_id", userId)
    .eq("papel", "organizador")
    .maybeSingle();

  if (papel) return true;

  const { data: perfil } = await supabase.from("profiles").select("tipo_usuario").eq("id", userId).maybeSingle();
  return perfil?.tipo_usuario === "organizador";
}
