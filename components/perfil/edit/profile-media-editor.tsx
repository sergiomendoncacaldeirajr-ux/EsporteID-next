"use client";

import { ProfileAvatarControl } from "@/components/perfil/profile-avatar-control";
import { ProfileCoverControl } from "@/components/perfil/profile-cover-control";
type Props = {
  avatarUrl: string | null;
  coverUrl: string | null;
};

export function ProfileMediaEditor({ avatarUrl, coverUrl }: Props) {
  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/65 p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg">Foto de capa</p>
        <div className="mt-2 space-y-2">
          <div className="relative min-h-[106px] w-full overflow-hidden rounded-xl border border-dashed border-[color:var(--eid-border-subtle)] bg-eid-surface/45">
            {coverUrl ? <img src={coverUrl} alt="" className="h-full w-full object-cover" /> : null}
            <div className="absolute right-2 top-2 z-[2]">
              <ProfileCoverControl hasCover={Boolean(coverUrl)} />
            </div>
            {!coverUrl ? (
              <div className="flex h-[106px] flex-col items-center justify-center gap-1 text-center">
                <p className="text-[11px] font-bold text-eid-fg">Nenhuma foto de capa adicionada</p>
                <p className="text-[10px] text-eid-text-secondary">Use o botao para adicionar</p>
              </div>
            ) : null}
          </div>
          <p className="mt-1.5 text-[10px] text-eid-text-secondary">
            Modal completo com adicionar, editar posicionamento, salvar e remover.
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
            <div className="relative inline-flex h-8 w-8">
              <ProfileAvatarControl hasAvatar={Boolean(avatarUrl)} />
            </div>
            <p className="text-[10px] text-eid-text-secondary">
              Mesmo fluxo completo com adicionar/editar/remover e animacoes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
