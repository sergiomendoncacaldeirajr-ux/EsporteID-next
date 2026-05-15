import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LocalClaimModal } from "@/components/locais/local-claim-modal";
import { NativeShareButton } from "@/components/native/native-share-button";
import {
  locaisBadgeGhostClass,
  locaisMainFichaClass,
  locaisShellBgGradientClass,
  locaisShellBgRadialClass,
  locaisShellOuterClass,
} from "@/components/locais/locais-ui-tokens";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";
import { createClient } from "@/lib/supabase/server";
import { contaEditarLocalHref } from "@/lib/routes/conta";
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  MapPin,
  Pencil,
  ShieldCheck,
  Users,
} from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

function parseJsonArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .filter(Boolean)
      .map((v) =>
        typeof v === "object" && v !== null && "url" in v
          ? String((v as { url: unknown }).url)
          : String(v)
      );
  }
  try {
    const parsed = JSON.parse(String(val));
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

function PublicSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90">
      <div className="border-b border-[color:var(--eid-border-subtle)] px-4 py-3">
        <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-eid-primary-300">
          {title}
        </h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "ok" | "primary" }) {
  const valueClass =
    tone === "ok" ? "text-emerald-300" : tone === "primary" ? "text-eid-primary-300" : "text-eid-fg";
  return (
    <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-text-secondary">
        {label}
      </p>
      <p className={`mt-1 text-base font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

export default async function LocalPublicPage({ params }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const featureCfg = await getSystemFeatureConfig(supabase);
    if (!canAccessSystemFeature(featureCfg, "locais", user.id, false)) {
      redirect("/dashboard");
    }
  }

  const { data: loc } = await supabase
    .from("espacos_genericos")
    .select(
      "id, slug, nome_publico, logo_arquivo, cover_arquivo, localizacao, cidade, uf, lat, lng, status, ownership_status, esportes_ids, tipo_quadra, aceita_reserva, aceita_socios, ativo_listagem, admin_suspenso, fotos_json, comodidades_json, descricao_curta, descricao_longa, responsavel_usuario_id, criado_por_usuario_id, venue_config_json"
    )
    .eq("id", id)
    .maybeSingle();
  if (!loc) notFound();
  if (loc.admin_suspenso) notFound();
  if (loc.slug) redirect(`/espaco/${loc.slug}`);

  const [{ count: unidadesCount }, claimResult] = await Promise.all([
    supabase
      .from("espaco_unidades")
      .select("id", { count: "exact", head: true })
      .eq("espaco_generico_id", id)
      .eq("ativo", true),
    user && loc.responsavel_usuario_id !== user.id
      ? supabase
          .from("espaco_reivindicacoes")
          .select("id")
          .eq("espaco_generico_id", id)
          .eq("solicitante_id", user.id)
          .eq("status", "pendente")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isGestor = user != null && loc.responsavel_usuario_id === user.id;
  const minhaClaimPendente = claimResult.data;
  const venueConfig = (loc.venue_config_json ?? null) as Record<string, unknown> | null;
  const lat = loc.lat ?? venueConfig?.lat ?? null;
  const lng = loc.lng ?? venueConfig?.lng ?? null;
  const mapsHref =
    lat && lng
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
      : loc.localizacao
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.localizacao)}`
        : null;

  const coverUrl = loc.cover_arquivo ?? null;
  const descricao =
    loc.descricao_curta ??
    loc.descricao_longa ??
    "Local esportivo cadastrado na comunidade EsporteID.";
  const comodidades = parseJsonArray(loc.comodidades_json);
  const fotos = parseJsonArray(loc.fotos_json);
  const heroPhoto = coverUrl ?? fotos[0] ?? null;
  const galleryPhotos = fotos.filter((f) => f !== heroPhoto).slice(0, 8);
  const esportesRaw = parseJsonArray(loc.esportes_ids);
  const verificado = loc.ownership_status === "verificado";
  const claimEmAnalise = loc.ownership_status === "pendente_validacao";
  const aceitaSocios = Boolean(loc.aceita_socios);
  const aceitaReserva = Boolean(loc.aceita_reserva);

  return (
    <div className={locaisShellOuterClass} data-eid-locais-page>
      <div className={locaisShellBgGradientClass} aria-hidden />
      <div className={locaisShellBgRadialClass} aria-hidden />

      <main data-eid-touch-ui className={locaisMainFichaClass}>
        <section className="overflow-hidden rounded-2xl border border-eid-primary-500/20 bg-eid-card/95">
          <div className="relative min-h-[220px]">
            {heroPhoto ? (
              <Image src={heroPhoto} alt="" fill unoptimized priority className="object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(140deg,var(--eid-brand-ink),color-mix(in_srgb,var(--eid-primary-500)_22%,var(--eid-brand-ink)),#080d13)]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,29,46,0.08),rgba(11,29,46,0.9))]" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
              <div className="flex flex-wrap items-end gap-3">
                <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-eid-surface/90 shadow-xl">
                  {loc.logo_arquivo ? (
                    <Image src={loc.logo_arquivo} alt="" fill unoptimized className="object-contain p-2" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-eid-primary-300/65" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap gap-2">
                    {verificado ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-200">
                        <ShieldCheck className="h-3 w-3" aria-hidden />
                        Verificado
                      </span>
                    ) : claimEmAnalise ? (
                      <span className="rounded-full border border-amber-500/35 bg-amber-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-200">
                        Em análise
                      </span>
                    ) : (
                      <span className="rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white/70">
                        Local público
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
                    {loc.nome_publico}
                  </h1>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white/78">
                    <MapPin className="h-4 w-4 shrink-0 text-eid-primary-200" aria-hidden />
                    {loc.localizacao ?? ([loc.cidade, loc.uf].filter(Boolean).join(" - ") || "Localização sob consulta")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <p className="text-sm leading-relaxed text-eid-text-secondary">{descricao}</p>

            <div className="grid gap-2 sm:grid-cols-4">
              <StatCard
                label="Estrutura"
                value={
                  unidadesCount && unidadesCount > 0
                    ? `${unidadesCount} unidade${unidadesCount > 1 ? "s" : ""}`
                    : loc.tipo_quadra ?? "A confirmar"
                }
                tone="primary"
              />
              <StatCard
                label="Esportes"
                value={esportesRaw.length ? `${esportesRaw.length} modalidade${esportesRaw.length > 1 ? "s" : ""}` : "A confirmar"}
              />
              <StatCard label="Reservas" value={aceitaReserva ? "Aceita" : "Consulte"} tone={aceitaReserva ? "ok" : undefined} />
              <StatCard label="Sócios" value={aceitaSocios ? "Recebe" : "Não informa"} tone={aceitaSocios ? "ok" : undefined} />
            </div>

            <div className="flex flex-wrap gap-2">
              {mapsHref ? (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 text-sm font-bold text-eid-primary-200 transition hover:bg-eid-primary-500/15"
                >
                  <MapPin className="h-4 w-4" aria-hidden />
                  Abrir mapa
                </a>
              ) : null}
              <NativeShareButton
                title={`${loc.nome_publico} no EsporteID`}
                text="Veja este local no EsporteID"
                path={`/local/${id}`}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/65 px-4 text-sm font-bold text-eid-fg transition hover:border-eid-primary-500/45 hover:bg-eid-primary-500/10"
              />
              {isGestor ? (
                <Link
                  href={`${contaEditarLocalHref(id)}?from=${encodeURIComponent(`/local/${id}`)}`}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-eid-action-500/35 bg-eid-action-500/10 px-4 text-sm font-bold text-eid-action-300 transition hover:bg-eid-action-500/15"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Editar local
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            {(aceitaReserva || aceitaSocios) ? (
              <PublicSection title="Serviços disponíveis">
                <div className="grid gap-3 sm:grid-cols-2">
                  {aceitaReserva ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <CalendarDays className="h-5 w-5 text-emerald-300" aria-hidden />
                      <p className="mt-3 text-sm font-black text-eid-fg">Reserva de horário</p>
                      <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
                        O local informa que recebe reservas. A confirmação pode depender da gestão do espaço.
                      </p>
                    </div>
                  ) : null}
                  {aceitaSocios ? (
                    <div className="rounded-2xl border border-eid-primary-500/20 bg-eid-primary-500/10 p-4">
                      <Users className="h-5 w-5 text-eid-primary-300" aria-hidden />
                      <p className="mt-3 text-sm font-black text-eid-fg">Sócios e membros</p>
                      <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
                        O local pode receber vínculo de sócios, planos ou controle de membros.
                      </p>
                    </div>
                  ) : null}
                </div>
                {!user ? (
                  <p className="mt-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3 text-xs text-eid-text-secondary">
                    <Link href="/login" className="font-bold text-eid-action-300 hover:underline">
                      Entre na sua conta
                    </Link>{" "}
                    para acessar ações disponíveis nesse local.
                  </p>
                ) : null}
              </PublicSection>
            ) : null}

            {comodidades.length > 0 ? (
              <PublicSection title="Comodidades">
                <div className="flex flex-wrap gap-2">
                  {comodidades.map((c) => (
                    <span key={c} className={locaisBadgeGhostClass}>
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      {c}
                    </span>
                  ))}
                </div>
              </PublicSection>
            ) : null}

            {galleryPhotos.length > 0 ? (
              <PublicSection title="Galeria">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {galleryPhotos.map((url, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60">
                      <Image src={url} alt="" fill unoptimized className="object-cover" />
                    </div>
                  ))}
                </div>
              </PublicSection>
            ) : null}
          </div>

          <aside className="space-y-4">
            <PublicSection title="Informações">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-eid-text-secondary">Endereço</p>
                  <p className="mt-1 text-eid-fg">{loc.localizacao ?? "Não informado"}</p>
                </div>
                {loc.tipo_quadra ? (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-eid-text-secondary">Tipo de estrutura</p>
                    <p className="mt-1 text-eid-fg">{loc.tipo_quadra}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-eid-text-secondary">Status</p>
                  <p className="mt-1 text-eid-fg">
                    {verificado ? "Local verificado" : claimEmAnalise ? "Validação em análise" : "Cadastro público"}
                  </p>
                </div>
              </div>
            </PublicSection>

            {isGestor ? (
              <PublicSection title="Gestão">
                <Link
                  href={`${contaEditarLocalHref(id)}?from=${encodeURIComponent(`/local/${id}`)}`}
                  className="eid-btn-primary inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Editar cadastro do local
                </Link>
              </PublicSection>
            ) : null}

            {!loc.ativo_listagem ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                Este local pode estar fora da listagem pública.
              </div>
            ) : null}

            {!isGestor && minhaClaimPendente ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                Sua solicitação de posse está em análise pelo time EsporteID.
              </div>
            ) : null}

            {!isGestor && !minhaClaimPendente ? (
              <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4">
                <p className="mb-3 text-sm font-black text-eid-fg">Este local é seu?</p>
                <LocalClaimModal espacoId={id} />
              </div>
            ) : null}

            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-4 py-3 text-sm font-bold text-eid-fg transition hover:border-eid-primary-500/45 hover:bg-eid-primary-500/10"
              >
                Ver rota no Google Maps
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  );
}
