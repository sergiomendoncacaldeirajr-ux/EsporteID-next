import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Só caminhos internos relativos (evita open redirect). */
export function safeNextInternalPath(raw: string | null | undefined): string {
  const n = (raw ?? "").trim();
  if (!n || !n.startsWith("/") || n.startsWith("//")) return "/match";
  return n;
}

export async function redirectUnlessMatchMaioridadeConfirmada(
  supabase: SupabaseClient,
  userId: string,
  nextPath: string
): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("match_maioridade_confirmada")
    .eq("id", userId)
    .maybeSingle();

  const ok = Boolean((data as { match_maioridade_confirmada?: boolean } | null)?.match_maioridade_confirmada);
  if (!ok) {
    redirect(`/conta/confirmar-maioridade-match?next=${encodeURIComponent(safeNextInternalPath(nextPath))}`);
  }
}
