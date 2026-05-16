"use client";

import { useState } from "react";
import Image from "next/image";
import {
  atualizarHorarioSemanalEspacoAction,
  removerHorarioSemanalEspacoAction,
} from "@/app/espaco/actions";

const DIAS_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const DIAS_FULL = [
  "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type SlotAdmin = {
  id: number;
  espaco_unidade_id: number | null;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  ativo: boolean;
  liberar_professor: boolean | null;
  liberar_torneio: boolean | null;
  observacoes: string | null;
};

export type UnidadeAdmin = {
  id: number;
  nome: string;
  tipo_unidade: string | null;
  logo_arquivo: string | null;
  status_operacao: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseObservacoes(raw: unknown): string {
  const linhas = String(raw ?? "")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => !l.trim().startsWith("[eid-horario]"));
  return linhas.join("\n").trim();
}

// ─── Unit Header ─────────────────────────────────────────────────────────────

function UnidadeCardHeader({ unidade }: { unidade: UnidadeAdmin }) {
  return (
    <div className="relative h-24 overflow-hidden bg-gradient-to-br from-eid-primary-900/40 to-eid-brand-ink">
      {unidade.logo_arquivo && (
        <Image
          src={unidade.logo_arquivo}
          alt={unidade.nome}
          fill
          unoptimized
          className="object-cover opacity-60"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-eid-brand-ink/90 via-eid-brand-ink/30 to-transparent" />
      <div className="absolute bottom-0 left-0 p-3">
        <p className="text-base font-black leading-tight text-white drop-shadow">{unidade.nome}</p>
        {unidade.tipo_unidade && (
          <p className="mt-0.5 text-[11px] font-medium text-white/60">{unidade.tipo_unidade}</p>
        )}
      </div>
    </div>
  );
}

// ─── Slot Card ───────────────────────────────────────────────────────────────

function SlotAdminCard({ item, espacoId }: { item: SlotAdmin; espacoId: number }) {
  const [open, setOpen] = useState(false);
  const notaTexto = parseObservacoes(item.observacoes);

  return (
    <article className="overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40">
      {/* Summary row */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="text-sm font-black tabular-nums text-eid-fg">
            {String(item.hora_inicio).slice(0, 5)}–{String(item.hora_fim).slice(0, 5)}
          </span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              item.ativo
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-eid-surface/60 text-eid-text-secondary"
            }`}
          >
            {item.ativo ? "Ativo" : "Inativo"}
          </span>
          {item.liberar_professor && (
            <span className="rounded-full bg-eid-primary-500/15 px-1.5 py-0.5 text-[10px] font-bold text-eid-primary-300">
              Prof
            </span>
          )}
          {item.liberar_torneio && (
            <span className="rounded-full bg-eid-action-500/15 px-1.5 py-0.5 text-[10px] font-bold text-eid-action-300">
              Torneio
            </span>
          )}
          <span className="ml-auto text-xs text-eid-text-secondary/60">{open ? "▲" : "▼"}</span>
        </button>

        <form action={removerHorarioSemanalEspacoAction}>
          <input type="hidden" name="espaco_id" value={espacoId} />
          <input type="hidden" name="horario_id" value={item.id} />
          <button className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-300 transition hover:bg-red-500/20">
            ✕
          </button>
        </form>
      </div>

      {/* Inline edit — collapsible */}
      {open && (
        <form
          action={atualizarHorarioSemanalEspacoAction}
          className="border-t border-[color:var(--eid-border-subtle)] px-3 pb-3 pt-2.5"
        >
          <input type="hidden" name="espaco_id" value={espacoId} />
          <input type="hidden" name="horario_id" value={item.id} />
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              name="ativo"
              defaultValue={item.ativo ? "true" : "false"}
              className="eid-input-dark rounded-lg px-3 py-2 text-xs"
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-xs text-eid-text-secondary">
                <input
                  type="checkbox"
                  name="liberar_professor"
                  defaultChecked={Boolean(item.liberar_professor)}
                  className="accent-eid-primary-500"
                />
                Prof
              </label>
              <label className="flex items-center gap-1.5 text-xs text-eid-text-secondary">
                <input
                  type="checkbox"
                  name="liberar_torneio"
                  defaultChecked={Boolean(item.liberar_torneio)}
                  className="accent-eid-primary-500"
                />
                Torneio
              </label>
            </div>
            <textarea
              name="observacoes"
              rows={2}
              defaultValue={notaTexto}
              placeholder="Nota interna"
              className="eid-input-dark rounded-lg px-2.5 py-2 text-xs sm:col-span-2"
            />
          </div>
          <button className="mt-2 w-full rounded-lg border border-eid-primary-500/30 bg-eid-primary-500/10 px-3 py-2 text-xs font-bold text-eid-primary-300 transition hover:bg-eid-primary-500/15">
            Salvar alterações
          </button>
        </form>
      )}
    </article>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GradeAdminView({
  espacoId,
  unidades,
  slots,
}: {
  espacoId: number;
  unidades: UnidadeAdmin[];
  slots: SlotAdmin[];
}) {
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay());
  const todayDia = new Date().getDay();

  // Total slots per day for badge count
  const countPerDay = DIAS_CURTO.map((_, dia) => slots.filter((s) => Number(s.dia_semana) === dia).length);

  return (
    <div>
      {/* Day tabs */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
        {([0, 1, 2, 3, 4, 5, 6] as const).map((dia) => {
          const isToday = todayDia === dia;
          const isSelected = selectedDay === dia;
          const count = countPerDay[dia];

          return (
            <button
              key={dia}
              type="button"
              onClick={() => setSelectedDay(dia)}
              className={`flex min-w-[52px] shrink-0 flex-col items-center rounded-xl px-2 py-2 text-center transition ${
                isSelected
                  ? "bg-eid-primary-500 text-white shadow-[0_2px_12px_-4px_rgba(37,99,235,0.4)]"
                  : isToday
                  ? "border border-eid-primary-500/40 bg-eid-primary-500/10 text-eid-primary-300"
                  : "border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 text-eid-text-secondary hover:border-eid-primary-500/30 hover:text-eid-fg"
              }`}
            >
              <span className="text-[9px] font-bold uppercase tracking-wide">{DIAS_CURTO[dia]}</span>
              {count > 0 ? (
                <span
                  className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                    isSelected ? "bg-white/20 text-white" : "bg-eid-primary-500/15 text-eid-primary-300"
                  }`}
                >
                  {count}
                </span>
              ) : (
                <span className="mt-0.5 text-[9px] text-eid-text-secondary/40">–</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day label */}
      <p className="mb-3 text-sm font-black text-eid-fg">{DIAS_FULL[selectedDay]}</p>

      {/* Unit cards */}
      <div className="space-y-4">
        {unidades.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-8 text-center">
            <p className="text-sm font-bold text-eid-fg">Nenhuma quadra cadastrada</p>
            <p className="mt-1 text-xs text-eid-text-secondary">Adicione quadras no painel de configurações.</p>
          </div>
        ) : (
          unidades.map((unidade) => {
            const slotsUnidade = slots
              .filter(
                (s) => s.espaco_unidade_id === unidade.id && Number(s.dia_semana) === selectedDay
              )
              .sort((a, b) =>
                String(a.hora_inicio).localeCompare(String(b.hora_inicio))
              );

            return (
              <div
                key={unidade.id}
                className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 shadow-sm"
              >
                {/* Photo header */}
                <UnidadeCardHeader unidade={unidade} />

                {/* Slots */}
                <div className="p-3">
                  {slotsUnidade.length === 0 ? (
                    <p className="py-2 text-center text-xs text-eid-text-secondary">
                      Nenhum horário configurado para {DIAS_FULL[selectedDay]}.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {slotsUnidade.map((item) => (
                        <SlotAdminCard key={item.id} item={item} espacoId={espacoId} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
