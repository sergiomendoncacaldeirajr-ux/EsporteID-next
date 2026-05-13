"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Search, ShieldCheck, UserRoundCheck } from "lucide-react";
import {
  alternarPermissaoOperadorEspacoAction,
  atualizarPermissaoOperadorEspacoAction,
  criarPermissaoOperadorEspacoAction,
} from "@/app/espaco/actions";

type Unidade = {
  id: number;
  nome: string | null;
};

type OperadorSuggestItem = {
  id: string;
  title: string;
  subtitle: string | null;
  avatarUrl?: string | null;
};

type PermissaoOperador = {
  id: number;
  tipo: "professor" | "organizador";
  ativo: boolean;
  usuarioId: string | null;
  usuarioNome: string;
  usuarioHandle: string | null;
  unidadeId: number | null;
  unidadeNome: string;
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  vigenciaInicioIso: string | null;
  vigenciaFimIso: string | null;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  observacoes: string | null;
};

const DIAS = [
  ["0", "Domingo"],
  ["1", "Segunda"],
  ["2", "Terça"],
  ["3", "Quarta"],
  ["4", "Quinta"],
  ["5", "Sexta"],
  ["6", "Sábado"],
] as const;

const diaLabel = new Map(DIAS.map(([value, label]) => [Number(value), label]));

