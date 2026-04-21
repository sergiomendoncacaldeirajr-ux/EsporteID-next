"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarPerfilOnboarding, type OnboardingActionResult } from "@/app/onboarding/actions";
import { CONTA_ESPORTES_EID_HREF } from "@/lib/routes/conta";

type ProfileInitial = {
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
  const [localizacao, setLocalizacao] = useState(profileInitial.localizacao);
  const [alturaCm, setAlturaCm] = useState(profileInitial.alturaCm ? String(profileInitial.alturaCm) : "");
  const [pesoKg, setPesoKg] = useState(profileInitial.pesoKg ? String(profileInitial.pesoKg) : "");
  const [lado, setLado] = useState(profileInitial.lado ?? "");
  const [bio, setBio] = useState(profileInitial.bio);
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
    if (hasAtletaProfessor) {
      if (!Number.isInteger(perfilAlturaNum) || perfilAlturaNum < 50 || perfilAlturaNum > 260) return false;
      if (!Number.isInteger(perfilPesoNum) || perfilPesoNum < 20 || perfilPesoNum > 300) return false;
      if (!["Destro", "Canhoto", "Ambos"].includes(lado)) return false;
    }
    return true;
  }, [hasAtletaProfessor, lado, localizacao, nome, perfilAlturaNum, perfilPesoNum, username]);

  const hasFotoSelecionada = Boolean(fotoPreviewUrl);

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
              onClick={() => fotoCameraInputRef.current?.click()}
              className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-xs font-semibold text-eid-fg"
            >
              Câmera
            </button>
            <button
              type="button"
              onClick={() => fotoGaleriaInputRef.current?.click()}
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
            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-eid-text-secondary">{fotoSelecionadaNome}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-[11px] text-eid-text-secondary">
                  Posição H
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={fotoPosX}
                    onChange={(ev) => setFotoPosX(Number(ev.target.value))}
                    className="mt-1 w-full"
                  />
                </label>
                <label className="text-[11px] text-eid-text-secondary">
                  Posição V
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={fotoPosY}
                    onChange={(ev) => setFotoPosY(Number(ev.target.value))}
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
                    onChange={(ev) => setFotoZoom(Number(ev.target.value))}
                    className="mt-1 w-full"
                  />
                </label>
              </div>
              <button type="button" onClick={removeFotoSelecionada} className="text-[11px] text-eid-primary-300 underline">
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
          placeholder="Nome completo"
          className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
        />
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
        <p className="text-[11px] text-eid-text-secondary">3–24 caracteres: a-z, 0-9 e _</p>
        <input
          name="localizacao"
          required
          value={localizacao}
          onChange={(ev) => setLocalizacao(ev.target.value)}
          placeholder="Cidade / Estado"
          className="eid-input-dark w-full rounded-xl px-3 py-3 text-sm text-eid-fg"
        />
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
          {hasProfessor ? "Esportes, atuacao e Match/EID ->" : "Esportes, EID e modalidades no match ->"}
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
