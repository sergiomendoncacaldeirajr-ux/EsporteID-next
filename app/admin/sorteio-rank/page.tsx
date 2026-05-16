import { Shuffle } from "lucide-react";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";
import {
  adminCancelarEdicao,
  adminEnviarParaAprovacao,
  adminMarcarWo,
  adminPublicarSorteio,
} from "./actions";
import { listarEdicoesAdmin, listarConfrontosEdicao } from "@/lib/sorteio-rank/queries";
import { SorteioSimularForm } from "./sorteio-admin-client";
import type { EdicaoComContagem } from "@/lib/sorteio-rank/queries";
import type { SorteioAlgoritmoLog } from "@/lib/sorteio-rank/types";

export const metadata = { title: "Sorteio de Ranking · Admin" };

// ── Helpers de exibição ──────────────────────────────────────
const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  simulacao: {
    label: "Simulação",
    cls: "border-amber-500/35 bg-amber-500/10 text-amber-200",
  },
  pendente_aprovacao: {
    label: "Aguardando aprovação",
    cls: "border-eid-primary-500/35 bg-eid-primary-500/10 text-eid-primary-200",
  },
  publicado: {
    label: "Publicado",
    cls: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
  },
  cancelado: {
    label: "Cancelado",
    cls: "border-rose-500/35 bg-rose-500/10 text-rose-300",
  },
};

const CONFRONTO_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  wo_lado1: "WO → Lado 1 vence",
  wo_lado2: "WO → Lado 2 vence",
  wo_duplo: "WO Duplo",
  cancelado: "Cancelado",
};

const MODO_GENERO_LABEL: Record<string, string> = {
  mesmo_genero: "Mesmo gênero",
  misto: "Misto",
};

