"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfileMainAction } from "@/app/editar/actions";
import { useUsernameCheck } from "@/lib/hooks/use-username-check";
import {
  detectCurrentLocation,
  geolocationErrorMessage,
  isGeolocationPositionError,
} from "@/lib/location/current-location";

type Props = {
  userId: string;
  initial: {
    nome: string;
    username: string;
    localizacao: string;
    alturaCm: number | null;
    pesoKg: number | null;
    lado: string | null;
  };
};

export function ProfileMainEditor({ userId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [nome, setNome] = useState(initial.nome);
  /** Capitaliza a primeira letra de cada palavra, restante em minúsculas. */
  function formatarNome(raw: string): string {
    return raw.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }
  /** Normaliza medida numérica: troca ponto por vírgula, permite apenas dígitos e uma vírgula. */
  function formatarMedida(raw: string): string {
    const s = raw.replace(/\./g, ",").replace(/[^0-9,]/g, "");
    const idx = s.indexOf(",");
    if (idx === -1) return s;
    return s.slice(0, idx + 1) + s.slice(idx + 1).replace(/,/g, "");
  }
  /**
   * Normaliza altura no blur: converte metros → cm automaticamente.
   * Ex: "1,72" → "172" | "1.80" → "180" | "175,5" → "175" | "175" → "175"
   */
  function normalizarAltura(raw: string): string {
    const s = formatarMedida(raw);
    if (!s) return s;
    const num = parseFloat(s.replace(",", "."));
    if (isNaN(num) || num <= 0) return s;
    if (num >= 0.5 && num < 3) return String(Math.round(num * 100));
    if (num >= 50) return String(Math.floor(num));
    return s;
  }
  function alturaParaCm(raw: string): number {
    const num = parseFloat(raw.replace(",", "."));
    if (isNaN(num) || num <= 0) return NaN;
    if (num >= 0.5 && num < 3) return Math.round(num * 100);
    return Math.floor(num);
  }
  const [username, setUsername] = useState(initial.username);
  const usernameStatus = useUsernameCheck(username, "profiles", userId);
  const [localizacao, setLocalizacao] = useState(initial.localizacao);
  const [alturaCm, setAlturaCm] = useState(initial.alturaCm ? String(initial.alturaCm) : "");
  const [pesoKg, setPesoKg] = useState(initial.pesoKg ? String(initial.pesoKg) : "");
  const [lado, setLado] = useState(initial.lado ?? "");

  const [locGeoStatus, setLocGeoStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [locGeoError, setLocGeoError] = useState<string | null>(null);

  async function detectarLocalizacao() {
    setLocGeoError(null);
    setLocGeoStatus("loading");
    try {
      const result = await detectCurrentLocation();
      setLocalizacao(result.localizacao);
      setLocGeoStatus("ok");
    } catch (err) {
      setLocGeoStatus("error");
      setLocGeoError(
        isGeolocationPositionError(err)
          ? geolocationErrorMessage(err)
          : err instanceof Error
            ? err.message
            : "Não foi possível obter a localização. Tente novamente."
      );
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Normaliza medidas para o servidor (converte metros→cm se necessário)
    const alturaRawFd = String(fd.get("altura_cm") ?? "").trim();
    if (alturaRawFd) {
      const alturaNum = alturaParaCm(alturaRawFd);
      fd.set("altura_cm", isNaN(alturaNum) ? alturaRawFd.replace(",", ".") : String(alturaNum));
    }
    const pesoVal = String(fd.get("peso_kg") ?? "").trim();
    if (pesoVal) fd.set("peso_kg", pesoVal.replace(",", "."));
    startTransition(async () => {
      const res = await saveProfileMainAction(fd);
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setMessage("Perfil atualizado com sucesso.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="w-full overflow-hidden">
      {message ? (
        <p className="mb-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 py-2 text-xs text-eid-fg">
          {message}
        </p>
      ) : null}
      <div className="grid w-full gap-2.5">
        {/* Nome */}
        <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#98A2B3]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="8" r="3" />
            <path d="M6 18a6 6 0 0 1 12 0" />
          </svg>
          <input
            name="nome"
            required
            value={nome}
            onChange={(ev) => setNome(formatarNome(ev.target.value))}
            placeholder="Nome completo"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-eid-fg placeholder:text-[#98A2B3] focus:outline-none"
          />
        </div>

        {/* Username */}
        <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#98A2B3]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="8" />
            <path d="M9.8 9.8h4.4" />
            <path d="M8.5 14.8c.8-1.6 2-2.4 3.5-2.4s2.7.8 3.5 2.4" />
          </svg>
          <input
            name="username"
            value={username}
            onChange={(ev) =>
              setUsername(
                ev.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_]/g, "")
                  .slice(0, 24)
              )
            }
            placeholder="@usuario"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-eid-fg placeholder:text-[#98A2B3] focus:outline-none"
          />
        </div>
        {username.trim() ? (
          <div className="flex items-center gap-1.5 px-1 text-[11px]">
            {usernameStatus === "checking" && (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#98A2B3] border-t-transparent" />
                <span className="text-[#98A2B3]">Verificando...</span>
              </>
            )}
            {usernameStatus === "available" && (
              <>
                <svg className="h-3.5 w-3.5 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M5 13l4 4L19 7" /></svg>
                <span className="text-emerald-400">@{username.trim()} disponível</span>
              </>
            )}
            {usernameStatus === "taken" && (
              <>
                <svg className="h-3.5 w-3.5 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
                <span className="text-amber-400">@{username.trim()} já está em uso — escolha outro</span>
              </>
            )}
            {(usernameStatus === "invalid" || usernameStatus === "idle") && (
              <span className="text-[#98A2B3]">3–24 chars: a-z, 0-9 e _</span>
            )}
          </div>
        ) : null}

        {/* Localização — somente leitura, atualizada via GPS */}
        <div className="min-w-0">
          <div className={`flex h-10 min-w-0 items-center gap-2 overflow-hidden rounded-xl border px-3 transition ${
            locGeoStatus === "ok"
              ? "border-emerald-500/35 bg-emerald-500/6"
              : "border-[color:var(--eid-border-subtle)] bg-eid-card"
          }`}>
            {locGeoStatus === "loading" ? (
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-eid-primary-400 border-t-transparent" />
            ) : locGeoStatus === "ok" ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#98A2B3]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" />
              </svg>
            )}
            <input
              name="localizacao"
              required
              readOnly
              value={localizacao}
              placeholder="Localização não detectada"
              className="h-full min-w-0 flex-1 cursor-default truncate bg-transparent text-sm text-eid-fg placeholder:text-[#98A2B3] focus:outline-none"
            />
          </div>
          {/* Botão + feedback em linha abaixo do input */}
          <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[10px] text-eid-text-muted">
              {locGeoError
                ? <span className="text-amber-400">{locGeoError}</span>
                : locGeoStatus === "ok" && localizacao
                ? <span className="flex items-center gap-1 text-emerald-400">
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M2 6l2.5 2.5 5.5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Localização atualizada
                  </span>
                : "Toque em Detectar para preencher"
              }
            </p>
            <button
              type="button"
              onClick={detectarLocalizacao}
              disabled={locGeoStatus === "loading"}
              className="shrink-0 rounded-lg border border-eid-primary-500/30 bg-eid-primary-500/10 px-2.5 py-1 text-[10px] font-bold text-eid-primary-300 transition hover:border-eid-primary-500/55 hover:bg-eid-primary-500/18 disabled:opacity-50"
            >
              {locGeoStatus === "loading" ? "…" : locGeoStatus === "ok" ? "Atualizar" : "Detectar"}
            </button>
          </div>
        </div>

        {/* Altura e Peso */}
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#98A2B3]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M7 4v16" />
              <path d="M11 7h3M11 11h2M11 15h3" />
              <path d="M7 4h3M7 20h3" />
            </svg>
            <input
              type="text"
              inputMode="decimal"
              name="altura_cm"
              value={alturaCm}
              onChange={(ev) => setAlturaCm(formatarMedida(ev.target.value))}
              onBlur={(ev) => setAlturaCm(normalizarAltura(ev.target.value))}
              placeholder="Altura cm"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-eid-fg placeholder:text-[#98A2B3] focus:outline-none"
            />
          </div>
          <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#98A2B3]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 8h12" />
              <path d="M8 8v8a4 4 0 0 0 8 0V8" />
              <path d="M10 12h4" />
            </svg>
            <input
              type="text"
              inputMode="decimal"
              name="peso_kg"
              value={pesoKg}
              onChange={(ev) => setPesoKg(formatarMedida(ev.target.value))}
              placeholder="Peso kg"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-eid-fg placeholder:text-[#98A2B3] focus:outline-none"
            />
          </div>
        </div>

        {/* Mão dominante */}
        <div className="relative flex min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#98A2B3]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 14c0-1.7 1.3-3 3-3h1V8.8A2.8 2.8 0 0 1 12.8 6h0A2.2 2.2 0 0 1 15 8.2V15" />
            <path d="M15 11h1.5a2.5 2.5 0 0 1 2.5 2.5V15" />
            <path d="M7 15v1a4 4 0 0 0 4 4h2.2a4.8 4.8 0 0 0 4.8-4.8V15" />
          </svg>
          <select
            name="lado"
            value={lado}
            onChange={(ev) => setLado(ev.target.value)}
            style={{ backgroundColor: "transparent", color: lado === "" ? "var(--eid-text-muted)" : "var(--eid-fg)" }}
            className="h-10 min-w-0 flex-1 appearance-none pr-6 text-sm focus:outline-none [&>option]:bg-[#0b1220] [&>option]:text-white"
          >
            <option value="">Mão dominante</option>
            <option value="Destro">Destro</option>
            <option value="Canhoto">Canhoto</option>
            <option value="Ambos">Ambidestro</option>
          </select>
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 h-3.5 w-3.5 shrink-0 text-[#98A2B3]" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={pending || usernameStatus === "taken"}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-[#1D4ED8] bg-[linear-gradient(135deg,#2563EB,#1D4ED8)] px-5 text-[12px] font-black uppercase tracking-[0.04em] text-white shadow-[0_10px_22px_-14px_rgba(37,99,235,0.8)] transition hover:brightness-105 disabled:opacity-60"
        >
          {pending ? (
            <>
              <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="8" className="opacity-30" />
                <path d="M20 12a8 8 0 0 0-8-8" strokeLinecap="round" />
              </svg>
              <span className="animate-pulse">Salvando...</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="m5 12 4 4 10-10" />
              </svg>
              Salvar alterações
            </>
          )}
        </button>
      </div>
    </form>
  );
}

