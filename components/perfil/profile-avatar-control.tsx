"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  removeProfileAvatarAction,
  uploadProfileAvatarAction,
  type ProfileUploadState,
} from "@/app/perfil/actions";
import { prepareAvatarForUpload } from "@/lib/images/prepare-avatar-upload";
import { isNativeCameraAvailable, pickNativeImage } from "@/lib/native/camera";
import { EidCancelAction } from "@/components/ui/eid-cancel-action";

type Props = {
  hasAvatar: boolean;
};

export function ProfileAvatarControl({ hasAvatar }: Props) {
  const EXIT_MS = 180;
  const uploadFormRef = useRef<HTMLFormElement | null>(null);
  const removeFormRef = useRef<HTMLFormElement | null>(null);
  const pickerRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"add" | "edit">("add");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [zoom, setZoom] = useState(1.2);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [actionPresent, setActionPresent] = useState(false);
  const [editorPresent, setEditorPresent] = useState(false);
  const [actionClosing, setActionClosing] = useState(false);
  const [editorClosing, setEditorClosing] = useState(false);
  const [prepErr, setPrepErr] = useState<string | null>(null);
  const [uploadState, uploadAction] = useActionState(uploadProfileAvatarAction, null as ProfileUploadState);

  const serverErr = uploadState && "ok" in uploadState && !uploadState.ok ? uploadState.message : null;
  const feedbackErr = prepErr || serverErr;

  useEffect(() => {
    if (!uploadState) return;
    setSaving(false);
    if (uploadState.ok === true) {
      setPrepErr(null);
      closeEditor();
      setActionOpen(false);
    }
  }, [uploadState]);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  function onClick() {
    setPrepErr(null);
    setActionOpen(true);
  }

  async function onFileChange(file?: File | null) {
    const raw = file ?? pickerRef.current?.files?.[0];
    if (!raw) return;
    setPrepErr(null);
    const p = await prepareAvatarForUpload(raw);
    if (!p.ok) {
      setPrepErr(p.message);
      if (pickerRef.current) pickerRef.current.value = "";
      return;
    }
    const dt = new DataTransfer();
    dt.items.add(p.file);
    if (pickerRef.current) pickerRef.current.files = dt.files;

    const next = URL.createObjectURL(p.file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(next);
    setSelectedFileName(p.file.name);
    setEditorMode(hasAvatar ? "edit" : "add");
    setZoom(1.2);
    setPosX(0);
    setPosY(0);
    setEditorOpen(true);
    setActionOpen(false);
  }

  async function pickProfilePhoto(source: "camera" | "gallery") {
    if (!isNativeCameraAvailable()) {
      pickerRef.current?.click();
      return;
    }
    try {
      const file = await pickNativeImage(source);
      if (file) await onFileChange(file);
    } catch (error) {
      const message = String((error as { message?: string })?.message ?? "");
      if (!/cancel/i.test(message)) setPrepErr("Não foi possível abrir a câmera/galeria agora.");
    }
  }

  function closeEditor() {
    setEditorOpen(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFileName("");
    setZoom(1.2);
    setPosX(0);
    setPosY(0);
    if (pickerRef.current) pickerRef.current.value = "";
  }

  async function confirmCropAndUpload() {
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
    const cropped = new File([blob], `avatar_${Date.now()}.jpg`, { type: "image/jpeg" });
    const dt = new DataTransfer();
    dt.items.add(cropped);
    uploadInputRef.current.files = dt.files;
    setSaving(true);
    uploadFormRef.current?.requestSubmit();
  }

  function removeCurrentAvatar() {
    setRemoving(true);
    removeFormRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={uploadFormRef} action={uploadAction}>
        <input ref={uploadInputRef} type="file" name="avatar_file" accept="image/jpeg" className="sr-only" />
      </form>
      <form ref={removeFormRef} action={removeProfileAvatarAction} />
      <input ref={pickerRef} type="file" accept="image/*" className="sr-only" onChange={() => void onFileChange()} />
      <div className="absolute -bottom-1 -right-1 z-[5]">
        <button
          type="button"
          onClick={onClick}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card/92 text-eid-text-secondary transition-colors hover:text-eid-fg"
          aria-label="Editar foto de perfil"
          title="Editar foto de perfil"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden>
            <path d="M2.5 4A1.5 1.5 0 0 1 4 2.5h1.124a1 1 0 0 0 .8-.4l.352-.47A1.5 1.5 0 0 1 7.476 1h1.048a1.5 1.5 0 0 1 1.2.63l.352.47a1 1 0 0 0 .8.4H12A1.5 1.5 0 0 1 13.5 4v8A1.5 1.5 0 0 1 12 13.5H4A1.5 1.5 0 0 1 2.5 12V4Zm5.5 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          </svg>
        </button>
        {feedbackErr ? (
          <p
            className="absolute left-1/2 top-full z-[60] mt-1 w-max max-w-[min(14rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-amber-500/35 bg-amber-500/15 px-2 py-1.5 text-center text-[9px] leading-snug text-amber-100 shadow-lg sm:text-[10px]"
            role="status"
          >
            {feedbackErr}
          </p>
        ) : null}
      </div>
      {mounted && editorPresent && previewUrl
        ? createPortal(
        <div
          className={`fixed inset-0 z-[95] flex items-end justify-center bg-black/70 transition-opacity duration-180 sm:items-center sm:px-4 ${editorClosing ? "opacity-0" : "opacity-100"} motion-safe:animate-[fade-in_180ms_ease-out_both]`}
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
              <p className="text-sm font-bold text-eid-fg">Ajustar foto de perfil</p>
            </div>
            <div className="p-4">
              {/* Preview circular em tempo real */}
              <div className="mb-4 flex flex-col items-center gap-2">
                <div className="relative h-24 w-24 overflow-hidden rounded-full ring-2 ring-eid-primary-500/40 ring-offset-2 ring-offset-eid-card">
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
                <p className="text-[10px] text-eid-text-muted">Prévia do recorte circular</p>
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
                <button type="button" onClick={closeEditor} className="flex-1 rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2.5 text-xs font-semibold text-eid-text-secondary transition hover:border-eid-primary-500/30 hover:text-eid-fg">
                  Cancelar
                </button>
                <button type="button" onClick={() => void confirmCropAndUpload()} disabled={saving} className="flex-1 rounded-xl bg-[linear-gradient(135deg,#2563EB,#1D4ED8)] px-3 py-2.5 text-xs font-bold text-white shadow-[0_6px_16px_-8px_rgba(37,99,235,0.7)] transition hover:brightness-105 disabled:opacity-60">
                  {saving ? (editorMode === "add" ? "Enviando..." : "Salvando...") : editorMode === "add" ? "Usar esta foto" : "Salvar ajuste"}
                </button>
              </div>
            </div>
          </div>
        </div>,
          document.body,
        )
        : null}
      {mounted && actionPresent
        ? createPortal(
        <div
          className={`fixed inset-0 z-[92] flex items-end justify-center bg-black/55 p-3 transition-opacity duration-180 sm:items-center ${actionClosing ? "opacity-0" : "opacity-100"} motion-safe:animate-[fade-in_180ms_ease-out_both]`}
        >
          <button type="button" aria-label="Fechar modal" className="absolute inset-0" onClick={() => setActionOpen(false)} />
          <div
            className={`relative z-[1] w-full max-w-xs rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 shadow-2xl transition-all duration-180 motion-safe:animate-[eid-content-block-enter_240ms_cubic-bezier(0.22,1,0.36,1)_both] ${actionClosing ? "translate-y-2 scale-[0.985] opacity-0" : "translate-y-0 scale-100 opacity-100"}`}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.06em] text-eid-fg">Foto de perfil</p>
            <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
              Adicione, reposicione ou remova sua foto.
            </p>
            <div className="mt-3 grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void pickProfilePhoto("camera")}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/12 px-3 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg"
                >
                  Câmera
                </button>
                <button
                  type="button"
                  onClick={() => void pickProfilePhoto("gallery")}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/12 px-3 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg"
                >
                  Galeria
                </button>
              </div>
              {hasAvatar ? (
                <button
                  type="button"
                  onClick={removeCurrentAvatar}
                  disabled={removing}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-400/45 bg-red-500/10 px-3 text-[11px] font-black uppercase tracking-[0.04em] text-[color:color-mix(in_srgb,var(--eid-danger-600)_82%,var(--eid-fg)_18%)] disabled:opacity-60"
                >
                  {removing ? "Removendo..." : "Remover foto atual"}
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
    </>
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
