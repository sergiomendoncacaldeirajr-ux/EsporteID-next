"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { denunciarPerfilUsuario } from "@/app/perfil/denuncia-actions";

const MOTIVOS: { codigo: string; label: string; desc: string }[] = [
  { codigo: "abuso", label: "Abuso ou assédio", desc: "Ameaças, assédio ou comportamento abusivo." },
  { codigo: "menor_idade", label: "Suspeita de menor de idade", desc: "Indica que o perfil pode ser de menor." },
  { codigo: "spam", label: "Spam ou propaganda", desc: "Mensagens comerciais ou repetitivas indevidas." },
  { codigo: "perfil_falso", label: "Perfil falso", desc: "Identidade ou dados falsos." },
  { codigo: "conteudo_improprio", label: "Conteúdo impróprio", desc: "Fotos ou textos inadequados." },
  { codigo: "outro", label: "Outro", desc: "Descreva no campo abaixo." },
];

type Props = {
  alvoUsuarioId: string;
  compact?: boolean;
  className?: string;
};

export function ProfileDenunciarButton({ alvoUsuarioId, compact = false, className }: Props) {
  const [aberto, setAberto] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [msg, setMsg] = useState<string | null>(null);
  const [codigo, setCodigo] = useState(MOTIVOS[0]!.codigo);
  const [texto, setTexto] = useState("");
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const readTheme = () => {
      const t = document.documentElement.getAttribute("data-eid-theme");
      setTheme(t === "light" ? "light" : "dark");
    };
    readTheme();
    const observer = new MutationObserver(readTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-eid-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!compact || !aberto) return;
    const updatePos = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(336, window.innerWidth - 16);
      setPopoverPos({
        top: rect.bottom + 8,
        left: Math.max(8, rect.right - width),
      });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [compact, aberto]);

  const enviar = useCallback(() => {
    setMsg(null);
    const fd = new FormData();
    fd.set("alvo_usuario_id", alvoUsuarioId);
    fd.set("codigo_motivo", codigo);
    if (texto.trim()) fd.set("texto", texto.trim());
    startTransition(async () => {
      const r = await denunciarPerfilUsuario(fd);
      if (r.ok) {
        setMsg("Denúncia registrada. Nossa equipe será notificada.");
        setTexto("");
        setTimeout(() => setAberto(false), 2000);
      } else {
        setMsg(r.error);
      }
    });
  }, [alvoUsuarioId, codigo, texto]);

  return (
    <div
      className={
        compact
          ? `relative ${className ?? ""}`
          : `mx-auto w-full rounded-xl border border-red-500/25 bg-red-500/5 p-2 ${aberto ? "max-w-md" : "max-w-[min(100%,15.5rem)]"} ${className ?? ""}`
      }
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={aberto}
        aria-controls="eid-denuncia-painel"
        onClick={() => {
          setAberto((v) => !v);
          setMsg(null);
        }}
        className={
          compact
            ? "inline-flex h-6 min-w-[5.75rem] touch-manipulation items-center justify-center gap-1 rounded-lg border border-red-500/35 bg-black/40 px-1.5 text-[7px] font-black uppercase tracking-[0.08em] text-red-200 transition hover:border-red-400/60 hover:bg-red-500/18"
            : "flex w-full min-h-[2.25rem] touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-red-300/95 transition hover:border-red-500/35 hover:bg-red-500/15 active:bg-red-500/20"
        }
      >
        <svg viewBox="0 0 12 14" className="h-3 w-2.5 shrink-0 opacity-90" fill="currentColor" aria-hidden>
          <path d="M0 0h2v14H0zM2 2l9 3.5L2 9z" />
        </svg>
        <span>Denunciar perfil</span>
      </button>

      {aberto ? (
        compact && mounted ? (
          createPortal(
            <>
              <button
                type="button"
                aria-label="Fechar denúncia"
                className="fixed inset-0 z-[219] bg-black/20"
                onClick={() => setAberto(false)}
              />
              <div
                id="eid-denuncia-painel"
                className={`fixed z-[220] w-[min(92vw,21rem)] space-y-3 rounded-xl p-2.5 shadow-[0_18px_40px_-20px_rgba(239,68,68,0.5)] ${
                  theme === "light"
                    ? "border border-red-500/45 bg-[linear-gradient(180deg,#fff6f6,#ffe9e9)] text-slate-800"
                    : "border border-red-500/35 bg-[linear-gradient(180deg,rgba(33,8,12,0.99),rgba(20,9,11,0.99))] text-eid-fg"
                }`}
                style={{ top: popoverPos.top, left: popoverPos.left }}
              >
                <p className={`text-[11px] ${theme === "light" ? "text-slate-600" : "text-eid-text-secondary"}`}>Motivo da denúncia</p>
                <div className="grid gap-2">
                  {MOTIVOS.map((m) => (
                    <label
                      key={m.codigo}
                      className={`flex cursor-pointer gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] transition ${
                        codigo === m.codigo
                          ? theme === "light"
                            ? "border-red-500/55 bg-red-500/12 text-slate-900"
                            : "border-red-500/45 bg-red-500/10 text-eid-fg"
                          : theme === "light"
                            ? "border-red-200 text-slate-700 hover:border-red-400/55"
                            : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:border-red-500/25"
                      }`}
                    >
                      <input
                        type="radio"
                        name="codigo_motivo"
                        value={m.codigo}
                        checked={codigo === m.codigo}
                        onChange={() => setCodigo(m.codigo)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className={`font-semibold ${theme === "light" ? "text-slate-900" : "text-eid-fg"}`}>{m.label}</span>
                        <span className={`mt-0.5 block text-[10px] ${theme === "light" ? "text-slate-600" : "text-eid-text-secondary"}`}>{m.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <div>
                  <label className={`text-[10px] font-bold uppercase tracking-wide ${theme === "light" ? "text-slate-600" : "text-eid-text-secondary"}`}>Detalhes (opcional)</label>
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    className={`mt-1 w-full resize-none rounded-lg border px-2 py-1.5 text-xs outline-none focus:ring-2 ${
                      theme === "light"
                        ? "border-red-300 bg-white text-slate-800 placeholder:text-slate-500 focus:border-red-500/60 focus:ring-red-400/25"
                        : "border-[color:var(--eid-border-subtle)] bg-eid-field-bg text-eid-fg placeholder:text-eid-text-secondary focus:border-red-500/45 focus:ring-red-500/20"
                    }`}
                    placeholder="Informações que ajudem a moderação..."
                  />
                </div>
                {msg ? (
                  <p className={`text-xs ${msg.startsWith("Denúncia") ? "text-emerald-300" : "text-red-300"}`}>{msg}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={enviar}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide disabled:opacity-50 ${
                      theme === "light"
                        ? "border-red-600/55 bg-red-600/15 text-red-700"
                        : "border-red-500/50 bg-red-500/15 text-red-200"
                    }`}
                  >
                    {pending ? "Enviando…" : "Enviar denúncia"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAberto(false)}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${
                      theme === "light"
                        ? "border-slate-300 text-slate-700"
                        : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"
                    }`}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </>,
            document.body
          )
        ) : (
        <div id="eid-denuncia-painel" className="mt-2.5 space-y-3 border-t border-red-500/20 pt-2.5">
          <p className="text-[11px] text-eid-text-secondary">Motivo da denúncia</p>
          <div className="grid gap-2">
            {MOTIVOS.map((m) => (
              <label
                key={m.codigo}
                className={`flex cursor-pointer gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] transition ${
                  codigo === m.codigo
                    ? "border-red-500/45 bg-red-500/10 text-eid-fg"
                    : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:border-red-500/25"
                }`}
              >
                <input
                  type="radio"
                  name="codigo_motivo"
                  value={m.codigo}
                  checked={codigo === m.codigo}
                  onChange={() => setCodigo(m.codigo)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-semibold text-eid-fg">{m.label}</span>
                  <span className="mt-0.5 block text-[10px] text-eid-text-secondary">{m.desc}</span>
                </span>
              </label>
            ))}
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Detalhes (opcional)</label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              maxLength={2000}
              className="eid-input-dark mt-1 w-full resize-none rounded-lg px-2 py-1.5 text-xs"
              placeholder="Informações que ajudem a moderação..."
            />
          </div>
          {msg ? (
            <p className={`text-xs ${msg.startsWith("Denúncia") ? "text-emerald-300" : "text-red-300"}`}>{msg}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={enviar}
              className="rounded-lg border border-red-500/50 bg-red-500/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-red-200 disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Enviar denúncia"}
            </button>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-[11px] font-semibold text-eid-text-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
        )
      ) : null}
    </div>
  );
}
