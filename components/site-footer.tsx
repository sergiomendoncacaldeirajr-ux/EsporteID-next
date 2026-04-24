import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { LogoWordmark } from "@/components/brand/logo-wordmark";

type Props = {
  user: User | null;
  isPlatformAdmin: boolean;
};

/** Rodapé síncrono: `user` vem do layout; `isPlatformAdmin` é resolvido em `SiteFooterLoader`. */
export function SiteFooter({ user, isPlatformAdmin }: Props) {
  return (
    <footer className="mt-auto hidden md:block">
      <div className="h-px bg-gradient-to-r from-transparent via-[color:var(--eid-border)] to-transparent" />

      {/*
        bg-eid-card é #161d28 no escuro e #fff no claro — superfície sólida.
        Sem opacidade para garantir leitura em ambos os temas.
      */}
      <div className="bg-eid-card border-t border-[color:var(--eid-border-subtle)]">
        <div className="mx-auto max-w-4xl px-5 py-3 sm:px-8 md:py-4">
          <div className="flex flex-col items-center gap-2.5 md:flex-row md:items-center md:justify-between md:gap-6">

            {/* Marca */}
            <div className="flex flex-col items-center gap-0.5 md:items-start">
              <LogoWordmark className="h-6 w-auto sm:h-7" />
              <p className="text-[9px] font-medium" style={{ color: "var(--eid-text-secondary)" }}>
                © {new Date().getFullYear()} · CNPJ 66.343.704/0001-75
              </p>
            </div>

            {/* Divisor mobile */}
            <div className="h-px w-16 rounded-full bg-[color:var(--eid-border)] md:hidden" />

            {/* Links — botões sólidos com texto branco garantem contraste nos dois temas */}
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:justify-end">
              {!user ? (
                <>
                  <Link
                    href="/login"
                    className="rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition hover:opacity-90"
                    style={{ background: "var(--eid-action-500)" }}
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/cadastro"
                    className="rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition hover:opacity-90"
                    style={{ background: "var(--eid-action-500)" }}
                  >
                    Criar conta
                  </Link>
                </>
              ) : null}
              <Link
                href="/termos"
                className="text-[10px] font-medium underline-offset-2 transition hover:underline"
                style={{ color: "var(--eid-fg)" }}
              >
                Termos de Uso
              </Link>
              <Link
                href="/privacidade"
                className="text-[10px] font-medium underline-offset-2 transition hover:underline"
                style={{ color: "var(--eid-fg)" }}
              >
                Privacidade (LGPD)
              </Link>
              <Link
                href="/conta/dados-lgpd"
                className="text-[10px] font-medium underline-offset-2 transition hover:underline"
                style={{ color: "var(--eid-fg)" }}
              >
                Seus dados
              </Link>
              {user && isPlatformAdmin ? (
                <Link
                  href="/admin"
                  className="rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition hover:opacity-90"
                  style={{ background: "var(--eid-primary-500)" }}
                >
                  Admin
                </Link>
              ) : null}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
