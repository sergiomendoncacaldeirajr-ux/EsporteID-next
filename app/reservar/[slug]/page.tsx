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
    .eq("admin_suspenso", false)
    .maybeSingle();
  if (!espaco) notFound();

  const [{ data: socioAtivo }] = await Promise.all([
    supabase
      .from("espaco_socios")
      .select("id")
      .eq("espaco_generico_id", espaco.id)
      .eq("usuario_id", user.id)
      .eq("status", "ativo")
      .maybeSingle(),
  ]);
  const podeAcessar = Boolean(socioAtivo?.id);
  if (!podeAcessar) {
    redirect(`/espaco/${encodeURIComponent(slug)}`);
  }

  const [{ data: unidadePrincipal }, { data: jogosAgendados }] = await Promise.all([
    supabase
      .from("espaco_unidades")
      .select("id, esporte_id, nome")
      .eq("espaco_generico_id", espaco.id)
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("partidas")
      .select("id, data_partida, modalidade, esportes(nome)")
      .or(`jogador1_id.eq.${user.id},jogador2_id.eq.${user.id}`)
      .in("status", ["agendada", "aguardando_aceite_agendamento"])
      .order("data_partida", { ascending: true, nullsFirst: false })
      .limit(20),
  ]);
  const jogosOptions = (jogosAgendados ?? []).map((jogo) => {
    const esporte = Array.isArray(jogo.esportes) ? jogo.esportes[0] : jogo.esportes;
    const when = jogo.data_partida ? new Date(jogo.data_partida).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "sem data";
    return {
      id: Number(jogo.id),
      data_partida: jogo.data_partida ?? null,
      label: `#${jogo.id} · ${esporte?.nome ?? "Ranking"} · ${when}`,
    };
  });

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
          jogosAgendados={jogosOptions}
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
