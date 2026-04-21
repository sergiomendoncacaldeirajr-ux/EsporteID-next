import Link from "next/link";
import {
  cancelarParticipacaoAlunoAction,
  cancelarSolicitacaoAlunoAction,
} from "@/app/professor/actions";
import { descreverPoliticaCancelamentoProfessor } from "@/lib/professor/cancellation";

export type ComunidadeProfessorProfileRow = {
  id: string;
  nome: string | null;
  whatsapp: string | null;
  whatsapp_visibilidade: string | null;
  headline: string | null;
  politica_cancelamento_json: unknown;
};

export type ComunidadeSolicitacaoAulaItem = {
  id: number;
  professor_id: string;
  mensagem: string | null;
  status: string | null;
  criado_em: string | null;
  esportes?: { nome?: string | null } | { nome?: string | null }[] | null;
};

export type ComunidadeVinculoAulaItem = {
  id: number;
  valor_centavos: number | null;
  status_inscricao: string | null;
  status_pagamento: string | null;
  taxa_cancelamento_centavos: number | null;
  motivo_cancelamento: string | null;
  professor_aulas?:
    | {
        id?: number | null;
        professor_id?: string | null;
        titulo?: string | null;
        inicio?: string | null;
        status?: string | null;
        esportes?: { nome?: string | null } | { nome?: string | null }[] | null;
      }
    | {
        id?: number | null;
        professor_id?: string | null;
        titulo?: string | null;
        inicio?: string | null;
        status?: string | null;
        esportes?: { nome?: string | null } | { nome?: string | null }[] | null;
      }[]
    | null;
};

function waHref(raw: string | null | undefined) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export function ComunidadeAulasSection({
  solicitacoes,
  vinculos,
  professorMap,
}: {
  solicitacoes: ComunidadeSolicitacaoAulaItem[];
  vinculos: ComunidadeVinculoAulaItem[];
  professorMap: Map<string, ComunidadeProfessorProfileRow>;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-action-400">
          Aulas e professores
        </h2>
        <p className="mt-1 hidden text-sm text-eid-text-secondary md:block">
          Acompanhe solicitações enviadas, aulas confirmadas, pagamentos e o contato liberado pelo professor.
        </p>
      </div>

      <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h3 className="text-lg font-bold text-eid-fg">Solicitações enviadas</h3>
        <div className="mt-4 space-y-3">
          {solicitacoes.length ? (
            solicitacoes.map((solicitacao) => {
              const esporte = Array.isArray(solicitacao.esportes)
                ? solicitacao.esportes[0]
                : solicitacao.esportes;
              const professor = professorMap.get(solicitacao.professor_id);
              const canSeeWhatsapp =
                professor?.whatsapp_visibilidade === "publico" ||
                solicitacao.status === "aceita";
              return (
                <div key={solicitacao.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-eid-fg">
                        {professor?.nome ?? "Professor"} · {esporte?.nome ?? "Esporte"}
                      </p>
                      <p className="mt-1 text-xs text-eid-text-secondary">
                        Status {solicitacao.status} · enviada em{" "}
                        {solicitacao.criado_em
                          ? new Date(solicitacao.criado_em).toLocaleString("pt-BR")
                          : "-"}
                      </p>
                      {solicitacao.mensagem ? (
                        <p className="mt-2 text-sm leading-relaxed text-eid-text-secondary">
                          {solicitacao.mensagem}
                        </p>
                      ) : null}
                      {professor ? (
                        <p className="mt-2 text-xs text-eid-text-secondary">
                          {professor.headline ?? "Professor ativo na plataforma."}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Link
                        href={`/professor/${solicitacao.professor_id}`}
                        className="text-xs font-semibold text-eid-primary-300 underline"
                      >
                        Ver perfil
                      </Link>
                      {canSeeWhatsapp && professor?.whatsapp ? (
                        <a
                          href={waHref(professor.whatsapp) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-[#25D366] px-3 py-2 text-xs font-bold text-white"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                      {solicitacao.status === "pendente" ? (
                        <form action={cancelarSolicitacaoAlunoAction}>
                          <input type="hidden" name="solicitacao_id" value={solicitacao.id} />
                          <button className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg">
                            Cancelar pedido
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-eid-text-secondary">
              Você ainda não enviou solicitações de aula.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-5">
        <h3 className="text-lg font-bold text-eid-fg">Aulas vinculadas</h3>
        <div className="mt-4 space-y-3">
          {vinculos.length ? (
            vinculos.map((vinculo) => {
              const aula = Array.isArray(vinculo.professor_aulas)
                ? vinculo.professor_aulas[0]
                : vinculo.professor_aulas;
              const esporte = Array.isArray(aula?.esportes)
                ? aula.esportes[0]
                : aula?.esportes;
              const professor = professorMap.get(aula?.professor_id ?? "");
              const whatsappPermitido =
                professor?.whatsapp_visibilidade === "publico" ||
                professor?.whatsapp_visibilidade === "alunos_aceitos_ou_com_aula";
              return (
                <div key={vinculo.id} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-eid-fg">
                        {aula?.titulo ?? `Aula #${aula?.id ?? "-"}`} · {esporte?.nome ?? "Esporte"}
                      </p>
                      <p className="mt-1 text-xs text-eid-text-secondary">
                        {professor?.nome ?? "Professor"} ·{" "}
                        {aula?.inicio ? new Date(aula.inicio).toLocaleString("pt-BR") : "Sem horário"}
                      </p>
                      <p className="mt-1 text-xs text-eid-text-secondary">
                        Aula {aula?.status ?? "-"} · inscrição {vinculo.status_inscricao} · pagamento{" "}
                        {vinculo.status_pagamento}
                      </p>
                      <p className="mt-2 text-xs text-eid-text-secondary">
                        Política:{" "}
                        {descreverPoliticaCancelamentoProfessor(
                          professor?.politica_cancelamento_json
                        ) || "Sem política definida."}
                      </p>
                      {Number(vinculo.taxa_cancelamento_centavos ?? 0) > 0 ? (
                        <p className="mt-1 text-xs text-eid-action-400">
                          Retenção aplicada: R${" "}
                          {(Number(vinculo.taxa_cancelamento_centavos ?? 0) / 100)
                            .toFixed(2)
                            .replace(".", ",")}
                        </p>
                      ) : null}
                      {vinculo.motivo_cancelamento ? (
                        <p className="mt-1 text-xs text-eid-text-secondary">
                          Motivo/registro: {vinculo.motivo_cancelamento}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-sm font-bold text-eid-action-400">
                        R$ {(Number(vinculo.valor_centavos ?? 0) / 100).toFixed(2).replace(".", ",")}
                      </p>
                      {whatsappPermitido && professor?.whatsapp ? (
                        <a
                          href={waHref(professor.whatsapp) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-[#25D366] px-3 py-2 text-xs font-bold text-white"
                        >
                          Tirar dúvida
                        </a>
                      ) : null}
                      {["confirmada", "pendente"].includes(String(vinculo.status_inscricao ?? "")) &&
                      aula?.status === "agendada" ? (
                        <form
                          action={cancelarParticipacaoAlunoAction}
                          className="w-full min-w-[240px] space-y-2"
                        >
                          <input type="hidden" name="vinculo_id" value={vinculo.id} />
                          <textarea
                            name="motivo_cancelamento"
                            rows={2}
                            placeholder="Se não puder ir, avise o professor por aqui."
                            className="eid-input-dark w-full rounded-xl px-3 py-2 text-xs"
                          />
                          <button className="w-full rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg">
                            Não vou à aula
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-eid-text-secondary">
              Nenhuma aula vinculada ainda.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
