import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteFooter() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <footer className="mt-auto border-t border-[color:var(--eid-border-subtle)] bg-eid-bg/95 py-4 text-sm text-eid-text-secondary backdrop-blur-sm md:py-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <div className="text-center sm:text-left">
          <p className="text-eid-text-secondary">© {new Date().getFullYear()} EsporteID</p>
          <p className="text-xs text-eid-text-muted">ESPORTEID - CNPJ 66.343.704/0001-75</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-center sm:gap-x-6">
          {!user ? (
            <>
              <Link
                href="/login"
                className="font-semibold text-eid-action-500 transition hover:text-eid-action-400 hover:underline"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="font-semibold text-eid-action-500 transition hover:text-eid-action-400 hover:underline"
              >
                Criar conta
              </Link>
            </>
          ) : null}
          <Link
            href="/termos"
            className="font-medium text-eid-fg/90 underline-offset-2 transition hover:text-eid-primary-500 hover:underline"
          >
            Termos de Uso
          </Link>
          <Link
            href="/privacidade"
            className="font-medium text-eid-fg/90 underline-offset-2 transition hover:text-eid-primary-500 hover:underline"
          >
            Privacidade (LGPD)
          </Link>
          <Link
            href="/conta/dados-lgpd"
            className="font-medium text-eid-fg/90 underline-offset-2 transition hover:text-eid-primary-500 hover:underline"
          >
            Seus dados
          </Link>
        </nav>
      </div>
    </footer>
  );
}
