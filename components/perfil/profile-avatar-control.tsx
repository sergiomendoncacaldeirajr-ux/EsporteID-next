"use client";

import { useRef } from "react";
import { uploadProfileAvatarAction } from "@/app/perfil/actions";

export function ProfileAvatarControl() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function onClick() {
    fileRef.current?.click();
  }

  function onFileChange() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} action={uploadProfileAvatarAction}>
        <input
          ref={fileRef}
          type="file"
          name="avatar_file"
          accept="image/*"
          className="sr-only"
          onChange={onFileChange}
        />
      </form>
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
    </>
  );
}

