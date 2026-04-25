import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  EspacoPublicReservaForm,
  EspacoPublicWaitlistForm,
} from "@/components/espaco/espaco-public-cta";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ReservarEspacoPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/reservar/${slug}`)}`);

  const { data: espaco } = await supabase
    .from("espacos_genericos")
    .select("id, slug, nome_publico, localizacao, modo_reserva, ativo_listagem, lat, lng")
    .eq("slug", slug)
    .eq("ativo_listagem", true)
    .maybeSingle();
  if (!espaco) notFound();

  const [{ data: socioAtivo }, { data: atalho }] = await Promise.all([
    supabase
      .from("espaco_socios")
      .select("id")
      .eq("espaco_generico_id", espaco.id)
      .eq("usuario_id", user.id)
      .eq("status", "ativo")
      .maybeSingle(),
    supabase
      .from("espaco_reserva_atalhos")
      .select("id")
      .eq("espaco_generico_id", espaco.id)
      .eq("usuario_id", user.id)
      .maybeSingle(),
  ]);
  const acessoPagoPublico = String(espaco.modo_reserva ?? "").toLowerCase() === "paga";
  const podeAcessar = Boolean(socioAtivo?.id) || Boolean(atalho?.id) || acessoPagoPublico;
  if (!podeAcessar) {
    redirect(`/espaco/${encodeURIComponent(slug)}`);
  }

  const { data: unidadePrincipal } = await supabase
    .from("espaco_unidades")
    .select("id, esporte_id, nome")
    .eq("espaco_generico_id", espaco.id)
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <main data-eid-touch-ui className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
      <section className="eid-mobile-section rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <p className="text-[11px] text-eid-text-secondary">
          <Link href="/dashboard" className="text-eid-primary-300 hover:underline">
            ← Dashboard
          </Link>
        </p>
        <h1 className="mt-2 text-xl font-bold text-eid-fg">Reserva rápida</h1>
        <p className="mt-1 text-sm text-eid-text-secondary">
          {espaco.nome_publico} · {espaco.localizacao ?? "Localização não informada"}
        </p>
        <p className="mt-2 text-xs text-eid-text-secondary">
          Faça sua reserva sem precisar navegar pela página completa do local.
        </p>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <EspacoPublicReservaForm
          espacoId={espaco.id}
          unidadeId={unidadePrincipal?.id ?? null}
          esporteId={unidadePrincipal?.esporte_id ?? null}
          latitude={Number(espaco.lat ?? NaN)}
          longitude={Number(espaco.lng ?? NaN)}
        />
        <EspacoPublicWaitlistForm
          espacoId={espaco.id}
          unidadeId={unidadePrincipal?.id ?? null}
          esporteId={unidadePrincipal?.esporte_id ?? null}
          latitude={Number(espaco.lat ?? NaN)}
          longitude={Number(espaco.lng ?? NaN)}
        />
      </section>
    </main>
  );
}
