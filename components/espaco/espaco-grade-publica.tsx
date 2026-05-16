"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { criarReservaEspacoAction } from "@/app/espaco/actions";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const DIAS_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"] as const;

function fmt(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function getMondayOfWeek(offset: number): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function buildSlotDate(weekMonday: Date, diaSemana: number, hora: string): Date {
  const d = new Date(weekMonday);
  d.setDate(weekMonday.getDate() + (diaSemana === 0 ? 6 : diaSemana - 1));
  const [h, m] = hora.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

export type ReservaPublica = {
  id: number;
  espaco_unidade_id: number | null;
  inicio: string;
  fim: string;
  partida_id: number | null;
  torneio_id: number | null;
  participantes: Array<{
    id: number;
    profiles: { id: string; nome: string | null; avatar_url: string | null } | null;
  }>;
};

export type HorarioSemanal = {
  id: number;
  espaco_unidade_id: number | null;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  ativo: boolean;
};

export type UnidadePublica = {
  id: number;
  nome: string;
  tipo_unidade: string | null;
};

export type PlanoPublico = {
  id: number;
  nome: string;
  mensalidade_centavos: number | null;
};

type SlotInfo = {
  horario: HorarioSemanal;
  reserva: ReservaPublica | null;
  inicio: Date;
  fim: Date;
};

type PopupState = {
  slot: SlotInfo;
  unidade: UnidadePublica;
};

type DrawerState =
  | { tipo: "membro" }
  | { tipo: "socio" }
  | { tipo: "reservar"; slot: SlotInfo; unidade: UnidadePublica; ehPago: boolean };

type Props = {
  espacoId: number;
  slug: string;
  unidades: UnidadePublica[];
  horarios: HorarioSemanal[];
  reservas: ReservaPublica[];
  modoReserva: string;
  isMembroAtivo: boolean;
  isLogado: boolean;
  planos: PlanoPublico[];
  valorPadraoCentavos: number;
  semanaOffset: number;
  formasPagamentoAceitas: string[];
  onSolicitarEntrada?: () => void;
};

function Avatar({ profile, size = 24 }: { profile: { nome: string | null; avatar_url: string | null } | null; size?: number }) {
  if (!profile) return null;
  if (profile.avatar_url) {
    return <Image src={profile.avatar_url} alt="" width={size} height={size} unoptimized className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="flex items-center justify-center rounded-full bg-eid-primary-500/15 text-[10px] font-bold text-eid-primary-300"
      style={{ width: size, height: size }}
    >
      {(profile.nome ?? "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

function SlotPopup({ popup, onClose }: { popup: PopupState; onClose: () => void }) {
  const { slot, unidade } = popup;
  const reserva = slot.reserva;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-eid-brand-ink/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-eid-text-secondary hover:text-eid-fg">
          <X className="h-4 w-4" />
        </button>

        <p className="text-[10px] font-black uppercase tracking-wide text-eid-primary-300">{unidade.nome}</p>
        <p className="mt-1 text-base font-black text-eid-fg">
          {slot.inicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}–
          {slot.fim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-xs text-eid-text-secondary">
          {slot.inicio.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}
        </p>

        {reserva ? (
          <>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {reserva.partida_id && (
                <span className="rounded-full border border-eid-action-500/35 bg-eid-action-500/10 px-2 py-0.5 text-[10px] font-black text-eid-action-300">
                  RANK #{reserva.partida_id}
                </span>
              )}
              {reserva.torneio_id && (
                <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-300">
                  TORNEIO #{reserva.torneio_id}
                </span>
              )}
              {!reserva.partida_id && !reserva.torneio_id && (
                <span className="rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-2 py-0.5 text-[10px] font-bold text-eid-text-secondary">
                  Reserva particular
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {reserva.participantes.length ? (
                reserva.participantes.map((p) => (
                  p.profiles?.id ? (
                    <Link
                      key={p.id}
                      href={`/perfil/${p.profiles.id}`}
                      className="flex items-center gap-2.5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-3 py-2.5 transition hover:bg-eid-primary-500/5"
                    >
                      <Avatar profile={p.profiles} size={32} />
                      <span className="text-sm font-bold text-eid-fg">{p.profiles.nome ?? "Jogador"}</span>
                    </Link>
                  ) : null
                ))
              ) : (
                <p className="text-xs text-eid-text-secondary">Reservado — sem perfis vinculados.</p>
              )}
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-emerald-300 font-bold">Horário livre</p>
        )}
      </div>
    </div>
  );
}

const FORMA_LABEL: Record<string, string> = { pix: "PIX", cartao: "Cartão de crédito", boleto: "Boleto bancário" };
const FORMA_DESC: Record<string, string> = {
  pix: "Aprovação imediata",
  cartao: "Link seguro Asaas",
  boleto: "Até 3 dias úteis",
};

function ReservarDrawer({
  slot,
  unidade,
  espacoId,
  ehPago,
  valorCentavos,
  formasPagamento,
  onClose,
}: {
  slot: SlotInfo;
  unidade: UnidadePublica;
  espacoId: number;
  ehPago: boolean;
  valorCentavos: number;
  formasPagamento: string[];
  onClose: () => void;
}) {
  const [formaPagamento, setFormaPagamento] = useState<string>(formasPagamento[0] ?? "pix");
  const [state, formAction, pending] = useActionState(criarReservaEspacoAction, undefined);

  if (state?.ok) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
        <div className="absolute inset-0 bg-eid-brand-ink/60 backdrop-blur-sm" />
        <div
          className="relative w-full max-w-sm rounded-t-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-5 shadow-2xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-base font-black text-emerald-300">{state.message}</p>
          <button onClick={onClose} className="mt-4 w-full rounded-xl bg-eid-surface px-4 py-3 text-sm font-bold text-eid-fg">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const valorFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valorCentavos / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-eid-brand-ink/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-t-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-eid-text-secondary hover:text-eid-fg">
          <X className="h-4 w-4" />
        </button>

        <p className="text-[10px] font-black uppercase tracking-wide text-eid-primary-300">Reservar</p>
        <p className="mt-1 text-base font-black text-eid-fg">{unidade.nome}</p>
        <p className="text-sm text-eid-text-secondary">
          {slot.inicio.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}{" "}
          · {slot.inicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}–
          {slot.fim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>

        {ehPago && valorCentavos > 0 && (
          <p className="mt-2 text-xl font-black text-eid-action-300 eid-light:text-eid-action-600">{valorFmt}</p>
        )}

        {ehPago && formasPagamento.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-eid-text-secondary">
              Forma de pagamento
            </p>
            <div className="space-y-2">
              {formasPagamento.map((forma) => (
                <label
                  key={forma}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    formaPagamento === forma
                      ? "border-eid-action-500/50 bg-eid-action-500/10"
                      : "border-[color:var(--eid-border-subtle)] bg-eid-surface/40 hover:border-eid-action-500/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="forma_pagamento_ui"
                    value={forma}
                    checked={formaPagamento === forma}
                    onChange={() => setFormaPagamento(forma)}
                    className="accent-eid-action-500 sr-only"
                  />
                  <span className={`h-4 w-4 shrink-0 rounded-full border-2 transition ${formaPagamento === forma ? "border-eid-action-500 bg-eid-action-500" : "border-eid-text-secondary/50"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-eid-fg">{FORMA_LABEL[forma] ?? forma}</p>
                    <p className="text-[11px] text-eid-text-secondary">{FORMA_DESC[forma] ?? ""}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {!ehPago && (
          <p className="mt-3 text-xs text-eid-text-secondary">Confirmar reserva gratuita para este horário?</p>
        )}

        {state && !state.ok ? (
          <p className="mt-3 rounded-lg bg-red-900/20 px-3 py-2 text-xs font-bold text-red-400 eid-light:bg-red-50 eid-light:text-red-600">
            {state.message}
          </p>
        ) : null}

        <form action={formAction} className="mt-4">
          <input type="hidden" name="espaco_id" value={espacoId} />
          {slot.horario.espaco_unidade_id ? (
            <input type="hidden" name="espaco_unidade_id" value={slot.horario.espaco_unidade_id} />
          ) : null}
          <input type="hidden" name="inicio" value={slot.inicio.toISOString()} />
          <input type="hidden" name="fim" value={slot.fim.toISOString()} />
          <input type="hidden" name="tipo_reserva" value="avulsa" />
          {!ehPago && <input type="hidden" name="usar_beneficio_gratis" value="on" />}
          {ehPago && <input type="hidden" name="forma_pagamento" value={formaPagamento} />}
          <button
            type="submit"
            disabled={pending}
            className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition disabled:opacity-60 ${
              ehPago
                ? "bg-eid-action-500 text-white shadow-[0_4px_16px_-8px_rgba(249,115,22,0.5)] hover:bg-eid-action-400"
                : "border border-emerald-500/35 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
            }`}
          >
            {pending
              ? "Processando…"
              : ehPago
              ? `Pagar ${valorCentavos > 0 ? valorFmt : ""}`
              : "Confirmar reserva gratuita"}
          </button>
        </form>
      </div>
    </div>
  );
}

function MembroEntryDrawer({ espacoId, slug, planos, onClose }: { espacoId: number; slug: string; planos: PlanoPublico[]; onClose: () => void }) {
  const [tab, setTab] = useState<"entrar" | "socio">("entrar");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-eid-brand-ink/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-t-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-eid-text-secondary hover:text-eid-fg">
          <X className="h-4 w-4" />
        </button>

        <p className="text-[10px] font-black uppercase tracking-wide text-eid-primary-300">Acesso ao espaço</p>
        <p className="mt-1 text-base font-black text-eid-fg">Como deseja entrar?</p>

        {planos.length > 0 && (
          <div className="mt-3 flex rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-0.5 text-xs font-bold">
            <button
              className={`flex-1 rounded-lg px-3 py-2 transition ${tab === "entrar" ? "bg-eid-primary-500 text-white" : "text-eid-text-secondary"}`}
              onClick={() => setTab("entrar")}
            >
              Entrar como membro
            </button>
            <button
              className={`flex-1 rounded-lg px-3 py-2 transition ${tab === "socio" ? "bg-eid-action-500 text-white" : "text-eid-text-secondary"}`}
              onClick={() => setTab("socio")}
            >
              Virar sócio
            </button>
          </div>
        )}

        {tab === "entrar" ? (
          <div className="mt-4">
            <p className="text-sm text-eid-text-secondary">
              Solicite entrada como membro. O dono do espaço revisará sua solicitação.
            </p>
            <form action={`/espaco/${slug}/entrar`} method="POST" className="mt-4">
              <input type="hidden" name="espaco_id" value={espacoId} />
              <button className="w-full rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/15 px-4 py-3 text-sm font-bold text-eid-primary-300 transition hover:bg-eid-primary-500/20">
                Solicitar entrada
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-eid-text-secondary mb-3">
              Vire sócio e tenha acesso completo com reservas e benefícios.
            </p>
            {planos.map((plano) => (
              <form key={plano.id} action={`/espaco/${slug}/assinar`} method="POST">
                <input type="hidden" name="espaco_id" value={espacoId} />
                <input type="hidden" name="plano_id" value={plano.id} />
                <button className="flex w-full items-center justify-between rounded-xl border border-eid-action-500/25 bg-eid-action-500/8 px-4 py-3 text-left transition hover:bg-eid-action-500/12">
                  <span>
                    <span className="block text-sm font-bold text-eid-fg">{plano.nome}</span>
                    <span className="text-xs text-eid-text-secondary">
                      R$ {((Number(plano.mensalidade_centavos ?? 0)) / 100).toFixed(2).replace(".", ",")} / mês
                    </span>
                  </span>
                  <span className="text-xs font-bold text-eid-action-300">Assinar →</span>
                </button>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function EspacoGradePublica({
  espacoId,
  slug,
  unidades,
  horarios,
  reservas,
  modoReserva,
  isMembroAtivo,
  isLogado,
  planos,
  valorPadraoCentavos,
  semanaOffset: initialOffset,
  formasPagamentoAceitas,
}: Props) {
  const [offset, setOffset] = useState(initialOffset);
  const [filtroLivres, setFiltroLivres] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [drawer, setDrawer] = useState<DrawerState | null>(null);

  const weekMonday = getMondayOfWeek(offset);
  const weekSunday = new Date(weekMonday);
  weekSunday.setDate(weekMonday.getDate() + 6);

  // Build slot list for the week
  type DayGroup = { dia: number; slots: SlotInfo[] };
  type UnidadeGroup = { unidade: UnidadePublica; days: DayGroup[] };

  const grupos: UnidadeGroup[] = unidades.map((unidade) => {
    const horariosUnidade = horarios.filter((h) => h.ativo && h.espaco_unidade_id === unidade.id);
    const diasMap = new Map<number, SlotInfo[]>();

    for (const h of horariosUnidade) {
      const dia = Math.min(6, Math.max(0, h.dia_semana));
      const inicio = buildSlotDate(weekMonday, dia, String(h.hora_inicio).slice(0, 5));
      const fim = buildSlotDate(weekMonday, dia, String(h.hora_fim).slice(0, 5));

      const reserva = reservas.find((r) => {
        if (r.espaco_unidade_id !== unidade.id) return false;
        const rIni = new Date(r.inicio);
        const rFim = new Date(r.fim);
        return rIni.getTime() === inicio.getTime() && rFim.getTime() === fim.getTime();
      }) ?? null;

      const slot: SlotInfo = { horario: h, reserva, inicio, fim };
      if (!diasMap.has(dia)) diasMap.set(dia, []);
      diasMap.get(dia)!.push(slot);
    }

    const days: DayGroup[] = [];
    for (let d = 0; d <= 6; d++) {
      const slots = diasMap.get(d);
      if (slots?.length) days.push({ dia: d, slots });
    }

    return { unidade, days };
  }).filter((g) => g.days.length > 0);

  function handleSlotClick(slot: SlotInfo, unidade: UnidadePublica) {
    if (slot.reserva) {
      setPopup({ slot, unidade });
      return;
    }

    if (!isLogado) {
      window.location.href = `/login?next=${encodeURIComponent(`/espaco/${slug}`)}`;
      return;
    }

    if (modoReserva === "paga") {
      setDrawer({ tipo: "reservar", slot, unidade, ehPago: true });
      return;
    }

    if (!isMembroAtivo) {
      setDrawer({ tipo: "membro" });
      return;
    }

    setDrawer({ tipo: "reservar", slot, unidade, ehPago: false });
  }

  const canInteractWithSlots = isMembroAtivo || modoReserva === "paga";

  return (
    <div>
      {/* Controles */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Filtro */}
        <div className="flex rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-0.5">
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${!filtroLivres ? "bg-eid-primary-500/20 text-eid-primary-200" : "text-eid-text-secondary"}`}
            onClick={() => setFiltroLivres(false)}
          >
            Grade completa
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${filtroLivres ? "bg-emerald-500/20 text-emerald-300" : "text-eid-text-secondary"}`}
            onClick={() => setFiltroLivres(true)}
          >
            Só livres
          </button>
        </div>

        {/* Navegação de semana */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 text-eid-fg transition hover:bg-eid-primary-500/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold text-eid-fg tabular-nums">
            {fmt(weekMonday)} – {fmt(weekSunday)}
          </span>
          <button
            onClick={() => setOffset((o) => o + 1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 text-eid-fg transition hover:bg-eid-primary-500/10"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {offset !== 0 && (
            <button
              onClick={() => setOffset(0)}
              className="rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-2 py-1 text-[10px] font-bold text-eid-text-secondary transition hover:text-eid-fg"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      {/* Grade */}
      <div className="space-y-3">
        {grupos.length === 0 && (
          <p className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-6 text-center text-sm text-eid-text-secondary">
            Nenhum horário configurado para esta semana.
          </p>
        )}

        {grupos.map(({ unidade, days }) => (
          <details key={unidade.id} open className="group overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
              <div>
                <p className="text-sm font-black text-eid-fg">{unidade.nome}</p>
                {unidade.tipo_unidade && <p className="text-xs text-eid-text-secondary">{unidade.tipo_unidade}</p>}
              </div>
              <span className="text-lg font-black text-eid-primary-300 transition group-open:rotate-45">+</span>
            </summary>

            <div className="divide-y divide-[color:var(--eid-border-subtle)] border-t border-[color:var(--eid-border-subtle)]">
              {days.map(({ dia, slots }) => {
                const visiveis = filtroLivres ? slots.filter((s) => !s.reserva) : slots;
                if (filtroLivres && visiveis.length === 0) return null;

                const slotDate = buildSlotDate(weekMonday, dia, "00:00");

                return (
                  <div key={dia} className="p-3">
                    <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-eid-primary-300">
                      {DIAS_FULL[dia]} · {fmt(slotDate)}
                    </p>
                    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {visiveis.map((slot) => {
                        const livre = !slot.reserva;
                        const past = slot.fim < new Date();

                        return (
                          <button
                            key={slot.horario.id}
                            onClick={() => !past && handleSlotClick(slot, unidade)}
                            disabled={past && livre}
                            className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                              past
                                ? "border-[color:var(--eid-border-subtle)] bg-eid-surface/30 opacity-40 cursor-default"
                                : livre
                                ? canInteractWithSlots
                                  ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300 hover:bg-emerald-500/15 cursor-pointer"
                                  : "border-emerald-500/25 bg-emerald-500/8 text-emerald-300 cursor-pointer"
                                : "border-red-500/20 bg-red-500/8 text-eid-text-secondary cursor-pointer hover:bg-red-500/12"
                            }`}
                          >
                            <span className="font-bold tabular-nums">
                              {String(slot.horario.hora_inicio).slice(0, 5)}–{String(slot.horario.hora_fim).slice(0, 5)}
                            </span>
                            {livre ? (
                              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black text-emerald-300">LIVRE</span>
                            ) : (
                              <div className="flex -space-x-1">
                                {slot.reserva!.participantes.slice(0, 3).map((p, i) => (
                                  <div key={i} className="h-5 w-5 overflow-hidden rounded-full border border-eid-card">
                                    <Avatar profile={p.profiles} size={20} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      </div>

      {/* CTA para não-membros em espaço gratuito */}
      {!isMembroAtivo && modoReserva !== "paga" && isLogado && (
        <div className="mt-4 rounded-2xl border border-eid-primary-500/25 bg-eid-primary-500/8 p-4 text-center">
          <p className="text-sm text-eid-text-secondary mb-3">
            Para reservar horários neste espaço, você precisa ser membro.
          </p>
          <button
            onClick={() => setDrawer({ tipo: "membro" })}
            className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/15 px-5 py-2.5 text-sm font-bold text-eid-primary-300 transition hover:bg-eid-primary-500/20"
          >
            Solicitar entrada como membro
          </button>
        </div>
      )}

      {!isLogado && (
        <div className="mt-4 rounded-2xl border border-eid-action-500/25 bg-eid-action-500/8 p-4 text-center">
          <p className="text-sm text-eid-text-secondary mb-3">
            Entre ou crie conta para reservar horários neste espaço.
          </p>
          <div className="flex justify-center gap-3">
            <Link href={`/login?next=${encodeURIComponent(`/espaco/${slug}`)}`} className="rounded-xl border border-eid-action-500/35 bg-eid-action-500/15 px-5 py-2.5 text-sm font-bold text-eid-action-300 transition hover:bg-eid-action-500/20">
              Entrar
            </Link>
            <Link href={`/cadastro?next=${encodeURIComponent(`/espaco/${slug}`)}`} className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 px-5 py-2.5 text-sm font-bold text-eid-fg transition hover:bg-eid-surface/70">
              Criar conta
            </Link>
          </div>
        </div>
      )}

      {/* Popup slot ocupado */}
      {popup && <SlotPopup popup={popup} onClose={() => setPopup(null)} />}

      {/* Drawer de entrada/sócio */}
      {drawer?.tipo === "membro" && (
        <MembroEntryDrawer
          espacoId={espacoId}
          slug={slug}
          planos={planos}
          onClose={() => setDrawer(null)}
        />
      )}
      {drawer?.tipo === "reservar" && (
        <ReservarDrawer
          slot={drawer.slot}
          unidade={drawer.unidade}
          espacoId={espacoId}
          ehPago={drawer.ehPago}
          valorCentavos={valorPadraoCentavos}
          formasPagamento={formasPagamentoAceitas}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
