"use server";

import { getPostAuthRedirect } from "@/lib/auth/post-login-path";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import type { LoginActionState } from "./login-state";

function safeNext(raw: string): string {
  const n = raw.trim() || "/";
  if (!n.startsWith("/") || n.startsWith("//")) return "/";
  return n;
}

function emptyState(): LoginActionState {
  return { error: null, pendingConfirmationEmail: null, redirectTo: null };
}

/**
 * Login no servidor grava cookies via `cookies().set` em contexto de Server Action.
 * Apenas esta função async é exportada deste módulo (`'use server'`).
 */
export async function entrarComSenha(formData: FormData): Promise<LoginActionState> {
  try {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const next = safeNext(String(formData.get("next") ?? "/"));

    const empty = emptyState();

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
        .select(`perfil_completo, ${PROFILE_LEGAL_ACCEPTANCE_COLUMNS}`)
        .eq("id", u.id)
        .maybeSingle();

      dest = getPostAuthRedirect(
        {
          termosAceitos: legalAcceptanceIsCurrent(profile),
          perfilCompleto: !!profile?.perfil_completo,
        },
        next
      );
    }

    return { error: null, pendingConfirmationEmail: null, redirectTo: dest };
  } catch (e) {
    console.error("[entrarComSenha]", e);
    return {
      error:
        "Não foi possível concluir o login agora. Atualize a página e tente de novo. Se persistir, verifique sua conexão.",
      pendingConfirmationEmail: null,
      redirectTo: null,
    };
  }
}
