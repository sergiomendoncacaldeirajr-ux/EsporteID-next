"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  removeProfileAvatarAction,
  uploadProfileAvatarAction,
  type ProfileUploadState,
} from "@/app/perfil/actions";
import { prepareAvatarForUpload } from "@/lib/images/prepare-avatar-upload";
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

  async function onFileChange() {
    const raw = pickerRef.current?.files?.[0];
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
      <input ref={pickerRef} type="file" accept="image/*" className="sr-only" onChange={onFileChange} />
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
          className={`fixed inset-0 z-[95] flex items-center justify-center bg-black/55 px-4 transition-opacity duration-180 ${editorClosing ? "opacity-0" : "opacity-100"} motion-safe:animate-[fade-in_180ms_ease-out_both]`}
        >
          <div
            className={`w-full max-w-xs rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 shadow-xl transition-all duration-180 motion-safe:animate-[eid-content-block-enter_240ms_cubic-bezier(0.22,1,0.36,1)_both] ${editorClosing ? "translate-y-2 scale-[0.985] opacity-0" : "translate-y-0 scale-100 opacity-100"}`}
          >
            <p className="truncate text-[11px] font-semibold text-eid-fg">{selectedFileName}</p>
            <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-black/20">
              <img
                src={previewUrl}
                alt=""
                className="h-44 w-full object-cover"
                style={{
                  objectPosition: `${50 + posX * 0.45}% ${50 + posY * 0.45}%`,
                  transform: `scale(${zoom})`,
                }}
              />
            </div>
            <div className="mt-2 grid gap-2">
              <label className="block text-[10px] text-eid-text-secondary">
                Zoom do recorte
                <input
                  type="range"
                  min={1}
                  max={2.4}
                  step={0.05}
                  value={zoom}
                  onChange={(ev) => setZoom(Number(ev.target.value))}
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-[10px] text-eid-text-secondary">
                Posição horizontal
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={posX}
                  onChange={(ev) => setPosX(Number(ev.target.value))}
                  className="mt-1 w-full"
                />
              </label>
              <label className="block text-[10px] text-eid-text-secondary">
                Posição vertical
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={posY}
                  onChange={(ev) => setPosY(Number(ev.target.value))}
                  className="mt-1 w-full"
                />
              </label>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <EidCancelAction type="button" compact className="rounded-lg" onClick={closeEditor} />
              <button
                type="button"
                onClick={() => void confirmCropAndUpload()}
                disabled={saving}
                className="rounded-lg border border-eid-primary-500/40 bg-eid-primary-500/12 px-2 py-1 text-[10px] font-semibold text-eid-fg disabled:opacity-60"
              >
                {saving ? (editorMode === "add" ? "Enviando..." : "Salvando...") : editorMode === "add" ? "Enviar foto" : "Salvar edição"}
              </button>
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
              <button
                type="button"
                onClick={() => pickerRef.current?.click()}
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/12 px-3 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg"
              >
                {hasAvatar ? "Trocar foto" : "Adicionar foto"}
              </button>
              {hasAvatar ? (
                <button
                  type="button"
                  onClick={removeCurrentAvatar}
                  disabled={removing}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-400/45 bg-red-500/10 px-3 text-[11px] font-black uppercase tracking-[0.04em] text-red-200 disabled:opacity-60"
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