function fmtMes(mesRef: string): string {
  // "2026-06-01" → "jun/2026"
  const d = new Date(mesRef + "T12:00:00Z");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(". ", "/");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_LABEL[status] ?? { label: status, cls: "border-gray-500/35 bg-gray-500/10 text-gray-300" };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ── Painel de confrontos de uma edição ───────────────────────
async function PainelConfrontos({ edicao }: { edicao: EdicaoComContagem }) {
  if (!hasServiceRoleConfig()) return null;
  const db = createServiceRoleClient();
  const confrontos = await listarConfrontosEdicao(db, edicao.id);

  const isEditable = ["simulacao", "pendente_aprovacao"].includes(edicao.status);
  const isPublicado = edicao.status === "publicado";

  return (
    <div className="mt-4 space-y-3">
      {confrontos.length === 0 && (
        <p className="text-xs text-eid-text-muted">Nenhum confronto nesta edição.</p>
      )}
      {confrontos.map((c) => {
        const lado1Id = c.lado1_usuario_id
          ? `Usuário ${String(c.lado1_usuario_id).slice(0, 8)}…`
          : c.lado1_time_id
            ? `Time #${c.lado1_time_id}`
            : "—";
        const lado2Id = c.lado2_usuario_id
          ? `Usuário ${String(c.lado2_usuario_id).slice(0, 8)}…`
          : c.lado2_time_id
            ? `Time #${c.lado2_time_id}`
            : "—";
        const confrontoStatus =
          CONFRONTO_STATUS_LABEL[c.status] ?? c.status;
        const modoGenero = MODO_GENERO_LABEL[c.modo_genero] ?? c.modo_genero;

        return (
          <article
            key={c.id}
            className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-mono text-eid-text-muted">
                  #{c.id} · {modoGenero}
                  {c.distancia_km != null &&
                    ` · ${Number(c.distancia_km).toFixed(1)} km`}
                  {c.delta_rank != null && ` · ΔRank ${c.delta_rank}`}
                </p>

                <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <p className="truncate text-sm font-semibold text-eid-fg">{lado1Id}</p>
                  <span className="text-[10px] font-black text-eid-text-muted">×</span>
                  <p className="truncate text-right text-sm font-semibold text-eid-fg">{lado2Id}</p>
                </div>

                {/* WO tracking (publicado) */}
                {isPublicado && (
                  <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-eid-text-muted">
                    <span>
                      Lado 1 agendou:{" "}
                      <strong className={c.lado1_tentou_agendar ? "text-emerald-400" : "text-rose-400"}>
                        {c.lado1_tentou_agendar ? "Sim" : "Não"}
                      </strong>
                    </span>
                    <span>
                      Lado 2 agendou:{" "}
                      <strong className={c.lado2_tentou_agendar ? "text-emerald-400" : "text-rose-400"}>
                        {c.lado2_tentou_agendar ? "Sim" : "Não"}
                      </strong>
                    </span>
                  </div>
                )}

                <p className="mt-1 text-[10px] text-eid-text-muted">
                  Prazo: {fmtDate(c.data_limite)} · Status:{" "}
                  <strong className="text-eid-fg">{confrontoStatus}</strong>
                </p>
              </div>

              {/* Ações WO (admin, só publicado e pendente) */}
              {isPublicado && c.status === "pendente" && (
                <div className="flex flex-col gap-1.5">
                  {(["wo_lado1", "wo_lado2", "wo_duplo"] as const).map((tipo) => (
                    <form key={tipo} action={adminMarcarWo}>
                      <input type="hidden" name="confronto_id" value={c.id} />
                      <input type="hidden" name="tipo_wo" value={tipo} />
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-200 transition hover:border-amber-400/50"
                      >
                        {tipo === "wo_lado1"
                          ? "WO → L1"
                          : tipo === "wo_lado2"
                            ? "WO → L2"
                            : "WO Duplo"}
                      </button>
                    </form>
                  ))}
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default async function AdminSorteioRankPage() {
  if (!hasServiceRoleConfig()) {
    return (
      <p className="text-sm text-eid-text-secondary">
        Configure a service role para acessar esta área.
      </p>
    );
  }

  const db = createServiceRoleClient();

  const [edicoes, esportesRes] = await Promise.all([
    listarEdicoesAdmin(db, 20),
    db.from("esportes").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  const esportes = (esportesRes.data ?? []).map((e) => ({
    id: Number(e.id),
    nome: String(e.nome),
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="eid-admin-card overflow-hidden p-5 md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/10">
            <Shuffle className="h-5 w-5 text-eid-primary-300" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-eid-action-400">
              Modo teste
            </p>
            <h1 className="text-xl font-black text-eid-fg">Sorteio de Ranking Mensal</h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-eid-text-secondary">
          Gere, revise e publique os confrontos mensais de ranking. O sorteio usa o mesmo
          gênero como prioridade (até 30 km), com fallback misto. Cada confronto ocupa{" "}
          <strong className="text-eid-fg">1 dos 4 slots mensais</strong> do atleta. O prazo é o
          último dia do mês de referência.
        </p>

        {/* Legenda de regras */}
        <div className="mt-4 grid gap-2 text-[11px] text-eid-text-muted sm:grid-cols-2">
          {[
            "Raio máximo: 30 km entre os dois lados.",
            "Prioridade: mesmo gênero; fallback misto se insuficiente.",
            "Evita repetir pares dos últimos 2 meses (mas pode se necessário).",
            "Mínimo 2 candidatos no mesmo esporte/modalidade/região.",
            "WO automático ao fim do mês se nenhum lado agendou.",
            "Oponente que tentou agendar e foi recusado ganha por WO.",
          ].map((r) => (
            <p key={r} className="flex gap-1.5">
              <span className="mt-0.5 shrink-0 text-eid-primary-400">▸</span>
              {r}
            </p>
          ))}
        </div>
      </div>

      {/* Formulário de simulação */}
      <section className="eid-admin-card p-5">
        <h2 className="mb-4 text-sm font-black text-eid-fg">
          Simular novo sorteio{" "}
          <span className="ml-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">
            Sem publicar
          </span>
        </h2>
        <p className="mb-4 text-xs text-eid-text-secondary">
          A simulação executa o algoritmo e salva os pares para revisão. Nenhum usuário é
          notificado até a publicação.
        </p>
        <SorteioSimularForm esportes={esportes} />
      </section>

      {/* Lista de edições */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-black text-eid-fg">Edições ({edicoes.length})</h2>
        </div>

        {edicoes.length === 0 && (
          <p className="text-sm text-eid-text-muted">Nenhuma edição gerada ainda.</p>
        )}

        {edicoes.map((ed) => {
          const algLog = ed.algoritmo_log as SorteioAlgoritmoLog | null;
          const isEditable = ["simulacao", "pendente_aprovacao"].includes(ed.status);
          const isPub = ed.status === "publicado";

          return (
            <article
              key={ed.id}
              className="eid-admin-card overflow-hidden"
            >
              {/* Cabeçalho da edição */}
              <div className="flex flex-wrap items-start justify-between gap-3 p-4 md:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={ed.status} />
                    <span className="text-[10px] font-mono text-eid-text-muted">
                      #{ed.id}
                    </span>
                    <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-2 py-0.5 text-[10px] font-semibold text-eid-text-secondary">
                      {MODO_GENERO_LABEL[ed.modo_genero] ?? ed.modo_genero}
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-base font-black text-eid-fg">
                    {ed.esporte_nome} · {ed.modalidade} · {fmtMes(ed.mes_ref)}
                  </h3>

                  <p className="mt-0.5 text-[11px] text-eid-text-muted">
                    {ed.total_confrontos} par(es) sorteado(s) · criado em{" "}
                    {fmtDate(ed.criado_em)}
                    {ed.publicado_em && ` · publicado em ${fmtDate(ed.publicado_em)}`}
                  </p>

                  {/* Log resumido */}
                  {algLog && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[10px] font-bold text-eid-primary-300 hover:underline">
                        Ver log do algoritmo
                      </summary>
                      <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/30 p-2">
                        {algLog.log?.map((l, i) => (
                          <p key={i} className="text-[10px] leading-relaxed text-eid-text-muted">
                            {l}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>

                {/* Ações de fluxo */}
                <div className="flex flex-wrap gap-2">
                  {ed.status === "simulacao" && (
                    <>
                      <form action={adminEnviarParaAprovacao}>
                        <input type="hidden" name="edicao_id" value={ed.id} />
                        <button
                          type="submit"
                          className="rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/15 px-3 py-1.5 text-[11px] font-bold text-eid-primary-200 transition hover:border-eid-primary-500/60"
                        >
                          Enviar para aprovação
                        </button>
                      </form>
                      <form action={adminCancelarEdicao}>
                        <input type="hidden" name="edicao_id" value={ed.id} />
                        <button
                          type="submit"
                          className="rounded-xl border border-rose-500/35 px-3 py-1.5 text-[11px] font-bold text-rose-300 transition hover:border-rose-400/50"
                        >
                          Descartar
                        </button>
                      </form>
                    </>
                  )}

                  {ed.status === "pendente_aprovacao" && (
                    <>
                      <form action={adminPublicarSorteio}>
                        <input type="hidden" name="edicao_id" value={ed.id} />
                        <button
                          type="submit"
                          className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-[11px] font-black text-emerald-200 transition hover:border-emerald-400/60"
                        >
                          ✓ Publicar e notificar
                        </button>
                      </form>
                      <form action={adminCancelarEdicao}>
                        <input type="hidden" name="edicao_id" value={ed.id} />
                        <button
                          type="submit"
                          className="rounded-xl border border-rose-500/35 px-3 py-1.5 text-[11px] font-bold text-rose-300 transition hover:border-rose-400/50"
                        >
                          Cancelar
                        </button>
                      </form>
                    </>
                  )}

                  {isPub && (
                    <span className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
                      Ativo — aguardando resultados
                    </span>
                  )}
                </div>
              </div>

              {/* Confrontos da edição */}
              <div className="border-t border-[color:var(--eid-border-subtle)] px-4 pb-4 pt-3 md:px-5">
                <PainelConfrontos edicao={ed} />
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
