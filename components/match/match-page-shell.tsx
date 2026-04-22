import type { ReactNode } from "react";
import { PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";

/** Mesmo fundo em camadas da página de ranking + container do perfil público (safe-area do footer). */
export function MatchPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-0 flex w-full min-w-0 flex-1 flex-col">
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-eid-bg via-eid-surface/35 to-eid-bg" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[min(52vh,28rem)] bg-[radial-gradient(ellipse_95%_65%_at_50%_-5%,rgba(37,99,235,0.14),transparent_58%)]"
        aria-hidden
      />
      <main className={`relative z-[1] ${PROFILE_PUBLIC_MAIN_CLASS}`}>{children}</main>
    </div>
  );
}
