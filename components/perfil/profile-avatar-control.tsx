"use client";

import { useRef, useState } from "react";
import { removeProfileAvatarAction, uploadProfileAvatarAction } from "@/app/perfil/actions";

type Props = {
  hasAvatar: boolean;
};

export function ProfileAvatarControl({ hasAvatar }: Props) {
  const uploadFormRef = useRef<HTMLFormElement | null>(null);
  const removeFormRef = useRef<HTMLFormElement | null>(null);
  const pickerRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [zoom, setZoom] = useState(1.2);

  function onClick() {
    if (!hasAvatar) {
      pickerRef.current?.click();
      return;
    }
    const trocar = window.confirm("OK para trocar foto de perfil.\nCancelar para remover a foto atual.");
    if (trocar) {
      pickerRef.current?.click();
      return;
    }
    const remover = window.confirm("Remover foto de perfil atual?");
    if (remover) {
      removeFormRef.current?.requestSubmit();
    }
  }

  function onFileChange() {
    const file = pickerRef.current?.files?.[0];
    if (!file) return;
    const next = URL.createObjectURL(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(next);
    setSelectedFileName(file.name);
    setZoom(1.2);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFileName("");
    if (pickerRef.current) pickerRef.current.value = "";
  }

  async function confirmCropAndUpload() {
    const file = pickerRef.current?.files?.[0];
    if (!file || !previewUrl || !uploadInputRef.current) return;

    const image = await loadImage(previewUrl);
    const minSide = Math.min(image.naturalWidth, image.naturalHeight);
    const cropSide = Math.max(1, Math.floor(minSide / zoom));
    const sx = Math.floor((image.naturalWidth - cropSide) / 2);
    const sy = Math.floor((image.naturalHeight - cropSide) / 2);
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
    closeEditor();
    uploadFormRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={uploadFormRef} action={uploadProfileAvatarAction}>
        <input
          ref={uploadInputRef}
          type="file"
          name="avatar_file"
          accept="image/*"
          className="sr-only"
        />
      </form>
      <form ref={removeFormRef} action={removeProfileAvatarAction} />
      <input ref={pickerRef} type="file" accept="image/*" className="sr-only" onChange={onFileChange} />
      <button
        type="button"
        onClick={onClick}
        className="absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card/92 text-eid-text-secondary transition-colors hover:text-eid-fg"
        aria-label="Editar foto de perfil"
        title="Editar foto de perfil"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden>
          <path d="M2.5 4A1.5 1.5 0 0 1 4 2.5h1.124a1 1 0 0 0 .8-.4l.352-.47A1.5 1.5 0 0 1 7.476 1h1.048a1.5 1.5 0 0 1 1.2.63l.352.47a1 1 0 0 0 .8.4H12A1.5 1.5 0 0 1 13.5 4v8A1.5 1.5 0 0 1 12 13.5H4A1.5 1.5 0 0 1 2.5 12V4Zm5.5 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        </svg>
      </button>
      {editorOpen && previewUrl ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-xs rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-3 shadow-xl">
            <p className="truncate text-[11px] font-semibold text-eid-fg">{selectedFileName}</p>
            <div className="mt-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-black/20">
              <img
                src={previewUrl}
                alt=""
                className="h-44 w-full object-cover"
                style={{
                  objectPosition: "center",
                  transform: `scale(${zoom})`,
                }}
              />
            </div>
            <label className="mt-2 block text-[10px] text-eid-text-secondary">
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
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[10px] font-semibold text-eid-text-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmCropAndUpload}
                className="rounded-lg border border-eid-primary-500/40 bg-eid-primary-500/12 px-2 py-1 text-[10px] font-semibold text-eid-fg"
              >
                Salvar foto
              </button>
            </div>
          </div>
        </div>
      ) : null}
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

