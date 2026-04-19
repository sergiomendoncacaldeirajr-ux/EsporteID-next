const ONBOARDING_PATH = "/onboarding";
const RECOVERY_PATH = "/redefinir-senha";

export function getSignupEmailRedirectTo(origin: string): string | undefined {
  if (!origin) return undefined;
  return `${origin}/auth/callback?next=${encodeURIComponent(ONBOARDING_PATH)}`;
}

export function getRecoveryEmailRedirectTo(origin: string): string | undefined {
  if (!origin) return undefined;
  return `${origin}${RECOVERY_PATH}`;
}
