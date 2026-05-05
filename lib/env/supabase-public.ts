/**
 * Leitura e validação das variáveis públicas do Supabase (Edge / Node / browser).
 * Prefixo de log `[eid-env]` facilita filtrar no Cloudflare Observability.
 */

export type SupabasePublicEnv = {
  url: string;
  anon: string;
};

let missingEnvLogged = false;

export function logMissingSupabasePublicEnv(reason?: string): void {
  if (missingEnvLogged) return;
  missingEnvLogged = true;
  const hint = reason ? ` (${reason})` : "";
  console.error(
    `[eid-env] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes ou inválidas${hint}. ` +
      "Cloudflare Pages: Settings → Environment variables → Production e Preview."
  );
}

/** Lê env sem efeitos colaterais (útil em bootstrap / instrumentation). */
export function parseSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !anon) return null;
  const httpsOk = url.startsWith("https://");
  const localHttpOk = process.env.NODE_ENV !== "production" && url.startsWith("http://");
  if (!httpsOk && !localHttpOk) {
    console.error("[eid-env] NEXT_PUBLIC_SUPABASE_URL deve usar https:// (ou http:// em desenvolvimento local)");
    return null;
  }
  try {
    const u = new URL(url);
    if (!u.hostname.includes(".")) return null;
  } catch {
    console.error("[eid-env] NEXT_PUBLIC_SUPABASE_URL não é uma URL válida");
    return null;
  }
  return { url, anon };
}

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const cfg = parseSupabasePublicEnv();
  if (!cfg) logMissingSupabasePublicEnv();
  return cfg;
}

export function isCloudflarePagesBuild(): boolean {
  return process.env.CF_PAGES === "1";
}

/** Resumo para logs de cold start (sem valores secretos). */
export function describeDeployRuntime(): string {
  if (isCloudflarePagesBuild()) return "cloudflare-pages";
  if (process.env.VERCEL) return "vercel";
  if (process.env.AWS_EXECUTION_ENV) return "aws";
  return process.env.NODE_ENV === "production" ? "production" : "development";
}
