import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PerfilTimeEditForm } from "@/components/perfil/perfil-time-edit-form";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { contaNextPath, requireContaPerfilPronto } from "@/lib/conta/require-perfil-pronto";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<{ from?: string }> };

export const metadata = {
  title: "Editar formação · EsporteID",
};

export default async function ContaEditarFormacaoTimePage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/perfil-time/${id}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/conta/formacao/time/${id}`)}`);

  await requireContaPerfilPronto(supabase, user.id, contaNextPath(`/conta/formacao/time/${id}`, sp));

  const { data: t } = await supabase
    .from("times")
    .select(
      "id, nome, username, bio, localizacao, escudo, criador_id, interesse_rank_match, disponivel_amistoso, vagas_abertas, aceita_pedidos, interesse_torneio, nivel_procurado"
    )
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();
  if (t.criador_id !== user.id) {
    redirect(`/perfil-time/${id}?from=${encodeURIComponent(from)}`);
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:max-w-2xl sm:px-6 sm:py-10">
      <PerfilBackLink href={from} label="Voltar" />
      <h1 className="mt-4 text-xl font-bold text-eid-fg sm:text-2xl">Editar formação</h1>
      <p className="mt-2 text-sm text-eid-text-secondary">
        Altere nome público, @username, bio, escudo e preferências.{" "}
        <Link href={`/perfil-time/${id}`} className="font-semibold text-eid-primary-300 underline">
          Ver perfil público
        </Link>
        {" · "}
        <Link href={`/times?from=${encodeURIComponent(`/conta/formacao/time/${id}`)}`} className="font-semibold text-eid-primary-300 underline">
          Gerenciar elenco
        </Link>
        .
      </p>
      <div className="mt-6">
        <PerfilTimeEditForm
          variant="page"
          timeId={id}
          nome={t.nome ?? ""}
          username={t.username ?? null}
          bio={t.bio ?? null}
          localizacao={t.localizacao ?? null}
          escudo={t.escudo ?? null}
          interesse_rank_match={Boolean(t.interesse_rank_match)}
          vagas_abertas={Boolean(t.vagas_abertas)}
          aceita_pedidos={Boolean(t.aceita_pedidos)}
          interesse_torneio={Boolean(t.interesse_torneio)}
          nivel_procurado={t.nivel_procurado ?? null}
        />
      </div>
    </main>
  );
}
