"use client";

import type { FormEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { submeterVerificacaoIdade } from "@/app/conta/verificacao-idade/actions";
import { attachFileToInput, isNativeCameraAvailable, pickNativeImage } from "@/lib/native/camera";

export function VerificacaoIdadeForm({ nome: _nome }: { nome: string }) {
  void _nome;
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const documentoRef = useRef<HTMLInputElement | null>(null);
  const selfieRef = useRef<HTMLInputElement | null>(null);
  const [documentoName, setDocumentoName] = useState("");
  const [selfieName, setSelfieName] = useState("");

  async function pickVerificationImage(target: "documento" | "selfie") {
    const input = target === "documento" ? documentoRef.current : selfieRef.current;
    if (!isNativeCameraAvailable()) {
      input?.click();
      return;
    }
    try {
      const file = await pickNativeImage("camera");
      if (!file) return;
      attachFileToInput(input, file);
      if (target === "documento") setDocumentoName(file.name);
      else setSelfieName(file.name);
    } catch (error) {
      const message = String((error as { message?: string })?.message ?? "");
      if (!/cancel/i.test(message)) setMsg("Não foi possível abrir a câmera agora.");
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMsg(null);
    startTransition(async () => {
      const r = await submeterVerificacaoIdade(fd);
      if (r.ok) {
        setMsg(
          "Verificação concluída. O resultado foi registrado para auditoria e o administrador foi notificado. Você já pode voltar ao app."
        );
        e.currentTarget.reset();
        setDocumentoName("");
        setSelfieName("");
      } else {
        setMsg(r.error);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 space-y-4 rounded-xl border border-[color:var(--eid-border-subtle)] bg-eid-card/60 p-4"
    >
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Foto do documento (com rosto visível)</label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void pickVerificationImage("documento")}
            className="rounded-lg border border-eid-primary-500/40 bg-eid-primary-500/10 px-3 py-1.5 text-xs font-semibold text-eid-fg"
          >
            Fotografar documento
          </button>
          <span className="max-w-[13rem] truncate text-[11px] text-eid-text-secondary">
            {documentoName || "Nenhum arquivo escolhido"}
          </span>
        </div>
        <input
          ref={documentoRef}
          name="documento"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="mt-1 block w-full text-xs"
          onChange={(event) => setDocumentoName(event.currentTarget.files?.[0]?.name ?? "")}
        />
      </div>
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wide text-eid-text-secondary">Selfie (rosto nítido, sem filtros fortes)</label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void pickVerificationImage("selfie")}
            className="rounded-lg border border-eid-primary-500/40 bg-eid-primary-500/10 px-3 py-1.5 text-xs font-semibold text-eid-fg"
          >
            Fazer selfie
          </button>
          <span className="max-w-[13rem] truncate text-[11px] text-eid-text-secondary">
            {selfieName || "Nenhum arquivo escolhido"}
          </span>
        </div>
        <input
          ref={selfieRef}
          name="selfie"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="mt-1 block w-full text-xs"
          onChange={(event) => setSelfieName(event.currentTarget.files?.[0]?.name ?? "")}
        />
      </div>
      <p className="text-[10px] leading-relaxed text-eid-text-secondary">
        Os arquivos ficam em armazenamento restrito para auditoria. Em produção configure AWS Rekognition (variáveis de ambiente); sem
        isso, em desenvolvimento pode ser usado modo simulado.
      </p>
      {msg ? <p className="text-sm text-eid-fg">{msg}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="eid-btn-primary w-full rounded-xl py-2.5 text-sm font-bold disabled:opacity-50"
      >
        {pending ? "Processando…" : "Enviar para verificação automática"}
      </button>
    </form>
  );
}
