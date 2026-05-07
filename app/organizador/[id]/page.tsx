import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProfileSection } from "@/components/perfil/profile-layout-blocks";
import {
  PROFILE_HERO_PANEL_CLASS,
  PROFILE_HERO_ROLE_BADGE_CLASS,
  PROFILE_PUBLIC_MAIN_CLASS,
} from "@/components/perfil/profile-ui-tokens";
import { EidCityState } from "@/components/ui/eid-city-state";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";
import { listarPapeis } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Organizador · EsporteID",
};

function statusStyle(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "aberto") return "border-sky-400/40 bg-sky-500/15 text-sky-200";
  if (s.includes("andamento") || s.includes("progress")) return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
  if (s.includes("encerr") || s.includes("final")) return "border-amber-400/40 bg-amber-500/15 text-amber-200";
  if (s.includes("cancel")) return "border-red-400/35 bg-red-500/15 text-red-200";
  return "border-eid-primary-500/35 bg-eid-primary-500/10 text-eid-primary-200";
}

export default async function OrganizadorPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const featureCfg = await getSystemFeatureConfig(supabase);
    if (!canAccessSystemFeature(featureCfg, "organizador_torneios", user.id, false)) {
      redirect("/dashboard");
    }
  }

  const [{ data: papeisRows }, { data: profile }, { data: torneios }] = await Promise.all([
    supabase.from("usuario_papeis").select("papel").eq("usuario_id", id),
    supabase.from("profiles").select("id, nome, username, avatar_url, localizacao, bio").eq("id", id).maybeSingle(),
    supabase
      .from("torneios")
      .select("id, nome, status, data_inicio, data_fim, valor_inscricao, esporte_id, esportes(nome)")
      .eq("criador_id", id)
      .order("id", { ascending: false })
      .limit(48),
  ]);

  const papeis = listarPapeis(papeisRows);
  if (!papeis.includes("organizador")) notFound();
  if (!profile) notFound();

  const isSelf = user?.id === id;

  return (
    <main className={`${PROFILE_PUBLIC_MAIN_CLASS} eid-progressive-enter`}>
      <div className={`${PROFILE_HERO_PANEL_CLASS} mt-0 sm:mt-1`}>
        <div className="px-3 pb-4 pt-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-eid-primary-500/40 bg-eid-surface text-lg font-black text-eid-primary-200">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (profile.nome ?? "O").trim().slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className={PROFILE_HERO_ROLE_BADGE_CLASS}>Organizador</span>
              <h1 className="mt-2 break-words text-base font-black tracking-tight text-eid-fg sm:text-lg">
                {profile.nome ?? "Organizador"}
              </h1>
              {profile.username ? (
                <p className="font-semibold text-eid-primary-400">@{profile.username}</p>
              ) : null}
              {profile.localizacao ? (
                <p className="mt-1 text-xs text-eid-text-secondary">
                  <EidCityState location={profile.localizacao} compact align="start" layout="inline" />
                </p>
              ) : null}
              {profile.bio ? <p className="mt-2 text-sm text-eid-text-secondary">{profile.bio}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {isSelf ? (
                  <Link
                    href="/organizador"
                    className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-eid-action-500 px-4 text-xs font-black uppercase tracking-wide text-[var(--eid-brand-ink)] transition hover:brightness-110"
                  >
                    Painel do organizador
                  </Link>
                ) : null}
                <Link
                  href="/torneios"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-4 text-xs font-bold text-eid-fg transition hover:border-eid-primary-500/35"
                >
                  Ver torneios na plataforma
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ProfileSection
          title="Torneios organizados"
          info="Eventos criados por este perfil na plataforma. Abra o card para ver detalhes e inscrições."
        >
          {(torneios ?? []).length === 0 ? (
            <p className="mt-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-4 text-sm text-eid-text-secondary">
              Nenhum torneio cadastrado ainda.
            </p>
          ) : (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {(torneios ?? []).map((t) => {
                const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
                return (
                  <Link
                    key={t.id}
                    href={`/torneios/${t.id}?from=${encodeURIComponent(`/organizador/${id}`)}`}
                    className="group block overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 transition hover:border-eid-action-500/40"
                  >
                    <div className="h-1 w-full bg-gradient-to-r from-eid-primary-500 via-eid-action-500 to-eid-primary-400" />
                    <div className="p-3">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${statusStyle(t.status)}`}
                      >
                        {t.status ?? "—"}
                      </span>
                      <p className="mt-2 text-sm font-bold text-eid-fg group-hover:text-eid-action-500">{t.nome}</p>
                      <p className="mt-1 text-xs font-semibold text-eid-primary-300">
                        {(esp as { nome?: string | null } | null)?.nome ?? "Esporte"}
                      </p>
                      <div className="mt-3 space-y-1 text-xs text-eid-text-secondary">
                        <p>
                          <span className="text-eid-fg/80">Início:</span>{" "}
                          {t.data_inicio ? new Date(t.data_inicio).toLocaleDateString("pt-BR") : "A definir"}
                        </p>
                        <p>
                          <span className="text-eid-fg/80">Término:</span>{" "}
                          {t.data_fim ? new Date(t.data_fim).toLocaleDateString("pt-BR") : "A definir"}
                        </p>
                      </div>
                      <p className="mt-3 text-base font-black text-eid-action-500">
                        R$ {Number(t.valor_inscricao ?? 0).toFixed(2)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ProfileSection>
      </div>
    </main>
  );
}
