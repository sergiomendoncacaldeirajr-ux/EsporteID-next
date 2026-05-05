"use client";

import { Camera } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  removeProfileCoverAction,
  uploadProfileCoverAction,
  type ProfileUploadState,
} from "@/app/perfil/actions";
import { prepareCoverForUpload } from "@/lib/images/prepare-avatar-upload";

type Props = {
  hasCover: boolean;
};

export function ProfileCoverControl({ hasCover }: Props) {
  const EXIT_MS = 180;
  const uploadFormRef = useRef<HTMLFormElement | null>(null);
  const removeFormRef = useRef<HTMLFormElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [prepErr, setPrepErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"add" | "edit">("add");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [zoom, setZoom] = useState(1);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [actionPresent, setActionPresent] = useState(false);
  const [editorPresent, setEditorPresent] = useState(false);
  const [actionClosing, setActionClosing] = useState(false);
  const [editorClosing, setEditorClosing] = useState(false);
  const [uploadState, uploadAction] = useActionState(uploadProfileCoverAction, null as ProfileUploadState);

  const serverErr = uploadState && "ok" in uploadState && !uploadState.ok ? uploadState.message : null;
  const feedbackErr = prepErr || serverErr;

  useEffect(() => {
    if (!uploadState) return;
    setSaving(false);
    if (uploadState.ok === true) {
      setPrepErr(null);
      closeEditor();
      setOpen(false);
    }
  }, [uploadState]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
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
  }, [open, actionPresent]);

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

  function onMainClick() {
    setPrepErr(null);
    setOpen(true);
  }

  async function onFileChange() {
    const raw = fileRef.current?.files?.[0];
    if (!raw) return;
    setPrepErr(null);
    const p = await prepareCoverForUpload(raw);
    if (!p.ok) {
      setPrepErr(p.message);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const next = URL.createObjectURL(p.file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(next);
    setSelectedFileName(p.file.name);
    setEditorMode(hasCover ? "edit" : "add");
    setZoom(1);
    setPosX(0);
    setPosY(0);
    setEditorOpen(true);
    setOpen(false);
  }

  function closeEditor() {
    setEditorOpen(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFileName("");
    setZoom(1);
    setPosX(0);
    setPosY(0);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function confirmCoverAndUpload() {
    if (!previewUrl || !fileRef.current) return;
    const image = await loadImage(previewUrl);

    const OUTPUT_W = 1600;
    const OUTPUT_H = 500;
    const TARGET_RATIO = OUTPUT_W / OUTPUT_H;

    const iw = image.naturalWidth;
    const ih = image.naturalHeight;
    if (!iw || !ih) return;

    const baseCropW = Math.min(iw, ih * TARGET_RATIO);
    const baseCropH = baseCropW / TARGET_RATIO;

    const safeZoom = Math.max(1, Math.min(2.5, zoom));
    const cropW = Math.max(1, baseCropW / safeZoom);
    const cropH = Math.max(1, baseCropH / safeZoom);

    const maxShiftX = Math.max(0, (iw - cropW) / 2);
    const maxShiftY = Math.max(0, (ih - cropH) / 2);
    const centerX = iw / 2 + (posX / 100) * maxShiftX;
    const centerY = ih / 2 + (posY / 100) * maxShiftY;

    const sx = Math.min(iw - cropW, Math.max(0, centerX - cropW / 2));
    const sy = Math.min(ih - cropH, Math.max(0, centerY - cropH / 2));

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_W;
    canvas.height = OUTPUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(image, sx, sy, cropW, cropH, 0, 0, OUTPUT_W, OUTPUT_H);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;

    const coverFile = new File([blob], `cover_${Date.now()}.jpg`, { type: "image/jpeg" });
    const dt = new DataTransfer();
    dt.items.add(coverFile);
    fileRef.current.files = dt.files;
    setSaving(true);
    uploadFormRef.current?.requestSubmit();
  }

  function removeCurrentCover() {
    setRemoving(true);
    removeFormRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={uploadFormRef} action={uploadAction}>
        <input
          ref={fileRef}
          type="file"
          name="cover_file"
          accept="image/*"
          className="sr-only"
          onChange={() => void onFileChange()}
        />
      </form>
      <form ref={removeFormRef} action={removeProfileCoverAction} />
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={onMainClick}
          className="inline-flex items-center justify-center gap-1 rounded-full border border-white/35 bg-black/45 px-2.5 py-1 text-[8px] font-bold uppercase leading-none tracking-[0.07em] text-white shadow-[0_3px_10px_-7px_rgba(0,0,0,0.55)] backdrop-blur-sm transition hover:bg-black/55 sm:text-[9px]"
        >
          <Camera className="h-2.5 w-2.5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
          {hasCover ? "Editar ou remover" : "Adicionar foto de capa"}
        </button>
        {feedbackErr ? (
          <p className="max-w-[11rem] rounded-lg border border-amber-500/40 bg-black/55 px-2 py-1 text-[8px] leading-snug text-amber-100 sm:max-w-[13rem] sm:text-[9px]" role="status">
            {feedbackErr}
          </p>
        ) : null}
      </div>
      {mounted && actionPresent
        ? createPortal(
        <div
          className={`fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-3 transition-opacity duration-180 sm:items-center ${actionClosing ? "opacity-0" : "opacity-100"} motion-safe:animate-[fade-in_180ms_ease-out_both]`}
        >
          <button
            type="button"
            aria-label="Fechar modal"
            className="absolute inset-0"
            onClick={() => setOpen(false)}
          />
          <div
            className={`relative z-[1] w-full max-w-sm rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 shadow-2xl transition-all duration-180 motion-safe:animate-[eid-content-block-enter_240ms_cubic-bezier(0.22,1,0.36,1)_both] ${actionClosing ? "translate-y-2 scale-[0.985] opacity-0" : "translate-y-0 scale-100 opacity-100"}`}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.06em] text-eid-fg">Foto de capa</p>
            <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
              Adicione uma nova capa, reposicione e salve no padrão da plataforma.
            </p>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/12 px-3 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg"
              >
                {hasCover ? "Trocar capa" : "Adicionar capa"}
              </button>
              {hasCover ? (
                <button
                  type="button"
                  onClick={removeCurrentCover}
                  disabled={removing}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-400/45 bg-red-500/10 px-3 text-[11px] font-black uppercase tracking-[0.04em] text-red-200 disabled:opacity-60"
                >
                  {removing ? "Removendo..." : "Remover capa atual"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
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
          className={`fixed inset-0 z-[95] flex items-end justify-center bg-black/65 p-3 transition-opacity duration-180 sm:items-center ${editorClosing ? "opacity-0" : "opacity-100"} motion-safe:animate-[fade-in_180ms_ease-out_both]`}
        >
          <button
            type="button"
            aria-label="Fechar editor de capa"
            className="absolute inset-0"
            onClick={closeEditor}
          />
          <div
            className={`relative z-[1] w-full max-w-md rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 shadow-2xl transition-all duration-180 motion-safe:animate-[eid-content-block-enter_240ms_cubic-bezier(0.22,1,0.36,1)_both] ${editorClosing ? "translate-y-2 scale-[0.985] opacity-0" : "translate-y-0 scale-100 opacity-100"}`}
          >
            <p className="truncate text-[11px] font-semibold text-eid-fg">{selectedFileName}</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-black/30">
              <div className="relative h-36 w-full overflow-hidden">
                <img
                  src={previewUrl}
                  alt=""
                  className="absolute left-1/2 top-1/2 h-full w-full object-cover"
                  style={{
                    transform: `translate(calc(-50% + ${posX}%), calc(-50% + ${posY}%)) scale(${1 + (zoom - 1) * 0.9})`,
                    transformOrigin: "center",
                  }}
                />
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              <label className="grid gap-1 text-[10px] text-eid-text-secondary">
                Zoom
                <input
                  type="range"
                  min={1}
                  max={2.5}
                  step={0.05}
                  value={zoom}
                  onChange={(ev) => setZoom(Number(ev.target.value))}
                />
              </label>
              <label className="grid gap-1 text-[10px] text-eid-text-secondary">
                Posição horizontal
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={posX}
                  onChange={(ev) => setPosX(Number(ev.target.value))}
                />
              </label>
              <label className="grid gap-1 text-[10px] text-eid-text-secondary">
                Posição vertical
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={posY}
                  onChange={(ev) => setPosY(Number(ev.target.value))}
                />
              </label>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-eid-text-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmCoverAndUpload()}
                disabled={saving}
                className="rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/12 px-3 py-2 text-[10px] font-black uppercase tracking-[0.04em] text-eid-fg disabled:opacity-60"
              >
                {saving ? (editorMode === "add" ? "Enviando..." : "Salvando...") : editorMode === "add" ? "Enviar capa" : "Salvar edição"}
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
