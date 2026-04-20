import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PerfilDuplaEditForm } from "@/components/perfil/perfil-dupla-edit-form";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { resolverTimeIdParaDuplaRegistrada } from "@/lib/perfil/whatsapp-visibility";
import { contaNextPath, requireContaPerfilPronto } from "@/lib/conta/require-perfil-pronto";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<{ from?: string }> };

export const metadata = {
  title: "Editar dupla registrada · EsporteID",
};

export default async function ContaEditarDuplaPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/perfil-dupla/${id}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/conta/dupla/${id}`)}`);

  await requireContaPerfilPronto(supabase, user.id, contaNextPath(`/conta/dupla/${id}`, sp));

  const { data: d } = await supabase
    .from("duplas")
    .select("id, username, bio, player1_id, player2_id, criador_id, esporte_id")
    .eq("id", id)
    .maybeSingle();
  if (!d) notFound();

  const donoId = d.criador_id ?? d.player1_id;
  if (donoId !== user.id) {
    redirect(`/perfil-dupla/${id}?from=${encodeURIComponent(from)}`);
  }

  const espId = d.esporte_id != null ? Number(d.esporte_id) : 0;
  const timeFormacaoRadarId =
    d.player1_id && d.player2_id && espId > 0
      ? await resolverTimeIdParaDuplaRegistrada(supabase, d.player1_id, d.player2_id, espId)
      : null;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <PerfilBackLink href={from} label="Voltar" />
      <h1 className="mt-4 text-xl font-bold text-eid-fg sm:text-2xl">Editar dupla registrada</h1>
      <p className="mt-2 text-sm text-eid-text-secondary">
        <Link href={`/perfil-dupla/${id}`} className="font-semibold text-eid-primary-300 underline">
          Ver perfil público da dupla
        </Link>
        .
      </p>
      <div className="mt-6">
        <PerfilDuplaEditForm
          variant="page"
          duplaId={id}
          username={d.username ?? null}
          bio={d.bio ?? null}
          timeFormacaoRadarId={timeFormacaoRadarId}
        />
      </div>
    </main>
  );
}
