"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { salvarConfiguracoesEspacoAction } from "@/app/espaco/actions";
import { normalizeEspacoAssociacaoConfig } from "@/lib/espacos/associacao-config";
import { normalizeEspacoReservaConfig } from "@/lib/espacos/config";

const initialState = { ok: false, message: "" };

const modoReservaLabels: Record<string, string> = {
  paga: "Modo só reserva paga. Benefícios gratuitos ficam desativados.",
  gratuita: "Modo com foco em reservas gratuitas. Ajuste regras e limites dos membros.",
  mista: "Modo misto. Combine reservas pagas e benefícios gratuitos para sócios.",
};

const inputClass = "eid-input-dark mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm";

function ConfigCard({
  title,
  description,
  meta,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  meta?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-surface/35"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 transition hover:bg-eid-surface/55 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-black text-eid-fg">{title}</span>
          <span className="mt-1 block text-xs leading-relaxed text-eid-text-secondary">{description}</span>
          {meta ? <span className="mt-2 block text-[11px] font-bold text-eid-primary-300">{meta}</span> : null}
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[color:var(--eid-border-subtle)] bg-eid-card/70 text-base font-black text-eid-fg transition group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="border-t border-[color:var(--eid-border-subtle)] p-4">{children}</div>
    </details>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`block text-xs font-semibold uppercase tracking-wide text-eid-text-secondary ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

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
  const [state, formAction, pending] = useActionState(salvarConfiguracoesEspacoAction, initialState);
  const cfg = normalizeEspacoReservaConfig(espaco.configuracao_reservas_json);
  const associacao = normalizeEspacoAssociacaoConfig(espaco.associacao_regra_json);
  const modo = (modoReserva ?? "mista").toLowerCase();
  const bloqueiaGratis = modo === "paga";

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="espaco_id" value={espaco.id} />
      <input type="hidden" name="cover_arquivo" value={espaco.cover_arquivo ?? ""} />

      <ConfigCard
        defaultOpen
        title="Perfil público"
        description="Nome, endereço, textos e informações que aparecem para atletas."
        meta={espaco.slug ? `/${espaco.slug}` : "Slug não definido"}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome público" wide>
            <input name="nome_publico" defaultValue={espaco.nome_publico} className={inputClass} />
          </Field>
          <Field label="Slug público">
            <input name="slug" defaultValue={espaco.slug ?? ""} className={inputClass} />
          </Field>
          <Field label="Localização">
            <input name="localizacao" defaultValue={espaco.localizacao ?? ""} className={inputClass} />
          </Field>
          <Field label="Cidade">
            <input name="cidade" defaultValue={espaco.cidade ?? ""} className={inputClass} />
          </Field>
          <Field label="UF">
            <input name="uf" defaultValue={espaco.uf ?? ""} maxLength={2} className={`${inputClass} uppercase`} />
          </Field>
          <Field label="Descrição curta" wide>
            <input name="descricao_curta" defaultValue={espaco.descricao_curta ?? ""} className={inputClass} />
          </Field>
          <Field label="Descrição longa" wide>
            <textarea name="descricao_longa" rows={4} defaultValue={espaco.descricao_longa ?? ""} className={inputClass} />
          </Field>
        </div>
      </ConfigCard>

      <ConfigCard title="Contatos" description="Canais públicos para o atleta falar com o espaço.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="WhatsApp">
            <input name="whatsapp_contato" defaultValue={espaco.whatsapp_contato ?? ""} className={inputClass} />
          </Field>
          <Field label="E-mail">
            <input name="email_contato" defaultValue={espaco.email_contato ?? ""} className={inputClass} />
          </Field>
          <Field label="Site">
            <input name="website_url" defaultValue={espaco.website_url ?? ""} className={inputClass} />
          </Field>
          <Field label="Instagram">
            <input name="instagram_url" defaultValue={espaco.instagram_url ?? ""} className={inputClass} />
          </Field>
        </div>
      </ConfigCard>

      <ConfigCard
        title="Valores"
        description="Preço base usado nas reservas pagas."
        meta={`Reserva paga: R$ ${(cfg.valorReservaPadraoCentavos / 100).toFixed(2).replace(".", ",")}`}
      >
        <div className="rounded-xl border border-eid-action-500/25 bg-eid-action-500/8 p-4">
          <Field label="Valor padrão da reserva paga">
            <input
              name="valor_reserva_padrao_reais"
              type="number"
              min={0}
              step="0.01"
              defaultValue={(cfg.valorReservaPadraoCentavos / 100).toFixed(2)}
              className={inputClass}
            />
          </Field>
          <p className="mt-2 text-xs leading-relaxed text-eid-text-secondary">
            Esse é o valor base cobrado do atleta. Taxas e repasses da plataforma continuam seguindo a configuração financeira do admin.
          </p>
        </div>
      </ConfigCard>

      <ConfigCard
        title="Regras do espaço"
        description="Entrada de membros, limites de reservas, antecedência e benefícios gratuitos."
        meta={`Modo atual: ${modoReservaLabels[modo] ?? modoReservaLabels.mista}`}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-eid-text-secondary">Entrada de sócio/membro</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <select name="associacao_modo_entrada" defaultValue={associacao.modoEntrada} className="eid-input-dark rounded-xl px-3 py-2 text-sm">
                <option value="somente_perfil">Somente perfil</option>
                <option value="matricula">Exigir matrícula/código</option>
                <option value="cpf">Exigir CPF</option>
              </select>
              <input name="associacao_rotulo_campo" defaultValue={associacao.rotuloCampo} placeholder="Rótulo do campo" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
              <input name="associacao_instrucoes" defaultValue={associacao.instrucoes} placeholder="Instruções para o visitante" className="eid-input-dark rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid gap-3 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/55 p-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-xs text-eid-fg"><input type="checkbox" name="aceita_socios" defaultChecked={Boolean(espaco.aceita_socios)} />Aceita novos sócios</label>
            <label className="flex items-center gap-2 text-xs text-eid-fg"><input type="checkbox" name="permite_professores_aprovados" defaultChecked={Boolean(espaco.permite_professores_aprovados)} />Permite professores aprovados</label>
            <label className="flex items-center gap-2 text-xs text-eid-fg"><input type="checkbox" name="bloqueia_inadimplente" defaultChecked={cfg.bloqueiaInadimplente} />Bloquear inadimplente</label>
            <label className={`flex items-center gap-2 text-xs ${bloqueiaGratis ? "cursor-not-allowed text-eid-text-secondary" : "text-eid-fg"}`}>
              <input type="checkbox" name="reservas_gratis_liberadas" defaultChecked={bloqueiaGratis ? false : cfg.reservasGratisLiberadas} disabled={bloqueiaGratis} />
              Liberar benefícios gratuitos
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Limite por dia"><input name="limite_reservas_dia" type="number" defaultValue={cfg.limiteReservasDia} className={inputClass} /></Field>
            <Field label="Limite por semana"><input name="limite_reservas_semana" type="number" defaultValue={cfg.limiteReservasSemana} className={inputClass} /></Field>
            <Field label="Cooldown (h)"><input name="cooldown_horas" type="number" defaultValue={cfg.cooldownHoras} className={inputClass} /></Field>
            <Field label="Antecedência mínima (h)"><input name="antecedencia_min_horas" type="number" defaultValue={cfg.antecedenciaMinHoras} className={inputClass} /></Field>
            <Field label="Antecedência máxima (dias)"><input name="antecedencia_max_dias" type="number" defaultValue={cfg.antecedenciaMaxDias} className={inputClass} /></Field>
          </div>

          <div className="rounded-xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-eid-primary-300">Reservas gratuitas de sócio</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Limite grátis por dia"><input name="gratis_limite_reservas_dia_membro" type="number" defaultValue={cfg.gratisLimiteReservasDiaMembro} className={inputClass} /></Field>
              <Field label="Limite grátis por semana"><input name="gratis_limite_reservas_semana_membro" type="number" defaultValue={cfg.gratisLimiteReservasSemanaMembro} className={inputClass} /></Field>
              <Field label="Intervalo entre reservas grátis (h)"><input name="gratis_intervalo_horas_entre_reservas_membro" type="number" defaultValue={cfg.gratisIntervaloHorasEntreReservasMembro} className={inputClass} /></Field>
              <Field label="Antecedência máxima grátis (dias)"><input name="gratis_antecedencia_max_dias_membro" type="number" defaultValue={cfg.gratisAntecedenciaMaxDiasMembro} className={inputClass} /></Field>
            </div>
          </div>
        </div>
      </ConfigCard>

      <ConfigCard title="Cancelamento e transferência" description="Política de cancelamento para reservas gratuitas/pagas e transferência entre membros.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-eid-action-500/20 bg-eid-action-500/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-eid-action-400">Reservas gratuitas</p>
            <div className="mt-3 grid gap-3">
              <label className="flex items-center gap-2 text-xs text-eid-fg"><input type="checkbox" name="cancelamento_gratuita_permite" defaultChecked={cfg.cancelamentoGratuitaPermite} />Aceitar cancelamento</label>
              <Field label="Cancelar até (h antes)"><input name="cancelamento_gratuita_antecedencia_horas" type="number" min={0} defaultValue={cfg.cancelamentoGratuitaAntecedenciaHoras} className={inputClass} /></Field>
              <Field label="Multa"><select name="cancelamento_gratuita_multa_tipo" defaultValue={cfg.cancelamentoGratuitaMultaTipo} className={inputClass}><option value="nenhuma">Sem multa</option><option value="percentual">Percentual</option><option value="fixa">Valor fixo</option></select></Field>
              <Field label="Multa (%)"><input name="cancelamento_gratuita_multa_percentual" type="number" min={0} max={100} step="0.01" defaultValue={cfg.cancelamentoGratuitaMultaPercentual} className={inputClass} /></Field>
              <Field label="Multa fixa (R$)"><input name="cancelamento_gratuita_multa_reais" type="number" min={0} step="0.01" defaultValue={(cfg.cancelamentoGratuitaMultaCentavos / 100).toFixed(2)} className={inputClass} /></Field>
              <label className="flex items-center gap-2 text-xs text-eid-fg"><input type="checkbox" name="cancelamento_gratuita_permite_apos_prazo" defaultChecked={cfg.cancelamentoGratuitaPermiteAposPrazo} />Permitir fora do prazo</label>
            </div>
          </div>

          <div className="rounded-xl border border-eid-action-500/20 bg-eid-action-500/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-eid-action-400">Reservas pagas</p>
            <div className="mt-3 grid gap-3">
              <label className="flex items-center gap-2 text-xs text-eid-fg"><input type="checkbox" name="cancelamento_paga_permite" defaultChecked={cfg.cancelamentoPagaPermite} />Aceitar cancelamento</label>
              <Field label="Cancelar até (h antes)"><input name="cancelamento_paga_antecedencia_horas" type="number" min={0} defaultValue={cfg.cancelamentoPagaAntecedenciaHoras} className={inputClass} /></Field>
              <Field label="Multa"><select name="cancelamento_paga_multa_tipo" defaultValue={cfg.cancelamentoPagaMultaTipo} className={inputClass}><option value="nenhuma">Sem multa</option><option value="percentual">Percentual</option><option value="fixa">Valor fixo</option></select></Field>
              <Field label="Multa (%)"><input name="cancelamento_paga_multa_percentual" type="number" min={0} max={100} step="0.01" defaultValue={cfg.cancelamentoPagaMultaPercentual} className={inputClass} /></Field>
              <Field label="Multa fixa (R$)"><input name="cancelamento_paga_multa_reais" type="number" min={0} step="0.01" defaultValue={(cfg.cancelamentoPagaMultaCentavos / 100).toFixed(2)} className={inputClass} /></Field>
              <label className="flex items-center gap-2 text-xs text-eid-fg"><input type="checkbox" name="cancelamento_paga_permite_apos_prazo" defaultChecked={cfg.cancelamentoPagaPermiteAposPrazo} />Permitir fora do prazo</label>
            </div>
          </div>

          <div className="rounded-xl border border-eid-primary-500/20 bg-eid-primary-500/5 p-4 lg:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-eid-primary-300">Transferência</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-xs text-eid-fg"><input type="checkbox" name="permite_transferencia_reserva" defaultChecked={cfg.permiteTransferenciaReserva} />Membro pode transferir reserva</label>
              <Field label="Transferir até (h antes)"><input name="transferencia_antecedencia_horas" type="number" min={0} defaultValue={cfg.transferenciaAntecedenciaHoras} className={inputClass} /></Field>
              <Field label="Observação da regra" wide><input name="politica_cancelamento" defaultValue={cfg.politicaCancelamento} className={inputClass} /></Field>
              <Field label="Observações públicas" wide><textarea name="observacoes_publicas" rows={3} defaultValue={cfg.observacoesPublicas} className={inputClass} /></Field>
            </div>
          </div>
        </div>
      </ConfigCard>

      <button type="submit" disabled={pending} className="eid-btn-primary w-full rounded-xl px-4 py-3 text-sm font-bold">
        {pending ? "Salvando..." : "Salvar configurações"}
      </button>
      {state.message ? <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p> : null}
    </form>
  );
}
