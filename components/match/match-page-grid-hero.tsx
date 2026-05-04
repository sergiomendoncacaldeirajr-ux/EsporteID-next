"use client";

import { useSearchParams } from "next/navigation";
import { MatchRadarGridHero } from "@/components/match/match-radar-grid-hero";
import type { MatchRadarFinalidade } from "@/lib/match/radar-snapshot";

function finalidadeFromSearch(v: string | null): MatchRadarFinalidade {
  return v?.trim().toLowerCase() === "amistoso" ? "amistoso" : "ranking";
}

/** Hero do /match em grade: lê `finalidade` da URL para acompanhar filtros (router.replace no radar). */
export function MatchPageGridHero({
  viewerId,
  viewerDisponivelAmistoso,
  viewerAmistosoExpiresAt,
}: {
  viewerId: string;
  viewerDisponivelAmistoso: boolean;
  viewerAmistosoExpiresAt: string | null;
}) {
  const sp = useSearchParams();
  const finalidade = finalidadeFromSearch(sp.get("finalidade"));
  return (
    <MatchRadarGridHero
      viewerId={viewerId}
      finalidade={finalidade}
      viewerDisponivelAmistoso={viewerDisponivelAmistoso}
      viewerAmistosoExpiresAt={viewerAmistosoExpiresAt}
    />
  );
}
