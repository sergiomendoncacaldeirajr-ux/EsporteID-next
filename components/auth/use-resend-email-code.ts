"use client";

import { useState } from "react";
import { getRecoveryEmailRedirectTo, getSignupEmailRedirectTo } from "@/lib/auth/email-redirects";
import { createClient } from "@/lib/supabase/client";
import { EMAIL_CODE_MESSAGES } from "@/lib/auth/messages";

type ResendEmailMode = "signup" | "recovery";

type ResendEmailCodeResult = {
  ok: boolean;
  message?: string;
  error?: string;
};

type UseResendEmailCodeParams = {
  mode: ResendEmailMode;
};

export function useResendEmailCode({ mode }: UseResendEmailCodeParams) {
  const [resending, setResending] = useState(false);

  async function resend(emailRaw: string): Promise<ResendEmailCodeResult> {
    const email = emailRaw.trim().toLowerCase();
    if (!email) {
      return { ok: false, error: EMAIL_CODE_MESSAGES.invalidEmailResend };
    }

    setResending(true);
    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      const resendErr =
        mode === "recovery"
          ? (
              await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: getRecoveryEmailRedirectTo(origin),
              })
            ).error
          : (
              await supabase.auth.resend({
                type: "signup",
                email,
                options: {
                  ...(origin
                    ? {
                        emailRedirectTo: getSignupEmailRedirectTo(origin),
                      }
                    : {}),
                },
              })
            ).error;

      if (resendErr) {
        return { ok: false, error: resendErr.message };
      }

      return {
        ok: true,
        message:
          mode === "recovery"
            ? EMAIL_CODE_MESSAGES.resendSuccessRecovery
            : EMAIL_CODE_MESSAGES.resendSuccessSignup,
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : EMAIL_CODE_MESSAGES.resendGenericError,
      };
    } finally {
      setResending(false);
    }
  }

  return { resending, resend };
}
