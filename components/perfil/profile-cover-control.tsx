"use client";

import { Camera } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
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
  const uploadFormRef = useRef<HTMLFormElement | null>(null);
  const removeFormRef = useRef<HTMLFormElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [prepErr, setPrepErr] = useState<string | null>(null);
  const [uploadState, uploadAction] = useActionState(uploadProfileCoverAction, null as ProfileUploadState);

  const serverErr = uploadState && "ok" in uploadState && !uploadState.ok ? uploadState.message : null;
  const feedbackErr = prepErr || serverErr;

  useEffect(() => {
    if (uploadState?.ok === true) setPrepErr(null);
  }, [uploadState]);

  function onMainClick() {
    setPrepErr(null);
    if (!hasCover) {
      fileRef.current?.click();
      return;
    }
    const trocar = window.confirm("OK para editar/enviar nova capa.\nCancelar para remover a capa atual.");
    if (trocar) {
      fileRef.current?.click();
    } else {
      removeFormRef.current?.requestSubmit();
    }
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
    const dt = new DataTransfer();
    dt.items.add(p.file);
    if (fileRef.current) fileRef.current.files = dt.files;
    uploadFormRef.current?.requestSubmit();
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
    </>
  );
}
