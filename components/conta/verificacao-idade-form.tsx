"use client";

import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { submeterVerificacaoIdade } from "@/app/conta/verificacao-idade/actions";

export function VerificacaoIdadeForm({ nome: _nome }: { nome: string }) {
  void _nome;
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    startTransition(async () => {
      const r = await submeterVerificacaoIdade(fd);
      if (r.ok) {
        setMsg(
          "Verificação concluída. O resultado foi registrado para auditoria e o administrador foi notificado. Você já pode voltar ao app."
        );
        e.currentTarget.reset();
      } else {
        setMsg(r.error);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 space-y-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4"
    >
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Foto do documento (com rosto visível)</label>
        <input name="documento" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-1 block w-full text-xs" />
      </div>
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Selfie (rosto nítido, sem filtros fortes)</label>
        <input name="selfie" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-1 block w-full text-xs" />
      </div>
      <p className="text-[10px] leading-relaxed text-eid-text-secondary">
        Os arquivos ficam em armazenamento restrito para auditoria. Em produção configure AWS Rekognition (variáveis de ambiente); sem
        isso, em desenvolvimento pode ser usado modo simulado.
      </p>
      {msg ? <p className="text-sm text-eid-fg">{msg}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="eid-btn-primary w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
      >
        {pending ? "Processando…" : "Enviar para verificação automática"}
      </button>
    </form>
  );
}
