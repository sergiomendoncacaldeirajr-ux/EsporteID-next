import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ContaLocalEditForm } from "@/components/conta/conta-local-edit-form";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { contaNextPath, requireContaPerfilPronto } from "@/lib/conta/require-perfil-pronto";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<{ from?: string }> };

export const metadata = {
  title: "Editar local · EsporteID",
};

export default async function ContaEditarLocalPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const from = typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : `/local/${id}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/conta/local/${id}`)}`);

  await requireContaPerfilPronto(supabase, user.id, contaNextPath(`/conta/local/${id}`, sp));

  const { data: loc } = await supabase
    .from("espacos_genericos")
    .select(
      "id, nome_publico, logo_arquivo, localizacao, lat, lng, tipo_quadra, aceita_reserva, ativo_listagem, criado_por_usuario_id, responsavel_usuario_id"
    )
    .eq("id", id)
    .maybeSingle();
  if (!loc) notFound();

  const pode =
    loc.criado_por_usuario_id === user.id ||
    loc.responsavel_usuario_id === user.id;
  if (!pode) {
    redirect(`/local/${id}?from=${encodeURIComponent(from)}`);
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:max-w-2xl sm:px-6 sm:py-10">
      <PerfilBackLink href={from} label="Voltar" />
      <h1 className="mt-4 text-xl font-bold text-eid-fg sm:text-2xl">Editar local</h1>
      <p className="mt-2 text-sm text-eid-text-secondary">
        Dados exibidos na ficha pública do espaço.{" "}
        <Link href={`/local/${id}`} className="font-semibold text-eid-primary-300 underline">
          Ver como visitante
        </Link>
        .
      </p>
      <section className="mt-6 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-eid-fg">Cadastro do espaço</h2>
        <ContaLocalEditForm
          espacoId={id}
          nomePublico={loc.nome_publico ?? ""}
          localizacao={loc.localizacao ?? ""}
          logoArquivo={loc.logo_arquivo ?? null}
          tipoQuadra={loc.tipo_quadra ?? null}
          lat={loc.lat ?? null}
          lng={loc.lng ?? null}
          aceitaReserva={Boolean(loc.aceita_reserva)}
          ativoListagem={Boolean(loc.ativo_listagem)}
        />
      </section>
    </main>
  );
}
