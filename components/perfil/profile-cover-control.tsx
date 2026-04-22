"use client";

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
        className="inline-flex min-h-[20px] items-center justify-center rounded-full border border-white/35 bg-black/45 px-1.5 text-[7px] font-bold uppercase tracking-[0.06em] text-white transition hover:bg-black/55"
      >
        {hasCover ? "Editar ou remover" : "Adicionar foto de capa"}
      </button>
    </>
  );
}

