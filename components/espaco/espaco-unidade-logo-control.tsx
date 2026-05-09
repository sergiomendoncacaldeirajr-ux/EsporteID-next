"use client";

import { TeamShieldControl } from "@/components/perfil/team-shield-control";

type Props = {
  currentUrl: string | null;
};

/**
 * Thin client wrapper around TeamShieldControl for espaco unit logo uploads.
 * Provides HEIC support, crop editor and background-removal inside a Server Component page.
 * File input name: "logo_file" · Remove flag: "remover_logo"
 */
export function EspacoUnidadeLogoControl({ currentUrl }: Props) {
  return (
    <TeamShieldControl
      currentUrl={currentUrl}
      fileInputName="logo_file"
      removeFlagName="remover_logo"
      variant="espaco_logo"
    />
  );
}
