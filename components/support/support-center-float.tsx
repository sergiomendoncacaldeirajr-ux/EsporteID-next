"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Calendar,
  ChevronDown,
  Crown,
  Globe,
  GraduationCap,
  HeartHandshake,
  Headset,
  Key,
  LifeBuoy,
  MapPin,
  Medal,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Swords,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { submitSupportChamado, type SupportChamadoSubmitState } from "@/app/support/actions";
import {
  SUPPORT_CHAMADO_AREAS,
  SUPPORT_ESPACO_DONO_FAQ,
  SUPPORT_ESPACO_OPERACAO_FAQ,
  SUPPORT_FAQ_ITEMS,
  SUPPORT_PERFIL_FORMACOES_FAQ,
  supportFaqVisivelEmProducao,
  type RichFaqBlock,
  type SupportFaqIconKey,
  type SupportFaqItem,
} from "@/lib/support/support-areas";
import type { SystemFeatureKey } from "@/lib/system-features";

const FAQ_ICON_MAP: Record<SupportFaqIconKey, LucideIcon> = {
  ranking: Trophy,
  challenge: Swords,
  friendly: HeartHandshake,
  team: Users,
  venue: MapPin,
  solo: User,
  sport: Medal,
  captain: Crown,
  calendar: Calendar,
  store: ShoppingBag,
  graduation: GraduationCap,
  account: Key,
  community: Globe,
};

const initialSubmit: SupportChamadoSubmitState = { ok: false, message: "" };

function pathOcultaSuporte(pathname: string): boolean {
  const p = pathname || "";
  return p.startsWith("/admin") || p.startsWith("/api/");
}

