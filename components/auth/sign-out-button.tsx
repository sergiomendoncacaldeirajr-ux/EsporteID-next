"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function IconPower({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2v10" strokeLinecap="round" />
      <path
        d="M18.36 6.64a9 9 0 1 1-12.73 0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  /** Compacto: só ícone — cabeçalho mobile */
  variant?: "default" | "icon";
};

export function SignOutButton({ variant = "default" }: Props) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        title="Sair"
        aria-label="Sair da conta"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card text-red-400/90 shadow-sm transition hover:border-red-400/40 hover:bg-eid-surface hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
      >
        <IconPower className="h-[18px] w-[18px]" />
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
