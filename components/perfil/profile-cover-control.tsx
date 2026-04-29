"use client";

import { Camera } from "lucide-react";
import { useRef } from "react";
import { removeProfileCoverAction, uploadProfileCoverAction } from "@/app/perfil/actions";

type Props = {
  hasCover: boolean;
};

export function ProfileCoverControl({ hasCover }: Props) {
  const uploadFormRef = useRef<HTMLFormElement | null>(null);
  const removeFormRef = useRef<HTMLFormElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function onMainClick() {
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

  function onFileChange() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    uploadFormRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={uploadFormRef} action={uploadProfileCoverAction}>
        <input ref={fileRef} type="file" name="cover_file" accept="image/*" className="sr-only" onChange={onFileChange} />
      </form>
      <form ref={removeFormRef} action={removeProfileCoverAction} />
      <button
        type="button"
        onClick={onMainClick}
        className="inline-flex items-center justify-center gap-1 rounded-full border border-white/35 bg-black/45 px-2.5 py-1 text-[8px] font-bold uppercase leading-none tracking-[0.07em] text-white shadow-[0_3px_10px_-7px_rgba(0,0,0,0.55)] backdrop-blur-sm transition hover:bg-black/55 sm:text-[9px]"
      >
        <Camera className="h-2.5 w-2.5 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
        {hasCover ? "Editar ou remover" : "Adicionar foto de capa"}
      </button>
    </>
  );
}

