import { cache } from "react";
import Link from "next/link";
import { getServerAuth } from "@/lib/auth/rsc-auth";

/** React.cache: no máximo uma leitura de `profiles` por request (via `LegalGateDeferred`). */
export const getCachedShowLegalGate = cache(async (): Promise<boolean> => {
  try {
    const { supabase, user } = await getServerAuth();
    if (!user) return false;
    const { data: profile } = await supabase
      .from("profiles")
      .select("termos_aceitos_em")
      .eq("id", user.id)
      .maybeSingle();
    return !profile?.termos_aceitos_em;
  } catch {
    return false;
  }
});

/** Carrega a faixa LGPD fora do caminho crítico do layout (streaming mais rápido). */
export async function LegalGateDeferred() {
  const show = await getCachedShowLegalGate();
  return <LegalGate show={show} />;
}

/** Faixa fixa se o usuário está logado e ainda não aceitou termos/privacidade (LGPD). */
export function LegalGate({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Aceite de termos obrigatório"
      className="fixed bottom-0 left-0 right-0 z-[60] border-t border-eid-primary-500/25 bg-eid-surface px-4 py-3 text-center text-sm text-eid-fg shadow-[0_-8px_32px_rgba(0,0,0,0.35)]"
    >
      <p className="inline-block max-w-3xl text-eid-fg">
        Para continuar usando o EsporteID, aceite os{" "}
        <Link href="/termos" className="font-medium text-eid-primary-300 underline hover:text-eid-fg">
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" className="font-medium text-eid-primary-300 underline hover:text-eid-fg">
          Política de Privacidade
        </Link>
        .{" "}
        <Link
          href="/conta/aceitar-termos"
          className="ml-1 inline-flex items-center rounded-xl bg-eid-action-500 px-3 py-1.5 font-bold text-white transition hover:bg-eid-action-400 active:bg-eid-action-600"
        >
          Revisar e aceitar
        </Link>
      </p>
    </div>
  );
}
