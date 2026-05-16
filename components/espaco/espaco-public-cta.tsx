"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  adicionarEspacoReservaRapidaAction,
  criarReservaEspacoAction,
  entrarFilaEsperaEspacoAction,
  iniciarAssociacaoPagaEspacoAction,
  solicitarSocioEspacoAction,
} from "@/app/espaco/actions";
import { resolverTipoOperacaoEspaco } from "@/lib/espacos/tipo-operacao";

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
  modoReserva,
}: {
  espacoId: number;
  planos: Array<{ id: number; nome: string; mensalidade_centavos: number | null }>;
  modoReserva?: string | null;
  regraEntrada?: {
    modoEntrada: "somente_perfil" | "matricula" | "cpf";
    rotuloCampo: string;
    instrucoes: string;
  };
}) {
  const [manualState, manualAction, manualPending] = useActionState(solicitarSocioEspacoAction, initial);
  const [paidState, paidAction, paidPending] = useActionState(iniciarAssociacaoPagaEspacoAction, initial);
  const tipoOperacao = resolverTipoOperacaoEspaco({ modoReserva, modoMonetizacao: null });
  const associacaoOpcional = tipoOperacao === "reserva_paga";
  const temPlanoPago = planos.some((plano) => Number(plano.mensalidade_centavos ?? 0) > 0);

  return (
    <div className="space-y-3 rounded-2xl border border-eid-action-500/25 bg-eid-card/90 p-4">
      <div>
        <h3 className="text-sm font-bold text-eid-fg">{associacaoOpcional ? "Clube de benefícios e sócio" : "Solicitar entrada"}</h3>
        <p className="text-xs text-eid-text-secondary">
          {associacaoOpcional
            ? "Neste espaço com reservas pagas, a associação é opcional e serve para benefícios extras, day use e clube do espaço."
            : regraEntrada?.instrucoes ?? "Envie seus dados para o dono analisar sua entrada no espaço."}
        </p>
      </div>

      <form action={manualAction} className="space-y-3">
        <input type="hidden" name="espaco_id" value={espacoId} />
        {planos.length > 0 ? (
          <select
            name="plano_socio_id"
            className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="">Sem mensalidade agora</option>
            {planos.map((plano) => (
              <option key={plano.id} value={plano.id}>
                {plano.nome} · R$ {((Number(plano.mensalidade_centavos ?? 0) || 0) / 100).toFixed(2).replace(".", ",")}
              </option>
            ))}
          </select>
        ) : (
          <input type="hidden" name="plano_socio_id" value="" />
        )}
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
          disabled={manualPending}
          className="eid-btn-primary w-full rounded-xl px-4 py-3 text-sm font-bold"
        >
          {manualPending ? "Enviando..." : "Solicitar associação"}
        </button>
        {manualState.message ? (
          <p className={`text-xs ${manualState.ok ? "text-eid-primary-300" : "text-red-300"}`}>
            {manualState.message}
          </p>
        ) : null}
      </form>

      {temPlanoPago ? (
        <form action={paidAction} className="space-y-3 rounded-2xl border border-eid-primary-500/20 bg-eid-primary-500/6 p-4">
          <input type="hidden" name="espaco_id" value={espacoId} />
          <p className="text-sm font-bold text-eid-fg">Virar sócio com mensalidade</p>
          <select
            name="plano_socio_id"
            className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm"
            defaultValue={String(planos.find((plano) => Number(plano.mensalidade_centavos ?? 0) > 0)?.id ?? "")}
          >
            {planos.filter((plano) => Number(plano.mensalidade_centavos ?? 0) > 0).map((plano) => (
              <option key={plano.id} value={plano.id}>
                {plano.nome} · R$ {((Number(plano.mensalidade_centavos ?? 0) || 0) / 100).toFixed(2).replace(".", ",")}
              </option>
            ))}
          </select>
          <textarea
            name="mensagem"
            rows={2}
            placeholder="Explique o que você busca como sócio."
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
            <input type="file" name="documento_rg" accept=".pdf,image/*" className="eid-input-dark rounded-xl px-3 py-2 text-xs" />
            <input type="file" name="documento_cpf" accept=".pdf,image/*" className="eid-input-dark rounded-xl px-3 py-2 text-xs" />
            <input type="file" name="documento_comprovante" accept=".pdf,image/*" className="eid-input-dark rounded-xl px-3 py-2 text-xs" />
          </div>
          <input name="card_holder_name" autoComplete="cc-name" className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm" placeholder="Nome impresso no cartão" required />
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="card_number" inputMode="numeric" autoComplete="cc-number" className="eid-input-dark rounded-xl px-3 py-2 text-sm" placeholder="Número do cartão" required />
            <input name="card_ccv" inputMode="numeric" autoComplete="cc-csc" className="eid-input-dark rounded-xl px-3 py-2 text-sm" placeholder="CVV" required />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="card_expiry_month" inputMode="numeric" className="eid-input-dark rounded-xl px-3 py-2 text-sm" placeholder="Mês (MM)" required />
            <input name="card_expiry_year" inputMode="numeric" className="eid-input-dark rounded-xl px-3 py-2 text-sm" placeholder="Ano (AAAA)" required />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="holder_cpf_cnpj" inputMode="numeric" className="eid-input-dark rounded-xl px-3 py-2 text-sm" placeholder="CPF/CNPJ do titular" required />
            <input name="holder_email" type="email" className="eid-input-dark rounded-xl px-3 py-2 text-sm" placeholder="E-mail do titular" required />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="holder_phone" inputMode="tel" className="eid-input-dark rounded-xl px-3 py-2 text-sm" placeholder="Telefone do titular" required />
            <input name="holder_postal_code" inputMode="numeric" className="eid-input-dark rounded-xl px-3 py-2 text-sm" placeholder="CEP" required />
          </div>
          <input name="holder_address_number" inputMode="numeric" className="eid-input-dark w-full rounded-xl px-3 py-2 text-sm" placeholder="Número do endereço" required />
          <p className="text-[11px] leading-relaxed text-eid-text-secondary">
            O pagamento da mensalidade não libera acesso automático. O admin do espaço ainda precisa aprovar sua entrada.
          </p>
          <button type="submit" disabled={paidPending} className="eid-btn-primary w-full rounded-xl px-4 py-3 text-sm font-bold">
            {paidPending ? "Iniciando pagamento..." : "Pagar mensalidade e solicitar aprovação"}
          </button>
          {paidState.message ? (
            <p className={`text-xs ${paidState.ok ? "text-eid-primary-300" : "text-red-300"}`}>
              {paidState.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

export function EspacoPublicReservaForm({
  espacoId,
  unidadeId,
  esporteId,
  valorReservaPadraoCentavos = 0,
  latitude = null,
  longitude = null,
  jogosAgendados = [],
}: {
  espacoId: number;
  unidadeId: number | null;
  esporteId: number | null;
  valorReservaPadraoCentavos?: number;
  latitude?: number | null;
  longitude?: number | null;
  jogosAgendados?: Array<{ id: number; label: string; data_partida: string | null }>;
}) {
  const [state, action, pending] = useActionState(criarReservaEspacoAction, initial);
  const [inicio, setInicio] = useState("");
  const valorReserva = Math.max(0, Math.round(Number(valorReservaPadraoCentavos) || 0));
  const valorReservaLabel = (valorReserva / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/90 p-4 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.5)]">
      <input type="hidden" name="espaco_id" value={espacoId} />
      <input type="hidden" name="espaco_unidade_id" value={unidadeId ?? ""} />
      <input type="hidden" name="esporte_id" value={esporteId ?? ""} />
      <input type="hidden" name="valor_centavos" value={valorReserva} />
      <div>
        <h3 className="text-sm font-bold text-eid-fg">Reservar horário</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
          Escolha o tipo de uso e, se for uma partida já marcada, vincule o jogo para o dono do local ver o contexto.
        </p>
      </div>
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
        <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/55 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">Valor da reserva</p>
          <p className="mt-0.5 text-sm font-bold text-eid-fg">{valorReservaLabel}</p>
        </div>
        <select
          name="tipo_reserva"
          className="eid-input-dark rounded-xl px-3 py-2 text-sm"
          defaultValue="paga"
        >
          <option value="paga">Reserva comum paga</option>
          <option value="socio">Reserva de membro</option>
          <option value="rank">Jogo de ranking</option>
          <option value="professor">Uso por professor</option>
          <option value="torneio">Uso por torneio</option>
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <select name="partida_id" className="eid-input-dark rounded-xl px-3 py-2 text-sm" defaultValue="">
          <option value="">Sem jogo vinculado</option>
          {jogosAgendados.map((jogo) => (
            <option key={jogo.id} value={jogo.id}>
              {jogo.label}
            </option>
          ))}
        </select>
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
      <div className="rounded-xl border border-eid-action-500/20 bg-eid-action-500/8 px-3 py-2">
        <p className="text-[11px] font-semibold text-eid-fg">Pagamento transparente</p>
        <p className="mt-1 text-[11px] leading-relaxed text-eid-text-secondary">
          Se houver cobrança, você será levado ao checkout seguro. O local vê a reserva como aguardando pagamento até a confirmação.
        </p>
      </div>
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
