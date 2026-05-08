"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { prepareEspacoLogoForUpload, prepareTeamShieldForUpload } from "@/lib/images/prepare-avatar-upload";

export type TeamShieldControlVariant = "team_shield" | "espaco_logo";

type Props = {
  currentUrl: string | null;
  fileInputName?: string;
  removeFlagName?: string;
  required?: boolean;
  /** `espaco_logo`: textos e preparação iguais ao logo de local (cadastro genérico). */
  variant?: TeamShieldControlVariant;
};

const COPY = {
  team_shield: {
    previewAlt: "Pré-visualização do escudo",
    empty: "Sem foto",
    primaryAdd: "Adicionar escudo",
    primaryEdit: "Editar escudo",
    sheetTitle: "Escudo",
    sheetHint: "Adicione, edite enquadramento ou remova.",
    sheetPickAdd: "Adicionar escudo",
    sheetPickReplace: "Trocar escudo",
    sheetReframe: "Editar enquadramento",
    sheetRemove: "Remover escudo atual",
    confirmAdd: "Enviar escudo",
    confirmEdit: "Salvar edição",
    outPrefix: "escudo",
  },
  espaco_logo: {
    previewAlt: "Pré-visualização da foto do local",
    empty: "Sem imagem",
    primaryAdd: "Adicionar foto",
    primaryEdit: "Trocar foto",
    sheetTitle: "Foto / logo do local",
    sheetHint: "Envie uma imagem, ajuste o enquadramento ou remova. HEIC da galeria vira JPEG automaticamente.",
    sheetPickAdd: "Escolher da galeria",
    sheetPickReplace: "Trocar imagem",
    sheetReframe: "Ajustar enquadramento",
    sheetRemove: "Remover imagem",
    confirmAdd: "Usar esta imagem",
    confirmEdit: "Salvar ajustes",
    outPrefix: "logo",
  },
} as const;

