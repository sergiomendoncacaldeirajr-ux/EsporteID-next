"use client";

import { useActionState, useTransition } from "react";
import { adminSimularSorteio, adminEditarPar, type SimularSorteioState, type EditarParState } from "./actions";

// ── Formulário de simulação ──────────────────────────────────
type SimularFormProps = {
  esportes: { id: number; nome: string }[];
};

export function SorteioSimularForm({ esportes }: SimularFormProps) {
  const [state, action, pending] = useActionState<SimularSorteioState | null, FormData>(
    adminSimularSorteio,
    null
  );

  // Mês padrão = próximo mês
  const hoje = new Date();
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const mesDefault = proximoMes.toISOString().slice(0, 7); // "YYYY-MM"

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Esporte */}
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

        {/* Modalidade */}
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

        {/* Mês de referência */}
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

      {/* Flash de resultado */}
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
            Modo de gênero: <strong>{state.modoGenero === "misto" ? "Misto" : "Mesmo gênero"}</strong>.
            Role abaixo para revisar e publicar.
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

// ── Formulário inline de edição de par ──────────────────────
type EditarParInlineProps = {
  confrontoId: number;
  lado: "lado1" | "lado2";
  nomeAtual: string;
  /** Se for time, passa timeId; se individual, passa usuarioId */
  tipoAtual: "individual" | "dupla" | "time";
};

export function EditarParInline({
  confrontoId,
  lado,
  nomeAtual,
  tipoAtual,
}: EditarParInlineProps) {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState<EditarParState | null, FormData>(
    adminEditarPar,
    null
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10px] font-semibold text-eid-primary-300 hover:underline"
      >
        Trocar
      </button>
    );
  }

  return (
    <form action={action} className="mt-1 space-y-1.5">
      <input type="hidden" name="confronto_id" value={confrontoId} />
      <input type="hidden" name="lado" value={lado} />

      {tipoAtual === "individual" ? (
        <div className="space-y-1">
          <label className="text-[10px] text-eid-text-muted">Novo UUID do usuário</label>
          <input
            name="novo_usuario_id"
            placeholder="uuid do novo atleta"
            className="w-full rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-2 py-1 text-[11px] text-eid-fg"
          />
        </div>
      ) : (
        <div className="space-y-1">
          <label className="text-[10px] text-eid-text-muted">Novo ID do time</label>
          <input
            name="novo_time_id"
            type="number"
            min="1"
            placeholder="id numérico do time"
            className="w-full rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-2 py-1 text-[11px] text-eid-fg"
          />
        </div>
      )}

      {state && !state.ok && (
        <p className="text-[10px] text-rose-300">{state.message}</p>
      )}
      {state?.ok && (
        <p className="text-[10px] text-emerald-300">Alterado com sucesso.</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-emerald-500/40 px-2 py-1 text-[10px] font-bold text-emerald-200 disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[10px] text-eid-text-secondary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// React import necessário para o useState no EditarParInline
import React from "react";
