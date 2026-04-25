"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  adicionarEspacoReservaRapidaAction,
  criarReservaEspacoAction,
  entrarFilaEsperaEspacoAction,
  solicitarSocioEspacoAction,
} from "@/app/espaco/actions";

const initial = { ok: false, message: "" };

type WeatherPreviewProps = {
  inicio: string;
  latitude: number | null;
  longitude: number | null;
};

function describeWeatherCode(code: number) {
  if (code === 0) return "Céu limpo";
  if ([1, 2].includes(code)) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if ([45, 48].includes(code)) return "Névoa";
  if ([51, 53, 55, 56, 57].includes(code)) return "Garoa";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Chuva";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Neve";
  if ([95, 96, 99].includes(code)) return "Tempestade";
  return "Condição variável";
}

function WeatherPreview({ inicio, latitude, longitude }: WeatherPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const day = useMemo(() => (inicio?.includes("T") ? inicio.slice(0, 10) : ""), [inicio]);

  useEffect(() => {
    let active = true;
    async function load() {
      setError("");
      setSummary("");
      if (!day || latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      setLoading(true);
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
          `&hourly=temperature_2m,precipitation_probability,weather_code&timezone=America/Sao_Paulo` +
          `&start_date=${day}&end_date=${day}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("Falha ao consultar clima");
        const data = await res.json();
        const times: string[] = data?.hourly?.time ?? [];
        const temps: Array<number | null> = data?.hourly?.temperature_2m ?? [];
        const rains: Array<number | null> = data?.hourly?.precipitation_probability ?? [];
        const codes: Array<number | null> = data?.hourly?.weather_code ?? [];
        if (!times.length) throw new Error("Sem dados de previsão para esta data");
        const targetTs = new Date(inicio).getTime();
        let bestIdx = 0;
        let bestDiff = Number.POSITIVE_INFINITY;
        for (let i = 0; i < times.length; i += 1) {
          const ts = new Date(times[i]).getTime();
          const diff = Math.abs(ts - targetTs);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestIdx = i;
          }
        }
        const temp = Number(temps[bestIdx] ?? NaN);
        const rain = Number(rains[bestIdx] ?? NaN);
        const code = Number(codes[bestIdx] ?? NaN);
        const horaRef = String(times[bestIdx] ?? "").slice(11, 16);
        const parts = [
          Number.isFinite(temp) ? `${temp.toFixed(1).replace(".", ",")}°C` : null,
          Number.isFinite(rain) ? `${Math.round(rain)}% chuva` : null,
          Number.isFinite(code) ? describeWeatherCode(code) : null,
        ].filter(Boolean);
        if (!active) return;
        setSummary(parts.length ? `${horaRef} · ${parts.join(" · ")}` : "Previsão indisponível para o horário.");
      } catch {
        if (active) setError("Não foi possível carregar a previsão agora.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [day, inicio, latitude, longitude]);

  if (!inicio) {
    return <p className="text-[11px] text-eid-text-secondary">Selecione o horário para ver a previsão do tempo.</p>;
  }
  if (loading) return <p className="text-[11px] text-eid-text-secondary">Carregando previsão do tempo...</p>;
  if (error) return <p className="text-[11px] text-red-300">{error}</p>;
  if (!summary) return null;
  return <p className="text-[11px] text-eid-text-secondary">Previsão no horário: {summary}</p>;
}

export function EspacoPublicJoinForm({
  espacoId,
  planos,
  regraEntrada,
}: {
  espacoId: number;
  planos: Array<{ id: number; nome: string; mensalidade_centavos: number | null }>;
  regraEntrada?: {
    modoEntrada: "somente_perfil" | "matricula" | "cpf";
    rotuloCampo: string;
    instrucoes: string;
  };
}) {
  const [state, action, pending] = useActionState(solicitarSocioEspacoAction, initial);

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-eid-action-500/25 bg-eid-card/90 p-4">
      <input type="hidden" name="espaco_id" value={espacoId} />
      <h3 className="text-sm font-bold text-eid-fg">Seja sócio</h3>
      <p className="text-xs text-eid-text-secondary">
        {regraEntrada?.instrucoes ?? "Envie seus dados para o dono analisar sua entrada no espaço."}
      </p>
      <select
        name="plano_socio_id"
        className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
        defaultValue={planos[0]?.id ?? ""}
      >
        {planos.map((plano) => (
          <option key={plano.id} value={plano.id}>
            {plano.nome} · R$ {((Number(plano.mensalidade_centavos ?? 0) || 0) / 100).toFixed(2).replace(".", ",")}
          </option>
        ))}
      </select>
      <textarea
        name="mensagem"
        rows={2}
        placeholder="Conte ao clube o que você procura."
        className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
      />
      {regraEntrada?.modoEntrada !== "somente_perfil" ? (
        <input
          name="identificador_entrada"
          placeholder={regraEntrada?.rotuloCampo || (regraEntrada?.modoEntrada === "cpf" ? "CPF" : "Matrícula")}
          className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
        />
      ) : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          type="file"
          name="documento_rg"
          accept=".pdf,image/*"
          className="eid-input-dark rounded-xl px-3 py-2 text-xs"
        />
        <input
          type="file"
          name="documento_cpf"
          accept=".pdf,image/*"
          className="eid-input-dark rounded-xl px-3 py-2 text-xs"
        />
        <input
          type="file"
          name="documento_comprovante"
          accept=".pdf,image/*"
          className="eid-input-dark rounded-xl px-3 py-2 text-xs"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="eid-btn-primary w-full rounded-xl px-4 py-3 text-sm font-bold"
      >
        {pending ? "Enviando..." : "Solicitar associação"}
      </button>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function EspacoPublicReservaForm({
  espacoId,
  unidadeId,
  esporteId,
  latitude = null,
  longitude = null,
}: {
  espacoId: number;
  unidadeId: number | null;
  esporteId: number | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const [state, action, pending] = useActionState(criarReservaEspacoAction, initial);
  const [inicio, setInicio] = useState("");
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4">
      <input type="hidden" name="espaco_id" value={espacoId} />
      <input type="hidden" name="espaco_unidade_id" value={unidadeId ?? ""} />
      <input type="hidden" name="esporte_id" value={esporteId ?? ""} />
      <h3 className="text-sm font-bold text-eid-fg">Reservar horário</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="datetime-local"
          name="inicio"
          value={inicio}
          onChange={(event) => setInicio(event.target.value)}
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          name="fim"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="number"
          name="valor_centavos"
          min={0}
          step={100}
          placeholder="Valor em centavos"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
        />
        <select
          name="tipo_reserva"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
          defaultValue="paga"
        >
          <option value="paga">Reserva paga</option>
          <option value="socio">Benefício de sócio</option>
          <option value="rank">Jogo de ranking</option>
          <option value="professor">Uso por professor</option>
          <option value="torneio">Uso por torneio</option>
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="number"
          name="partida_id"
          min={1}
          placeholder="ID da partida (ranking)"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
        />
        <input
          type="number"
          name="torneio_jogo_id"
          min={1}
          placeholder="ID do jogo (torneio)"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-eid-fg">
        <input type="checkbox" name="usar_beneficio_gratis" />
        Tentar usar benefício gratuito do plano
      </label>
      <WeatherPreview inicio={inicio} latitude={latitude} longitude={longitude} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/10 px-4 py-3 text-sm font-bold text-eid-primary-300"
      >
        {pending ? "Criando..." : "Solicitar reserva"}
      </button>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>
          {state.message}
        </p>
      ) : null}
      <p className="text-[11px] text-eid-text-secondary">
        Para torneio/ranking, informe o ID do jogo vinculado. Para professor e torneio, o horário precisa estar liberado pelo dono do espaço.
      </p>
    </form>
  );
}

export function EspacoPublicWaitlistForm({
  espacoId,
  unidadeId,
  esporteId,
  latitude = null,
  longitude = null,
}: {
  espacoId: number;
  unidadeId: number | null;
  esporteId: number | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const [state, action, pending] = useActionState(entrarFilaEsperaEspacoAction, initial);
  const [inicio, setInicio] = useState("");
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/50 p-4">
      <input type="hidden" name="espaco_id" value={espacoId} />
      <input type="hidden" name="espaco_unidade_id" value={unidadeId ?? ""} />
      <input type="hidden" name="esporte_id" value={esporteId ?? ""} />
      <h3 className="text-sm font-bold text-eid-fg">Fila de espera</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="datetime-local"
          name="inicio"
          value={inicio}
          onChange={(event) => setInicio(event.target.value)}
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          name="fim"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
        />
      </div>
      <WeatherPreview inicio={inicio} latitude={latitude} longitude={longitude} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-[color:var(--eid-border-subtle)] px-4 py-3 text-sm font-bold text-eid-fg"
      >
        {pending ? "Entrando..." : "Entrar na fila"}
      </button>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function EspacoPublicAddReservaAtalhoForm({ espacoId }: { espacoId: number }) {
  const [state, action, pending] = useActionState(adicionarEspacoReservaRapidaAction, initial);
  return (
    <form action={action} className="space-y-2 rounded-2xl border border-eid-primary-500/30 bg-eid-primary-500/10 p-4">
      <input type="hidden" name="espaco_id" value={espacoId} />
      <h3 className="text-sm font-bold text-eid-fg">Adicionar ao botão Reservar</h3>
      <p className="text-xs text-eid-text-secondary">
        Coloque este espaço no seu atalho de reserva rápida da dashboard.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-eid-primary-500/35 bg-eid-primary-500/12 px-4 py-3 text-sm font-bold text-eid-primary-200"
      >
        {pending ? "Adicionando..." : "Adicionar este espaço ao meu Reservar"}
      </button>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
