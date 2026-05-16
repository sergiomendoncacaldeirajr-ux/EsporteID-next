"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Clock } from "lucide-react";
import { reservarQuadraParaPartidaAction } from "@/app/espaco/actions";

export type SlotDisponivel = {
  inicio: string;
  fim: string;
  label: string;
};

export type UnidadeComSlots = {
  id: number;
  nome: string;
  slots: SlotDisponivel[];
};

export type EspacoMembroInfo = {
  espacoId: number;
  espacoNome: string;
  espacoSlug: string | null;
  unidades: UnidadeComSlots[];
};

type Props = {
  partidaId: number;
  espacos: EspacoMembroInfo[];
  jaTemReserva: boolean;
};

type State = { ok: true; message: string } | { ok: false; message: string } | undefined;

export function RankPartidaReservaQuadra({ partidaId, espacos, jaTemReserva }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedEspaco, setSelectedEspaco] = useState<number | null>(
    espacos.length === 1 ? espacos[0].espacoId : null
  );
  const [selectedUnidade, setSelectedUnidade] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotDisponivel | null>(null);
  const [state, formAction, pending] = useActionState<State, FormData>(
    reservarQuadraParaPartidaAction,
    undefined
  );

  if (jaTemReserva) {
    return (
      <div className="rounded-2xl border border-eid-primary-500/25 bg-eid-primary-900/20 px-4 py-3 eid-light:bg-eid-primary-500/6">
        <p className="text-[12px] font-bold text-eid-primary-300 eid-light:text-eid-primary-700">
          Quadra reservada para esta partida
        </p>
      </div>
    );
  }

  if (espacos.length === 0) return null;

  const espacoAtual = espacos.find((e) => e.espacoId === selectedEspaco) ?? null;
  const unidadeAtual = espacoAtual?.unidades.find((u) => u.id === selectedUnidade) ?? null;
  const slotsDisponiveis = unidadeAtual?.slots ?? [];

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-900/20 px-4 py-4 eid-light:bg-green-50">
        <p className="text-[13px] font-bold text-green-300 eid-light:text-green-700">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 eid-light:bg-white/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-eid-surface/80"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-eid-primary-500/12 text-eid-primary-400 eid-light:text-eid-primary-600">
          <MapPin className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-black uppercase tracking-[0.08em] text-eid-text-secondary">
            Quadra
          </p>
          <p className="text-[13px] font-bold leading-tight text-eid-fg">
            Reservar quadra para esta partida
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-eid-text-secondary/60" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-eid-text-secondary/60" />
        )}
      </button>

      {open ? (
        <div className="border-t border-[color:var(--eid-border-subtle)] px-4 pb-4 pt-3">
          <p className="mb-3 text-[11px] text-eid-text-secondary">
            Você é membro {espacos.length > 1 ? "de espaços" : `de ${espacos[0].espacoNome}`}.
            Selecione uma quadra disponível para esta partida.
          </p>

          {/* Espaço selector */}
          {espacos.length > 1 ? (
            <div className="mb-3">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-eid-text-secondary">
                Espaço
              </p>
              <div className="flex flex-wrap gap-2">
                {espacos.map((e) => (
                  <button
                    key={e.espacoId}
                    type="button"
                    onClick={() => {
                      setSelectedEspaco(e.espacoId);
                      setSelectedUnidade(null);
                      setSelectedSlot(null);
                    }}
                    className={`rounded-full border px-3 py-1 text-[12px] font-bold transition ${
                      selectedEspaco === e.espacoId
                        ? "border-eid-primary-500 bg-eid-primary-500/15 text-eid-primary-300 eid-light:text-eid-primary-700"
                        : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:border-eid-primary-500/50"
                    }`}
                  >
                    {e.espacoNome}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Unidade selector */}
          {espacoAtual && espacoAtual.unidades.length > 0 ? (
            <div className="mb-3">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-eid-text-secondary">
                Quadra / Unidade
              </p>
              <div className="flex flex-wrap gap-2">
                {espacoAtual.unidades.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUnidade(u.id);
                      setSelectedSlot(null);
                    }}
                    className={`rounded-full border px-3 py-1 text-[12px] font-bold transition ${
                      selectedUnidade === u.id
                        ? "border-eid-primary-500 bg-eid-primary-500/15 text-eid-primary-300 eid-light:text-eid-primary-700"
                        : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:border-eid-primary-500/50"
                    }`}
                  >
                    {u.nome}
                  </button>
                ))}
              </div>
            </div>
          ) : espacoAtual ? (
            <p className="mb-3 text-[11px] text-eid-text-secondary">
              Nenhuma unidade/quadra cadastrada neste espaço.
            </p>
          ) : null}

          {/* Slot selector */}
          {slotsDisponiveis.length > 0 ? (
            <div className="mb-4">
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-eid-text-secondary">
                Horário disponível
              </p>
              <div className="flex flex-wrap gap-2">
                {slotsDisponiveis.map((slot) => (
                  <button
                    key={slot.inicio}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-bold transition ${
                      selectedSlot?.inicio === slot.inicio
                        ? "border-eid-action-500 bg-eid-action-500/15 text-eid-action-300 eid-light:text-eid-action-600"
                        : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:border-eid-action-500/50"
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
          ) : unidadeAtual ? (
            <p className="mb-4 text-[11px] text-eid-text-secondary">
              Nenhum horário livre disponível nesta quadra para a data da partida.
            </p>
          ) : null}

          {/* Error */}
          {state && !state.ok ? (
            <p className="mb-3 rounded-xl bg-red-900/20 px-3 py-2 text-[12px] font-bold text-red-400 eid-light:bg-red-50 eid-light:text-red-600">
              {state.message}
            </p>
          ) : null}

          {/* Submit */}
          {selectedSlot && selectedEspaco ? (
            <form action={formAction}>
              <input type="hidden" name="partida_id" value={partidaId} />
              <input type="hidden" name="espaco_id" value={selectedEspaco} />
              {selectedUnidade ? (
                <input type="hidden" name="espaco_unidade_id" value={selectedUnidade} />
              ) : null}
              <input type="hidden" name="inicio" value={selectedSlot.inicio} />
              <input type="hidden" name="fim" value={selectedSlot.fim} />
              <div className="rounded-xl border border-eid-action-500/25 bg-eid-action-500/8 px-3 py-2.5 eid-light:bg-eid-action-500/6">
                <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-eid-action-300 eid-light:text-eid-action-600">
                  Confirmar reserva
                </p>
                <p className="mb-3 text-[12px] font-bold text-eid-fg">
                  {espacoAtual?.espacoNome}
                  {unidadeAtual ? ` · ${unidadeAtual.nome}` : ""} · {selectedSlot.label}
                </p>
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-xl bg-eid-action-500 py-2.5 text-[13px] font-black text-white shadow-[0_4px_16px_-8px_rgba(249,115,22,0.5)] transition hover:bg-eid-action-400 active:scale-[0.98] disabled:opacity-60"
                >
                  {pending ? "Reservando…" : "Reservar quadra"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
