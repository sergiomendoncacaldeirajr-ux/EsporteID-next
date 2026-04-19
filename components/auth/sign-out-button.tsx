"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
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
