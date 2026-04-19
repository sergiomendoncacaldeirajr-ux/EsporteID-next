import type { SupabaseClient } from "@supabase/supabase-js";

/** Organizador: perfil ou papel explícito no onboarding. */
export async function usuarioPodeCriarTorneio(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: perfil } = await supabase.from("profiles").select("tipo_usuario").eq("id", userId).maybeSingle();
  if (perfil?.tipo_usuario === "organizador") return true;

  const { data: papel } = await supabase
    .from("usuario_papeis")
    .select("papel")
    .eq("usuario_id", userId)
    .eq("papel", "organizador")
    .maybeSingle();

  return !!papel;
}