const STAT_COR_MAP: Record<string, string> = {
  verde:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  azul:
    "border-eid-primary-500/30 bg-eid-primary-500/10 text-eid-primary-300",
  laranja:
    "border-eid-action-500/30 bg-eid-action-500/10 text-eid-action-400",
  roxo:
    "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

function RichFaqRenderer({ blocos }: { blocos: RichFaqBlock[] }) {
  return (
    <div className="space-y-3">
      {blocos.map((bloco, i) => {
        if (bloco.tipo === "intro") {
          return (
            <p key={i} className="text-[11.5px] leading-[1.7] text-eid-text-secondary">
              {bloco.texto}
            </p>
          );
        }
        if (bloco.tipo === "steps") {
          return (
            <ul key={i} className="space-y-2">
              {bloco.itens.map((item, j) => (
                <li
                  key={j}
                  className="flex gap-2.5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-bg/50 px-2.5 py-2"
                >
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-eid-primary-500/20 bg-eid-primary-500/10 text-[15px] leading-none"
                    aria-hidden
                  >
                    {item.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold leading-snug text-eid-fg">{item.titulo}</p>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-eid-text-secondary">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          );
        }
        if (bloco.tipo === "stats") {
          return (
            <div key={i} className="grid grid-cols-2 gap-1.5">
              {bloco.itens.map((stat, j) => (
                <div
                  key={j}
                  className={`flex flex-col items-center rounded-xl border px-2 py-2 ${STAT_COR_MAP[stat.cor] ?? STAT_COR_MAP.azul}`}
                >
                  <span className="text-[15px] font-black tabular-nums leading-tight">{stat.valor}</span>
                  <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.04em] opacity-80">{stat.rotulo}</span>
                </div>
              ))}
            </div>
          );
        }
        if (bloco.tipo === "dica") {
          return (
            <div
              key={i}
              className="flex gap-2 rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/[0.08] px-2.5 py-2"
            >
              <span className="mt-0.5 shrink-0 text-[13px] leading-none" aria-hidden>💡</span>
              <p className="text-[11px] leading-relaxed text-eid-text-secondary">
                <strong className="font-semibold text-eid-fg">Dica: </strong>
                {bloco.texto}
              </p>
            </div>
          );
        }
        if (bloco.tipo === "aviso") {
          return (
            <div
              key={i}
              className="flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-2.5 py-2"
            >
              <span className="mt-0.5 shrink-0 text-[13px] leading-none" aria-hidden>⚠️</span>
              <p className="text-[11px] leading-relaxed text-eid-text-secondary">
                {bloco.texto}
              </p>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

function FaqAccordion({
  items,
  faqAbertoId,
  setFaqAbertoId,
}: {
  items: SupportFaqItem[];
  faqAbertoId: string | null;
  setFaqAbertoId: (id: string | null) => void;
}) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/30 px-3 py-5 text-center">
        <p className="text-[12px] leading-relaxed text-eid-text-secondary">
          Ainda não temos perguntas prontas para esse tema.{" "}
          <strong className="text-eid-fg">Use a aba Chamado</strong> — respondemos via WhatsApp em até 2 horas.
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const open = faqAbertoId === item.id;
        const Icon = FAQ_ICON_MAP[item.icone] ?? Sparkles;
        return (
          <li
            key={item.id}
            className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 shadow-sm shadow-black/5"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-eid-primary-500/5"
              aria-expanded={open}
              onClick={() => setFaqAbertoId(open ? null : item.id)}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/15 text-eid-primary-300"
                aria-hidden
              >
                <Icon className="h-[1rem] w-[1rem]" strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1 text-[12px] font-semibold leading-snug text-eid-fg">
                {item.pergunta}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-eid-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {open ? (
              <div className="border-t border-[color:var(--eid-border-subtle)]/60 bg-eid-bg/40 px-3 pb-3 pt-2.5">
                {item.blocos ? (
                  <RichFaqRenderer blocos={item.blocos} />
                ) : (
                  <p className="text-[11.5px] leading-[1.7] text-eid-text-secondary [&_strong]:font-semibold [&_strong]:text-eid-fg/90">
                    {item.resposta}
                  </p>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function SupportHint({
  emoji,
  titulo,
  subtitulo,
}: {
  emoji: string;
  titulo: string;
  subtitulo: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-eid-primary-500/20 bg-gradient-to-br from-eid-primary-500/10 via-eid-surface/30 to-transparent px-3 py-3">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-eid-primary-500/10 blur-2xl" />
      <div className="relative flex gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-eid-primary-500/25 bg-eid-card text-xl shadow-inner"
          aria-hidden
        >
          {emoji}
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[12px] font-bold leading-snug text-eid-fg">{titulo}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-eid-text-secondary">{subtitulo}</p>
        </div>
      </div>
    </div>
  );
}

export type SupportCenterFloatProps = {
  modulosEmBreve?: readonly SystemFeatureKey[];
};

export function SupportCenterFloat({ modulosEmBreve = [] }: SupportCenterFloatProps) {
  const pathname = usePathname() ?? "";
  const isEspacoContext = pathname === "/espaco" || pathname.startsWith("/espaco/");
  const [aberto, setAberto] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [aba, setAba] = useState<"ajuda" | "perfil" | "chamado">("ajuda");
  const [faqAbertoId, setFaqAbertoId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const [submitState, formAction, submitPending] = useActionState(submitSupportChamado, initialSubmit);

  const faqAjuda = useMemo(
    () =>
      (isEspacoContext ? SUPPORT_ESPACO_DONO_FAQ : SUPPORT_FAQ_ITEMS).filter((x) =>
        supportFaqVisivelEmProducao(x, modulosEmBreve)
      ),
    [isEspacoContext, modulosEmBreve],
  );
  const faqPerfil = useMemo(
    () =>
      (isEspacoContext ? SUPPORT_ESPACO_OPERACAO_FAQ : SUPPORT_PERFIL_FORMACOES_FAQ).filter((x) =>
        supportFaqVisivelEmProducao(x, modulosEmBreve)
      ),
    [isEspacoContext, modulosEmBreve],
  );
  const chamadoAreasVisiveis = useMemo(
    () => {
      const areas = SUPPORT_CHAMADO_AREAS.filter((a) => supportFaqVisivelEmProducao(a, modulosEmBreve));
      if (!isEspacoContext) return areas;
      const prioridade = new Set(["locais", "professores", "torneios", "conta", "outro"]);
      return areas.filter((a) => prioridade.has(a.value));
    },
    [isEspacoContext, modulosEmBreve],
  );

  useEffect(() => {
    queueMicrotask(() => {
      setAba("ajuda");
      setFaqAbertoId(null);
    });
  }, [isEspacoContext]);

  useEffect(() => {
    if (!submitState.ok || !submitState.message) return;
    formRef.current?.reset();
  }, [submitState.ok, submitState.message]);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  if (pathOcultaSuporte(pathname)) return null;

  const abrirPainel = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setPanelMounted(true);
    setAberto(true);
    setFaqAbertoId(null);
  };

  const fecharPainel = () => {
    setAberto(false);
    if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setPanelMounted(false);
      closeTimerRef.current = null;
    }, 200);
  };

  const mudarAba = (nova: typeof aba) => {
    setAba(nova);
    setFaqAbertoId(null);
  };

  return (
    <>
      {panelMounted ? (
        <button
          type="button"
          aria-label="Fechar suporte"
          className={`fixed inset-0 z-[56] transition-opacity duration-200 ${aberto ? "bg-black/50 opacity-100 md:bg-black/40" : "pointer-events-none bg-black/0 opacity-0"}`}
          onClick={fecharPainel}
        />
      ) : null}

      <div className="pointer-events-none fixed bottom-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] right-3 z-[58] flex flex-col-reverse items-end gap-3 md:bottom-8 md:right-5">
        {/* FAB */}
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={aberto ? "eid-support-panel" : undefined}
          aria-label={aberto ? "Fechar suporte" : "Abrir central de ajuda"}
          onClick={() => (aberto ? fecharPainel() : abrirPainel())}
          className={`pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 md:h-11 md:w-11 ${
            aberto
              ? "border border-[color:var(--eid-border-subtle)] bg-eid-surface text-eid-text-secondary shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:text-eid-fg"
              : "border border-[color:var(--eid-border-subtle)] bg-eid-card/90 text-eid-text-secondary shadow-[0_2px_10px_rgba(0,0,0,0.22)] backdrop-blur-sm hover:border-eid-primary-500/30 hover:text-eid-fg hover:shadow-[0_4px_14px_rgba(0,0,0,0.28)]"
          }`}
        >
          {aberto ? (
            <X className="h-[1.1rem] w-[1.1rem]" aria-hidden />
          ) : (
            <Headset className="h-5 w-5 md:h-[1.15rem] md:w-[1.15rem]" aria-hidden />
          )}
        </button>

        {/* Panel */}
        {panelMounted ? (
          <div
            id="eid-support-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="eid-support-title"
            className={`pointer-events-auto flex max-h-[min(72svh,34rem)] w-[min(calc(100vw-1.5rem),22rem)] flex-col overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-2xl shadow-black/40 transition-all duration-200 md:max-h-[min(78svh,40rem)] md:w-[25rem] ${
              aberto
                ? "translate-y-0 scale-100 opacity-100"
                : "pointer-events-none translate-y-3 scale-[0.97] opacity-0"
            }`}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-[color:var(--eid-border-subtle)] bg-gradient-to-r from-eid-primary-500/[0.12] via-eid-surface/50 to-transparent px-4 py-3">
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-eid-primary-500/30 bg-eid-primary-500/15 text-eid-primary-300">
                  <Bot className="h-5 w-5" aria-hidden />
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-eid-card bg-emerald-500"
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="eid-support-title" className="text-[13px] font-bold leading-tight text-eid-fg">
                  {isEspacoContext ? "Ajuda para Locais" : "Central de Ajuda"}
                </h2>
                <p className="text-[10px] text-eid-text-secondary">
                  {isEspacoContext ? "Reservas, sócios, agenda e financeiro" : "Resposta em até 2 h via WhatsApp"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={fecharPainel}
                className="rounded-xl p-1.5 text-eid-text-secondary transition hover:bg-eid-bg hover:text-eid-fg"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {/* Tabs */}
            <div className="shrink-0 border-b border-[color:var(--eid-border-subtle)] bg-eid-bg/30 px-2 py-2">
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: "ajuda", label: "Dúvidas", Icon: LifeBuoy },
                    { id: "perfil", label: isEspacoContext ? "Operação" : "Perfil & Times", Icon: Users },
                    { id: "chamado", label: "Chamado", Icon: MessageCircle },
                  ] as const
                ).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => mudarAba(id)}
                    className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[9.5px] font-bold uppercase tracking-wide transition ${
                      aba === id
                        ? "bg-eid-card text-eid-primary-300 shadow-sm shadow-black/10"
                        : "text-eid-text-secondary hover:bg-eid-bg/60 hover:text-eid-fg"
                    }`}
                  >
                    <Icon className="h-[1.05rem] w-[1.05rem]" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              {aba === "ajuda" ? (
                <div className="space-y-3">
                  <SupportHint
                    emoji={isEspacoContext ? "🏟️" : "💡"}
                    titulo={isEspacoContext ? "Ajuda focada em donos de locais" : "Respostas rápidas, sem enrolação"}
                    subtitulo={
                      isEspacoContext
                        ? "Veja dúvidas sobre perfil público, reservas, sócios, financeiro e publicação do espaço."
                        : "Toque em cada card para ver a explicação completa. Se a dúvida persistir, use a aba Chamado."
                    }
                  />
                  <FaqAccordion items={faqAjuda} faqAbertoId={faqAbertoId} setFaqAbertoId={setFaqAbertoId} />
                  <button
                    type="button"
                    onClick={() => mudarAba("chamado")}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-eid-action-500/35 bg-eid-action-500/10 py-2.5 text-[11px] font-bold text-eid-action-400 transition hover:border-eid-action-500/50 hover:bg-eid-action-500/15"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    Ainda com dúvida? Falar com a equipe
                  </button>
                </div>
              ) : aba === "perfil" ? (
                <div className="space-y-3">
                  <SupportHint
                    emoji={isEspacoContext ? "⚙️" : "👥"}
                    titulo={isEspacoContext ? "Operação do espaço" : "Perfil, dupla e time — em linguagem simples"}
                    subtitulo={
                      isEspacoContext
                        ? "Entenda modelos de reserva, unidades, WhatsApp de contato e integração Asaas."
                        : "Como cada modo funciona no ranking, desafios e quem pode clicar em cada botão."
                    }
                  />
                  <FaqAccordion items={faqPerfil} faqAbertoId={faqAbertoId} setFaqAbertoId={setFaqAbertoId} />
                  <button
                    type="button"
                    onClick={() => mudarAba("chamado")}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-eid-action-500/35 bg-eid-action-500/10 py-2.5 text-[11px] font-bold text-eid-action-400 transition hover:border-eid-action-500/50 hover:bg-eid-action-500/15"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    Ainda com dúvida? Falar com a equipe
                  </button>
                </div>
              ) : (
                <form ref={formRef} action={formAction} className="space-y-3.5">
                  <div className="rounded-2xl border border-eid-primary-500/20 bg-eid-primary-500/[0.08] px-3 py-2.5">
                    <p className="text-[11px] leading-snug text-eid-text-secondary">
                      <strong className="font-semibold text-eid-fg">Respondemos via WhatsApp</strong> do seu cadastro
                      em até 2 h.{" "}
                      <Link
                        href="/editar/perfil"
                        className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline"
                        onClick={fecharPainel}
                      >
                        Ajustar número
                      </Link>
                      .
                    </p>
                  </div>
                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">
                      Área do problema
                    </span>
                    <select
                      name="area"
                      required
                      className="eid-input-dark h-9 rounded-xl px-2.5 text-xs text-eid-fg"
                      defaultValue={isEspacoContext ? "locais" : ""}
                    >
                      {isEspacoContext ? null : (
                        <option value="" disabled>
                          Selecione a área
                        </option>
                      )}
                      {chamadoAreasVisiveis.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">
                      Descreva o problema
                    </span>
                    <textarea
                      name="mensagem"
                      required
                      rows={4}
                      minLength={12}
                      maxLength={4000}
                      placeholder="Ex.: no ranking do tênis não atualizou após registrar o placar…"
                      className="eid-input-dark resize-none rounded-xl px-2.5 py-2 text-xs text-eid-fg"
                    />
                  </label>
                  {submitState.message ? (
                    <p
                      role="status"
                      className={`rounded-xl px-3 py-2 text-[11px] font-medium ${
                        submitState.ok
                          ? "border border-emerald-500/35 bg-emerald-500/10 text-emerald-100"
                          : "border border-amber-500/35 bg-amber-500/10 text-amber-100"
                      }`}
                    >
                      {submitState.message}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={submitPending}
                    className="w-full rounded-xl bg-eid-action-500 py-2.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(249,115,22,0.28)] transition hover:bg-eid-action-600 disabled:opacity-50"
                  >
                    {submitPending ? "Enviando…" : "Enviar chamado"}
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
