import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EspacoPublicJoinForm,
  EspacoPublicReservaForm,
  EspacoPublicWaitlistForm,
} from "@/components/espaco/espaco-public-cta";
import { ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { PROFILE_CARD_BASE, PROFILE_HERO_PANEL_CLASS, PROFILE_PUBLIC_MAIN_WIDE_CLASS } from "@/components/perfil/profile-ui-tokens";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EspacoPublicLandingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: espaco } = await supabase
    .from("espacos_genericos")
    .select(
      "id, slug, nome_publico, descricao_curta, descricao_longa, localizacao, cidade, uf, cover_arquivo, whatsapp_contato, email_contato, website_url, instagram_url, aceita_socios, ativo_listagem, tipo_quadra, aceita_reserva, esportes_ids, configuracao_reservas_json"
    )
    .eq("slug", slug)
    .eq("ativo_listagem", true)
    .maybeSingle();
  if (!espaco) notFound();

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
      .select("id, nome, descricao, mensalidade_centavos, reservas_gratuitas_semana, percentual_desconto_avulso")
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

  return (
    <main className={PROFILE_PUBLIC_MAIN_WIDE_CLASS}>
        <section
          className={`${PROFILE_HERO_PANEL_CLASS} mt-2 border border-eid-primary-500/25 p-4 sm:p-5`}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eid-primary-500/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-eid-action-500/12 blur-3xl"
            aria-hidden
          />
          <div className="relative grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-eid-primary-300">
                Landing pública do espaço
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-eid-fg">
                {espaco.nome_publico}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-eid-text-secondary">
                {espaco.descricao_curta ||
                  espaco.descricao_longa ||
                  "Estrutura esportiva pronta para reservas, sócios, professores e eventos."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1 text-xs font-semibold text-eid-primary-300">
                  {espaco.cidade ?? "Cidade"} {espaco.uf ? `· ${espaco.uf}` : ""}
                </span>
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
            <div className={`${PROFILE_CARD_BASE} p-3 sm:p-4`}>
              {espaco.cover_arquivo ? (
                <Image
                  src={espaco.cover_arquivo}
                  alt={espaco.nome_publico}
                  width={1200}
                  height={560}
                  unoptimized
                  className="h-56 w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-56 items-center justify-center rounded-2xl bg-eid-card text-lg font-bold text-eid-primary-300">
                  {espaco.nome_publico}
                </div>
              )}
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
                      {plano.reservas_gratuitas_semana ?? 0} reserva(s) grátis por semana · desconto avulso{" "}
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

        <ProfileSection title="Quem vai jogar aqui" className="mt-4">
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
          {!user ? (
            <div className="lg:col-span-3 rounded-2xl border border-eid-action-500/25 bg-eid-action-500/10 p-4 sm:p-5">
              <h2 className="text-[10px] font-black uppercase tracking-[0.14em] text-eid-action-400">Entrar para continuar</h2>
              <p className="mt-2 text-sm text-eid-text-secondary">
                Faça login ou cadastro para solicitar associação, reservar horários
                e entrar na fila de espera do espaço.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
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
              </div>
            </div>
          ) : (
            <>
              {espaco.aceita_socios ? (
                <EspacoPublicJoinForm espacoId={espaco.id} planos={planos ?? []} />
              ) : (
                <div className={`${PROFILE_CARD_BASE} p-4 text-sm text-eid-text-secondary`}>
                  Este espaço não está com adesão de sócios aberta agora.
                </div>
              )}
              <EspacoPublicReservaForm
                espacoId={espaco.id}
                unidadeId={unidadePrincipal?.id ?? null}
                esporteId={unidadePrincipal?.esporte_id ?? null}
              />
              <EspacoPublicWaitlistForm
                espacoId={espaco.id}
                unidadeId={unidadePrincipal?.id ?? null}
                esporteId={unidadePrincipal?.esporte_id ?? null}
              />
            </>
          )}
        </section>
      </main>
  );
}
