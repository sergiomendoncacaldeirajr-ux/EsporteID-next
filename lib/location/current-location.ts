"use client";

import { Capacitor } from "@capacitor/core";

export type CurrentLocationResult = {
  lat: number;
  lng: number;
  localizacao: string;
};

type LocationCoords = {
  latitude: number;
  longitude: number;
};

type ReverseGeocodeResponse = {
  localizacao?: string;
};

export function coordinateFallback(lat: number, lng: number): string {
  return `Localização capturada (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}

export function geolocationErrorMessage(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED) {
    return "Permita o acesso à localização para preencher sua cidade automaticamente.";
  }
  if (err.code === err.TIMEOUT) {
    return "Não consegui obter sua localização a tempo. Tente novamente em um local com melhor sinal.";
  }
  return "Não consegui obter sua localização atual. Verifique se o GPS/localização está ativo e tente novamente.";
}

export function isGeolocationPositionError(err: unknown): err is GeolocationPositionError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "message" in err &&
    typeof (err as { code: unknown }).code === "number"
  );
}

function getBrowserLocation(): Promise<LocationCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este navegador não permite acessar a localização atual."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      reject,
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 15_000,
      }
    );
  });
}

function shouldFallbackToBrowserLocation(err: unknown): boolean {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message?: unknown }).message ?? "")
        : String(err ?? "");
  return /plugin|not implemented|unimplemented|unavailable|not available|bridge/i.test(message);
}

async function getCurrentCoords(): Promise<LocationCoords> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const permission = await Geolocation.checkPermissions();

      if (permission.location !== "granted" && permission.coarseLocation !== "granted") {
        const requested = await Geolocation.requestPermissions({
          permissions: ["location", "coarseLocation"],
        });

        if (requested.location !== "granted" && requested.coarseLocation !== "granted") {
          throw new Error("Permita o acesso à localização do app para preencher sua cidade automaticamente.");
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 15_000,
      });

      return position.coords;
    } catch (err) {
      if (shouldFallbackToBrowserLocation(err)) {
        return getBrowserLocation();
      }
      throw err;
    }
  }

  return getBrowserLocation();
}

export async function detectCurrentLocation(): Promise<CurrentLocationResult> {
  const coords = await getCurrentCoords();
  const lat = coords.latitude;
  const lng = coords.longitude;

  try {
    const response = await fetch(
      `/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
      { headers: { Accept: "application/json" } }
    );
    const data = (await response.json()) as ReverseGeocodeResponse;
    return {
      lat,
      lng,
      localizacao: data.localizacao?.trim() || coordinateFallback(lat, lng),
    };
  } catch {
    return {
      lat,
      lng,
      localizacao: coordinateFallback(lat, lng),
    };
  }
}
