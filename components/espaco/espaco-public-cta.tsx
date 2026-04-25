"use client";

import { useActionState } from "react";
import {
  criarReservaEspacoAction,
  entrarFilaEsperaEspacoAction,
  solicitarSocioEspacoAction,
} from "@/app/espaco/actions";

const initial = { ok: false, message: "" };

export function EspacoPublicJoinForm({
  espacoId,
  planos,
}: {
  espacoId: number;
  planos: Array<{ id: number; nome: string; mensalidade_centavos: number | null }>;
}) {
  const [state, action, pending] = useActionState(solicitarSocioEspacoAction, initial);

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-eid-action-500/25 bg-eid-card/90 p-4">
      <input type="hidden" name="espaco_id" value={espacoId} />
      <h3 className="text-sm font-bold text-eid-fg">Seja sócio</h3>
      <select
        name="plano_socio_id"
        className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
        defaultValue={planos[0]?.id ?? ""}
      >
        {planos.map((plano) => (
          <option key={plano.id} value={plano.id}>
            {plano.nome} · R$ {((Number(plano.mensalidade_centavos ?? 0) || 0) / 100).toFixed(2).replace(".", ",")}
          </option>
        ))}
      </select>
      <textarea
        name="mensagem"
        rows={2}
        placeholder="Conte ao clube o que você procura."
        className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          type="file"
          name="documento_rg"
          accept=".pdf,image/*"
          className="eid-input-dark rounded-xl px-3 py-2 text-xs"
        />
        <input
          type="file"
          name="documento_cpf"
          accept=".pdf,image/*"
          className="eid-input-dark rounded-xl px-3 py-2 text-xs"
        />
        <input
          type="file"
          name="documento_comprovante"
          accept=".pdf,image/*"
          className="eid-input-dark rounded-xl px-3 py-2 text-xs"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="eid-btn-primary w-full rounded-xl px-4 py-3 text-sm font-bold"
      >
        {pending ? "Enviando..." : "Solicitar associação"}
      </button>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function EspacoPublicReservaForm({
  espacoId,
  unidadeId,
  esporteId,
}: {
  espacoId: number;
  unidadeId: number | null;
  esporteId: number | null;
}) {
  const [state, action, pending] = useActionState(criarReservaEspacoAction, initial);
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4">
      <input type="hidden" name="espaco_id" value={espacoId} />
      <input type="hidden" name="espaco_unidade_id" value={unidadeId ?? ""} />
      <input type="hidden" name="esporte_id" value={esporteId ?? ""} />
      <h3 className="text-sm font-bold text-eid-fg">Reservar horário</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="datetime-local"
          name="inicio"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          name="fim"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="number"
          name="valor_centavos"
          min={0}
          step={100}
          placeholder="Valor em centavos"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
        />
        <select
          name="tipo_reserva"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
          defaultValue="paga"
        >
          <option value="paga">Reserva paga</option>
          <option value="socio">Benefício de sócio</option>
          <option value="professor">Uso por professor</option>
          <option value="torneio">Uso por torneio</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs text-eid-fg">
        <input type="checkbox" name="usar_beneficio_gratis" />
        Tentar usar benefício gratuito do plano
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-3 text-sm font-bold text-eid-primary-300"
      >
        {pending ? "Criando..." : "Solicitar reserva"}
      </button>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>
          {state.message}
        </p>
      ) : null}
      <p className="text-[11px] text-eid-text-secondary">
        Com valor de reserva paga, você será direcionado ao checkout do Asaas (PIX) para concluir o pagamento na hora.
      </p>
    </form>
  );
}

export function EspacoPublicWaitlistForm({
  espacoId,
  unidadeId,
  esporteId,
}: {
  espacoId: number;
  unidadeId: number | null;
  esporteId: number | null;
}) {
  const [state, action, pending] = useActionState(entrarFilaEsperaEspacoAction, initial);
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4">
      <input type="hidden" name="espaco_id" value={espacoId} />
      <input type="hidden" name="espaco_unidade_id" value={unidadeId ?? ""} />
      <input type="hidden" name="esporte_id" value={esporteId ?? ""} />
      <h3 className="text-sm font-bold text-eid-fg">Fila de espera</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="datetime-local"
          name="inicio"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          name="fim"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-3 text-sm font-bold text-eid-fg"
      >
        {pending ? "Entrando..." : "Entrar na fila"}
      </button>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
