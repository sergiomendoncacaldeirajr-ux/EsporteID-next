"use client";

import { createClient } from "@/lib/supabase/client";
import { clearNativeBiometricLogin } from "@/lib/native/secure-session";

function IconPower({ className }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 shrink-0 ${className ?? ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2v10" strokeLinecap="round" />
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Props = {
  /** Compacto: só ícone — cabeçalho mobile */
  variant?: "default" | "icon";
};

export function SignOutButton({ variant = "default" }: Props) {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    await clearNativeBiometricLogin();
    /* Navegação cheia: cookies + middleware + RSC ficam alinhados (evita `refresh` + `push` em estado inconsistente). */
    window.location.assign("/");
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        title="Sair"
        aria-label="Sair da conta"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[color:color-mix(in_srgb,var(--eid-danger-500)_38%,var(--eid-border-subtle))] bg-[color:color-mix(in_srgb,var(--eid-danger-500)_10%,var(--eid-card)_90%)] p-0 text-[color:color-mix(in_srgb,var(--eid-danger-400)_92%,var(--eid-fg)_8%)] shadow-sm transition-all duration-200 ease-out hover:border-[color:color-mix(in_srgb,var(--eid-danger-500)_55%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--eid-danger-500)_15%,var(--eid-card)_85%)] hover:text-[color:color-mix(in_srgb,var(--eid-danger-400)_98%,var(--eid-fg)_2%)] active:translate-y-[0.5px] active:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--eid-danger-500)_45%,transparent)] md:h-9 md:w-9"
      >
        <IconPower />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-4 py-2 text-sm font-medium text-eid-fg shadow-sm transition hover:border-eid-primary-500/40 hover:bg-eid-surface"
    >
      Sair
    </button>
  );
}
