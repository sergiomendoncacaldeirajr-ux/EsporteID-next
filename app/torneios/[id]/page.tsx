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

export default async function TorneioPublicPage({ params, searchParams }: Props) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id < 1) notFound();

  const sp = (await searchParams) ?? {};
  const backHref = resolveBackHref(sp.from, "/torneios");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/torneios/${id}`);

  const { data: t } = await supabase
    .from("torneios")
    .select(
      "id, nome, status, data_inicio, data_fim, banner, lat, lng, categoria, descricao, regulamento, premios, valor_inscricao, formato_competicao, criterio_desempate, criador_id, espaco_generico_id, esporte_id, esportes(nome)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();

  const { data: org } = t.criador_id
    ? await supabase.from("profiles").select("id, nome, avatar_url").eq("id", t.criador_id).maybeSingle()
    : { data: null };

  const { data: sede } = t.espaco_generico_id
    ? await supabase
        .from("espacos_genericos")
        .select("id, nome_publico, localizacao")
        .eq("id", t.espaco_generico_id)
        .maybeSingle()
    : { data: null };

  const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-lg px-3 pb-8 pt-3 sm:max-w-2xl sm:px-6 sm:pb-10 sm:pt-4">
        <PerfilBackLink href={backHref} label="Voltar aos torneios" />

        <div className="mt-4 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-none md:rounded-3xl md:shadow-xl md:shadow-black/25">
          <div className="h-1 w-full bg-gradient-to-r from-eid-primary-500 via-eid-action-500 to-eid-primary-400 md:h-1.5" />
          {t.banner ? (
            <div className="h-32 w-full sm:h-40 md:h-48">
              <img src={t.banner} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="h-24 bg-eid-surface sm:h-32 md:bg-gradient-to-br md:from-eid-action-500/25 md:via-eid-primary-500/15 md:to-eid-card md:h-40" />
          )}
          <div className="p-4 sm:p-5">
            <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-eid-primary-300">
              {t.status ?? "—"}
            </span>
            <h1 className="mt-2 text-xl font-bold text-eid-fg sm:text-2xl">{t.nome}</h1>
            <p className="mt-1 text-sm text-eid-primary-300">{esp?.nome ?? "Esporte a definir"}</p>
            {t.categoria ? (
              <p className="mt-2 text-xs text-eid-text-secondary">Categoria: {t.categoria}</p>
            ) : null}
          </div>
        </div>

        <section className="mt-6 grid gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <p className="text-eid-text-secondary">
              Início:{" "}
              <span className="font-medium text-eid-fg">
                {t.data_inicio ? new Date(t.data_inicio).toLocaleDateString("pt-BR") : "A definir"}
              </span>
            </p>
            <p className="text-eid-text-secondary">
              Fim:{" "}
              <span className="font-medium text-eid-fg">
                {t.data_fim ? new Date(t.data_fim).toLocaleDateString("pt-BR") : "A definir"}
              </span>
            </p>
          </div>
          <p className="text-eid-text-secondary">
            Inscrição:{" "}
            <span className="text-lg font-bold text-eid-action-500">R$ {Number(t.valor_inscricao ?? 0).toFixed(2)}</span>
          </p>
          <p className="text-xs text-eid-text-secondary">
            Vagas e confirmação de inscrição: em breve nesta tela; fale com o organizador pelo perfil.
          </p>
        </section>

        {org ? (
          <section className="mt-6 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Organização</h2>
            <Link
              href={`/perfil/${org.id}?from=/torneios/${id}`}
              className="mt-3 flex items-center gap-3 transition hover:opacity-90"
            >
              {org.avatar_url ? (
                <img src={org.avatar_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-eid-surface text-xs font-bold text-eid-primary-300">
                  EID
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-eid-fg">{org.nome ?? "Organizador"}</p>
                <p className="text-xs text-eid-text-secondary">Ver perfil</p>
              </div>
            </Link>
          </section>
        ) : null}

        {sede ? (
          <section className="mt-6 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Local / sede</h2>
            <Link href={`/local/${sede.id}?from=/torneios/${id}`} className="mt-2 block text-sm font-semibold text-eid-fg hover:text-eid-primary-300">
              {sede.nome_publico}
            </Link>
            <p className="mt-1 text-xs text-eid-text-secondary">{sede.localizacao}</p>
          </section>
        ) : null}

        {t.descricao ? (
          <section className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Sobre</h2>
            <p className="mt-2 whitespace-pre-wrap rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm leading-relaxed text-eid-text-secondary">
              {t.descricao}
            </p>
          </section>
        ) : null}

        {t.regulamento ? (
          <section className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Regulamento</h2>
            <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm leading-relaxed text-eid-text-secondary">
              {t.regulamento}
            </div>
          </section>
        ) : null}

        <div className="mt-8 rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/10 p-4 text-center">
          <p className="text-sm text-eid-text-secondary">Inscrição online com pagamento será conectada em breve.</p>
          <p className="mt-2 text-xs text-eid-text-secondary">
            Formato: {t.formato_competicao ?? "—"} · Critério: {t.criterio_desempate ?? "—"}
          </p>
        </div>
      </main>
    </>
  );
}
