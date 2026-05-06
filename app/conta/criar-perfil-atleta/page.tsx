import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/auth/rsc-auth";
import { legalAcceptanceIsCurrent } from "@/lib/legal/acceptance";
import { getCachedProfileLegalRow } from "@/lib/auth/profile-legal-cache";
import { listarPapeis } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { CriarPerfilAtletaCta } from "./criar-perfil-atleta-cta";

export const metadata = {
  title: "Perfil de atleta",
  description: "Ative seu perfil de atleta no EsporteID",
};

export default async function CriarPerfilAtletaPage() {
  const { user } = await getServerAuth();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/conta/criar-perfil-atleta")}`);
  }

  const gate = await getCachedProfileLegalRow(user.id);
  if (!gate || !legalAcceptanceIsCurrent(gate)) {
    redirect(`/conta/aceitar-termos?next=${encodeURIComponent("/conta/criar-perfil-atleta")}`);
  }

  const supabase = await createClient();
  const { data: papeisRows } = await supabase
    .from("usuario_papeis")
    .select("papel")
    .eq("usuario_id", user.id);
  const papeis = listarPapeis(papeisRows);

  if (!papeis.includes("espaco")) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-xl font-bold text-eid-fg">Perfil de atleta</h1>
        <p className="mt-3 text-sm text-eid-text-secondary">
          Esta opção é para quem já gerencia um espaço na plataforma e quer também jogar, desafiar e aparecer no ranking
          como atleta.
        </p>
        <Link href="/espaco" className="mt-6 inline-flex text-sm font-semibold text-eid-primary-400 hover:underline">
          Voltar ao painel
        </Link>
      </main>
    );
  }

  if (papeis.includes("atleta")) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-xl font-bold text-eid-fg">Perfil de atleta</h1>
        <p className="mt-3 text-sm text-eid-text-secondary">Sua conta já inclui o perfil de atleta.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/onboarding"
            className="inline-flex justify-center rounded-2xl border border-eid-primary-500/40 bg-eid-primary-500/10 px-4 py-3 text-sm font-bold text-eid-primary-200 transition hover:bg-eid-primary-500/18"
          >
            Continuar cadastro de atleta
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex justify-center rounded-2xl border border-[color:var(--eid-border-subtle)] px-4 py-3 text-sm font-semibold text-eid-fg transition hover:border-eid-primary-500/35"
          >
            Ir ao painel do atleta
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-xl font-bold text-eid-fg">Criar perfil de atleta</h1>
      <p className="mt-3 text-sm leading-relaxed text-eid-text-secondary">
        Como dono de espaço, sua conta começa focada no local. Se quiser usar o app como atleta (desafios, ranking,
        comunidade), ative o perfil abaixo. Você será guiado pelas mesmas etapas de esportes e ficha dos demais
        usuários.
      </p>
      <CriarPerfilAtletaCta />
      <Link
        href="/espaco"
        className="mt-8 inline-flex text-sm font-medium text-eid-text-secondary hover:text-eid-fg"
      >
        ← Voltar ao painel do espaço
      </Link>
    </main>
  );
}
