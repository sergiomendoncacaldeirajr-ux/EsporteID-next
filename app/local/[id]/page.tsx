import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { createClient } from "@/lib/supabase/server";
import { contaEditarLocalHref } from "@/lib/routes/conta";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function LocalPublicPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const backHref = resolveBackHref(sp.from, "/locais");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: loc } = await supabase
    .from("espacos_genericos")
    .select(
      "id, slug, nome_publico, logo_arquivo, localizacao, lat, lng, status, esportes_ids, tipo_quadra, aceita_reserva, ativo_listagem, fotos_json, comodidades_json, criado_por_usuario_id, responsavel_usuario_id"
    )
    .eq("id", id)
    .maybeSingle();
  if (!loc) notFound();

  if (loc.slug) {
    redirect(`/espaco/${loc.slug}`);
  }

  const { data: dono } = loc.criado_por_usuario_id
    ? await supabase.from("profiles").select("id, nome").eq("id", loc.criado_por_usuario_id).maybeSingle()
    : { data: null };

  const mapsHref =
    loc.lat && loc.lng
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loc.lat},${loc.lng}`)}`
      : loc.localizacao
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.localizacao)}`
        : null;

  const isDonoLocal =
    user &&
    (loc.criado_por_usuario_id === user.id || loc.responsavel_usuario_id === user.id);

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-lg px-3 pb-8 pt-3 sm:max-w-2xl sm:px-6 sm:pb-10 sm:pt-4">
        <PerfilBackLink href={backHref} label="Voltar aos locais" />

        <div className="mt-4 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card sm:rounded-2xl">
          <div className="flex h-32 items-center justify-center bg-eid-surface sm:h-36 md:bg-gradient-to-br md:from-eid-primary-500/20 md:to-eid-card md:h-40">
            {loc.logo_arquivo ? (
              <Image
                src={loc.logo_arquivo}
                alt=""
                width={420}
                height={180}
                unoptimized
                className="max-h-28 max-w-[85%] object-contain sm:max-h-32"
              />
            ) : (
              <span className="text-3xl font-bold text-eid-primary-500/35 sm:text-4xl sm:font-black sm:text-eid-primary-500/40">Local</span>
            )}
          </div>
          <div className="p-4 sm:p-5">
            <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-eid-primary-300">
              {loc.status ?? "público"}
            </span>
            <h1 className="mt-2 text-xl font-bold text-eid-fg sm:text-2xl">{loc.nome_publico}</h1>
            <p className="mt-2 text-sm text-eid-text-secondary">{loc.localizacao}</p>
            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex rounded-xl border border-eid-primary-500/40 px-4 py-2 text-xs font-semibold text-eid-primary-300 hover:bg-eid-primary-500/10"
              >
                Abrir no mapa
              </a>
            ) : null}
          </div>
        </div>

        <section className="mt-6 grid gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm">
          {loc.tipo_quadra ? (
            <p className="text-eid-text-secondary">
              Tipo de quadra: <span className="text-eid-fg">{loc.tipo_quadra}</span>
            </p>
          ) : null}
          <p className="text-eid-text-secondary">
            Reservas:{" "}
            <span className="text-eid-fg">{loc.aceita_reserva ? "Aceita reserva" : "Consulte o responsável"}</span>
          </p>
          {loc.esportes_ids ? (
            <p className="text-xs text-eid-text-secondary">
              Esportes (referência): <span className="text-eid-fg">{loc.esportes_ids}</span>
            </p>
          ) : null}
          {dono ? (
            <p className="text-xs text-eid-text-secondary">
              Cadastro ligado a{" "}
              <Link href={`/perfil/${dono.id}?from=/local/${id}`} className="font-semibold text-eid-primary-300 hover:underline">
                {dono.nome ?? "perfil"}
              </Link>
            </p>
          ) : null}
        </section>

        {isDonoLocal ? (
          <div className="mt-4">
            <Link
              href={`${contaEditarLocalHref(id)}?from=${encodeURIComponent(`/local/${id}`)}`}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/10 px-3 text-xs font-bold uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/65"
            >
              Editar cadastro do local
            </Link>
          </div>
        ) : null}

        {!loc.ativo_listagem ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Este local pode estar fora da listagem pública.
          </p>
        ) : null}
      </main>
    </>
  );
}
