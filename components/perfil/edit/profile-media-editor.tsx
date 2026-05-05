"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  removeProfileAvatarAction,
  removeProfileCoverAction,
  uploadProfileAvatarAction,
  uploadProfileCoverAction,
  type ProfileUploadState,
} from "@/app/perfil/actions";
import { prepareAvatarForUpload, prepareCoverForUpload } from "@/lib/images/prepare-avatar-upload";
type Props = {
  avatarUrl: string | null;
  coverUrl: string | null;
};

function RemoveMediaButton({ label = "Remover" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      data-eid-remove-media-btn="true"
      disabled={pending}
      className="inline-flex appearance-none items-center gap-1 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-300 outline-none ring-0 transition hover:bg-rose-500/15 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${pending ? "animate-pulse" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 7h16" />
        <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
        <path d="M6.5 7 7.3 19a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
      </svg>
      {pending ? "Removendo..." : label}
    </button>
  );
}

export function ProfileMediaEditor({ avatarUrl, coverUrl }: Props) {
  const avatarFormRef = useRef<HTMLFormElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverFormRef = useRef<HTMLFormElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const [coverState, coverAction] = useActionState(uploadProfileCoverAction, null as ProfileUploadState);
  const [avatarState, avatarAction] = useActionState(uploadProfileAvatarAction, null as ProfileUploadState);
  const [coverPrepErr, setCoverPrepErr] = useState<string | null>(null);
  const [avatarPrepErr, setAvatarPrepErr] = useState<string | null>(null);

  useEffect(() => {
    if (coverState?.ok === true) setCoverPrepErr(null);
  }, [coverState]);

  useEffect(() => {
    if (avatarState?.ok === true) setAvatarPrepErr(null);
  }, [avatarState]);

  const coverErr =
    coverPrepErr || (coverState && "ok" in coverState && !coverState.ok ? coverState.message : null);

  const avatarErr =
    avatarPrepErr || (avatarState && "ok" in avatarState && !avatarState.ok ? avatarState.message : null);

  async function onCoverFileChange() {
    const file = coverInputRef.current?.files?.[0];
    if (!file) return;
    setCoverPrepErr(null);
    const p = await prepareCoverForUpload(file);
    if (!p.ok) {
      setCoverPrepErr(p.message);
      if (coverInputRef.current) coverInputRef.current.value = "";
      return;
    }
    const dt = new DataTransfer();
    dt.items.add(p.file);
    if (coverInputRef.current) coverInputRef.current.files = dt.files;
    coverFormRef.current?.requestSubmit();
  }

  async function onAvatarFileChange() {
    const file = avatarInputRef.current?.files?.[0];
    if (!file) return;
    setAvatarPrepErr(null);
    const p = await prepareAvatarForUpload(file);
    if (!p.ok) {
      setAvatarPrepErr(p.message);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }
    const dt = new DataTransfer();
    dt.items.add(p.file);
    if (avatarInputRef.current) avatarInputRef.current.files = dt.files;
    avatarFormRef.current?.requestSubmit();
  }

  return (
    <div className="grid gap-3">
      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/65 p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg">Foto de capa</p>
        <div className="mt-2">
          <div className="min-h-[106px] w-full overflow-hidden rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/45">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-[106px] flex-col items-center justify-center gap-1 text-center">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-eid-primary-300" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="4" y="6" width="16" height="12" rx="2" />
                  <circle cx="9" cy="10" r="1.5" />
                  <path d="m7 16 3.5-3.5L13 15l2.5-2.5L18 15" />
                </svg>
                <p className="text-[11px] font-bold text-eid-fg">Nenhuma foto de capa adicionada</p>
                <p className="text-[10px] text-eid-text-secondary">Adicione uma imagem para sua capa</p>
              </div>
            )}
          </div>
          {coverErr ? (
            <p className="mt-2 text-[11px] leading-snug text-amber-200" role="status">
              {coverErr}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <form ref={coverFormRef} action={coverAction}>
              <input
                ref={coverInputRef}
                type="file"
                name="cover_file"
                accept="image/*"
                className="sr-only"
                onChange={onCoverFileChange}
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-3 py-1.5 text-[11px] font-semibold text-[#2D58A6]"
              >
                <span aria-hidden>+</span>
                {coverUrl ? "Trocar capa" : "Adicionar capa"}
              </button>
            </form>
            {coverUrl ? (
              <form action={removeProfileCoverAction}>
                <RemoveMediaButton label="Remover" />
              </form>
            ) : null}
          </div>
          <p className="mt-1.5 text-[10px] text-eid-text-secondary">
            Formatos comuns de galeria e câmera; a imagem é ajustada e comprimida automaticamente.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/65 p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg">Foto de perfil</p>
        <div className="mt-2 flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full border border-[color:var(--eid-border-subtle)] object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-[color:var(--eid-border-subtle)] text-[9px] text-eid-text-secondary">
              Sem foto
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <form ref={avatarFormRef} action={avatarAction}>
                <input
                  ref={avatarInputRef}
                  type="file"
                  name="avatar_file"
                  accept="image/*"
                  className="sr-only"
                  onChange={onAvatarFileChange}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/60 px-3 py-1.5 text-[11px] font-semibold text-[#2D58A6]"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <circle cx="12" cy="13" r="3.2" />
                    <path d="M5.5 8.5h3l1.2-1.8h4.6l1.2 1.8h3A1.5 1.5 0 0 1 20 10v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17v-7a1.5 1.5 0 0 1 1.5-1.5Z" />
                  </svg>
                  Trocar foto
                </button>
              </form>
              {avatarUrl ? (
                <form action={removeProfileAvatarAction}>
                  <RemoveMediaButton label="Remover" />
                </form>
              ) : null}
            </div>
            {avatarErr ? (
              <p className="text-[11px] leading-snug text-amber-200" role="status">
                {avatarErr}
              </p>
            ) : null}
            <p className="text-[10px] text-eid-text-secondary">
              Qualquer foto comum da galeria ou câmera; o app otimiza antes de enviar. Se der erro, escolha outra imagem ou tire uma nova.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
