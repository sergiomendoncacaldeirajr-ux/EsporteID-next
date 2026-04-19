import { createClient } from "@/lib/supabase/server";

/** Verifica se o usuário logado está em `platform_admins` (via RLS: só vê a própria linha). */
export async function getIsPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return data != null;
}

export async function requirePlatformAdmin(): Promise<void> {
  const ok = await getIsPlatformAdmin();
  if (!ok) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
}
