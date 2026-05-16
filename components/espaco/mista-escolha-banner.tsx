"use client";

import { useActionState } from "react";
import { escolherModoReservaEspacoAction } from "@/app/espaco/actions";
import { AlertTriangle } from "lucide-react";

type Props = { espacoId: number };

export function MistaEscolhaBanner({ espacoId }: Props) {
  const [, formAction, pending] = useActionState(
    async (_: unknown, formData: FormData) => {
      await escolherModoReservaEspacoAction(formData);
      return null;
    },
    null
  );

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black text-amber-200">Defina o modelo de reservas do seu espaço</h2>
          <p className="mt-1 text-sm text-amber-300/80">
            O modo <strong>misto</strong> (pago e gratuito ao mesmo tempo) foi descontinuado. Escolha como seu espaço vai operar:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-300/70">
            <li>
              <strong className="text-amber-200">Reservas Gratuitas</strong> — usuários reservam sem pagar; o espaço paga mensalidade à plataforma.
            </li>
            <li>
              <strong className="text-amber-200">Reservas Pagas</strong> — usuários pagam por cada slot; o espaço paga apenas taxas de transação.
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={formAction}>
              <input type="hidden" name="espaco_id" value={espacoId} />
              <input type="hidden" name="modo" value="gratuita" />
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-60"
              >
                Reservas Gratuitas
              </button>
            </form>
            <form action={formAction}>
              <input type="hidden" name="espaco_id" value={espacoId} />
              <input type="hidden" name="modo" value="paga" />
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl border border-eid-action-500/40 bg-eid-action-500/15 px-4 py-2.5 text-sm font-bold text-eid-action-300 transition hover:bg-eid-action-500/25 disabled:opacity-60"
              >
                Reservas Pagas
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
