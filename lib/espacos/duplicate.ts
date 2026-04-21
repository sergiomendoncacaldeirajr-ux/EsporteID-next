import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizeEspacoDuplicateValue(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function buildEspacoDuplicateLocation(input: {
  localizacao?: string | null;
  cidade?: string | null;
  uf?: string | null;
}) {
  const cidadeUf = [input.cidade, input.uf].map((item) => String(item ?? "").trim()).filter(Boolean).join(" - ");
  return normalizeEspacoDuplicateValue(cidadeUf || input.localizacao || "");
}

export type EspacoDuplicateRow = {
  id: number;
  slug?: string | null;
  nome_publico?: string | null;
  localizacao?: string | null;
  responsavel_usuario_id?: string | null;
  ownership_status?: string | null;
};

export async function findDuplicateEspaco(
  supabase: SupabaseClient,
  {
    nomePublico,
    localizacao,
    cidade,
    uf,
    ignoreId,
  }: {
    nomePublico: string;
    localizacao?: string | null;
    cidade?: string | null;
    uf?: string | null;
    ignoreId?: number | null;
  }
): Promise<EspacoDuplicateRow | null> {
  const nomeNormalizado = normalizeEspacoDuplicateValue(nomePublico);
  const localizacaoNormalizada = buildEspacoDuplicateLocation({ localizacao, cidade, uf });
  if (!nomeNormalizado || !localizacaoNormalizada) return null;

  let query = supabase
    .from("espacos_genericos")
    .select("id, slug, nome_publico, localizacao, responsavel_usuario_id, ownership_status")
    .eq("nome_publico_normalizado", nomeNormalizado)
    .eq("localizacao_normalizada", localizacaoNormalizada);

  if (ignoreId && Number.isInteger(ignoreId) && ignoreId > 0) {
    query = query.neq("id", ignoreId);
  }

  const { data } = await query.limit(1).maybeSingle();
  return data ?? null;
}

export function isEspacoDuplicateError(error: { code?: string | null; message?: string | null } | null | undefined) {
  return error?.code === "23505" || String(error?.message ?? "").toLowerCase().includes("já existe um espaço");
}
