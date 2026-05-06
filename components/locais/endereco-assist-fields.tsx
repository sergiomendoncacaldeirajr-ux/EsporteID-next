"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ExternalLink, MapPinned } from "lucide-react";
import { normalizeHouseNumberToken } from "@/lib/geocode/nominatim-score";

type Props = {
  endereco: string;
  setEndereco: (v: string) => void;
  numero: string;
  setNumero: (v: string) => void;
  bairro: string;
  setBairro: (v: string) => void;
  cidade: string;
  setCidade: (v: string) => void;
  estado: string;
  setEstado: (v: string) => void;
  cep: string;
  setCep: (v: string) => void;
  complemento?: string;
  setComplemento?: (v: string) => void;
  lat?: string;
  lng?: string;
  onCoords?: (lat: string, lng: string) => void;
  /** Foto/logo do local quando já existir (ex.: duplicado no cadastro). */
  localLogoUrl?: string | null;
  prefix?: string;
  requiredComplemento?: boolean;
};

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function formatCep(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function haversineM(aLat: string, aLng: string, bLat: string, bLng: string): number {
  const R = 6371000;
  const la1 = (Math.PI / 180) * Number(aLat);
  const la2 = (Math.PI / 180) * Number(bLat);
  const dLa = (Math.PI / 180) * (Number(bLat) - Number(aLat));
  const dLo = (Math.PI / 180) * (Number(bLng) - Number(aLng));
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

async function fetchNominatimForward(
  q: string,
  numero: string,
  structured?: {
    endereco?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  }
): Promise<{ lat: string; lng: string; label: string; score: number } | null> {
  const sp = new URLSearchParams({ q });
  if (numero.trim()) sp.set("numero", numero.trim());
  if (structured?.endereco?.trim()) sp.set("endereco", structured.endereco.trim());
  if (structured?.bairro?.trim()) sp.set("bairro", structured.bairro.trim());
  if (structured?.cidade?.trim()) sp.set("cidade", structured.cidade.trim());
  if (structured?.estado?.trim()) sp.set("estado", structured.estado.trim());
  if (structured?.cep?.trim()) sp.set("cep", structured.cep.trim());
  sp.set("limit", "10");
  const res = await fetch(`/api/geocode/forward?${sp.toString()}`, { cache: "no-store" });
  if (!res.ok) return null;
  const j = (await res.json()) as {
    result: { lat: string; lng: string; label: string } | null;
    score: number | null;
    error?: string;
  };
  if (j.error || !j.result?.lat || !j.result?.lng) return null;
  return { ...j.result, score: Number(j.score ?? 0) };
}

async function geocodePhotonBest(params: {
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
}): Promise<{ lat: string; lng: string; label: string; houseMatch: boolean } | null> {
  const q = [
    [params.endereco, params.numero].filter(Boolean).join(", "),
    params.bairro,
    [params.cidade, params.estado].filter(Boolean).join(" "),
    "Brasil",
  ]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .join(", ");

  // `lang=pt` faz o Photon responder 400; idioma não é necessário para coordenadas.
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=12`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: { name?: string; street?: string; housenumber?: string; city?: string; state?: string };
      }>;
    };
    const feats = data.features ?? [];
    const want = normalizeHouseNumberToken(params.numero);
    if (want) {
      const hit = feats.find(
        (f) => normalizeHouseNumberToken(String(f.properties?.housenumber ?? "")) === want
      );
      if (hit?.geometry?.coordinates) {
        const [lng, lat] = hit.geometry.coordinates;
        const p = hit.properties;
        const label = [
          p?.street && p?.housenumber ? `${p.street}, ${p.housenumber}` : p?.name,
          p?.city,
          p?.state,
        ]
          .filter(Boolean)
          .join(" — ");
        return { lat: String(lat), lng: String(lng), label: label || q, houseMatch: true };
      }
    }
    const first = feats[0];
    if (first?.geometry?.coordinates) {
      const [lng, lat] = first.geometry.coordinates;
      const p = first.properties;
      const label = [p?.name || p?.street, p?.city].filter(Boolean).join(" — ");
      return { lat: String(lat), lng: String(lng), label: label || q, houseMatch: false };
    }
  } catch {
    return null;
  }
  return null;
}

/** Nominatim (via API) + Photon quando há número — reduz pin preso no centróide do CEP. */
async function forwardGeocodePreferred(
  q: string,
  numero: string,
  photonCtx: { endereco: string; numero: string; bairro: string; cidade: string; estado: string; cep?: string } | null
): Promise<{ lat: string; lng: string; label: string } | null> {
  const nom = await fetchNominatimForward(
    q,
    numero,
    photonCtx
      ? {
          endereco: photonCtx.endereco,
          bairro: photonCtx.bairro,
          cidade: photonCtx.cidade,
          estado: photonCtx.estado,
          cep: photonCtx.cep,
        }
      : undefined
  );
  const want = normalizeHouseNumberToken(numero);
  if (!want || !photonCtx) {
    return nom ? { lat: nom.lat, lng: nom.lng, label: nom.label } : null;
  }
  const ph = await geocodePhotonBest(photonCtx);
  if (!ph) return nom ? { lat: nom.lat, lng: nom.lng, label: nom.label } : null;
  if (!nom) return { lat: ph.lat, lng: ph.lng, label: ph.label };
  if (ph.houseMatch) return { lat: ph.lat, lng: ph.lng, label: ph.label };

  const dist = haversineM(nom.lat, nom.lng, ph.lat, ph.lng);
  const nomWeak = nom.score < 30;
  if (dist > 40 && nomWeak) return { lat: ph.lat, lng: ph.lng, label: ph.label };
  if (nom.score < 14) return { lat: ph.lat, lng: ph.lng, label: ph.label };
  return { lat: nom.lat, lng: nom.lng, label: nom.label };
}

function FieldIcon({ kind }: { kind: "home" | "hash" | "pin" | "city" | "uf" | "cep" | "info" }) {
  const cls = "h-[16px] w-[16px] text-eid-primary-400";
  if (kind === "home") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M3 11.5L12 4l9 7.5" />
        <path d="M6 10.5V20h12v-9.5" />
      </svg>
    );
  }
  if (kind === "hash") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M9 3L7 21M17 3l-2 18M4 9h16M3 15h16" />
      </svg>
    );
  }
  if (kind === "pin") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.3" />
      </svg>
    );
  }
  if (kind === "city") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M3 21h18M5 21V7l6-3v17M11 21V11l8-3v13" />
      </svg>
    );
  }
  if (kind === "uf") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    );
  }
  if (kind === "cep") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 9l9 5 9-5" />
      </svg>
    );
  }
  if (kind === "info") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 10v6M12 7h.01" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

/** Miniatura gratuita (OpenStreetMap static map) + slot de logo do local. */
function EnderecoCardThumbnails({
  localLogoUrl,
  lat,
  lng,
}: {
  localLogoUrl?: string | null;
  lat: string;
  lng: string;
}) {
  const [mapFailed, setMapFailed] = useState(false);
  useEffect(() => {
    setMapFailed(false);
  }, [lat, lng]);

  const la = Number(lat);
  const ln = Number(lng);
  const hasCoords =
    Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180;
  const mapUrl = hasCoords
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${la},${ln}&zoom=16&size=128x128&markers=${la},${ln},red-pushpin`
    : null;

  return (
    <div className="flex shrink-0 gap-2">
      <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-eid-surface/60 ring-1 ring-white/10">
        {localLogoUrl ? (
          <img src={localLogoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#4285F4]/18 to-[#34A853]/12">
            <MapPinned className="h-7 w-7 text-[#8AB4F8]" strokeWidth={1.75} />
          </div>
        )}
      </div>
      <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-eid-surface/60 ring-1 ring-white/10">
        {mapUrl && !mapFailed ? (
          <img
            src={mapUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setMapFailed(true)}
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-eid-bg/40">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-eid-text-secondary/70"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden
            >
              <path d="M3 6.5h18v11H3z" />
              <path d="M3 10.5h18M9 6.5v11M15 9l-3 3M12 12l3 3" opacity=".55" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function InputWithIcon({
  icon,
  children,
  className = "",
}: {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex h-11 items-center gap-2.5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 transition ${className}`}>
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function EnderecoAssistFields({
  endereco,
  setEndereco,
  numero,
  setNumero,
  bairro,
  setBairro,
  cidade,
  setCidade,
  estado,
  setEstado,
  cep,
  setCep,
  complemento = "",
  setComplemento,
  lat = "",
  lng = "",
  onCoords,
  localLogoUrl = null,
  prefix = "",
  requiredComplemento = false,
}: Props) {
  const [cepBusy, setCepBusy] = useState(false);
  const [helperMsg, setHelperMsg] = useState<string | null>(null);
  const [flashMap, setFlashMap] = useState<Record<string, boolean>>({});
  const lastCepLookupRef = useRef<string>("");
  const onCoordsRef = useRef(onCoords);

  useEffect(() => {
    onCoordsRef.current = onCoords;
  }, [onCoords]);

  const query = useMemo(() => {
    return [endereco, numero, bairro, cidade, estado, cep]
      .map((p) => String(p ?? "").trim())
      .filter(Boolean)
      .join(", ");
  }, [endereco, numero, bairro, cidade, estado, cep]);

  const googleMapsHref = query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;

  const composedLabel = useMemo(() => {
    return [
      [endereco, numero].filter(Boolean).join(", "),
      bairro,
      [cidade, estado].filter(Boolean).join(" - "),
      cep,
    ]
      .map((v) => String(v ?? "").trim())
      .filter(Boolean)
      .join(" | ");
  }, [endereco, numero, bairro, cidade, estado, cep]);

  function flashFields(keys: string[]) {
    const next: Record<string, boolean> = {};
    for (const k of keys) next[k] = true;
    setFlashMap((prev) => ({ ...prev, ...next }));
    window.setTimeout(() => {
      setFlashMap((prev) => {
        const clone = { ...prev };
        for (const k of keys) delete clone[k];
        return clone;
      });
    }, 900);
  }

  async function fillByCep(rawCep?: string) {
    const cepDigits = onlyDigits(rawCep ?? cep);
    if (cepDigits.length !== 8) {
      setHelperMsg("Digite um CEP válido com 8 números.");
      return;
    }
    setCepBusy(true);
    setHelperMsg(null);
    try {
      const skipViaCep = lastCepLookupRef.current === cepDigits;
      let data: {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (!skipViaCep) {
        const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`, { cache: "no-store" });
        data = (await res.json()) as typeof data;
        if (data.erro) {
          setHelperMsg("CEP não encontrado.");
          return;
        }
        if (data.logradouro) setEndereco(data.logradouro);
        if (data.bairro) setBairro(data.bairro);
        if (data.localidade) setCidade(data.localidade);
        if (data.uf) setEstado(data.uf.toUpperCase());
        flashFields(["endereco", "bairro", "cidade", "estado"]);
        lastCepLookupRef.current = cepDigits;
      } else {
        // Mesmo CEP: não re-bate no ViaCEP, mas atualiza o mapa com os campos atuais (ex.: após trocar só o número).
        data = {
          logradouro: endereco,
          bairro,
          localidade: cidade,
          uf: estado,
        };
      }
      if (onCoordsRef.current) {
        const byCep = await fetchNominatimForward(`${cepDigits}, Brasil`, "", { cep: cepDigits });
        const qStreet =
          data.logradouro && data.localidade && data.uf
            ? [
                data.logradouro,
                data.bairro || bairro || "",
                data.localidade,
                data.uf,
                cepDigits,
                "Brasil",
              ]
                .map((v) => String(v ?? "").trim())
                .filter(Boolean)
                .join(", ")
            : "";
        const byStreet = qStreet
          ? await fetchNominatimForward(qStreet, "", {
              endereco: String(data.logradouro ?? "").trim(),
              bairro: String(data.bairro ?? bairro ?? "").trim(),
              cidade: String(data.localidade ?? "").trim(),
              estado: String(data.uf ?? "").trim(),
              cep: cepDigits,
            })
          : null;
        const qFallback = [
          data.logradouro ?? endereco,
          bairro || data.bairro || "",
          data.localidade || cidade,
          data.uf || estado,
          cepDigits,
        ]
          .map((v) => String(v ?? "").trim())
          .filter(Boolean)
          .join(", ");
        const byFallback = qFallback
          ? await fetchNominatimForward(`${qFallback}, Brasil`, "", {
              endereco: String(data.logradouro ?? endereco ?? "").trim(),
              bairro: String(data.bairro ?? bairro ?? "").trim(),
              cidade: String(data.localidade ?? cidade ?? "").trim(),
              estado: String(data.uf ?? estado ?? "").trim(),
              cep: cepDigits,
            })
          : null;
        const byAddress = byStreet ?? byCep ?? byFallback;
        if (byAddress) {
          const nLat = Number(byAddress.lat);
          const nLng = Number(byAddress.lng);
          if (Number.isFinite(nLat) && Number.isFinite(nLng)) {
            onCoordsRef.current(nLat.toFixed(6), nLng.toFixed(6));
          }
        }
      }
      setHelperMsg("Endereço preenchido pelo CEP. Confira o número.");
    } catch {
      setHelperMsg("Não foi possível consultar o CEP agora.");
    } finally {
      setCepBusy(false);
    }
  }

  async function refinePinFromCurrentAddress(reason: "debounce" | "blur" = "debounce") {
    if (!onCoordsRef.current) return;
    const enderecoTrim = String(endereco ?? "").trim();
    const numeroTrim = String(numero ?? "").trim();
    const cidadeTrim = String(cidade ?? "").trim();
    const estadoTrim = String(estado ?? "").trim();
    if (!enderecoTrim || !numeroTrim || !cidadeTrim || !estadoTrim) return;

    const bairroTrim = String(bairro ?? "").trim();
    const qNumFirst = [
      `${numeroTrim} ${enderecoTrim}`.trim(),
      bairroTrim,
      cidadeTrim,
      estadoTrim,
      onlyDigits(cep),
      "Brasil",
    ]
      .filter(Boolean)
      .join(", ");
    const qStreetFirst = [
      `${enderecoTrim}, ${numeroTrim}`,
      bairroTrim,
      cidadeTrim,
      estadoTrim,
      onlyDigits(cep),
      "Brasil",
    ]
      .filter(Boolean)
      .join(", ");
    const ctx = {
      endereco: enderecoTrim,
      numero: numeroTrim,
      bairro: bairroTrim,
      cidade: cidadeTrim,
      estado: estadoTrim,
      cep: onlyDigits(cep),
    };
    const result =
      (await forwardGeocodePreferred(qNumFirst, numeroTrim, ctx)) ??
      (await forwardGeocodePreferred(qStreetFirst, numeroTrim, ctx));

    if (!result) {
      if (reason === "blur") {
        setHelperMsg("Não encontramos coordenadas automáticas. Confira o endereço no Google Maps.");
      }
      return;
    }
    const nLat = Number(result.lat);
    const nLng = Number(result.lng);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return;
    onCoordsRef.current(nLat.toFixed(6), nLng.toFixed(6));
    setHelperMsg("Localização do endereço atualizada.");
  }

  useEffect(() => {
    const cepDigits = onlyDigits(cep);
    if (cepDigits.length !== 8) {
      lastCepLookupRef.current = "";
      return;
    }
    const t = window.setTimeout(() => {
      void fillByCep(cepDigits);
    }, 260);
    return () => window.clearTimeout(t);
  }, [cep]);

  useEffect(() => {
    if (!onCoordsRef.current) return;
    const enderecoTrim = String(endereco ?? "").trim();
    const numeroTrim = String(numero ?? "").trim();
    const cidadeTrim = String(cidade ?? "").trim();
    const estadoTrim = String(estado ?? "").trim();
    if (!enderecoTrim || !numeroTrim || !cidadeTrim || !estadoTrim) return;

    const t = window.setTimeout(() => {
      void refinePinFromCurrentAddress("debounce");
    }, 450);

    return () => window.clearTimeout(t);
  }, [endereco, numero, bairro, cidade, estado, cep]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex items-center gap-2 sm:col-span-2">
        <div className="w-full">
          <InputWithIcon
            icon={<FieldIcon kind="cep" />}
            className={flashMap.cep ? "ring-1 ring-eid-primary-500/50 bg-eid-primary-500/5" : ""}
          >
            <input
              name={`${prefix}cep`}
              value={cep}
              onChange={(e) => setCep(formatCep(e.target.value))}
              placeholder="CEP"
              className="h-full w-full border-0 bg-transparent text-sm text-eid-fg outline-none placeholder:text-eid-text-secondary"
            />
          </InputWithIcon>
        </div>
        <span className="text-[11px] font-semibold text-eid-text-secondary">
          {cepBusy ? "Buscando..." : "Auto"}
        </span>
      </div>
      <div className="sm:col-span-2">
        <InputWithIcon
          icon={<FieldIcon kind="home" />}
          className={flashMap.endereco ? "ring-1 ring-eid-primary-500/50 bg-eid-primary-500/5" : ""}
        >
          <input
            name={`${prefix}endereco`}
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Rua / Avenida"
            required
            className="h-full w-full border-0 bg-transparent text-sm text-eid-fg outline-none placeholder:text-eid-text-secondary"
          />
        </InputWithIcon>
      </div>
      <InputWithIcon
        icon={<FieldIcon kind="hash" />}
        className={flashMap.numero ? "ring-1 ring-eid-primary-500/50 bg-eid-primary-500/5" : ""}
      >
        <input
          name={`${prefix}numero`}
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          onBlur={() => {
            void refinePinFromCurrentAddress("blur");
          }}
          placeholder="Número"
          required
          className="h-full w-full border-0 bg-transparent text-sm text-eid-fg outline-none placeholder:text-eid-text-secondary"
        />
      </InputWithIcon>
      <InputWithIcon
        icon={<FieldIcon kind="pin" />}
        className={flashMap.bairro ? "ring-1 ring-eid-primary-500/50 bg-eid-primary-500/5" : ""}
      >
        <input
          name={`${prefix}bairro`}
          value={bairro}
          onChange={(e) => setBairro(e.target.value)}
          placeholder="Bairro"
          className="h-full w-full border-0 bg-transparent text-sm text-eid-fg outline-none placeholder:text-eid-text-secondary"
        />
      </InputWithIcon>
      <InputWithIcon
        icon={<FieldIcon kind="city" />}
        className={flashMap.cidade ? "ring-1 ring-eid-primary-500/50 bg-eid-primary-500/5" : ""}
      >
        <input
          name={`${prefix}cidade`}
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          placeholder="Cidade"
          required
          className="h-full w-full border-0 bg-transparent text-sm text-eid-fg outline-none placeholder:text-eid-text-secondary"
        />
      </InputWithIcon>
      <InputWithIcon
        icon={<FieldIcon kind="uf" />}
        className={flashMap.estado ? "ring-1 ring-eid-primary-500/50 bg-eid-primary-500/5" : ""}
      >
        <input
          name={`${prefix}estado`}
          value={estado}
          onChange={(e) => setEstado(e.target.value.toUpperCase())}
          placeholder="UF"
          required
          maxLength={2}
          className="h-full w-full border-0 bg-transparent text-sm text-eid-fg outline-none placeholder:text-eid-text-secondary"
        />
      </InputWithIcon>
      {setComplemento ? (
        <div className="sm:col-span-2">
          <InputWithIcon icon={<FieldIcon kind="info" />}>
            <input
              name={`${prefix}complemento`}
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              placeholder="Complemento (opcional)"
              required={requiredComplemento}
              className="h-full w-full border-0 bg-transparent text-sm text-eid-fg outline-none placeholder:text-eid-text-secondary"
            />
          </InputWithIcon>
        </div>
      ) : null}

      {onCoords ? (
        <div className="sm:col-span-2 space-y-3">
          <input type="hidden" name={`${prefix}lat`} value={lat} />
          <input type="hidden" name={`${prefix}lng`} value={lng} />
          {googleMapsHref ? (
            <a
              href={googleMapsHref}
              target="_blank"
              rel="noreferrer"
              className="group relative block overflow-hidden rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-md transition hover:border-[#4285F4]/40 hover:shadow-lg"
            >
              <span
                className="absolute inset-x-0 top-0 z-10 h-1 bg-[linear-gradient(90deg,#4285F4,#EA4335,#FBBC04,#34A853)]"
                aria-hidden
              />
              <span className="flex items-center gap-3 px-4 pb-3 pt-5">
                <EnderecoCardThumbnails localLogoUrl={localLogoUrl} lat={lat} lng={lng} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-eid-fg">
                    Abrir no Google Maps
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#8AB4F8] opacity-80 group-hover:opacity-100" aria-hidden />
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-eid-text-secondary">
                    {composedLabel || "Confira o endereço no mapa antes de enviar."}
                  </span>
                </span>
              </span>
              <p className="border-t border-[color:var(--eid-border-subtle)]/60 px-4 py-1.5 text-[8px] leading-tight text-eid-text-secondary/75">
                Miniatura do mapa: © OpenStreetMap e contribuidores.
              </p>
            </a>
          ) : null}
        </div>
      ) : null}

      {helperMsg ? <p className="sm:col-span-2 text-[11px] text-eid-text-secondary">{helperMsg}</p> : null}
    </div>
  );
}
