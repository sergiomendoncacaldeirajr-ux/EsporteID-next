import type { SupabaseClient } from "@supabase/supabase-js";

/** Duração da janela “disponível para amistoso” após ligar o toggle. */
export const AMISTOSO_DURACAO_MS = 4 * 60 * 60 * 1000;

export function computeDisponivelAmistosoEffective(
  disponivel: boolean | null | undefined,
  ateIso: string | null | undefined
): boolean {
  if (!disponivel || !ateIso) return false;
  const t = new Date(ateIso).getTime();
  if (Number.isNaN(t)) return false;
  return t > Date.now();
}

export function nextDisponivelAmistosoPayload(turnOn: boolean): {
  disponivel_amistoso: boolean;
  disponivel_amistoso_ate: string | null;
} {
  if (!turnOn) return { disponivel_amistoso: false, disponivel_amistoso_ate: null };
  return {
    disponivel_amistoso: true,
    disponivel_amistoso_ate: new Date(Date.now() + AMISTOSO_DURACAO_MS).toISOString(),
  };
}

/** Se a janela expirou, persiste desligado no banco (lazy expiry). */
export async function expireDisponivelAmistosoProfileIfNeeded(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("disponivel_amistoso, disponivel_amistoso_ate")
    .eq("id", userId)
    .maybeSingle();
  if (!data?.disponivel_amistoso || !data.disponivel_amistoso_ate) return;
  if (new Date(data.disponivel_amistoso_ate).getTime() <= Date.now()) {
    await supabase
      .from("profiles")
      .update({ disponivel_amistoso: false, disponivel_amistoso_ate: null })
      .eq("id", userId);
  }
}
