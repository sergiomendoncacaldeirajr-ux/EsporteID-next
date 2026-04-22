import { cache } from "react";
import { getServerAuth } from "@/lib/auth/rsc-auth";

/** Uma consulta por request RSC (evita rodapé assíncrono suspender em toda navegação). */
export const getCachedIsPlatformAdmin = cache(async (): Promise<boolean> => {
  const { supabase, user } = await getServerAuth();
  if (!user) return false;
  const { data } = await supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return data != null;
});

/** Verifica se o usuário logado está em `platform_admins` (via RLS: só vê a própria linha). */
export async function getIsPlatformAdmin(): Promise<boolean> {
  return getCachedIsPlatformAdmin();
}

export async function requirePlatformAdmin(): Promise<void> {
  const ok = await getIsPlatformAdmin();
  if (!ok) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
}
