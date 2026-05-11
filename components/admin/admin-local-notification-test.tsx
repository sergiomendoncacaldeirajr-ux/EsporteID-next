"use client";

import { useState } from "react";

export function AdminLocalNotificationTest() {
  const [status, setStatus] = useState<string>("");

  async function runTest() {
    try {
      if (!("Notification" in window)) {
        setStatus("Este ambiente nao expoe Notification.");
        return;
      }
      if (!("serviceWorker" in navigator)) {
        setStatus("Este ambiente nao expoe serviceWorker.");
        return;
      }
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") {
        setStatus(`Permissao atual: ${permission}. O Android vai bloquear a notificacao.`);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const options: NotificationOptions & { renotify?: boolean } = {
        body: "Se isso apareceu no Android, a exibicao local esta liberada.",
        icon: "/pwa-icon-192.png",
        badge: "/pwa-icon-192.png",
        tag: `eid-local-test-${Date.now()}`,
        renotify: true,
        data: { url: "/admin" },
      };
      await reg.showNotification("EsporteID - teste local", options);
      setStatus("Teste disparado neste aparelho.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha no teste local.");
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-eid-primary-500/20 bg-eid-primary-500/8 p-2.5">
      <p className="text-[11px] font-bold text-eid-fg">Teste local neste aparelho</p>
      <p className="mt-1 text-[10px] leading-relaxed text-eid-text-secondary">
        Abra esta tela pelo app Android e toque no botão. Se o teste local não aparecer, o bloqueio está no Android/app,
        não no envio do servidor.
      </p>
      <button
        type="button"
        onClick={runTest}
        className="mt-2 rounded-lg border border-eid-primary-500/35 bg-eid-primary-500/12 px-3 py-1.5 text-[10px] font-bold text-eid-primary-200"
      >
        Testar notificação local
      </button>
      {status ? <p className="mt-2 text-[10px] text-eid-primary-200">{status}</p> : null}
    </div>
  );
}
