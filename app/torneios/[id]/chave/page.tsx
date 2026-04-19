import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function TorneioChavePage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const backHref = resolveBackHref(sp.from, `/torneios/${id}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/torneios/${id}/chave`);

  const { data: t } = await supabase.from("torneios").select("id, nome").eq("id", id).maybeSingle();
  if (!t) notFound();

  const { data: chave } = await supabase.from("torneio_chaves").select("formato, dados_json, atualizado_em").eq("torneio_id", id).maybeSingle();

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-5xl px-3 pb-10 pt-3 sm:px-6 sm:pb-12 sm:pt-4">
        <PerfilBackLink href={backHref} label="Voltar ao torneio" />

        <div className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 md:rounded-3xl md:p-8">
          <div className="h-1 w-full rounded-full bg-gradient-to-r from-eid-primary-500 via-eid-action-500 to-eid-primary-400 md:h-1.5" />
          <h1 className="mt-4 text-xl font-black text-eid-fg md:text-2xl">Chaveamento</h1>
          <p className="mt-1 text-sm text-eid-text-secondary">{t.nome}</p>
        </div>

        {chave?.dados_json != null ? (
          <section className="mt-6 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 md:rounded-3xl md:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Formato registrado</p>
            <p className="mt-2 text-sm text-eid-fg">{chave.formato ?? "—"}</p>
            {chave.atualizado_em ? (
              <p className="mt-2 text-xs text-eid-text-secondary">
                Atualizado em {new Date(chave.atualizado_em).toLocaleString("pt-BR")}
              </p>
            ) : null}
            <pre className="mt-4 max-h-[480px] overflow-auto rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/80 p-4 text-[11px] leading-relaxed text-eid-text-secondary">
              {JSON.stringify(chave.dados_json, null, 2)}
            </pre>
          </section>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-8 text-center md:rounded-3xl">
            <p className="text-sm text-eid-text-secondary">
              Ainda não há chave gerada para este torneio. O organizador poderá montar ou importar a chave quando o módulo
              estiver conectado.
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-eid-text-secondary">
          <Link href={`/torneios/${id}?from=/torneios/${id}/chave`} className="font-bold text-eid-primary-300 hover:underline">
            Ver página do torneio
          </Link>
        </p>
      </main>
    </>
  );
}
