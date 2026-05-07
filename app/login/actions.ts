"use server";

import { getPostAuthRedirect } from "@/lib/auth/post-login-path";
import { legalAcceptanceIsCurrent, PROFILE_LEGAL_ACCEPTANCE_COLUMNS } from "@/lib/legal/acceptance";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";
import type { LoginActionState } from "./login-state";

function safeNext(raw: string): string {
  const n = raw.trim() || "/dashboard";
  if (!n.startsWith("/") || n.startsWith("//")) return "/dashboard";
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
        // Tentar auto-confirmar para contas não-atleta (dono de espaço, professor, organizador).
        // Esses usuários completam o cadastro por fluxos que não exigem confirmação de e-mail,
        // mas o Supabase bloqueia o re-login se email_confirmed_at estiver nulo.
        if (hasServiceRoleConfig()) {
          try {
            const svc = createServiceRoleClient();
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
            let userId: string | null = null;

            // Localiza o usuário via GoTrue admin API — suporta filtro por email
            if (supabaseUrl && serviceKey) {
              const resp = await fetch(
                `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}&page=1&per_page=1`,
                { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
              );
              if (resp.ok) {
                const body = (await resp.json()) as { users?: Array<{ id: string; email?: string }> };
                userId = (body.users ?? []).find((u) => u.email === email)?.id ?? null;
              }
            }

            if (userId) {
              const { data: papeisRows } = await svc
                .from("usuario_papeis")
                .select("papel")
                .eq("usuario_id", userId);
              const papeis = (papeisRows ?? []).map((r: { papel: string }) => r.papel);
              // Só auto-confirma se tiver papel não-atleta (espaco, professor, organizador, etc.)
              const temPapelNaoAtleta = papeis.some((p) => p !== "atleta");
              if (temPapelNaoAtleta) {
                await svc.auth.admin.updateUserById(userId, { email_confirm: true });
                // Refaz o login após confirmar
                const { error: retryErr } = await supabase.auth.signInWithPassword({ email, password });
                if (!retryErr) {
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
                      { termosAceitos: legalAcceptanceIsCurrent(profile), perfilCompleto: !!profile?.perfil_completo },
                      next
                    );
                  }
                  return { error: null, pendingConfirmationEmail: null, redirectTo: dest };
                }
              }
            }
          } catch (confirmErr) {
            console.error("[entrarComSenha] auto-confirm não-atleta", confirmErr);
          }
        }
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
