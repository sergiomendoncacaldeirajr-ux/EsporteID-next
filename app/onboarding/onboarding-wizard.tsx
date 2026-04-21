"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogoFull } from "@/components/brand/logo-full";
import {
  esporteModoTemAtleta,
  esporteModoTemProfessor,
  type ProfessorModoEsportivo,
  type ProfessorObjetivoPlataforma,
  type ProfessorTipoAtuacao,
} from "@/lib/professor/constants";
import { normalizarPapeisContaPrincipal } from "@/lib/roles";
import type { MatchModality } from "@/lib/onboarding/modalidades-match";
import { sortModalidadesMatch } from "@/lib/onboarding/modalidades-match";

/* ── Seletor de localização via GPS ────────────────────────────────── */
function LocationPicker({
  latName,
  lngName,
  lat,
  lng,
  onCapture,
}: {
  latName: string;
  lngName: string;
  lat: string;
  lng: string;
  onCapture: (lat: string, lng: string) => void;
}) {
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [gpsError, setGpsError] = useState("");
  const [showManual, setShowManual] = useState(false);

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      setGpsError("Seu navegador não suporta geolocalização.");
      return;
    }
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onCapture(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6));
        setGpsStatus("ok");
        setShowManual(false);
      },
      (err) => {
        setGpsStatus("error");
        setGpsError(
          err.code === 1
            ? "Permissão negada. Habilite a localização no navegador."
            : "Não foi possível obter a localização. Tente novamente.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function clear() {
    onCapture("", "");
    setGpsStatus("idle");
    setGpsError("");
  }

  const hasCoords = !!lat && !!lng;

  return (
    <div className="sm:col-span-2 space-y-2">
      <input type="hidden" name={latName} value={lat} />
      <input type="hidden" name={lngName} value={lng} />

      {/* Coordenadas capturadas */}
      {hasCoords && !showManual && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-3 py-2">
          <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-emerald-400" fill="none">
            <circle cx="8" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 2C5.24 2 3 4.24 3 7c0 3.5 5 7 5 7s5-3.5 5-7c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-emerald-400">Localização definida</p>
            <p className="font-mono text-[10px] text-eid-text-secondary">{lat}, {lng}</p>
          </div>
          <button type="button" onClick={clear}
            className="ml-1 rounded-md p-1 text-eid-text-secondary hover:text-eid-fg transition-colors">
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Botões de ação (sempre visíveis enquanto não há coords) */}
      {!hasCoords && (
        <div className="flex flex-wrap items-center gap-2">
          {/* GPS — para quem está fisicamente no local */}
          <button
            type="button"
            onClick={captureGps}
            disabled={gpsStatus === "loading"}
            className="flex items-center gap-1.5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-2 text-xs font-semibold text-eid-fg transition hover:border-eid-primary-500/40 hover:bg-eid-primary-500/5 disabled:opacity-60"
          >
            {gpsStatus === "loading" ? (
              <svg className="h-3.5 w-3.5 animate-spin text-eid-primary-400" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10"/>
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-eid-primary-400" fill="none">
                <circle cx="8" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 1v1.5M8 12.5V14M1 7h1.5M12.5 7H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 2C5.24 2 3 4.24 3 7c0 3.5 5 7 5 7s5-3.5 5-7c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.4"/>
              </svg>
            )}
            {gpsStatus === "loading" ? "Obtendo localização…" : "Estou no local agora"}
          </button>

          {/* Toggle manual */}
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="text-[11px] text-eid-text-secondary underline-offset-2 hover:text-eid-fg hover:underline transition-colors"
          >
            {showManual ? "Cancelar" : "Inserir coordenadas manualmente"}
          </button>
        </div>
      )}

      {/* Inputs manuais */}
      {showManual && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-eid-text-secondary">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => onCapture(e.target.value, lng)}
              placeholder="-23.550520"
              className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm font-mono text-eid-fg"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-eid-text-secondary">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => onCapture(lat, e.target.value)}
              placeholder="-46.633308"
              className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm font-mono text-eid-fg"
            />
          </div>
          <p className="col-span-2 text-[10px] text-eid-text-secondary">
            Você pode copiar as coordenadas do Google Maps clicando com o botão direito no local.
          </p>
        </div>
      )}

      {/* Erros de GPS */}
      {gpsStatus === "error" && (
        <p className="text-[11px] text-red-400">{gpsError}</p>
      )}

      {/* Hint — apenas quando não tem coords */}
      {!hasCoords && !showManual && (
        <p className="text-[10px] text-eid-text-secondary">
          Opcional — permite exibir o local no mapa para outros usuários.
        </p>
      )}

      {/* Botão de redefinir quando tem coords */}
      {hasCoords && !showManual && (
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="text-[11px] text-eid-text-secondary underline-offset-2 hover:text-eid-fg hover:underline transition-colors"
        >
          Editar manualmente
        </button>
      )}
    </div>
  );
}

/* ── Seletor de disponibilidade semanal ─────────────────────────────── */
const DIAS = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" },
  { key: "dom", label: "Dom" },
] as const;

const TURNOS = [
  { key: "manhã",    label: "Manhã" },
  { key: "tarde",    label: "Tarde" },
  { key: "noite",    label: "Noite" },
  { key: "qualquer", label: "Qualquer" },
] as const;

type DiaKey  = (typeof DIAS)[number]["key"];
type TurnoKey = (typeof TURNOS)[number]["key"];

function DisponibilidadePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (json: string) => void;
}) {
  const parsed = useMemo<Partial<Record<DiaKey, TurnoKey>>>(() => {
    try { return JSON.parse(value || "{}"); } catch { return {}; }
  }, [value]);

  function toggleDia(dia: DiaKey) {
    const next = { ...parsed };
    if (next[dia]) {
      delete next[dia];
    } else {
      next[dia] = "qualquer";
    }
    onChange(JSON.stringify(next));
  }

  function setTurno(dia: DiaKey, turno: TurnoKey) {
    const next = { ...parsed, [dia]: turno };
    onChange(JSON.stringify(next));
  }

  const selecionados = DIAS.filter((d) => parsed[d.key]);

  return (
    <div className="space-y-3">
      {/* Dias da semana */}
      <div className="flex flex-wrap gap-1.5">
        {DIAS.map(({ key, label }) => {
          const active = !!parsed[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleDia(key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all select-none ${
                active
                  ? "bg-eid-primary-500 text-white shadow-sm"
                  : "border border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:border-eid-primary-500/40 hover:text-eid-fg"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Turnos para cada dia selecionado */}
      {selecionados.length > 0 && (
        <div className="space-y-1.5">
          {selecionados.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-7 text-[11px] font-bold text-eid-fg">{label}</span>
              <div className="inline-flex gap-1">
                {TURNOS.map(({ key: tKey, label: tLabel }) => {
                  const active = parsed[key] === tKey;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => setTurno(key, tKey)}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all select-none ${
                        active
                          ? "bg-eid-action-500 text-white"
                          : "border border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:text-eid-fg"
                      }`}
                    >
                      {tLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selecionados.length === 0 && (
        <p className="text-[11px] text-eid-text-secondary">
          Selecione os dias em que você costuma estar disponível.
        </p>
      )}
    </div>
  );
}


function EidFilePicker({
  name,
  accept,
  label = "Selecionar arquivo",
  hint,
}: {
  name: string;
  accept?: string;
  label?: string;
  hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");

  return (
    <div>
      {hint && <p className="mb-1.5 text-[11px] text-eid-text-secondary">{hint}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex items-center gap-1.5 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-1.5 text-xs font-semibold text-eid-fg transition hover:border-eid-primary-500/40 hover:bg-eid-primary-500/5"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-eid-text-secondary" fill="none">
            <path d="M8 2v8M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          {label}
        </button>
        {fileName && (
          <span className="truncate text-[11px] text-eid-text-secondary max-w-[180px]">{fileName}</span>
        )}
        {!fileName && (
          <span className="text-[11px] text-eid-text-secondary/50">Nenhum arquivo escolhido</span>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        name={name}
        accept={accept}
        className="hidden"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
      />
    </div>
  );
}

/* ── Dropdown customizado estilo nativo ─────────────────────────────── */
function EidSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione…",
  name,
  className = "",
}: {
  value: string | number;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
  placeholder?: string;
  name?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
          open
            ? "border-eid-primary-500/60 bg-eid-card shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
            : "border-[color:var(--eid-border-subtle)] bg-eid-card hover:border-eid-primary-500/40"
        }`}
      >
        <span className={selected ? "text-eid-fg" : "text-eid-text-secondary"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          viewBox="0 0 16 16"
          className={`h-4 w-4 shrink-0 text-eid-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
          <div className="max-h-52 overflow-y-auto py-1">
            {options.map((opt) => {
              const active = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(String(opt.value)); setOpen(false); }}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-eid-primary-500/10 text-eid-primary-400 font-semibold"
                      : "text-eid-fg hover:bg-eid-primary-500/6"
                  }`}
                >
                  {opt.label}
                  {active && (
                    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 shrink-0" fill="none">
                      <path d="M2 6l3 3 5-5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
import {
  salvarPapeisOnboarding,
  salvarEsportesOnboarding,
  salvarExtrasOnboarding,
  salvarPerfilOnboarding,
  type OnboardingActionResult,
} from "./actions";

const ONBOARDING_DRAFT_KEY_PREFIX = "eid_onboarding_draft_v1";

const ROLES = [
  {
    id: "atleta",
    titulo: "Atleta / Usuário",
    desc: "Perfil com painel esportivo, ranking, match e desafios.",
    enabled: true,
  },
  {
    id: "professor",
    titulo: "Professor / Técnico",
    desc: "Acompanha alunos e pode aparecer no ecossistema como referência.",
    enabled: false,
  },
  {
    id: "organizador",
    titulo: "Organizador de torneios",
    desc: "Cria e gerencia eventos (liberado conforme as regras do app).",
    enabled: false,
  },
  {
    id: "espaco",
    titulo: "Dono de espaço / arena",
    desc: "Quadra, campo, piscina, clube — cadastra o local e os esportes atendidos.",
    enabled: false,
  },
] as const;

const ESTRUTURAS = [
  { id: "quadra", label: "Quadra" },
  { id: "campo", label: "Campo" },
  { id: "piscina", label: "Piscina" },
  { id: "sala", label: "Sala / indoor" },
  { id: "estadio", label: "Estádio" },
] as const;

type Step = "papeis" | "esportes" | "extras" | "perfil";
type SportExpAprox = "menos_1" | "1_3" | "mais_3";

function parseSportExpValue(rawValue: unknown): string {
  const raw = String(rawValue ?? "").trim();
  if (raw === "menos_1" || raw === "1_3" || raw === "mais_3") return raw;
  if (raw === "Menos de 1 ano") return "menos_1";
  if (raw === "1 a 3 anos") return "1_3";
  if (raw === "Mais de 3 anos") return "mais_3";
  const m = raw.match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  const month = Number(m[1]);
  const year = Number(m[2]);
  if (!Number.isInteger(month) || month < 1 || month > 12) return "";
  if (!Number.isInteger(year) || year < 1970 || year > 2100) return "";
  return `${String(month).padStart(2, "0")}/${year}`;
}

function isSportExpAprox(value: string): value is SportExpAprox {
  return value === "menos_1" || value === "1_3" || value === "mais_3";
}

function toMonthInputValue(expValue: string): string {
  const m = expValue.match(/^(\d{2})\/(\d{4})$/);
  if (!m) return "";
  return `${m[2]}-${m[1]}`;
}

function fromMonthInputValue(inputValue: string): string {
  const m = inputValue.match(/^(\d{4})-(\d{2})$/);
  if (!m) return "";
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isInteger(month) || month < 1 || month > 12) return "";
  if (!Number.isInteger(year) || year < 1970 || year > 2100) return "";
  return `${String(month).padStart(2, "0")}/${year}`;
}

function formatSportExpLabel(expValue: string): string {
  if (expValue === "menos_1") return "Menos de 1 ano";
  if (expValue === "1_3") return "1 a 3 anos";
  if (expValue === "mais_3") return "Mais de 3 anos";
  const m = expValue.match(/^(\d{2})\/(\d{4})$/);
  if (m) return `${m[1]}/${m[2]}`;
  return "Não definido";
}

type Props = {
  userId: string;
  primeiroNome: string;
  initialStep: Step;
  esportes: {
    id: number;
    nome: string;
    permiteIndividual: boolean;
    permiteDupla: boolean;
    permiteTime: boolean;
  }[];
  locais: { id: number; nome: string; localizacao: string; donoUsuarioId: string | null }[];
  selectedPapeis: string[];
  selectedEsportes: number[];
  selectedEsportesInteresse: Record<number, "ranking" | "ranking_e_amistoso" | "amistoso">;
  selectedEsportesModalidades: Record<number, MatchModality[]>;
  selectedSportModes: Record<number, ProfessorModoEsportivo>;
  selectedProfessorObjetivos: Record<number, ProfessorObjetivoPlataforma>;
  selectedProfessorTipos: Record<number, ProfessorTipoAtuacao[]>;
  selectedProfessorExp: Record<number, string>;
  extrasInitial: {
    expModo: "aprox" | "exato";
    expAprox: "menos_1" | "1_3" | "mais_3";
    expMes: number | null;
    expAno: number | null;
    professorHeadline: string;
    professorBio: string;
    professorCertificacoes: string;
    professorPublicoAlvo: string;
    professorFormatoAula: string;
    professorPoliticaCancelamento: string;
    professorAceitaNovosAlunos: boolean;
    professorPerfilPublicado: boolean;
    orgEsporteId: number | null;
    orgEsportesIds: number[];
    orgLocalModo: "existente" | "novo";
    orgLocalId: number | null;
    orgLocalMsg: string;
    espacoNome: string;
    espacoEsportes: number[];
    estruturas: string[];
    reservaModelo: "livre" | "socios" | "pago" | "misto";
    reservaNotas: string;
    espacoEndereco: string;
    espacoNumero: string;
    espacoBairro: string;
    espacoCidade: string;
    espacoEstado: string;
    espacoCep: string;
    espacoComplemento: string;
  };
  profileInitial: {
    nome: string;
    username: string;
    localizacao: string;
    alturaCm: number | null;
    pesoKg: number | null;
    lado: string | null;
    avatarUrl: string | null;
    bio: string;
    estiloJogo: string;
    disponibilidadeSemanaJson: string;
  };
};

export function OnboardingWizard({
  userId,
  primeiroNome,
  initialStep,
  esportes,
  locais,
  selectedPapeis,
  selectedEsportes,
  selectedEsportesInteresse,
  selectedEsportesModalidades,
  selectedSportModes,
  selectedProfessorObjetivos,
  selectedProfessorTipos,
  selectedProfessorExp,
  extrasInitial,
  profileInitial,
}: Props) {
  const draftKey = `${ONBOARDING_DRAFT_KEY_PREFIX}:${userId}`;
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialStep);
  const [message, setMessage] = useState<string | null>(null);
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [papeis, setPapeis] = useState<Set<string>>(
    new Set(normalizarPapeisContaPrincipal(selectedPapeis))
  );
  const [esportesSel, setEsportesSel] = useState<Set<number>>(new Set(selectedEsportes));
  const [esportesInteresse, setEsportesInteresse] = useState<Record<number, "ranking" | "ranking_e_amistoso" | "amistoso">>(
    selectedEsportesInteresse
  );
  const [esportesModalidades, setEsportesModalidades] = useState<Record<number, MatchModality[]>>(
    selectedEsportesModalidades
  );
  const [esporteModes, setEsporteModes] = useState<Record<number, ProfessorModoEsportivo>>(selectedSportModes);
  const [professorObjetivos, setProfessorObjetivos] =
    useState<Record<number, ProfessorObjetivoPlataforma>>(selectedProfessorObjetivos);
  const [professorTipos, setProfessorTipos] =
    useState<Record<number, ProfessorTipoAtuacao[]>>(selectedProfessorTipos);
  const [expModo, setExpModo] = useState<"aprox" | "exato">(extrasInitial.expModo);
  const [expAprox, setExpAprox] = useState<"menos_1" | "1_3" | "mais_3">(extrasInitial.expAprox);
  const [expMes, setExpMes] = useState<string>(extrasInitial.expMes ? String(extrasInitial.expMes) : "");
  const [expAno, setExpAno] = useState<string>(extrasInitial.expAno ? String(extrasInitial.expAno) : "");
  const [esportesExp, setEsportesExp] = useState<Record<number, string>>(
    () =>
      Object.fromEntries(
        Object.entries(selectedProfessorExp)
          .map(([id, val]) => [Number(id), parseSportExpValue(val)] as const)
          .filter(([, val]) => Boolean(val))
      )
  );
  const [professorHeadline, setProfessorHeadline] = useState<string>(extrasInitial.professorHeadline);
  const [professorBio, setProfessorBio] = useState<string>(extrasInitial.professorBio);
  const [professorCertificacoes, setProfessorCertificacoes] = useState<string>(extrasInitial.professorCertificacoes);
  const [professorPublicoAlvo, setProfessorPublicoAlvo] = useState<string>(extrasInitial.professorPublicoAlvo);
  const [professorFormatoAula, setProfessorFormatoAula] = useState<string>(extrasInitial.professorFormatoAula);
  const [professorPoliticaCancelamento, setProfessorPoliticaCancelamento] =
    useState<string>(extrasInitial.professorPoliticaCancelamento);
  const [professorAceitaNovosAlunos, setProfessorAceitaNovosAlunos] =
    useState<boolean>(extrasInitial.professorAceitaNovosAlunos);
  const [professorPerfilPublicado, setProfessorPerfilPublicado] =
    useState<boolean>(extrasInitial.professorPerfilPublicado);
  const [orgEsporteId, setOrgEsporteId] = useState<string>(
    extrasInitial.orgEsporteId ? String(extrasInitial.orgEsporteId) : "0"
  );
  const [orgEsportes, setOrgEsportes] = useState<Set<number>>(new Set(extrasInitial.orgEsportesIds));
  const [orgLocalModo, setOrgLocalModo] = useState<"existente" | "novo">(extrasInitial.orgLocalModo);
  const [orgLocalId, setOrgLocalId] = useState<string>(extrasInitial.orgLocalId ? String(extrasInitial.orgLocalId) : "0");
  const [orgLocalMsg, setOrgLocalMsg] = useState<string>(extrasInitial.orgLocalMsg);
  const [orgNovoLocalNome, setOrgNovoLocalNome] = useState<string>("");
  const [orgNovoLocalEndereco, setOrgNovoLocalEndereco] = useState<string>("");
  const [orgNovoLocalCidade, setOrgNovoLocalCidade] = useState<string>("");
  const [orgNovoLocalEstado, setOrgNovoLocalEstado] = useState<string>("");
  const [orgNovoLocalCep, setOrgNovoLocalCep] = useState<string>("");
  const [orgNovoLocalLat, setOrgNovoLocalLat] = useState<string>("");
  const [orgNovoLocalLng, setOrgNovoLocalLng] = useState<string>("");
  const [espacoNome, setEspacoNome] = useState<string>(extrasInitial.espacoNome);
  const [espacoEsportes, setEspacoEsportes] = useState<Set<number>>(new Set(extrasInitial.espacoEsportes));
  const [estruturas, setEstruturas] = useState<Set<string>>(new Set(extrasInitial.estruturas));
  const [reservaModelo, setReservaModelo] = useState<"livre" | "socios" | "pago" | "misto">(
    extrasInitial.reservaModelo
  );
  const [reservaNotas, setReservaNotas] = useState<string>(extrasInitial.reservaNotas);
  const [espacoEndereco, setEspacoEndereco] = useState<string>(extrasInitial.espacoEndereco);
  const [espacoNumero, setEspacoNumero] = useState<string>(extrasInitial.espacoNumero);
  const [espacoBairro, setEspacoBairro] = useState<string>(extrasInitial.espacoBairro);
  const [espacoCidade, setEspacoCidade] = useState<string>(extrasInitial.espacoCidade);
  const [espacoEstado, setEspacoEstado] = useState<string>(extrasInitial.espacoEstado);
  const [espacoCep, setEspacoCep] = useState<string>(extrasInitial.espacoCep);
  const [espacoComplemento, setEspacoComplemento] = useState<string>(extrasInitial.espacoComplemento);
  const [espacoLat, setEspacoLat] = useState<string>("");
  const [espacoLng, setEspacoLng] = useState<string>("");
  const [nome, setNome] = useState<string>(profileInitial.nome);
  const [username, setUsername] = useState<string>(profileInitial.username);
  const [localizacao, setLocalizacao] = useState<string>(profileInitial.localizacao);
  const [alturaCm, setAlturaCm] = useState<string>(
    profileInitial.alturaCm ? String(profileInitial.alturaCm) : ""
  );
  const [pesoKg, setPesoKg] = useState<string>(
    profileInitial.pesoKg ? String(profileInitial.pesoKg) : ""
  );
  const [lado, setLado] = useState<string>(profileInitial.lado ?? "");
  const [bio, setBio] = useState<string>(profileInitial.bio);
  const [estiloJogo, setEstiloJogo] = useState<string>(profileInitial.estiloJogo);
  const [disponibilidadeSemanaJson, setDisponibilidadeSemanaJson] = useState<string>(
    profileInitial.disponibilidadeSemanaJson || "{}"
  );
  const fotoInputRef = useRef<HTMLInputElement | null>(null);
  const fotoCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fotoGaleriaInputRef = useRef<HTMLInputElement | null>(null);
  const topAnchorRef = useRef<HTMLDivElement | null>(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);
  const [fotoPosX, setFotoPosX] = useState<number>(50);
  const [fotoPosY, setFotoPosY] = useState<number>(50);
  const [fotoZoom, setFotoZoom] = useState<number>(1);
  const [fotoSelecionadaNome, setFotoSelecionadaNome] = useState<string | null>(null);
  const didHydrateFromServerRef = useRef(false);
  const forceResetKey = `${draftKey}:force_reset`;

  useEffect(() => {
    if (didHydrateFromServerRef.current) return;
    setStep(initialStep);
    didHydrateFromServerRef.current = true;
  }, [initialStep]);

  useLayoutEffect(() => {
    const scrollTopHard = () => {
      topAnchorRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.body.scrollTo({ top: 0, left: 0, behavior: "auto" });
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      const main = document.getElementById("app-main-column");
      if (main) main.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };
    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    scrollTopHard();
    const raf1 = window.requestAnimationFrame(() => scrollTopHard());
    const raf2 = window.requestAnimationFrame(() => scrollTopHard());
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      root.style.scrollBehavior = prevBehavior;
    };
  }, [step]);

  useEffect(() => {
    setPapeis(new Set(normalizarPapeisContaPrincipal(selectedPapeis)));
  }, [selectedPapeis]);

  useEffect(() => {
    setEsportesSel(new Set(selectedEsportes));
  }, [selectedEsportes]);

  useEffect(() => {
    setEsportesInteresse(selectedEsportesInteresse);
  }, [selectedEsportesInteresse]);

  useEffect(() => {
    setEsportesModalidades(selectedEsportesModalidades);
  }, [selectedEsportesModalidades]);

  useEffect(() => {
    setEsporteModes(selectedSportModes);
  }, [selectedSportModes]);

  useEffect(() => {
    setProfessorObjetivos(selectedProfessorObjetivos);
  }, [selectedProfessorObjetivos]);

  useEffect(() => {
    setProfessorTipos(selectedProfessorTipos);
  }, [selectedProfessorTipos]);

  useEffect(() => {
    try {
      const forceReset = window.localStorage.getItem(forceResetKey) === "1";
      if (forceReset) {
        window.localStorage.setItem(
          draftKey,
          JSON.stringify({
            step: "papeis" as Step,
            papeis: [] as string[],
            esportesSel: [] as number[],
            esportesInteresse: {} as Record<number, "ranking" | "ranking_e_amistoso" | "amistoso">,
            esportesModalidades: {} as Record<number, MatchModality[]>,
            esporteModes: {} as Record<number, ProfessorModoEsportivo>,
            professorObjetivos: {} as Record<number, ProfessorObjetivoPlataforma>,
            professorTipos: {} as Record<number, ProfessorTipoAtuacao[]>,
            esportesExp: {} as Record<number, string>,
            espacoLat: "",
            espacoLng: "",
          })
        );
        window.localStorage.removeItem(forceResetKey);
      }
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<{
        step: Step;
        papeis: string[];
        esportesSel: number[];
        esportesInteresse: Record<number, "ranking" | "ranking_e_amistoso" | "amistoso">;
        esportesModalidades?: Record<number, MatchModality[]>;
        esportesModalidade?: Record<number, "individual" | "dupla" | "time">;
        esporteModes?: Record<number, ProfessorModoEsportivo>;
        professorObjetivos?: Record<number, ProfessorObjetivoPlataforma>;
        professorTipos?: Record<number, ProfessorTipoAtuacao[]>;
        expModo: "aprox" | "exato";
        expAprox: "menos_1" | "1_3" | "mais_3";
        expMes: string;
        expAno: string;
        professorHeadline: string;
        professorBio: string;
        professorCertificacoes: string;
        professorPublicoAlvo: string;
        professorFormatoAula: string;
        professorPoliticaCancelamento: string;
        professorAceitaNovosAlunos: boolean;
        professorPerfilPublicado: boolean;
        orgEsporteId: string;
        orgEsportes: number[];
        orgLocalModo: "existente" | "novo";
        orgLocalId: string;
        orgLocalMsg: string;
        orgNovoLocalNome: string;
        orgNovoLocalEndereco: string;
        orgNovoLocalCidade: string;
        orgNovoLocalEstado: string;
        orgNovoLocalCep: string;
        orgNovoLocalLat: string;
        orgNovoLocalLng: string;
        espacoNome: string;
        espacoEsportes: number[];
        estruturas: string[];
        reservaModelo: "livre" | "socios" | "pago" | "misto";
        reservaNotas: string;
        espacoEndereco: string;
        espacoNumero: string;
        espacoBairro: string;
        espacoCidade: string;
        espacoEstado: string;
        espacoCep: string;
        espacoComplemento: string;
        esportesExp: Record<number, string>;
        espacoLat: string;
        espacoLng: string;
        nome: string;
        username: string;
        localizacao: string;
        alturaCm: string;
        pesoKg: string;
        lado: string;
        bio: string;
        estiloJogo: string;
        disponibilidadeSemanaJson: string;
      }>;
      if (
        draft.step &&
        ["papeis", "esportes", "extras", "perfil"].includes(draft.step)
      ) {
        setStep(draft.step);
      }
      if (draft.papeis) {
        setPapeis(new Set(normalizarPapeisContaPrincipal(draft.papeis as string[])));
      }
      if (draft.esportesSel) setEsportesSel(new Set(draft.esportesSel));
      if (draft.esportesInteresse) setEsportesInteresse(draft.esportesInteresse);
      if (draft.esporteModes) setEsporteModes(draft.esporteModes);
      if (draft.professorObjetivos) setProfessorObjetivos(draft.professorObjetivos);
      if (draft.professorTipos) setProfessorTipos(draft.professorTipos);
      const migratedMods = (() => {
        const raw = draft.esportesModalidades ?? draft.esportesModalidade;
        if (!raw || typeof raw !== "object") return null;
        const out: Record<number, MatchModality[]> = {};
        for (const [k, v] of Object.entries(raw)) {
          const id = Number(k);
          if (!Number.isFinite(id)) continue;
          if (Array.isArray(v)) {
            const ok = v.filter((x): x is MatchModality => x === "individual" || x === "dupla" || x === "time");
            if (ok.length) out[id] = sortModalidadesMatch(ok);
          } else if (v === "individual" || v === "dupla" || v === "time") {
            out[id] = [v];
          }
        }
        return Object.keys(out).length ? out : null;
      })();
      if (migratedMods) setEsportesModalidades(migratedMods);
      if (draft.expModo) setExpModo(draft.expModo);
      if (draft.expAprox) setExpAprox(draft.expAprox);
      if (typeof draft.expMes === "string") setExpMes(draft.expMes);
      if (typeof draft.expAno === "string") setExpAno(draft.expAno);
      if (typeof draft.professorHeadline === "string") setProfessorHeadline(draft.professorHeadline);
      if (typeof draft.professorBio === "string") setProfessorBio(draft.professorBio);
      if (typeof draft.professorCertificacoes === "string") setProfessorCertificacoes(draft.professorCertificacoes);
      if (typeof draft.professorPublicoAlvo === "string") setProfessorPublicoAlvo(draft.professorPublicoAlvo);
      if (typeof draft.professorFormatoAula === "string") setProfessorFormatoAula(draft.professorFormatoAula);
      if (typeof draft.professorPoliticaCancelamento === "string") {
        setProfessorPoliticaCancelamento(draft.professorPoliticaCancelamento);
      }
      if (typeof draft.professorAceitaNovosAlunos === "boolean") {
        setProfessorAceitaNovosAlunos(draft.professorAceitaNovosAlunos);
      }
      if (typeof draft.professorPerfilPublicado === "boolean") {
        setProfessorPerfilPublicado(draft.professorPerfilPublicado);
      }
      if (typeof draft.orgEsporteId === "string") setOrgEsporteId(draft.orgEsporteId);
      if (draft.orgEsportes) setOrgEsportes(new Set(draft.orgEsportes));
      if (draft.orgLocalModo) setOrgLocalModo(draft.orgLocalModo);
      if (typeof draft.orgLocalId === "string") setOrgLocalId(draft.orgLocalId);
      if (typeof draft.orgLocalMsg === "string") setOrgLocalMsg(draft.orgLocalMsg);
      if (typeof draft.orgNovoLocalNome === "string") setOrgNovoLocalNome(draft.orgNovoLocalNome);
      if (typeof draft.orgNovoLocalEndereco === "string") setOrgNovoLocalEndereco(draft.orgNovoLocalEndereco);
      if (typeof draft.orgNovoLocalCidade === "string") setOrgNovoLocalCidade(draft.orgNovoLocalCidade);
      if (typeof draft.orgNovoLocalEstado === "string") setOrgNovoLocalEstado(draft.orgNovoLocalEstado);
      if (typeof draft.orgNovoLocalCep === "string") setOrgNovoLocalCep(draft.orgNovoLocalCep);
      if (typeof draft.orgNovoLocalLat === "string") setOrgNovoLocalLat(draft.orgNovoLocalLat);
      if (typeof draft.orgNovoLocalLng === "string") setOrgNovoLocalLng(draft.orgNovoLocalLng);
      if (typeof draft.espacoNome === "string") setEspacoNome(draft.espacoNome);
      if (draft.espacoEsportes) setEspacoEsportes(new Set(draft.espacoEsportes));
      if (draft.estruturas) setEstruturas(new Set(draft.estruturas));
      if (draft.reservaModelo) setReservaModelo(draft.reservaModelo);
      if (typeof draft.reservaNotas === "string") setReservaNotas(draft.reservaNotas);
      if (typeof draft.espacoEndereco === "string") setEspacoEndereco(draft.espacoEndereco);
      if (typeof draft.espacoNumero === "string") setEspacoNumero(draft.espacoNumero);
      if (typeof draft.espacoBairro === "string") setEspacoBairro(draft.espacoBairro);
      if (typeof draft.espacoCidade === "string") setEspacoCidade(draft.espacoCidade);
      if (typeof draft.espacoEstado === "string") setEspacoEstado(draft.espacoEstado);
      if (typeof draft.espacoCep === "string") setEspacoCep(draft.espacoCep);
      if (typeof draft.espacoComplemento === "string") setEspacoComplemento(draft.espacoComplemento);
      if (draft.esportesExp && typeof draft.esportesExp === "object") {
        const next = Object.fromEntries(
          Object.entries(draft.esportesExp as Record<number, string>)
            .map(([id, val]) => [Number(id), parseSportExpValue(val)] as const)
            .filter(([, val]) => Boolean(val))
        );
        setEsportesExp(next);
      }
      if (typeof draft.espacoLat === "string") setEspacoLat(draft.espacoLat);
      if (typeof draft.espacoLng === "string") setEspacoLng(draft.espacoLng);
      if (typeof draft.nome === "string") setNome(draft.nome);
      if (typeof draft.username === "string") setUsername(draft.username);
      if (typeof draft.localizacao === "string") setLocalizacao(draft.localizacao);
      if (typeof draft.alturaCm === "string") setAlturaCm(draft.alturaCm);
      if (typeof draft.pesoKg === "string") setPesoKg(draft.pesoKg);
      if (typeof draft.lado === "string") setLado(draft.lado);
      if (typeof draft.bio === "string") setBio(draft.bio);
      if (typeof draft.estiloJogo === "string") setEstiloJogo(draft.estiloJogo);
      if (typeof draft.disponibilidadeSemanaJson === "string") setDisponibilidadeSemanaJson(draft.disponibilidadeSemanaJson);
      setRestoredDraftAt(new Date().toLocaleTimeString("pt-BR"));
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey, forceResetKey]);

  useEffect(() => {
    const payload = {
      step,
      papeis: [...papeis],
      esportesSel: [...esportesSel],
      esportesInteresse,
      esportesModalidades,
      esporteModes,
      professorObjetivos,
      professorTipos,
      expModo,
      expAprox,
      expMes,
      expAno,
      professorHeadline,
      professorBio,
      professorCertificacoes,
      professorPublicoAlvo,
      professorFormatoAula,
      professorPoliticaCancelamento,
      professorAceitaNovosAlunos,
      professorPerfilPublicado,
      orgEsporteId,
      orgEsportes: [...orgEsportes],
      orgLocalModo,
      orgLocalId,
      orgLocalMsg,
      orgNovoLocalNome,
      orgNovoLocalEndereco,
      orgNovoLocalCidade,
      orgNovoLocalEstado,
      orgNovoLocalCep,
      orgNovoLocalLat,
      orgNovoLocalLng,
      espacoNome,
      espacoEsportes: [...espacoEsportes],
      estruturas: [...estruturas],
      reservaModelo,
      reservaNotas,
      espacoEndereco,
      espacoNumero,
      espacoBairro,
      espacoCidade,
      espacoEstado,
      espacoCep,
      espacoComplemento,
      esportesExp,
      espacoLat,
      espacoLng,
      nome,
      username,
      localizacao,
      alturaCm,
      pesoKg,
      lado,
      bio,
      estiloJogo,
      disponibilidadeSemanaJson,
    };
    window.localStorage.setItem(draftKey, JSON.stringify(payload));
  }, [
    alturaCm,
    espacoEsportes,
    espacoNome,
    esportesSel,
    esportesInteresse,
    esportesModalidades,
    esporteModes,
    professorObjetivos,
    professorTipos,
    estruturas,
    expAno,
    expAprox,
    expMes,
    expModo,
    professorHeadline,
    professorBio,
    professorCertificacoes,
    professorPublicoAlvo,
    professorFormatoAula,
    professorPoliticaCancelamento,
    professorAceitaNovosAlunos,
    professorPerfilPublicado,
    lado,
    localizacao,
    nome,
    username,
    bio,
    estiloJogo,
    disponibilidadeSemanaJson,
    orgEsporteId,
    orgEsportes,
    orgLocalModo,
    orgLocalId,
    orgLocalMsg,
    orgNovoLocalNome,
    orgNovoLocalEndereco,
    orgNovoLocalCidade,
    orgNovoLocalEstado,
    orgNovoLocalCep,
    orgNovoLocalLat,
    orgNovoLocalLng,
    papeis,
    pesoKg,
    reservaModelo,
    reservaNotas,
    espacoEndereco,
    espacoNumero,
    espacoBairro,
    espacoCidade,
    espacoEstado,
    espacoCep,
    espacoComplemento,
    esportesExp,
    espacoLat,
    espacoLng,
    step,
    draftKey,
  ]);

  const hasAtletaProfessor = useMemo(
    () => [...papeis].some((p) => p === "atleta" || p === "professor"),
    [papeis]
  );
  const hasProfessor = useMemo(() => [...papeis].includes("professor"), [papeis]);
  const hasAtleta = useMemo(() => [...papeis].includes("atleta"), [papeis]);
  const hasOrganizador = useMemo(() => [...papeis].includes("organizador"), [papeis]);
  const hasEspaco = useMemo(() => [...papeis].includes("espaco"), [papeis]);
  const hasAnyAthleteSport = useMemo(
    () =>
      [...esportesSel].some((id) => {
        const mode = esporteModes[id] ?? (hasProfessor ? "professor" : "atleta");
        return esporteModoTemAtleta(mode);
      }),
    [esporteModes, esportesSel, hasProfessor]
  );
  const hasAnyProfessorSport = useMemo(
    () =>
      [...esportesSel].some((id) => {
        const mode = esporteModes[id] ?? (hasProfessor ? "professor" : "atleta");
        return esporteModoTemProfessor(mode);
      }),
    [esporteModes, esportesSel, hasProfessor]
  );
  const stepOrder: Step[] = ["papeis", "esportes", "extras", "perfil"];
  const activeStepIndex = stepOrder.indexOf(step);
  const progressPct = ((activeStepIndex + 1) / stepOrder.length) * 100;
  const perfilAlturaNum = Number(alturaCm);
  const perfilPesoNum = Number(pesoKg);
  const hasFotoSelecionada = Boolean(fotoPreviewUrl);

  useEffect(() => {
    return () => {
      if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl);
    };
  }, [fotoPreviewUrl]);

  const extrasValid = useMemo(() => {
    if (hasEspaco && espacoNome.trim().length < 3) return false;
    if (hasOrganizador && orgEsportes.size === 0) return false;
    if (hasOrganizador && orgLocalModo === "existente" && Number(orgLocalId) <= 0) return false;
    if (hasOrganizador && orgLocalModo === "novo") {
      if (orgNovoLocalNome.trim().length < 3) return false;
      if (orgNovoLocalCidade.trim().length < 2) return false;
      if (orgNovoLocalEstado.trim().length < 2) return false;
    }
    if (hasEspaco) {
      if (espacoEndereco.trim().length < 3) return false;
      if (espacoCidade.trim().length < 2) return false;
      if (espacoEstado.trim().length < 2) return false;
      if (espacoEsportes.size === 0) return false;
    }
    return true;
  }, [
    espacoCidade,
    espacoEndereco,
    espacoEstado,
    espacoNome,
    espacoEsportes,
    hasEspaco,
    hasOrganizador,
    orgEsportes,
    orgLocalId,
    orgLocalModo,
    orgNovoLocalCidade,
    orgNovoLocalEstado,
    orgNovoLocalNome,
  ]);

  const perfilValid = useMemo(() => {
    if (nome.trim().length < 3 || localizacao.trim().length < 3) return false;
    const uname = username.trim().toLowerCase();
    if (uname && !/^[a-z0-9_]{3,24}$/.test(uname)) return false;
    if (hasAnyAthleteSport) {
      if (!Number.isInteger(perfilAlturaNum) || perfilAlturaNum < 50 || perfilAlturaNum > 260) {
        return false;
      }
      if (!Number.isInteger(perfilPesoNum) || perfilPesoNum < 20 || perfilPesoNum > 300) {
        return false;
      }
      if (!["Destro", "Canhoto", "Ambos"].includes(lado)) return false;
    }
    return true;
  }, [hasAnyAthleteSport, lado, localizacao, nome, perfilAlturaNum, perfilPesoNum, username]);

  function applyResult(r: OnboardingActionResult) {
    if (!r.ok) {
      setMessage(r.message);
      return;
    }
    setMessage(null);
    router.refresh();
    if (r.nextStep === "esportes") setStep("esportes");
    else if (r.nextStep === "extras") setStep("extras");
    else if (r.nextStep === "perfil") setStep("perfil");
    else if (r.nextStep === "dashboard") {
      window.localStorage.removeItem(draftKey);
      router.push("/dashboard");
    }
  }

  function clearDraft() {
    const clearedDraft = {
      step: "papeis" as Step,
      papeis: [] as string[],
      esportesSel: [] as number[],
      esportesInteresse: {} as Record<number, "ranking" | "ranking_e_amistoso" | "amistoso">,
      esportesModalidades: {} as Record<number, MatchModality[]>,
      esporteModes: {} as Record<number, ProfessorModoEsportivo>,
      professorObjetivos: {} as Record<number, ProfessorObjetivoPlataforma>,
      professorTipos: {} as Record<number, ProfessorTipoAtuacao[]>,
      esportesExp: {} as Record<number, string>,
      espacoLat: "",
      espacoLng: "",
    };
    window.localStorage.setItem(forceResetKey, "1");
    window.localStorage.setItem(draftKey, JSON.stringify(clearedDraft));
    setRestoredDraftAt(null);
    didHydrateFromServerRef.current = true;
    setStep("papeis");
    setPapeis(new Set());
    setEsportesSel(new Set());
    setEsportesInteresse({});
    setEsportesModalidades({});
    setEsporteModes({});
    setProfessorObjetivos({});
    setProfessorTipos({});
    setExpModo(extrasInitial.expModo);
    setExpAprox(extrasInitial.expAprox);
    setExpMes(extrasInitial.expMes ? String(extrasInitial.expMes) : "");
    setExpAno(extrasInitial.expAno ? String(extrasInitial.expAno) : "");
    setEsportesExp({});
    setProfessorHeadline(extrasInitial.professorHeadline);
    setProfessorBio(extrasInitial.professorBio);
    setProfessorCertificacoes(extrasInitial.professorCertificacoes);
    setProfessorPublicoAlvo(extrasInitial.professorPublicoAlvo);
    setProfessorFormatoAula(extrasInitial.professorFormatoAula);
    setProfessorPoliticaCancelamento(extrasInitial.professorPoliticaCancelamento);
    setProfessorAceitaNovosAlunos(extrasInitial.professorAceitaNovosAlunos);
    setProfessorPerfilPublicado(extrasInitial.professorPerfilPublicado);
    setOrgEsporteId(extrasInitial.orgEsporteId ? String(extrasInitial.orgEsporteId) : "0");
    setOrgEsportes(new Set(extrasInitial.orgEsportesIds));
    setOrgLocalModo(extrasInitial.orgLocalModo);
    setOrgLocalId(extrasInitial.orgLocalId ? String(extrasInitial.orgLocalId) : "0");
    setOrgLocalMsg(extrasInitial.orgLocalMsg);
    setOrgNovoLocalNome("");
    setOrgNovoLocalEndereco("");
    setOrgNovoLocalCidade("");
    setOrgNovoLocalEstado("");
    setOrgNovoLocalCep("");
    setOrgNovoLocalLat("");
    setOrgNovoLocalLng("");
    setEspacoNome(extrasInitial.espacoNome);
    setEspacoEsportes(new Set(extrasInitial.espacoEsportes));
    setEstruturas(new Set(extrasInitial.estruturas));
    setReservaModelo(extrasInitial.reservaModelo);
    setReservaNotas(extrasInitial.reservaNotas);
    setEspacoEndereco(extrasInitial.espacoEndereco);
    setEspacoNumero(extrasInitial.espacoNumero);
    setEspacoBairro(extrasInitial.espacoBairro);
    setEspacoCidade(extrasInitial.espacoCidade);
    setEspacoEstado(extrasInitial.espacoEstado);
    setEspacoCep(extrasInitial.espacoCep);
    setEspacoComplemento(extrasInitial.espacoComplemento);
    setEspacoLat("");
    setEspacoLng("");
    setNome(profileInitial.nome);
    setUsername(profileInitial.username);
    setLocalizacao(profileInitial.localizacao);
    setAlturaCm(profileInitial.alturaCm ? String(profileInitial.alturaCm) : "");
    setPesoKg(profileInitial.pesoKg ? String(profileInitial.pesoKg) : "");
    setLado(profileInitial.lado ?? "");
    setBio(profileInitial.bio ?? "");
    setEstiloJogo(profileInitial.estiloJogo ?? "");
    setDisponibilidadeSemanaJson(profileInitial.disponibilidadeSemanaJson ?? "{}");
    setMessage("Rascunho local limpo. O onboarding foi reiniciado na primeira etapa.");
  }

  function togglePapel(id: string) {
    const role = ROLES.find((r) => r.id === id);
    if (!role?.enabled) return;
    setPapeis(new Set<string>([id]));
  }

  function toggleEsporte(id: number) {
    setEsportesSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
        setEsporteModes((old) => {
          const next = { ...old };
          delete next[id];
          return next;
        });
        setProfessorObjetivos((old) => {
          const next = { ...old };
          delete next[id];
          return next;
        });
        setProfessorTipos((old) => {
          const next = { ...old };
          delete next[id];
          return next;
        });
        setEsportesModalidades((om) => {
          const next = { ...om };
          delete next[id];
          return next;
        });
      } else {
        n.add(id);
        setEsportesInteresse((old) => ({
          ...old,
          [id]: old[id] ?? "ranking_e_amistoso",
        }));
        const defaultMode: ProfessorModoEsportivo = hasProfessor ? "professor" : "atleta";
        setEsporteModes((old) => ({
          ...old,
          [id]: old[id] ?? defaultMode,
        }));
        setProfessorObjetivos((old) => ({
          ...old,
          [id]: old[id] ?? "somente_exposicao",
        }));
        setProfessorTipos((old) => ({
          ...old,
          [id]: old[id]?.length ? old[id]! : ["aulas"],
        }));
        const esp = esportes.find((e) => e.id === id);
        const defaultModalidade: MatchModality = esp?.permiteIndividual
          ? "individual"
          : esp?.permiteDupla
            ? "dupla"
            : "time";
        setEsportesModalidades((old) => ({
          ...old,
          [id]: old[id]?.length ? old[id]! : [defaultModalidade],
        }));
      }
      return n;
    });
  }

  function setEsporteMode(id: number, mode: ProfessorModoEsportivo) {
    setEsporteModes((old) => ({ ...old, [id]: mode }));
    if (!esporteModoTemProfessor(mode)) {
      setProfessorObjetivos((old) => {
        const next = { ...old };
        delete next[id];
        return next;
      });
      setProfessorTipos((old) => {
        const next = { ...old };
        delete next[id];
        return next;
      });
    } else {
      setProfessorObjetivos((old) => ({ ...old, [id]: old[id] ?? "somente_exposicao" }));
      setProfessorTipos((old) => ({ ...old, [id]: old[id]?.length ? old[id]! : ["aulas"] }));
    }
  }

  function setProfessorObjetivo(id: number, objetivo: ProfessorObjetivoPlataforma) {
    setProfessorObjetivos((old) => ({ ...old, [id]: objetivo }));
  }

  function toggleProfessorTipo(id: number, tipo: ProfessorTipoAtuacao, checked: boolean) {
    setProfessorTipos((old) => {
      const current = new Set(old[id] ?? ["aulas"]);
      if (checked) current.add(tipo);
      else if (current.size > 1) current.delete(tipo);
      return { ...old, [id]: [...current] as ProfessorTipoAtuacao[] };
    });
  }

  function setEsporteInteresse(id: number, interesse: "ranking" | "ranking_e_amistoso" | "amistoso") {
    setEsportesInteresse((old) => ({ ...old, [id]: interesse }));
  }

  function toggleEsporteModality(id: number, modalidade: MatchModality, checked: boolean) {
    setEsportesModalidades((old) => {
      const cur = old[id] ?? ["individual"];
      const set = new Set(sortModalidadesMatch(cur));
      if (checked) {
        set.add(modalidade);
      } else {
        if (set.size <= 1) return old;
        set.delete(modalidade);
      }
      return { ...old, [id]: sortModalidadesMatch([...set]) };
    });
  }

  function submitPapeis(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => applyResult(await salvarPapeisOnboarding(undefined, fd)));
  }

  function submitEsportes(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => applyResult(await salvarEsportesOnboarding(undefined, fd)));
  }

  function submitExtras(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!extrasValid) {
      setMessage("Revise os campos desta etapa antes de continuar.");
      return;
    }
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => applyResult(await salvarExtrasOnboarding(undefined, fd)));
  }

  function submitPerfil(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!perfilValid) {
      setMessage("Preencha os dados obrigatórios para concluir o onboarding.");
      return;
    }
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    fd.set("foto_pos_x", String(fotoPosX));
    fd.set("foto_pos_y", String(fotoPosY));
    fd.set("foto_zoom", String(fotoZoom));
    startTransition(async () => applyResult(await salvarPerfilOnboarding(undefined, fd)));
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) {
      if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl);
      setFotoPreviewUrl(null);
      setFotoSelecionadaNome(null);
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl);
    setFotoPreviewUrl(nextUrl);
    setFotoSelecionadaNome(file.name);
    setFotoPosX(50);
    setFotoPosY(50);
    setFotoZoom(1);
  }

  function removeFotoSelecionada() {
    if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl);
    setFotoPreviewUrl(null);
    setFotoSelecionadaNome(null);
    setFotoPosX(50);
    setFotoPosY(50);
    setFotoZoom(1);
    if (fotoInputRef.current) {
      fotoInputRef.current.value = "";
    }
    if (fotoCameraInputRef.current) {
      fotoCameraInputRef.current.value = "";
    }
    if (fotoGaleriaInputRef.current) {
      fotoGaleriaInputRef.current.value = "";
    }
  }

  function toggleEspacoEsporte(id: number) {
    setEspacoEsportes((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleOrgEsporte(id: number) {
    setOrgEsportes((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleEstrutura(id: string) {
    setEstruturas((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function goBackStep() {
    if (step === "papeis") return;
    if (step === "esportes") {
      setStep("papeis");
      return;
    }
    if (step === "extras") {
      setStep(hasAtletaProfessor ? "esportes" : "papeis");
      return;
    }
    setStep("extras");
  }

  return (
    <main
      data-eid-onboarding-step={step}
      className="eid-auth-bg flex w-full flex-1 flex-col items-center overflow-x-hidden px-4 pb-28 pt-14 text-eid-fg sm:px-6 sm:pt-7"
    >
      <div ref={topAnchorRef} />
      <div className="w-full max-w-2xl pb-6">
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/"
            data-eid-skeleton="true"
            className="inline-block text-[13px] text-eid-text-muted no-underline transition hover:text-eid-fg"
          >
            ← Voltar ao início
          </Link>
        </div>

        <div data-eid-skeleton="true">
          <LogoFull priority className="mb-5 mt-1" />
        </div>

        <div className="eid-auth-card p-6 sm:p-8">
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-eid-primary-500">
                Etapa {activeStepIndex + 1} de {stepOrder.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={clearDraft}
                  disabled={pending}
                  className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2.5 py-1 text-[11px] font-semibold text-eid-text-secondary transition hover:border-eid-primary-500/40 hover:text-eid-fg disabled:opacity-50"
                >
                  Limpar rascunho
                </button>
                {step !== "papeis" ? (
                  <button
                    type="button"
                    onClick={goBackStep}
                    disabled={pending}
                    className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2.5 py-1 text-[11px] font-semibold text-eid-fg transition hover:border-eid-primary-500/40 disabled:opacity-50"
                  >
                    Voltar etapa
                  </button>
                ) : null}
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-eid-card">
              <div
                className="h-full rounded-full bg-eid-action-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {restoredDraftAt ? (
              <p className="mt-2 text-[11px] text-eid-text-secondary">
                Rascunho local restaurado às {restoredDraftAt}.
              </p>
            ) : null}
          </div>
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-eid-primary-500">
            Onboarding
          </p>
          <h1 className="mt-2 text-xl font-semibold text-eid-fg">Olá, {primeiroNome}!</h1>
          <p className="mt-2 text-sm leading-relaxed text-eid-text-secondary">
            {step === "papeis" &&
              "Escolha somente um perfil principal para esta conta. Depois você poderá ter outros perfis em painéis separados."}
            {step === "esportes" &&
              (hasProfessor
                ? "Selecione os esportes que você ensina e informe sua experiência em cada um."
                : "Selecione os esportes da sua conta Atleta / Usuário e configure como deseja jogar no match.")}
            {step === "extras" &&
              "Só mais alguns detalhes para montar seu perfil profissional, operacional e público dentro da plataforma."}
            {step === "perfil" &&
              "Finalize com presença no app: foto, nome e dados principais."}
          </p>

          {message ? (
            <p className="mt-4 rounded-xl border border-eid-action-500/30 bg-eid-action-500/10 px-3 py-2 text-sm text-eid-fg">
              {message}
            </p>
          ) : null}

          {step === "papeis" ? (
            <form onSubmit={submitPapeis} className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {ROLES.map((r) => {
                  const sel = papeis.has(r.id);
                  const disabled = !r.enabled;
                  return (
                    <label
                      key={r.id}
                      className={`relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-all select-none ${
                        disabled
                          ? "cursor-not-allowed border-[color:var(--eid-border-subtle)] bg-eid-surface/35 opacity-70"
                          : "cursor-pointer"
                      } ${
                        sel
                          ? "border-eid-primary-500/60 bg-eid-primary-500/10 shadow-sm"
                          : "border-[color:var(--eid-border-subtle)] bg-eid-card/60 hover:border-eid-primary-500/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="papel"
                        value={r.id}
                        checked={sel}
                        onChange={() => togglePapel(r.id)}
                        disabled={disabled}
                        className="sr-only"
                      />
                      <div className="min-w-0 flex-1">
                        <span className={`block text-sm font-bold ${sel ? "text-eid-primary-400" : disabled ? "text-eid-text-secondary" : "text-eid-fg"}`}>{r.titulo}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-eid-text-secondary">{r.desc}</span>
                      </div>
                      {disabled ? (
                        <span className="shrink-0 rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-bg/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-eid-text-secondary">
                          Em breve
                        </span>
                      ) : (
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all ${
                            sel ? "bg-eid-primary-500" : "border border-[color:var(--eid-border-subtle)]"
                          }`}
                        >
                          {sel ? (
                            <svg viewBox="0 0 10 10" className="h-3 w-3" fill="none">
                              <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : null}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              {papeis.size > 0 ? (
                <p className="rounded-xl border border-eid-action-500/25 bg-eid-action-500/10 px-3 py-2 text-xs text-eid-text-secondary">
                  Esta seleção define o painel principal após o cadastro: o perfil Atleta / Usuário abre o dashboard; os demais abrem painéis administrativos.
                </p>
              ) : null}
              <button
                type="submit"
                disabled={pending || papeis.size === 0}
                className="eid-btn-primary w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50"
              >
                {pending ? "Salvando…" : "Continuar"}
              </button>
            </form>
          ) : null}

          {step === "esportes" ? (
            <form onSubmit={submitEsportes} className="mt-6 space-y-4">

              {/* ── Grade de seleção de esportes: pills compactos ── */}
              <div className="flex flex-wrap gap-2">
                {esportes.map((e) => {
                  const sel = esportesSel.has(e.id);
                  return (
                    <label
                      key={e.id}
                      className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        sel
                          ? "border-eid-primary-500 bg-eid-primary-500 text-white shadow-sm"
                          : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:border-eid-primary-500/40 hover:text-eid-fg"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="esporte_id"
                        value={e.id}
                        checked={sel}
                        onChange={() => toggleEsporte(e.id)}
                        className="sr-only"
                      />
                      {sel && (
                        <svg viewBox="0 0 10 10" className="h-3 w-3 shrink-0" fill="none">
                          <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {e.nome}
                    </label>
                  );
                })}
              </div>

              {/* ── Detalhes dos esportes selecionados ── */}
              {esportesSel.size > 0 && (
                <div className="space-y-3">
                  {esportes.filter((e) => esportesSel.has(e.id)).map((e) => {
                    const modoEsporte =
                      hasProfessor && hasAtleta
                        ? (esporteModes[e.id] ?? "atleta")
                        : hasProfessor
                          ? "professor"
                          : "atleta";
                    const temAtletaNoEsporte = hasAtleta && esporteModoTemAtleta(modoEsporte);
                    const temProfessorNoEsporte = hasProfessor && esporteModoTemProfessor(modoEsporte);
                    return (
                    <div
                      key={e.id}
                      className="rounded-2xl border border-eid-primary-500/30 bg-eid-card/60 p-4"
                    >
                      {/* Header do esporte */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-wide text-eid-fg">{e.nome}</h3>
                        <button
                          type="button"
                          onClick={() => toggleEsporte(e.id)}
                          className="rounded-full p-1 text-eid-text-secondary hover:text-eid-action-500 transition"
                          aria-label={`Remover ${e.nome}`}
                        >
                          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>

                      {hasProfessor && hasAtleta ? (
                        <>
                          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">
                            Como você atua neste esporte
                          </p>
                          <div className="mt-1.5 inline-flex flex-wrap gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-1">
                            {([
                              { value: "atleta", label: "Atleta" },
                              { value: "professor", label: "Professor" },
                              { value: "ambos", label: "Ambos" },
                            ] as const).map((opt) => {
                              const active = modoEsporte === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setEsporteMode(e.id, opt.value)}
                                  className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all select-none ${
                                    active ? "bg-eid-primary-500 text-white shadow-sm" : "text-eid-text-secondary hover:text-eid-fg"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      ) : null}

                      {temProfessorNoEsporte ? (
                        <>
                          <input type="hidden" name={`esporte_modo_${e.id}`} value={modoEsporte} />
                          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">
                            Objetivo como professor
                          </p>
                          <div className="mt-1.5 flex flex-col gap-1.5">
                            {([
                              { value: "somente_exposicao", label: "Somente exposição", desc: "Perfil público e captação de alunos." },
                              { value: "gerir_alunos", label: "Gerenciar alunos", desc: "Agenda, pagamentos, feedbacks e comunicação." },
                              { value: "ambos", label: "Exposição + gestão", desc: "Divulga o perfil e opera aulas pela plataforma." },
                            ] as const).map((opt) => {
                              const active = (professorObjetivos[e.id] ?? "somente_exposicao") === opt.value;
                              return (
                                <label
                                  key={opt.value}
                                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-all select-none ${
                                    active
                                      ? "border-eid-action-500/40 bg-eid-action-500/8"
                                      : "border-[color:var(--eid-border-subtle)] hover:border-eid-action-500/25"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`esporte_professor_objetivo_${e.id}`}
                                    value={opt.value}
                                    checked={active}
                                    onChange={() => setProfessorObjetivo(e.id, opt.value)}
                                    className="sr-only"
                                  />
                                  <div className="min-w-0">
                                    <p className={`text-xs font-bold ${active ? "text-eid-fg" : "text-eid-text-secondary"}`}>{opt.label}</p>
                                    <p className="text-[10px] text-eid-text-secondary">{opt.desc}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">
                            Tipo de atuação
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {([
                              { value: "aulas", label: "Aulas" },
                              { value: "treinamento", label: "Treinamento profissional" },
                              { value: "consultoria", label: "Consultoria técnica" },
                            ] as const).map((opt) => {
                              const active = (professorTipos[e.id] ?? ["aulas"]).includes(opt.value);
                              return (
                                <label
                                  key={opt.value}
                                  className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                                    active
                                      ? "border-eid-action-500 bg-eid-action-500/15 text-eid-action-500"
                                      : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    name={`esporte_professor_tipo_${e.id}`}
                                    value={opt.value}
                                    checked={active}
                                    onChange={(ev) => toggleProfessorTipo(e.id, opt.value, ev.target.checked)}
                                    className="sr-only"
                                  />
                                  {opt.label}
                                </label>
                              );
                            })}
                          </div>
                        </>
                      ) : null}

                      {temAtletaNoEsporte ? (
                        <>
                      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">
                        Interesse no match
                      </p>
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        {([
                          {
                            val: "ranking",
                            label: "Só ranking",
                            desc: "Apenas partidas competitivas",
                            icon: (
                              <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none">
                                <path d="M5 2h6v7a3 3 0 01-6 0V2z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                                <path d="M2 3h3v4a2 2 0 01-2-2V3zM11 3h3v2a2 2 0 01-2 2V3z" fill="currentColor" fillOpacity="0.3"/>
                                <line x1="8" y1="12" x2="8" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                <line x1="6" y1="14" x2="10" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            ),
                            color: "var(--eid-primary-500)",
                          },
                          {
                            val: "ranking_e_amistoso",
                            label: "Ranking + Amistoso",
                            desc: "Aceito os dois tipos de partida",
                            icon: (
                              <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none">
                                <path d="M8 1l1.5 3.5L13 5l-2.5 2.5.5 3.5L8 9.5 5 11l.5-3.5L3 5l3.5-.5L8 1z" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                              </svg>
                            ),
                            color: "var(--eid-action-500)",
                          },
                          {
                            val: "amistoso",
                            label: "Apenas amistosos",
                            desc: "Partidas sem impacto no ranking",
                            icon: (
                              <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none">
                                <circle cx="5.5" cy="5" r="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.4"/>
                                <circle cx="10.5" cy="5" r="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.4"/>
                                <path d="M1 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                                <path d="M10 10c.8-.6 1.8-1 3-1 2 0 3 1.2 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                              </svg>
                            ),
                            color: "#22c55e",
                          },
                        ] as const).map(({ val, label, desc, icon, color }) => {
                          const active = (esportesInteresse[e.id] ?? "ranking_e_amistoso") === val;
                          return (
                            <label
                              key={val}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-all select-none ${
                                active
                                  ? "border-eid-primary-500/40 bg-eid-primary-500/8"
                                  : "border-[color:var(--eid-border-subtle)] hover:border-eid-primary-500/25"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`esporte_interesse_${e.id}`}
                                value={val}
                                checked={active}
                                onChange={() => setEsporteInteresse(e.id, val)}
                                className="sr-only"
                              />
                              <span style={{ color: active ? color : "var(--eid-text-secondary)" }}>{icon}</span>
                              <div className="min-w-0">
                                <p className={`text-xs font-bold ${active ? "text-eid-fg" : "text-eid-text-secondary"}`}>{label}</p>
                                <p className="text-[10px] text-eid-text-secondary">{desc}</p>
                              </div>
                              {active && (
                                <span className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-eid-primary-500">
                                  <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none">
                                    <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>

                      {(esportesInteresse[e.id] ?? "ranking_e_amistoso") === "amistoso" && (
                        <p className="mt-2 rounded-lg border border-eid-action-500/30 bg-eid-action-500/10 px-2 py-1.5 text-[11px] text-eid-action-400">
                          Você não aparecerá nas sugestões de matchmaking competitivo.
                        </p>
                      )}

                      {/* Modalidades */}
                      {(e.permiteIndividual || e.permiteDupla || e.permiteTime) && (
                        <>
                          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">
                            Como deseja jogar
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {e.permiteIndividual && (
                              <label className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                                (esportesModalidades[e.id] ?? ["individual"]).includes("individual")
                                  ? "border-eid-primary-500 bg-eid-primary-500/15 text-eid-primary-400"
                                  : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"
                              }`}>
                                <input type="checkbox" name={`esporte_modalidade_${e.id}`} value="individual"
                                  checked={(esportesModalidades[e.id] ?? ["individual"]).includes("individual")}
                                  onChange={(ev) => toggleEsporteModality(e.id, "individual", ev.target.checked)}
                                  className="sr-only"
                                />
                                Individual (X1)
                              </label>
                            )}
                            {e.permiteDupla && (
                              <label className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                                (esportesModalidades[e.id] ?? ["individual"]).includes("dupla")
                                  ? "border-eid-primary-500 bg-eid-primary-500/15 text-eid-primary-400"
                                  : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"
                              }`}>
                                <input type="checkbox" name={`esporte_modalidade_${e.id}`} value="dupla"
                                  checked={(esportesModalidades[e.id] ?? ["individual"]).includes("dupla")}
                                  onChange={(ev) => toggleEsporteModality(e.id, "dupla", ev.target.checked)}
                                  className="sr-only"
                                />
                                Dupla
                              </label>
                            )}
                            {e.permiteTime && (
                              <label className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                                (esportesModalidades[e.id] ?? ["individual"]).includes("time")
                                  ? "border-eid-primary-500 bg-eid-primary-500/15 text-eid-primary-400"
                                  : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary"
                              }`}>
                                <input type="checkbox" name={`esporte_modalidade_${e.id}`} value="time"
                                  checked={(esportesModalidades[e.id] ?? ["individual"]).includes("time")}
                                  onChange={(ev) => toggleEsporteModality(e.id, "time", ev.target.checked)}
                                  className="sr-only"
                                />
                                Time
                              </label>
                            )}
                          </div>
                        </>
                      )}
                        </>
                      ) : (
                        <p className="mt-3 rounded-lg border border-eid-action-500/30 bg-eid-action-500/10 px-2 py-1.5 text-[11px] text-eid-action-400">
                          Neste esporte você entrará apenas no fluxo de professor, sem match ou ranking competitivo.
                        </p>
                      )}

                      {/* Experiência por esporte — só para atleta/professor */}
                      {hasAtletaProfessor && (
                        <>
                          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">
                            {papeis.has("professor") && !papeis.has("atleta")
                              ? `Há quanto tempo ensina ${e.nome}?`
                              : papeis.has("professor") && papeis.has("atleta")
                                ? `Experiência com ${e.nome} (joga/ensina)`
                                : `Há quanto tempo pratica ${e.nome}?`}
                          </p>
                          <div className="mt-1.5 space-y-2">
                            {(() => {
                              const expValue = esportesExp[e.id] ?? "";
                              const usingAprox = isSportExpAprox(expValue);
                              return (
                                <>
                                  {!usingAprox ? (
                                    <div className="space-y-2">
                                      <input
                                        type="month"
                                        value={toMonthInputValue(expValue)}
                                        onChange={(ev) => {
                                          const next = fromMonthInputValue(ev.target.value);
                                          setEsportesExp((prev) => {
                                            const updated = { ...prev };
                                            if (next) updated[e.id] = next;
                                            else delete updated[e.id];
                                            return updated;
                                          });
                                        }}
                                        className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setEsportesExp((prev) => ({ ...prev, [e.id]: "menos_1" }))}
                                        className="inline-flex items-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-1.5 text-[11px] font-semibold text-eid-text-secondary transition-all hover:border-eid-primary-500/40 hover:text-eid-fg"
                                      >
                                        Usar tempo aproximado
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="inline-flex gap-1 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-1">
                                        {([
                                          { val: "menos_1", label: "< 1 ano" },
                                          { val: "1_3", label: "1–3 anos" },
                                          { val: "mais_3", label: "+ 3 anos" },
                                        ] as const).map(({ val, label }) => {
                                          const active = expValue === val;
                                          return (
                                            <button
                                              key={val}
                                              type="button"
                                              onClick={() => setEsportesExp((prev) => ({ ...prev, [e.id]: val }))}
                                              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all select-none ${
                                                active ? "bg-eid-primary-500 text-white shadow-sm" : "text-eid-text-secondary hover:text-eid-fg"
                                              }`}
                                            >
                                              {label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEsportesExp((prev) => {
                                            const updated = { ...prev };
                                            delete updated[e.id];
                                            return updated;
                                          })
                                        }
                                        className="inline-flex items-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-1.5 text-[11px] font-semibold text-eid-text-secondary transition-all hover:border-eid-primary-500/40 hover:text-eid-fg"
                                      >
                                        Usar mês/ano exato
                                      </button>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <input
                            type="hidden"
                            name={`exp_esporte_${e.id}`}
                            value={esportesExp[e.id] ?? ""}
                          />
                        </>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
              <button
                type="submit"
                disabled={pending || esportesSel.size === 0}
                className="eid-btn-primary w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50"
              >
                {pending ? "Salvando…" : "Continuar"}
              </button>
            </form>
          ) : null}

          {step === "extras" ? (
            <form onSubmit={submitExtras} className="mt-6 space-y-5">
              {hasProfessor ? (
                <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-eid-primary-500">
                    Perfil profissional
                  </h2>
                  <p className="mt-2 text-xs text-eid-text-secondary">
                    Essas informações enriquecem seu perfil de professor, a descoberta por alunos e os fluxos de aulas.
                  </p>
                  <div className="mt-3 grid gap-3">
                    <input
                      name="professor_headline"
                      value={professorHeadline}
                      onChange={(e) => setProfessorHeadline(e.target.value)}
                      placeholder="Ex.: Treinador de beach tennis e preparação técnica"
                      className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <textarea
                      name="professor_bio_profissional"
                      value={professorBio}
                      onChange={(e) => setProfessorBio(e.target.value)}
                      rows={3}
                      placeholder="Resumo da sua metodologia, experiência e diferenciais"
                      className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="professor_certificacoes"
                      value={professorCertificacoes}
                      onChange={(e) => setProfessorCertificacoes(e.target.value)}
                      placeholder="Certificações (separadas por vírgula)"
                      className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="professor_publico_alvo"
                      value={professorPublicoAlvo}
                      onChange={(e) => setProfessorPublicoAlvo(e.target.value)}
                      placeholder="Público-alvo (iniciante, infantil, performance...)"
                      className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="professor_formato_aula"
                      value={professorFormatoAula}
                      onChange={(e) => setProfessorFormatoAula(e.target.value)}
                      placeholder="Formato das aulas (individual, grupo, online...)"
                      className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <textarea
                      name="professor_politica_cancelamento"
                      value={professorPoliticaCancelamento}
                      onChange={(e) => setProfessorPoliticaCancelamento(e.target.value)}
                      rows={2}
                      placeholder="Política resumida de cancelamento"
                      className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg">
                        <input
                          type="checkbox"
                          name="professor_aceita_novos_alunos"
                          checked={professorAceitaNovosAlunos}
                          onChange={(e) => setProfessorAceitaNovosAlunos(e.target.checked)}
                        />
                        Aceito novos alunos
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2 text-xs font-semibold text-eid-fg">
                        <input
                          type="checkbox"
                          name="professor_perfil_publicado"
                          checked={professorPerfilPublicado}
                          onChange={(e) => setProfessorPerfilPublicado(e.target.checked)}
                        />
                        Publicar perfil de professor no app
                      </label>
                    </div>
                  </div>
                </section>
              ) : null}

              {hasOrganizador ? (
                <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-eid-primary-500">
                    Organização de torneios
                  </h2>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">
                    Esportes dos eventos
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {esportes.map((e) => {
                      const sel = orgEsportes.has(e.id);
                      return (
                        <label key={`org-esp-${e.id}`} className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                          sel ? "border-eid-primary-500 bg-eid-primary-500 text-white shadow-sm" : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:border-eid-primary-500/40 hover:text-eid-fg"
                        }`}>
                          <input type="checkbox" name="org_esporte_ids" value={e.id} checked={sel} onChange={() => toggleOrgEsporte(e.id)} className="sr-only" />
                          {sel && <svg viewBox="0 0 10 10" className="h-3 w-3 shrink-0" fill="none"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          {e.nome}
                        </label>
                      );
                    })}
                  </div>
                  <input type="hidden" name="org_esporte_id" value={orgEsporteId} />

                  <p className="mt-4 text-xs text-eid-text-secondary">Local para seus torneios</p>
                  {/* Segmented control — Existente / Novo */}
                  <div className="mt-2 inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-1 gap-1">
                    {([
                      { val: "existente", label: "Já cadastrado" },
                      { val: "novo",      label: "Novo local"    },
                    ] as const).map(({ val, label }) => {
                      const active = orgLocalModo === val;
                      return (
                        <label
                          key={val}
                          className={`cursor-pointer rounded-lg px-4 py-1.5 text-xs font-semibold transition-all select-none ${
                            active
                              ? "bg-eid-primary-500 text-white shadow-sm"
                              : "text-eid-text-secondary hover:text-eid-fg"
                          }`}
                        >
                          <input
                            type="radio"
                            name="org_local_modo"
                            value={val}
                            checked={active}
                            onChange={() => setOrgLocalModo(val)}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>

                  {orgLocalModo === "existente" ? (
                    <>
                      <EidSelect
                        name="org_local_id"
                        value={orgLocalId}
                        onChange={setOrgLocalId}
                        placeholder="Selecione o local…"
                        className="mt-3"
                        options={[
                          ...locais.map((l) => ({
                            value: l.id,
                            label: `${l.nome}${l.localizacao ? ` — ${l.localizacao}` : ""}`,
                          })),
                        ]}
                      />
                      <input
                        name="org_local_msg"
                        value={orgLocalMsg}
                        onChange={(e) => setOrgLocalMsg(e.target.value)}
                        placeholder="Mensagem opcional para o dono do local"
                        className="eid-input-dark mt-2 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                      />
                    </>
                  ) : (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <input
                        name="org_novo_local_nome"
                        value={orgNovoLocalNome}
                        onChange={(e) => setOrgNovoLocalNome(e.target.value)}
                        placeholder="Nome do local"
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
                      />
                      <input
                        name="org_novo_local_endereco"
                        value={orgNovoLocalEndereco}
                        onChange={(e) => setOrgNovoLocalEndereco(e.target.value)}
                        placeholder="Endereço"
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
                      />
                      <div className="sm:col-span-2">
                        <EidFilePicker
                          name="org_novo_local_logo"
                          accept="image/*"
                          label="Escolher logo"
                          hint="Logo do local (opcional)"
                        />
                      </div>
                      <input
                        name="org_novo_local_cidade"
                        value={orgNovoLocalCidade}
                        onChange={(e) => setOrgNovoLocalCidade(e.target.value)}
                        placeholder="Cidade"
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                      />
                      <input
                        name="org_novo_local_estado"
                        value={orgNovoLocalEstado}
                        onChange={(e) => setOrgNovoLocalEstado(e.target.value)}
                        placeholder="UF"
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                      />
                      <input
                        name="org_novo_local_cep"
                        value={orgNovoLocalCep}
                        onChange={(e) => setOrgNovoLocalCep(e.target.value)}
                        placeholder="CEP (opcional)"
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                      />
                      <LocationPicker
                        latName="org_novo_local_lat"
                        lngName="org_novo_local_lng"
                        lat={orgNovoLocalLat}
                        lng={orgNovoLocalLng}
                        onCapture={(lat, lng) => { setOrgNovoLocalLat(lat); setOrgNovoLocalLng(lng); }}
                      />
                      <div className="sm:col-span-2">
                        <EidFilePicker
                          name="org_novo_local_documento"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          label="Enviar comprovante"
                          hint="Se esse nome já existir sem dono, envie comprovante para solicitar a propriedade."
                        />
                      </div>
                    </div>
                  )}
                </section>
              ) : null}

              {hasEspaco ? (
                <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-eid-primary-500">
                    Dados completos do espaço
                  </h2>
                  <input
                    name="espaco_nome"
                    value={espacoNome}
                    onChange={(e) => setEspacoNome(e.target.value)}
                    placeholder="Nome público do local"
                    className="eid-input-dark mt-3 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                  />
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      name="espaco_endereco"
                      value={espacoEndereco}
                      onChange={(e) => setEspacoEndereco(e.target.value)}
                      placeholder="Endereço"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
                    />
                    <input
                      name="espaco_numero"
                      value={espacoNumero}
                      onChange={(e) => setEspacoNumero(e.target.value)}
                      placeholder="Número"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="espaco_bairro"
                      value={espacoBairro}
                      onChange={(e) => setEspacoBairro(e.target.value)}
                      placeholder="Bairro"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="espaco_cidade"
                      value={espacoCidade}
                      onChange={(e) => setEspacoCidade(e.target.value)}
                      placeholder="Cidade"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="espaco_estado"
                      value={espacoEstado}
                      onChange={(e) => setEspacoEstado(e.target.value)}
                      placeholder="UF"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="espaco_cep"
                      value={espacoCep}
                      onChange={(e) => setEspacoCep(e.target.value)}
                      placeholder="CEP"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <input
                      name="espaco_complemento"
                      value={espacoComplemento}
                      onChange={(e) => setEspacoComplemento(e.target.value)}
                      placeholder="Complemento (opcional)"
                      className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg"
                    />
                    <LocationPicker
                      latName="espaco_lat"
                      lngName="espaco_lng"
                      lat={espacoLat}
                      lng={espacoLng}
                      onCapture={(lat, lng) => { setEspacoLat(lat); setEspacoLng(lng); }}
                    />
                  </div>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">
                    Esportes atendidos no local
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {esportes.map((e) => {
                      const sel = espacoEsportes.has(e.id);
                      return (
                        <label key={`esp-${e.id}`} className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                          sel ? "border-eid-primary-500 bg-eid-primary-500 text-white shadow-sm" : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:border-eid-primary-500/40 hover:text-eid-fg"
                        }`}>
                          <input type="checkbox" name="espaco_esportes" value={e.id} checked={sel} onChange={() => toggleEspacoEsporte(e.id)} className="sr-only" />
                          {sel && <svg viewBox="0 0 10 10" className="h-3 w-3 shrink-0" fill="none"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          {e.nome}
                        </label>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary">
                    Estruturas disponíveis
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ESTRUTURAS.map((e) => {
                      const sel = estruturas.has(e.id);
                      return (
                        <label key={e.id} className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                          sel ? "border-eid-action-500 bg-eid-action-500/15 text-eid-action-500 shadow-sm" : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:border-eid-action-500/40 hover:text-eid-fg"
                        }`}>
                          <input type="checkbox" name="estrutura" value={e.id} checked={sel} onChange={() => toggleEstrutura(e.id)} className="sr-only" />
                          {sel && <svg viewBox="0 0 10 10" className="h-3 w-3 shrink-0" fill="none"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          {e.label}
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    {([
                      { val: "livre",   label: "A definir depois",              desc: "Configure o acesso mais tarde" },
                      { val: "socios",  label: "Gratuito para sócios",          desc: "Prioridade / reserva para membros" },
                      { val: "pago",    label: "Reserva paga (público)",        desc: "Qualquer pessoa pode reservar" },
                      { val: "misto",   label: "Misto",                         desc: "Sócio gratuito + visitante pago" },
                    ] as const).map(({ val, label, desc }) => {
                      const active = reservaModelo === val;
                      return (
                        <label key={val} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-all select-none ${
                          active ? "border-eid-primary-500/40 bg-eid-primary-500/8" : "border-[color:var(--eid-border-subtle)] hover:border-eid-primary-500/25"
                        }`}>
                          <input type="radio" name="reserva_modelo" value={val} checked={active}
                            onChange={() => setReservaModelo(val)} className="sr-only" />
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-bold ${active ? "text-eid-fg" : "text-eid-text-secondary"}`}>{label}</p>
                            <p className="text-[10px] text-eid-text-secondary">{desc}</p>
                          </div>
                          {active && (
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-eid-primary-500">
                              <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none">
                                <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <input
                    name="reserva_notas"
                    value={reservaNotas}
                    onChange={(e) => setReservaNotas(e.target.value)}
                    placeholder="Observações"
                    className="eid-input-dark mt-2 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                  />
                  <div className="mt-3">
                    <EidFilePicker
                      name="espaco_documento"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      label="Enviar documento"
                      hint="Comprovante do local (obrigatório para análise pelo administrador)"
                    />
                  </div>
                  <input
                    name="espaco_doc_msg"
                    placeholder="Observação para aprovação (opcional)"
                    className="eid-input-dark mt-2 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                  />
                </section>
              ) : null}

              <button
                type="submit"
                disabled={pending || !extrasValid}
                className="eid-btn-primary w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50"
              >
                {pending ? "Salvando…" : "Continuar"}
              </button>
            </form>
          ) : null}

          {step === "perfil" ? (
            <form onSubmit={submitPerfil} className="mt-6 space-y-4">
              <section className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4 space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-eid-primary-500">
                  Resumo antes de concluir
                </h2>

                {/* Quem você é */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary mb-1.5">
                    Quem você é na plataforma
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLES.filter((r) => papeis.has(r.id)).length > 0
                      ? ROLES.filter((r) => papeis.has(r.id)).map((r) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center rounded-full border border-eid-primary-500/30 bg-eid-primary-500/8 px-2.5 py-0.5 text-xs font-semibold text-eid-primary-400"
                          >
                            {r.titulo}
                          </span>
                        ))
                      : <span className="text-xs text-eid-text-secondary">Não definido</span>}
                  </div>
                </div>

                {/* Esportes */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary mb-1.5">
                    Esportes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...esportesSel].length > 0
                      ? [...esportesSel].map((id) => {
                          const nome = esportes.find((e) => e.id === id)?.nome;
                          return nome ? (
                            <span key={id}
                              className="inline-flex items-center rounded-full border border-[color:var(--eid-border-subtle)] px-2.5 py-0.5 text-xs font-semibold text-eid-fg"
                            >
                              {nome}
                            </span>
                          ) : null;
                        })
                      : <span className="text-xs text-eid-text-secondary">Não definido</span>}
                  </div>
                </div>

                {/* Experiência (atleta/professor) — por esporte */}
                {hasAtletaProfessor && Object.keys(esportesExp).length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary mb-1.5">
                      Experiência por esporte
                    </p>
                    <div className="space-y-1">
                      {Object.entries(esportesExp).map(([idStr, val]) => {
                        const nome = esportes.find((e) => e.id === Number(idStr))?.nome ?? `Esporte ${idStr}`;
                        const label = formatSportExpLabel(String(val));
                        return (
                          <div key={idStr} className="flex items-center justify-between">
                            <span className="text-xs text-eid-text-secondary">{nome}</span>
                            <span className="text-xs font-semibold text-eid-fg">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Espaço */}
                {hasEspaco && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary mb-1">
                      Espaço / arena
                    </p>
                    <span className="text-xs font-semibold text-eid-fg">
                      {espacoNome || <span className="text-eid-text-secondary font-normal">Nome não definido</span>}
                    </span>
                  </div>
                )}

                {hasAnyProfessorSport ? (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-eid-text-secondary mb-1.5">
                      Perfil profissional
                    </p>
                    <div className="space-y-1 text-xs text-eid-text-secondary">
                      {professorHeadline ? <p><span className="text-eid-fg font-semibold">Headline:</span> {professorHeadline}</p> : null}
                      {professorAceitaNovosAlunos ? <p>Aceitando novos alunos.</p> : <p>No momento não está aceitando novos alunos.</p>}
                      {professorPerfilPublicado ? <p>Perfil público de professor ativado.</p> : <p>Perfil de professor ainda não publicado.</p>}
                    </div>
                  </div>
                ) : null}
              </section>
              <div className="flex items-center gap-3">
                {hasFotoSelecionada ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)]">
                    <img
                      src={fotoPreviewUrl ?? ""}
                      alt="Prévia da foto"
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: `${fotoPosX}% ${fotoPosY}%`,
                        transform: `scale(${fotoZoom})`,
                      }}
                    />
                  </div>
                ) : profileInitial.avatarUrl ? (
                  <img
                    src={profileInitial.avatarUrl}
                    alt="Avatar atual"
                    className="h-16 w-16 rounded-full border border-[color:var(--eid-border-subtle)] object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-eid-primary-500/60 text-xs text-eid-primary-300">
                    Sem foto
                  </div>
                )}
                <div className="flex-1">
                  <label className="text-sm font-medium text-eid-fg">Foto de perfil</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fotoCameraInputRef.current?.click()}
                      className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-fg transition hover:border-eid-primary-500/40"
                    >
                      Tirar foto (câmera)
                    </button>
                    <button
                      type="button"
                      onClick={() => fotoGaleriaInputRef.current?.click()}
                      className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-fg transition hover:border-eid-primary-500/40"
                    >
                      Enviar da galeria
                    </button>
                  </div>
                  <input
                    ref={fotoCameraInputRef}
                    type="file"
                    name="foto_camera"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                  <input
                    ref={fotoGaleriaInputRef}
                    type="file"
                    name="foto_galeria"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                  <input ref={fotoInputRef} type="file" name="foto" accept="image/*" onChange={handleFotoChange} className="hidden" />
                  {fotoSelecionadaNome ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-[11px] text-eid-text-secondary">Arquivo: {fotoSelecionadaNome}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="text-[11px] text-eid-text-secondary">
                          Posição horizontal
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={fotoPosX}
                            onChange={(e) => setFotoPosX(Number(e.target.value))}
                            className="mt-1 w-full"
                          />
                        </label>
                        <label className="text-[11px] text-eid-text-secondary">
                          Posição vertical
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={fotoPosY}
                            onChange={(e) => setFotoPosY(Number(e.target.value))}
                            className="mt-1 w-full"
                          />
                        </label>
                        <label className="text-[11px] text-eid-text-secondary sm:col-span-2">
                          Zoom
                          <input
                            type="range"
                            min={1}
                            max={2.5}
                            step={0.05}
                            value={fotoZoom}
                            onChange={(e) => setFotoZoom(Number(e.target.value))}
                            className="mt-1 w-full"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={removeFotoSelecionada}
                        className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2.5 py-1 text-[11px] font-semibold text-eid-fg transition hover:border-eid-primary-500/40"
                      >
                        Remover foto selecionada
                      </button>
                    </div>
                  ) : null}
                  <p className="mt-1 text-[11px] text-eid-text-secondary">
                    Apenas foto (JPG/PNG/WEBP), recomendado até 5MB.
                  </p>
                </div>
              </div>

              <input
                name="nome"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
                className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
              />
              <input
                name="username"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, "")
                      .slice(0, 24)
                  )
                }
                placeholder="@usuario (opcional)"
                className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
              />
              <p className="text-[11px] text-eid-text-secondary">
                Use de 3 a 24 caracteres: letras minúsculas, números e sublinhado (_).
              </p>
              <input
                name="localizacao"
                required
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                placeholder="Cidade / Estado"
                className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
              />
              <input
                name="estilo_jogo"
                value={estiloJogo}
                onChange={(e) => setEstiloJogo(e.target.value)}
                placeholder={hasAnyProfessorSport && !hasAnyAthleteSport ? "Metodologia / especialidade (opcional)" : "Estilo de jogo (opcional)"}
                className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
              />
              <textarea
                name="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={hasAnyProfessorSport ? "Bio pública curta (opcional)" : "Bio curta (opcional)"}
                rows={3}
                className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
              />
              <div>
                <p className="mb-2 text-xs font-semibold text-eid-text-secondary uppercase tracking-wider">
                  Disponibilidade semanal (opcional)
                </p>
                <DisponibilidadePicker
                  value={disponibilidadeSemanaJson}
                  onChange={setDisponibilidadeSemanaJson}
                />
                <input type="hidden" name="disponibilidade_semana_json" value={disponibilidadeSemanaJson} />
              </div>

              {hasAnyAthleteSport ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      name="altura_cm"
                      min={50}
                      max={260}
                      required
                      value={alturaCm}
                      onChange={(e) => setAlturaCm(e.target.value)}
                      placeholder="Altura (cm)"
                      className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
                    />
                    <input
                      type="number"
                      name="peso_kg"
                      min={20}
                      max={300}
                      required
                      value={pesoKg}
                      onChange={(e) => setPesoKg(e.target.value)}
                      placeholder="Peso (kg)"
                      className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
                    />
                  </div>
                  {/* Mão dominante — segmented control */}
                  <input type="hidden" name="lado" value={lado} />
                  <div className="inline-flex rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-1 gap-1">
                    {([
                      { val: "Destro",   label: "Destro" },
                      { val: "Canhoto",  label: "Canhoto" },
                      { val: "Ambos",    label: "Ambidestro" },
                    ] as const).map(({ val, label }) => {
                      const active = lado === val;
                      return (
                        <button key={val} type="button" onClick={() => setLado(val)}
                          className={`cursor-pointer rounded-lg px-4 py-1.5 text-xs font-semibold transition-all select-none ${
                            active ? "bg-eid-primary-500 text-white shadow-sm" : "text-eid-text-secondary hover:text-eid-fg"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}

              <button
                type="submit"
                disabled={pending || !perfilValid}
                className="eid-btn-primary w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50"
              >
                {pending ? (hasFotoSelecionada ? "Enviando foto…" : "Finalizando…") : "Finalizar e entrar no painel"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </main>
  );
}
