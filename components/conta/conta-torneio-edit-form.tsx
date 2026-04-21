"use client";

import { useActionState } from "react";
import { atualizarMeuTorneio, type TorneioUpdateState } from "@/app/torneios/actions";
import {
  CRITERIOS_DESEMPATE,
  FORMATOS_COMPETICAO,
  MELHOR_DE_PARTIDA,
  MODALIDADES_PARTICIPACAO,
  STATUS_TORNEIO,
} from "@/lib/torneios/catalog";
import { TORNEIO_CATEGORIAS_PUBLICO, type TorneioCategoriaPublico } from "@/lib/torneios/categorias";

const initial: TorneioUpdateState = { ok: false, message: "" };

export type ContaTorneioEditFormProps = {
  torneioId: number;
  initial: {
    nome: string;
    esporte_id: number | null;
    status: string;
    data_inicio: string;
    data_fim: string;
    valor_inscricao: number;
    categoria: string;
    categorias_publico: TorneioCategoriaPublico[];
    descricao: string;
    regulamento: string;
    premios: string;
    formato_competicao: string;
    criterio_desempate: string;
    banner: string;
    logo_arquivo: string;
    espaco_generico_id: number | null;
    modalidade_participacao: string;
    melhor_de: string;
    vagas_max: string;
    observacoes_regras: string;
  };
  esportes: { id: number; nome: string }[];
  locais: { id: number; nome_publico: string; localizacao: string }[];
};

export function ContaTorneioEditForm({ torneioId, initial: init, esportes, locais }: ContaTorneioEditFormProps) {
  const [state, formAction, pending] = useActionState(atualizarMeuTorneio, initial);
  const espSel = init.espaco_generico_id != null ? String(init.espaco_generico_id) : "";

  return (
    <form action={formAction} className="mt-4 space-y-6">
      <input type="hidden" name="torneio_id" value={torneioId} />

      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Dados gerais</h2>
        <div>
          <label htmlFor="nome" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
            Nome do torneio *
          </label>
          <input
            id="nome"
            name="nome"
            required
            minLength={3}
            defaultValue={init.nome}
            className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="esporte_id" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
              Esporte *
            </label>
            <select
              id="esporte_id"
              name="esporte_id"
              required
              className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
              defaultValue={init.esporte_id != null && init.esporte_id > 0 ? String(init.esporte_id) : ""}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {esportes.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
              Status
            </label>
            <select
              id="status"
              name="status"
              className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
              defaultValue={init.status || "aberto"}
            >
              {STATUS_TORNEIO.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="data_inicio" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
              Data de início
            </label>
            <input
              id="data_inicio"
              name="data_inicio"
              type="date"
              defaultValue={init.data_inicio}
              className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
            />
          </div>
          <div>
            <label htmlFor="data_fim" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
              Data de término
            </label>
            <input
              id="data_fim"
              name="data_fim"
              type="date"
              defaultValue={init.data_fim}
              className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="valor_inscricao" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
              Valor da inscrição (R$)
            </label>
            <input
              id="valor_inscricao"
              name="valor_inscricao"
              type="text"
              inputMode="decimal"
              defaultValue={Number(init.valor_inscricao ?? 0).toFixed(2).replace(".", ",")}
              className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
            />
          </div>
          <div>
            <label htmlFor="categoria" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
              Divisão / classe principal
            </label>
            <input
              id="categoria"
              name="categoria"
              defaultValue={init.categoria}
              className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
            />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">Categorias públicas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TORNEIO_CATEGORIAS_PUBLICO.map((categoria) => (
              <label
                key={categoria.id}
                className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/40 px-3 py-2 text-xs text-eid-fg"
              >
                <input
                  type="checkbox"
                  name="categoria_publico"
                  value={categoria.id}
                  defaultChecked={init.categorias_publico.includes(categoria.id)}
                />
                {categoria.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="banner" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
            URL da capa (opcional)
          </label>
          <input
            id="banner"
            name="banner"
            type="url"
            defaultValue={init.banner}
            placeholder="https://…"
            className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
          />
        </div>
        <div>
          <label htmlFor="logo_arquivo" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
            URL do logo (opcional)
          </label>
          <input
            id="logo_arquivo"
            name="logo_arquivo"
            type="url"
            defaultValue={init.logo_arquivo}
            placeholder="https://…"
            className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
          />
        </div>
        <div>
          <label htmlFor="espaco_generico_id" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
            Local / sede (opcional)
          </label>
          <select
            id="espaco_generico_id"
            name="espaco_generico_id"
            className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
            defaultValue={espSel}
          >
            <option value="">Nenhum / a definir</option>
            {locais.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome_publico} — {l.localizacao}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-4 border-t border-[color:var(--eid-border-subtle)] pt-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Formato e regras</h2>
        <div>
          <label htmlFor="formato_competicao" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
            Forma de disputa
          </label>
          <select
            id="formato_competicao"
            name="formato_competicao"
            className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
            defaultValue={init.formato_competicao || "grupos_mata_mata"}
          >
            {FORMATOS_COMPETICAO.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="criterio_desempate" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
              Critério de desempate
            </label>
            <select
              id="criterio_desempate"
              name="criterio_desempate"
              className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
              defaultValue={init.criterio_desempate || "sets"}
            >
              {CRITERIOS_DESEMPATE.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="modalidade_participacao" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
              Modalidade de participação
            </label>
            <select
              id="modalidade_participacao"
              name="modalidade_participacao"
              className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
              defaultValue={init.modalidade_participacao || "individual"}
            >
              {MODALIDADES_PARTICIPACAO.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="melhor_de" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
              Partidas (finais / série)
            </label>
            <select
              id="melhor_de"
              name="melhor_de"
              className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
              defaultValue={init.melhor_de || "1"}
            >
              {MELHOR_DE_PARTIDA.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="vagas_max" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
              Vagas máximas (opcional)
            </label>
            <input
              id="vagas_max"
              name="vagas_max"
              type="number"
              min={1}
              defaultValue={init.vagas_max}
              placeholder="Ilimitado se vazio"
              className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
            />
          </div>
        </div>
        <div>
          <label htmlFor="observacoes_regras" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
            Observações sobre placar / regras específicas
          </label>
          <textarea
            id="observacoes_regras"
            name="observacoes_regras"
            rows={2}
            defaultValue={init.observacoes_regras}
            className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg"
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-[color:var(--eid-border-subtle)] pt-6">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-eid-primary-500">Textos</h2>
        <div>
          <label htmlFor="descricao" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
            Descrição (opcional)
          </label>
          <textarea id="descricao" name="descricao" rows={3} defaultValue={init.descricao} className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg" />
        </div>
        <div>
          <label htmlFor="regulamento" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
            Regulamento
          </label>
          <textarea id="regulamento" name="regulamento" rows={5} defaultValue={init.regulamento} className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg" />
        </div>
        <div>
          <label htmlFor="premios" className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
            Prêmios
          </label>
          <textarea id="premios" name="premios" rows={3} defaultValue={init.premios} className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-eid-fg" />
        </div>
      </section>

      <button type="submit" disabled={pending} className="eid-btn-primary w-full min-h-[48px] rounded-2xl text-sm font-black uppercase tracking-wide">
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-eid-primary-300" : "text-red-300"}`} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
