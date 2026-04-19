import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
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
    .select("id, player1_id, player2_id, esporte_id, esportes(nome)")
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

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-lg px-3 pb-8 pt-3 sm:max-w-2xl sm:px-6 sm:pb-10 sm:pt-4">
        <PerfilBackLink href={backHref} label="Voltar" />

        <div className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-center sm:rounded-2xl sm:p-5">
          <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-eid-primary-300">
            Dupla · {esp?.nome ?? "Esporte"}
          </span>
          <h1 className="mt-3 text-lg font-bold text-eid-fg sm:text-xl">Dupla registrada #{id}</h1>
          <p className="mt-2 text-xs text-eid-text-secondary">
            Par fixo de atletas no mesmo esporte. No radar, duplas também podem aparecer como{" "}
            <strong className="text-eid-fg">formação</strong> — nesse caso use o perfil da formação.
          </p>
          {mediaEid != null ? (
            <p className="mt-4 text-2xl font-bold text-eid-action-500 sm:text-3xl sm:font-black">
              EID médio {mediaEid.toFixed(1)}
            </p>
          ) : (
            <p className="mt-4 text-sm text-eid-text-secondary">EID individual disponível nos perfis dos atletas.</p>
          )}
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {[p1, p2].map((p, i) =>
            p ? (
              <Link
                key={p.id}
                href={`/perfil/${p.id}?from=/perfil-dupla/${id}`}
                className="flex flex-col items-center rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 transition hover:border-eid-primary-500/35 sm:rounded-2xl sm:p-4"
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-eid-surface text-sm font-bold text-eid-primary-300">
                    {i + 1}º
                  </div>
                )}
                <p className="mt-3 text-center text-sm font-bold text-eid-fg">{p.nome ?? "Atleta"}</p>
                <p className="mt-1 text-center text-xs text-eid-text-secondary">{p.localizacao ?? "—"}</p>
                <p className="mt-2 text-xs font-semibold text-eid-primary-300">
                  EID{" "}
                  {i === 0
                    ? Number(eid1?.nota_eid ?? 1).toFixed(1)
                    : Number(eid2?.nota_eid ?? 1).toFixed(1)}
                </p>
              </Link>
            ) : null
          )}
        </section>

        <p className="mt-8 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4 text-xs leading-relaxed text-eid-text-secondary">
          Para desafiar uma <strong className="text-eid-fg">formação dupla</strong> cadastrada como time, abra o radar em{" "}
          <Link href="/match?tipo=dupla" className="font-semibold text-eid-primary-300 underline">
            Match → Duplas
          </Link>
          .
        </p>
      </main>
    </>
  );
}
