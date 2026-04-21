import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ACTIVE_CONTEXT_COOKIE,
  getContextHomeHref,
  listAvailableAppContexts,
  resolveActiveAppContext,
  type ActiveAppContext,
} from "@/lib/auth/active-context";
import { getCachedUsuarioPapeis, getServerAuth } from "@/lib/auth/rsc-auth";

export async function getAuthContextState() {
  const { user } = await getServerAuth();

  if (!user) {
    return {
      user: null,
      papeis: [] as string[],
      availableContexts: ["atleta"] as ActiveAppContext[],
      activeContext: "atleta" as ActiveAppContext,
    };
  }

  const [papeis, cookieStore] = await Promise.all([getCachedUsuarioPapeis(user.id), cookies()]);
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
