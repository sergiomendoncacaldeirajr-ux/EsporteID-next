"use client";

import { useRef } from "react";
import {
  removeProfileAvatarAction,
  removeProfileCoverAction,
  uploadProfileAvatarAction,
  uploadProfileCoverAction,
} from "@/app/perfil/actions";

type Props = {
  avatarUrl: string | null;
  coverUrl: string | null;
};

export function ProfileMediaEditor({ avatarUrl, coverUrl }: Props) {
  const avatarFormRef = useRef<HTMLFormElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverFormRef = useRef<HTMLFormElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <section className="eid-surface-panel rounded-2xl p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Foto de perfil</p>
        <div className="mt-2 flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full border border-[color:var(--eid-border-subtle)] object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-[color:var(--eid-border-subtle)] text-[9px] text-eid-text-secondary">
              Sem foto
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <form ref={avatarFormRef} action={uploadProfileAvatarAction}>
              <input
                ref={avatarInputRef}
                type="file"
                name="avatar_file"
                accept="image/*"
                className="sr-only"
                onChange={() => avatarFormRef.current?.requestSubmit()}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[10px] font-semibold text-eid-fg"
              >
                Trocar foto
              </button>
            </form>
            {avatarUrl ? (
              <form action={removeProfileAvatarAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[10px] font-semibold text-eid-text-secondary"
                >
                  Remover
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>

      <section className="eid-surface-panel rounded-2xl p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Foto de capa</p>
        <div className="mt-2">
          <div className="h-16 w-full overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45">
            {coverUrl ? <img src={coverUrl} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <form ref={coverFormRef} action={uploadProfileCoverAction}>
              <input
                ref={coverInputRef}
                type="file"
                name="cover_file"
                accept="image/*"
                className="sr-only"
                onChange={() => coverFormRef.current?.requestSubmit()}
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[10px] font-semibold text-eid-fg"
              >
                {coverUrl ? "Trocar capa" : "Adicionar capa"}
              </button>
            </form>
            {coverUrl ? (
              <form action={removeProfileCoverAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2 py-1 text-[10px] font-semibold text-eid-text-secondary"
                >
                  Remover
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

