import { Users } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  headingId?: string;
};

/** Cartão informativo “Entrar no elenco” (perfil público da formação). */
export function FormacaoElencoCallout({ children, headingId = "candidatura-elenco-heading" }: Props) {
  return (
    <section
      className="mt-4 overflow-hidden rounded-xl border border-[color:color-mix(in_srgb,var(--eid-primary-500)_38%,var(--eid-border-subtle)_62%)] bg-[color:color-mix(in_srgb,var(--eid-card)_93%,var(--eid-primary-500)_7%)] p-3.5 shadow-[inset_0_1px_0_rgba(37,99,235,0.06)] sm:p-4"
      aria-labelledby={headingId}
    >
      <div className="flex gap-3 sm:gap-3.5">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:color-mix(in_srgb,var(--eid-primary-500)_16%,transparent)] text-eid-primary-400"
          aria-hidden
        >
          <Users className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="text-[11px] font-black uppercase tracking-[0.08em] text-eid-fg">
            Entrar no elenco
          </h2>
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </section>
  );
}
