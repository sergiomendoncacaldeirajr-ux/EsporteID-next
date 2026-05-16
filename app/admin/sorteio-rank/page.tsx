import { Shuffle, UserX } from "lucide-react";
import { createServiceRoleClient, hasServiceRoleConfig } from "@/lib/supabase/service-role";
import {
  adminCancelarEdicao,
  adminEnviarParaAprovacao,
  adminPublicarSorteio,
  adminReativarParticipante,
} from "./actions";
import {
  listarEdicoesAdmin,
  listarConfrontosEdicaoComPerfis,
  buscarOptOuts,
} from "@/lib/sorteio-rank/queries";
import { SorteioSimularForm, ConfrontosGrid } from "./sorteio-admin-client";
import type { EdicaoComContagem, OptOutPerfil } from "@/lib/sorteio-rank/queries";
import type { SorteioAlgoritmoLog } from "@/lib/sorteio-rank/types";

export const metadata = { title: "Sorteio de Ranking · Admin" };

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

function fmtMes(mesRef: string): string {
  const d = new Date(mesRef + "T12:00:00Z");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(". ", "/");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_LABEL[status] ?? { label: status, cls: "border-gray-500/35 bg-gray-500/10 text-gray-300" };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ── Seção de opt-outs ────────────────────────────────────────
function OptOutAvatar({ nome, avatarUrl }: { nome: string; avatarUrl: string | null }) {
  const iniciais = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={nome} className="h-9 w-9 rounded-full object-cover ring-2 ring-[color:var(--eid-border-subtle)]" />;
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-eid-primary-500/15 ring-2 ring-[color:var(--eid-border-subtle)]">
      <span className="text-[10px] font-black text-eid-primary-300">{iniciais || "?"}</span>
    </div>
  );
}

function OptOutList({ perfis }: { perfis: OptOutPerfil[] }) {
  if (perfis.length === 0) {
    return (
      <p className="text-xs text-eid-text-muted">
        Nenhum atleta optou por sair do sorteio de ranking.
      </p>
    );
  }

  return (
    <div className="divide-y divide-[color:var(--eid-border-subtle)]">
      {perfis.map((p) => (
        <div key={p.id} className="flex items-center gap-3 py-2.5">
          <OptOutAvatar nome={p.nome} avatarUrl={p.avatar_url} />

          <div className="min-w-0 flex-1">
            <a
              href={`/admin/usuarios/${p.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-sm font-semibold text-eid-primary-300 hover:underline"
            >
              {p.nome}
            </a>
            {p.localizacao && (
              <p className="truncate text-[10px] text-eid-text-muted">{p.localizacao}</p>
            )}
          </div>

          <form action={adminReativarParticipante}>
            <input type="hidden" name="usuario_id" value={p.id} />
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-emerald-500/35 bg-emerald-500/8 px-3 py-1 text-[10px] font-bold text-emerald-300 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
            >
              Reativar
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}

async function PainelConfrontos({ edicao }: { edicao: EdicaoComContagem }) {
  if (!hasServiceRoleConfig()) return null;
  const db = createServiceRoleClient();
  const confrontos = await listarConfrontosEdicaoComPerfis(db, edicao.id, edicao.modalidade);

  const isEditable = ["simulacao", "pendente_aprovacao"].includes(edicao.status);
  const isPublicado = edicao.status === "publicado";

  if (confrontos.length === 0) {
    return <p className="text-xs text-eid-text-muted">Nenhum confronto nesta edição.</p>;
  }

  return (
    <ConfrontosGrid
      confrontos={confrontos}
      modalidade={edicao.modalidade}
      isEditable={isEditable}
      isPublicado={isPublicado}
    />
  );
}

export default async function AdminSorteioRankPage() {
  if (!hasServiceRoleConfig()) {
    return (
      <p className="text-sm text-eid-text-secondary">
        Configure a service role para acessar esta área.
      </p>
    );
  }

  const db = createServiceRoleClient();

  const [edicoes, esportesRes, optOuts] = await Promise.all([
    listarEdicoesAdmin(db, 20),
    db.from("esportes").select("id, nome").eq("ativo", true).order("nome"),
    buscarOptOuts(db),
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
          <strong className="text-eid-fg">1 dos 4 slots mensais</strong> do atleta.
        </p>

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

      {/* Opt-outs */}
      <section className="eid-admin-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserX className="h-4 w-4 text-rose-400" strokeWidth={1.75} />
          <h2 className="text-sm font-black text-eid-fg">
            Não participam do sorteio{" "}
            <span className="ml-1 rounded-full border border-rose-500/35 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-300">
              {optOuts.length}
            </span>
          </h2>
        </div>
        <p className="mb-3 text-xs text-eid-text-secondary">
          Esses atletas marcaram que <strong className="text-eid-fg">não querem participar</strong> do
          sorteio de ranking. Eles são excluídos automaticamente de qualquer simulação. O admin pode
          reativar manualmente se necessário.
        </p>
        <OptOutList perfis={optOuts} />
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

          return (
            <article key={ed.id} className="eid-admin-card overflow-hidden">
              {/* Cabeçalho da edição */}
              <div className="flex flex-wrap items-start justify-between gap-3 p-4 md:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={ed.status} />
                    <span className="text-[10px] font-mono text-eid-text-muted">#{ed.id}</span>
                    <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-2 py-0.5 text-[10px] font-semibold text-eid-text-secondary">
                      {ed.modo_genero === "mesmo_genero" ? "Mesmo gênero" : "Misto"}
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-base font-black text-eid-fg">
                    {ed.esporte_nome} · {ed.modalidade} · {fmtMes(ed.mes_ref)}
                  </h3>

                  <p className="mt-0.5 text-[11px] text-eid-text-muted">
                    {ed.total_confrontos} par(es) sorteado(s) · criado em {fmtDate(ed.criado_em)}
                    {ed.publicado_em && ` · publicado em ${fmtDate(ed.publicado_em)}`}
                  </p>

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

                  {ed.status === "publicado" && (
                    <span className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
                      Ativo — aguardando resultados
                    </span>
                  )}
                </div>
              </div>

              {/* Confrontos */}
              <div className="border-t border-[color:var(--eid-border-subtle)] px-4 pb-5 pt-4 md:px-5">
                <PainelConfrontos edicao={ed} />
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
