"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActionState } from "react";
import { criarEquipe, convidarUsuarioParaEquipe, type TeamActionState } from "@/app/times/actions";

const initial: TeamActionState = { ok: false, message: "" };

type Sport = { id: number; nome: string };
type Team = { id: number; nome: string; tipo: string | null; esporteNome: string };

export function TeamManagementPanel({
  esportes,
  minhasEquipes,
  defaultOpenCreate,
  manageHrefTemplate,
  convidarUsuarioIdAposCriar,
  defaultTipoFormacao,
}: {
  esportes: Sport[];
  minhasEquipes: Team[];
  defaultOpenCreate?: boolean;
  manageHrefTemplate?: string;
  /** UUID do atleta: após criar a formação, envia convite automaticamente (server action). */
  convidarUsuarioIdAposCriar?: string;
  /** Ao convidar a partir do perfil, sugerimos dupla por padrão. */
  defaultTipoFormacao?: "time" | "dupla";
}) {
  const router = useRouter();
  const [createState, createAction, createPending] = useActionState(criarEquipe, initial);
  const [inviteState, inviteAction, invitePending] = useActionState(convidarUsuarioParaEquipe, initial);
  const [tipo, setTipo] = useState<"time" | "dupla">(defaultTipoFormacao ?? "time");
  const [esporteId, setEsporteId] = useState<string>("");
  const [localizacao, setLocalizacao] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    if (!manageHrefTemplate) return;
    if (!createState.ok || !createState.createdTimeId) return;
    let nextHref = manageHrefTemplate.replace(":id", String(createState.createdTimeId));
    if (createState.inviteAutoSent) {
      try {
        const base = "https://eid.local";
        const u = new URL(nextHref, base);
        u.searchParams.delete("convidar");
        nextHref = `${u.pathname}${u.search}`;
      } catch {
        /* manter href */
      }
    }
    router.push(nextHref);
  }, [createState, manageHrefTemplate, router]);

  function obterLocalizacao() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("error");
      setGpsError("Seu navegador não suporta geolocalização.");
      return;
    }
    setGpsStatus("loading");
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`
          );
          if (!resp.ok) throw new Error("Falha ao obter endereço.");
          const data = (await resp.json()) as {
            address?: { city?: string; town?: string; village?: string; state?: string };
          };
          const city = data.address?.city || data.address?.town || data.address?.village || "";
          const state = data.address?.state || "";
          const resolved = [city, state].filter(Boolean).join(" / ");
          if (!resolved) throw new Error("Não foi possível identificar cidade/estado.");
          setLocalizacao(resolved);
          setGpsStatus("idle");
        } catch {
          setGpsStatus("error");
          setGpsError("Não foi possível identificar sua cidade automaticamente.");
        }
      },
      (err) => {
        setGpsStatus("error");
        setGpsError(err.code === 1 ? "Permissão de localização negada." : "Não foi possível obter sua localização.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <section className="mb-4 min-w-0 space-y-3">
      <details className="eid-surface-panel overflow-hidden rounded-2xl p-0" open={defaultOpenCreate}>
        <summary className="cursor-pointer border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2 text-sm font-semibold text-eid-fg">Criar nova dupla ou time</summary>
        <div className="p-3 sm:p-4">
        <p className="mt-2 text-[11px] text-eid-text-secondary">
          {convidarUsuarioIdAposCriar
            ? "Escudo obrigatório. Ao salvar, o convite vai para o atleta do perfil (Social)."
            : "Preencha os dados da formação e envie uma foto obrigatória para criar."}
        </p>
        <form action={createAction} className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
          {convidarUsuarioIdAposCriar ? <input type="hidden" name="convidar_usuario_id" value={convidarUsuarioIdAposCriar} /> : null}
          <div className="rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 px-3 py-2 sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-primary-300">Escudo do time ou dupla</p>
            <p className="mt-1 text-[10px] text-eid-text-secondary">Envie o escudo do time ou da dupla. Esse envio é obrigatório para concluir o cadastro.</p>
            <input
              type="file"
              name="escudo_file"
              accept="image/*"
              required
              className="mt-2 block w-full text-[11px] text-eid-text-secondary file:mr-2 file:rounded-lg file:border file:border-[color:var(--eid-border-subtle)] file:bg-eid-surface/70 file:px-2.5 file:py-1 file:text-[10px] file:font-semibold file:text-eid-fg"
            />
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary sm:col-span-2">Dados principais</p>
          <input type="hidden" name="tipo" value={tipo} />
          <input type="hidden" name="esporte_id" value={esporteId} />
          <input name="nome" required placeholder="Nome da equipe" className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg sm:col-span-2" />
          <input name="username" placeholder="@username da equipe (opcional)" className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg" />
          <label className="grid min-w-0 gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Tipo</span>
            <div className="min-w-0 rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_40%,var(--eid-bg)_60%),color-mix(in_srgb,var(--eid-surface)_34%,var(--eid-bg)_66%))] p-1 backdrop-blur-sm">
              <div className="flex h-[1.65rem] overflow-hidden rounded-md bg-[color-mix(in_srgb,var(--eid-bg)_24%,var(--eid-surface)_76%)]">
                <button
                  type="button"
                  onClick={() => setTipo("time")}
                  className={`inline-flex min-w-0 flex-1 items-center justify-center rounded-sm px-1.5 text-[9px] font-semibold uppercase leading-none tracking-[0.03em] transition-all duration-200 ${
                    tipo === "time"
                      ? "bg-[color-mix(in_srgb,var(--eid-primary-500)_30%,var(--eid-surface)_70%)] text-eid-fg shadow-[0_6px_16px_-10px_rgba(37,99,235,0.42)]"
                      : "text-eid-text-secondary hover:bg-eid-surface/35"
                  }`}
                >
                  Time
                </button>
                <button
                  type="button"
                  onClick={() => setTipo("dupla")}
                  className={`inline-flex min-w-0 flex-1 items-center justify-center rounded-sm px-1.5 text-[9px] font-semibold uppercase leading-none tracking-[0.03em] transition-all duration-200 ${
                    tipo === "dupla"
                      ? "bg-[color-mix(in_srgb,var(--eid-primary-500)_30%,var(--eid-surface)_70%)] text-eid-fg shadow-[0_6px_16px_-10px_rgba(37,99,235,0.42)]"
                      : "text-eid-text-secondary hover:bg-eid-surface/35"
                  }`}
                >
                  Dupla
                </button>
              </div>
            </div>
          </label>
          <label className="grid min-w-0 gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Esporte</span>
            <div className="min-w-0 rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--eid-card)_94%,transparent),color-mix(in_srgb,var(--eid-surface)_92%,transparent))] p-1 backdrop-blur-sm">
              <div className="flex w-full min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain pb-0.5 pr-0.5 whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {esportes.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEsporteId(String(e.id))}
                    className={`inline-flex h-[1.45rem] shrink-0 items-center justify-center rounded-md px-1.5 text-[8px] font-semibold uppercase leading-none tracking-[0.025em] transition-all duration-200 ${
                      esporteId === String(e.id)
                        ? "bg-eid-primary-500/14 text-eid-fg shadow-[0_7px_16px_-11px_rgba(37,99,235,0.4)]"
                        : "text-eid-text-secondary hover:bg-eid-surface/55"
                    }`}
                  >
                    {e.nome}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-eid-text-secondary">
              Cada formação vale para um único esporte. Para atuar em outro esporte, crie outra dupla/time.
            </p>
          </label>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Cidade</span>
              <button
                type="button"
                onClick={obterLocalizacao}
                className="inline-flex items-center rounded-lg border border-[color:var(--eid-border-subtle)] bg-eid-surface/65 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.07em] text-eid-fg transition-colors hover:border-eid-primary-500/35"
              >
                {gpsStatus === "loading" ? "Obtendo..." : "Obter localização"}
              </button>
            </div>
            <input
              name="localizacao"
              required
              value={localizacao}
              onChange={(ev) => setLocalizacao(ev.target.value)}
              placeholder="Cidade / Estado"
              className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm text-eid-fg"
            />
            <p className="mt-1 rounded-lg border border-[#d39b2a] bg-[#ffe7b3] px-2 py-1 text-[10px] font-bold leading-snug text-[#4b2b00]">
              Atenção: a cidade da formação não pode ser alterada depois. Para trocar, será necessário criar outra equipe/dupla.
            </p>
            {gpsError ? <p className="mt-1 text-[10px] text-red-300">{gpsError}</p> : null}
          </div>
          <div className="sm:col-span-2 grid gap-1.5 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-eid-text-secondary">Configuração de vagas</p>
            <label className="flex items-center gap-2 text-[11px] text-eid-fg">
              <input type="checkbox" name="vagas_abertas" defaultChecked className="rounded border-[color:var(--eid-border-subtle)]" />
              Deixar vagas abertas para candidatura
            </label>
            <label className="flex items-center gap-2 text-[11px] text-eid-fg">
              <input type="checkbox" name="aceita_pedidos" defaultChecked className="rounded border-[color:var(--eid-border-subtle)]" />
              Permitir pedidos de entrada
            </label>
          </div>

          <button
            type="submit"
            disabled={createPending}
            className="rounded-xl border border-eid-primary-500/45 bg-eid-primary-500/22 px-4 py-2.5 text-sm font-black uppercase tracking-[0.08em] text-eid-fg transition-all duration-200 hover:-translate-y-[1px] hover:border-eid-primary-500/65 hover:bg-eid-primary-500/30 disabled:opacity-60 sm:col-span-2"
          >
            {createPending
              ? "Criando…"
              : convidarUsuarioIdAposCriar
                ? "Criar e enviar convite"
                : "Criar formação e abrir gestão"}
          </button>
          {createState.message ? (
            <p className={`text-xs sm:col-span-2 ${createState.ok ? "text-eid-primary-300" : "text-red-300"}`}>{createState.message}</p>
          ) : null}
        </form>
        </div>
      </details>

      {minhasEquipes.length > 0 ? (
        <details className="eid-surface-panel overflow-hidden rounded-2xl p-0">
          <summary className="cursor-pointer border-b border-[color:var(--eid-border-subtle)] bg-eid-surface/45 px-3 py-2 text-sm font-semibold text-eid-fg">Convidar atleta por @username</summary>
          <div className="p-3 sm:p-4">
          <form action={inviteAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <select name="time_id" required className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg">
              <option value="">Selecione a equipe</option>
              {minhasEquipes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({(t.tipo ?? "time").toUpperCase()} · {t.esporteNome})
                </option>
              ))}
            </select>
            <input name="username" required placeholder="@username do atleta" className="eid-input-dark rounded-xl px-3 py-2 text-sm text-eid-fg" />
            <button type="submit" disabled={invitePending} className="eid-btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
              {invitePending ? "Enviando..." : "Convidar"}
            </button>
            {inviteState.message ? (
              <p className={`text-xs sm:col-span-3 ${inviteState.ok ? "text-eid-primary-300" : "text-red-300"}`}>{inviteState.message}</p>
            ) : null}
          </form>
          </div>
        </details>
      ) : null}
    </section>
  );
}
