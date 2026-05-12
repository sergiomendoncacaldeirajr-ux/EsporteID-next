"use client";

import { useActionState, useState } from "react";
import { salvarDadosContaAsaasParceiroAction } from "@/app/espaco/actions";

const initial = { ok: false, message: "" };

export function FormAsaasParceiro({
  espacoId,
  defaultNome,
  defaultCpf,
  defaultEmail,
  defaultModo = "criar_nova",
}: {
  espacoId: number;
  defaultNome: string;
  defaultCpf: string;
  defaultEmail: string;
  defaultModo?: "criar_nova" | "conta_existente";
}) {
  const [state, formAction, pending] = useActionState(salvarDadosContaAsaasParceiroAction, initial);
  const [modoIntegracao, setModoIntegracao] = useState(defaultModo);
  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-[color:var(--eid-border-subtle)] bg-eid-card/80 p-4 sm:p-5">
      <input type="hidden" name="espaco_id" value={espacoId} />
      <input type="hidden" name="modo_integracao" value={modoIntegracao} />
      <h2 className="text-sm font-bold text-eid-fg">Atualizar dados de recebimento</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          ["criar_nova", "Cadastrar no Asaas", "Criar uma nova conta de recebimentos."],
          ["conta_existente", "Entrar no Asaas", "Usar e-mail e senha da conta atual."],
        ].map(([id, title, text]) => {
          const modo = id as "criar_nova" | "conta_existente";
          const selected = modoIntegracao === modo;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setModoIntegracao(modo)}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? "border-eid-action-500/70 bg-eid-action-500/12"
                  : "border-[color:var(--eid-border-subtle)] bg-eid-surface/45 hover:border-eid-primary-500/45"
              }`}
              aria-pressed={selected}
            >
              <span className="block text-xs font-bold text-eid-fg">{title}</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-eid-text-secondary">{text}</span>
            </button>
          );
        })}
      </div>
      <p className="rounded-xl border border-eid-primary-500/25 bg-eid-primary-500/8 p-3 text-xs leading-relaxed text-eid-text-secondary">
        {modoIntegracao === "criar_nova"
          ? "Preencha os dados da conta. Selfie, documentos e prova de vida continuam no link seguro do Asaas quando forem exigidos."
          : "Informe o login da conta Asaas existente. A senha não fica salva no cadastro."}
      </p>
      {modoIntegracao === "criar_nova" ? (
        <label className="block text-xs text-eid-text-secondary">
          Nome / razão social
          <input
            name="nome_razao_social"
            required
            minLength={3}
            defaultValue={defaultNome}
            className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
          />
        </label>
      ) : null}
      <label className="block text-xs text-eid-text-secondary">
        {modoIntegracao === "criar_nova" ? "E-mail da nova conta" : "E-mail da conta Asaas"}
        <input
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs text-eid-text-secondary">
        CPF ou CNPJ (só números)
        <input
          name="cpf_cnpj"
          required
          minLength={11}
          defaultValue={defaultCpf}
          className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
        />
      </label>
      {modoIntegracao === "conta_existente" ? (
        <label className="block text-xs text-eid-text-secondary">
          Senha do Asaas
          <input
            name="asaas_senha"
            type="password"
            required
            autoComplete="current-password"
            className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm"
          />
        </label>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-eid-text-secondary">
            Data de nascimento
            <input name="asaas_birth_date" type="date" required className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs text-eid-text-secondary">
            Tipo de empresa
            <select name="asaas_company_type" defaultValue="MEI" required className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm">
              <option value="MEI">MEI</option>
              <option value="LIMITED">LTDA</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="ASSOCIATION">Associação</option>
            </select>
          </label>
          <label className="block text-xs text-eid-text-secondary">
            Celular
            <input name="asaas_mobile_phone" required className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs text-eid-text-secondary">
            CEP
            <input name="asaas_postal_code" required className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs text-eid-text-secondary">
            Bairro
            <input name="asaas_province" required className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs text-eid-text-secondary">
            Número
            <input name="asaas_address_number" required className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs text-eid-text-secondary sm:col-span-2">
            Endereço
            <input name="asaas_address" required className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs text-eid-text-secondary sm:col-span-2">
            Complemento
            <input name="asaas_complement" className="eid-input-dark mt-1 w-full rounded-xl px-3 py-2 text-sm" />
          </label>
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="eid-btn-primary w-full rounded-xl px-4 py-3 text-sm font-bold"
      >
        {pending ? "Salvando..." : "Salvar dados da conta"}
      </button>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-eid-primary-300" : "text-red-300"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
