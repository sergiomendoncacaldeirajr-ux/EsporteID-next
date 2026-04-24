import Link from "next/link";
import { redirect } from "next/navigation";
import { DesafioEnviarForm } from "@/components/desafio/desafio-enviar-form";
import { DesafioImpactoResumo } from "@/components/desafio/desafio-impacto-resumo";
import { fetchColetivoRankingPreview, fetchIndividualRankingPreview } from "@/lib/desafio/fetch-impact-preview";
import { getMatchRankCooldownMeses } from "@/lib/app-config/match-rank-cooldown";
import { redirectUnlessMatchMaioridadeConfirmada, safeNextInternalPath } from "@/lib/match/redirect-maioridade-match";
import { computeDisponivelAmistosoEffective } from "@/lib/perfil/disponivel-amistoso";
import { isSportMatchEnabled } from "@/lib/sport-capabilities";
import { createClient } from "@/lib/supabase/server";

type Params = {
  id?: string;
  tipo?: string;
  esporte?: string;
  finalidade?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DesafioPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const desafioQs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string" && v.length > 0) desafioQs.set(k, v);
  }
  const desafioNext = safeNextInternalPath(desafioQs.toString() ? `/desafio?${desafioQs}` : "/desafio");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(desafioNext)}`);

  await redirectUnlessMatchMaioridadeConfirmada(supabase, user.id, desafioNext);

  const tipoRaw = (sp.tipo ?? "individual").toLowerCase();
  const modalidade: "individual" | "dupla" | "time" =
    tipoRaw === "dupla" ? "dupla" : tipoRaw === "time" ? "time" : "individual";
  const alvoKey = (sp.id ?? "").trim();
  const esporteId = Number(sp.esporte ?? "");

  if (!Number.isFinite(esporteId) || esporteId < 1) {
    if (modalidade === "individual" && UUID_RE.test(alvoKey)) {
      const { data: perfilAlvo } = await supabase.from("profiles").select("id, nome").eq("id", alvoKey).maybeSingle();
      const { data: esportesAlvo } = await supabase
        .from("usuario_eid")
        .select("esporte_id, esportes(nome)")
        .eq("usuario_id", alvoKey)
        .order("pontos_ranking", { ascending: false });

      const opcoes = (esportesAlvo ?? [])
        .map((e) => ({
          esporteId: Number(e.esporte_id),
          esporteNome: (Array.isArray(e.esportes) ? e.esportes[0] : e.esportes)?.nome ?? "Esporte",
        }))
        .filter((e) => Number.isFinite(e.esporteId) && e.esporteId > 0 && isSportMatchEnabled(e.esporteNome));

      if (perfilAlvo && perfilAlvo.id !== user.id && opcoes.length > 0) {
        return (
            <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
              <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
              <p className="mt-2 text-sm text-eid-text-secondary">
                Escolha o esporte para desafiar <span className="text-eid-fg">{perfilAlvo.nome ?? "Atleta"}</span>.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {opcoes.map((op) => (
                  <Link
                    key={op.esporteId}
                    href={`/desafio?id=${encodeURIComponent(alvoKey)}&tipo=individual&esporte=${op.esporteId}`}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-eid-action-500/35 bg-eid-action-500/10 px-4 text-xs font-semibold text-eid-action-400"
                  >
                    {op.esporteNome}
                  </Link>
                ))}
              </div>
              <Link
                href={`/perfil/${encodeURIComponent(alvoKey)}?from=/match`}
                className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg"
              >
                Voltar ao perfil
              </Link>
            </main>
        );
      }
    }

    return (
      <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
          <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
          <p className="mt-2 text-sm text-eid-text-secondary">
            Escolha um esporte no radar (não use &quot;Todos&quot;) para enviar um desafio com o esporte correto.
          </p>
          <Link
            href="/match"
            className="mt-4 inline-flex rounded-xl border border-eid-primary-500/40 px-4 py-2 text-xs font-semibold text-eid-fg"
          >
            Voltar ao radar
          </Link>
        </main>
    );
  }

  const { data: esporteRow } = await supabase.from("esportes").select("id, nome").eq("id", esporteId).maybeSingle();
  if (!esporteRow || !isSportMatchEnabled(esporteRow.nome)) {
    return (
      <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
        <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
        <p className="mt-2 text-sm text-eid-text-secondary">Este esporte não aceita desafio/ranking no momento.</p>
        <Link href="/match" className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
          Voltar ao radar
        </Link>
      </main>
    );
  }
  const esporteNome = esporteRow?.nome ?? `Esporte #${esporteId}`;

  if (modalidade === "individual") {
    if (!UUID_RE.test(alvoKey)) {
      return (
        <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
            <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
            <p className="mt-2 text-sm text-red-200">Identificador do atleta inválido.</p>
            <Link href="/match" className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
              Voltar ao radar
            </Link>
          </main>
      );
    }

    const { data: perfil } = await supabase
      .from("profiles")
      .select("id, nome, disponivel_amistoso, disponivel_amistoso_ate")
      .eq("id", alvoKey)
      .maybeSingle();
    if (!perfil || perfil.id === user.id) {
      return (
        <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
            <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
            <p className="mt-2 text-sm text-eid-text-secondary">Atleta não encontrado ou inválido para desafio.</p>
            <Link href="/match" className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
              Voltar ao radar
            </Link>
          </main>
      );
    }

    const finRaw = String(sp.finalidade ?? "").trim().toLowerCase();
    const finalidadeEscolhida: "ranking" | "amistoso" | null =
      finRaw === "amistoso" ? "amistoso" : finRaw === "ranking" ? "ranking" : null;

    if (!finalidadeEscolhida) {
      const [{ data: viewerProf }, cooldownMeses] = await Promise.all([
        supabase.from("profiles").select("disponivel_amistoso, disponivel_amistoso_ate").eq("id", user.id).maybeSingle(),
        getMatchRankCooldownMeses(supabase),
      ]);
      const viewerAm = computeDisponivelAmistosoEffective(
        viewerProf?.disponivel_amistoso,
        viewerProf?.disponivel_amistoso_ate
      );
      const alvoAm = computeDisponivelAmistosoEffective(perfil.disponivel_amistoso, perfil.disponivel_amistoso_ate);
      const amistosoPermitido = viewerAm && alvoAm;
      const baseQs = `id=${encodeURIComponent(alvoKey)}&tipo=individual&esporte=${esporteId}`;

      return (
        <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
            <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
            <p className="mt-2 text-sm text-eid-text-secondary">
              <span className="text-eid-fg">{perfil.nome ?? "Atleta"}</span> · {esporteNome} (individual). Escolha o tipo de confronto.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href={`/desafio?${baseQs}&finalidade=ranking`}
                className="rounded-2xl border border-eid-primary-500/35 bg-eid-primary-500/10 p-4 transition hover:border-eid-primary-500/55 hover:bg-eid-primary-500/15"
              >
                <p className="text-xs font-black uppercase tracking-[0.12em] text-eid-primary-300">Desafio de ranking</p>
                <p className="mt-2 text-sm font-semibold text-eid-fg">Vale pontos no ranking</p>
                <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
                  Após aceito, use a agenda para agendar e o lançador de resultado. Novo desafio de ranking com a mesma pessoa neste esporte só após{" "}
                  <span className="font-semibold text-eid-fg">{cooldownMeses}</span> meses do último confronto válido.
                </p>
              </Link>

              {amistosoPermitido ? (
                <Link
                  href={`/desafio?${baseQs}&finalidade=amistoso`}
                  className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 transition hover:border-emerald-500/55 hover:bg-emerald-500/15"
                >
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-300">Desafio amistoso</p>
                  <p className="mt-2 text-sm font-semibold text-eid-fg">Sem pontos · combinar no WhatsApp</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
                    Não há carência de meses entre pedidos amistosos com a mesma pessoa: você pode solicitar de novo quando quiser. Não abre fluxo de agenda nem placar de ranking. Para pontos e agendamento oficial, use{" "}
                    <span className="font-semibold text-eid-fg">desafio de ranking</span>.
                  </p>
                </Link>
              ) : (
                <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4 opacity-70">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-eid-text-secondary">Desafio amistoso</p>
                  <p className="mt-2 text-sm font-semibold text-eid-text-secondary">Indisponível</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
                    Você e o oponente precisam estar com o <span className="font-semibold">modo amistoso</span> ligado no perfil (janela ativa).
                  </p>
                </div>
              )}
            </div>

            <Link
              href={`/perfil/${encodeURIComponent(alvoKey)}`}
              className="mt-6 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg"
            >
              Voltar ao perfil
            </Link>
          </main>
      );
    }

    const rankPrevInd =
      finalidadeEscolhida === "ranking"
        ? await fetchIndividualRankingPreview(supabase, {
            viewerId: user.id,
            opponentId: perfil.id,
            esporteId,
          })
        : null;

    return (
      <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
          <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
          <p className="mt-2 text-sm text-eid-text-secondary">
            Confirme o pedido no esporte <span className="text-eid-fg">{esporteNome}</span> (individual) ·{" "}
            <span className="font-semibold text-eid-fg">
              {finalidadeEscolhida === "amistoso" ? "Desafio amistoso" : "Desafio de ranking"}
            </span>
            .
          </p>
          {finalidadeEscolhida === "amistoso" ? (
            <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] leading-relaxed text-eid-text-secondary">
              Este pedido <span className="font-semibold text-emerald-200">não soma pontos</span> e não usa agenda de ranking. O WhatsApp será liberado após aceite, para vocês combinarem. Para confronto que valha ranking, agenda e resultado, volte ao perfil e escolha{" "}
              <span className="font-semibold text-eid-fg">desafio de ranking</span>.
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 px-3 py-2 text-[11px] leading-relaxed text-eid-text-secondary">
              Desafio de ranking: após aceito, use a <span className="font-semibold text-eid-fg">agenda</span> e o lançamento de resultado para atualizar o ranking.
            </div>
          )}
          <div className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 sm:rounded-2xl sm:p-4">
            <p className="text-sm font-semibold text-eid-fg">{perfil.nome ?? "Atleta"}</p>
            <p className="mt-1 text-xs text-eid-text-secondary">Modalidade: individual</p>
          </div>
          {finalidadeEscolhida === "ranking" && rankPrevInd ? (
            <DesafioImpactoResumo
              esporteNome={esporteNome}
              regras={rankPrevInd.regras}
              individual={rankPrevInd.perspective}
            />
          ) : null}
          <DesafioEnviarForm
            modalidade="individual"
            esporteId={esporteId}
            alvoUsuarioId={perfil.id}
            finalidade={finalidadeEscolhida}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/desafio?id=${encodeURIComponent(alvoKey)}&tipo=individual&esporte=${esporteId}`}
              className="inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg"
            >
              ← Trocar tipo de desafio
            </Link>
            <Link href="/match" className="inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
              Cancelar
            </Link>
          </div>
        </main>
    );
  }

  const timeId = Number(alvoKey);
  if (!Number.isFinite(timeId) || timeId < 1) {
    return (
      <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
          <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
          <p className="mt-2 text-sm text-red-200">Identificador da formação inválido.</p>
          <Link href="/match" className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
            Voltar ao radar
          </Link>
        </main>
    );
  }

  const { data: timeRow } = await supabase
    .from("times")
    .select("id, nome, tipo, esporte_id, criador_id")
    .eq("id", timeId)
    .maybeSingle();

  const tipoFormacao = String(timeRow?.tipo ?? "")
    .trim()
    .toLowerCase();
  if (!timeRow || (tipoFormacao !== "dupla" && tipoFormacao !== "time") || tipoFormacao !== modalidade) {
    return (
      <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
          <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
          <p className="mt-2 text-sm text-eid-text-secondary">Formação não encontrada ou modalidade diferente do link.</p>
          <Link href="/match" className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
            Voltar ao radar
          </Link>
        </main>
    );
  }

  if (Number(timeRow.esporte_id) !== esporteId) {
    return (
      <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
          <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
          <p className="mt-2 text-sm text-eid-text-secondary">O esporte selecionado não confere com esta formação. Ajuste o filtro no radar.</p>
          <Link href="/match" className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
            Voltar ao radar
          </Link>
        </main>
    );
  }

  const rankPrevCo = await fetchColetivoRankingPreview(supabase, {
    viewerUserId: user.id,
    opponentTeamId: timeRow.id,
    esporteId,
    modalidade: modalidade as "dupla" | "time",
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-4">
        <h1 className="text-lg font-bold text-eid-fg">Solicitar desafio</h1>
        <p className="mt-2 text-sm text-eid-text-secondary">
          Confirme o pedido no esporte <span className="text-eid-fg">{esporteNome}</span> ({modalidade === "dupla" ? "dupla" : "time"}).
        </p>
        <div className="mt-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 sm:rounded-2xl sm:p-4">
          <p className="text-sm font-semibold text-eid-fg">{timeRow.nome ?? "Formação"}</p>
          <p className="mt-1 text-xs text-eid-text-secondary">Modalidade: {modalidade}</p>
        </div>
        {rankPrevCo ? (
          <DesafioImpactoResumo esporteNome={esporteNome} regras={rankPrevCo.regras} coletivo={rankPrevCo.coletivo} />
        ) : (
          <p className="mt-3 text-[11px] text-amber-200/90">
            Não foi possível carregar a estimativa: confira se você é líder de uma {modalidade} neste esporte (mesmo critério do envio do pedido).
          </p>
        )}
        <DesafioEnviarForm modalidade={modalidade} esporteId={esporteId} alvoTimeId={timeRow.id} finalidade="ranking" />
        <Link href="/match" className="mt-4 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-semibold text-eid-fg">
          Cancelar
        </Link>
      </main>
  );
}
