import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LocalOwnershipClaimForm } from "@/components/locais/local-ownership-claim-form";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { PROFILE_CARD_BASE, PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_CLASS } from "@/components/perfil/profile-ui-tokens";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";
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
  if (user) {
    const featureCfg = await getSystemFeatureConfig(supabase);
    if (!canAccessSystemFeature(featureCfg, "locais", user.id)) {
      redirect("/dashboard");
    }
  }

  const { data: loc } = await supabase
    .from("espacos_genericos")
    .select(
      "id, slug, nome_publico, logo_arquivo, localizacao, lat, lng, status, ownership_status, esportes_ids, tipo_quadra, aceita_reserva, ativo_listagem, fotos_json, comodidades_json, criado_por_usuario_id, responsavel_usuario_id"
    )
    .eq("id", id)
    .maybeSingle();
  if (!loc) notFound();

  if (loc.slug) {
    redirect(`/espaco/${loc.slug}`);
  }

  const donoUserId = loc.responsavel_usuario_id ?? loc.criado_por_usuario_id;
  const { data: dono } = donoUserId
    ? await supabase.from("profiles").select("id, nome").eq("id", donoUserId).maybeSingle()
    : { data: null };

  const mapsHref =
    loc.lat && loc.lng
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loc.lat},${loc.lng}`)}`
      : loc.localizacao
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.localizacao)}`
        : null;

  const isGestorLocal = user && loc.responsavel_usuario_id === user.id;
  const isResponsavelOficial = user && loc.responsavel_usuario_id === user.id;
  const { data: minhaClaimPendente } =
    user && !isResponsavelOficial
      ? await supabase
          .from("espaco_reivindicacoes")
          .select("id")
          .eq("espaco_generico_id", id)
          .eq("solicitante_id", user.id)
          .eq("status", "pendente")
          .maybeSingle()
      : { data: null };

  return (
    <main className={PROFILE_PUBLIC_MAIN_CLASS}>
        <PerfilBackLink href={backHref} label="Voltar aos locais" />

        <div className={`${PROFILE_HERO_PANEL_CLASS} mt-2`}>
          <div className="relative flex h-28 items-center justify-center bg-eid-surface sm:h-32">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{ background: "linear-gradient(135deg,#172554 0%,#0b1d2e 55%,#0b0f14 100%)" }}
              aria-hidden
            />
            <div className="relative z-[1] flex w-full items-center justify-center px-3">
              {loc.logo_arquivo ? (
                <Image
                  src={loc.logo_arquivo}
                  alt=""
                  width={420}
                  height={180}
                  unoptimized
                  className="max-h-24 max-w-[85%] object-contain sm:max-h-28"
                />
              ) : (
                <span className="text-2xl font-black text-eid-primary-300/80 sm:text-3xl">Local</span>
              )}
            </div>
          </div>
          <div className="px-3 pb-3 pt-3 sm:px-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-eid-primary-300">
                {loc.status ?? "público"}
              </span>
              <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-eid-action-400">
                {loc.ownership_status === "verificado"
                  ? "verificado"
                  : loc.ownership_status === "pendente_validacao"
                    ? "claim em análise"
                    : "espaço genérico"}
              </span>
            </div>
            <h1 className="mt-2 text-[15px] font-black leading-tight text-eid-fg sm:text-lg">{loc.nome_publico}</h1>
            <p className="mt-1 text-[11px] text-eid-text-secondary sm:text-xs">{loc.localizacao}</p>
            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/10 px-3 text-[11px] font-bold uppercase tracking-wide text-eid-primary-300 transition hover:bg-eid-primary-500/16"
              >
                Abrir no mapa
              </a>
            ) : null}
          </div>
        </div>

        <ProfileSection
          title="Informações"
          className="mt-4"
          info="Dados do local: tipo de quadra, política de reserva, esportes e vínculo com quem cadastrou."
        >
          <div className={`${PROFILE_CARD_BASE} grid gap-2 p-3 text-[11px] sm:p-4 sm:text-xs`}>
            {loc.tipo_quadra ? (
              <p className="text-eid-text-secondary">
                Tipo de quadra: <span className="font-semibold text-eid-fg">{loc.tipo_quadra}</span>
              </p>
            ) : null}
            <p className="text-eid-text-secondary">
              Reservas:{" "}
              <span className="font-semibold text-eid-fg">{loc.aceita_reserva ? "Aceita reserva" : "Consulte o responsável"}</span>
            </p>
            {loc.esportes_ids ? (
              <p className="text-[10px] text-eid-text-secondary sm:text-[11px]">
                Esportes (referência): <span className="text-eid-fg">{loc.esportes_ids}</span>
              </p>
            ) : null}
            {dono ? (
              <p className="text-[10px] text-eid-text-secondary sm:text-[11px]">
                Cadastro ligado a{" "}
                <Link href={`/perfil/${dono.id}?from=/local/${id}`} className="font-semibold text-eid-primary-300 hover:underline">
                  {dono.nome ?? "perfil"}
                </Link>
              </p>
            ) : null}
          </div>
        </ProfileSection>

        {isGestorLocal ? (
          <div className="mt-4">
            <Link
              href={`${contaEditarLocalHref(id)}?from=${encodeURIComponent(`/local/${id}`)}`}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/10 px-3 text-xs font-bold uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/65"
            >
              Editar cadastro do local
            </Link>
          </div>
        ) : null}

        {!isResponsavelOficial && !minhaClaimPendente ? <LocalOwnershipClaimForm espacoId={id} /> : null}
        {!isResponsavelOficial && minhaClaimPendente ? (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            Seu pedido de posse oficial já está em análise pelo admin do EsporteID.
          </p>
        ) : null}

        {!loc.ativo_listagem ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Este local pode estar fora da listagem pública.
          </p>
        ) : null}
      </main>
  );
}
