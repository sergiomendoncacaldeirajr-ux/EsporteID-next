import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProfileAchievementsShelf } from "@/components/perfil/profile-history-widgets";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { ProfileIdentityHeader, ProfilePrimaryCta, ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSportsMetricsCard } from "@/components/perfil/profile-sports-metrics-card";
import { ProfileMemberCard } from "@/components/perfil/profile-team-members-cards";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveBackHref } from "@/lib/perfil/back-href";
import {
  formacaoTemMatchAceitoEntre,
  podeExibirWhatsappPerfilFormacao,
  podeExibirWhatsappPerfilPublico,
  resolverTimeIdParaDuplaRegistrada,
  waMeHref,
} from "@/lib/perfil/whatsapp-visibility";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function PerfilDuplaPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const backHref = resolveBackHref(sp.from, "/match");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/perfil-dupla/${id}`);

  const { data: d } = await supabase
    .from("duplas")
    .select("id, username, bio, player1_id, player2_id, esporte_id, esportes(nome)")
    .eq("id", id)
    .maybeSingle();
  if (!d) notFound();

  const { data: p1 } = await supabase
    .from("profiles")
    .select("id, nome, avatar_url, localizacao, whatsapp")
    .eq("id", d.player1_id)
    .maybeSingle();
  const { data: p2 } = await supabase
    .from("profiles")
    .select("id, nome, avatar_url, localizacao, whatsapp")
    .eq("id", d.player2_id)
    .maybeSingle();

  const timeResolvidoId = await resolverTimeIdParaDuplaRegistrada(
    supabase,
    d.player1_id,
    d.player2_id,
    d.esporte_id
  );

  const { data: timeResolvido } = timeResolvidoId
    ? await supabase.from("times").select("id, criador_id").eq("id", timeResolvidoId).maybeSingle()
    : { data: null };

  const { data: liderDupla } = timeResolvido?.criador_id
    ? await supabase.from("profiles").select("id, nome, whatsapp").eq("id", timeResolvido.criador_id).maybeSingle()
    : { data: null };

  const isMembroDupla = user.id === d.player1_id || user.id === d.player2_id;

  const { data: minhaFormacaoDupla } = await supabase
    .from("times")
    .select("id")
    .eq("criador_id", user.id)
    .eq("tipo", "dupla")
    .eq("esporte_id", d.esporte_id)
    .limit(1);

  const meuTimeIdDupla = minhaFormacaoDupla?.[0]?.id ?? null;
  const canChallengeDupla =
    meuTimeIdDupla != null &&
    !isMembroDupla &&
    timeResolvidoId != null &&
    timeResolvido?.criador_id != null &&
    timeResolvido.criador_id !== user.id;

  let linkWpp: string | null = null;
  if (!isMembroDupla && timeResolvidoId && timeResolvido?.criador_id && liderDupla) {
    const podeWa = await podeExibirWhatsappPerfilFormacao(
      supabase,
      user.id,
      timeResolvido.criador_id,
      timeResolvidoId,
      meuTimeIdDupla
    );
    linkWpp = podeWa ? waMeHref(liderDupla.whatsapp) : null;
  } else if (!isMembroDupla && p1?.id && p2?.id) {
    const v1 = await podeExibirWhatsappPerfilPublico(supabase, user.id, p1.id, false);
    const v2 = await podeExibirWhatsappPerfilPublico(supabase, user.id, p2.id, false);
    if (v1) linkWpp = waMeHref(p1.whatsapp);
    else if (v2) linkWpp = waMeHref(p2.whatsapp);
  }

  const hasAceitoRankDupla =
    canChallengeDupla &&
    meuTimeIdDupla != null &&
    timeResolvidoId != null &&
    timeResolvido?.criador_id != null &&
    (await formacaoTemMatchAceitoEntre(
      supabase,
      user.id,
      meuTimeIdDupla,
      timeResolvidoId,
      timeResolvido.criador_id,
      Number(d.esporte_id),
      "dupla"
    ));

  const { data: eid1 } = await supabase
    .from("usuario_eid")
    .select("nota_eid, pontos_ranking")
    .eq("usuario_id", d.player1_id)
    .eq("esporte_id", d.esporte_id)
    .maybeSingle();
  const { data: eid2 } = await supabase
    .from("usuario_eid")
    .select("nota_eid, pontos_ranking")
    .eq("usuario_id", d.player2_id)
    .eq("esporte_id", d.esporte_id)
    .maybeSingle();

  const esp = Array.isArray(d.esportes) ? d.esportes[0] : d.esportes;
  const mediaEid =
    eid1?.nota_eid != null && eid2?.nota_eid != null
      ? (Number(eid1.nota_eid) + Number(eid2.nota_eid)) / 2
      : null;
  const rankTotal = Number(eid1?.pontos_ranking ?? 0) + Number(eid2?.pontos_ranking ?? 0);
  const conquistas: string[] = [];
  if ((mediaEid ?? 0) >= 7) conquistas.push("Dupla Elite");
  if (rankTotal >= 1200) conquistas.push("Rank Forte");
  if ((p1?.id ? 1 : 0) + (p2?.id ? 1 : 0) === 2) conquistas.push("Dupla Completa");

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-lg px-3 pb-8 pt-3 sm:max-w-2xl sm:px-6 sm:pb-10 sm:pt-4">
        <PerfilBackLink href={backHref} label="Voltar" />

        <ProfileIdentityHeader
          avatar={
            <span className="inline-flex rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-eid-primary-300">
              Dupla · {esp?.nome ?? "Esporte"}
            </span>
          }
          name={`Dupla registrada #${id}`}
          username={d.username}
          location={null}
          extra={
            <>
              <p className="mt-2 text-xs text-eid-text-secondary">
                Par fixo de atletas no mesmo esporte. No radar, duplas também podem aparecer como{" "}
                <strong className="text-eid-fg">formação</strong>.
              </p>
              {d.bio ? <p className="mt-2 text-xs text-eid-text-secondary">{d.bio}</p> : null}
              {mediaEid != null ? (
                <p className="mt-4 text-2xl font-bold text-eid-action-500 sm:text-3xl sm:font-black">EID médio {mediaEid.toFixed(1)}</p>
              ) : (
                <p className="mt-4 text-sm text-eid-text-secondary">EID individual disponível nos perfis dos atletas.</p>
              )}
            </>
          }
        />

        <div className="mt-6 grid gap-6">
          <section>
            <h2 className="sr-only">Ação principal</h2>
            {!isMembroDupla ? (
              <div className="grid gap-3">
                {linkWpp ? (
                  <a
                    href={linkWpp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-[13px] font-black uppercase tracking-[0.1em] text-white shadow-[0_0_18px_rgba(37,211,102,0.45)] transition hover:bg-[#1da851]"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.534 5.853L.054 23.25a.75.75 0 0 0 .916.916l5.396-1.479A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.986 0-3.84-.552-5.418-1.51l-.388-.232-4.021 1.1 1.1-4.022-.232-.388A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                    </svg>
                    Chamar no WhatsApp
                  </a>
                ) : null}
                {canChallengeDupla && !hasAceitoRankDupla && timeResolvidoId ? (
                  <ProfilePrimaryCta
                    href={`/desafio?id=${timeResolvidoId}&tipo=dupla&esporte=${d.esporte_id}`}
                    label={linkWpp ? "⚡ Match no ranking" : undefined}
                  />
                ) : hasAceitoRankDupla && timeResolvidoId ? (
                  <p className="text-xs text-eid-text-secondary">
                    Match aceito nesta dupla. Registre o resultado na agenda quando jogarem.
                  </p>
                ) : (
                  <ProfilePrimaryCta
                    href={`/match?tipo=dupla&esporte=${d.esporte_id}`}
                    label="Duplas no radar"
                  />
                )}
              </div>
            ) : (
              <p className="text-xs text-eid-text-secondary">Você faz parte desta dupla registrada.</p>
            )}
          </section>

          <ProfileSection title="Esportes e Estatísticas">
            <ProfileSportsMetricsCard
              sportName={esp?.nome ?? "Esporte"}
              eidValue={mediaEid ?? 1}
              rankValue={rankTotal}
              eidLabel="EID médio"
              rankLabel="Rank total"
              trendLabel="Evolução (proxy)"
              trendPoints={[mediaEid ?? 1, (mediaEid ?? 1) + 0.1, (mediaEid ?? 1) + 0.2]}
            />
            {d.esporte_id ? (
              <Link
                href={`/perfil-dupla/${id}/eid/${d.esporte_id}?from=${encodeURIComponent(`/perfil-dupla/${id}`)}`}
                className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-eid-action-500/40 bg-eid-action-500/10 px-3 text-[11px] font-black uppercase tracking-wide text-eid-action-400 transition hover:border-eid-action-500/70 hover:bg-eid-action-500/15"
              >
                Estatísticas da dupla · {esp?.nome ?? "este esporte"}
              </Link>
            ) : null}
          </ProfileSection>

          <ProfileSection title="Minhas Equipes">
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[p1, p2].map((p, i) =>
                p ? (
                  <ProfileMemberCard
                    key={p.id}
                    href={`/perfil/${p.id}?from=/perfil-dupla/${id}`}
                    name={p.nome ?? "Atleta"}
                    subtitle={p.localizacao ?? "—"}
                    avatarUrl={p.avatar_url}
                    fallbackLabel={`${i + 1}o`}
                    layout="stacked"
                    avatarSize="lg"
                    trailing={
                      <p className="text-[11px] font-semibold text-eid-primary-300">
                        EID {i === 0 ? Number(eid1?.nota_eid ?? 1).toFixed(1) : Number(eid2?.nota_eid ?? 1).toFixed(1)}
                      </p>
                    }
                  />
                ) : null
              )}
            </div>
          </ProfileSection>

          <ProfileSection title="Histórico e Conquistas">
            <p className="mt-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-3 text-xs leading-relaxed text-eid-text-secondary">
              Para desafiar uma <strong className="text-eid-fg">formação dupla</strong> cadastrada como time, abra o radar em{" "}
              <Link href="/match?tipo=dupla" className="font-semibold text-eid-primary-300 underline">
                Match → Duplas
              </Link>
              .
            </p>
            <ProfileAchievementsShelf
              title="Estante de troféus"
              achievements={conquistas}
              emptyText="Conquistas aparecerão conforme evolução da dupla."
            />
          </ProfileSection>
        </div>
      </main>
    </>
  );
}
