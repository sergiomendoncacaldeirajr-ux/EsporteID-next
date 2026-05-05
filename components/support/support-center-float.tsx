"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Crown,
  Headset,
  HeartHandshake,
  MapPin,
  Medal,
  Sparkles,
  Swords,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { submitSupportChamado, type SupportChamadoSubmitState } from "@/app/support/actions";
import {
  SUPPORT_CHAMADO_AREAS,
  SUPPORT_FAQ_ITEMS,
  SUPPORT_PERFIL_FORMACOES_FAQ,
  supportFaqVisivelEmProducao,
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
};

const initialSubmit: SupportChamadoSubmitState = { ok: false, message: "" };

function pathOcultaSuporte(pathname: string): boolean {
  const p = pathname || "";
  return p.startsWith("/admin") || p.startsWith("/api/");
}

function renderFaqCards(
  items: SupportFaqItem[],
  faqAbertoId: string | null,
  setFaqAbertoId: (id: string | null) => void
) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/30 px-3 py-4 text-center">
        <p className="text-[12px] leading-relaxed text-eid-text-secondary">
          Ainda não temos perguntas prontas para esse momento.{" "}
          <strong className="text-eid-fg">Fale com a gente</strong> na aba Chamado — respondemos pelo WhatsApp do seu
          cadastro.
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const open = faqAbertoId === item.id;
        const Icon = FAQ_ICON_MAP[item.icone] ?? Sparkles;
        return (
          <li
            key={item.id}
            className="overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-gradient-to-br from-eid-surface/90 to-eid-bg/50 shadow-sm shadow-black/5"
          >
            <button
              type="button"
              className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-eid-primary-500/5"
              aria-expanded={open}
              onClick={() => setFaqAbertoId(open ? null : item.id)}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/15 text-eid-primary-300"
                aria-hidden
              >
                <Icon className="h-[1.1rem] w-[1.1rem]" strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1 pt-0.5 text-[12px] font-semibold leading-snug text-eid-fg">
                {item.pergunta}
              </span>
              <span className="shrink-0 pt-1 text-[11px] font-bold text-eid-primary-400/90">{open ? "▴" : "▾"}</span>
            </button>
            {open ? (
              <div className="border-t border-[color:var(--eid-border-subtle)]/70 bg-eid-bg/25 px-3 pb-3 pt-2">
                <p className="text-[11.5px] leading-[1.65] text-eid-text-secondary [&_strong]:font-semibold [&_strong]:text-eid-fg/95">
                  {item.resposta}
                </p>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function FaqAssistantIntro({
  titulo,
  subtitulo,
  emoji,
}: {
  titulo: string;
  subtitulo: string;
  emoji: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-eid-primary-500/25 bg-gradient-to-br from-eid-primary-500/15 via-eid-surface/40 to-transparent px-3 py-3">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-eid-primary-500/10 blur-2xl" />
      <div className="relative flex gap-2.5">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-eid-primary-500/30 bg-eid-card text-xl shadow-inner"
          aria-hidden
        >
          {emoji}
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-eid-primary-300">
            <Bot className="h-3.5 w-3.5" aria-hidden />
            Assistente
          </p>
          <p className="mt-0.5 text-[13px] font-bold leading-snug text-eid-fg">{titulo}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">{subtitulo}</p>
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
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<"ajuda" | "perfil" | "chamado">("ajuda");
  const [faqAbertoId, setFaqAbertoId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const [submitState, formAction, submitPending] = useActionState(submitSupportChamado, initialSubmit);

  const faqAjuda = useMemo(
    () => SUPPORT_FAQ_ITEMS.filter((x) => supportFaqVisivelEmProducao(x, modulosEmBreve)),
    [modulosEmBreve]
  );
  const faqPerfil = useMemo(
    () => SUPPORT_PERFIL_FORMACOES_FAQ.filter((x) => supportFaqVisivelEmProducao(x, modulosEmBreve)),
    [modulosEmBreve]
  );
  const chamadoAreasVisiveis = useMemo(
    () => SUPPORT_CHAMADO_AREAS.filter((a) => supportFaqVisivelEmProducao(a, modulosEmBreve)),
    [modulosEmBreve]
  );

  useEffect(() => {
    if (!submitState.ok || !submitState.message) return;
    setFormKey((k) => k + 1);
  }, [submitState.ok, submitState.message]);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto]);

  if (pathOcultaSuporte(pathname)) return null;

  const abrirPainel = () => {
    setAberto(true);
    const list = aba === "ajuda" ? faqAjuda : aba === "perfil" ? faqPerfil : [];
    setFaqAbertoId(list[0]?.id ?? null);
  };

  const irAjuda = () => {
    setAba("ajuda");
    setFaqAbertoId(faqAjuda[0]?.id ?? null);
  };

  const irPerfil = () => {
    setAba("perfil");
    setFaqAbertoId(faqPerfil[0]?.id ?? null);
  };

  const irChamado = () => {
    setAba("chamado");
    setFaqAbertoId(null);
  };

  return (
    <>
      {aberto ? (
        <button
          type="button"
          aria-label="Fechar suporte"
          className="fixed inset-0 z-[56] bg-black/45 md:bg-black/35"
          onClick={() => setAberto(false)}
        />
      ) : null}

      <div className="pointer-events-none fixed bottom-[max(5.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] right-3 z-[58] flex flex-col-reverse items-end gap-2 md:bottom-8 md:right-5">
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={aberto ? "eid-support-panel" : undefined}
          aria-label="Abrir central de suporte"
          onClick={() => {
            if (aberto) setAberto(false);
            else abrirPainel();
          }}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-eid-primary-500/50 bg-eid-primary-500/25 text-eid-fg shadow-lg shadow-black/25 backdrop-blur-sm transition hover:border-eid-primary-500/70 hover:bg-eid-primary-500/35 md:h-11 md:w-11"
        >
          <Headset className="h-5 w-5 md:h-[1.15rem] md:w-[1.15rem]" aria-hidden />
        </button>

        {aberto ? (
          <div
            id="eid-support-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="eid-support-title"
            className="pointer-events-auto flex max-h-[min(72svh,32rem)] w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-2xl md:max-h-[min(78svh,38rem)] md:w-[24rem]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--eid-border-subtle)] bg-gradient-to-r from-eid-surface/80 via-eid-surface/60 to-eid-primary-500/5 px-3 py-2.5">
              <div className="min-w-0">
                <h2 id="eid-support-title" className="flex items-center gap-2 text-sm font-bold text-eid-fg">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/15 text-eid-primary-300">
                    <Bot className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="leading-tight">
                    Ajuda EsporteID
                    <span className="mt-0.5 block text-[10px] font-normal text-eid-text-secondary">
                      Perguntas prontas + chamado para a equipe
                    </span>
                  </span>
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setAberto(false)}
                className="rounded-lg p-1.5 text-eid-text-secondary hover:bg-eid-bg hover:text-eid-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid shrink-0 grid-cols-3 gap-0.5 border-b border-[color:var(--eid-border-subtle)] px-1 py-1.5">
              <button
                type="button"
                onClick={irAjuda}
                className={`rounded-lg px-1 py-1.5 text-[10px] font-bold uppercase leading-tight tracking-wide ${
                  aba === "ajuda" ? "bg-eid-primary-500/20 text-eid-fg" : "text-eid-text-secondary hover:bg-eid-bg/80"
                }`}
              >
                Ajuda rápida
              </button>
              <button
                type="button"
                onClick={irPerfil}
                className={`rounded-lg px-1 py-1.5 text-[10px] font-bold uppercase leading-tight tracking-wide ${
                  aba === "perfil" ? "bg-eid-primary-500/20 text-eid-fg" : "text-eid-text-secondary hover:bg-eid-bg/80"
                }`}
              >
                Perfil, dupla e time
              </button>
              <button
                type="button"
                onClick={irChamado}
                className={`rounded-lg px-1 py-1.5 text-[10px] font-bold uppercase leading-tight tracking-wide ${
                  aba === "chamado" ? "bg-eid-primary-500/20 text-eid-fg" : "text-eid-text-secondary hover:bg-eid-bg/80"
                }`}
              >
                Chamado
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              {aba === "ajuda" ? (
                <div className="space-y-3">
                  <FaqAssistantIntro
                    emoji="💡"
                    titulo="Respostas rápidas, sem complicação"
                    subtitulo="Toque em cada card para ver a explicação. Se ainda ficar dúvida, a equipe te ajuda pelo WhatsApp na aba Chamado."
                  />
                  {renderFaqCards(faqAjuda, faqAbertoId, setFaqAbertoId)}
                  <button
                    type="button"
                    onClick={irChamado}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border border-eid-primary-500/45 bg-gradient-to-r from-eid-primary-500/20 to-eid-primary-500/10 py-3 text-xs font-bold text-eid-fg shadow-sm transition hover:border-eid-primary-500/60 hover:from-eid-primary-500/25"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-eid-primary-300" aria-hidden />
                    Ainda com dúvida — falar com a equipe
                  </button>
                </div>
              ) : aba === "perfil" ? (
                <div className="space-y-3">
                  <FaqAssistantIntro
                    emoji="👥"
                    titulo="Perfil, dupla e time — em linguagem simples"
                    subtitulo="Entenda como cada modo funciona no dia a dia: ranking, desafios e quem pode clicar em cada coisa."
                  />
                  {renderFaqCards(faqPerfil, faqAbertoId, setFaqAbertoId)}
                  <button
                    type="button"
                    onClick={irChamado}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border border-eid-primary-500/45 bg-gradient-to-r from-eid-primary-500/20 to-eid-primary-500/10 py-3 text-xs font-bold text-eid-fg shadow-sm transition hover:border-eid-primary-500/60 hover:from-eid-primary-500/25"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-eid-primary-300" aria-hidden />
                    Ainda com dúvida — falar com a equipe
                  </button>
                </div>
              ) : (
                <form key={formKey} action={formAction} className="space-y-3">
                  <label className="grid gap-1">
                    <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Onde ocorreu?</span>
                    <select
                      name="area"
                      required
                      className="eid-input-dark h-9 rounded-lg px-2 text-xs text-eid-fg"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Selecione a área
                      </option>
                      {chamadoAreasVisiveis.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] font-bold uppercase text-eid-text-secondary">Descreva o problema</span>
                    <textarea
                      name="mensagem"
                      required
                      rows={4}
                      minLength={12}
                      maxLength={4000}
                      placeholder="Ex.: no ranking do tênis não atualizou após registrar o placar…"
                      className="eid-input-dark resize-none rounded-lg px-2 py-2 text-xs text-eid-fg"
                    />
                  </label>
                  <p className="text-[10px] leading-snug text-eid-text-secondary">
                    Usamos o <strong>WhatsApp cadastrado no seu perfil</strong> para retorno.{" "}
                    <Link
                      href="/conta/perfil"
                      className="font-semibold text-eid-primary-300 underline-offset-2 hover:underline"
                      onClick={() => setAberto(false)}
                    >
                      Ajustar no perfil da conta
                    </Link>
                    .
                  </p>
                  {submitState.message ? (
                    <p
                      role="status"
                      className={`rounded-lg px-2 py-1.5 text-[11px] font-medium ${
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
                    className="w-full rounded-xl border border-eid-primary-500/50 bg-eid-primary-500/20 py-2.5 text-xs font-bold text-eid-fg disabled:opacity-50"
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