export function EspacoOperadoresPermissoes({
  espacoId,
  unidades,
  permissoes,
}: {
  espacoId: number;
  unidades: Unidade[];
  permissoes: PermissaoOperador[];
}) {
  const [tipo, setTipo] = useState<"professor" | "organizador">("professor");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<OperadorSuggestItem | null>(null);
  const [items, setItems] = useState<OperadorSuggestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [prazoIndeterminado, setPrazoIndeterminado] = useState(true);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: term, papel: tipo, espaco_id: String(espacoId) });
        const res = await fetch(`/api/espaco/operadores-suggest?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as { items?: OperadorSuggestItem[] };
        setItems(json.items ?? []);
      } catch {
        if (!controller.signal.aborted) setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [espacoId, query, tipo]);

  const activeCount = useMemo(() => permissoes.filter((item) => item.ativo).length, [permissoes]);
  const visibleItems = query.trim().length >= 3 ? items : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
        <form action={criarPermissaoOperadorEspacoAction} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3">
          <input type="hidden" name="espaco_id" value={espacoId} />
          <input type="hidden" name="tipo_operador" value={tipo} />
          <input type="hidden" name="usuario_id" value={selected?.id ?? ""} />

          <div className="flex flex-wrap gap-2">
            {(["professor", "organizador"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setTipo(option);
                  setSelected(null);
                  setItems([]);
                  setQuery("");
                }}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                  tipo === option
                    ? "border-eid-primary-500/60 bg-eid-primary-500/15 text-eid-primary-200"
                    : "border-[color:var(--eid-border-subtle)] bg-eid-card/70 text-eid-text-secondary"
                }`}
              >
                {option === "professor" ? <UserRoundCheck className="h-4 w-4" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
                {option === "professor" ? "Professor" : "Organizador"}
              </button>
            ))}
          </div>

          <label className="mt-3 block text-xs font-semibold text-eid-text-secondary">
            Buscar perfil
            <span className="relative mt-1.5 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-eid-text-secondary" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Digite pelo menos 3 letras ou números"
                className="eid-input-dark w-full rounded-xl py-2 pl-9 pr-3 text-sm"
              />
            </span>
          </label>

          {selected ? (
            <div className="mt-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
              Selecionado: <span className="font-bold">{selected.title}</span>
              {selected.subtitle ? <span className="text-emerald-200"> · {selected.subtitle}</span> : null}
            </div>
          ) : null}

          {query.trim().length >= 3 && !selected ? (
            <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80">
              {loading ? <p className="px-3 py-2 text-xs text-eid-text-secondary">Buscando...</p> : null}
              {!loading && !visibleItems.length ? <p className="px-3 py-2 text-xs text-eid-text-secondary">Nenhum perfil com esse papel encontrado.</p> : null}
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelected(item);
                    setQuery(item.title);
                  }}
                  className="block w-full border-t border-[color:var(--eid-border-subtle)] px-3 py-2 text-left first:border-t-0 hover:bg-eid-surface/70"
                >
                  <span className="block text-sm font-bold text-eid-fg">{item.title}</span>
                  {item.subtitle ? <span className="block text-xs text-eid-text-secondary">{item.subtitle}</span> : null}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-semibold text-eid-text-secondary">
              Quadra
              <select name="espaco_unidade_id" required className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm">
                <option value="">Selecione</option>
                {unidades.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome ?? `Unidade ${unidade.id}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Dia
              <select name="dia_semana" required className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm">
                {DIAS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Início
              <input type="time" name="hora_inicio" required className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Fim
              <input type="time" name="hora_fim" required className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Início da permissão
              <input type="date" name="vigencia_inicio" required className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-eid-text-secondary">
              Fim da permissão
              <input
                type="date"
                name="vigencia_fim"
                disabled={prazoIndeterminado}
                className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm disabled:opacity-45"
              />
            </label>
          </div>

          <label className="mt-3 flex items-start gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-3 text-xs text-eid-fg">
            <input
              type="checkbox"
              name="prazo_indeterminado"
              checked={prazoIndeterminado}
              onChange={(event) => setPrazoIndeterminado(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-eid-action-500"
            />
            <span>
              <span className="block font-bold">Prazo indeterminado</span>
              <span className="text-eid-text-secondary">Use quando o professor ou organizador pode usar essa faixa até você desativar.</span>
            </span>
          </label>

          <textarea
            name="observacoes"
            rows={3}
            placeholder="Regras combinadas: limite de alunos, montagem de torneio, materiais, observações internas..."
            className="eid-input-dark mt-3 w-full rounded-xl px-3 py-2 text-sm"
          />

          <button
            type="submit"
            disabled={!selected}
            className="mt-3 w-full rounded-xl border border-eid-action-500/40 bg-eid-action-500/15 px-4 py-3 text-sm font-bold text-eid-action-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Salvar permissão
          </button>
        </form>

        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/65 p-3">
          <p className="text-sm font-black text-eid-fg">Permissões ativas</p>
          <p className="mt-1 text-xs leading-relaxed text-eid-text-secondary">
            {activeCount} liberação(ões) controlam quem pode reservar como aula ou torneio em quadras específicas.
          </p>
          <div className="mt-3 grid gap-2 text-xs text-eid-text-secondary">
            <span className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
              <CalendarDays className="h-4 w-4 text-eid-primary-300" aria-hidden />
              Datas limitam quando a autorização vale.
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
              <Clock className="h-4 w-4 text-eid-primary-300" aria-hidden />
              Horários precisam cobrir toda a reserva.
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        {permissoes.length ? (
          permissoes.map((permissao) => (
            <details key={permissao.id} className="group rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3">
              <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="text-sm font-black text-eid-fg">{permissao.usuarioNome}</p>
                  <p className="mt-1 flex flex-wrap gap-2 text-[11px] text-eid-text-secondary">
                    <span>{permissao.tipo === "professor" ? "Professor" : "Organizador"}</span>
                    {permissao.usuarioHandle ? <span>{permissao.usuarioHandle}</span> : null}
                    <span>{permissao.unidadeNome}</span>
                    <span>{diaLabel.get(permissao.diaSemana) ?? "Dia"}</span>
                    <span>
                      {permissao.horaInicio} às {permissao.horaFim}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] text-eid-text-secondary">
                    {permissao.vigenciaInicio ? `Desde ${permissao.vigenciaInicio}` : "Sem início informado"}
                    {permissao.vigenciaFim ? ` até ${permissao.vigenciaFim}` : " · prazo indeterminado"}
                  </p>
                  {permissao.observacoes ? <p className="mt-2 text-xs text-eid-fg">{permissao.observacoes}</p> : null}
                </div>
                <span className="rounded-xl border border-eid-primary-500/30 px-3 py-2 text-xs font-bold text-eid-primary-300">
                  Editar regras
                </span>
              </summary>
              <div className="mt-3 hidden border-t border-[color:var(--eid-border-subtle)] pt-3 group-open:block">
              <form action={atualizarPermissaoOperadorEspacoAction}>
                <input type="hidden" name="espaco_id" value={espacoId} />
                <input type="hidden" name="horario_id" value={permissao.id} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select name="espaco_unidade_id" defaultValue={permissao.unidadeId ?? ""} className="eid-input-dark rounded-xl px-3 py-2 text-sm">
                    {unidades.map((unidade) => (
                      <option key={unidade.id} value={unidade.id}>
                        {unidade.nome ?? `Unidade ${unidade.id}`}
                      </option>
                    ))}
                  </select>
                  <select name="dia_semana" defaultValue={String(permissao.diaSemana)} className="eid-input-dark rounded-xl px-3 py-2 text-sm">
                    {DIAS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input type="time" name="hora_inicio" defaultValue={permissao.horaInicio} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                  <input type="time" name="hora_fim" defaultValue={permissao.horaFim} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                  <input type="date" name="vigencia_inicio" defaultValue={permissao.vigenciaInicioIso ?? ""} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                  <input type="date" name="vigencia_fim" defaultValue={permissao.vigenciaFimIso ?? ""} className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs text-eid-fg">
                  <input type="checkbox" name="prazo_indeterminado" defaultChecked={!permissao.vigenciaFimIso} />
                  Prazo indeterminado
                </label>
                <textarea
                  name="observacoes"
                  rows={2}
                  defaultValue={permissao.observacoes ?? ""}
                  className="eid-input-dark mt-2 w-full rounded-xl px-3 py-2 text-sm"
                  placeholder="Regras e observações"
                />
                <button className="mt-2 rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-2 text-xs font-bold text-eid-primary-300">
                  Salvar regras
                </button>
              </form>
              <form action={alternarPermissaoOperadorEspacoAction} className="mt-2">
                <input type="hidden" name="espaco_id" value={espacoId} />
                <input type="hidden" name="horario_id" value={permissao.id} />
                <input type="hidden" name="ativo" value={String(!permissao.ativo)} />
                <button className="rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-2 text-xs font-bold text-eid-fg">
                  {permissao.ativo ? "Desativar permissão" : "Reativar permissão"}
                </button>
              </form>
              </div>
            </details>
          ))
        ) : (
          <p className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 p-3 text-sm text-eid-text-secondary">
            Nenhum professor ou organizador liberado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
