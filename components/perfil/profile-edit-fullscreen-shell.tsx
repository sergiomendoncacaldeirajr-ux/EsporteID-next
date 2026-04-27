import type { ReactNode } from "react";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";

type Props = {
  title: string;
  subtitle?: string;
  backHref: string;
  children: ReactNode;
  topAction?: ReactNode;
  showBack?: boolean;
};

export function ProfileEditFullscreenShell({ title, subtitle, backHref, children, topAction, showBack = true }: Props) {
  return (
    <main className="eid-profile-edit-screen mx-auto w-full max-w-3xl px-3 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-1.5 sm:px-5 sm:pt-2.5">
      <section className="mb-2.5 flex items-start justify-between gap-3">
        <div>
          {showBack ? <PerfilBackLink href={backHref} label="Voltar" /> : null}
          <h1 className="mt-1.5 text-base font-black tracking-tight text-eid-fg sm:text-lg">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-[11px] leading-4 text-eid-text-secondary sm:text-xs">{subtitle}</p> : null}
        </div>
        {topAction ? <div className="shrink-0">{topAction}</div> : null}
      </section>
      {children}
    </main>
  );
}

