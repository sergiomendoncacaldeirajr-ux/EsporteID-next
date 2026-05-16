import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NativeShareButton } from "@/components/native/native-share-button";
import { ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { PROFILE_CARD_BASE, PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_WIDE_CLASS } from "@/components/perfil/profile-ui-tokens";
import { EspacoGradePublica } from "@/components/espaco/espaco-grade-publica";
import type { ReservaPublica, HorarioSemanal, UnidadePublica, PlanoPublico } from "@/components/espaco/espaco-grade-publica";
import { createClient } from "@/lib/supabase/server";
import { normalizeEspacoReservaConfig } from "@/lib/espacos/config";
import { distanciaKm } from "@/lib/geo/distance-km";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ semana?: string }>;
};

function parseCoord(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return NaN;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function planoHerdaRegra(plano: { beneficios_json?: unknown }, key: string) {
  const beneficios = plano.beneficios_json;
  if (!beneficios || typeof beneficios !== "object" || Array.isArray(beneficios)) return false;
  const herdar = (beneficios as Record<string, unknown>).herdar_regras_globais;
  return Boolean(
    herdar &&
      typeof herdar === "object" &&
      !Array.isArray(herdar) &&
      (herdar as Record<string, unknown>)[key] === true
  );
}

/** Monday of the week containing the given date (ISO week Mon=first). */
function getWeekBounds(dateStr?: string): { inicio: Date; fim: Date } {
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

export default async function EspacoPublicLandingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const semana = sp.semana;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        .from("espaco_socios")
        .select("id, status")
        .eq("espaco_generico_id", espaco.id)
        .eq("usuario_id", user.id)
        .maybeSingle()
    : { data: null };
  const isMembroAtivo = String(membership?.status ?? "") === "ativo";

  const { data: profileLocation } = user
    ? await supabase.from("profiles").select("lat, lng").eq("id", user.id).maybeSingle()
    : { data: null };

  const weekBounds = getWeekBounds(semana);

  const [
    { data: unidadesRaw },
    { data: planosRaw },
    { data: horariosRaw },
    { data: reservasRaw },
    { data: professores },
    { data: torneios },
  ] = await Promise.all([
    supabase
      .from("espaco_unidades")
      .select("id, nome, tipo_unidade, superficie, coberta, indoor, iluminacao, status_operacao, esporte_id")
      .eq("espaco_generico_id", espaco.id)
      .eq("ativo", true)
      .order("ordem", { ascending: true }),
    supabase
      .from("espaco_planos_socio")
      .select("id, nome, descricao, mensalidade_centavos, reservas_gratuitas_semana, percentual_desconto_avulso, beneficios_json")
      .eq("espaco_generico_id", espaco.id)
      .eq("ativo", true)
      .order("ordem", { ascending: true }),
    supabase
      .from("espaco_horarios_semanais")
      .select("id, espaco_unidade_id, dia_semana, hora_inicio, hora_fim, ativo")
      .eq("espaco_generico_id", espaco.id)
      .eq("ativo", true)
      .order("dia_semana", { ascending: true })
      .order("hora_inicio", { ascending: true }),
    supabase
      .from("reservas_quadra")
      .select("id, espaco_unidade_id, inicio, fim, status_reserva, partida_id, torneio_id")
      .eq("espaco_generico_id", espaco.id)
      .in("status_reserva", ["confirmada", "agendada"])
      .gte("inicio", weekBounds.inicio.toISOString())
      .lte("fim", weekBounds.fim.toISOString())
      .order("inicio", { ascending: true }),
    supabase
      .from("professor_locais")
      .select("id, professor_id, status_vinculo, profiles(id, nome, avatar_url)")
      .eq("espaco_id", espaco.id)
      .eq("status_vinculo", "ativo")
      .limit(6),
    supabase
      .from("torneios")
      .select("id, nome, status, data_inicio")
      .eq("espaco_generico_id", espaco.id)
      .order("data_inicio", { ascending: true })
      .limit(6),
  ]);

  // Fetch participants for reservas
  const reservaIds = (reservasRaw ?? []).map((r) => r.id);
  const { data: participantesRaw } = reservaIds.length
    ? await supabase
        .from("espaco_reserva_participantes")
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

  // Shape data for the grade component
  const unidades: UnidadePublica[] = (unidadesRaw ?? []).map((u) => ({
    id: u.id,
    nome: u.nome,
    tipo_unidade: u.tipo_unidade,
  }));

  const horarios: HorarioSemanal[] = (horariosRaw ?? []).map((h) => ({
    id: h.id,
    espaco_unidade_id: h.espaco_unidade_id,
    dia_semana: Number(h.dia_semana),
    hora_inicio: String(h.hora_inicio),
    hora_fim: String(h.hora_fim),
    ativo: Boolean(h.ativo),
  }));

  const reservas: ReservaPublica[] = (reservasRaw ?? []).map((r) => ({
    id: Number(r.id),
    espaco_unidade_id: r.espaco_unidade_id,
    inicio: String(r.inicio),
    fim: String(r.fim),
    partida_id: r.partida_id ?? null,
    torneio_id: r.torneio_id ?? null,
    participantes: (participantesByReserva.get(Number(r.id)) ?? []).map((p) => ({
      id: Number(p.id),
      profiles: Array.isArray(p.profiles) ? (p.profiles[0] ?? null) : (p.profiles ?? null),
    })),
  }));

  const planos: PlanoPublico[] = (planosRaw ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    mensalidade_centavos: p.mensalidade_centavos,
  }));

  // Distance
  const venueConfig = parseJsonRecord(espaco.venue_config_json);
  const espacoLat = Number.isFinite(parseCoord(espaco.lat)) ? parseCoord(espaco.lat) : parseCoord(venueConfig?.lat);
  const espacoLng = Number.isFinite(parseCoord(espaco.lng)) ? parseCoord(espaco.lng) : parseCoord(venueConfig?.lng);
  const userLat = parseCoord(profileLocation?.lat);
  const userLng = parseCoord(profileLocation?.lng);
  const distancia =
    Number.isFinite(userLat) && Number.isFinite(userLng) && Number.isFinite(espacoLat) && Number.isFinite(espacoLng)
      ? distanciaKm(userLat, userLng, espacoLat, espacoLng)
      : null;
  const distanciaLabel =
    distancia != null && Number.isFinite(distancia) && distancia < 9000
      ? `${distancia.toFixed(1).replace(".", ",")} km de você`
      : null;

  const mapsHref =
    Number.isFinite(espacoLat) && Number.isFinite(espacoLng)
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${espacoLat},${espacoLng}`)}`
      : espaco.localizacao
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(espaco.localizacao)}`
        : null;

  const unidadePrincipal = unidadesRaw?.[0] ?? null;

  return (
    <main data-eid-no-route-enter className={`${PROFILE_PUBLIC_MAIN_WIDE_CLASS} eid-progressive-enter`}>
      {/* Hero */}
      <section className={`${PROFILE_HERO_PANEL_CLASS} mt-2 overflow-hidden border border-eid-primary-500/25 p-0`}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eid-primary-500/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-eid-action-500/12 blur-3xl" aria-hidden />
        <div className="relative">
          <div className="relative min-h-[118px] overflow-hidden bg-eid-surface/60 sm:min-h-[170px]">
            {espaco.cover_arquivo ? (
              <Image src={espaco.cover_arquivo} alt="" fill unoptimized priority className="object-cover opacity-80" />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,29,46,0.16),rgba(11,29,46,0.94))]" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-eid-card/95 shadow-xl sm:h-20 sm:w-20">
                {espaco.logo_arquivo ? (
                  <Image src={espaco.logo_arquivo} alt="" width={96} height={96} unoptimized className="max-h-full max-w-full object-contain p-2" />
                ) : (
                  <span className="text-xs font-black text-eid-primary-300/60">EID</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-primary-200">Espaço esportivo</p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-white sm:text-3xl">{espaco.nome_publico}</h1>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <p className="text-sm leading-relaxed text-eid-text-secondary">
              {espaco.descricao_curta || espaco.descricao_longa || "Estrutura esportiva pronta para reservas, sócios, professores e eventos."}
            </p>

            {/* Info cards */}
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-eid-primary-500/25 bg-eid-primary-500/10 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-eid-primary-200">Localização</p>
                <p className="mt-1 text-sm font-black text-eid-fg">
                  {[espaco.cidade, espaco.uf].filter(Boolean).join(" - ") || espaco.localizacao || "Sob consulta"}
                </p>
                {distanciaLabel && <p className="mt-1 text-xs font-bold text-eid-action-300">{distanciaLabel}</p>}
              </div>
              <div className={`rounded-2xl border p-3 ${isPago ? "border-eid-action-500/25 bg-eid-action-500/8" : "border-emerald-500/25 bg-emerald-500/8"}`}>
                <p className="text-[10px] font-black uppercase tracking-wide text-eid-text-secondary">Reservas</p>
                <p className={`mt-1 text-sm font-black ${isPago ? "text-eid-action-300" : "text-emerald-300"}`}>
                  {isPago ? "Pagas" : "Gratuitas"}
                </p>
                <p className="mt-0.5 text-[10px] text-eid-text-secondary">
                  {isPago ? "Pague por slot" : "Grátis p/ membros"}
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-eid-text-secondary">Sócios</p>
                <p className={`mt-1 text-sm font-black ${espaco.aceita_socios ? "text-eid-action-300" : "text-eid-fg"}`}>
                  {espaco.aceita_socios ? "Aceitando" : "Fechado"}
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-eid-text-secondary">Estrutura</p>
                <p className="mt-1 text-sm font-black text-eid-fg">
                  {(unidadesRaw ?? []).length ? `${(unidadesRaw ?? []).length} unidade(s)` : espaco.tipo_quadra ?? "A publicar"}
                </p>
              </div>
            </div>

            {/* Tags + ações */}
            <div className="mt-4 flex flex-wrap gap-2">
              {isMembroAtivo && (
                <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Você é membro
                </span>
              )}
              {espaco.aceita_socios && !isMembroAtivo && (
                <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-3 py-1 text-xs font-semibold text-eid-action-400">
                  Aceitando sócios
                </span>
              )}
              <NativeShareButton
                title={`${espaco.nome_publico} no EsporteID`}
                text="Veja este espaço no EsporteID"
                path={`/espaco/${slug}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-3 py-1.5 text-xs font-semibold text-eid-fg transition hover:border-eid-primary-500/45 hover:bg-eid-primary-500/10"
              />
              {mapsHref && (
                <a href={mapsHref} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1.5 text-xs font-semibold text-eid-primary-200 transition hover:bg-eid-primary-500/15">
                  Abrir mapa
                </a>
              )}
            </div>

            <div className="mt-3 space-y-1 text-sm text-eid-text-secondary">
              {espaco.localizacao && <p>{espaco.localizacao}</p>}
              {espaco.whatsapp_contato && <p>WhatsApp: {espaco.whatsapp_contato}</p>}
              {espaco.email_contato && <p>E-mail: {espaco.email_contato}</p>}
              {espaco.website_url && (
                <a href={espaco.website_url} target="_blank" rel="noreferrer" className="inline-flex text-eid-primary-300 underline">
                  Site oficial
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Grade de horários pública */}
      <section className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-primary-400">Grade de horários</h2>
        </div>
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
          formasPagamentoAceitas={
            Array.isArray((espaco as Record<string, unknown>).formas_pagamento_aceitas)
              ? (espaco as Record<string, unknown>).formas_pagamento_aceitas as string[]
              : ["pix", "cartao", "boleto"]
          }
        />
      </section>

      {/* Info: Estrutura + Planos */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className={`${PROFILE_CARD_BASE} p-4 sm:p-5`}>
          <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-primary-400">Estrutura</h2>
          <div className="mt-4 space-y-2">
            {(unidadesRaw ?? []).length ? (
              (unidadesRaw ?? []).map((unidade) => (
                <div key={unidade.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                  <p className="text-sm font-semibold text-eid-fg">{unidade.nome}</p>
                  <p className="mt-1 text-xs text-eid-text-secondary">
                    {unidade.tipo_unidade} · {unidade.superficie ?? "superfície não informada"} · {unidade.status_operacao}
                  </p>
                  <p className="mt-1 text-[11px] text-eid-text-secondary">
                    {unidade.coberta ? "Coberta" : "Descoberta"} · {unidade.indoor ? "Indoor" : "Outdoor"} ·{" "}
                    {unidade.iluminacao ? "Com iluminação" : "Sem iluminação"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-eid-text-secondary">As quadras ainda estão sendo publicadas.</p>
            )}
          </div>
        </div>

        <div className={`${PROFILE_CARD_BASE} p-4 sm:p-5`}>
          <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-primary-400">Planos de sócio</h2>
          <div className="mt-4 space-y-2">
            {(planosRaw ?? []).length ? (
              (planosRaw ?? []).map((plano) => (
                <div key={plano.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                  <p className="text-sm font-semibold text-eid-fg">{plano.nome}</p>
                  <p className="mt-1 text-xs text-eid-text-secondary">
                    R$ {((Number(plano.mensalidade_centavos ?? 0) || 0) / 100).toFixed(2).replace(".", ",")} / mês
                  </p>
                  <p className="mt-1 text-[11px] text-eid-text-secondary">
                    {planoHerdaRegra(plano, "reservas_gratuitas_semana")
                      ? "Segue regra global de reservas grátis"
                      : Number(plano.reservas_gratuitas_semana ?? 0) === 0
                        ? "Reservas grátis ilimitadas"
                        : `${Number(plano.reservas_gratuitas_semana ?? 0)} reserva(s) grátis por semana`}{" "}
                    · desconto avulso {Number(plano.percentual_desconto_avulso ?? 0) * 100}%
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-eid-text-secondary">O espaço ainda não publicou planos de associação.</p>
            )}
          </div>
        </div>
      </section>

      {/* Professores + Torneios */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className={`${PROFILE_CARD_BASE} p-4 sm:p-5`}>
          <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-primary-400">Professores parceiros</h2>
          <div className="mt-4 space-y-2">
            {(professores ?? []).length ? (
              (professores ?? []).map((item) => {
                const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                return profile?.id ? (
                  <Link key={item.id} href={`/professor/${profile.id}`} className="flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                    {profile.avatar_url ? (
                      <Image src={profile.avatar_url} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-eid-primary-500/15 text-xs font-bold text-eid-primary-300">
                        {(profile.nome ?? "P").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-eid-fg">{profile.nome ?? "Professor"}</p>
                      <p className="text-xs text-eid-text-secondary">Vinculado ao espaço</p>
                    </div>
                  </Link>
                ) : null;
              })
            ) : (
              <p className="text-sm text-eid-text-secondary">Nenhum professor parceiro publicado ainda.</p>
            )}
          </div>
        </div>

        <div className={`${PROFILE_CARD_BASE} p-4 sm:p-5`}>
          <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-primary-400">Torneios neste espaço</h2>
          <div className="mt-4 space-y-2">
            {(torneios ?? []).length ? (
              (torneios ?? []).map((torneio) => (
                <Link key={torneio.id} href={`/torneios/${torneio.id}?from=/espaco/${slug}`} className="block rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3">
                  <p className="text-sm font-semibold text-eid-fg">{torneio.nome}</p>
                  <p className="mt-1 text-xs text-eid-text-secondary">{torneio.status} · {torneio.data_inicio ?? "sem data"}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-eid-text-secondary">Nenhum torneio vinculado a este espaço ainda.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