export function TeamShieldControl({
  currentUrl,
  fileInputName = "escudo_file",
  removeFlagName = "escudo_remove",
  required = false,
  variant = "team_shield",
}: Props) {
  const t = COPY[variant];
  const EXIT_MS = 180;
  const pickerRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [actionPresent, setActionPresent] = useState(false);
  const [editorPresent, setEditorPresent] = useState(false);
  const [actionClosing, setActionClosing] = useState(false);
  const [editorClosing, setEditorClosing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [zoom, setZoom] = useState(1.2);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [removeCurrent, setRemoveCurrent] = useState(false);
  const [prepErr, setPrepErr] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"add" | "edit">("add");

  const prepareUpload = useMemo(
    () => (variant === "espaco_logo" ? prepareEspacoLogoForUpload : prepareTeamShieldForUpload),
    [variant],
  );

  const hasCurrent = Boolean(currentUrl && currentUrl.trim().length > 0);
  const displayUrl = previewUrl ?? (removeCurrent ? null : currentUrl);
  const hasAnyForUI = Boolean(displayUrl);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (actionOpen) {
      setActionPresent(true);
      setActionClosing(false);
      return;
    }
    if (!actionPresent) return;
    setActionClosing(true);
    const t = setTimeout(() => {
      setActionPresent(false);
      setActionClosing(false);
    }, EXIT_MS);
    return () => clearTimeout(t);
  }, [actionOpen, actionPresent]);

  useEffect(() => {
    if (editorOpen) {
      setEditorPresent(true);
      setEditorClosing(false);
      return;
    }
    if (!editorPresent) return;
    setEditorClosing(true);
    const t = setTimeout(() => {
      setEditorPresent(false);
      setEditorClosing(false);
    }, EXIT_MS);
    return () => clearTimeout(t);
  }, [editorOpen, editorPresent]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function onPickFile() {
    const raw = pickerRef.current?.files?.[0];
    if (!raw) return;
    setPrepErr(null);
    const p = await prepareUpload(raw);
    if (!p.ok) {
      setPrepErr(p.message);
      if (pickerRef.current) pickerRef.current.value = "";
      return;
    }
    const next = URL.createObjectURL(p.file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(next);
    setSelectedFileName(p.file.name);
    setZoom(1.2);
    setPosX(0);
    setPosY(0);
    setRemoveCurrent(false);
    setEditorMode(hasAnyForUI ? "edit" : "add");
    setActionOpen(false);
    setEditorOpen(true);
  }

  function clearSelectedFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFileName("");
    setZoom(1.2);
    setPosX(0);
    setPosY(0);
    if (pickerRef.current) pickerRef.current.value = "";
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  }

  function markRemoveCurrent() {
    clearSelectedFile();
    setRemoveCurrent(true);
    setActionOpen(false);
    setEditorOpen(false);
  }

  async function confirmCropIntoInput() {
    if (!previewUrl || !uploadInputRef.current) return;
    const image = await loadImage(previewUrl);
    const minSide = Math.min(image.naturalWidth, image.naturalHeight);
    const cropSide = Math.max(1, Math.floor(minSide / zoom));
    const maxShiftX = Math.max(0, (image.naturalWidth - cropSide) / 2);
    const maxShiftY = Math.max(0, (image.naturalHeight - cropSide) / 2);
    const centerX = image.naturalWidth / 2 + (posX / 100) * maxShiftX;
    const centerY = image.naturalHeight / 2 + (posY / 100) * maxShiftY;
    const sx = Math.min(image.naturalWidth - cropSide, Math.max(0, Math.floor(centerX - cropSide / 2)));
    const sy = Math.min(image.naturalHeight - cropSide, Math.max(0, Math.floor(centerY - cropSide / 2)));

    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, sx, sy, cropSide, cropSide, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;
    const outFile = new File([blob], `${t.outPrefix}_${Date.now()}.jpg`, { type: "image/jpeg" });
    const dt = new DataTransfer();
    dt.items.add(outFile);
    uploadInputRef.current.files = dt.files;
    setRemoveCurrent(false);
    setEditorOpen(false);
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <input ref={uploadInputRef} type="file" name={fileInputName} accept="image/jpeg" className="sr-only" required={required && !hasAnyForUI} />
      <input type="hidden" name={removeFlagName} value={removeCurrent ? "1" : "0"} />
      <input ref={pickerRef} type="file" accept="image/*" className="sr-only" onChange={() => void onPickFile()} />

      {displayUrl ? (
        <img src={displayUrl} alt={t.previewAlt} className="h-16 w-16 rounded-lg border border-[color:var(--eid-border-subtle)] object-cover" />
      ) : (
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/50 text-[10px] text-eid-text-secondary">
          {t.empty}
        </span>
      )}

      <button
        type="button"
        onClick={() => {
          setPrepErr(null);
          setActionOpen(true);
        }}
        className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/12 px-3 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg"
      >
        {hasAnyForUI ? t.primaryEdit : t.primaryAdd}
      </button>

      {prepErr ? <p className="w-full text-[11px] text-amber-200">{prepErr}</p> : null}

      {mounted && actionPresent
        ? createPortal(
            <div
              className={`fixed inset-0 z-[95] flex items-end justify-center bg-black/55 p-3 transition-opacity duration-180 sm:items-center ${actionClosing ? "opacity-0" : "opacity-100"} motion-safe:animate-[fade-in_180ms_ease-out_both]`}
            >
              <button type="button" aria-label="Fechar modal" className="absolute inset-0" onClick={() => setActionOpen(false)} />
              <div
                className={`relative z-[1] w-full max-w-sm rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 shadow-2xl transition-all duration-180 motion-safe:animate-[eid-content-block-enter_240ms_cubic-bezier(0.22,1,0.36,1)_both] ${actionClosing ? "translate-y-2 scale-[0.985] opacity-0" : "translate-y-0 scale-100 opacity-100"}`}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.06em] text-eid-fg">Escudo</p>
                <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">Adicione, edite enquadramento ou remova.</p>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => pickerRef.current?.click()}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/12 px-3 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg"
                  >
                    {hasAnyForUI ? "Trocar escudo" : "Adicionar escudo"}
                  </button>
                  {previewUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditorMode("edit");
                        setEditorOpen(true);
                        setActionOpen(false);
                      }}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/8 px-3 text-[11px] font-black uppercase tracking-[0.04em] text-eid-primary-300"
                    >
                      Editar enquadramento
                    </button>
                  ) : null}
                  {hasAnyForUI ? (
                    <button
                      type="button"
                      onClick={markRemoveCurrent}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-400/45 bg-red-500/10 px-3 text-[11px] font-black uppercase tracking-[0.04em] text-[color:color-mix(in_srgb,var(--eid-danger-600)_82%,var(--eid-fg)_18%)]"
                    >
                      Remover escudo atual
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setActionOpen(false)}
                    className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-[color:var(--eid-border-subtle)] px-3 text-[10px] font-semibold uppercase tracking-[0.04em] text-eid-text-secondary"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {mounted && editorPresent && previewUrl
        ? createPortal(
            <div
              className={`fixed inset-0 z-[96] flex items-end justify-center bg-black/70 transition-opacity duration-180 sm:items-center sm:px-4 ${editorClosing ? "opacity-0" : "opacity-100"} motion-safe:animate-[fade-in_180ms_ease-out_both]`}
            >
              <div
                className={`w-full max-w-sm rounded-t-3xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-2xl transition-all duration-180 motion-safe:animate-[eid-content-block-enter_240ms_cubic-bezier(0.22,1,0.36,1)_both] sm:rounded-2xl ${editorClosing ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"}`}
              >
                <div className="flex justify-center pt-3 sm:hidden">
                  <div className="h-1 w-10 rounded-full bg-[color:var(--eid-border-subtle)]" />
                </div>
                <div className="flex items-center gap-2 border-b border-[color:var(--eid-border-subtle)] px-4 py-3">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-eid-primary-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-sm font-bold text-eid-fg">
                    {variant === "espaco_logo" ? "Ajustar foto do local" : "Ajustar escudo"}
                  </p>
                </div>
                <div className="p-4">
                  {/* Preview quadrado em tempo real */}
                  <div className="mb-4 flex flex-col items-center gap-2">
                    <div className="relative h-24 w-24 overflow-hidden rounded-2xl ring-2 ring-eid-primary-500/40 ring-offset-2 ring-offset-eid-card">
                      <img
                        src={previewUrl}
                        alt="Prévia"
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{
                          objectPosition: `${50 + posX * 0.45}% ${50 + posY * 0.45}%`,
                          transform: `scale(${zoom})`,
                          transformOrigin: `${50 + posX * 0.45}% ${50 + posY * 0.45}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-eid-text-muted">Prévia do enquadramento</p>
                  </div>
                  <div className="grid gap-3">
                    <label className="block">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-eid-text-secondary">Zoom</span>
                        <span className="text-[10px] tabular-nums text-eid-text-muted">{zoom.toFixed(2)}×</span>
                      </div>
                      <input type="range" min={1} max={2.4} step={0.05} value={zoom} onChange={(ev) => setZoom(Number(ev.target.value))} className="w-full accent-[#2563eb]" />
                    </label>
                    <label className="block">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-eid-text-secondary">Posição horizontal</span>
                        <span className="text-[10px] tabular-nums text-eid-text-muted">{posX > 0 ? `+${posX}` : posX}</span>
                      </div>
                      <input type="range" min={-100} max={100} step={1} value={posX} onChange={(ev) => setPosX(Number(ev.target.value))} className="w-full accent-[#2563eb]" />
                    </label>
                    <label className="block">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-eid-text-secondary">Posição vertical</span>
                        <span className="text-[10px] tabular-nums text-eid-text-muted">{posY > 0 ? `+${posY}` : posY}</span>
                      </div>
                      <input type="range" min={-100} max={100} step={1} value={posY} onChange={(ev) => setPosY(Number(ev.target.value))} className="w-full accent-[#2563eb]" />
                    </label>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => setEditorOpen(false)} className="flex-1 rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2.5 text-xs font-semibold text-eid-text-secondary transition hover:border-eid-primary-500/30 hover:text-eid-fg">
                      Cancelar
                    </button>
                    <button type="button" onClick={() => void confirmCropIntoInput()} className="flex-1 rounded-xl bg-[linear-gradient(135deg,#2563EB,#1D4ED8)] px-3 py-2.5 text-xs font-bold text-white shadow-[0_6px_16px_-8px_rgba(37,99,235,0.7)] transition hover:brightness-105">
                      {editorMode === "add" ? t.confirmAdd : t.confirmEdit}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}
