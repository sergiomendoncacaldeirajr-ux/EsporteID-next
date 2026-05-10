import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LocalClaimModal } from "@/components/locais/local-claim-modal";
import {
  locaisBadgeGhostClass,
  locaisMainFichaClass,
  locaisSectionTitleClass,
  locaisShellBgGradientClass,
  locaisShellBgRadialClass,
  locaisShellOuterClass,
} from "@/components/locais/locais-ui-tokens";
import { PROFILE_HERO_PANEL_CLASS } from "@/components/perfil/profile-ui-tokens";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";
import { createClient } from "@/lib/supabase/server";
import { contaEditarLocalHref } from "@/lib/routes/conta";

type Props = {
  params: Promise<{ id: string }>;
};

function parseJsonArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.filter(Boolean).map((v) =>
      typeof v === "object" && v !== null && "url" in v ? String((v as { url: unknown }).url) : String(v)
    );
  }
  try {
    const parsed = JSON.parse(String(val));
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

const STAT_CARD =
  "flex flex-col gap-1 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-primary-500)_3%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] p-3 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.4)]";

const SERVICE_CARD =
  "flex items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-primary-500)_3%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] px-4 py-3.5 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.4)]";

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
      "id, slug, nome_publico, logo_arquivo, cover_arquivo, localizacao, lat, lng, status, ownership_status, esportes_ids, tipo_quadra, aceita_reserva, aceita_socios, ativo_listagem, admin_suspenso, fotos_json, comodidades_json, descricao_curta, responsavel_usuario_id, criado_por_usuario_id"
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

  const mapsHref =
    loc.lat && loc.lng
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loc.lat},${loc.lng}`)}`
      : loc.localizacao
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.localizacao)}`
        : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extra = loc as any;
  const coverUrl: string | null = extra.cover_arquivo ?? null;
  const descricaoCurta: string | null = extra.descricao_curta ?? null;
  const aceitaSocios: boolean = Boolean(extra.aceita_socios);

  const comodidades = parseJsonArray(loc.comodidades_json);
  const fotos = parseJsonArray(loc.fotos_json);
  const allPhotos = [
    ...(coverUrl ? [coverUrl] : []),
    ...fotos.filter((f) => f !== coverUrl),
  ];
  const heroPhoto = coverUrl ?? fotos[0] ?? null;
  const galleryPhotos = allPhotos.slice(1, 9);

  const esportesRaw = parseJsonArray(loc.esportes_ids);

  const verificado = loc.ownership_status === "verificado";
  const claimEmAnalise = loc.ownership_status === "pendente_validacao";

  const hasStats =
    (unidadesCount != null && unidadesCount > 0) ||
    Boolean(loc.tipo_quadra) ||
    esportesRaw.length > 0 ||
    loc.aceita_reserva != null ||
    aceitaSocios;

  const hasServices = loc.aceita_reserva || aceitaSocios;

  return (
    <div className={locaisShellOuterClass} data-eid-locais-page>
      <div className={locaisShellBgGradientClass} aria-hidden />
      <div className={locaisShellBgRadialClass} aria-hidden />

      <main data-eid-touch-ui className={locaisMainFichaClass}>
        {/* ── HERO ─────────────────────────────────────────── */}
        <div className={`${PROFILE_HERO_PANEL_CLASS} overflow-hidden`}>
          {/* Cover */}
          <div className="relative h-44 sm:h-56">
            {heroPhoto ? (
              <Image
                src={heroPhoto}
                alt=""
                fill
                unoptimized
                className="object-cover"
                priority
              />
            ) : null}
            {/* Gradient overlay */}
            <div
              className="absolute inset-0"
              style={{
                background: heroPhoto
                  ? "linear-gradient(180deg,rgba(11,29,46,0.20) 0%,rgba(11,29,46,0.82) 100%)"
                  : "linear-gradient(135deg,#172554 0%,#0b1d2e 60%,#0b0f14 100%)",
              }}
              aria-hidden
            />

            {/* Status badges — top left */}
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              {verificado && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-black/40 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-300 backdrop-blur-sm">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.78 5.22L6.75 10.25l-2.53-2.53a.75.75 0 0 0-1.06 1.06l3.06 3.06a.75.75 0 0 0 1.06 0l5.56-5.56a.75.75 0 0 0-1.06-1.06Z" />
                  </svg>
                  Verificado
                </span>
              )}
              {claimEmAnalise && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-black/40 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-300 backdrop-blur-sm">
                  Em análise
                </span>
              )}
              {!verificado && !claimEmAnalise && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-black/35 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/55 backdrop-blur-sm">
                  Espaço genérico
                </span>
              )}
            </div>

            {/* Edit cover — top right (gestor only) */}
            {isGestor ? (
              <Link
                href={`${contaEditarLocalHref(id)}?from=${encodeURIComponent(`/local/${id}`)}`}
                className="absolute right-3 top-3 flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/45 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/80 backdrop-blur-sm transition hover:bg-black/60"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path
                    d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L5.301 13.174l-3.47.49.49-3.47 8.692-9.681Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Editar capa
              </Link>
            ) : null}
          </div>

          {/* Logo + identity ─────── */}
          <div className="px-4 pb-5 pt-0">
            {/* Logo overlapping cover + map button */}
            <div className="-mt-8 mb-3 flex items-end justify-between gap-3">
              {/* Logo / escudo */}
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px] border-2 border-eid-card bg-eid-surface shadow-[0_8px_24px_-8px_rgba(0,0,0,0.65),0_0_0_1px_rgba(37,99,235,0.12)]">
                {loc.logo_arquivo ? (
                  <Image
                    src={loc.logo_arquivo}
                    alt=""
                    fill
                    unoptimized
                    className="object-contain p-1"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-eid-primary-900/70 to-eid-brand-ink">
                    <svg
                      className="h-7 w-7 text-eid-primary-400/50"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    >
                      <path
                        d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Map button */}
              {mapsHref ? (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-eid-primary-300 transition hover:border-eid-primary-500/55 hover:bg-eid-primary-500/18"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Ver no mapa
                </a>
              ) : null}
            </div>

            {/* Name */}
            <h1 className="text-xl font-black leading-tight tracking-tight text-eid-fg sm:text-2xl">
              {loc.nome_publico}
            </h1>

            {/* Location */}
            {loc.localizacao ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-eid-text-secondary">
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-eid-primary-400"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM2.5 6.5a5.5 5.5 0 1 1 11 0c0 3.737-4.277 8.075-5.108 8.849a.574.574 0 0 1-.784 0C6.777 14.575 2.5 10.237 2.5 6.5ZM8 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
                    clipRule="evenodd"
                  />
                </svg>
                {loc.localizacao}
              </p>
            ) : null}

            {/* Short description */}
            {descricaoCurta ? (
              <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary sm:text-sm">
                {descricaoCurta}
              </p>
            ) : null}
          </div>
        </div>

        {/* ── STATS ────────────────────────────────────────── */}
        {hasStats ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {unidadesCount != null && unidadesCount > 0 ? (
              <div className={STAT_CARD}>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-eid-primary-400">
                  Quadras
                </span>
                <span className="text-2xl font-black leading-none text-eid-fg">{unidadesCount}</span>
                <span className="text-[10px] text-eid-text-secondary">
                  {unidadesCount === 1 ? "disponível" : "disponíveis"}
                </span>
              </div>
            ) : loc.tipo_quadra ? (
              <div className={STAT_CARD}>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-eid-primary-400">
                  Tipo
                </span>
                <span className="mt-0.5 text-sm font-bold leading-snug text-eid-fg">{loc.tipo_quadra}</span>
              </div>
            ) : null}

            {esportesRaw.length > 0 ? (
              <div className={`${STAT_CARD} col-span-1`}>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-eid-primary-400">
                  Esportes
                </span>
                <span className="mt-0.5 text-2xl font-black leading-none text-eid-fg">
                  {esportesRaw.length}
                </span>
                <span className="text-[10px] text-eid-text-secondary">
                  {esportesRaw.length === 1 ? "modalidade" : "modalidades"}
                </span>
              </div>
            ) : null}

            <div className={STAT_CARD}>
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-eid-primary-400">
                Reservas
              </span>
              <span
                className={`mt-0.5 text-sm font-bold leading-snug ${
                  loc.aceita_reserva ? "text-emerald-400" : "text-eid-text-secondary"
                }`}
              >
                {loc.aceita_reserva ? "Aceita" : "Consulte"}
              </span>
            </div>

            <div className={STAT_CARD}>
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-eid-primary-400">
                Sócios
              </span>
              <span
                className={`mt-0.5 text-sm font-bold leading-snug ${
                  aceitaSocios ? "text-emerald-400" : "text-eid-text-secondary"
                }`}
              >
                {aceitaSocios ? "Recebe" : "Não informa"}
              </span>
            </div>
          </div>
        ) : null}

        {/* ── SERVIÇOS ─────────────────────────────────────── */}
        {hasServices ? (
          <div className="mt-5">
            <p className={`mb-3 ${locaisSectionTitleClass}`}>Serviços disponíveis</p>
            <div className="grid gap-2">
              {loc.aceita_reserva ? (
                <div className={SERVICE_CARD}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-eid-action-500/25 bg-eid-action-500/15 text-eid-action-400">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="4" width="18" height="18" rx="2.5" />
                      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-eid-fg">Reservar horário</p>
                    <p className="text-[11px] leading-snug text-eid-text-secondary">
                      Garanta seu espaço nas quadras
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-eid-action-500/25 bg-eid-action-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-eid-action-400">
                    Disponível
                  </span>
                </div>
              ) : null}

              {aceitaSocios ? (
                <>
                  <div className={SERVICE_CARD}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/15 text-eid-primary-400">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path
                          d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-eid-fg">Fazer sociedade</p>
                      <p className="text-[11px] leading-snug text-eid-text-secondary">
                        Seja sócio e acesse benefícios exclusivos
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-eid-primary-500/25 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-eid-primary-300">
                      Disponível
                    </span>
                  </div>

                  <div className={SERVICE_CARD}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/15 text-eid-primary-400">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path
                          d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-eid-fg">Pagar mensalidade</p>
                      <p className="text-[11px] leading-snug text-eid-text-secondary">
                        Mantenha sua assinatura em dia
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-eid-primary-500/25 bg-eid-primary-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-eid-primary-300">
                      Disponível
                    </span>
                  </div>
                </>
              ) : null}

              {!user ? (
                <p className="mt-1 text-center text-[10px] text-eid-text-secondary">
                  <Link href="/login" className="font-semibold text-eid-action-400 hover:underline">
                    Entre na sua conta
                  </Link>{" "}
                  para acessar os serviços deste local.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ── COMODIDADES ──────────────────────────────────── */}
        {comodidades.length > 0 ? (
          <div className="mt-5">
            <p className={`mb-2.5 ${locaisSectionTitleClass}`}>Comodidades</p>
            <div className="flex flex-wrap gap-1.5">
              {comodidades.map((c) => (
                <span key={c} className={locaisBadgeGhostClass}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── GALERIA ──────────────────────────────────────── */}
        {galleryPhotos.length > 0 ? (
          <div className="mt-5">
            <p className={`mb-2.5 ${locaisSectionTitleClass}`}>Galeria</p>
            <div className="grid grid-cols-3 gap-1.5 overflow-hidden rounded-2xl sm:grid-cols-4">
              {galleryPhotos.map((url, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                  <Image src={url} alt="" fill unoptimized className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── GESTÃO (owner only) ───────────────────────────── */}
        {isGestor ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-eid-primary-500/22 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_8%,transparent),color-mix(in_srgb,var(--eid-primary-700)_4%,transparent))] p-4">
            <p className={`mb-3 ${locaisSectionTitleClass}`}>Gestão do local</p>
            <Link
              href={`${contaEditarLocalHref(id)}?from=${encodeURIComponent(`/local/${id}`)}`}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-eid-primary-500 px-4 text-sm font-bold text-white transition hover:bg-eid-primary-600 active:scale-[0.98]"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path
                  d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L5.301 13.174l-3.47.49.49-3.47 8.692-9.681Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Editar cadastro do local
            </Link>
          </div>
        ) : null}

        {/* ── STATUS NOTICES ────────────────────────────────── */}
        {!loc.ativo_listagem ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-[11px] leading-relaxed text-amber-200/70">
            <svg className="h-4 w-4 shrink-0 text-amber-500/60" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 3.25a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0V5a.75.75 0 0 0-.75-.75ZM8 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
            </svg>
            Este local pode estar fora da listagem pública.
          </div>
        ) : null}

        {!isGestor && minhaClaimPendente ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <svg className="h-4 w-4 shrink-0 text-amber-400" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 3.25a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0V5a.75.75 0 0 0-.75-.75ZM8 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
            </svg>
            Seu pedido de posse já está em análise pelo time EsporteID.
          </div>
        ) : null}

        {/* ── CLAIM LINK ────────────────────────────────────── */}
        {!isGestor && !minhaClaimPendente ? (
          <div className="mt-8 flex items-center justify-center pb-2">
            <LocalClaimModal espacoId={id} />
          </div>
        ) : null}
      </main>
    </div>
  );
}
