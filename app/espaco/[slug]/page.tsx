import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Globe,
  Mail,
  MapPin,
  Phone,
  Trophy,
  Users,
} from "lucide-react";
import { NativeShareButton } from "@/components/native/native-share-button";
import { PROFILE_PUBLIC_MAIN_WIDE_CLASS, PROFILE_SECTION_TITLE } from "@/components/perfil/profile-ui-tokens";
import { EspacoGradePublica } from "@/components/espaco/espaco-grade-publica";
import type { ReservaPublica, HorarioSemanal, UnidadePublica, PlanoPublico } from "@/components/espaco/espaco-grade-publica";
import { EspacoDistanceBadge } from "@/components/espaco/espaco-distance-badge";
import { createClient } from "@/lib/supabase/server";
import { normalizeEspacoReservaConfig } from "@/lib/espacos/config";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ semana?: string }>;
};

function parseCoord(value: unknown): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  try {
    const p = JSON.parse(String(value));
    return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
  } catch { return null; }
}

function planoHerdaRegra(plano: { beneficios_json?: unknown }, key: string) {
  const b = plano.beneficios_json;
  if (!b || typeof b !== "object" || Array.isArray(b)) return false;
  const h = (b as Record<string, unknown>).herdar_regras_globais;
  return Boolean(h && typeof h === "object" && !Array.isArray(h) && (h as Record<string, unknown>)[key] === true);
}

function getWeekBounds(dateStr?: string) {
  const base = dateStr ? new Date(dateStr) : new Date();
  const day = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { inicio: monday, fim: sunday };
}

function moeda(centavos: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    (Number(centavos ?? 0) || 0) / 100
  );
}

const SUPERFICIE_LABEL: Record<string, string> = {
  areia: "Areia", saibro: "Saibro", sintetico: "Sintético",
  cimento: "Cimento", madeira: "Madeira", emborrachado: "Emborrachado",
};

