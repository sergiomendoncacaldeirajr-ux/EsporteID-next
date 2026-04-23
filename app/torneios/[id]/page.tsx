import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PerfilBackLink } from "@/components/perfil/perfil-back-link";
import { resolveBackHref } from "@/lib/perfil/back-href";
import { createClient } from "@/lib/supabase/server";
import { solicitarInscricaoTorneio } from "@/app/torneios/actions";
import { formatTorneioCategorias, parseTorneioCategorias } from "@/lib/torneios/categorias";
import { labelStatusTorneio } from "@/lib/torneios/catalog";
import { linhasResumoRegras, parseRegrasPlacarJson } from "@/lib/torneios/regras";
import { contaEditarTorneioHref } from "@/lib/routes/conta";
import { canLaunchTorneioScore, getTorneioStaffAccess } from "@/lib/torneios/staff";
import { canAccessSystemFeature, getSystemFeatureConfig } from "@/lib/system-features";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string; erro?: string; ok?: string }>;
};

function flashClass(ok: boolean) {
  return ok
    ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
    : "border-red-400/35 bg-red-500/10 text-red-100";
}

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
  const featureCfg = await getSystemFeatureConfig(supabase);
  if (!canAccessSystemFeature(featureCfg, "torneios", user.id)) {
    redirect("/dashboard");
  }

  const { data: t } = await supabase
    .from("torneios")
    .select(
      "id, nome, status, data_inicio, data_fim, banner, logo_arquivo, lat, lng, categoria, categorias_json, descricao, regulamento, premios, valor_inscricao, formato_competicao, criterio_desempate, regras_placar_json, criador_id, espaco_generico_id, esporte_id, esportes(nome)"
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

  const { count: totalInscritos } = await supabase
    .from("torneio_inscricoes")
    .select("id", { count: "exact", head: true })
    .eq("torneio_id", id);

  const { data: minhaInscricao } = await supabase
    .from("torneio_inscricoes")
    .select("id, status_inscricao, payment_status")
    .eq("torneio_id", id)
    .eq("usuario_id", user.id)
    .maybeSingle();

  const { data: temChave } = await supabase.from("torneio_chaves").select("id").eq("torneio_id", id).maybeSingle();

  const esp = Array.isArray(t.esportes) ? t.esportes[0] : t.esportes;
  const isOrganizadorTorneio = t.criador_id === user.id;
  const staffAccess = await getTorneioStaffAccess(supabase, id, user.id);
  const parsedRegras = parseRegrasPlacarJson(t.regras_placar_json);
  const [{ data: minhasDuplas }, { data: meusTimes }] = await Promise.all([
    parsedRegras?.modalidade_participacao === "dupla"
      ? supabase
          .from("duplas")
          .select("id, player1_id, player2_id")
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      : Promise.resolve({ data: [] as Array<{ id: number; player1_id: string; player2_id: string }> }),
    parsedRegras?.modalidade_participacao === "equipe"
      ? supabase.from("times").select("id, nome, criador_id").eq("criador_id", user.id)
      : Promise.resolve({ data: [] as Array<{ id: number; nome: string | null; criador_id: string }> }),
  ]);
  const categoriasPublico = parseTorneioCategorias(t.categorias_json);
  const linhasRegras = linhasResumoRegras(t.formato_competicao, t.criterio_desempate, parsedRegras);

  const flashOk = sp.ok === "inscricao";
  const flashErro =
    sp.erro === "torneio"
      ? "Torneio não encontrado."
      : sp.erro === "proprio"
        ? "Você é o organizador deste torneio."
        : sp.erro === "inscricoes_fechadas"
          ? "Inscrições não estão abertas para este status."
          : sp.erro === "ja_inscrito"
            ? "Você já está inscrito."
            : sp.erro === "inscricao"
              ? "Não foi possível concluir a inscrição."
              : sp.erro === "vagas"
                ? "Todas as vagas foram preenchidas."
                : null;

  const podeInscricao =
    !isOrganizadorTorneio && t.status === "aberto" && !minhaInscricao && !(parsedRegras?.vagas_max && totalInscritos != null && totalInscritos >= (parsedRegras.vagas_max ?? 0));

  return (
    <main className="mx-auto w-full max-w-5xl px-3 pb-10 pt-3 sm:px-6 sm:pb-12 sm:pt-4">
        <PerfilBackLink href={backHref} label="Voltar aos torneios" />

        {flashOk ? (
          <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${flashClass(true)}`} role="status">
            Inscrição registrada como pendente. O pagamento online será integrado em breve; acompanhe o status abaixo.
          </p>
        ) : null}
        {flashErro ? (
          <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${flashClass(false)}`} role="alert">
            {flashErro}
          </p>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-none md:rounded-3xl md:shadow-xl md:shadow-black/25">
          <div className="h-1.5 w-full bg-gradient-to-r from-eid-primary-500 via-eid-action-500 to-eid-primary-400" />
          {t.banner ? (
            <div className="h-36 w-full sm:h-44 md:h-52">
              <img src={t.banner} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="h-28 bg-gradient-to-br from-eid-action-500/30 via-eid-primary-500/15 to-eid-card sm:h-36 md:h-44" />
          )}
          <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-eid-primary-500/35 bg-eid-primary-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-eid-primary-300">
                {labelStatusTorneio(t.status)}
              </span>
              {temChave ? (
                <Link
                  href={`/torneios/${id}/chave?from=/torneios/${id}`}
                  className="rounded-full border border-eid-action-500/40 bg-eid-action-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-eid-action-500"
                >
                  Ver chave
                </Link>
              ) : null}
            </div>
            {t.logo_arquivo ? <img src={t.logo_arquivo} alt="" className="mt-4 h-14 w-14 rounded-2xl object-cover" /> : null}
            <h1 className="mt-3 text-2xl font-black tracking-tight text-eid-fg md:text-3xl">{t.nome}</h1>
            {isOrganizadorTorneio ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`${contaEditarTorneioHref(id)}?from=${encodeURIComponent(`/torneios/${id}`)}`}
                  className="inline-flex rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-eid-primary-300 hover:border-eid-primary-500/65"
                >
                  Editar torneio
                </Link>
                <Link
                  href={`/torneios/${id}/operacao?from=${encodeURIComponent(`/torneios/${id}`)}`}
                  className="inline-flex rounded-xl border border-eid-action-500/45 bg-eid-action-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-eid-action-400 hover:border-eid-action-500/65"
                >
                  Operar placares
                </Link>
              </div>
            ) : null}
            {!isOrganizadorTorneio && canLaunchTorneioScore(staffAccess) ? (
              <Link
                href={`/torneios/${id}/operacao?from=${encodeURIComponent(`/torneios/${id}`)}`}
                className="mt-3 inline-flex rounded-xl border border-eid-action-500/45 bg-eid-action-500/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-eid-action-400 hover:border-eid-action-500/65"
              >
                Área do lançador
              </Link>
            ) : null}
            <p className="mt-2 text-sm font-semibold text-eid-primary-300">{esp?.nome ?? "Esporte a definir"}</p>
            {t.categoria ? <p className="mt-2 text-xs text-eid-text-secondary">Categoria: {t.categoria}</p> : null}
            {categoriasPublico.length > 0 ? (
              <p className="mt-1 text-xs text-eid-text-secondary">
                Públicos: <span className="font-semibold text-eid-fg">{formatTorneioCategorias(categoriasPublico)}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 md:rounded-3xl md:p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Datas</h2>
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-eid-text-secondary">
                Início:{" "}
                <span className="font-semibold text-eid-fg">
                  {t.data_inicio ? new Date(t.data_inicio).toLocaleDateString("pt-BR") : "A definir"}
                </span>
              </p>
              <p className="text-eid-text-secondary">
                Término:{" "}
                <span className="font-semibold text-eid-fg">
                  {t.data_fim ? new Date(t.data_fim).toLocaleDateString("pt-BR") : "A definir"}
                </span>
              </p>
            </div>
            <p className="mt-4 text-eid-text-secondary">
              Inscrição:{" "}
              <span className="text-xl font-black text-eid-action-500">R$ {Number(t.valor_inscricao ?? 0).toFixed(2)}</span>
            </p>
            <p className="mt-3 text-xs text-eid-text-secondary">
              Inscritos:{" "}
              <span className="font-bold text-eid-fg">
                {totalInscritos ?? 0}
                {parsedRegras?.vagas_max ? ` / ${parsedRegras.vagas_max} vagas` : ""}
              </span>
            </p>
          </section>

          <section className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 md:rounded-3xl md:p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Inscrição</h2>
            {minhaInscricao ? (
              <div className="mt-3 rounded-2xl border border-eid-primary-500/25 bg-eid-primary-500/10 px-4 py-3 text-sm">
                <p className="font-semibold text-eid-fg">Sua inscrição</p>
                <p className="mt-1 text-xs text-eid-text-secondary">
                  Status: <span className="font-bold text-eid-fg">{minhaInscricao.status_inscricao}</span> · Pagamento:{" "}
                  <span className="font-bold text-eid-fg">{minhaInscricao.payment_status}</span>
                </p>
                <p className="mt-2 text-[11px] text-eid-text-secondary">
                  Cobrança online (Asaas/outro) será ligada ao fluxo em uma próxima etapa.
                </p>
              </div>
            ) : isOrganizadorTorneio ? (
              <p className="mt-3 text-sm text-eid-text-secondary">Você é o organizador deste torneio.</p>
            ) : podeInscricao ? (
              <form action={solicitarInscricaoTorneio} className="mt-3">
                <input type="hidden" name="torneio_id" value={id} />
                {parsedRegras?.modalidade_participacao === "dupla" ? (
                  <select
                    name="dupla_id"
                    required
                    className="eid-input-dark mb-3 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Selecione sua dupla (pagamento pelo dono da entidade)
                    </option>
                    {(minhasDuplas ?? []).map((dupla) => (
                      <option key={dupla.id} value={dupla.id}>
                        Dupla #{dupla.id}
                      </option>
                    ))}
                  </select>
                ) : null}
                {parsedRegras?.modalidade_participacao === "equipe" ? (
                  <select
                    name="time_id"
                    required
                    className="eid-input-dark mb-3 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Selecione seu time (pagamento pelo dono da entidade)
                    </option>
                    {(meusTimes ?? []).map((time) => (
                      <option key={time.id} value={time.id}>
                        {time.nome ?? `Time #${time.id}`}
                      </option>
                    ))}
                  </select>
                ) : null}
                <button type="submit" className="eid-btn-primary w-full min-h-[48px] rounded-2xl text-sm font-black uppercase tracking-wide">
                  Solicitar inscrição
                </button>
                <p className="mt-2 text-[11px] text-eid-text-secondary">
                  A entrada no torneio só acontece após pagamento confirmado pela plataforma.
                </p>
              </form>
            ) : (
              <p className="mt-3 text-sm text-eid-text-secondary">
                {t.status !== "aberto"
                  ? "Inscrições não estão abertas para o status atual do torneio."
                  : "Não é possível inscrever-se no momento (vagas esgotadas ou restrição do evento)."}
              </p>
            )}
            <Link
              href={`/torneios/${id}/chave?from=/torneios/${id}`}
              className="mt-4 inline-block text-xs font-bold text-eid-primary-300 hover:underline"
            >
              {temChave ? "Abrir chaveamento" : "Chaveamento (ainda vazio)"} →
            </Link>
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 md:rounded-3xl md:p-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Formato e regras</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {linhasRegras.map((row) => (
              <li key={row.titulo} className="flex flex-col gap-0.5 border-b border-[color:var(--eid-border-subtle)]/60 pb-2 last:border-0 md:flex-row md:justify-between">
                <span className="text-eid-text-secondary">{row.titulo}</span>
                <span className="font-medium text-eid-fg">{row.valor}</span>
              </li>
            ))}
          </ul>
        </section>

        {org ? (
          <section className="mt-6 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 md:rounded-3xl md:p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Organização</h2>
            <Link
              href={`/perfil/${org.id}?from=/torneios/${id}`}
              className="mt-4 flex items-center gap-3 transition hover:opacity-90"
            >
              {org.avatar_url ? (
                <img src={org.avatar_url} alt="" className="h-14 w-14 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-eid-surface text-xs font-bold text-eid-primary-300">
                  EID
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-eid-fg">{org.nome ?? "Organizador"}</p>
                <p className="text-xs text-eid-text-secondary">Ver perfil e contato</p>
              </div>
            </Link>
          </section>
        ) : null}

        {sede ? (
          <section className="mt-6 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 md:rounded-3xl md:p-6">
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
            <p className="mt-2 whitespace-pre-wrap rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm leading-relaxed text-eid-text-secondary md:rounded-3xl md:p-6">
              {t.descricao}
            </p>
          </section>
        ) : null}

        {t.regulamento ? (
          <section className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Regulamento</h2>
            <div className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm leading-relaxed text-eid-text-secondary md:rounded-3xl md:p-6">
              {t.regulamento}
            </div>
          </section>
        ) : null}

        {t.premios ? (
          <section className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Prêmios</h2>
            <p className="mt-2 whitespace-pre-wrap rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 text-sm leading-relaxed text-eid-text-secondary md:rounded-3xl md:p-6">
              {t.premios}
            </p>
          </section>
        ) : null}
      </main>
  );
}
