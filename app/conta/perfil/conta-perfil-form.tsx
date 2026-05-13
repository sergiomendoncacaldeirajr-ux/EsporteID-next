"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarPerfilOnboarding, type OnboardingActionResult } from "@/app/onboarding/actions";
import { CONTA_ESPORTES_EID_HREF } from "@/lib/routes/conta";
import { attachFileToInput, isNativeCameraAvailable, pickNativeImage } from "@/lib/native/camera";
import {
  detectCurrentLocation,
  geolocationErrorMessage,
  isGeolocationPositionError,
} from "@/lib/location/current-location";
import { normalizePtBrNameCase, normalizePtBrNameCaseLoose } from "@/lib/text/pt-br-name-case";
import { useUsernameCheck } from "@/lib/hooks/use-username-check";

type ProfileInitial = {
  nome: string;
  username: string;
  localizacao: string;
  alturaCm: number | null;
  pesoKg: number | null;
  lado: string | null;
  genero: string | null;
  avatarUrl: string | null;
  bio: string;
  estiloJogo: string;
  disponibilidadeSemanaJson: string;
};

type Props = {
  userId: string;
  hasAtletaProfessor: boolean;
  hasProfessor: boolean;
  profileInitial: ProfileInitial;
};

export function ContaPerfilForm({ userId, hasAtletaProfessor, hasProfessor, profileInitial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [nome, setNome] = useState(profileInitial.nome);
  const [username, setUsername] = useState(profileInitial.username);
  const usernameStatus = useUsernameCheck(username, "profiles", userId);
  const [localizacao, setLocalizacao] = useState(profileInitial.localizacao);
  const [locGeoStatus, setLocGeoStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [locGeoError, setLocGeoError] = useState<string | null>(null);
  const [alturaCm, setAlturaCm] = useState(profileInitial.alturaCm ? String(profileInitial.alturaCm) : "");
  const [pesoKg, setPesoKg] = useState(profileInitial.pesoKg ? String(profileInitial.pesoKg) : "");
  const [lado, setLado] = useState(profileInitial.lado ?? "");
  const [bio, setBio] = useState(profileInitial.bio);
  const [genero, setGenero] = useState(String(profileInitial.genero ?? "").trim());
  const [estiloJogo, setEstiloJogo] = useState(profileInitial.estiloJogo);
  const [disponibilidadeSemanaJson, setDisponibilidadeSemanaJson] = useState(
    profileInitial.disponibilidadeSemanaJson || "{}"
  );

  const fotoCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fotoGaleriaInputRef = useRef<HTMLInputElement | null>(null);
  const fotoInputRef = useRef<HTMLInputElement | null>(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);
  const [fotoPosX, setFotoPosX] = useState(50);
  const [fotoPosY, setFotoPosY] = useState(50);
  const [fotoZoom, setFotoZoom] = useState(1);
  const [fotoSelecionadaNome, setFotoSelecionadaNome] = useState<string | null>(null);

  const perfilAlturaNum = Number(alturaCm);
  const perfilPesoNum = Number(pesoKg);

  const perfilValid = useMemo(() => {
    if (nome.trim().length < 3 || localizacao.trim().length < 3) return false;
    const uname = username.trim().toLowerCase();
    if (uname && !/^[a-z0-9_]{3,24}$/.test(uname)) return false;
    if (uname && usernameStatus === "taken") return false;
    if (hasAtletaProfessor) {
      if (!Number.isInteger(perfilAlturaNum) || perfilAlturaNum < 50 || perfilAlturaNum > 260) return false;
      if (!Number.isInteger(perfilPesoNum) || perfilPesoNum < 20 || perfilPesoNum > 300) return false;
      if (!["Destro", "Canhoto", "Ambos"].includes(lado)) return false;
    }
    if (genero && !["Masculino", "Feminino", "Outro"].includes(genero)) return false;
    return true;
  }, [genero, hasAtletaProfessor, lado, localizacao, nome, perfilAlturaNum, perfilPesoNum, username, usernameStatus]);

  const hasFotoSelecionada = Boolean(fotoPreviewUrl);

  async function selectNativeFoto(source: "camera" | "gallery") {
    if (!isNativeCameraAvailable()) {
      if (source === "camera") fotoCameraInputRef.current?.click();
      else fotoGaleriaInputRef.current?.click();
      return;
    }

    try {
      const file = await pickNativeImage(source);
      if (!file) return;
      const input = fotoInputRef.current;
      if (!attachFileToInput(input, file)) {
        const nextUrl = URL.createObjectURL(file);
        if (fotoPreviewUrl) URL.revokeObjectURL(fotoPreviewUrl);
        setFotoPreviewUrl(nextUrl);
        setFotoSelecionadaNome(file.name);
        setFotoPosX(50);
        setFotoPosY(50);
        setFotoZoom(1);
      }
    } catch (error) {
      if ((error as { message?: string })?.message?.toLowerCase().includes("cancel")) return;
      setMessage("Não foi possível abrir a câmera/galeria agora.");
    }
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
    if (fotoInputRef.current) fotoInputRef.current.value = "";
    if (fotoCameraInputRef.current) fotoCameraInputRef.current.value = "";
    if (fotoGaleriaInputRef.current) fotoGaleriaInputRef.current.value = "";
  }

  function applyResult(r: OnboardingActionResult) {
    if (!r.ok) {
      setMessage(r.message);
      return;
    }
    setMessage(null);
    router.refresh();
    router.push(`/perfil/${userId}`);
  }

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
    if (!perfilValid) {
      setMessage("Preencha os campos obrigatórios.");
      return;
    }
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    fd.set("foto_pos_x", String(fotoPosX));
    fd.set("foto_pos_y", String(fotoPosY));
    fd.set("foto_zoom", String(fotoZoom));
    startTransition(async () => applyResult(await salvarPerfilOnboarding(undefined, fd)));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4 shadow-sm sm:p-6"
    >
      {message ? (
        <p className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{message}</p>
      ) : null}

      <div className="flex items-start gap-3">
        {hasFotoSelecionada ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[color:var(--eid-border-subtle)]">
            <img
              src={fotoPreviewUrl ?? ""}
              alt=""
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
            alt=""
            className="h-20 w-20 shrink-0 rounded-full border border-[color:var(--eid-border-subtle)] object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-dashed border-eid-primary-500/50 text-[10px] text-eid-primary-300">
            Sem foto
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-eid-fg">Foto de perfil</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void selectNativeFoto("camera")}
              className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-fg"
            >
              Câmera
            </button>
            <button
              type="button"
              onClick={() => void selectNativeFoto("gallery")}
              className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-fg"
            >
              Galeria
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
            <div className="mt-3 space-y-3">
              {/* Preview circular em tempo real */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-eid-primary-500/40 ring-offset-2 ring-offset-eid-card">
                  {fotoPreviewUrl && (
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
                <p className="text-[10px] text-eid-text-muted">Prévia do recorte</p>
              </div>
              {/* Sliders */}
              <div className="grid gap-2.5">
                <label className="block">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-eid-text-secondary">Posição horizontal</span>
                    <span className="text-[10px] tabular-nums text-eid-text-muted">{fotoPosX}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={fotoPosX} onChange={(ev) => setFotoPosX(Number(ev.target.value))} className="w-full accent-[#2563eb]" />
                </label>
                <label className="block">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-eid-text-secondary">Posição vertical</span>
                    <span className="text-[10px] tabular-nums text-eid-text-muted">{fotoPosY}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={fotoPosY} onChange={(ev) => setFotoPosY(Number(ev.target.value))} className="w-full accent-[#2563eb]" />
                </label>
                <label className="block">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-eid-text-secondary">Zoom</span>
                    <span className="text-[10px] tabular-nums text-eid-text-muted">{fotoZoom.toFixed(2)}×</span>
                  </div>
                  <input type="range" min={1} max={2.5} step={0.05} value={fotoZoom} onChange={(ev) => setFotoZoom(Number(ev.target.value))} className="w-full accent-[#2563eb]" />
                </label>
              </div>
              <button type="button" onClick={removeFotoSelecionada} className="text-[11px] text-eid-text-muted underline hover:text-eid-fg">
                Remover foto nova
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <input
          name="nome"
          required
          value={nome}
          onChange={(ev) => setNome(ev.target.value)}
          onBlur={(ev) => setNome(normalizePtBrNameCase(ev.target.value))}
          placeholder="Nome completo"
          className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
        />
        <select
          name="genero"
          value={genero}
          onChange={(ev) => setGenero(ev.target.value)}
          className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg [&>option]:bg-[#0b1220] [&>option]:text-white"
        >
          <option value="">Gênero (opcional)</option>
          <option value="Masculino">Masculino</option>
          <option value="Feminino">Feminino</option>
          <option value="Outro">Outro</option>
        </select>
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
          placeholder="@usuario (opcional)"
          className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
        />
        {username.trim() ? (
          <div className="flex items-center gap-1.5 text-[11px]">
            {usernameStatus === "checking" && (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-eid-text-secondary border-t-transparent" />
                <span className="text-eid-text-secondary">Verificando...</span>
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
              <span className="text-eid-text-secondary">3–24 caracteres: a-z, 0-9 e _</span>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-eid-text-secondary">3–24 caracteres: a-z, 0-9 e _</p>
        )}
        <div>
          <div className="flex min-w-0 gap-2">
            <input
              name="localizacao"
              required
              value={localizacao}
              onChange={(ev) => setLocalizacao(ev.target.value)}
              onBlur={(ev) => setLocalizacao(normalizePtBrNameCaseLoose(ev.target.value))}
              placeholder="Cidade / Estado"
              className="eid-input-dark min-w-0 flex-1 rounded-xl px-3 py-3 text-sm text-eid-fg"
            />
            <button
              type="button"
              onClick={() => void detectarLocalizacao()}
              disabled={locGeoStatus === "loading"}
              className="shrink-0 rounded-xl border border-eid-primary-500/30 bg-eid-primary-500/10 px-3 text-[11px] font-bold uppercase text-eid-primary-300 transition hover:border-eid-primary-500/55 hover:bg-eid-primary-500/18 disabled:opacity-50"
            >
              {locGeoStatus === "loading" ? "..." : locGeoStatus === "ok" ? "Atualizar" : "Detectar"}
            </button>
          </div>
          {locGeoError ? (
            <p className="mt-1.5 text-[11px] text-amber-400">{locGeoError}</p>
          ) : locGeoStatus === "ok" ? (
            <p className="mt-1.5 text-[11px] text-emerald-400">Localização atualizada</p>
          ) : null}
        </div>
        <input
          name="estilo_jogo"
          value={estiloJogo}
          onChange={(ev) => setEstiloJogo(ev.target.value)}
          placeholder={hasProfessor && !hasAtletaProfessor ? "Metodologia / especialidade (opcional)" : "Estilo de jogo (opcional)"}
          className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
        />
        <textarea
          name="bio"
          value={bio}
          onChange={(ev) => setBio(ev.target.value)}
          placeholder={hasProfessor ? "Bio publica (opcional)" : "Bio (opcional)"}
          rows={3}
          className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
        />
        <textarea
          name="disponibilidade_semana_json"
          value={disponibilidadeSemanaJson}
          onChange={(ev) => setDisponibilidadeSemanaJson(ev.target.value)}
          placeholder='Disponibilidade JSON (ex.: {"seg":"noite"})'
          rows={2}
          className="eid-input-dark w-full rounded-xl px-3 py-3 text-xs text-eid-fg"
        />

        {hasAtletaProfessor ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="number"
                name="altura_cm"
                min={50}
                max={260}
                required
                value={alturaCm}
                onChange={(ev) => setAlturaCm(ev.target.value)}
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
                onChange={(ev) => setPesoKg(ev.target.value)}
                placeholder="Peso (kg)"
                className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
              />
            </div>
            <select
              name="lado"
              required
              value={lado}
              onChange={(ev) => setLado(ev.target.value)}
              className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg [&>option]:bg-[#0b1220] [&>option]:text-white"
            >
              <option value="" disabled>
                Mão dominante
              </option>
              <option value="Destro">Destro</option>
              <option value="Canhoto">Canhoto</option>
              <option value="Ambos">Ambidestro</option>
            </select>
          </>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={CONTA_ESPORTES_EID_HREF}
          className="text-center text-sm font-medium text-eid-primary-300 hover:text-eid-fg sm:text-left"
        >
          {hasProfessor ? "Esportes, atuacao e Desafio/EID ->" : "Esportes, EID e modalidades no desafio ->"}
        </Link>
        <button
          type="submit"
          disabled={pending || !perfilValid}
          className="eid-btn-primary rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-50"
        >
          {pending ? (hasFotoSelecionada ? "Enviando foto…" : "Salvando…") : "Salvar perfil"}
        </button>
      </div>
    </form>
  );
}
