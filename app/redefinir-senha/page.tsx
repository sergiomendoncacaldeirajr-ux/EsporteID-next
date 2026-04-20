import Link from "next/link";
import { Suspense } from "react";
import { LogoFull } from "@/components/brand/logo-full";
import { RedefinirForm } from "./redefinir-form";

export const metadata = {
  title: "Nova senha",
};

export default function RedefinirSenhaPage() {
  return (
    <main className="eid-auth-bg flex w-full flex-1 flex-col items-center overflow-x-hidden px-4 pb-28 pt-14 text-eid-fg sm:px-6 sm:pt-7">
      <div className="w-full max-w-[340px] pb-6">
        <LogoFull priority className="mb-5 mt-1 flex justify-center" />
        <Link
          href="/login"
          className="mb-4 inline-block text-[13px] text-eid-text-muted no-underline transition hover:text-eid-fg"
        >
          ← Voltar ao login
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-eid-fg sm:text-2xl">Definir nova senha</h1>
        <p className="mt-2 text-sm leading-relaxed text-eid-text-secondary">
          Use o link enviado por e-mail. Depois você poderá entrar com a nova senha.
        </p>

        <div className="eid-auth-card mt-6 p-5">
          <Suspense
            fallback={<p className="text-sm text-eid-text-secondary">Carregando…</p>}
          >
            <RedefinirForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