export default async function EspacoPublicLandingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: espaco } = await supabase
    .from("espacos_genericos")
    .select(
      "id, slug, nome_publico, descricao_curta, descricao_longa, localizacao, cidade, uf, logo_arquivo, cover_arquivo, whatsapp_contato, email_contato, website_url, instagram_url, aceita_socios, ativo_listagem, tipo_quadra, aceita_reserva, esportes_ids, configuracao_reservas_json, modo_reserva, lat, lng, venue_config_json, entrada_membro_modo, entrada_membro_descricao, formas_pagamento_aceitas"
    )
    .eq("slug", slug)
    .eq("ativo_listagem", true)
    .eq("admin_suspenso", false)
    .maybeSingle();
  if (!espaco) notFound();

  const reservaConfig = normalizeEspacoReservaConfig(espaco.configuracao_reservas_json);
  const modoReserva = String(espaco.modo_reserva ?? "gratuita");
  const isPago = modoReserva === "paga";

  const { data: membership } = user
    ? await supabase
        .from("espaco_socios").select("id, status")
        .eq("espaco_generico_id", espaco.id).eq("usuario_id", user.id).maybeSingle()
    : { data: null };
  const isMembroAtivo = String(membership?.status ?? "") === "ativo";

  const weekBounds = getWeekBounds(sp.semana);

  const [
    { data: unidadesRaw },
    { data: planosRaw },
    { data: horariosRaw },
    { data: reservasRaw },
    { data: professores },
    { data: torneios },
  ] = await Promise.all([
    supabase.from("espaco_unidades")
      .select("id, nome, tipo_unidade, superficie, coberta, indoor, iluminacao, status_operacao, esporte_id")
      .eq("espaco_generico_id", espaco.id).eq("ativo", true).order("ordem", { ascending: true }),
    supabase.from("espaco_planos_socio")
      .select("id, nome, descricao, mensalidade_centavos, reservas_gratuitas_semana, percentual_desconto_avulso, beneficios_json")
      .eq("espaco_generico_id", espaco.id).eq("ativo", true).order("ordem", { ascending: true }),
    supabase.from("espaco_horarios_semanais")
      .select("id, espaco_unidade_id, dia_semana, hora_inicio, hora_fim, ativo")
      .eq("espaco_generico_id", espaco.id).eq("ativo", true)
      .order("dia_semana", { ascending: true }).order("hora_inicio", { ascending: true }),
    supabase.from("reservas_quadra")
      .select("id, espaco_unidade_id, inicio, fim, status_reserva, partida_id, torneio_id")
      .eq("espaco_generico_id", espaco.id)
      .in("status_reserva", ["confirmada", "agendada"])
      .gte("inicio", weekBounds.inicio.toISOString())
      .lte("fim", weekBounds.fim.toISOString())
      .order("inicio", { ascending: true }),
    supabase.from("professor_locais")
      .select("id, professor_id, status_vinculo, profiles(id, nome, avatar_url)")
      .eq("espaco_id", espaco.id).eq("status_vinculo", "ativo").limit(6),
    supabase.from("torneios")
      .select("id, nome, status, data_inicio")
      .eq("espaco_generico_id", espaco.id)
      .order("data_inicio", { ascending: true }).limit(6),
  ]);

  // Participantes das reservas
  const reservaIds = (reservasRaw ?? []).map((r) => r.id);
  const { data: participantesRaw } = reservaIds.length
    ? await supabase.from("espaco_reserva_participantes")
        .select("id, reserva_quadra_id, profiles(id, nome, avatar_url)")
        .in("reserva_quadra_id", reservaIds)
    : { data: [] };

  type ParticipanteRow = NonNullable<typeof participantesRaw>[number];
  const participantesByReserva = new Map<number, ParticipanteRow[]>();
  for (const p of participantesRaw ?? []) {
    const rid = Number(p.reserva_quadra_id);
    if (!participantesByReserva.has(rid)) participantesByReserva.set(rid, []);
    participantesByReserva.get(rid)!.push(p);
  }

  // Shape data
  const unidades: UnidadePublica[] = (unidadesRaw ?? []).map((u) => ({
    id: u.id, nome: u.nome, tipo_unidade: u.tipo_unidade,
  }));
  const horarios: HorarioSemanal[] = (horariosRaw ?? []).map((h) => ({
    id: h.id, espaco_unidade_id: h.espaco_unidade_id,
    dia_semana: Number(h.dia_semana),
    hora_inicio: String(h.hora_inicio), hora_fim: String(h.hora_fim),
    ativo: Boolean(h.ativo),
  }));
  const reservas: ReservaPublica[] = (reservasRaw ?? []).map((r) => ({
    id: Number(r.id), espaco_unidade_id: r.espaco_unidade_id,
    inicio: String(r.inicio), fim: String(r.fim),
    partida_id: r.partida_id ?? null, torneio_id: r.torneio_id ?? null,
    participantes: (participantesByReserva.get(Number(r.id)) ?? []).map((p) => ({
      id: Number(p.id),
      profiles: Array.isArray(p.profiles) ? (p.profiles[0] ?? null) : (p.profiles ?? null),
    })),
  }));
  const planos: PlanoPublico[] = (planosRaw ?? []).map((p) => ({
    id: p.id, nome: p.nome, mensalidade_centavos: p.mensalidade_centavos,
  }));

  // Coordenadas do espaço
  const venueConfig = parseJsonRecord(espaco.venue_config_json);
  const espacoLat = parseCoord(espaco.lat) || parseCoord(venueConfig?.lat);
  const espacoLng = parseCoord(espaco.lng) || parseCoord(venueConfig?.lng);
  const temCoords = Number.isFinite(espacoLat) && Number.isFinite(espacoLng);

  const mapsHref = temCoords
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${espacoLat},${espacoLng}`)}`
    : espaco.localizacao
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(espaco.localizacao)}`
      : null;

  const cidadeUf = [espaco.cidade, espaco.uf].filter(Boolean).join(" – ");

  const formasPagamentoAceitas = Array.isArray(
    (espaco as Record<string, unknown>).formas_pagamento_aceitas
  )
    ? (espaco as Record<string, unknown>).formas_pagamento_aceitas as string[]
    : ["pix", "cartao", "boleto"];

  const temProfessores = (professores ?? []).some((p) => {
    const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    return Boolean(profile?.id);
  });
  const temTorneios = (torneios ?? []).length > 0;
  const temPlanos = (planosRaw ?? []).length > 0;
  const temUnidades = (unidadesRaw ?? []).length > 0;
  const descricao = espaco.descricao_longa || espaco.descricao_curta || null;

  return (
    <main data-eid-no-route-enter className={`${PROFILE_PUBLIC_MAIN_WIDE_CLASS} eid-progressive-enter space-y-4`}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border border-white/8 shadow-[0_20px_48px_-20px_rgba(15,23,42,0.65)]">

        {/* Capa */}
        <div className="relative h-36 bg-eid-surface/60 sm:h-52">
          {espaco.cover_arquivo ? (
            <Image src={espaco.cover_arquivo} alt="" fill unoptimized priority className="object-cover opacity-75" />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-900)_60%,transparent),color-mix(in_srgb,var(--eid-brand-ink)_80%,transparent))]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,29,46,0.1)_0%,rgba(11,29,46,0.85)_100%)]" />

          {/* Share no canto */}
          <div className="absolute right-3 top-3">
            <NativeShareButton
              title={`${espaco.nome_publico} no EsporteID`}
              text={descricao ?? "Veja este espaço no EsporteID"}
              path={`/espaco/${slug}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50"
            />
          </div>
        </div>

        {/* Corpo do hero */}
        <div className="bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_98%,var(--eid-primary-500)_2%),var(--eid-card))] px-4 pb-5 pt-0 sm:px-6">

          {/* Logo + nome — sobrepõe a capa */}
          <div className="-mt-10 flex items-end gap-4 sm:-mt-14">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-eid-card bg-eid-card shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] sm:h-24 sm:w-24">
              {espaco.logo_arquivo ? (
                <Image src={espaco.logo_arquivo} alt="" width={96} height={96} unoptimized className="max-h-full max-w-full object-contain p-2" />
              ) : (
                <span className="text-lg font-black text-eid-primary-400">
                  {(espaco.nome_publico ?? "E").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 pb-1">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-eid-primary-400">Espaço esportivo</p>
              <h1 className="mt-0.5 text-xl font-black leading-tight tracking-tight text-eid-fg sm:text-2xl">
                {espaco.nome_publico}
              </h1>
              {cidadeUf && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-eid-text-secondary">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  {cidadeUf}
                </p>
              )}
            </div>
          </div>

          {/* Badges de status */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Modo de reserva */}
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${
              isPago
                ? "border-eid-action-500/35 bg-eid-action-500/12 text-eid-action-300 eid-light:text-eid-action-600"
                : "border-emerald-500/35 bg-emerald-500/10 text-emerald-300 eid-light:text-emerald-700"
            }`}>
              {isPago ? "Reservas pagas" : "Reservas gratuitas p/ membros"}
            </span>

            {isMembroAtivo && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-300 eid-light:text-emerald-700">
                Você é membro ✓
              </span>
            )}

            {espaco.aceita_socios && !isMembroAtivo && (
              <span className="inline-flex items-center gap-1 rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2.5 py-1 text-[11px] font-bold text-eid-primary-300 eid-light:text-eid-primary-700">
                <Users className="h-3 w-3" />
                Aceitando sócios
              </span>
            )}

            {/* Distância via browser geolocation */}
            {temCoords && (
              <EspacoDistanceBadge lat={espacoLat} lng={espacoLng} />
            )}
          </div>

          {/* Botões de ação */}
          <div className="mt-4 flex flex-wrap gap-2">
            {espaco.whatsapp_contato && (
              <a
                href={`https://wa.me/${String(espaco.whatsapp_contato).replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 px-3.5 py-2 text-xs font-bold text-[#25D366] transition hover:bg-[#25D366]/15"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.107.547 4.083 1.5 5.8L0 24l6.388-1.473A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.782 9.782 0 01-4.98-1.362l-.357-.213-3.793.874.939-3.64-.233-.374A9.79 9.79 0 012.182 12C2.182 6.579 6.579 2.182 12 2.182c5.42 0 9.818 4.397 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/>
                </svg>
                WhatsApp
              </a>
            )}
            {mapsHref && (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-eid-primary-500/30 bg-eid-primary-500/10 px-3.5 py-2 text-xs font-bold text-eid-primary-300 transition hover:bg-eid-primary-500/15 eid-light:text-eid-primary-700"
              >
                <MapPin className="h-3.5 w-3.5" />
                Ver no mapa
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── GRADE DE HORÁRIOS ─────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-eid-primary-400" aria-hidden />
          <h2 className={PROFILE_SECTION_TITLE}>Grade de horários</h2>
        </div>
        {horarios.length > 0 ? (
          <>
            <p className="mb-3 text-[12px] text-eid-text-secondary">
              {isPago
                ? "Clique num horário livre para reservar e escolher a forma de pagamento."
                : isMembroAtivo
                  ? "Como membro, clique num horário livre para confirmar sua reserva gratuita."
                  : "Entre como membro para reservar horários gratuitos neste espaço."}
            </p>
            <EspacoGradePublica
              espacoId={espaco.id}
              slug={slug}
              unidades={unidades}
              horarios={horarios}
              reservas={reservas}
              modoReserva={modoReserva}
              isMembroAtivo={isMembroAtivo}
              isLogado={Boolean(user)}
              planos={planos}
              valorPadraoCentavos={reservaConfig.valorReservaPadraoCentavos ?? 0}
              semanaOffset={0}
              formasPagamentoAceitas={formasPagamentoAceitas}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-4 py-8 text-center">
            <CalendarDays className="mx-auto mb-2 h-8 w-8 text-eid-text-secondary/40" aria-hidden />
            <p className="text-sm font-bold text-eid-text-secondary">Grade de horários ainda não publicada.</p>
            {espaco.whatsapp_contato && (
              <a
                href={`https://wa.me/${String(espaco.whatsapp_contato).replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-2 text-xs font-bold text-[#25D366]"
              >
                Entrar em contato via WhatsApp
              </a>
            )}
          </div>
        )}
      </section>

      {/* ── SOBRE + ESTRUTURA ─────────────────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">

        {/* Sobre */}
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4 sm:p-5">
          <h2 className={`${PROFILE_SECTION_TITLE} mb-4`}>Sobre o espaço</h2>

          {descricao && (
            <p className="mb-4 text-sm leading-relaxed text-eid-text-secondary">{descricao}</p>
          )}

          <ul className="space-y-3">
            {espaco.localizacao && (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-eid-primary-400" aria-hidden />
                <span className="text-sm text-eid-fg">{espaco.localizacao}</span>
              </li>
            )}
            {espaco.whatsapp_contato && (
              <li>
                <a
                  href={`https://wa.me/${String(espaco.whatsapp_contato).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 text-sm font-medium text-eid-fg transition hover:text-[#25D366]"
                >
                  <Phone className="h-4 w-4 shrink-0 text-eid-primary-400" aria-hidden />
                  {espaco.whatsapp_contato}
                </a>
              </li>
            )}
            {espaco.email_contato && (
              <li>
                <a
                  href={`mailto:${espaco.email_contato}`}
                  className="flex items-center gap-2.5 text-sm font-medium text-eid-fg transition hover:text-eid-primary-300"
                >
                  <Mail className="h-4 w-4 shrink-0 text-eid-primary-400" aria-hidden />
                  {espaco.email_contato}
                </a>
              </li>
            )}
            {espaco.website_url && (
              <li>
                <a
                  href={espaco.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 text-sm font-medium text-eid-primary-300 transition hover:text-eid-primary-200 eid-light:text-eid-primary-600"
                >
                  <Globe className="h-4 w-4 shrink-0 text-eid-primary-400" aria-hidden />
                  Site oficial
                </a>
              </li>
            )}
            {espaco.instagram_url && (
              <li>
                <a
                  href={espaco.instagram_url.startsWith("http") ? espaco.instagram_url : `https://instagram.com/${espaco.instagram_url.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 text-sm font-medium text-eid-fg transition hover:text-pink-400"
                >
                  <svg className="h-4 w-4 shrink-0 text-eid-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                  {espaco.instagram_url.startsWith("http")
                    ? "@" + espaco.instagram_url.split("/").filter(Boolean).pop()
                    : espaco.instagram_url}
                </a>
              </li>
            )}
          </ul>

          {!descricao && !espaco.localizacao && !espaco.whatsapp_contato && !espaco.email_contato && (
            <p className="text-sm text-eid-text-secondary">Informações de contato ainda não publicadas.</p>
          )}
        </div>

        {/* Estrutura */}
        <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4 sm:p-5">
          <h2 className={`${PROFILE_SECTION_TITLE} mb-4`}>Estrutura</h2>
          {temUnidades ? (
            <div className="space-y-2">
              {(unidadesRaw ?? []).map((u) => {
                const tags: string[] = [];
                if (u.superficie && SUPERFICIE_LABEL[u.superficie]) tags.push(SUPERFICIE_LABEL[u.superficie]);
                if (u.coberta) tags.push("Coberta");
                if (u.indoor) tags.push("Indoor");
                if (u.iluminacao) tags.push("Com iluminação");

                return (
                  <div
                    key={u.id}
                    className="flex items-start gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3"
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-eid-primary-500/12 text-eid-primary-300">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="12" y1="3" x2="12" y2="21" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-eid-fg">{u.nome}</p>
                      {u.tipo_unidade && (
                        <p className="text-[11px] capitalize text-eid-text-secondary">{u.tipo_unidade}</p>
                      )}
                      {tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-2 py-0.5 text-[10px] font-semibold text-eid-text-secondary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {u.status_operacao && u.status_operacao !== "ativa" && (
                      <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-400">
                        {u.status_operacao}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-eid-text-secondary">Quadras e instalações ainda sendo publicadas.</p>
          )}
        </div>
      </section>

      {/* ── PLANOS DE SÓCIO ───────────────────────────────────────────────── */}
      {temPlanos && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-eid-primary-400" aria-hidden />
            <h2 className={PROFILE_SECTION_TITLE}>Planos de sócio</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(planosRaw ?? []).map((plano) => {
              const mensalidadeStr = moeda(plano.mensalidade_centavos);
              const reservasGratis = planoHerdaRegra(plano, "reservas_gratuitas_semana")
                ? null
                : Number(plano.reservas_gratuitas_semana ?? 0) === 0
                  ? "Reservas ilimitadas"
                  : `${Number(plano.reservas_gratuitas_semana)} reserva(s)/semana`;
              const desconto = Number(plano.percentual_desconto_avulso ?? 0);

              return (
                <div
                  key={plano.id}
                  className="flex flex-col rounded-2xl border border-eid-primary-500/20 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_97%,var(--eid-primary-500)_3%),var(--eid-card))] p-4 shadow-[0_4px_20px_-8px_rgba(37,99,235,0.15)]"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-primary-400">Plano</p>
                  <p className="mt-1 text-base font-black text-eid-fg">{plano.nome}</p>
                  <p className="mt-2 text-2xl font-black text-eid-action-300 eid-light:text-eid-action-600">
                    {mensalidadeStr}
                    <span className="text-sm font-semibold text-eid-text-secondary">/mês</span>
                  </p>
                  {plano.descricao && (
                    <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">{plano.descricao}</p>
                  )}
                  {(reservasGratis || desconto > 0) && (
                    <ul className="mt-3 space-y-1 border-t border-[color:var(--eid-border-subtle)] pt-3">
                      {reservasGratis && (
                        <li className="flex items-center gap-1.5 text-[11px] text-eid-fg">
                          <span className="text-emerald-400">✓</span>
                          {reservasGratis}
                        </li>
                      )}
                      {desconto > 0 && (
                        <li className="flex items-center gap-1.5 text-[11px] text-eid-fg">
                          <span className="text-emerald-400">✓</span>
                          {(desconto * 100).toFixed(0)}% desconto em reservas avulsas
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── PROFESSORES + TORNEIOS ───────────────────────────────────────── */}
      {(temProfessores || temTorneios) && (
        <section className="grid gap-4 lg:grid-cols-2">
          {temProfessores && (
            <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4 sm:p-5">
              <h2 className={`${PROFILE_SECTION_TITLE} mb-4`}>Professores parceiros</h2>
              <div className="space-y-2">
                {(professores ?? []).map((item) => {
                  const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                  if (!profile?.id) return null;
                  return (
                    <Link
                      key={item.id}
                      href={`/professor/${profile.id}`}
                      className="flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3 transition hover:border-eid-primary-500/30 hover:bg-eid-primary-500/5"
                    >
                      {profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt=""
                          width={40}
                          height={40}
                          unoptimized
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-eid-primary-500/20"
                        />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-eid-primary-500/15 text-sm font-black text-eid-primary-300">
                          {(profile.nome ?? "P").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-eid-fg">{profile.nome ?? "Professor"}</p>
                        <p className="text-[11px] text-eid-text-secondary">Professor parceiro</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {temTorneios && (
            <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-4 w-4 shrink-0 text-eid-primary-400" aria-hidden />
                <h2 className={PROFILE_SECTION_TITLE}>Torneios neste espaço</h2>
              </div>
              <div className="space-y-2">
                {(torneios ?? []).map((torneio) => {
                  const dataFmt = torneio.data_inicio
                    ? new Date(torneio.data_inicio).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "short", year: "numeric",
                      })
                    : null;
                  const statusColor =
                    torneio.status === "em_andamento" ? "text-emerald-400" :
                    torneio.status === "encerrado" ? "text-eid-text-secondary" :
                    "text-eid-primary-300";
                  return (
                    <Link
                      key={torneio.id}
                      href={`/torneios/${torneio.id}?from=/espaco/${slug}`}
                      className="flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3 transition hover:border-eid-action-500/30 hover:bg-eid-action-500/5"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-eid-action-500/12 text-eid-action-300">
                        <Trophy className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-eid-fg">{torneio.nome}</p>
                        <p className={`text-[11px] capitalize ${statusColor}`}>
                          {torneio.status?.replace("_", " ")}{dataFmt ? ` · ${dataFmt}` : ""}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

    </main>
  );
}
