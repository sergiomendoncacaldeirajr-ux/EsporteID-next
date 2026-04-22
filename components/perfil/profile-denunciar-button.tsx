"use client";

import { useCallback, useState, useTransition } from "react";
import { denunciarPerfilUsuario } from "@/app/perfil/denuncia-actions";

const MOTIVOS: { codigo: string; label: string; desc: string }[] = [
  { codigo: "abuso", label: "Abuso ou assédio", desc: "Ameaças, assédio ou comportamento abusivo." },
  { codigo: "menor_idade", label: "Suspeita de menor de idade", desc: "Indica que o perfil pode ser de menor." },
  { codigo: "spam", label: "Spam ou propaganda", desc: "Mensagens comerciais ou repetitivas indevidas." },
  { codigo: "perfil_falso", label: "Perfil falso", desc: "Identidade ou dados falsos." },
  { codigo: "conteudo_improprio", label: "Conteúdo impróprio", desc: "Fotos ou textos inadequados." },
  { codigo: "outro", label: "Outro", desc: "Descreva no campo abaixo." },
];

export function ProfileDenunciarButton({ alvoUsuarioId }: { alvoUsuarioId: string }) {
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [codigo, setCodigo] = useState(MOTIVOS[0]!.codigo);
  const [texto, setTexto] = useState("");
  const [pending, startTransition] = useTransition();

  const enviar = useCallback(() => {
    setMsg(null);
    const fd = new FormData();
    fd.set("alvo_usuario_id", alvoUsuarioId);
    fd.set("codigo_motivo", codigo);
    if (texto.trim()) fd.set("texto", texto.trim());
    startTransition(async () => {
      const r = await denunciarPerfilUsuario(fd);
      if (r.ok) {
        setMsg("Denúncia registrada. Nossa equipe será notificada.");
        setTexto("");
        setTimeout(() => setAberto(false), 2000);
      } else {
        setMsg(r.error);
      }
    });
  }, [alvoUsuarioId, codigo, texto]);

  return (
    <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3">
      <button
        type="button"
        onClick={() => {
          setAberto((v) => !v);
          setMsg(null);
        }}
        className="text-[11px] font-bold uppercase tracking-wide text-red-300/95 underline-offset-2 hover:text-red-200 hover:underline"
      >
        Denunciar perfil
      </button>

      {aberto ? (
        <div className="mt-3 space-y-3 border-t border-red-500/20 pt-3">
          <p className="text-[11px] text-eid-text-secondary">Motivo da denúncia</p>
          <div className="grid gap-2">
            {MOTIVOS.map((m) => (
              <label
                key={m.codigo}
                className={`flex cursor-pointer gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] transition ${
                  codigo === m.codigo
                    ? "border-red-500/45 bg-red-500/10 text-eid-fg"
                    : "border-[color:var(--eid-border-subtle)] text-eid-text-secondary hover:border-red-500/25"
                }`}
              >
                <input
                  type="radio"
                  name="codigo_motivo"
                  value={m.codigo}
                  checked={codigo === m.codigo}
                  onChange={() => setCodigo(m.codigo)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-semibold text-eid-fg">{m.label}</span>
                  <span className="mt-0.5 block text-[10px] text-eid-text-secondary">{m.desc}</span>
                </span>
              </label>
            ))}
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-eid-text-secondary">Detalhes (opcional)</label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              maxLength={2000}
              className="eid-input-dark mt-1 w-full resize-none rounded-lg px-2 py-1.5 text-xs"
              placeholder="Informações que ajudem a moderação..."
            />
          </div>
          {msg ? (
            <p className={`text-xs ${msg.startsWith("Denúncia") ? "text-emerald-300" : "text-red-300"}`}>{msg}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={enviar}
              className="rounded-lg border border-red-500/50 bg-red-500/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-red-200 disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Enviar denúncia"}
            </button>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="rounded-lg border border-[color:var(--eid-border-subtle)] px-3 py-1.5 text-[11px] font-semibold text-eid-text-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
