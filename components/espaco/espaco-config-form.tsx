"use client";

import { useActionState } from "react";
import { salvarConfiguracoesEspacoAction } from "@/app/espaco/actions";
import { normalizeEspacoAssociacaoConfig } from "@/lib/espacos/associacao-config";
import { normalizeEspacoReservaConfig } from "@/lib/espacos/config";

const initialState = { ok: false, message: "" };

const modoReservaLabels: Record<string, string> = {
  paga: "Modo só reserva paga (definido no contrato/plano). Benefícios gratuitos ficam desativados e não podem ser ligados aqui.",
  gratuita: "Modo com foco em reservas gratuitas. Ajuste as regras abaixo conforme a política do seu espaço.",
  mista: "Modo misto: você pode combinar regras de reserva paga e benefícios gratuitos para sócios, dentro do permitido.",
};

export function EspacoConfigForm({
  espaco,
  modoReserva = "mista",
}: {
  modoReserva?: string | null;
  espaco: {
    id: number;
    nome_publico: string;
    slug: string | null;
    cidade: string | null;
    uf: string | null;
    localizacao: string | null;
    cover_arquivo: string | null;
    whatsapp_contato: string | null;
    email_contato: string | null;
    website_url: string | null;
    instagram_url: string | null;
    descricao_curta: string | null;
    descricao_longa: string | null;
    aceita_socios: boolean | null;
    permite_professores_aprovados: boolean | null;
    configuracao_reservas_json: unknown;
    associacao_regra_json?: unknown;
  };
}) {
  const [state, formAction, pending] = useActionState(
    salvarConfiguracoesEspacoAction,
    initialState
  );
  const cfg = normalizeEspacoReservaConfig(espaco.configuracao_reservas_json);
  const associacao = normalizeEspacoAssociacaoConfig(espaco.associacao_regra_json);
  const modo = (modoReserva ?? "mista").toLowerCase();
  const bloqueiaGratis = modo === "paga";

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="espaco_id" value={espaco.id} />
      <div className="sm:col-span-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Nome público
        </label>
        <input
          name="nome_publico"
          defaultValue={espaco.nome_publico}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Slug público
        </label>
        <input
          name="slug"
          defaultValue={espaco.slug ?? ""}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Localização
        </label>
        <input
          name="localizacao"
          defaultValue={espaco.localizacao ?? ""}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Cidade
        </label>
        <input
          name="cidade"
          defaultValue={espaco.cidade ?? ""}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          UF
        </label>
        <input
          name="uf"
          defaultValue={espaco.uf ?? ""}
          maxLength={2}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm uppercase"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Cover (URL)
        </label>
        <input
          name="cover_arquivo"
          defaultValue={espaco.cover_arquivo ?? ""}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          WhatsApp
        </label>
        <input
          name="whatsapp_contato"
          defaultValue={espaco.whatsapp_contato ?? ""}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          E-mail
        </label>
        <input
          name="email_contato"
          defaultValue={espaco.email_contato ?? ""}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Site
        </label>
        <input
          name="website_url"
          defaultValue={espaco.website_url ?? ""}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Instagram
        </label>
        <input
          name="instagram_url"
          defaultValue={espaco.instagram_url ?? ""}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Descrição curta
        </label>
        <input
          name="descricao_curta"
          defaultValue={espaco.descricao_curta ?? ""}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Descrição longa
        </label>
        <textarea
          name="descricao_longa"
          rows={4}
          defaultValue={espaco.descricao_longa ?? ""}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
        />
      </div>
      <div className="sm:col-span-2 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/30 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">Modo de reserva</p>
        <p className="mt-2 text-xs leading-relaxed text-eid-fg">
          {modoReservaLabels[modo] ?? modoReservaLabels.mista}
        </p>
      </div>
      <div className="sm:col-span-2 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/30 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">
          Regra de entrada de sócio/membro
        </p>
        <p className="mt-2 text-xs text-eid-text-secondary">
          Defina o que a pessoa precisa informar para solicitar entrada no espaço.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select
            name="associacao_modo_entrada"
            defaultValue={associacao.modoEntrada}
            className="eid-input-dark rounded-xl px-3 py-2 text-sm"
          >
            <option value="somente_perfil">Somente perfil (sem código)</option>
            <option value="matricula">Exigir matrícula/código</option>
            <option value="cpf">Exigir CPF</option>
          </select>
          <input
            name="associacao_rotulo_campo"
            defaultValue={associacao.rotuloCampo}
            placeholder="Rótulo do campo"
            className="eid-input-dark rounded-xl px-3 py-2 text-sm"
          />
          <input
            name="associacao_instrucoes"
            defaultValue={associacao.instrucoes}
            placeholder="Instruções para o visitante"
            className="eid-input-dark rounded-xl px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="sm:col-span-2 grid gap-3 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/40 p-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-xs text-eid-fg">
          <input
            type="checkbox"
            name="aceita_socios"
            defaultChecked={Boolean(espaco.aceita_socios)}
          />
          Aceita novos sócios
        </label>
        <label className="flex items-center gap-2 text-xs text-eid-fg">
          <input
            type="checkbox"
            name="permite_professores_aprovados"
            defaultChecked={Boolean(espaco.permite_professores_aprovados)}
          />
          Permite professores aprovados
        </label>
        <label className="flex items-center gap-2 text-xs text-eid-fg">
          <input
            type="checkbox"
            name="bloqueia_inadimplente"
            defaultChecked={cfg.bloqueiaInadimplente}
          />
          Bloquear inadimplente
        </label>
        <label
          className={`flex items-center gap-2 text-xs ${
            bloqueiaGratis ? "cursor-not-allowed text-eid-text-secondary" : "text-eid-fg"
          }`}
        >
          <input
            type="checkbox"
            name="reservas_gratis_liberadas"
            defaultChecked={bloqueiaGratis ? false : cfg.reservasGratisLiberadas}
            disabled={bloqueiaGratis}
          />
          Liberar benefícios gratuitos
        </label>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">
            Limite por dia
          </label>
          <input
            name="limite_reservas_dia"
            type="number"
            defaultValue={cfg.limiteReservasDia}
            className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">
            Limite por semana
          </label>
          <input
            name="limite_reservas_semana"
            type="number"
            defaultValue={cfg.limiteReservasSemana}
            className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">
            Cooldown (h)
          </label>
          <input
            name="cooldown_horas"
            type="number"
            defaultValue={cfg.cooldownHoras}
            className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">
            Fila de espera expira (min)
          </label>
          <input
            name="waitlist_expiracao_minutos"
            type="number"
            defaultValue={cfg.waitlistExpiracaoMinutos}
            className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">
            Antecedência mínima (h)
          </label>
          <input
            name="antecedencia_min_horas"
            type="number"
            defaultValue={cfg.antecedenciaMinHoras}
            className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">
            Antecedência máxima (dias)
          </label>
          <input
            name="antecedencia_max_dias"
            type="number"
            defaultValue={cfg.antecedenciaMaxDias}
            className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2 mt-1 rounded-xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-eid-primary-300">
            Regras para reservas gratuitas de sócio
          </p>
          <p className="mt-1 text-[11px] text-eid-text-secondary">
            Defina o comportamento específico quando o membro usar benefício gratuito.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">
                Limite grátis por dia (membro)
              </label>
              <input
                name="gratis_limite_reservas_dia_membro"
                type="number"
                defaultValue={cfg.gratisLimiteReservasDiaMembro}
                className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">
                Limite grátis por semana (membro)
              </label>
              <input
                name="gratis_limite_reservas_semana_membro"
                type="number"
                defaultValue={cfg.gratisLimiteReservasSemanaMembro}
                className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">
                Intervalo entre reservas grátis (h)
              </label>
              <input
                name="gratis_intervalo_horas_entre_reservas_membro"
                type="number"
                defaultValue={cfg.gratisIntervaloHorasEntreReservasMembro}
                className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">
                Antecedência máxima grátis (dias)
              </label>
              <input
                name="gratis_antecedencia_max_dias_membro"
                type="number"
                defaultValue={cfg.gratisAntecedenciaMaxDiasMembro}
                className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Política de cancelamento
        </label>
        <textarea
          name="politica_cancelamento"
          rows={3}
          defaultValue={cfg.politicaCancelamento}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-eid-text-secondary">
          Observações públicas
        </label>
        <textarea
          name="observacoes_publicas"
          rows={3}
          defaultValue={cfg.observacoesPublicas}
          className="eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="eid-btn-primary rounded-xl px-4 py-3 text-sm font-bold sm:col-span-2"
      >
        {pending ? "Salvando..." : "Salvar configurações"}
      </button>
      {state.message ? (
        <p
          className={`text-xs sm:col-span-2 ${
            state.ok ? "text-eid-primary-300" : "text-red-300"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
