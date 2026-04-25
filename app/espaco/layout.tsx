import type { ReactNode } from "react";
import { EspacoMensalidadeGate } from "@/components/espaco/espaco-mensalidade-gate";
import { EspacoPainelChrome } from "@/components/espaco/espaco-painel-chrome";
import { getMensalidadePainelState } from "@/lib/espacos/mensalidade-acesso";
import { requireEspacoManagerUser } from "@/lib/espacos/server";

export default async function EspacoLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { managedSpaces, supabase } = await requireEspacoManagerUser("/espaco");
  const space = managedSpaces[0];
  const categoria = space?.categoria_mensalidade ?? "outro";
  const mensalidadeState = space
    ? await getMensalidadePainelState(supabase, space.id, categoria)
    : null;

  const chromeSpace = space
    ? { id: space.id, nome_publico: space.nome_publico, slug: space.slug }
    : { id: 0, nome_publico: "Espaço", slug: null as string | null };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 sm:px-6">
      <EspacoPainelChrome space={chromeSpace} />
      <div className="mt-5 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        {mensalidadeState ? (
          <EspacoMensalidadeGate state={mensalidadeState}>{children}</EspacoMensalidadeGate>
        ) : (
          children
        )}
      </div>
    </main>
  );
}
