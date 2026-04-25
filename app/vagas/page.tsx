import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Vagas",
  description: "Módulo de vagas em breve no EsporteID",
};

export default async function VagasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/vagas");

  return (
    <main data-eid-touch-ui className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5 sm:p-6">
        <p className="inline-flex rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-eid-primary-300">
          Em breve
        </p>
        <h1 className="mt-3 text-xl font-black text-eid-fg sm:text-2xl">Módulo de Vagas</h1>
        <p className="mt-2 text-sm text-eid-text-secondary">
          Estamos finalizando melhorias para abrir vagas de formações com filtros mais inteligentes e gestão completa de candidaturas.
        </p>
        <p className="mt-2 text-xs text-eid-text-secondary">
          Enquanto isso, use <span className="font-semibold text-eid-fg">Times</span> para gerenciar suas formações e a comunidade para networking.
        </p>
      </section>
    </main>
  );
}
