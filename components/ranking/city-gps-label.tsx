"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  fallbackCity: string | null;
};

function pickCityName(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as { address?: Record<string, unknown> };
  const a = root.address ?? {};
  const raw =
    a.city ??
    a.town ??
    a.village ??
    a.municipality ??
    a.county ??
    a.state_district ??
    a.state;
  const city = String(raw ?? "").trim();
  return city || null;
}

export default function CityGpsLabel({ fallbackCity }: Props) {
  const [gpsCity, setGpsCity] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
            { headers: { Accept: "application/json" } }
          );
          if (!res.ok) return;
          const data: unknown = await res.json();
          const city = pickCityName(data);
          if (!cancelled && city) setGpsCity(city);
        } catch {
          // Silencioso: fallback continua funcionando.
        }
      },
      () => {
        // Silencioso: usuário pode negar permissão.
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const text = useMemo(() => gpsCity ?? fallbackCity ?? "Cidade", [fallbackCity, gpsCity]);
  return <span className="truncate">{text}</span>;
}

