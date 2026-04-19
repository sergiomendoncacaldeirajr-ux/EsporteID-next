import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { createClient } from "@/lib/supabase/server";
import { cadastrarLocalGenerico } from "./actions";

export const metadata = {
  title: "Cadastrar local",
  description: "Sugerir um espaço esportivo na comunidade EsporteID",
};

export default async function CadastrarLocalPage({
  searchParams,
}: {
  searchParams?: Promise<{ erro?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const erroMsg =
    sp.erro === "nome"
      ? "Informe um nome com pelo menos 2 caracteres."
      : sp.erro === "local"
        ? "Informe cidade/região ou endereço (mín. 3 caracteres)."
        : sp.erro === "gravacao"
          ? "Não foi possível salvar. Tente novamente."
          : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/locais/cadastrar");

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-lg px-3 py-4 sm:max-w-xl sm:px-6 sm:py-6">
        <Link href="/locais" className="text-xs font-semibold text-eid-primary-300 hover:underline">
          ← Voltar aos locais
        </Link>

        <h1 className="mt-4 text-xl font-bold text-eid-fg">Cadastrar local genérico</h1>
        <p className="mt-2 text-sm leading-relaxed text-eid-text-secondary">
          Qualquer pessoa logada pode sugerir um espaço (nome, cidade/região). Depois você pode complementar dados e, se for o
          responsável oficial, enviar documentação pelo fluxo de validação.
        </p>

        {erroMsg ? (
          <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
            {erroMsg}
          </p>
        ) : null}

        <form action={cadastrarLocalGenerico} className="mt-6 space-y-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 sm:p-5">
          <div>
            <label htmlFor="nome_publico" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
              Nome do local
            </label>
            <input
              id="nome_publico"
              name="nome_publico"
              required
              minLength={2}
              placeholder="Ex.: Arena Central"
              className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
            />
          </div>
          <div>
            <label htmlFor="localizacao" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
              Cidade / região ou endereço
            </label>
            <input
              id="localizacao"
              name="localizacao"
              required
              minLength={3}
              placeholder="Ex.: Ipatinga — MG"
              className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
            />
          </div>
          <button type="submit" className="eid-btn-primary w-full min-h-[48px] rounded-xl text-sm font-bold">
            Cadastrar sugestão
          </button>
        </form>

        <p className="mt-4 text-[11px] leading-relaxed text-eid-text-secondary">
          Para ser o responsável oficial do espaço, conclua o cadastro com o papel &quot;dono de espaço&quot; no onboarding ou fale com o
          suporte após criar o perfil do local.
        </p>
      </main>
    </>
  );
}
