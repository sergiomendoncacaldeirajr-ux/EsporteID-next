import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ContaLocalEditForm } from "@/components/conta/conta-local-edit-form";
import {
  locaisFormPanelClass,
  locaisMainFichaClass,
  locaisPageH1Class,
  locaisPageLeadClass,
  locaisSectionTitleClass,
  locaisShellBgGradientClass,
  locaisShellBgRadialClass,
  locaisShellOuterClass,
} from "@/components/locais/locais-ui-tokens";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { PROFILE_SECTION_TITLE } from "@/components/perfil/profile-ui-tokens";
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

  const pode = loc.responsavel_usuario_id === user.id;
  if (!pode) {
    redirect(`/local/${id}?from=${encodeURIComponent(from)}`);
  }

  return (
    <div className={locaisShellOuterClass} data-eid-locais-page>
      <div className={locaisShellBgGradientClass} aria-hidden />
      <div className={locaisShellBgRadialClass} aria-hidden />
      <main data-eid-touch-ui className={`${locaisMainFichaClass} pt-4 sm:pt-6`}>
        <PerfilBackLink href={from} label="Voltar" />
        <p className={`${locaisSectionTitleClass} mt-3`}>Conta · espaço</p>
        <h1 className={`${locaisPageH1Class} mt-1`}>Editar local</h1>
        <p className={`${locaisPageLeadClass} mt-2`}>
          Dados exibidos na ficha pública do espaço.{" "}
          <Link href={`/local/${id}`} className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline">
            Ver como visitante
          </Link>
          .
        </p>
        <section className={`${locaisFormPanelClass} mt-6`}>
          <h2 className={PROFILE_SECTION_TITLE}>Cadastro do espaço</h2>
          <div className="mt-4">
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
          </div>
        </section>
      </main>
    </div>
  );
}
