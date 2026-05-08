"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfileMainAction } from "@/app/editar/actions";

type Props = {
  initial: {
    nome: string;
    username: string;
    localizacao: string;
    alturaCm: number | null;
    pesoKg: number | null;
    lado: string | null;
  };
};

export function ProfileMainEditor({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [nome, setNome] = useState(initial.nome);
  const [username, setUsername] = useState(initial.username);
  const [localizacao, setLocalizacao] = useState(initial.localizacao);
  const [alturaCm, setAlturaCm] = useState(initial.alturaCm ? String(initial.alturaCm) : "");
  const [pesoKg, setPesoKg] = useState(initial.pesoKg ? String(initial.pesoKg) : "");
  const [lado, setLado] = useState(initial.lado ?? "");

  const [locGeoStatus, setLocGeoStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [locGeoError, setLocGeoError] = useState<string | null>(null);

  async function detectarLocalizacao() {
    setLocGeoError(null);
    if (!navigator.geolocation) {
      setLocGeoStatus("error");
      setLocGeoError("Seu navegador não suporta geolocalização.");
      return;
    }
    setLocGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: la, longitude: ln } = pos.coords;
        try {
          const r = await fetch(`/api/geocode/reverse?lat=${la}&lon=${ln}`);
          const d = (await r.json()) as {
            address?: { city?: string; town?: string; village?: string; state?: string };
          };
          const cidade = d.address?.city || d.address?.town || d.address?.village || "";
          const estado = d.address?.state || "";
          const v = cidade && estado ? `${cidade} - ${estado}` : cidade || estado || "";
          if (v) {
            setLocalizacao(v);
            setLocGeoStatus("ok");
          } else {
            setLocGeoStatus("error");
            setLocGeoError("Não conseguimos identificar sua cidade. Tente novamente.");
          }
        } catch {
          setLocGeoStatus("error");
          setLocGeoError("Falha ao obter localização. Verifique sua conexão.");
        }
      },
      (err) => {
        setLocGeoStatus("error");
        setLocGeoError(
          err.code === 1
            ? "Permissão negada. Habilite a localização nas configurações do navegador."
            : "Não foi possível obter a localização. Tente novamente."
        );
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
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
    <form onSubmit={onSubmit} className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/65 p-3 sm:p-4">
      <p className="mb-3 text-[11px] font-black uppercase tracking-[0.04em] text-eid-fg">Dados pessoais</p>
      {message ? (
        <p className="mb-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 py-2 text-xs text-eid-fg">
          {message}
        </p>
      ) : null}
      <div className="grid gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#98A2B3]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="8" r="3" />
            <path d="M6 18a6 6 0 0 1 12 0" />
          </svg>
          <input
            name="nome"
            required
            value={nome}
            onChange={(ev) => setNome(ev.target.value)}
            placeholder="Nome completo"
            className="h-10 w-full bg-transparent text-sm text-eid-fg placeholder:text-[#98A2B3] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
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
            className="h-10 w-full bg-transparent text-sm text-eid-fg placeholder:text-[#98A2B3] focus:outline-none"
          />
        </div>
        {/* Localização — somente leitura, atualizada via GPS */}
        <div>
          <div className={`flex h-10 items-center gap-2 rounded-xl border px-3 transition ${
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
              placeholder="Toque em Atualizar para detectar"
              className="h-full min-w-0 flex-1 cursor-default bg-transparent text-sm text-eid-fg placeholder:text-[#98A2B3] focus:outline-none"
            />
            <button
              type="button"
              onClick={detectarLocalizacao}
              disabled={locGeoStatus === "loading"}
              className="shrink-0 rounded-lg border border-eid-primary-500/30 bg-eid-primary-500/10 px-2 py-0.5 text-[10px] font-bold text-eid-primary-300 transition hover:border-eid-primary-500/55 hover:bg-eid-primary-500/18 disabled:opacity-50"
            >
              {locGeoStatus === "loading" ? "…" : locGeoStatus === "ok" ? "Atualizar" : "Detectar"}
            </button>
          </div>
          {locGeoError ? (
            <p className="mt-1 pl-1 text-[10px] text-amber-400">{locGeoError}</p>
          ) : locGeoStatus === "ok" && localizacao ? (
            <p className="mt-1 flex items-center gap-1 pl-1 text-[10px] text-emerald-400">
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M2 6l2.5 2.5 5.5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Localização atualizada
            </p>
          ) : (
            <p className="mt-1 pl-1 text-[10px] text-eid-text-muted">
              Clique em "Detectar" para preencher com sua cidade atual.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#98A2B3]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M7 4v16" />
              <path d="M11 7h3M11 11h2M11 15h3" />
              <path d="M7 4h3M7 20h3" />
            </svg>
            <input
              type="number"
              name="altura_cm"
              min={50}
              max={260}
              value={alturaCm}
              onChange={(ev) => setAlturaCm(ev.target.value)}
              placeholder="Altura (cm)"
              className="h-10 w-full bg-transparent text-sm text-eid-fg placeholder:text-[#98A2B3] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#98A2B3]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 8h12" />
              <path d="M8 8v8a4 4 0 0 0 8 0V8" />
              <path d="M10 12h4" />
            </svg>
            <input
              type="number"
              name="peso_kg"
              min={20}
              max={300}
              value={pesoKg}
              onChange={(ev) => setPesoKg(ev.target.value)}
              placeholder="Peso (kg)"
              className="h-10 w-full bg-transparent text-sm text-eid-fg placeholder:text-[#98A2B3] focus:outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#98A2B3]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 14c0-1.7 1.3-3 3-3h1V8.8A2.8 2.8 0 0 1 12.8 6h0A2.2 2.2 0 0 1 15 8.2V15" />
            <path d="M15 11h1.5a2.5 2.5 0 0 1 2.5 2.5V15" />
            <path d="M7 15v1a4 4 0 0 0 4 4h2.2a4.8 4.8 0 0 0 4.8-4.8V15" />
          </svg>
          <select
            name="lado"
            value={lado}
            onChange={(ev) => setLado(ev.target.value)}
            className="h-10 w-full bg-transparent text-sm text-eid-fg focus:outline-none [&>option]:bg-[#0b1220] [&>option]:text-white"
          >
            <option value="">Mão dominante</option>
            <option value="Destro">Destro</option>
            <option value="Canhoto">Canhoto</option>
            <option value="Ambos">Ambidestro</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={pending}
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

