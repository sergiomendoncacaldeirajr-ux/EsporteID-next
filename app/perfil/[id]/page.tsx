import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { EidNotaMetric, EidRankingPtsMetric } from "@/components/ui/eid-metrics";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { podeExibirWhatsappPerfilPublico } from "@/lib/perfil/whatsapp-visibility";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

function waHref(whatsapp: string | null | undefined): string | null {
  const d = String(whatsapp ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") ? d : `55${d}`}`;
}

export default async function PerfilPublicoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const backHref = resolveBackHref(sp.from, "/match");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/perfil/${id}`);

  const { data: perfil } = await supabase
    .from("profiles")
    .select(
      "id, nome, username, avatar_url, whatsapp, localizacao, altura_cm, peso_kg, lado, foto_capa, tipo_usuario, genero, tempo_experiencia, interesse_rank_match, interesse_torneio, disponivel_amistoso, estilo_jogo, bio"
    )
    .eq("id", id)
    .maybeSingle();
  if (!perfil) notFound();

  const isSelf = user.id === id;

  const podeVerWhatsapp = await podeExibirWhatsappPerfilPublico(supabase, user.id, id, isSelf);
  const linkWpp = podeVerWhatsapp ? waHref(perfil.whatsapp) : null;

  const { data: eids } = await supabase
    .from("usuario_eid")
    .select(
      "esporte_id, nota_eid, vitorias, derrotas, pontos_ranking, partidas_jogadas, interesse_match, modalidade_match, posicao_rank, esportes(nome)"
    )
    .eq("usuario_id", id)
    .order("pontos_ranking", { ascending: false });

  const principalEid =
    eids && eids.length > 0
      ? [...eids].sort((a, b) => Number(b.nota_eid ?? 0) - Number(a.nota_eid ?? 0))[0]
      : null;
  const espPrincipal = principalEid
    ? Array.isArray(principalEid.esportes)
      ? principalEid.esportes[0]
      : principalEid.esportes
    : null;

  let vitT = 0;
  let derT = 0;
  for (const e of eids ?? []) {
    vitT += Number(e.vitorias ?? 0);
    derT += Number(e.derrotas ?? 0);
  }
  const jogosT = vitT + derT;
  const winRate = jogosT > 0 ? Math.round((vitT / jogosT) * 100) : null;

  const { data: timesLider } = await supabase
    .from("times")
    .select("id, nome, tipo, escudo, esporte_id, esportes(nome)")
    .eq("criador_id", id)
    .order("id", { ascending: false })
    .limit(12);

  const { data: duplasCadastro } = await supabase
    .from("duplas")
    .select("id, esporte_id, esportes(nome)")
    .or(`player1_id.eq.${id},player2_id.eq.${id}`)
    .limit(12);

  const primeiroEsporte = eids?.[0]?.esporte_id;

  const { data: socioRows } = await supabase
    .from("membership_requests")
    .select("espaco_generico_id, espacos_genericos!inner(id, nome_publico, localizacao)")
    .eq("usuario_id", id)
    .eq("status", "aprovado")
    .limit(20);

  const { data: frequentesRows } = await supabase
    .from("usuario_locais_frequentes")
    .select("visitas, espacos_genericos!inner(id, nome_publico, localizacao)")
    .eq("usuario_id", id)
    .order("visitas", { ascending: false })
    .limit(10);

  return (
    <>
      <DashboardTopbar />
      <main className="mx-auto w-full max-w-lg px-3 pb-8 pt-3 sm:max-w-2xl sm:px-6 sm:pb-10 sm:pt-4">
        <PerfilBackLink href={backHref} label="Voltar" />

        <div className="relative mt-3 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card sm:rounded-2xl">
          <div className="h-24 w-full bg-eid-surface sm:h-28 md:h-32 md:bg-gradient-to-br md:from-eid-primary-500/25 md:to-eid-card">
            {perfil.foto_capa ? (
              <img src={perfil.foto_capa} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="relative px-4 pb-4 pt-0">
            <div className="-mt-12 flex flex-col items-center sm:-mt-14 sm:flex-row sm:items-end sm:gap-4">
              {perfil.avatar_url ? (
                <img
                  src={perfil.avatar_url}
                  alt=""
                  className="h-24 w-24 shrink-0 rounded-2xl border-4 border-eid-bg object-cover shadow-md sm:h-28 sm:w-28 sm:shadow-lg"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-eid-bg bg-eid-surface text-lg font-bold text-eid-primary-300 shadow-md sm:h-28 sm:w-28 sm:shadow-lg">
                  EID
                </div>
              )}
              <div className="mt-3 w-full text-center sm:mt-0 sm:pb-1 sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="text-xl font-bold tracking-tight text-eid-fg sm:text-2xl">
                    {perfil.nome ?? "Atleta"}
                  </h1>
                  <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-eid-primary-300">
                    {perfil.tipo_usuario === "organizador" ? "Organizador" : "Atleta"}
                  </span>
                </div>
                {perfil.username ? <p className="mt-1 text-xs font-medium text-eid-primary-300">@{perfil.username}</p> : null}
                <p className="mt-1 text-sm text-eid-text-secondary">{perfil.localizacao ?? "Localização não informada"}</p>
                {perfil.estilo_jogo ? (
                  <p className="mt-1 inline-flex rounded-full border border-eid-primary-500/30 px-2 py-0.5 text-[10px] font-semibold text-eid-primary-300">
                    {perfil.estilo_jogo}
                  </p>
                ) : null}
                {linkWpp ? (
                  <a
                    href={linkWpp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-1.5 text-xs font-semibold text-[#25D366]"
                  >
                    WhatsApp
                  </a>
                ) : !podeVerWhatsapp && perfil.whatsapp ? (
                  <p className="mt-2 text-xs text-eid-text-secondary">
                    WhatsApp liberado quando houver match aceito entre vocês ou confronto registrado em torneio.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[color:var(--eid-border-subtle)] pt-4 text-center">
              <div>
                <p className="text-lg font-bold text-eid-fg">{vitT}</p>
                <p className="text-[10px] font-bold uppercase text-eid-text-secondary">Vitórias</p>
              </div>
              <div>
                <p className="text-lg font-bold text-eid-fg">{derT}</p>
                <p className="text-[10px] font-bold uppercase text-eid-text-secondary">Derrotas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-eid-action-500">{winRate != null ? `${winRate}%` : "—"}</p>
                <p className="text-[10px] font-bold uppercase text-eid-text-secondary">Aproveit.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <p className="text-xs text-eid-text-secondary">
                Altura: <span className="text-eid-fg">{perfil.altura_cm ?? "—"} cm</span>
              </p>
              <p className="text-xs text-eid-text-secondary">
                Peso: <span className="text-eid-fg">{perfil.peso_kg ?? "—"} kg</span>
              </p>
              <p className="text-xs text-eid-text-secondary">
                Lado: <span className="text-eid-fg">{perfil.lado ?? "—"}</span>
              </p>
            </div>
          </div>
        </div>

        {!isSelf && primeiroEsporte ? (
          <div className="mt-4">
            <Link
              href={`/desafio?id=${encodeURIComponent(id)}&tipo=individual&esporte=${primeiroEsporte}`}
              className="eid-btn-match-cta inline-flex min-h-[46px] w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold sm:w-auto"
            >
              Solicitar Match
            </Link>
          </div>
        ) : null}

        {isSelf ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/onboarding"
              className="eid-btn-primary inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl px-4 text-center text-sm font-bold sm:flex-none"
            >
              Editar perfil
            </Link>
            <Link
              href="/conta/dados-lgpd"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-4 text-center text-sm font-semibold text-eid-fg transition hover:border-eid-primary-500/35 sm:flex-none"
            >
              Dados e privacidade
            </Link>
            <Link
              href="/match"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-eid-primary-500/40 px-4 text-center text-sm font-semibold text-eid-primary-300 sm:flex-none"
            >
              Abrir Match
            </Link>
            <Link
              href="/times?create=1"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-eid-action-500/35 px-4 text-center text-sm font-semibold text-eid-action-400 sm:flex-none"
            >
              Criar Nova Dupla/Time
            </Link>
          </div>
        ) : null}

        {principalEid ? (
          <section className="mt-8 rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-eid-text-secondary">Desempenho principal</p>
            <p className="mt-1 text-sm font-medium text-eid-fg">{espPrincipal?.nome ?? "Esporte"}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <EidNotaMetric value={Number(principalEid.nota_eid ?? 1)} />
              <EidRankingPtsMetric value={Number(principalEid.pontos_ranking ?? 0)} />
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-eid-text-secondary sm:justify-start">
              {principalEid.posicao_rank != null ? (
                <span>
                  Pos. <strong className="text-eid-fg">#{principalEid.posicao_rank}</strong>
                </span>
              ) : null}
              <span>
                {Number(principalEid.partidas_jogadas ?? 0)} jogos · {principalEid.modalidade_match ?? "individual"}
              </span>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-eid-text-secondary">
              A nota EID reflete o histórico de confrontos válidos no esporte. Valores detalhados por esporte abaixo.
            </p>
          </section>
        ) : null}

        {isSelf ? (
          <section className="mt-6 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Preferências de confronto</h2>
            <ul className="mt-3 space-y-2 text-sm text-eid-text-secondary">
              <li>
                <span className="text-eid-fg">Ranking match: </span>
                {perfil.interesse_rank_match !== false ? "Ativo" : "Indisponível"}
              </li>
              <li>
                <span className="text-eid-fg">Jogos amistosos: </span>
                {perfil.disponivel_amistoso !== false ? "Disponível" : "Só ranking"}
              </li>
              <li>
                <span className="text-eid-fg">Torneios: </span>
                {perfil.interesse_torneio !== false ? "Interessado" : "Não informado"}
              </li>
            </ul>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">EID por esporte</h2>
          <div className="mt-3 grid gap-2">
            {(eids ?? []).length === 0 ? (
              <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm text-eid-text-secondary">
                Ainda sem EID registrado por esporte.
              </p>
            ) : (
              (eids ?? []).map((e, idx) => {
                const esp = Array.isArray(e.esportes) ? e.esportes[0] : e.esportes;
                const soRank = e.interesse_match === "ranking";
                return (
                  <article
                    key={`${e.esporte_id}-${idx}`}
                    className="rounded-[var(--eid-radius-lg)] border border-[color:var(--eid-border-subtle)] bg-eid-card p-3.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium text-eid-fg">{esp?.nome ?? "Esporte"}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${
                          soRank
                            ? "border-[color:var(--eid-border-subtle)] bg-eid-surface text-eid-text-secondary"
                            : "border-eid-primary-500/28 bg-eid-primary-500/[0.07] text-eid-primary-300"
                        }`}
                      >
                        {soRank ? "Só ranking" : "Rank + amistoso"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <EidNotaMetric value={Number(e.nota_eid ?? 1)} size="sm" />
                      <EidRankingPtsMetric value={Number(e.pontos_ranking ?? 0)} size="sm" />
                    </div>
                    <p className="mt-2 text-[11px] text-eid-text-secondary">
                      {Number(e.partidas_jogadas ?? 0)} jogos · {e.modalidade_match ?? "individual"}
                      {e.posicao_rank != null ? ` · pos. #${e.posicao_rank}` : ""}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {(timesLider ?? []).length > 0 ? (
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Formações que você lidera</h2>
            <ul className="mt-3 space-y-2">
              {(timesLider ?? []).map((t) => {
                const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
                return (
                  <li key={t.id}>
                    <Link
                      href={`/perfil-time/${t.id}?from=/perfil/${id}`}
                      className="flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 transition hover:border-eid-primary-500/35"
                    >
                      {t.escudo ? (
                        <img src={t.escudo} alt="" className="h-11 w-11 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-eid-surface text-[10px] font-bold text-eid-primary-300">
                          {String(t.tipo ?? "T").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-eid-fg">{t.nome}</p>
                        <p className="text-xs text-eid-text-secondary">
                          {(t.tipo ?? "time").toUpperCase()} · {esp?.nome ?? "Esporte"}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {(duplasCadastro ?? []).length > 0 ? (
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Duplas (cadastro)</h2>
            <ul className="mt-3 space-y-2">
              {(duplasCadastro ?? []).map((d) => {
                const esp = Array.isArray(d.esportes) ? d.esportes[0] : d.esportes;
                return (
                  <li key={d.id}>
                    <Link
                      href={`/perfil-dupla/${d.id}?from=/perfil/${id}`}
                      className="block rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-4 py-3 text-sm font-medium text-eid-fg hover:border-eid-primary-500/35"
                    >
                      Dupla · {esp?.nome ?? "Esporte"} → ver perfil da dupla
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
        {isSelf && !((duplasCadastro ?? []).length > 0 || (timesLider ?? []).length > 0) ? (
          <section className="mt-8 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4">
            <p className="text-sm text-eid-text-secondary">Você ainda não participa de nenhuma dupla/time.</p>
            <Link href="/times?create=1" className="mt-2 inline-flex text-sm font-semibold text-eid-action-400">
              Criar Nova Dupla/Time
            </Link>
          </section>
        ) : null}
        {(socioRows ?? []).length > 0 ? (
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Sócio de</h2>
            <ul className="mt-3 grid gap-2">
              {(socioRows ?? []).map((s, idx) => {
                const esp = Array.isArray(s.espacos_genericos) ? s.espacos_genericos[0] : s.espacos_genericos;
                return (
                  <li key={`${s.espaco_generico_id}-${idx}`}>
                    <Link
                      href={`/local/${esp?.id}?from=/perfil/${id}`}
                      className="block rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-4 py-3 text-sm text-eid-fg hover:border-eid-primary-500/35"
                    >
                      {esp?.nome_publico ?? "Local"} <span className="text-xs text-eid-text-secondary">· {esp?.localizacao ?? "—"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {(frequentesRows ?? []).length > 0 ? (
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Frequência</h2>
            <ul className="mt-3 grid gap-2">
              {(frequentesRows ?? []).map((f, idx) => {
                const esp = Array.isArray(f.espacos_genericos) ? f.espacos_genericos[0] : f.espacos_genericos;
                return (
                  <li key={`${esp?.id}-${idx}`}>
                    <Link
                      href={`/local/${esp?.id}?from=/perfil/${id}`}
                      className="flex items-center justify-between rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-4 py-3 text-sm hover:border-eid-primary-500/35"
                    >
                      <span className="text-eid-fg">{esp?.nome_publico ?? "Local"}</span>
                      <span className="text-xs font-semibold text-eid-primary-300">{f.visitas ?? 0} visitas</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}
