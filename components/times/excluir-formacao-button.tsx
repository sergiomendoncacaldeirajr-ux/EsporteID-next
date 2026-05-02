"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { excluirFormacaoLiderAction } from "@/app/times/actions";
import { EidCancelButton } from "@/components/ui/eid-cancel-button";
import { emitEidSocialDataRefresh } from "@/lib/comunidade/social-panel-layout";

type Props = {
  timeId: number;
  formationName: string;
  formacaoTipo?: "time" | "dupla";
  /** Destino após exclusão (ex.: `/editar/equipes` ou página atual). */
  redirectAfter: string;
  /** `compact` = canto do hero (perfil); `inline` = listas / edição. */
  variant?: "compact" | "inline";
  className?: string;
};

export function ExcluirFormacaoButton({
  timeId,
  formationName,
  formacaoTipo = "time",
  redirectAfter,
  variant = "compact",
  className = "",
}: Props) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted] = useState(() => typeof window !== "undefined");
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const updatePos = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(400, window.innerWidth - 16);
    setPopoverPos({
      top: rect.bottom + 8,
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos]);

  const labelTipo = formacaoTipo === "dupla" ? "dupla" : "time";

  const runDelete = () => {
    setError(null);
    const fd = new FormData();
    fd.set("time_id", String(timeId));
    fd.set("from", redirectAfter);
    startTransition(async () => {
      const res = await excluirFormacaoLiderAction(undefined, fd);
      if (res.ok) {
        emitEidSocialDataRefresh();
        setOpen(false);
        router.push(res.redirectTo);
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  };

  const triggerClass =
    variant === "compact"
      ? "inline-flex touch-manipulation items-center justify-center gap-1 rounded-full border border-red-500/50 bg-black/35 px-2 py-1 text-[8px] font-bold uppercase leading-none tracking-[0.07em] text-red-100 shadow-[0_3px_10px_-7px_rgba(0,0,0,0.55)] backdrop-blur-sm transition hover:border-red-400/70 hover:bg-red-500/15 eid-light:border-red-400/70 eid-light:bg-red-50/95 eid-light:text-red-800 eid-light:hover:bg-red-100 sm:gap-1 sm:px-2.5 sm:py-1 sm:text-[9px]"
      : "inline-flex min-h-[34px] touch-manipulation items-center justify-center gap-1 rounded-full border border-red-500/45 bg-red-500/10 px-3 text-[9px] font-black uppercase tracking-[0.05em] text-red-200 transition hover:bg-red-500/18 eid-light:border-red-500/55 eid-light:bg-red-50 eid-light:text-red-800 eid-light:hover:bg-red-100";

  const portal =
    open && mounted ? (
      <>
        <button
          type="button"
          aria-label="Fechar"
          className="fixed inset-0 z-[219] bg-black/25"
          onClick={() => setOpen(false)}
        />
        <div
          className="fixed z-[220] w-[min(92vw,25rem)] rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 shadow-xl"
          style={{ top: popoverPos.top, left: popoverPos.left }}
        >
          <p className="text-[13px] font-black text-eid-fg">Excluir perfil {labelTipo === "dupla" ? "da dupla" : "do time"}?</p>
          <p className="mt-2 text-[11px] leading-relaxed text-eid-text-secondary">
            <strong className="text-eid-fg">Atenção:</strong> este processo é <strong>irreversível</strong>. O perfil público de{" "}
            <span className="font-semibold text-eid-fg">{formationName}</span> será apagado e você perderá o histórico ligado a esta
            formação na plataforma (ranking coletivo, registros e estatísticas exibidos neste perfil).
          </p>
          <p className="mt-2 text-[10px] text-eid-text-secondary">
            Só é possível excluir quando você é o único integrante e não há convites ou candidaturas pendentes.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <EidCancelButton
              type="button"
              compact
              disabled={pending}
              label="Cancelar"
              className="!w-full border-[color:color-mix(in_srgb,var(--eid-border-subtle)_70%,transparent)] bg-eid-surface/60 text-eid-fg hover:bg-eid-surface sm:!w-auto sm:min-w-[7.5rem]"
              onClick={() => setOpen(false)}
            />
            <button
              type="button"
              disabled={pending}
              onClick={runDelete}
              className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl border border-red-600/55 bg-red-600 px-4 text-[11px] font-black uppercase tracking-[0.06em] text-white transition hover:bg-red-700 disabled:opacity-60 sm:w-auto sm:min-w-[12rem]"
            >
              {pending ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    aria-hidden
                  />
                  Excluindo…
                </span>
              ) : (
                "Excluir definitivamente"
              )}
            </button>
          </div>
          {error ? (
            <p className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200 eid-light:text-red-800">
              {error}
            </p>
          ) : null}
        </div>
      </>
    ) : null;

  return (
    <div className={`relative ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
        }}
        className={triggerClass}
      >
        <Trash2 className={variant === "compact" ? "h-2.5 w-2.5 shrink-0 opacity-90" : "h-3.5 w-3.5 shrink-0"} strokeWidth={2.5} aria-hidden />
        <span>Excluir perfil</span>
      </button>
      {portal && mounted ? createPortal(portal, document.body) : null}
    </div>
  );
}
