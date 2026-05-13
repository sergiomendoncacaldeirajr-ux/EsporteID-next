"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LogoFull } from "@/components/brand/logo-full";
import { OnboardingTopbar } from "@/components/onboarding/onboarding-topbar";
import {
  esporteModoTemAtleta,
  esporteModoTemProfessor,
  type ProfessorModoEsportivo,
  type ProfessorObjetivoPlataforma,
  type ProfessorTipoAtuacao,
} from "@/lib/professor/constants";
import { prepareAvatarForUpload } from "@/lib/images/prepare-avatar-upload";
import { attachFileToInput, isNativeCameraAvailable, pickNativeImage } from "@/lib/native/camera";
import {
  CONTRATO_OPERADOR_ESPACO_PARAGRAFOS,
  CONTRATO_OPERADOR_ESPACO_TITULO,
} from "@/lib/legal/contrato-operador-espaco";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { normalizarPapeisContaPrincipal } from "@/lib/roles";
import { useUsernameCheck } from "@/lib/hooks/use-username-check";

/* ── Seletor de localização via GPS ────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const acceptsImage = !accept || accept.includes("image") || accept.includes(".jpg") || accept.includes(".jpeg") || accept.includes(".png") || accept.includes(".webp");

  async function pickWithNativeCamera() {
    if (!isNativeCameraAvailable() || !acceptsImage) {
      ref.current?.click();
      return;
    }
    try {
      const file = await pickNativeImage("camera");
      if (!file) return;
      attachFileToInput(ref.current, file);
      setFileName(file.name);
    } catch {
      ref.current?.click();
    }
  }

  return (
    <div>
      {hint && <p className="mb-1.5 text-[11px] text-eid-text-secondary">{hint}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={pickWithNativeCamera}
          className="flex items-center gap-1.5 rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-card px-3 py-1.5 text-xs font-semibold text-eid-fg transition hover:border-eid-primary-500/40 hover:bg-eid-primary-500/5"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-eid-text-secondary" fill="none">
            <path d="M8 2v8M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          {label}
        </button>
        {acceptsImage ? (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-text-secondary transition hover:border-eid-primary-500/40 hover:text-eid-fg"
          >
            Arquivo
          </button>
        ) : null}
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

import {
  salvarPapeisOnboarding,
  salvarEsportesOnboarding,
  salvarExtrasOnboarding,
  salvarPerfilOnboarding,
  type OnboardingActionResult,
} from "./actions";
import { EnderecoAssistFields } from "@/components/locais/endereco-assist-fields";
import { LocalSelectAutocomplete } from "@/components/locais/local-select-autocomplete";
import { LocalClaimSearch, type LocalClaimItem } from "@/components/locais/local-claim-search";
import { TeamShieldControl } from "@/components/perfil/team-shield-control";

const ONBOARDING_DRAFT_KEY_PREFIX = "eid_onboarding_draft_v1";

const ROLE_OPTIONS = [
  {
    id: "atleta",
    titulo: "Atleta / Usuário",
    desc: "Perfil com painel esportivo, ranking e desafios.",
  },
  {
    id: "professor",
    titulo: "Professor / Técnico",
    desc: "Acompanha alunos e pode aparecer no ecossistema como referência.",
  },
  {
    id: "organizador",
    titulo: "Organizador de torneios",
    desc: "Cria e gerencia eventos (liberado conforme as regras do app).",
  },
  {
    id: "espaco",
    titulo: "Clubes / Arenas / Espaços",
    desc: "Quadra, campo, piscina, clube — cadastra o local e os esportes atendidos.",
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
    suportaConfronto: boolean;
  }[];
  locais: { id: number; nome: string; localizacao: string; donoUsuarioId: string | null; endereco?: string; numero?: string; bairro?: string; cidade?: string; estado?: string; cep?: string; complemento?: string; lat?: string; lng?: string }[];
  selectedPapeis: string[];
  roleModes: {
    professor: boolean;
    organizador: boolean;
    espaco: boolean;
  };
  roleFeatureModes: {
    professor: "ativo" | "em_breve" | "desenvolvimento" | "teste";
    organizador: "ativo" | "em_breve" | "desenvolvimento" | "teste";
    espaco: "ativo" | "em_breve" | "desenvolvimento" | "teste";
  };
  selectedEsportes: number[];
  selectedSportModes: Record<number, ProfessorModoEsportivo>;
  selectedProfessorObjetivos: Record<number, ProfessorObjetivoPlataforma>;
  selectedProfessorTipos: Record<number, ProfessorTipoAtuacao[]>;
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
    orgNovoLocalNumero: string;
    orgNovoLocalBairro: string;
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
  roleModes,
  roleFeatureModes,
  selectedEsportes,
  selectedSportModes,
  selectedProfessorObjetivos,
  selectedProfessorTipos,
  extrasInitial,
  profileInitial,
}: Props) {
  const continueButtonClass =
    "eid-btn-primary w-full !min-h-[3.5rem] rounded-2xl !px-5 !py-3.5 !text-base !font-extrabold tracking-wide disabled:opacity-50";
  const roles = useMemo(
    () =>
      ROLE_OPTIONS.map((role) => ({
        ...role,
        enabled:
          role.id === "atleta"
            ? true
            : role.id === "professor"
              ? roleModes.professor
              : role.id === "organizador"
                ? roleModes.organizador
                : roleModes.espaco,
        featureMode:
          role.id === "atleta"
            ? "ativo"
            : role.id === "professor"
              ? roleFeatureModes.professor
              : role.id === "organizador"
                ? roleFeatureModes.organizador
                : roleFeatureModes.espaco,
      })),
    [roleModes, roleFeatureModes]
  );
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
  const [esporteModes, setEsporteModes] = useState<Record<number, ProfessorModoEsportivo>>(selectedSportModes);
  const [professorObjetivos, setProfessorObjetivos] =
    useState<Record<number, ProfessorObjetivoPlataforma>>(selectedProfessorObjetivos);
  const [professorTipos, setProfessorTipos] =
    useState<Record<number, ProfessorTipoAtuacao[]>>(selectedProfessorTipos);
  const [expModo, setExpModo] = useState<"aprox" | "exato">(extrasInitial.expModo);
  const [expAprox, setExpAprox] = useState<"menos_1" | "1_3" | "mais_3">(extrasInitial.expAprox);
  const [expMes, setExpMes] = useState<string>(extrasInitial.expMes ? String(extrasInitial.expMes) : "");
  const [expAno, setExpAno] = useState<string>(extrasInitial.expAno ? String(extrasInitial.expAno) : "");
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
  const [orgNovoLocalReivindicarId, setOrgNovoLocalReivindicarId] = useState<number | null>(null);
  const [orgNovoLocalNome, setOrgNovoLocalNome] = useState<string>("");
  const [orgNovoLocalEndereco, setOrgNovoLocalEndereco] = useState<string>("");
  const [orgNovoLocalNumero, setOrgNovoLocalNumero] = useState<string>(extrasInitial.orgNovoLocalNumero);
  const [orgNovoLocalBairro, setOrgNovoLocalBairro] = useState<string>(extrasInitial.orgNovoLocalBairro);
  const [orgNovoLocalCidade, setOrgNovoLocalCidade] = useState<string>("");
  const [orgNovoLocalEstado, setOrgNovoLocalEstado] = useState<string>("");
  const [orgNovoLocalCep, setOrgNovoLocalCep] = useState<string>("");
  const [orgNovoLocalLat, setOrgNovoLocalLat] = useState<string>("");
  const [orgNovoLocalLng, setOrgNovoLocalLng] = useState<string>("");
  const [espacoReivindicarId, setEspacoReivindicarId] = useState<number | null>(null);
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
  const [espacoAddressLoading, setEspacoAddressLoading] = useState(false);
  const [aceiteContratoEspaco, setAceiteContratoEspaco] = useState(false);
  const [nome, setNome] = useState<string>(profileInitial.nome);
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
    // Metros (ex: 1,72) → cm
    if (num >= 0.5 && num < 3) return String(Math.round(num * 100));
    // Cm com decimal (ex: 175,5) → inteiro
    if (num >= 50) return String(Math.floor(num));
    return s;
  }
  /** Converte valor de altura para número em cm (aceita metros ou cm). */
  function alturaParaCm(raw: string): number {
    const num = parseFloat(raw.replace(",", "."));
    if (isNaN(num) || num <= 0) return NaN;
    if (num >= 0.5 && num < 3) return Math.round(num * 100);
    return Math.floor(num);
  }
  const [username, setUsername] = useState<string>(profileInitial.username);
  const usernameStatus = useUsernameCheck(username, "profiles", userId);
  const [localizacao, setLocalizacao] = useState<string>(profileInitial.localizacao);
  const [locGeoStatus, setLocGeoStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [locGeoError, setLocGeoError] = useState<string | null>(null);
  const [alturaCm, setAlturaCm] = useState<string>(
    profileInitial.alturaCm ? String(profileInitial.alturaCm) : ""
  );
  const [pesoKg, setPesoKg] = useState<string>(
    profileInitial.pesoKg ? String(profileInitial.pesoKg) : ""
  );
  const [lado, setLado] = useState<string>(profileInitial.lado ?? "");
  const [bio, setBio] = useState<string>(profileInitial.bio);
  const fotoInputRef = useRef<HTMLInputElement | null>(null);
  const fotoCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fotoGaleriaInputRef = useRef<HTMLInputElement | null>(null);
  const topAnchorRef = useRef<HTMLDivElement | null>(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);
  const [fotoPosX, setFotoPosX] = useState<number>(50);
  const [fotoPosY, setFotoPosY] = useState<number>(50);
  const [fotoZoom, setFotoZoom] = useState<number>(1);
  const [fotoSelecionadaNome, setFotoSelecionadaNome] = useState<string | null>(null);
  const [fotoPreparando, setFotoPreparando] = useState(false);
  const [fotoErro, setFotoErro] = useState<string | null>(null);
  const [fotoActionOpen, setFotoActionOpen] = useState(false);
  const [fotoEditorOpen, setFotoEditorOpen] = useState(false);
  const [fotoEditorMode, setFotoEditorMode] = useState<"add" | "edit">("add");
  const [fotoModalMounted, setFotoModalMounted] = useState(false);
  const didHydrateFromServerRef = useRef(false);
  const forceResetKey = `${draftKey}:force_reset`;
  const lastServerPapeisKeyRef = useRef<string | null>(null);

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
    setFotoModalMounted(true);
  }, []);

  useEffect(() => {
    const normalized = normalizarPapeisContaPrincipal(selectedPapeis);
    const key = [...normalized].sort().join("|");
    if (lastServerPapeisKeyRef.current === key) return;
    lastServerPapeisKeyRef.current = key;
    setPapeis(new Set(normalized));
    if (!normalized.includes("espaco")) setAceiteContratoEspaco(false);
  }, [selectedPapeis]);

  useEffect(() => {
    setEsportesSel(new Set(selectedEsportes));
  }, [selectedEsportes]);

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
            esporteModes: {} as Record<number, ProfessorModoEsportivo>,
            professorObjetivos: {} as Record<number, ProfessorObjetivoPlataforma>,
            professorTipos: {} as Record<number, ProfessorTipoAtuacao[]>,
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
        orgNovoLocalNumero: string;
        orgNovoLocalBairro: string;
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
        espacoLat: string;
        espacoLng: string;
        aceiteContratoEspaco: boolean;
        nome: string;
        username: string;
        localizacao: string;
        alturaCm: string;
        pesoKg: string;
        lado: string;
        bio: string;
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
      if (draft.esporteModes) setEsporteModes(draft.esporteModes);
      if (draft.professorObjetivos) setProfessorObjetivos(draft.professorObjetivos);
      if (draft.professorTipos) setProfessorTipos(draft.professorTipos);
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
      if (typeof draft.orgNovoLocalNumero === "string") setOrgNovoLocalNumero(draft.orgNovoLocalNumero);
      if (typeof draft.orgNovoLocalBairro === "string") setOrgNovoLocalBairro(draft.orgNovoLocalBairro);
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
      if (typeof draft.espacoLat === "string") setEspacoLat(draft.espacoLat);
      if (typeof draft.espacoLng === "string") setEspacoLng(draft.espacoLng);
      if (typeof draft.aceiteContratoEspaco === "boolean") setAceiteContratoEspaco(draft.aceiteContratoEspaco);
      if (typeof draft.nome === "string") setNome(draft.nome);
      if (typeof draft.username === "string") setUsername(draft.username);
      if (typeof draft.localizacao === "string") setLocalizacao(draft.localizacao);
      if (typeof draft.alturaCm === "string") setAlturaCm(draft.alturaCm);
      if (typeof draft.pesoKg === "string") setPesoKg(draft.pesoKg);
      if (typeof draft.lado === "string") setLado(draft.lado);
      if (typeof draft.bio === "string") setBio(draft.bio);
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
      orgNovoLocalNumero,
      orgNovoLocalBairro,
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
      espacoLat,
      espacoLng,
      aceiteContratoEspaco,
      nome,
      username,
      localizacao,
      alturaCm,
      pesoKg,
      lado,
      bio,
    };
    window.localStorage.setItem(draftKey, JSON.stringify(payload));
  }, [
    aceiteContratoEspaco,
    alturaCm,
    espacoEsportes,
    espacoNome,
    esportesSel,
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
    orgEsporteId,
    orgEsportes,
    orgLocalModo,
    orgLocalId,
    orgLocalMsg,
    orgNovoLocalNome,
    orgNovoLocalEndereco,
    orgNovoLocalNumero,
    orgNovoLocalBairro,
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
  const perfilAlturaNum = alturaCm.trim() ? alturaParaCm(alturaCm) : NaN;
  const perfilPesoNum = pesoKg.trim() ? parseFloat(pesoKg.replace(",", ".")) : NaN;
  const hasFotoSelecionada = Boolean(fotoPreviewUrl);
  const hasFotoParaFinalizar =
    hasFotoSelecionada || Boolean(profileInitial.avatarUrl && profileInitial.avatarUrl.trim().length > 0);

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
      if (orgNovoLocalEndereco.trim().length < 3) return false;
      if (orgNovoLocalNumero.trim().length < 1) return false;
      if (orgNovoLocalCidade.trim().length < 2) return false;
      if (orgNovoLocalEstado.trim().length < 2) return false;
    }
    if (hasEspaco) {
      if (espacoEndereco.trim().length < 3) return false;
      if (espacoNumero.trim().length < 1) return false;
      if (espacoCidade.trim().length < 2) return false;
      if (espacoEstado.trim().length < 2) return false;
      if (espacoEsportes.size === 0) return false;
      if (!aceiteContratoEspaco) return false;
    }
    return true;
  }, [
    aceiteContratoEspaco,
    espacoCidade,
    espacoEndereco,
    espacoEstado,
    espacoNome,
    espacoNumero,
    espacoEsportes,
    hasEspaco,
    hasOrganizador,
    orgEsportes,
    orgLocalId,
    orgLocalModo,
    orgNovoLocalCidade,
    orgNovoLocalEndereco,
    orgNovoLocalEstado,
    orgNovoLocalNome,
    orgNovoLocalNumero,
  ]);

  const perfilValid = useMemo(() => {
    if (nome.trim().length < 3 || localizacao.trim().length < 3) return false;
    const uname = username.trim().toLowerCase();
    if (uname && !/^[a-z0-9_]{3,24}$/.test(uname)) return false;
    if (!hasFotoParaFinalizar) return false;
    if (hasAnyAthleteSport) {
      const alturaRaw = alturaCm.trim();
      const pesoRaw = pesoKg.trim();
      if (alturaRaw.length > 0 && (isNaN(perfilAlturaNum) || Math.floor(perfilAlturaNum) < 50 || Math.floor(perfilAlturaNum) > 260)) {
        return false;
      }
      if (pesoRaw.length > 0 && (isNaN(perfilPesoNum) || Math.floor(perfilPesoNum) < 20 || Math.floor(perfilPesoNum) > 300)) {
        return false;
      }
      if (lado && !["Destro", "Canhoto", "Ambos"].includes(lado)) return false;
    }
    return true;
  }, [
    alturaCm,
    hasAnyAthleteSport,
    hasFotoParaFinalizar,
    lado,
    localizacao,
    nome,
    perfilAlturaNum,
    perfilPesoNum,
    pesoKg,
    username,
  ]);

  /** Erros que bloqueiam o botão final — exibidos acima do submit. */
  const perfilErros = useMemo(() => {
    const erros: Array<{ campo: string; msg: string; onFix?: () => void }> = [];
    if (nome.trim().length < 3)
      erros.push({ campo: "nome", msg: "Nome muito curto — mínimo 3 letras" });
    if (localizacao.trim().length < 3)
      erros.push({ campo: "localizacao", msg: "Localização não preenchida — toque em Detectar" });
    if (!hasFotoParaFinalizar)
      erros.push({ campo: "foto", msg: "Adicione uma foto de perfil para continuar" });
    const uname = username.trim().toLowerCase();
    if (uname && !/^[a-z0-9_]{3,24}$/.test(uname))
      erros.push({ campo: "username", msg: "Username inválido — use letras, números e _ (3–24 chars)" });
    if (uname && usernameStatus === "taken")
      erros.push({ campo: "username", msg: `@${uname} já está em uso — escolha outro username` });
    if (hasAnyAthleteSport) {
      const alturaRaw = alturaCm.trim();
      if (alturaRaw.length > 0 && (isNaN(perfilAlturaNum) || Math.floor(perfilAlturaNum) < 50 || Math.floor(perfilAlturaNum) > 260))
        erros.push({ campo: "altura", msg: "Altura inválida — informe entre 50 e 260 cm (ex: 172)" });
      const pesoRaw = pesoKg.trim();
      if (pesoRaw.length > 0 && (isNaN(perfilPesoNum) || Math.floor(perfilPesoNum) < 20 || Math.floor(perfilPesoNum) > 300))
        erros.push({ campo: "peso", msg: "Peso inválido — informe entre 20 e 300 kg (ex: 70)" });
    }
    return erros;
  }, [alturaCm, hasAnyAthleteSport, hasFotoParaFinalizar, localizacao, nome, perfilAlturaNum, perfilPesoNum, pesoKg, username, usernameStatus]);

  function applyResult(r: OnboardingActionResult) {
    if (!r.ok) {
      setMessage(r.message);
      const msg = r.message ?? "";
      if (/foto|imagem|processar|enviar|capa/i.test(msg)) {
        setFotoErro(msg);
      }
      return;
    }
    setFotoErro(null);
    setMessage(r.message ?? null);
    if (r.nextStep === "esportes") setStep("esportes");
    else if (r.nextStep === "extras") setStep("extras");
    else if (r.nextStep === "perfil") setStep("perfil");
    else if (r.nextStep === "espaco_onboarding") {
      window.localStorage.removeItem(draftKey);
      void (async () => {
        await fetch("/api/active-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context: "espaco" }),
        });
        router.replace("/espaco/onboarding");
        router.refresh();
      })();
      return;
    }
    else if (r.nextStep === "espaco_home") {
      window.localStorage.removeItem(draftKey);
      void (async () => {
        await fetch("/api/active-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context: "espaco" }),
        });
        router.replace("/espaco");
        router.refresh();
      })();
      return;
    } else if (r.nextStep === "dashboard") {
      window.localStorage.removeItem(draftKey);
      router.push("/dashboard");
      return;
    }
    /* Sem router.refresh() aqui: o wizard já avança no cliente + rascunho local; o refresh
       refazia a página inteira do servidor (várias queries) e deixava a troca de etapa lenta. */
  }

  function clearDraft() {
    const clearedDraft = {
      step: "papeis" as Step,
      papeis: [] as string[],
      esportesSel: [] as number[],
      esporteModes: {} as Record<number, ProfessorModoEsportivo>,
      professorObjetivos: {} as Record<number, ProfessorObjetivoPlataforma>,
      professorTipos: {} as Record<number, ProfessorTipoAtuacao[]>,
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
    setEsporteModes({});
    setProfessorObjetivos({});
    setProfessorTipos({});
    setExpModo(extrasInitial.expModo);
    setExpAprox(extrasInitial.expAprox);
    setExpMes(extrasInitial.expMes ? String(extrasInitial.expMes) : "");
    setExpAno(extrasInitial.expAno ? String(extrasInitial.expAno) : "");
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
    setOrgNovoLocalNumero(extrasInitial.orgNovoLocalNumero);
    setOrgNovoLocalBairro(extrasInitial.orgNovoLocalBairro);
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
    setAceiteContratoEspaco(false);
    setNome(profileInitial.nome);
    setUsername(profileInitial.username);
    setLocalizacao(profileInitial.localizacao);
    setAlturaCm(profileInitial.alturaCm ? String(profileInitial.alturaCm) : "");
    setPesoKg(profileInitial.pesoKg ? String(profileInitial.pesoKg) : "");
    setLado(profileInitial.lado ?? "");
    setBio(profileInitial.bio ?? "");
    setMessage("Rascunho local limpo. O onboarding foi reiniciado na primeira etapa.");
  }

  function togglePapel(id: string) {
    const role = roles.find((r) => r.id === id);
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
      } else {
        n.add(id);
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

  function submitPapeis(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (papeis.size === 0) {
      setMessage("Selecione um perfil para continuar.");
      return;
    }
    setMessage(null);
    const fd = new FormData();
    for (const p of papeis) {
      fd.append("papel", p);
    }
    startTransition(async () => applyResult(await salvarPapeisOnboarding(undefined, fd)));
  }

  function submitEsportes(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (esportesSel.size === 0) {
      setMessage("Selecione ao menos um esporte para continuar.");
      return;
    }
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => applyResult(await salvarEsportesOnboarding(undefined, fd)));
  }

  function submitExtras(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (hasOrganizador && orgEsportes.size === 0) {
      setMessage("Selecione ao menos um esporte para organização.");
      return;
    }
    if (hasOrganizador && orgLocalModo === "existente" && Number(orgLocalId) <= 0) {
      setMessage("Selecione um local existente para organizar eventos.");
      return;
    }
    if (hasOrganizador && orgLocalModo === "novo") {
      if (orgNovoLocalNome.trim().length < 3) {
        setMessage("Informe o nome do novo local (mínimo 3 caracteres).");
        return;
      }
      if (orgNovoLocalEndereco.trim().length < 3 || orgNovoLocalNumero.trim().length < 1) {
        setMessage("Informe endereço completo com número do novo local.");
        return;
      }
      if (orgNovoLocalCidade.trim().length < 2 || orgNovoLocalEstado.trim().length < 2) {
        setMessage("Preencha cidade e UF do novo local para continuar.");
        return;
      }
    }
    if (hasEspaco) {
      if (espacoNome.trim().length < 3) {
        setMessage("Informe o nome do espaço (mínimo 3 caracteres).");
        return;
      }
      if (espacoEsportes.size === 0) {
        setMessage("Selecione ao menos um esporte atendido no espaço.");
        return;
      }
      if (espacoEndereco.trim().length < 3) {
        setMessage("Informe o endereço do espaço.");
        return;
      }
      if (espacoNumero.trim().length < 1) {
        setMessage("Informe o número do endereço do espaço.");
        return;
      }
      if (espacoCidade.trim().length < 2 || espacoEstado.trim().length < 2) {
        setMessage("Preencha cidade e UF do espaço para continuar.");
        return;
      }
      if (!aceiteContratoEspaco) {
        setMessage("É obrigatório aceitar o contrato de operador de espaço antes de enviar para análise.");
        return;
      }
    }
    if (!extrasValid) {
      setMessage("Revise os campos desta etapa antes de continuar.");
      return;
    }
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => applyResult(await salvarExtrasOnboarding(undefined, fd)));
  }

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
            ? "Permissão de localização negada. Habilite nas configurações do navegador."
            : "Não foi possível obter a localização. Tente novamente."
        );
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
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
    // Normaliza medidas para o servidor (parseInt espera número simples)
    const alturaRawFd = String(fd.get("altura_cm") ?? "").trim();
    if (alturaRawFd) {
      const alturaNum = alturaParaCm(alturaRawFd);
      fd.set("altura_cm", isNaN(alturaNum) ? alturaRawFd.replace(",", ".") : String(alturaNum));
    }
    const pesoVal = String(fd.get("peso_kg") ?? "").trim();
    if (pesoVal) fd.set("peso_kg", pesoVal.replace(",", "."));
    startTransition(async () => applyResult(await salvarPerfilOnboarding(undefined, fd)));
  }

  async function processFotoFile(file: File | null | undefined, input?: HTMLInputElement | null) {
    if (!file) {
      if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl);
      setFotoPreviewUrl(null);
      setFotoSelecionadaNome(null);
      setFotoErro(null);
      return;
    }

    setFotoPreparando(true);
    setFotoErro(null);
    const prepared = await prepareAvatarForUpload(file);
    setFotoPreparando(false);

    if (!prepared.ok) {
      setFotoErro(prepared.message);
      if (input) input.value = "";
      return;
    }

    const dt = new DataTransfer();
    dt.items.add(prepared.file);
    if (fotoInputRef.current) {
      fotoInputRef.current.files = dt.files;
    }
    if (input && input !== fotoInputRef.current) {
      input.value = "";
    }
    if (fotoCameraInputRef.current && input !== fotoCameraInputRef.current) {
      fotoCameraInputRef.current.value = "";
    }
    if (fotoGaleriaInputRef.current && input !== fotoGaleriaInputRef.current) {
      fotoGaleriaInputRef.current.value = "";
    }

    const nextUrl = URL.createObjectURL(prepared.file);
    if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl);
    setFotoPreviewUrl(nextUrl);
    setFotoSelecionadaNome(prepared.file.name);
    setFotoPosX(50);
    setFotoPosY(50);
    setFotoZoom(1);
    setFotoEditorMode(hasFotoParaFinalizar ? "edit" : "add");
    setFotoActionOpen(false);
    setFotoEditorOpen(true);
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    await processFotoFile(e.currentTarget.files?.[0], e.currentTarget);
  }

  async function pickOnboardingFoto(source: "camera" | "gallery") {
    if (!isNativeCameraAvailable()) {
      if (source === "camera") fotoCameraInputRef.current?.click();
      else fotoGaleriaInputRef.current?.click();
      return;
    }
    try {
      const file = await pickNativeImage(source);
      await processFotoFile(file, null);
    } catch (error) {
      const message = String((error as { message?: string })?.message ?? "");
      if (!/cancel/i.test(message)) setFotoErro("Não foi possível abrir a câmera/galeria agora.");
    }
  }

  function removeFotoSelecionada() {
    if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl);
    setFotoPreviewUrl(null);
    setFotoSelecionadaNome(null);
    setFotoErro(null);
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
    setFotoActionOpen(false);
    setFotoEditorOpen(false);
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
      data-eid-onboarding-native
      data-eid-touch-ui
      className="eid-auth-bg eid-onboarding-native-shell flex w-full flex-1 flex-col items-center overflow-x-hidden px-4 pb-28 pt-14 text-eid-fg sm:px-6 sm:pt-7"
    >
      <OnboardingTopbar />
      <div ref={topAnchorRef} />
      <div className="w-full max-w-2xl pb-6">
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/"
            data-eid-skeleton="true"
            className="hidden text-[13px] text-eid-text-muted no-underline transition hover:text-eid-fg sm:inline-block"
          >
            ← Voltar ao início
          </Link>
        </div>

        <div data-eid-skeleton="true">
          <LogoFull className="mb-5 mt-1" />
        </div>

        <div className="eid-auth-card eid-onboarding-native-card p-6 sm:p-8">
          <div className="mb-5">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-action-500)_30%,var(--eid-card)),color-mix(in_srgb,var(--eid-action-500)_14%,var(--eid-card)))] text-[10px] font-black text-eid-action-300 ring-1 ring-eid-action-500/30">
                  {activeStepIndex + 1}
                </span>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-eid-action-400">
                  de {stepOrder.length} etapas
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={clearDraft}
                  disabled={pending}
                  className="rounded-lg border border-[color:var(--eid-border-subtle)] px-2.5 py-1 text-[10px] font-semibold text-eid-text-secondary transition hover:border-eid-primary-500/35 hover:text-eid-fg disabled:opacity-50"
                >
                  Limpar rascunho
                </button>
                {step !== "papeis" ? (
                  <button
                    type="button"
                    onClick={goBackStep}
                    disabled={pending}
                    className="rounded-lg border border-eid-primary-500/30 bg-eid-primary-500/8 px-2.5 py-1 text-[10px] font-semibold text-eid-primary-300 transition hover:bg-eid-primary-500/15 disabled:opacity-50"
                  >
                    ← Voltar
                  </button>
                ) : null}
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-eid-card/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--eid-action-400)_70%,#fff_30%),var(--eid-action-500))] shadow-[0_0_10px_-2px_rgba(249,115,22,0.5)] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {restoredDraftAt ? (
              <p className="mt-2 text-[10px] text-eid-text-secondary">
                Rascunho restaurado às {restoredDraftAt}.
              </p>
            ) : null}
          </div>

          <div className="mb-4 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_22%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-500)_10%,var(--eid-card)))] shadow-[0_0_16px_-5px_rgba(37,99,235,0.4)] ring-1 ring-eid-primary-500/25">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-eid-primary-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-primary-400">Configuração</p>
              <h1 className="text-lg font-black leading-tight text-eid-fg">Olá, {primeiroNome}!</h1>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-eid-text-secondary">
            {step === "papeis" &&
              "Escolha somente um perfil principal para esta conta. Depois você poderá ter outros perfis em painéis separados."}
            {step === "esportes" &&
              (hasProfessor
                ? "Selecione os esportes que você ensina e informe sua experiência em cada um."
                : "Selecione os esportes da sua conta Atleta / Usuário e configure como deseja jogar no desafio.")}
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
                {roles.map((r) => {
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
                          ? "border-eid-primary-500/55 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_14%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-500)_5%,var(--eid-card)))] shadow-[0_4px_16px_-6px_rgba(37,99,235,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]"
                          : "border-[rgba(37,99,235,0.1)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-card)_98%,var(--eid-primary-500)_2%),var(--eid-card))] hover:border-eid-primary-500/30 hover:shadow-[0_4px_12px_-6px_rgba(37,99,235,0.15)]"
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
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                            r.featureMode === "teste"
                              ? "border-eid-action-500/35 bg-eid-action-500/10 text-eid-action-400"
                              : r.featureMode === "em_breve"
                                ? "border-[color:var(--eid-border-subtle)] bg-eid-bg/60 text-eid-text-secondary"
                                : "border-red-500/30 bg-red-500/10 text-red-300"
                          }`}
                        >
                          {r.featureMode === "teste"
                            ? "Em teste"
                            : r.featureMode === "em_breve"
                              ? "Em breve"
                              : "Indisponível"}
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
                className={continueButtonClass}
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
                        ? (esporteModes[e.id] ?? (e.suportaConfronto ? "atleta" : "professor"))
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
                            {(e.suportaConfronto
                              ? ([
                                  { value: "atleta", label: "Atleta" },
                                  { value: "professor", label: "Professor" },
                                  { value: "ambos", label: "Ambos" },
                                ] as const)
                              : ([{ value: "professor", label: "Professor" }] as const)
                            ).map((opt) => {
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

                      {!temAtletaNoEsporte ? (
                        <p className="mt-3 rounded-lg border border-eid-action-500/30 bg-eid-action-500/10 px-2 py-1.5 text-[11px] text-eid-action-400">
                          Neste esporte você entrará apenas no fluxo de professor, sem desafio ou ranking competitivo.
                        </p>
                      ) : null}

                      <p className="mt-3 text-[10px] leading-snug text-eid-text-secondary">
                        Tempo de experiência no esporte você pode informar depois em{" "}
                        <strong className="text-eid-fg">Perfil</strong> ou em{" "}
                        <strong className="text-eid-fg">Conta → Esportes e EID</strong>.
                      </p>
                    </div>
                    );
                  })}
                </div>
              )}
              <button
                type="submit"
                disabled={pending || esportesSel.size === 0}
                className={continueButtonClass}
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
                      <LocalSelectAutocomplete
                        name="org_local_id"
                        value={orgLocalId}
                        onChange={setOrgLocalId}
                        placeholder="Digite o nome do local (mín. 3 letras)…"
                        minChars={3}
                        className="eid-input-dark mt-3 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                      />
                      <p className="mt-1 text-[11px] text-eid-text-secondary">
                        Busca por sugestão (3+ letras), priorizando locais mais próximos de você. Base atual: {locais.length} locais.
                      </p>
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
                      {orgNovoLocalReivindicarId && (
                        <input type="hidden" name="org_novo_local_reivindicar_id" value={orgNovoLocalReivindicarId} className="hidden" />
                      )}
                      <LocalClaimSearch
                        locais={locais as LocalClaimItem[]}
                        name="org_novo_local_nome"
                        value={orgNovoLocalNome}
                        onChange={setOrgNovoLocalNome}
                        onSelect={(item) => {
                          setOrgNovoLocalNome(item.nome);
                          setOrgNovoLocalEndereco(item.endereco ?? "");
                          setOrgNovoLocalNumero(item.numero ?? "");
                          setOrgNovoLocalBairro(item.bairro ?? "");
                          setOrgNovoLocalCidade(item.cidade ?? "");
                          setOrgNovoLocalEstado(item.estado ?? "");
                          setOrgNovoLocalCep(item.cep ?? "");
                          if (item.lat) setOrgNovoLocalLat(item.lat);
                          if (item.lng) setOrgNovoLocalLng(item.lng);
                          setOrgNovoLocalReivindicarId(item.id);
                        }}
                        onClear={() => setOrgNovoLocalReivindicarId(null)}
                        claimId={orgNovoLocalReivindicarId}
                        placeholder="Nome do local"
                        className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2"
                      />
                      <EnderecoAssistFields
                        endereco={orgNovoLocalEndereco}
                        setEndereco={setOrgNovoLocalEndereco}
                        numero={orgNovoLocalNumero}
                        setNumero={setOrgNovoLocalNumero}
                        bairro={orgNovoLocalBairro}
                        setBairro={setOrgNovoLocalBairro}
                        cidade={orgNovoLocalCidade}
                        setCidade={setOrgNovoLocalCidade}
                        estado={orgNovoLocalEstado}
                        setEstado={setOrgNovoLocalEstado}
                        cep={orgNovoLocalCep}
                        setCep={setOrgNovoLocalCep}
                        lat={orgNovoLocalLat}
                        lng={orgNovoLocalLng}
                        onCoords={(lat, lng) => {
                          setOrgNovoLocalLat(lat);
                          setOrgNovoLocalLng(lng);
                        }}
                        prefix="org_novo_local_"
                      />
                      <div className="sm:col-span-2">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">Logo do local (opcional)</p>
                        <TeamShieldControl
                          variant="espaco_logo"
                          fileInputName="org_novo_local_logo"
                          removeFlagName="org_novo_local_logo_remove"
                          currentUrl={null}
                        />
                      </div>
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
                  {espacoReivindicarId && (
                    <input type="hidden" name="espaco_reivindicar_id" value={espacoReivindicarId} />
                  )}
                  <LocalClaimSearch
                    locais={locais as LocalClaimItem[]}
                    name="espaco_nome"
                    value={espacoNome}
                    onChange={setEspacoNome}
                    onSelect={(item) => {
                      setEspacoNome(item.nome);
                      setEspacoEndereco(item.endereco ?? "");
                      setEspacoNumero(item.numero ?? "");
                      setEspacoBairro(item.bairro ?? "");
                      setEspacoCidade(item.cidade ?? "");
                      setEspacoEstado(item.estado ?? "");
                      setEspacoCep(item.cep ?? "");
                      setEspacoComplemento(item.complemento ?? "");
                      if (item.lat) setEspacoLat(item.lat);
                      if (item.lng) setEspacoLng(item.lng);
                      setEspacoReivindicarId(item.id);
                      // Se não há endereço detalhado no banco mas temos coordenadas, busca via reverse geocode
                      const missingAddress = !item.endereco;
                      const hasCoords = item.lat && item.lng && Number.isFinite(Number(item.lat));
                      if (missingAddress && hasCoords) {
                        setEspacoAddressLoading(true);
                        void fetch(`/api/geocode/reverse?lat=${item.lat}&lon=${item.lng}`)
                          .then((r) => r.ok ? r.json() : null)
                          .then((data: { address?: Record<string, string> } | null) => {
                            if (!data?.address) return;
                            const a = data.address;
                            const road = a.road ?? a.pedestrian ?? a.path ?? a.street_name ?? "";
                            const houseNum = a.house_number ?? "";
                            const suburb = a.suburb ?? a.neighbourhood ?? a.city_district ?? a.quarter ?? "";
                            const postcode = a.postcode ?? "";
                            if (road) setEspacoEndereco(road);
                            if (houseNum) setEspacoNumero(houseNum);
                            if (suburb) setEspacoBairro(suburb);
                            if (postcode) setEspacoCep(postcode);
                          })
                          .catch(() => undefined)
                          .finally(() => setEspacoAddressLoading(false));
                      }
                    }}
                    onClear={() => setEspacoReivindicarId(null)}
                    claimId={espacoReivindicarId}
                    placeholder="Nome público do local"
                    className="eid-input-dark mt-3 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                  />
                  {espacoAddressLoading && (
                    <p className="mt-2 text-[11px] text-eid-text-secondary animate-pulse">Buscando endereço pelo mapa…</p>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <EnderecoAssistFields
                      endereco={espacoEndereco}
                      setEndereco={setEspacoEndereco}
                      numero={espacoNumero}
                      setNumero={setEspacoNumero}
                      bairro={espacoBairro}
                      setBairro={setEspacoBairro}
                      cidade={espacoCidade}
                      setCidade={setEspacoCidade}
                      estado={espacoEstado}
                      setEstado={setEspacoEstado}
                      cep={espacoCep}
                      setCep={setEspacoCep}
                      complemento={espacoComplemento}
                      setComplemento={setEspacoComplemento}
                      lat={espacoLat}
                      lng={espacoLng}
                      onCoords={(lat, lng) => {
                        setEspacoLat(lat);
                        setEspacoLng(lng);
                      }}
                      prefix="espaco_"
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

                  <div className="mt-5 rounded-2xl border border-amber-500/35 bg-amber-500/5 p-4">
                    <input type="hidden" name="espaco_contrato_versao" value={LEGAL_VERSIONS.contratoOperadorEspaco} />
                    <h3 className="text-xs font-bold uppercase tracking-wide text-amber-200">
                      {CONTRATO_OPERADOR_ESPACO_TITULO}
                    </h3>
                    <p className="mt-1 text-[10px] text-amber-100/85">
                      Versão {LEGAL_VERSIONS.contratoOperadorEspaco} — leia com atenção. Este texto é um modelo jurídico;
                      recomendamos revisão por advogado. Os{" "}
                      <Link href="/termos" className="font-semibold text-amber-200 underline underline-offset-2">
                        Termos de Uso
                      </Link>{" "}
                      e a{" "}
                      <Link href="/privacidade" className="font-semibold text-amber-200 underline underline-offset-2">
                        Política de Privacidade
                      </Link>{" "}
                      continuam aplicáveis.
                    </p>
                    <div
                      className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 px-3 py-2 text-[11px] leading-relaxed text-eid-text-secondary"
                      tabIndex={0}
                    >
                      <ol className="list-decimal space-y-2 pl-4 marker:text-amber-400/90">
                        {CONTRATO_OPERADOR_ESPACO_PARAGRAFOS.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ol>
                    </div>
                    <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-3 py-2.5 text-xs text-eid-fg transition hover:border-amber-500/35">
                      <input
                        type="checkbox"
                        name="espaco_contrato_aceito"
                        checked={aceiteContratoEspaco}
                        onChange={(e) => setAceiteContratoEspaco(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[color:var(--eid-border-subtle)] text-eid-primary-500 focus:ring-eid-primary-500/40"
                      />
                      <span>
                        Declaro que li e aceito o contrato acima e que tenho poderes para vincular o espaço cadastrado.
                        Entendo que a validação final acontece depois de concluir o wizard do espaço.
                      </span>
                    </label>
                  </div>

                  <div className="mt-3">
                    <EidFilePicker
                      name="espaco_documento"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      label="Enviar documento"
                      hint="Comprovante do local (opcional nesta etapa; a validação final acontece no wizard)"
                    />
                  </div>
                  <input
                    name="espaco_doc_msg"
                    placeholder="Observação para validação final (opcional)"
                    className="eid-input-dark mt-2 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
                  />
                </section>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className={continueButtonClass}
              >
                {pending ? "Salvando…" : "Continuar"}
              </button>
            </form>
          ) : null}

          {step === "perfil" ? (
            <form onSubmit={submitPerfil} className="mt-6 space-y-4">
              {/* Resumo das etapas anteriores */}
              <section className="overflow-hidden rounded-xl border border-eid-primary-500/20 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_8%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-500)_3%,var(--eid-card))_55%,var(--eid-card))]">
                {/* Cabeçalho */}
                <div className="flex items-center gap-2 border-b border-eid-primary-500/12 bg-eid-primary-500/6 px-3 py-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-eid-primary-500/20 text-eid-primary-400">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="m5 12 4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-eid-primary-300">
                    Confira antes de finalizar
                  </h2>
                </div>

                {/* Linhas de resumo */}
                <div className="divide-y divide-eid-primary-500/8 px-3">
                  {/* Papel */}
                  <div className="flex items-center gap-2.5 py-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_18%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-500)_8%,var(--eid-card)))] text-eid-primary-400">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-eid-text-muted">Papel</p>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {roles.filter((r) => papeis.has(r.id)).length > 0
                          ? roles.filter((r) => papeis.has(r.id)).map((r) => (
                              <span key={r.id} className="inline-flex items-center rounded-full border border-eid-primary-500/35 bg-eid-primary-500/12 px-2 py-px text-[10px] font-semibold text-eid-primary-300">
                                {r.titulo}
                              </span>
                            ))
                          : <span className="text-[11px] text-eid-text-muted">Não definido</span>}
                      </div>
                    </div>
                  </div>

                  {/* Esportes */}
                  <div className="flex items-center gap-2.5 py-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-action-500)_18%,var(--eid-card)),color-mix(in_srgb,var(--eid-action-500)_8%,var(--eid-card)))] text-eid-action-400">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
                        <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-eid-text-muted">Esportes</p>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {[...esportesSel].length > 0
                          ? [...esportesSel].map((id) => {
                              const nomeEsporte = esportes.find((e) => e.id === id)?.nome;
                              return nomeEsporte ? (
                                <span key={id} className="inline-flex items-center rounded-full border border-eid-action-500/30 bg-eid-action-500/10 px-2 py-px text-[10px] font-semibold text-eid-action-400">
                                  {nomeEsporte}
                                </span>
                              ) : null;
                            })
                          : <span className="text-[11px] text-eid-text-muted">Não definido</span>}
                      </div>
                    </div>
                  </div>

                  {/* Espaço — condicional */}
                  {hasEspaco && (
                    <div className="flex items-center gap-2.5 py-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_18%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-500)_8%,var(--eid-card)))] text-eid-primary-400">
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" /><polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-eid-text-muted">Espaço / arena</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-eid-fg">
                          {espacoNome || <span className="font-normal text-eid-text-muted">Nome não definido</span>}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Professor — condicional */}
                  {hasAnyProfessorSport && (
                    <div className="flex items-start gap-2.5 py-2">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[linear-gradient(135deg,color-mix(in_srgb,var(--eid-primary-500)_18%,var(--eid-card)),color-mix(in_srgb,var(--eid-primary-500)_8%,var(--eid-card)))] text-eid-primary-400">
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 12v5c3 3 9 3 12 0v-5" strokeLinecap="round" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-eid-text-muted">Perfil profissional</p>
                        <div className="mt-0.5 space-y-px text-[10px] text-eid-text-secondary">
                          {professorHeadline ? <p><span className="font-semibold text-eid-fg">{professorHeadline}</span></p> : null}
                          <p>{professorAceitaNovosAlunos ? "✓ Aceitando novos alunos" : "✗ Não aceitando alunos agora"}</p>
                          <p>{professorPerfilPublicado ? "✓ Perfil público ativado" : "✗ Perfil não publicado ainda"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
              {/* Foto de perfil — zona clicável interativa */}
              <div className="flex flex-col items-center gap-3">
                <p className="self-start text-[11px] font-black uppercase tracking-[0.12em] text-eid-text-muted">
                  Foto de perfil <span className="text-eid-action-400">*</span>
                </p>
                <button
                  type="button"
                  onClick={() => setFotoActionOpen(true)}
                  className="group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full transition focus:outline-none"
                  aria-label={hasFotoParaFinalizar ? "Editar foto de perfil" : "Adicionar foto de perfil"}
                >
                  {/* Foto ou placeholder */}
                  {hasFotoSelecionada ? (
                    <Image
                      src={fotoPreviewUrl ?? ""}
                      alt="Prévia da foto"
                      fill
                      unoptimized
                      className="object-cover"
                      style={{ objectPosition: `${fotoPosX}% ${fotoPosY}%`, transform: `scale(${fotoZoom})` }}
                    />
                  ) : profileInitial.avatarUrl ? (
                    <Image
                      src={profileInitial.avatarUrl}
                      alt="Avatar atual"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-full border-2 border-dashed border-eid-primary-500/40 bg-[linear-gradient(145deg,color-mix(in_srgb,var(--eid-primary-500)_10%,var(--eid-card)),var(--eid-card))] transition group-hover:border-eid-primary-500/70 group-hover:bg-eid-primary-500/12">
                      <svg viewBox="0 0 24 24" className="h-7 w-7 text-eid-primary-400 transition group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span className="text-[10px] font-bold text-eid-primary-400">Adicionar foto</span>
                    </div>
                  )}

                  {/* Overlay ao hover quando já tem foto */}
                  {hasFotoParaFinalizar ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/50 opacity-0 transition group-hover:opacity-100">
                      <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span className="text-[10px] font-bold text-white">Editar</span>
                    </div>
                  ) : null}

                  {/* Loading spinner */}
                  {fotoPreparando ? (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55">
                      <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-white border-t-transparent" />
                    </div>
                  ) : null}
                </button>

                {/* Feedback */}
                {fotoPreparando ? (
                  <p className="text-[11px] font-medium text-eid-primary-300">Ajustando a foto…</p>
                ) : fotoSelecionadaNome ? (
                  <p className="flex items-center gap-1 text-[11px] text-eid-text-secondary">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M3 8l3 3 7-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {fotoSelecionadaNome}
                  </p>
                ) : (
                  <p className="text-center text-[11px] leading-relaxed text-eid-text-muted">
                    Câmera ou galeria · formatos comuns aceitos
                  </p>
                )}

                {fotoErro ? (
                  <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-center text-[11px] text-amber-200">
                    {fotoErro}
                  </p>
                ) : null}
              </div>

              {/* Inputs ocultos */}
              <input ref={fotoCameraInputRef} type="file" name="foto_camera" accept="image/*" capture="environment" onChange={handleFotoChange} className="hidden" />
              <input ref={fotoGaleriaInputRef} type="file" name="foto_galeria" accept="image/*" onChange={handleFotoChange} className="hidden" />
              <input ref={fotoInputRef} type="file" name="foto" accept="image/*" onChange={handleFotoChange} className="hidden" />

              {/* Modal: escolher fonte da foto */}
              {fotoModalMounted && fotoActionOpen
                ? createPortal(
                    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 p-3 sm:items-center motion-safe:animate-[fade-in_180ms_ease-out_both]">
                      <div className="w-full max-w-xs rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card p-4 shadow-2xl motion-safe:animate-[eid-content-block-enter_240ms_cubic-bezier(0.22,1,0.36,1)_both]">
                        <p className="text-[14px] font-black tracking-tight text-eid-fg">Foto de perfil</p>
                        <p className="mt-0.5 text-[11px] text-eid-text-secondary">Escolha como adicionar ou editar a foto.</p>
                        <div className="mt-3 grid gap-2">
                          <button
                            type="button"
                            onClick={() => void pickOnboardingFoto("camera")}
                            className="flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-4 py-3 text-sm font-semibold text-eid-fg transition hover:border-eid-primary-500/35 hover:bg-eid-primary-500/8"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-eid-primary-500/15 text-eid-primary-400">
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="13" r="4" />
                              </svg>
                            </span>
                            Tirar foto com câmera
                          </button>
                          <button
                            type="button"
                            onClick={() => void pickOnboardingFoto("gallery")}
                            className="flex items-center gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 px-4 py-3 text-sm font-semibold text-eid-fg transition hover:border-eid-primary-500/35 hover:bg-eid-primary-500/8"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-eid-primary-500/15 text-eid-primary-400">
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                              </svg>
                            </span>
                            Escolher da galeria
                          </button>
                          {hasFotoSelecionada ? (
                            <button
                              type="button"
                              onClick={() => { setFotoEditorMode("edit"); setFotoEditorOpen(true); setFotoActionOpen(false); }}
                              className="flex items-center gap-3 rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/8 px-4 py-3 text-sm font-semibold text-eid-primary-300 transition hover:border-eid-primary-500/55 hover:bg-eid-primary-500/14"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-eid-primary-500/20 text-eid-primary-400">
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                              Ajustar enquadramento
                            </button>
                          ) : null}
                          {hasFotoParaFinalizar ? (
                            <button
                              type="button"
                              onClick={removeFotoSelecionada}
                              className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/8 px-4 py-3 text-sm font-semibold text-rose-400 transition hover:border-rose-500/55"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 11v6M14 11v6" strokeLinecap="round" />
                                </svg>
                              </span>
                              Remover foto
                            </button>
                          ) : null}
                        </div>
                        <button type="button" onClick={() => setFotoActionOpen(false)} className="mt-3 w-full rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2.5 text-xs font-semibold text-eid-text-secondary transition hover:text-eid-fg">
                          Cancelar
                        </button>
                      </div>
                    </div>,
                    document.body,
                  )
                : null}
              {fotoModalMounted && fotoEditorOpen && hasFotoSelecionada
                ? createPortal(
                    <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/70 px-0 pb-0 motion-safe:animate-[fade-in_180ms_ease-out_both] sm:items-center sm:px-4">
                      <div className="w-full max-w-sm rounded-t-3xl border border-[color:var(--eid-border-subtle)] bg-eid-card shadow-2xl motion-safe:animate-[eid-content-block-enter_240ms_cubic-bezier(0.22,1,0.36,1)_both] sm:rounded-2xl">
                        {/* Handle (mobile) */}
                        <div className="flex justify-center pt-3 sm:hidden">
                          <div className="h-1 w-10 rounded-full bg-[color:var(--eid-border-subtle)]" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center gap-2 border-b border-[color:var(--eid-border-subtle)] px-4 py-3">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 text-eid-primary-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <p className="text-sm font-bold text-eid-fg">Ajustar foto</p>
                        </div>

                        <div className="p-4">
                          {/* Preview circular em tempo real */}
                          <div className="mb-4 flex flex-col items-center gap-2">
                            <div className="relative h-24 w-24 overflow-hidden rounded-full ring-2 ring-eid-primary-500/40 ring-offset-2 ring-offset-eid-card">
                              {fotoPreviewUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={fotoPreviewUrl}
                                  alt="Prévia"
                                  className="absolute inset-0 h-full w-full object-cover"
                                  style={{
                                    objectPosition: `${fotoPosX}% ${fotoPosY}%`,
                                    transform: `scale(${fotoZoom})`,
                                    transformOrigin: `${fotoPosX}% ${fotoPosY}%`,
                                  }}
                                />
                              )}
                            </div>
                            <p className="text-[10px] text-eid-text-muted">Prévia do recorte circular</p>
                          </div>

                          {/* Sliders */}
                          <div className="grid gap-3">
                            <label className="block">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-eid-text-secondary">Posição horizontal</span>
                                <span className="text-[10px] tabular-nums text-eid-text-muted">{fotoPosX}%</span>
                              </div>
                              <input type="range" min={0} max={100} value={fotoPosX} onChange={(e) => setFotoPosX(Number(e.target.value))} className="w-full accent-[#2563eb]" />
                            </label>
                            <label className="block">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-eid-text-secondary">Posição vertical</span>
                                <span className="text-[10px] tabular-nums text-eid-text-muted">{fotoPosY}%</span>
                              </div>
                              <input type="range" min={0} max={100} value={fotoPosY} onChange={(e) => setFotoPosY(Number(e.target.value))} className="w-full accent-[#2563eb]" />
                            </label>
                            <label className="block">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-eid-text-secondary">Zoom</span>
                                <span className="text-[10px] tabular-nums text-eid-text-muted">{fotoZoom.toFixed(2)}×</span>
                              </div>
                              <input type="range" min={1} max={2.5} step={0.05} value={fotoZoom} onChange={(e) => setFotoZoom(Number(e.target.value))} className="w-full accent-[#2563eb]" />
                            </label>
                          </div>

                          {/* Ações */}
                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setFotoEditorOpen(false)}
                              className="flex-1 rounded-xl border border-[color:var(--eid-border-subtle)] px-3 py-2.5 text-xs font-semibold text-eid-text-secondary transition hover:border-eid-primary-500/30 hover:text-eid-fg"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => setFotoEditorOpen(false)}
                              className="flex-1 rounded-xl bg-[linear-gradient(135deg,#2563EB,#1D4ED8)] px-3 py-2.5 text-xs font-bold text-white shadow-[0_6px_16px_-8px_rgba(37,99,235,0.7)] transition hover:brightness-105"
                            >
                              {fotoEditorMode === "add" ? "Usar esta foto" : "Salvar ajuste"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>,
                    document.body,
                  )
                : null}

              {/* hidden inputs que o server action ainda precisa */}
              <input type="hidden" name="bio" value="" />
              <input type="hidden" name="disponibilidade_semana_json" value="{}" />

              {/* Campos de identidade */}
              <div className="space-y-2.5">
                {/* Nome */}
                <div className={`flex h-10 min-w-0 items-center gap-2 overflow-hidden rounded-xl border px-3 transition focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] ${perfilErros.some(e => e.campo === "nome") ? "border-amber-500/60 bg-amber-500/6 focus-within:border-amber-500/80" : "border-[color:var(--eid-border-subtle)] focus-within:border-eid-primary-500/50"}`} style={{ background: perfilErros.some(e => e.campo === "nome") ? undefined : "var(--eid-field-bg)" }}>
                  <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${perfilErros.some(e => e.campo === "nome") ? "text-amber-400" : "text-eid-primary-500"}`} fill="currentColor" aria-hidden>
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                  <input
                    id="ob-nome"
                    name="nome"
                    required
                    value={nome}
                    onChange={(e) => setNome(formatarNome(e.target.value))}
                    placeholder="Nome completo"
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-eid-fg outline-none placeholder:text-eid-text-muted/90"
                  />
                </div>

                {/* Username */}
                <div>
                  <div className={`flex h-10 min-w-0 items-center gap-2 overflow-hidden rounded-xl border px-3 transition focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] ${perfilErros.some(e => e.campo === "username") ? "border-amber-500/60 bg-amber-500/6 focus-within:border-amber-500/80" : "border-[color:var(--eid-border-subtle)] focus-within:border-eid-primary-500/50"}`} style={{ background: perfilErros.some(e => e.campo === "username") ? undefined : "var(--eid-field-bg)" }}>
                    <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${perfilErros.some(e => e.campo === "username") ? "text-amber-400" : "text-eid-primary-500"}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" strokeLinecap="round" />
                    </svg>
                    <input
                      id="ob-username"
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
                      className="min-w-0 flex-1 border-0 bg-transparent text-sm text-eid-fg outline-none placeholder:text-eid-text-muted/90"
                    />
                  </div>
                  {username.trim() ? (
                    <div className="mt-1.5 flex items-center gap-1.5 pl-1 text-[11px]">
                      {usernameStatus === "checking" && (
                        <>
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-eid-text-muted border-t-transparent" />
                          <span className="text-eid-text-muted">Verificando...</span>
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
                      {usernameStatus === "invalid" && (
                        <span className="text-eid-text-muted">3–24 chars: letras minúsculas, números e _</span>
                      )}
                      {usernameStatus === "idle" && (
                        <span className="text-eid-text-muted">3–24 chars: letras minúsculas, números e _</span>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1.5 pl-1 text-[11px] text-eid-text-muted">
                      3–24 caracteres: letras minúsculas, números e sublinhado (_).
                    </p>
                  )}
                </div>

                {/* Localização — somente leitura, atualizada via GPS */}
                <div>
                  <div className={`flex h-10 min-w-0 items-center gap-2 overflow-hidden rounded-xl border px-3 transition ${
                    locGeoStatus === "ok"
                      ? "border-emerald-500/35 bg-emerald-500/6"
                      : perfilErros.some(e => e.campo === "localizacao")
                        ? "border-amber-500/60 bg-amber-500/6"
                        : "border-[color:var(--eid-border-subtle)]"
                  }`} style={locGeoStatus === "ok" || perfilErros.some(e => e.campo === "localizacao") ? {} : { background: "var(--eid-field-bg)" }}>
                    {locGeoStatus === "loading" ? (
                      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-eid-primary-500 border-t-transparent" />
                    ) : locGeoStatus === "ok" ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-eid-primary-500" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    )}
                    {/* Exibição da cidade — não editável */}
                    <input
                      name="localizacao"
                      required
                      readOnly
                      value={localizacao}
                      placeholder="Toque em Detectar para preencher"
                      className="min-w-0 flex-1 cursor-default truncate border-0 bg-transparent text-sm text-eid-fg outline-none placeholder:text-eid-text-muted/70"
                    />
                    {/* Botão de atualizar */}
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
                    <p className="mt-1.5 pl-1 text-[11px] text-amber-400">{locGeoError}</p>
                  ) : locGeoStatus === "ok" && localizacao ? (
                    <p className="mt-1.5 flex items-center gap-1 pl-1 text-[11px] text-emerald-400">
                      <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M2 6l2.5 2.5 5.5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Localização detectada com sucesso
                    </p>
                  ) : (
                    <p className="mt-1.5 pl-1 text-[11px] text-eid-text-muted">
                      Clique em &quot;Detectar&quot; para preencher automaticamente com sua cidade.
                    </p>
                  )}
                </div>
              </div>

              {/* Dados físicos — só para atletas */}
              {hasAnyAthleteSport ? (
                <div className="space-y-2.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-eid-text-muted">
                    Dados físicos <span className="font-normal normal-case tracking-normal">(opcional)</span>
                  </p>

                  <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                    {/* Altura */}
                    <div className={`flex h-10 min-w-0 items-center gap-2 overflow-hidden rounded-xl border px-3 transition focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] ${perfilErros.some(e => e.campo === "altura") ? "border-amber-500/60 bg-amber-500/6 focus-within:border-amber-500/80" : "border-[color:var(--eid-border-subtle)] focus-within:border-eid-primary-500/50"}`} style={{ background: perfilErros.some(e => e.campo === "altura") ? undefined : "var(--eid-field-bg)" }}>
                      <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${perfilErros.some(e => e.campo === "altura") ? "text-amber-400" : "text-eid-primary-500"}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M21 6H3M21 12H3M21 18H3" strokeLinecap="round" /><path d="M6 3v4M6 17v4M18 10v4" strokeLinecap="round" />
                      </svg>
                      <input
                        id="ob-altura"
                        type="text"
                        inputMode="decimal"
                        name="altura_cm"
                        value={alturaCm}
                        onChange={(e) => setAlturaCm(formatarMedida(e.target.value))}
                        onBlur={(e) => setAlturaCm(normalizarAltura(e.target.value))}
                        placeholder="Altura (cm)"
                        className="min-w-0 flex-1 border-0 bg-transparent text-sm text-eid-fg outline-none placeholder:text-eid-text-muted/90"
                      />
                    </div>

                    {/* Peso */}
                    <div className={`flex h-10 min-w-0 items-center gap-2 overflow-hidden rounded-xl border px-3 transition focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] ${perfilErros.some(e => e.campo === "peso") ? "border-amber-500/60 bg-amber-500/6 focus-within:border-amber-500/80" : "border-[color:var(--eid-border-subtle)] focus-within:border-eid-primary-500/50"}`} style={{ background: perfilErros.some(e => e.campo === "peso") ? undefined : "var(--eid-field-bg)" }}>
                      <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${perfilErros.some(e => e.campo === "peso") ? "text-amber-400" : "text-eid-primary-500"}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" strokeLinecap="round" />
                      </svg>
                      <input
                        id="ob-peso"
                        type="text"
                        inputMode="decimal"
                        name="peso_kg"
                        value={pesoKg}
                        onChange={(e) => setPesoKg(formatarMedida(e.target.value))}
                        placeholder="Peso (kg)"
                        className="min-w-0 flex-1 border-0 bg-transparent text-sm text-eid-fg outline-none placeholder:text-eid-text-muted/90"
                      />
                    </div>
                  </div>

                  {/* Mão dominante */}
                  <div className="relative flex h-10 min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] px-3 transition focus-within:border-eid-primary-500/50 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]" style={{ background: "var(--eid-field-bg)" }}>
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-eid-primary-500" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <select
                      name="lado"
                      value={lado}
                      onChange={(e) => setLado(e.target.value)}
                      style={{ backgroundColor: "transparent" }}
                      className={`h-full min-w-0 flex-1 appearance-none border-0 pr-5 text-sm outline-none [&>option]:bg-[#0b1220] [&>option]:text-white ${lado === "" ? "text-eid-text-muted/90" : "text-eid-fg"}`}
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
              ) : null}

              {/* Erros que bloqueiam o submit — clicáveis para focar o campo */}
              {perfilErros.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2.5">
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-amber-400">
                    Corrija para continuar
                  </p>
                  <ul className="space-y-1">
                    {perfilErros.map((e) => (
                      <li key={e.campo}>
                        <button
                          type="button"
                          onClick={() => {
                            if (e.campo === "foto") { fotoInputRef.current?.click(); return; }
                            if (e.campo === "localizacao") { detectarLocalizacao(); return; }
                            document.getElementById(`ob-${e.campo}`)?.focus();
                          }}
                          className="flex w-full items-start gap-2 text-left"
                        >
                          <svg viewBox="0 0 8 8" className="mt-[3px] h-2 w-2 shrink-0 fill-amber-400" aria-hidden>
                            <circle cx="4" cy="4" r="4" />
                          </svg>
                          <span className="text-[11px] leading-snug text-amber-300 underline-offset-2 hover:underline">
                            {e.msg}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={pending || !perfilValid || fotoPreparando}
                className={`${continueButtonClass} text-center leading-snug`}
              >
                {fotoPreparando
                  ? "Otimizando foto…"
                  : pending
                    ? hasFotoSelecionada
                      ? "Enviando foto…"
                      : "Criando seu perfil…"
                    : "Entrar no EsporteID →"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </main>
  );
}
