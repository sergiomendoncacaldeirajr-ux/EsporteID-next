import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACTIVE_CONTEXT_COOKIE,
  getContextHomeHref,
  listAvailableAppContexts,
  resolveActiveAppContext,
  type ActiveAppContext,
} from "@/lib/auth/active-context";
import { listarPapeis } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export async function getAuthContextState() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      papeis: [] as string[],
      availableContexts: ["atleta"] as ActiveAppContext[],
      activeContext: "atleta" as ActiveAppContext,
    };
  }

  const [{ data: papeisRows }, cookieStore] = await Promise.all([
    supabase.from("usuario_papeis").select("papel").eq("usuario_id", user.id),
    cookies(),
  ]);

  const papeis = listarPapeis(papeisRows);
  const activeContext = resolveActiveAppContext(cookieStore.get(ACTIVE_CONTEXT_COOKIE)?.value, papeis);

  return {
    user,
    papeis,
    availableContexts: listAvailableAppContexts(papeis),
    activeContext,
  };
}

export async function requireOrganizerContext() {
  const state = await getAuthContextState();
  if (!state.user) redirect("/login?next=/organizador");
  if (!state.papeis.includes("organizador")) redirect("/dashboard?erro=organizador");
  if (state.activeContext !== "organizador") redirect(getContextHomeHref("atleta"));
  return state;
}
