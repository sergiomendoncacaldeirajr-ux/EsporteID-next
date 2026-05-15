import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EspacoPublicAddReservaAtalhoForm,
  EspacoPublicJoinForm,
  EspacoPublicReservaForm,
  EspacoPublicWaitlistForm,
} from "@/components/espaco/espaco-public-cta";
import { NativeShareButton } from "@/components/native/native-share-button";
import { ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { PROFILE_CARD_BASE, PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_WIDE_CLASS } from "@/components/perfil/profile-ui-tokens";
import { createClient } from "@/lib/supabase/server";
import { normalizeEspacoAssociacaoConfig } from "@/lib/espacos/associacao-config";
import { normalizeEspacoReservaConfig } from "@/lib/espacos/config";
import { distanciaKm } from "@/lib/geo/distance-km";

type Props = {
  params: Promise<{ slug: string }>;
};

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

export default async function EspacoPublicLandingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: espaco } = await supabase
    .from("espacos_genericos")
    .select(
      "id, slug, nome_publico, descricao_curta, descricao_longa, localizacao, cidade, uf, logo_arquivo, cover_arquivo, whatsapp_contato, email_contato, website_url, instagram_url, aceita_socios, ativo_listagem, tipo_quadra, aceita_reserva, esportes_ids, configuracao_reservas_json, associacao_regra_json, modo_reserva, lat, lng, venue_config_json"
    )
    .eq("slug", slug)
    .eq("ativo_listagem", true)
    .eq("admin_suspenso", false)
    .maybeSingle();
  if (!espaco) notFound();
  const regraAssociacao = normalizeEspacoAssociacaoConfig(espaco.associacao_regra_json);
  const reservaConfig = normalizeEspacoReservaConfig(espaco.configuracao_reservas_json);
  const acessoPublicoPago = String(espaco.modo_reserva ?? "").toLowerCase() === "paga";
  const permiteFilaGratuita = String(espaco.modo_reserva ?? "").toLowerCase() !== "paga";
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

  const [
    { data: unidades },
    { data: planos },
    { data: horarios },
    { data: reservas },
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
      .select("id, dia_semana, hora_inicio, hora_fim")
      .eq("espaco_generico_id", espaco.id)
      .eq("ativo", true)
      .order("dia_semana", { ascending: true }),
    supabase
      .from("reservas_quadra")
      .select("id, espaco_unidade_id, inicio, fim, status_reserva, tipo_reserva")
      .eq("espaco_generico_id", espaco.id)
      .in("status_reserva", ["confirmada", "agendada"])
      .gte("fim", new Date().toISOString())
      .order("inicio", { ascending: true })
      .limit(6),
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

  const reservaIds = (reservas ?? []).map((item) => item.id);
  const { data: participantes } = reservaIds.length
    ? await supabase
        .from("espaco_reserva_participantes")
        .select("id, reserva_quadra_id, papel, profiles(id, nome, avatar_url)")
        .in("reserva_quadra_id", reservaIds)
    : { data: [] };
  type ReservaParticipante = NonNullable<typeof participantes>[number];
  const participantesByReserva = new Map<number, ReservaParticipante[]>();
  for (const item of participantes ?? []) {
    const reservaId = Number(item.reserva_quadra_id ?? 0);
    if (!participantesByReserva.has(reservaId)) participantesByReserva.set(reservaId, []);
    participantesByReserva.get(reservaId)?.push(item);
  }

  const unidadePrincipal = unidades?.[0] ?? null;
  const venueConfig = (espaco.venue_config_json ?? null) as Record<string, unknown> | null;
  const espacoLat = Number(espaco.lat ?? venueConfig?.lat ?? NaN);
  const espacoLng = Number(espaco.lng ?? venueConfig?.lng ?? NaN);
  const userLat = Number(profileLocation?.lat ?? NaN);
  const userLng = Number(profileLocation?.lng ?? NaN);
  const distancia =
    Number.isFinite(userLat) && Number.isFinite(userLng) && Number.isFinite(espacoLat) && Number.isFinite(espacoLng)
      ? distanciaKm(userLat, userLng, espacoLat, espacoLng)
      : null;
  const distanciaLabel =
    distancia != null && Number.isFinite(distancia) && distancia < 9000
      ? `${distancia.toFixed(1).replace(".", ",")} km`
      : null;
  const mapsHref =
    Number.isFinite(espacoLat) && Number.isFinite(espacoLng)
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${espacoLat},${espacoLng}`)}`
      : espaco.localizacao
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(espaco.localizacao)}`
        : null;

  return (
    <main data-eid-no-route-enter className={`${PROFILE_PUBLIC_MAIN_WIDE_CLASS} eid-progressive-enter`}>
        <section
          className={`${PROFILE_HERO_PANEL_CLASS} mt-2 overflow-hidden border border-eid-primary-500/25 p-0`}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eid-primary-500/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-eid-action-500/12 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <div className="relative min-h-[118px] overflow-hidden bg-eid-surface/60 sm:min-h-[170px]">
              {espaco.cover_arquivo ? (
                <Image
                  src={espaco.cover_arquivo}
                  alt=""
                  fill
                  unoptimized
                  priority
                  className="object-cover opacity-80"
                />
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
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-eid-primary-200">
                    Espaço público
                  </p>
                  <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {espaco.nome_publico}
                  </h1>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-sm leading-relaxed text-eid-text-secondary">
                {espaco.descricao_curta ||
                  espaco.descricao_longa ||
                  "Estrutura esportiva pronta para reservas, sócios, professores e eventos."}
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-eid-primary-500/25 bg-eid-primary-500/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-eid-primary-200">Localização</p>
                  <p className="mt-1 text-sm font-black text-eid-fg">
                    {[espaco.cidade, espaco.uf].filter(Boolean).join(" - ") || espaco.localizacao || "Sob consulta"}
                  </p>
                  {distanciaLabel ? (
                    <p className="mt-1 text-xs font-bold text-eid-action-300">{distanciaLabel} de você</p>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-eid-text-secondary">Reservas</p>
                  <p className={espaco.aceita_reserva ? "mt-1 text-sm font-black text-emerald-300" : "mt-1 text-sm font-black text-eid-fg"}>
                    {espaco.aceita_reserva ? "Online" : "Sob consulta"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-eid-text-secondary">Sócios</p>
                  <p className={espaco.aceita_socios ? "mt-1 text-sm font-black text-eid-action-300" : "mt-1 text-sm font-black text-eid-fg"}>
                    {espaco.aceita_socios ? "Aceitando" : "Fechado"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-eid-text-secondary">Estrutura</p>
                  <p className="mt-1 text-sm font-black text-eid-fg">
                    {(unidades ?? []).length ? `${(unidades ?? []).length} unidade(s)` : espaco.tipo_quadra ?? "A publicar"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {espaco.aceita_socios ? (
                  <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-3 py-1 text-xs font-semibold text-eid-action-400">
                    Aceitando sócios
                  </span>
                ) : null}
                {espaco.aceita_reserva ? (
                  <span className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                    Reservas online
                  </span>
                ) : null}
                <NativeShareButton
                  title={`${espaco.nome_publico} no EsporteID`}
                  text="Veja este espaço no EsporteID"
                  path={`/espaco/${slug}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/70 px-3 py-1.5 text-xs font-semibold text-eid-fg transition hover:border-eid-primary-500/45 hover:bg-eid-primary-500/10"
                />
                {mapsHref ? (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1.5 text-xs font-semibold text-eid-primary-200 transition hover:bg-eid-primary-500/15"
                  >
                    Abrir mapa
                  </a>
                ) : null}
              </div>
              <div className="mt-4 space-y-2 text-sm text-eid-text-secondary">
                <p>{espaco.localizacao ?? "Endereço sob consulta"}</p>
                {espaco.whatsapp_contato ? <p>WhatsApp: {espaco.whatsapp_contato}</p> : null}
                {espaco.email_contato ? <p>E-mail: {espaco.email_contato}</p> : null}
                {espaco.website_url ? (
                  <a
                    href={espaco.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-eid-primary-300 underline"
                  >
                    Site oficial
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
          <div className={`${PROFILE_CARD_BASE} p-4 sm:p-5`}>
            <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-primary-400">Estrutura</h2>
            <div className="mt-4 space-y-2">
              {(unidades ?? []).length ? (
                (unidades ?? []).map((unidade) => (
                  <div
                    key={unidade.id}
                    className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3"
                  >
                    <p className="text-sm font-semibold text-eid-fg">{unidade.nome}</p>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      {unidade.tipo_unidade} · {unidade.superficie ?? "superfície não informada"} ·{" "}
                      {unidade.status_operacao}
                    </p>
                    <p className="mt-1 text-[11px] text-eid-text-secondary">
                      {unidade.coberta ? "Coberta" : "Descoberta"} ·{" "}
                      {unidade.indoor ? "Indoor" : "Outdoor"} ·{" "}
                      {unidade.iluminacao ? "Com iluminação" : "Sem iluminação"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-eid-text-secondary">
                  As quadras/unidades ainda estão sendo publicadas.
                </p>
              )}
            </div>
          </div>

          <div className={`${PROFILE_CARD_BASE} p-4 sm:p-5`}>
            <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-primary-400">Planos de sócio</h2>
            <div className="mt-4 space-y-2">
              {(planos ?? []).length ? (
                (planos ?? []).map((plano) => (
                  <div
                    key={plano.id}
                    className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3"
                  >
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
                      · desconto avulso{" "}
                      {Number(plano.percentual_desconto_avulso ?? 0) * 100}%
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-eid-text-secondary">
                  O espaço ainda não publicou planos de associação.
                </p>
              )}
            </div>
          </div>

          <div className={`${PROFILE_CARD_BASE} p-4 sm:p-5`}>
            <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-primary-400">Horários</h2>
            <div className="mt-4 space-y-2">
              {(horarios ?? []).length ? (
                (horarios ?? []).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3 text-xs text-eid-text-secondary"
                  >
                    Dia {item.dia_semana} · {String(item.hora_inicio).slice(0, 5)} às{" "}
                    {String(item.hora_fim).slice(0, 5)}
                  </div>
                ))
              ) : (
                <p className="text-sm text-eid-text-secondary">
                  Grade semanal ainda não publicada.
                </p>
              )}
            </div>
          </div>
        </section>

        {isMembroAtivo || acessoPublicoPago ? (
          <ProfileSection
            title="Quem vai jogar aqui"
            className="mt-4"
            info="Reservas e quem está inscrito nas quadras ou horários deste espaço, quando a agenda está disponível."
          >
          <div className={`${PROFILE_CARD_BASE} p-4 sm:p-5`}>
            <div className="grid gap-3 lg:grid-cols-2">
            {(reservas ?? []).length ? (
              (reservas ?? []).map((reserva) => {
                const unidade = (unidades ?? []).find(
                  (item) => item.id === reserva.espaco_unidade_id
                );
                const ocupantes = participantesByReserva.get(Number(reserva.id)) ?? [];
                return (
                  <div
                    key={reserva.id}
                    className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4"
                  >
                    <p className="text-sm font-semibold text-eid-fg">
                      {unidade?.nome ?? "Unidade"} · {reserva.tipo_reserva}
                    </p>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      {reserva.inicio
                        ? new Date(reserva.inicio).toLocaleString("pt-BR")
                        : "-"}{" "}
                      até{" "}
                      {reserva.fim
                        ? new Date(reserva.fim).toLocaleString("pt-BR")
                        : "-"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ocupantes.length ? (
                        ocupantes.map((ocupante) => {
                          const profile = Array.isArray(ocupante.profiles)
                            ? ocupante.profiles[0]
                            : ocupante.profiles;
                          return profile?.id ? (
                            <Link
                              key={ocupante.id}
                              href={`/perfil/${profile.id}?from=/espaco/${slug}`}
                              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card px-2.5 py-1.5 text-xs text-eid-fg"
                            >
                              {profile.avatar_url ? (
                                <Image
                                  src={profile.avatar_url}
                                  alt=""
                                  width={24}
                                  height={24}
                                  unoptimized
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              ) : (
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-eid-primary-500/15 text-[10px] font-bold text-eid-primary-300">
                                  {(profile.nome ?? "E").slice(0, 1).toUpperCase()}
                                </span>
                              )}
                              <span>{profile.nome ?? "Jogador"}</span>
                            </Link>
                          ) : null;
                        })
                      ) : (
                        <p className="text-xs text-eid-text-secondary">
                          Ocupação ainda sem jogadores vinculados.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-eid-text-secondary">
                Nenhuma ocupação publicada ainda.
              </p>
            )}
            </div>
          </div>
        </ProfileSection>
        ) : null}

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className={`${PROFILE_CARD_BASE} p-4 sm:p-5`}>
            <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-primary-400">Professores parceiros</h2>
            <div className="mt-4 space-y-2">
              {(professores ?? []).length ? (
                (professores ?? []).map((item) => {
                  const profile = Array.isArray(item.profiles)
                    ? item.profiles[0]
                    : item.profiles;
                  return profile?.id ? (
                    <Link
                      key={item.id}
                      href={`/professor/${profile.id}`}
                      className="flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3"
                    >
                      {profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt=""
                          width={40}
                          height={40}
                          unoptimized
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-eid-primary-500/15 text-xs font-bold text-eid-primary-300">
                          {(profile.nome ?? "P").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-eid-fg">
                          {profile.nome ?? "Professor"}
                        </p>
                        <p className="text-xs text-eid-text-secondary">
                          Vinculado ao espaço
                        </p>
                      </div>
                    </Link>
                  ) : null;
                })
              ) : (
                <p className="text-sm text-eid-text-secondary">
                  Nenhum professor parceiro publicado ainda.
                </p>
              )}
            </div>
          </div>

          <div className={`${PROFILE_CARD_BASE} p-4 sm:p-5`}>
            <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-primary-400">Torneios neste espaço</h2>
            <div className="mt-4 space-y-2">
              {(torneios ?? []).length ? (
                (torneios ?? []).map((torneio) => (
                  <Link
                    key={torneio.id}
                    href={`/torneios/${torneio.id}?from=/espaco/${slug}`}
                    className="block rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-3"
                  >
                    <p className="text-sm font-semibold text-eid-fg">{torneio.nome}</p>
                    <p className="mt-1 text-xs text-eid-text-secondary">
                      {torneio.status} · {torneio.data_inicio ?? "sem data"}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-eid-text-secondary">
                  Nenhum torneio vinculado a este espaço ainda.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
          {!user || (!isMembroAtivo && !acessoPublicoPago) ? (
            <div className="lg:col-span-3 rounded-2xl border border-eid-action-500/25 bg-eid-action-500/10 p-4 sm:p-5">
              <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-action-400">Resumo público do espaço</h2>
              <p className="mt-2 text-sm text-eid-text-secondary">
                Endereço: {espaco.localizacao ?? "não informado"} · Horários publicados: {(horarios ?? []).length} · Estruturas: {(unidades ?? []).length}.
                {acessoPublicoPago
                  ? " Este espaço opera em modo pago com acesso público: entre e reserve direto."
                  : " Para ver a área completa e reservar, solicite entrada como sócio/membro."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {!user ? (
                  <>
                    <Link
                      href={`/login?next=${encodeURIComponent(`/espaco/${slug}`)}`}
                      className="eid-btn-primary rounded-xl px-4 py-3 text-sm font-bold"
                    >
                      Entrar
                    </Link>
                    <Link
                      href={`/cadastro?next=${encodeURIComponent(`/espaco/${slug}`)}`}
                      className="rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-3 text-sm font-bold text-eid-fg"
                    >
                      Criar conta
                    </Link>
                  </>
                ) : (
                  <>
                    {acessoPublicoPago ? (
                      <>
                        <EspacoPublicAddReservaAtalhoForm espacoId={espaco.id} />
                        <EspacoPublicReservaForm
                          espacoId={espaco.id}
                          unidadeId={unidadePrincipal?.id ?? null}
                          esporteId={unidadePrincipal?.esporte_id ?? null}
                          valorReservaPadraoCentavos={reservaConfig.valorReservaPadraoCentavos}
                          latitude={Number(espaco.lat ?? NaN)}
                          longitude={Number(espaco.lng ?? NaN)}
                        />
                      </>
                    ) : (
                      <EspacoPublicJoinForm espacoId={espaco.id} planos={planos ?? []} regraEntrada={regraAssociacao} modoReserva={espaco.modo_reserva} />
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              {espaco.aceita_socios ? (
                <EspacoPublicJoinForm espacoId={espaco.id} planos={planos ?? []} regraEntrada={regraAssociacao} modoReserva={espaco.modo_reserva} />
              ) : (
                <div className={`${PROFILE_CARD_BASE} p-4 text-sm text-eid-text-secondary`}>
                  Este espaço não está com adesão de sócios aberta agora.
                </div>
              )}
              <EspacoPublicReservaForm
                espacoId={espaco.id}
                unidadeId={unidadePrincipal?.id ?? null}
                esporteId={unidadePrincipal?.esporte_id ?? null}
                valorReservaPadraoCentavos={reservaConfig.valorReservaPadraoCentavos}
                latitude={Number(espaco.lat ?? NaN)}
                longitude={Number(espaco.lng ?? NaN)}
              />
              {acessoPublicoPago ? <EspacoPublicAddReservaAtalhoForm espacoId={espaco.id} /> : null}
              {permiteFilaGratuita ? (
                <EspacoPublicWaitlistForm
                  espacoId={espaco.id}
                  unidadeId={unidadePrincipal?.id ?? null}
                  esporteId={unidadePrincipal?.esporte_id ?? null}
                  latitude={Number(espaco.lat ?? NaN)}
                  longitude={Number(espaco.lng ?? NaN)}
                />
              ) : null}
            </>
          )}
        </section>
      </main>
  );
}
