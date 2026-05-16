"use client";

import { useEffect, useState } from "react";
import { Navigation } from "lucide-react";
import { distanciaKm } from "@/lib/geo/distance-km";

export function EspacoDistanceBadge({ lat, lng }: { lat: number; lng: number }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const d = distanciaKm(pos.coords.latitude, pos.coords.longitude, lat, lng);
        if (Number.isFinite(d) && d < 9000) {
          setLabel(d < 1 ? `${Math.round(d * 1000)} m de você` : `${d.toFixed(1).replace(".", ",")} km de você`);
        }
      },
      undefined,
      { timeout: 6000, maximumAge: 300000 }
    );
  }, [lat, lng]);

  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-eid-action-500/30 bg-eid-action-500/10 px-2.5 py-1 text-[11px] font-bold text-eid-action-300 eid-light:text-eid-action-600">
      <Navigation className="h-3 w-3" />
      {label}
    </span>
  );
}
