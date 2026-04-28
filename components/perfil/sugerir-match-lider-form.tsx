"use client";

import { useActionState } from "react";
import { sugerirMatchParaLider, type SugestaoMatchState } from "@/app/comunidade/actions";

const initial: SugestaoMatchState = { ok: false, message: "" };

export function SugerirMatchLiderForm({
  alvoTimeId,
  alvoNome,
  modalidadeLabel,
  formacoesMinhas,
}: {
  alvoTimeId: number;
  alvoNome: string;
  /** Ex.: "dupla" ou "equipe" — texto para o aviso de que o usuário não é líder. */
  modalidadeLabel: string;
  formacoesMinhas: { id: number; nome: string }[];
}) {
  const [state, formAction, pending] = useActionState(sugerirMatchParaLider, initial);
  const err = !state.ok && state.message ? state.message : null;
  const ok = state.ok ? state.message : null;

  if (formacoesMinhas.length === 0) return null;

  return (
    <div className="rounded-xl border border-eid-action-500/30 bg-eid-action-500/5 p-3 text-left">
      <p className="text-[12px] font-bold uppercase tracking-wide text-eid-action-400 sm:text-[13px]">Sugerir desafio ao líder</p>
      <p className="mt-2 text-[12px] leading-relaxed text-eid-text-secondary">
        Você não é líder de uma {modalidadeLabel} neste esporte, mas faz parte de uma
        formação. Envie uma sugestão ao líder de <strong className="text-eid-fg">{alvoNome}</strong>. Se ele aprovar, o
        desafio é confirmado e <strong className="text-eid-fg">todos os integrantes das duas formações</strong> recebem
        aviso.
      </p>
      <form action={formAction} className="mt-3 grid gap-2.5">
        <input type="hidden" name="alvo_time_id" value={alvoTimeId} />
        <label className="text-[12px] font-semibold text-eid-text-secondary">
          Sua formação neste confronto
          <select
            name="sugeridor_time_id"
            required
            className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2.5 !text-[13px] font-semibold text-eid-fg"
            style={{ fontSize: "13px" }}
            defaultValue={formacoesMinhas.length === 1 ? String(formacoesMinhas[0]!.id) : ""}
          >
            {formacoesMinhas.length > 1 ? <option value="" style={{ fontSize: "13px" }}>Selecione…</option> : null}
            {formacoesMinhas.map((f) => (
              <option key={f.id} value={f.id} style={{ fontSize: "13px" }}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[12px] font-semibold text-eid-text-secondary">
          Recado opcional ao líder
          <textarea
            name="mensagem"
            rows={2}
            maxLength={500}
            placeholder="Ex.: podemos sábado à tarde…"
            className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2.5 text-[13px] text-eid-fg placeholder:text-[12px]"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="eid-btn-primary min-h-[44px] rounded-xl px-4 py-2.5 !text-[14px] font-black tracking-[0.02em] disabled:opacity-50"
          style={{ fontSize: "14px" }}
        >
          {pending ? "Enviando…" : "Enviar sugestão ao líder"}
        </button>
        {err ? <p className="text-xs text-red-300">{err}</p> : null}
        {ok ? <p className="text-xs text-eid-primary-300">{ok}</p> : null}
      </form>
    </div>
  );
}
