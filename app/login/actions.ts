"use server";

import { getPostAuthRedirect } from "@/lib/auth/post-login-path";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export type LoginActionState = {
  error: string | null;
  pendingConfirmationEmail: string | null;
  /** Quando definido, o cliente deve navegar (evita `redirect` + `useActionState` quebrando estado / spinner). */
  redirectTo: string | null;
};

export const loginActionInitial: LoginActionState = {
  error: null,
  pendingConfirmationEmail: null,
  redirectTo: null,
};

function safeNext(raw: string): string {
  const n = raw.trim() || "/";
  if (!n.startsWith("/") || n.startsWith("//")) return "/";
  return n;
}

/**
 * Login no servidor grava cookies de sessão via `cookies().set` (sem o try/catch
 * silencioso de `createClient()` usado em RSC). Fluxo mais confiável que só o browser.
 */
export async function entrarComSenha(
  _prev: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));

  const empty: LoginActionState = { error: null, pendingConfirmationEmail: null, redirectTo: null };

  if (!email) {
    return { ...empty, error: "Informe seu e-mail." };
  }
  if (!password) {
    return { ...empty, error: "Informe sua senha." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ...empty, error: "Digite um e-mail válido." };
  }

  let supabase;
  try {
    supabase = await createRouteHandlerClient();
  } catch {
    return {
      error: "Configuração do servidor incompleta (Supabase). Verifique as variáveis na hospedagem.",
      pendingConfirmationEmail: null,
      redirectTo: null,
    };
  }

  const { error: err } = await supabase.auth.signInWithPassword({ email, password });
  if (err) {
    const msg = (err.message ?? "").toLowerCase();
    if (msg.includes("email not confirmed")) {
      return {
        error: "Seu e-mail ainda não foi confirmado.",
        pendingConfirmationEmail: email,
        redirectTo: null,
      };
    }
    return {
      error:
        err.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : err.message,
      pendingConfirmationEmail: null,
      redirectTo: null,
    };
  }

  const {
    data: { user: u },
  } = await supabase.auth.getUser();

  let dest = next;
  if (u) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("termos_aceitos_em, perfil_completo")
      .eq("id", u.id)
      .maybeSingle();

    dest = getPostAuthRedirect(
      {
        termosAceitos: !!profile?.termos_aceitos_em,
        perfilCompleto: !!profile?.perfil_completo,
      },
      next
    );
  }

  return { error: null, pendingConfirmationEmail: null, redirectTo: dest };
}
