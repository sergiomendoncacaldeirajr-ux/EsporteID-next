/**
 * Executado na inicialização do servidor Node (build / alguns runtimes).
 * No Worker puro pode não rodar — o layout e o middleware também logam `[eid-env]`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { parseSupabasePublicEnv, describeDeployRuntime } = await import("@/lib/env/supabase-public");
  const ok = parseSupabasePublicEnv();
  console.warn(
    `[eid-boot] runtime=${describeDeployRuntime()} cf_pages=${process.env.CF_PAGES ?? "0"} supabase_public=${ok ? "ok" : "MISSING"}`
  );
}
