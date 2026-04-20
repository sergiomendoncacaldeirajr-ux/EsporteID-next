import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function PerfilTimePage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const backHref = resolveBackHref(sp.from, "/match");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/perfil-time/${id}`);

  async function sairEquipeAction() {
    "use server";
    const sb = await createClient();
    const {
      data: { user: actionUser },
    } = await sb.auth.getUser();
    if (!actionUser) return;
    await sb.rpc("sair_da_equipe", { p_time_id: id });
    revalidatePath(`/perfil-time/${id}`);
    revalidatePath(`/perfil/${actionUser.id}`);
  }

  const { data: t } = await supabase
    .from("times")
    .select(
      "id, nome, username, bio, tipo, localizacao, escudo, pontos_ranking, eid_time, esporte_id, criador_id, interesse_rank_match, disponivel_amistoso, esportes(nome)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();

  const { data: criador } = await supabase
    .from("profiles")
    .select("id, nome, avatar_url")
    .eq("id", t.criador_id)
    .maybeSingle();

  const { count: acima } = await supabase
    .from("times")
    .select("id", { count: "exact", head: true })
    .eq("esporte_id", t.esporte_id)
    .eq("tipo", t.tipo ?? "time")
    .gt("pontos_ranking", t.pontos_ranking ?? 0);

  const posicao = (acima ?? 0) + 1;

  const { data: hist } = await supabase
    .from("historico_eid_coletivo")
    .select("nota_nova, data_alteracao")
    .eq("time_id", id)
    .order("data_alteracao", { ascending: false })
    .limit(12);

  const { data: membros } = await supabase
    .from("membros_time")
    .select("usuario_id, cargo, status, profiles(id, nome, avatar_url)")
    .eq("time_id", id)
    .eq("status", "ativo")
    .order("data_criacao", { ascending: true })
    .limit(40);

  const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
  const modalidade = (t.tipo ?? "time") === "dupla" ? "dupla" : "time";

  const { data: minhaFormacao } = await supabase
    .from("times")
    .select("id")
    .eq("criador_id", user.id)
    .eq("tipo", t.tipo ?? "time")
    .eq("esporte_id", t.esporte_id)
    .limit(1);

  const canChallenge = (minhaFormacao?.length ?? 0) > 0 && t.criador_id !== user.id;
  const isMember = (membros ?? []).some((m) => m.usuario_id === user.id);
  const canLeaveTeam = isMember && t.criador_id !== user.id;

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-lg px-3 pb-8 pt-3 sm:max-w-2xl sm:px-6 sm:pb-10 sm:pt-4">
        <PerfilBackLink href={backHref} label="Voltar" />

        <div className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-center sm:rounded-2xl sm:p-5">
          {t.escudo ? (
            <img
              src={t.escudo}
              alt=""
              className="mx-auto h-24 w-24 rounded-2xl border-2 border-eid-action-500/50 object-cover shadow-lg sm:h-28 sm:w-28"
            />
          ) : (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-eid-primary-500/40 bg-eid-surface text-sm font-bold text-eid-primary-300 sm:h-28 sm:w-28">
              {(t.tipo ?? "T").toUpperCase().slice(0, 1)}
            </div>
          )}
          <span className="mt-4 inline-block rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-eid-primary-300">
            {(t.tipo ?? "time").toUpperCase()} · {esp?.nome ?? "Esporte"}
          </span>
          <h1 className="mt-2 text-xl font-bold uppercase tracking-tight text-eid-fg sm:text-2xl">{t.nome ?? "Formação"}</h1>
          {t.username ? <p className="mt-1 text-xs font-medium text-eid-primary-300">@{t.username}</p> : null}
          <p className="mt-2 text-sm text-eid-text-secondary">{t.localizacao ?? "Localização não informada"}</p>
          {t.bio ? <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">{t.bio}</p> : null}

          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[color:var(--eid-border-subtle)] pt-4">
            <div>
              <p className="text-xl font-bold tabular-nums text-eid-action-500 sm:text-2xl sm:font-black">{Number(t.eid_time ?? 1).toFixed(1)}</p>
              <p className="text-[10px] font-bold uppercase text-eid-text-secondary">EID</p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums text-eid-fg sm:text-2xl sm:font-black">{t.pontos_ranking ?? 0}</p>
              <p className="text-[10px] font-bold uppercase text-eid-text-secondary">Pts</p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums text-eid-primary-300 sm:text-2xl sm:font-black">#{posicao}</p>
              <p className="text-[10px] font-bold uppercase text-eid-text-secondary">Rank</p>
            </div>
          </div>

          {criador ? (
            <p className="mt-4 text-xs text-eid-text-secondary">
              Líder:{" "}
              <Link href={`/perfil/${criador.id}?from=/perfil-time/${id}`} className="font-semibold text-eid-primary-300 hover:underline">
                {criador.nome ?? "—"}
              </Link>
            </p>
          ) : null}

          {canChallenge && t.esporte_id ? (
            <Link
              href={`/desafio?id=${id}&tipo=${encodeURIComponent(modalidade)}&esporte=${t.esporte_id}`}
              className="eid-btn-match-cta mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold sm:w-auto"
            >
              Solicitar Match
            </Link>
          ) : t.criador_id === user.id ? (
            <p className="mt-4 text-xs text-eid-text-secondary">Esta é a sua formação.</p>
          ) : (
            <p className="mt-4 text-xs text-eid-text-secondary">
              Para desafiar, seja líder de uma {modalidade} neste mesmo esporte no radar.
            </p>
          )}
          {canLeaveTeam ? (
            <form action={sairEquipeAction} className="mt-3">
              <button
                type="submit"
                className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-400/35 px-3 text-xs font-semibold text-red-300"
              >
                Sair da equipe
              </button>
            </form>
          ) : null}
        </div>

        {(hist ?? []).length > 0 ? (
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Histórico EID (recente)</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {[...(hist ?? [])].reverse().map((h, i) => (
                <li
                  key={`${h.data_alteracao}-${i}`}
                  className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-2 py-1 text-[11px] text-eid-text-secondary"
                >
                  <span className="font-semibold text-eid-fg">{Number(h.nota_nova).toFixed(1)}</span>{" "}
                  {h.data_alteracao ? new Date(h.data_alteracao).toLocaleDateString("pt-BR") : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Integrantes</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {(membros ?? []).map((m, idx) => {
              const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              if (!p?.id) return null;
              return (
                <li key={`${m.usuario_id}-${idx}`}>
                  <Link
                    href={`/perfil/${p.id}?from=/perfil-time/${id}`}
                    className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 transition hover:border-eid-primary-500/35"
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eid-surface text-[10px] font-bold text-eid-primary-300">
                        EID
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-eid-fg">{p.nome ?? "Membro"}</p>
                      <p className="text-[10px] text-eid-text-secondary">{m.cargo ?? "Atleta"}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="mt-6 flex flex-wrap gap-2 text-xs text-eid-text-secondary">
          {t.interesse_rank_match ? <span className="rounded-md border border-eid-primary-500/30 px-2 py-1">Ranking</span> : null}
          {t.disponivel_amistoso ? (
            <span className="rounded-md border border-eid-primary-500/30 px-2 py-1">Amistoso</span>
          ) : null}
        </div>
      </main>
    </>
  );
}
