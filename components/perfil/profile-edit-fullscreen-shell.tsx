import type { ReactNode } from "react";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";

type Props = {
  title: string;
  subtitle?: string;
  backHref: string;
  children: ReactNode;
  topAction?: ReactNode;
};

export function ProfileEditFullscreenShell({ title, subtitle, backHref, children, topAction }: Props) {
  return (
    <main className="mx-auto w-full max-w-3xl px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
      <section className="mb-3 flex items-start justify-between gap-3">
        <div>
          <PerfilBackLink href={backHref} label="Voltar" />
          <h1 className="mt-2 text-base font-black tracking-tight text-eid-fg sm:text-lg">{title}</h1>
          {subtitle ? <p className="mt-1 text-[11px] text-eid-text-secondary sm:text-xs">{subtitle}</p> : null}
        </div>
        {topAction ? <div className="shrink-0">{topAction}</div> : null}
      </section>
      {children}
    </main>
  );
}

