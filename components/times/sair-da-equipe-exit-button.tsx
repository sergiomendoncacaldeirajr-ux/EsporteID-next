"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { SairDaEquipeConfirmPanel } from "@/components/times/sair-da-equipe-confirm-panel";
import { EidCancelButton } from "@/components/ui/eid-cancel-button";
import { emitEidSocialDataRefresh } from "@/lib/comunidade/social-panel-layout";

type Props = {
  leaveAction: () => Promise<void>;
  formationName: string;
  formacaoTipo?: "time" | "dupla";
};

/**
 * Botão compacto (estilo “denunciar perfil”) + painel em portal (evita `overflow-hidden` do hero).
 */
export function SairDaEquipeExitButton({ leaveAction, formationName, formacaoTipo = "time" }: Props) {
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
    const width = Math.min(360, window.innerWidth - 16);
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

  const runLeave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await leaveAction();
        emitEidSocialDataRefresh();
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível sair da formação.");
      }
    });
  };

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
          className="fixed z-[220] w-[min(92vw,22rem)]"
          style={{ top: popoverPos.top, left: popoverPos.left }}
        >
          <SairDaEquipeConfirmPanel
            formationName={formationName}
            formacaoTipo={formacaoTipo}
            actions={
              <>
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
                  onClick={runLeave}
                  className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl border border-red-500/50 bg-red-500/20 px-4 text-[12px] font-black uppercase tracking-[0.06em] text-red-200 transition hover:bg-red-500/28 disabled:opacity-60 eid-light:border-red-500/55 eid-light:bg-red-600 eid-light:text-white eid-light:hover:bg-red-700 sm:w-auto sm:min-w-[12rem]"
                >
                  {pending ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300 border-t-transparent eid-light:border-white eid-light:border-t-transparent"
                        aria-hidden
                      />
                      Saindo…
                    </span>
                  ) : (
                    "Confirmar saída"
                  )}
                </button>
              </>
            }
          />
          {error ? (
            <p className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-200 eid-light:text-red-800">
              {error}
            </p>
          ) : null}
        </div>
      </>
    ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
        }}
        className="inline-flex touch-manipulation items-center justify-center gap-1 rounded-full border border-red-400/45 bg-black/35 px-2 py-1 text-[8px] font-bold uppercase leading-none tracking-[0.07em] text-red-200 shadow-[0_3px_10px_-7px_rgba(0,0,0,0.55)] backdrop-blur-sm transition hover:border-red-400/60 hover:bg-red-500/15 eid-light:border-red-300/80 eid-light:bg-red-50/95 eid-light:text-red-800 eid-light:hover:bg-red-100 sm:gap-1 sm:px-2.5 sm:py-1 sm:text-[9px]"
      >
        <LogOut className="h-2.5 w-2.5 shrink-0 opacity-90" strokeWidth={2.5} aria-hidden />
        <span>Sair</span>
      </button>
      {portal && mounted ? createPortal(portal, document.body) : null}
    </div>
  );
}
