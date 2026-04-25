import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeAdminUserSearch(term: string) {
  return term
    .trim()
    .slice(0, 96)
    .replace(/[%_,]/g, "")
    .trim();
}

const SELECT =
  "id, nome, username, tipo_usuario, perfil_completo, criado_em, match_maioridade_confirmada, match_maioridade_confirmada_em" as const;

export type AdminSearchProfileRow = {
  id: string;
  nome: string | null;
  username: string | null;
  tipo_usuario: string;
  perfil_completo: boolean;
  criado_em: string;
  match_maioridade_confirmada: boolean;
  match_maioridade_confirmada_em: string | null;
};

export type SearchProfilesOpts =
  | { whenEmpty: "none"; searchLimit: number }
  | { whenEmpty: "recent"; defaultListLimit: number; searchLimit: number };

/**
 * Busca perfis (cliente com service role). Vazio + `whenEmpty: none` retorna lista vazia.
 */
export async function searchProfilesForAdmin(
  db: SupabaseClient,
  rawQ: string,
  opts: SearchProfilesOpts
): Promise<{ data: AdminSearchProfileRow[]; error: { message: string } | null }> {
  const qSafe = sanitizeAdminUserSearch(rawQ);
  const qLower = qSafe.toLowerCase();

  let data: AdminSearchProfileRow[] | null = null;
  let error: { message: string } | null = null;

  if (!qLower) {
    if (opts.whenEmpty === "none") {
      return { data: [], error: null };
    }
    const r = await db
      .from("profiles")
      .select(SELECT)
      .order("criado_em", { ascending: false })
      .limit(opts.defaultListLimit);
    if (r.error) error = r.error;
    else data = (r.data ?? []) as AdminSearchProfileRow[];
    return { data: data ?? [], error };
  }

  if (UUID_RE.test(qLower)) {
    const r = await db.from("profiles").select(SELECT).eq("id", qLower).maybeSingle();
    if (r.error) error = r.error;
    else data = r.data ? [r.data as AdminSearchProfileRow] : [];
    return { data: data ?? [], error };
  }

  if (qLower.includes("@")) {
    let foundId: string | null = null;
    for (let page = 1; page <= 20; page++) {
      const { data: list, error: le } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (le) {
        error = { message: le.message };
        break;
      }
      const u = list.users.find((x) => (x.email ?? "").toLowerCase() === qLower);
      if (u) {
        foundId = u.id;
        break;
      }
      if (!list.users.length) break;
    }
    if (!error && foundId) {
      const r = await db.from("profiles").select(SELECT).eq("id", foundId).maybeSingle();
      if (r.error) error = r.error;
      else data = r.data ? [r.data as AdminSearchProfileRow] : [];
    } else if (!error) {
      data = [];
    }
    return { data: data ?? [], error };
  }

  const pat = `%${qSafe}%`;
  const r = await db
    .from("profiles")
    .select(SELECT)
    .or(`nome.ilike.${pat},username.ilike.${pat}`)
    .order("criado_em", { ascending: false })
    .limit(opts.searchLimit);
  if (r.error) error = r.error;
  else data = (r.data ?? []) as AdminSearchProfileRow[];
  return { data: data ?? [], error };
}
