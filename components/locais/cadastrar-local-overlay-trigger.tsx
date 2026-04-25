"use client";

import type { ReactNode } from "react";
import { ProfileEditDrawerTrigger } from "@/components/perfil/profile-edit-drawer-trigger";

type Props = {
  href?: string;
  className?: string;
  children: ReactNode;
};

export function CadastrarLocalOverlayTrigger({
  href = "/locais/cadastrar?from=/locais",
  className,
  children,
}: Props) {
  return (
    <ProfileEditDrawerTrigger
      href={href}
      title="Cadastrar local genérico"
      className={className}
      fullscreen
      topMode="backAndClose"
      disableIframeBack
    >
      {children}
    </ProfileEditDrawerTrigger>
  );
}
