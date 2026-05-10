import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LocalClaimModal } from "@/components/locais/local-claim-modal";
import {
  locaisBadgeGhostClass,
  locaisMainFichaClass,
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
  const heroPhoto = coverUrl ?? fotos[0] ?? null;
  const galleryPhotos = fotos.filter((f) => f !== heroPhoto).slice(0, 8);
  const esportesRaw = parseJsonArray(loc.esportes_ids);

  const verificado = loc.ownership_status === "verificado";
  const claimEmAnalise = loc.ownership_status === "pendente_validacao";

  // Build stat items — only non-empty ones
  const statItems: { label: string; value: string; accent?: string }[] = [];
  if (unidadesCount && unidadesCount > 0) {
    statItems.push({ label: "Quadras", value: String(unidadesCount), accent: "primary" });
  } else if (loc.tipo_quadra) {
    statItems.push({ label: "Tipo", value: loc.tipo_quadra });
  }
  if (esportesRaw.length > 0) {
    statItems.push({ label: "Esportes", value: `${esportesRaw.length} modalidade${esportesRaw.length > 1 ? "s" : ""}` });
  }
  statItems.push({
    label: "Reservas",
    value: loc.aceita_reserva ? "Aceita" : "Consulte",
    accent: loc.aceita_reserva ? "green" : undefined,
  });
  statItems.push({
    label: "Sócios",
    value: aceitaSocios ? "Recebe" : "Não informa",
    accent: aceitaSocios ? "green" : undefined,
  });

  const accentClass = (a?: string) => {
    if (a === "green") return "text-emerald-400";
    if (a === "primary") return "text-eid-primary-300";
    return "text-eid-fg";
  };

  return (
    <div className={locaisShellOuterClass} data-eid-locais-page>
      <div className={locaisShellBgGradientClass} aria-hidden />
      <div className={locaisShellBgRadialClass} aria-hidden />

      <main data-eid-touch-ui className={locaisMainFichaClass}>

        {/* ══ HERO CARD ══════════════════════════════════════════ */}
        <div className={`${PROFILE_HERO_PANEL_CLASS} overflow-hidden`}>

          {/* Cover photo */}
          <div className="relative h-40 sm:h-52">
            {heroPhoto ? (
              <Image src={heroPhoto} alt="" fill unoptimized className="object-cover" priority />
            ) : null}
            <div
              className="absolute inset-0"
              style={{
                background: heroPhoto
                  ? "linear-gradient(180deg,rgba(11,29,46,0.15) 0%,rgba(11,29,46,0.75) 100%)"
                  : "linear-gradient(140deg,#1e3a5f 0%,#0b1d2e 50%,#080d13 100%)",
              }}
              aria-hidden
            />
            {/* Subtle grid texture overlay for depth */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "radial-gradient(circle,#fff 1px,transparent 1px)", backgroundSize: "28px 28px" }}
              aria-hidden
            />

            {/* Status badge — top left */}
            <div className="absolute left-3 top-3">
              {verificado ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-black/50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-300 backdrop-blur-md">
                  <svg className="h-2.5 w-2.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.78 5.22L6.75 10.25l-2.53-2.53a.75.75 0 0 0-1.06 1.06l3.06 3.06a.75.75 0 0 0 1.06 0l5.56-5.56a.75.75 0 0 0-1.06-1.06Z" />
                  </svg>
                  Verificado
                </span>
              ) : claimEmAnalise ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-black/50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-300 backdrop-blur-md">
                  Em análise
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/40 backdrop-blur-md">
                  Espaço genérico
                </span>
              )}
            </div>

            {/* Edit cover — top right, gestor only */}
            {isGestor ? (
              <Link
                href={`${contaEditarLocalHref(id)}?from=${encodeURIComponent(`/local/${id}`)}`}
                className="absolute right-3 top-3 flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/70 backdrop-blur-md transition hover:bg-black/65 hover:text-white/90"
              >
                <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L5.301 13.174l-3.47.49.49-3.47 8.692-9.681Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Editar capa
              </Link>
            ) : null}
          </div>

          {/* Identity content */}
          <div className="px-4 pb-5 pt-0">
            {/* Logo — overlaps cover */}
            <div className="-mt-9 mb-4">
              <div className="relative h-[68px] w-[68px] overflow-hidden rounded-2xl border-[2.5px] border-[color:color-mix(in_srgb,var(--eid-card)_90%,var(--eid-primary-500)_10%)] bg-eid-surface shadow-[0_10px_28px_-8px_rgba(0,0,0,0.7),0_0_0_1px_rgba(37,99,235,0.14)]">
                {loc.logo_arquivo ? (
                  <Image src={loc.logo_arquivo} alt="" fill unoptimized className="object-contain p-1.5" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#172554] to-[#0b0f14]">
                    <svg className="h-8 w-8 text-eid-primary-500/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                      <path d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <h1 className="text-xl font-black leading-tight tracking-tight text-eid-fg sm:text-2xl">
              {loc.nome_publico}
            </h1>

            {/* Location */}
            {loc.localizacao ? (
              <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-eid-text-secondary">
                <svg className="h-3.5 w-3.5 shrink-0 text-eid-primary-500" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M8 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM2.5 6.5a5.5 5.5 0 1 1 11 0c0 3.737-4.277 8.075-5.108 8.849a.574.574 0 0 1-.784 0C6.777 14.575 2.5 10.237 2.5 6.5ZM8 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" clipRule="evenodd" />
                </svg>
                {loc.localizacao}
              </p>
            ) : null}

            {/* Short description */}
            {descricaoCurta ? (
              <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">
                {descricaoCurta}
              </p>
            ) : null}

            {/* Map button — inline pill below location */}
            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-eid-primary-500/35 bg-[color:color-mix(in_srgb,var(--eid-primary-500)_9%,transparent)] px-3.5 py-1.5 text-[11px] font-semibold text-eid-primary-300 transition hover:border-eid-primary-500/55 hover:bg-[color:color-mix(in_srgb,var(--eid-primary-500)_15%,transparent)]"
              >
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Abrir no Google Maps
              </a>
            ) : null}
          </div>
        </div>

        {/* ══ STATS ROW ══════════════════════════════════════════ */}
        {statItems.length > 0 ? (
          <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(statItems.length, 4)}, 1fr)` }}>
            {statItems.map((s) => (
              <div
                key={s.label}
                className="flex flex-col gap-0.5 rounded-2xl border border-[rgba(255,255,255,0.055)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-primary-500)_3%),color-mix(in_srgb,var(--eid-surface)_95%,transparent))] px-3 py-3 shadow-[0_4px_20px_-10px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.035)]"
              >
                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-eid-primary-500">
                  {s.label}
                </span>
                <span className={`text-sm font-extrabold leading-snug ${accentClass(s.accent)}`}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {/* ══ SERVIÇOS ═══════════════════════════════════════════ */}
        {(loc.aceita_reserva || aceitaSocios) ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.055)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_98%,var(--eid-primary-500)_2%),color-mix(in_srgb,var(--eid-surface)_96%,transparent))] shadow-[0_8px_28px_-16px_rgba(15,23,42,0.45),inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="border-b border-[rgba(255,255,255,0.045)] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-500">
                O que este local oferece
              </p>
            </div>
            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {loc.aceita_reserva ? (
                <div className="flex items-center gap-3.5 px-4 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--eid-action-500)_14%,transparent)] text-eid-action-400">
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="4" width="18" height="18" rx="2.5" />
                      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold leading-snug text-eid-fg">Reserva de horário</p>
                    <p className="text-[11px] text-eid-text-secondary">Garante seu espaço nas quadras</p>
                  </div>
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 0 0 .28 7.695l3 3a1 1 0 0 0 1.414 0l7-7A1 1 0 0 0 10.28 2.28Z" />
                    </svg>
                  </div>
                </div>
              ) : null}

              {aceitaSocios ? (
                <>
                  <div className="flex items-center gap-3.5 px-4 py-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,transparent)] text-eid-primary-400">
                      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold leading-snug text-eid-fg">Sociedade / filiação</p>
                      <p className="text-[11px] text-eid-text-secondary">Seja sócio e acesse benefícios exclusivos</p>
                    </div>
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 0 0 .28 7.695l3 3a1 1 0 0 0 1.414 0l7-7A1 1 0 0 0 10.28 2.28Z" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 px-4 py-3.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--eid-primary-500)_14%,transparent)] text-eid-primary-400">
                      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold leading-snug text-eid-fg">Pagamento de mensalidade</p>
                      <p className="text-[11px] text-eid-text-secondary">Mantenha sua assinatura em dia</p>
                    </div>
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 0 0 .28 7.695l3 3a1 1 0 0 0 1.414 0l7-7A1 1 0 0 0 10.28 2.28Z" />
                      </svg>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {!user ? (
              <div className="border-t border-[rgba(255,255,255,0.04)] px-4 py-3 text-center text-[11px] text-eid-text-secondary">
                <Link href="/login" className="font-semibold text-eid-action-400 hover:underline">
                  Entre na sua conta
                </Link>{" "}
                para acessar os serviços deste local.
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ══ COMODIDADES ════════════════════════════════════════ */}
        {comodidades.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.055)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_98%,var(--eid-primary-500)_2%),color-mix(in_srgb,var(--eid-surface)_96%,transparent))] shadow-[0_4px_20px_-10px_rgba(15,23,42,0.4)]">
            <div className="border-b border-[rgba(255,255,255,0.045)] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-500">
                Comodidades
              </p>
            </div>
            <div className="flex flex-wrap gap-2 px-4 py-3.5">
              {comodidades.map((c) => (
                <span
                  key={c}
                  className={locaisBadgeGhostClass}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* ══ GALERIA ════════════════════════════════════════════ */}
        {galleryPhotos.length > 0 ? (
          <div className="mt-4">
            <div className="mb-2.5 px-0.5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-500">Galeria</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {galleryPhotos.map((url, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                  <Image src={url} alt="" fill unoptimized className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ══ PAINEL GESTOR ══════════════════════════════════════ */}
        {isGestor ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-eid-primary-500/20 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_9%,transparent),color-mix(in_srgb,var(--eid-card)_96%,transparent))] shadow-[0_4px_20px_-10px_rgba(37,99,235,0.25)]">
            <div className="border-b border-eid-primary-500/15 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-eid-primary-400">
                Gestão do local
              </p>
            </div>
            <div className="p-4">
              <Link
                href={`${contaEditarLocalHref(id)}?from=${encodeURIComponent(`/local/${id}`)}`}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-eid-primary-500 px-4 text-[13px] font-bold text-white shadow-[0_4px_14px_-4px_rgba(37,99,235,0.5)] transition hover:bg-eid-primary-600 active:scale-[0.98]"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L5.301 13.174l-3.47.49.49-3.47 8.692-9.681Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Editar cadastro do local
              </Link>
            </div>
          </div>
        ) : null}

        {/* ══ AVISOS ═════════════════════════════════════════════ */}
        {!loc.ativo_listagem ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-[color:color-mix(in_srgb,#f59e0b_6%,transparent)] px-3.5 py-3 text-[11px] leading-relaxed text-amber-200/75">
            <svg className="mt-px h-4 w-4 shrink-0 text-amber-500/60" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 3.25a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0V5a.75.75 0 0 0-.75-.75ZM8 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
            </svg>
            Este local pode estar fora da listagem pública.
          </div>
        ) : null}

        {!isGestor && minhaClaimPendente ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-[color:color-mix(in_srgb,#f59e0b_8%,transparent)] px-3.5 py-3 text-[11px] leading-relaxed text-amber-200">
            <svg className="mt-px h-4 w-4 shrink-0 text-amber-400" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 3.25a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0V5a.75.75 0 0 0-.75-.75ZM8 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
            </svg>
            Sua solicitação de posse está em análise pelo time EsporteID.
          </div>
        ) : null}

        {/* ══ SOLICITAR POSSE ════════════════════════════════════ */}
        {!isGestor && !minhaClaimPendente ? (
          <div className="mt-6 mb-2">
            <LocalClaimModal espacoId={id} />
          </div>
        ) : null}

      </main>
    </div>
  );
}
