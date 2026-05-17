import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { NativeShareButton } from "@/components/native/native-share-button";
import { PROFILE_PUBLIC_MAIN_WIDE_CLASS } from "@/components/perfil/profile-ui-tokens";
import { EspacoPublicProfileTabs } from "@/components/espaco/espaco-public-profile-tabs";
import type { ReservaPublica, HorarioSemanal, UnidadePublica, PlanoPublico } from "@/components/espaco/espaco-grade-publica";
import { EspacoDistanceBadge } from "@/components/espaco/espaco-distance-badge";
import { createClient } from "@/lib/supabase/server";
import { normalizeEspacoAssociacaoConfig } from "@/lib/espacos/associacao-config";
import { normalizeEspacoReservaConfig } from "@/lib/espacos/config";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ semana?: string; tab?: "reservas" | "torneios" | "professores" | "sobre" }>;
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
      "id, slug, nome_publico, descricao_curta, descricao_longa, localizacao, cidade, uf, logo_arquivo, cover_arquivo, whatsapp_contato, email_contato, website_url, instagram_url, aceita_socios, ativo_listagem, tipo_quadra, aceita_reserva, esportes_ids, configuracao_reservas_json, modo_reserva, lat, lng, venue_config_json, entrada_membro_modo, entrada_membro_descricao, associacao_regra_json, formas_pagamento_aceitas"
    )
    .eq("slug", slug)
    .eq("ativo_listagem", true)
    .eq("admin_suspenso", false)
    .maybeSingle();
  if (!espaco) notFound();

  const reservaConfig = normalizeEspacoReservaConfig(espaco.configuracao_reservas_json);
  const associacaoConfig = normalizeEspacoAssociacaoConfig(espaco.associacao_regra_json);
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
    { count: sociosAtivosCount },
  ] = await Promise.all([
    supabase.from("espaco_unidades")
      .select("id, nome, tipo_unidade, logo_arquivo, superficie, coberta, indoor, iluminacao, status_operacao, esporte_id")
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
    supabase
      .from("espaco_socios")
      .select("id", { count: "exact", head: true })
      .eq("espaco_generico_id", espaco.id)
      .eq("status", "ativo"),
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
    id: u.id,
    nome: u.nome,
    tipo_unidade: u.tipo_unidade,
    logo_arquivo: (u as { logo_arquivo?: string | null }).logo_arquivo ?? null,
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

  const initialTab = sp.tab ?? "reservas";
  const sociosAtivos = Number(sociosAtivosCount ?? 0);

  const descricao = espaco.descricao_longa || espaco.descricao_curta || null;

  return (
    <main data-eid-no-route-enter className={`${PROFILE_PUBLIC_MAIN_WIDE_CLASS} eid-progressive-enter space-y-4`}>

      {/* ── HERO / PERFIL — espaço como perfil social ─────────────────── */}
      <section className="overflow-hidden rounded-[28px] border border-eid-primary-500/20 bg-eid-card/95 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.72)] eid-light:border-eid-primary-500/15 eid-light:bg-white eid-light:shadow-[0_22px_48px_-30px_rgba(15,23,42,0.16)]">

        {/* Foto full-bleed com logo + nome sobrepostos */}
        <div className="relative min-h-[220px] sm:min-h-[260px]">
          {espaco.cover_arquivo ? (
            <Image src={espaco.cover_arquivo} alt="" fill unoptimized priority className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(140deg,var(--eid-brand-ink),color-mix(in_srgb,var(--eid-primary-500)_22%,var(--eid-brand-ink)),#080d13)]" />
          )}
          {/* Gradiente de baixo para cima */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,29,46,0.08)_0%,rgba(11,29,46,0.92)_100%)]" />

          {/* Share button */}
          <div className="absolute right-3 top-3 flex gap-2">
            <NativeShareButton
              title={`${espaco.nome_publico} no EsporteID`}
              text={descricao ?? "Veja este espaço no EsporteID"}
              path={`/espaco/${slug}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50"
            />
          </div>

          {/* Logo + badge + nome — sobrepostos na foto, alinhados à esquerda/baixo */}
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <div className="flex flex-wrap items-end gap-3">
              {/* Logo */}
              <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-eid-surface/90 shadow-xl">
                {espaco.logo_arquivo ? (
                  <Image src={espaco.logo_arquivo} alt="" fill unoptimized className="object-contain p-2" />
                ) : (
                  <span className="text-2xl font-black text-eid-primary-300">
                    {(espaco.nome_publico ?? "E").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Nome + localização */}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white/80 backdrop-blur-sm">
                    Espaço esportivo
                  </span>
                  {isMembroAtivo && (
                    <span className="rounded-full border border-emerald-500/50 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-black text-emerald-200 backdrop-blur-sm">
                      Você é membro ✓
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
                  {espaco.nome_publico}
                </h1>
                {(cidadeUf || espaco.localizacao) && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white/75">
                    <MapPin className="h-4 w-4 shrink-0 text-eid-primary-200" aria-hidden />
                    {cidadeUf || espaco.localizacao}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65 eid-light:text-eid-primary-400">Perfil do espaço</p>
              <p className="mt-1 text-sm font-medium text-white/75 eid-light:text-eid-text-secondary">
                {isPago ? "Reserve horários e acompanhe torneios e aulas no local." : "Entre no espaço, acompanhe aulas e libere reservas com aprovação."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${
              isPago
                ? "border-eid-action-500/35 bg-eid-action-500/12 text-eid-action-300 eid-light:text-eid-action-600"
                : "border-emerald-500/35 bg-emerald-500/10 text-emerald-300 eid-light:text-emerald-700"
            }`}>
              {isPago ? "Reserva paga" : "Por associação"}
            </span>
            {temCoords ? <EspacoDistanceBadge lat={espacoLat} lng={espacoLng} /> : null}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-center backdrop-blur-sm eid-light:border-slate-200 eid-light:bg-slate-50/95">
              <p className="text-lg font-black text-white eid-light:text-eid-fg">{sociosAtivos}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/70 eid-light:text-eid-text-secondary">Membros</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-center backdrop-blur-sm eid-light:border-slate-200 eid-light:bg-slate-50/95">
              <p className="text-lg font-black text-white eid-light:text-eid-fg">{unidades.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/70 eid-light:text-eid-text-secondary">Quadras</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 px-3 py-3 text-center backdrop-blur-sm eid-light:border-slate-200 eid-light:bg-slate-50/95">
              <p className="text-lg font-black text-white eid-light:text-eid-fg">{(torneios ?? []).length}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/70 eid-light:text-eid-text-secondary">Torneios</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/espaco/${slug}?tab=${isPago ? "reservas" : "professores"}`}
              className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-black transition ${
                isPago
                  ? "bg-eid-action-500 text-white hover:bg-eid-action-600"
                  : "bg-eid-primary-500 text-white hover:bg-eid-primary-600"
              }`}
            >
              {isPago ? "Reservar agora" : isMembroAtivo ? "Reservar como membro" : "Solicitar entrada / virar sócio"}
            </Link>
            {espaco.whatsapp_contato ? (
              <a
                href={`https://wa.me/${String(espaco.whatsapp_contato).replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 px-3.5 py-2 text-xs font-bold text-[#25D366] transition hover:bg-[#25D366]/15"
              >
                WhatsApp
              </a>
            ) : null}
            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/15 px-3.5 py-2 text-xs font-bold text-white/85 transition hover:bg-black/25"
              >
                Mapa
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <EspacoPublicProfileTabs
        initialTab={initialTab}
        espacoId={espaco.id}
        slug={slug}
        modoReserva={modoReserva}
        isMembroAtivo={isMembroAtivo}
        isLogado={Boolean(user)}
        aceitaSocios={Boolean(espaco.aceita_socios)}
        associacaoRegra={associacaoConfig}
        horarios={horarios}
        unidades={unidades}
        unidadesResumo={(unidadesRaw ?? []).map((u) => {
          const tags: string[] = [];
          if (u.superficie && SUPERFICIE_LABEL[u.superficie]) tags.push(SUPERFICIE_LABEL[u.superficie]);
          if (u.coberta) tags.push("Coberta");
          if (u.indoor) tags.push("Indoor");
          if (u.iluminacao) tags.push("Iluminação");
          return {
            id: u.id,
            nome: u.nome,
            tipo: u.tipo_unidade,
            tags,
          };
        })}
        reservas={reservas}
        planos={planos}
        valorPadraoCentavos={reservaConfig.valorReservaPadraoCentavos ?? 0}
        formasPagamentoAceitas={formasPagamentoAceitas}
        professores={(professores ?? []).flatMap((item) => {
          const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          if (!profile?.id) return [];
          return [{
            id: profile.id,
            nome: profile.nome ?? "Professor",
            avatarUrl: profile.avatar_url ?? null,
          }];
        })}
        torneios={(torneios ?? []).map((torneio) => ({
          id: torneio.id,
          nome: torneio.nome,
          status: torneio.status ?? null,
          dataFmt: torneio.data_inicio
            ? new Date(torneio.data_inicio).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : null,
          href: `/torneios/${torneio.id}?from=/espaco/${slug}`,
        }))}
        descricao={descricao}
        localizacao={espaco.localizacao}
        whatsappContato={espaco.whatsapp_contato}
        emailContato={espaco.email_contato}
        websiteUrl={espaco.website_url}
        instagramUrl={espaco.instagram_url ?? null}
      />

    </main>
  );
}
