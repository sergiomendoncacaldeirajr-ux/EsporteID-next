import { redirect } from "next/navigation";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { createClient } from "@/lib/supabase/server";

export async function requireProfessorUser(nextHref = "/professor") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextHref)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(`perfil_completo, nome, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`)
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !legalAcceptanceIsCurrent(profile)) {
    redirect(`/conta/aceitar-termos?next=${encodeURIComponent(nextHref)}`);
  }
  if (!profile.perfil_completo) {
    redirect("/onboarding");
  }

  const { data: papel } = await supabase
    .from("usuario_papeis")
    .select("papel")
    .eq("usuario_id", user.id)
    .eq("papel", "professor")
    .maybeSingle();

  if (!papel) {
    redirect("/dashboard");
  }

  return { supabase, user, profile };
}

export function parseCommaSeparatedList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
