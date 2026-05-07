"use client";

import { useState } from "react";

type EmailCorrectionInlineProps = {
  currentEmail: string;
  onApplyEmail: (normalizedEmail: string) => void | Promise<void>;
  triggerLabel?: string;
  applyLabel?: string;
  cancelLabel?: string;
  inputId?: string;
  triggerClassName?: string;
};

export function EmailCorrectionInline({
  currentEmail,
  onApplyEmail,
  triggerLabel = "Errou o e-mail? Corrigir",
  applyLabel = "Atualizar e-mail",
  cancelLabel = "Cancelar",
  inputId = "email-correction-input",
  triggerClassName,
}: EmailCorrectionInlineProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  function startEditing() {
    setError(null);
    setDraft((currentEmail ?? "").trim().toLowerCase());
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setDraft("");
    setError(null);
  }

  async function applyEmail() {
    const normalized = draft.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      setError("Informe um e-mail válido para continuar.");
      return;
    }
    setApplying(true);
    try {
      setError(null);
      await onApplyEmail(normalized);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível atualizar o e-mail.");
    } finally {
      setApplying(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className={
          triggerClassName ??
          "w-full rounded-lg border border-eid-action-500/30 bg-eid-card/55 px-3 py-2 text-[12px] font-semibold text-eid-action-500 transition hover:border-eid-action-500/50 hover:bg-eid-card"
        }
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <div className="space-y-2 text-left">
      <label htmlFor={inputId} className="block text-[11px] font-semibold text-eid-text-secondary">
        Corrigir e-mail
      </label>
      <input
        id={inputId}
        type="email"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="eid-input-dark h-10 w-full rounded-lg px-3 text-[12px] text-eid-fg"
        placeholder="seu-email@exemplo.com"
      />
      {error ? <p className="text-[11px] text-[#ff6b6b]">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={applyEmail}
          disabled={applying}
          className="flex-1 rounded-lg bg-eid-action-500 px-3 py-2 text-[12px] font-bold text-white transition hover:bg-eid-action-400"
        >
          {applying ? "Atualizando..." : applyLabel}
        </button>
        <button
          type="button"
          onClick={cancelEditing}
          disabled={applying}
          className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-2 text-[12px] font-semibold text-eid-text-secondary transition hover:text-eid-fg"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
