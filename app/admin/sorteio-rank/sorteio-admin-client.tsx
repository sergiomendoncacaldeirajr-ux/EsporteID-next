"use client";

import React, { useState } from "react";
import { useActionState } from "react";
import {
  adminSimularSorteio,
  adminEditarPar,
  adminMarcarWo,
  type SimularSorteioState,
  type EditarParState,
} from "./actions";
import type { ConfrontoComPerfis } from "@/lib/sorteio-rank/queries";
import { ChevronDown, ChevronUp, Pencil, X } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────
const CONFRONTO_STATUS_LABEL: Record<string, { label: string; dot: string }> = {
  pendente:    { label: "Pendente",     dot: "bg-amber-400" },
  em_andamento:{ label: "Em andamento", dot: "bg-blue-400" },
  concluido:   { label: "Concluído",    dot: "bg-emerald-400" },
  wo_lado1:    { label: "WO → L1 vence",dot: "bg-rose-400" },
  wo_lado2:    { label: "WO → L2 vence",dot: "bg-rose-400" },
  wo_duplo:    { label: "WO Duplo",     dot: "bg-rose-400" },
  cancelado:   { label: "Cancelado",    dot: "bg-gray-500" },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

// ── Avatar ───────────────────────────────────────────────────
function Avatar({ url, nome, size = 44 }: { url: string | null; nome: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const style = { width: size, height: size, minWidth: size };

  if (url && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={nome}
        style={style}
        className="rounded-full object-cover ring-2 ring-[color:var(--eid-border-subtle)]"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      style={style}
      className="flex items-center justify-center rounded-full bg-eid-primary-500/20 ring-2 ring-[color:var(--eid-border-subtle)]"
    >
      <span className="text-[11px] font-black text-eid-primary-300">{iniciais(nome) || "?"}</span>
    </div>
  );
}

// ── Confronto card ────────────────────────────────────────────
function ConfrontoCard({
  confronto: c,
  modalidade,
  isEditable,
  isPublicado,
}: {
  confronto: ConfrontoComPerfis;
  modalidade: string;
  isEditable: boolean;
  isPublicado: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingLado, setEditingLado] = useState<"lado1" | "lado2" | null>(null);

  const info = CONFRONTO_STATUS_LABEL[c.status] ?? { label: c.status, dot: "bg-gray-500" };
  const modoLabel = c.modo_genero === "mesmo_genero" ? "Mesmo gênero" : "Misto";
  const tipoAtual = modalidade as "individual" | "dupla" | "time";

  const l1Href =
    c.lado1_usuario_id ? `/admin/usuarios/${c.lado1_usuario_id}` : null;
  const l2Href =
    c.lado2_usuario_id ? `/admin/usuarios/${c.lado2_usuario_id}` : null;

  const canWo = isPublicado && c.status === "pendente";

  return (
    <article className="flex flex-col rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 overflow-hidden transition hover:border-eid-primary-500/30">
      {/* Metadata strip */}
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/30 px-3 py-1.5">
        <p className="font-mono text-[10px] text-eid-text-muted">
          #{c.id} · {modoLabel}
          {c.distancia_km != null && ` · ${Number(c.distancia_km).toFixed(1)} km`}
          {c.delta_rank != null && ` · ΔRank ${c.delta_rank}`}
        </p>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${info.dot}`} />
          <span className="text-[10px] font-semibold text-eid-text-secondary">{info.label}</span>
        </div>
      </div>

      {/* VS layout */}
      <div className="flex items-center gap-3 px-4 py-4">
        {/* Lado 1 */}
        <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
          <Avatar url={c.lado1_avatar} nome={c.lado1_nome} size={48} />
          {l1Href ? (
            <a
              href={l1Href}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-2 text-xs font-semibold text-eid-primary-300 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {c.lado1_nome}
            </a>
          ) : (
            <span className="line-clamp-2 text-xs font-semibold text-eid-fg">{c.lado1_nome}</span>
          )}
          {isPublicado && (
            <span className={`text-[10px] font-bold ${c.lado1_tentou_agendar ? "text-emerald-400" : "text-eid-text-muted"}`}>
              {c.lado1_tentou_agendar ? "✓ Agendou" : "Não agendou"}
            </span>
          )}
        </div>

        {/* VS */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-base font-black text-eid-text-muted">×</span>
        </div>

        {/* Lado 2 */}
        <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
          <Avatar url={c.lado2_avatar} nome={c.lado2_nome} size={48} />
          {l2Href ? (
            <a
              href={l2Href}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-2 text-xs font-semibold text-eid-primary-300 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {c.lado2_nome}
            </a>
          ) : (
            <span className="line-clamp-2 text-xs font-semibold text-eid-fg">{c.lado2_nome}</span>
          )}
          {isPublicado && (
            <span className={`text-[10px] font-bold ${c.lado2_tentou_agendar ? "text-emerald-400" : "text-eid-text-muted"}`}>
              {c.lado2_tentou_agendar ? "✓ Agendou" : "Não agendou"}
            </span>
          )}
        </div>
      </div>

      {/* Footer: prazo + expand toggle */}
      <div className="flex items-center justify-between border-t border-[color:var(--eid-border-subtle)] px-3 py-2">
        <p className="text-[10px] text-eid-text-muted">
          Prazo: <strong className="text-eid-text-secondary">{fmtDate(c.data_limite)}</strong>
        </p>
        {(canWo || isEditable) && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-eid-text-secondary transition hover:bg-eid-surface hover:text-eid-fg"
          >
            Ações
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Expanded actions */}
      {expanded && (
        <div className="border-t border-[color:var(--eid-border-subtle)] bg-eid-surface/20 px-4 pb-4 pt-3 space-y-3">
          {/* WO buttons */}
          {canWo && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-eid-text-muted">
                Marcar WO
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(["wo_lado1", "wo_lado2", "wo_duplo"] as const).map((tipo) => (
                  <form key={tipo} action={adminMarcarWo}>
                    <input type="hidden" name="confronto_id" value={c.id} />
                    <input type="hidden" name="tipo_wo" value={tipo} />
                    <button
                      type="submit"
                      className="rounded-lg border border-rose-500/35 bg-rose-500/8 px-3 py-1 text-[10px] font-bold text-rose-300 transition hover:border-rose-400/50 hover:bg-rose-500/15"
                    >
                      {tipo === "wo_lado1"
                        ? `WO → ${c.lado1_nome.split(" ")[0]}`
                        : tipo === "wo_lado2"
                          ? `WO → ${c.lado2_nome.split(" ")[0]}`
                          : "WO Duplo"}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          )}

          {/* Edit opponent */}
          {isEditable && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-eid-text-muted">
                Editar oponente
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(["lado1", "lado2"] as const).map((lado) => (
                  <button
                    key={lado}
                    type="button"
                    onClick={() => setEditingLado(editingLado === lado ? null : lado)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[10px] font-bold transition ${
                      editingLado === lado
                        ? "border-eid-primary-500/60 bg-eid-primary-500/15 text-eid-primary-200"
                        : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:border-eid-primary-500/40 hover:text-eid-primary-200"
                    }`}
                  >
                    <Pencil className="h-3 w-3" />
                    Trocar {lado === "lado1" ? c.lado1_nome.split(" ")[0] : c.lado2_nome.split(" ")[0]}
                  </button>
                ))}
              </div>

              {editingLado && (
                <div className="mt-2">
                  <EditarParInline
                    confrontoId={c.id}
                    lado={editingLado}
                    nomeAtual={editingLado === "lado1" ? c.lado1_nome : c.lado2_nome}
                    tipoAtual={tipoAtual}
                    onClose={() => setEditingLado(null)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ── Grid de confrontos (exportado para page.tsx) ──────────────
export function ConfrontosGrid({
  confrontos,
  modalidade,
  isEditable,
  isPublicado,
}: {
  confrontos: ConfrontoComPerfis[];
  modalidade: string;
  isEditable: boolean;
  isPublicado: boolean;
}) {
  if (confrontos.length === 0) {
    return <p className="text-xs text-eid-text-muted">Nenhum confronto nesta edição.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {confrontos.map((c) => (
        <ConfrontoCard
          key={c.id}
          confronto={c}
          modalidade={modalidade}
          isEditable={isEditable}
          isPublicado={isPublicado}
        />
      ))}
    </div>
  );
}

// ── Formulário de edição de par ───────────────────────────────
function EditarParInline({
  confrontoId,
  lado,
  nomeAtual,
  tipoAtual,
  onClose,
}: {
  confrontoId: number;
  lado: "lado1" | "lado2";
  nomeAtual: string;
  tipoAtual: "individual" | "dupla" | "time";
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<EditarParState | null, FormData>(
    adminEditarPar,
    null
  );

  return (
    <form
      action={action}
      className="rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/5 p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-eid-primary-200">
          Substituindo: <span className="font-normal text-eid-text-muted">{nomeAtual}</span>
        </p>
        <button type="button" onClick={onClose} className="text-eid-text-muted hover:text-eid-fg">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <input type="hidden" name="confronto_id" value={confrontoId} />
      <input type="hidden" name="lado" value={lado} />

      {tipoAtual === "individual" ? (
        <div className="space-y-1">
          <label className="text-[10px] text-eid-text-muted">UUID do novo atleta</label>
          <input
            name="novo_usuario_id"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-2 py-1.5 font-mono text-[11px] text-eid-fg placeholder:text-eid-text-muted"
          />
        </div>
      ) : (
        <div className="space-y-1">
          <label className="text-[10px] text-eid-text-muted">ID numérico do time</label>
          <input
            name="novo_time_id"
            type="number"
            min="1"
            placeholder="ex: 42"
            className="w-full rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-2 py-1.5 text-[11px] text-eid-fg placeholder:text-eid-text-muted"
          />
        </div>
      )}

      {state && !state.ok && (
        <p className="text-[10px] font-semibold text-rose-300">{state.message}</p>
      )}
      {state?.ok && (
        <p className="text-[10px] font-semibold text-emerald-300">✓ Alterado com sucesso — recarregue para ver.</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-200 disabled:opacity-50 transition hover:border-emerald-400/60"
        >
          {pending ? "Salvando…" : "Confirmar troca"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1 text-[10px] text-eid-text-secondary hover:text-eid-fg"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ── Formulário de simulação ───────────────────────────────────
export function SorteioSimularForm({ esportes }: { esportes: { id: number; nome: string }[] }) {
  const [state, action, pending] = useActionState<SimularSorteioState | null, FormData>(
    adminSimularSorteio,
    null
  );

  const hoje = new Date();
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const mesDefault = proximoMes.toISOString().slice(0, 7);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">
            Esporte
          </label>
          <select
            name="esporte_id"
            required
            className="w-full rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 py-2 text-sm text-eid-fg"
          >
            <option value="">Selecione…</option>
            {esportes.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">
            Modalidade
          </label>
          <select
            name="modalidade"
            required
            className="w-full rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 py-2 text-sm text-eid-fg"
          >
            <option value="individual">Individual</option>
            <option value="dupla">Dupla</option>
            <option value="time">Time</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">
            Mês de referência
          </label>
          <input
            type="month"
            name="mes_ref"
            defaultValue={mesDefault}
            required
            className="w-full rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 py-2 text-sm text-eid-fg"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-eid-text-secondary">
        <input type="checkbox" name="substituir" value="1" defaultChecked className="rounded" />
        Substituir simulação existente para este mês (se houver)
      </label>

      {state && !state.ok && (
        <p className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100">
          {state.message}
        </p>
      )}
      {state && state.ok && (
        <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          <p className="font-bold">
            Simulação criada — {state.totalPares} par(es) formado(s), {state.semPar} sem par.
          </p>
          <p className="mt-0.5 text-[11px]">
            Modo de gênero:{" "}
            <strong>{state.modoGenero === "misto" ? "Misto" : "Mesmo gênero"}</strong>. Role
            abaixo para revisar e publicar.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-eid-primary-500/40 bg-eid-primary-500/15 px-5 py-2 text-sm font-bold text-eid-primary-200 transition hover:border-eid-primary-500/60 disabled:opacity-50"
      >
        {pending ? "Simulando…" : "Simular sorteio"}
      </button>
    </form>
  );
}
