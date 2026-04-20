import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProfileAchievementsShelf } from "@/components/perfil/profile-history-widgets";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { ProfileIdentityHeader, ProfilePrimaryCta, ProfileSection } from "@/components/perfil/profile-layout-blocks";
import { ProfileSportsMetricsCard } from "@/components/perfil/profile-sports-metrics-card";
import { ProfileMemberCard } from "@/components/perfil/profile-team-members-cards";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveBackHref } from "@/lib/perfil/back-href";
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
    .select("id, nome, avatar_url, localizacao")
    .eq("id", d.player1_id)
    .maybeSingle();
  const { data: p2 } = await supabase
    .from("profiles")
    .select("id, nome, avatar_url, localizacao")
    .eq("id", d.player2_id)
    .maybeSingle();

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
            <ProfilePrimaryCta href={`/match?tipo=dupla&esporte=${d.esporte_id}`} />
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
                    trailing={
                      <p className="text-xs font-semibold text-eid-primary-300">
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
