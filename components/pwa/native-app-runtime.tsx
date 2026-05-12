"use client";

import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ActiveAppContext } from "@/lib/auth/active-context";
import { EID_SYSTEM_UI_THEME_COLOR_DARK, EID_SYSTEM_UI_THEME_COLOR_LIGHT } from "@/lib/branding";
import {
  getAndroidNativePushOptOut,
  isNativeAndroidApp,
  rememberAndroidFcmToken,
  syncAndroidNativePushToken,
} from "@/lib/pwa/push-client";

const NATIVE_PREFETCH_ROUTES = ["/dashboard", "/agenda", "/comunidade", "/ranking", "/match", "/desafio", "/times"] as const;

type Props = {
  userId?: string | null;
  activeContext?: ActiveAppContext;
};

type NativeSharePayload = {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
};

type NativePushData = {
  url?: unknown;
};

declare global {
  interface Window {
    eidNativeShare?: (payload?: NativeSharePayload) => Promise<void>;
  }
}

function isCapacitorNativeApp() {
  return Capacitor.isNativePlatform();
}

function isCapacitorAndroidApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

function isAnyNativeApp() {
  return isNativeAndroidApp() || isCapacitorNativeApp();
}

function currentSystemChromeColor() {
  const theme = document.documentElement.getAttribute("data-eid-theme");
  return theme === "light" ? EID_SYSTEM_UI_THEME_COLOR_LIGHT : EID_SYSTEM_UI_THEME_COLOR_DARK;
}

function statusBarStyleForTheme() {
  return document.documentElement.getAttribute("data-eid-theme") === "light" ? "DARK" : "LIGHT";
}

function appHrefFromUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl, window.location.origin);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.hostname !== "esporteid.com.br" && url.hostname !== window.location.hostname) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

function notificationHrefFromData(data: NativePushData | undefined) {
  const rawUrl = typeof data?.url === "string" ? data.url : "/comunidade#notificacoes";
  return appHrefFromUrl(rawUrl) ?? "/comunidade#notificacoes";
}

function isExternalHttpUrl(url: URL) {
  return (url.protocol === "https:" || url.protocol === "http:") && url.origin !== window.location.origin;
}

function getNativeWarmRoutes(userId: string | null | undefined, activeContext: ActiveAppContext | undefined) {
  const routes = new Set<string>(NATIVE_PREFETCH_ROUTES);
  if (userId) routes.add(`/perfil/${userId}`);

  if (activeContext === "professor") {
    routes.add("/professor");
    routes.add("/professor/agenda");
    routes.add("/professor/alunos");
    routes.add("/professor/avaliacoes");
  } else if (activeContext === "organizador") {
    routes.add("/organizador");
    routes.add("/torneios");
    routes.add("/torneios/criar");
    routes.add("/locais");
  } else if (activeContext === "espaco") {
    routes.add("/espaco");
    routes.add("/espaco/agenda");
    routes.add("/espaco/socios");
    routes.add("/espaco/financeiro");
  }

  return [...routes];
}

export function NativeAppRuntime({ userId, activeContext }: Props) {
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!isAnyNativeApp()) return;

    const html = document.documentElement;
    const body = document.body;
    html.dataset.eidRuntime = isCapacitorNativeApp() ? "capacitor-app" : "android-app";
    body.classList.add("eid-native-android-app");
    if (isCapacitorNativeApp()) body.classList.add("eid-capacitor-app");

    return () => {
      if (html.dataset.eidRuntime === "android-app" || html.dataset.eidRuntime === "capacitor-app") {
        delete html.dataset.eidRuntime;
      }
      body.classList.remove("eid-native-android-app");
      body.classList.remove("eid-capacitor-app");
    };
  }, []);

  useEffect(() => {
    if (!isCapacitorNativeApp()) return;
    let cleanup = false;

    async function configureNativeShell() {
      const [{ StatusBar, Style }, { Keyboard, KeyboardResize }, { Network }, { App }, { Browser }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/keyboard"),
        import("@capacitor/network"),
        import("@capacitor/app"),
        import("@capacitor/browser"),
      ]);

      const applySystemBars = async () => {
        const style = statusBarStyleForTheme() === "DARK" ? Style.Dark : Style.Light;
        const color = currentSystemChromeColor();
        await Promise.allSettled([
          StatusBar.setOverlaysWebView({ overlay: false }),
          StatusBar.setBackgroundColor({ color }),
          StatusBar.setStyle({ style }),
        ]);
      };

      await Promise.allSettled([
        applySystemBars(),
        Keyboard.setResizeMode({ mode: KeyboardResize.Native }),
        Keyboard.setAccessoryBarVisible({ isVisible: false }),
      ]);

      const networkStatus = await Network.getStatus();
      if (!cleanup) setIsOffline(!networkStatus.connected);

      const [networkHandle, appStateHandle, backHandle, urlOpenHandle] = await Promise.all([
        Network.addListener("networkStatusChange", (status) => setIsOffline(!status.connected)),
        App.addListener("appStateChange", (state) => {
          if (state.isActive) void applySystemBars();
        }),
        App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            router.back();
            return;
          }
          void App.exitApp();
        }),
        App.addListener("appUrlOpen", ({ url }) => {
          const href = appHrefFromUrl(url);
          if (href) router.push(href);
        }),
      ]);

      const themeObserver = new MutationObserver(() => void applySystemBars());
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-eid-theme"] });

      const onDocumentClick = (event: MouseEvent) => {
        if (event.defaultPrevented) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const anchor = target.closest("a[href]");
        if (!(anchor instanceof HTMLAnchorElement)) return;
        if (anchor.hasAttribute("download")) return;
        if (anchor.target && anchor.target !== "_self") {
          let external: URL;
          try {
            external = new URL(anchor.href, window.location.href);
          } catch {
            return;
          }
          if (isExternalHttpUrl(external)) {
            event.preventDefault();
            void Browser.open({ url: external.toString() });
          }
          return;
        }

        let url: URL;
        try {
          url = new URL(anchor.href, window.location.href);
        } catch {
          return;
        }
        if (isExternalHttpUrl(url)) {
          event.preventDefault();
          void Browser.open({ url: url.toString() });
          return;
        }
        const href = appHrefFromUrl(url.toString());
        if (href && url.origin !== window.location.origin) {
          event.preventDefault();
          router.push(href);
        }
      };
      document.addEventListener("click", onDocumentClick, { capture: true });

      window.dispatchEvent(new CustomEvent("eid:native-app-ready"));

      return () => {
        themeObserver.disconnect();
        document.removeEventListener("click", onDocumentClick, { capture: true });
        void networkHandle.remove();
        void appStateHandle.remove();
        void backHandle.remove();
        void urlOpenHandle.remove();
      };
    }

    let dispose: void | (() => void);
    void configureNativeShell().then((fn) => {
      dispose = fn;
      if (cleanup) dispose?.();
    });

    return () => {
      cleanup = true;
      dispose?.();
    };
  }, [router]);

  useEffect(() => {
    if (!isCapacitorNativeApp()) return;
    let disposed = false;

    async function installNativeShare() {
      const { Share } = await import("@capacitor/share");
      window.eidNativeShare = async (payload = {}) => {
        const url = payload.url ?? window.location.href;
        const title = payload.title ?? document.title.replace(/ · EsporteID$/, "");
        const text = payload.text ?? "Veja no EsporteID";
        const canShare = await Share.canShare();
        if (!canShare.value) {
          await navigator.clipboard?.writeText(url);
          return;
        }
        await Share.share({
          title,
          text,
          url,
          dialogTitle: payload.dialogTitle ?? "Compartilhar EsporteID",
        });
      };
    }

    void installNativeShare();
    return () => {
      disposed = true;
      if (disposed && window.eidNativeShare) delete window.eidNativeShare;
    };
  }, []);

  useEffect(() => {
    if (!isCapacitorAndroidApp()) return;
    let disposed = false;
    const handles: Array<{ remove: () => Promise<void> }> = [];

    async function configureNativePush() {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      const [registrationHandle, registrationErrorHandle, actionHandle] = await Promise.all([
        PushNotifications.addListener("registration", (token) => {
          rememberAndroidFcmToken(token.value);
          if (!getAndroidNativePushOptOut()) void syncAndroidNativePushToken();
        }),
        PushNotifications.addListener("registrationError", (error) => {
          console.warn("Falha ao registrar push nativo.", error);
        }),
        PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
          router.push(notificationHrefFromData(event.notification.data as NativePushData | undefined));
        }),
      ]);
      handles.push(registrationHandle, registrationErrorHandle, actionHandle);

      const permission = await PushNotifications.checkPermissions();
      const receive =
        permission.receive === "prompt" ? (await PushNotifications.requestPermissions()).receive : permission.receive;
      if (disposed || receive !== "granted") return;

      await PushNotifications.register();
    }

    void configureNativePush();
    return () => {
      disposed = true;
      for (const handle of handles) void handle.remove();
    };
  }, [router]);

  useEffect(() => {
    if (!isAnyNativeApp()) return;
    let lastWarmAt = 0;
    const run = () => {
      const now = Date.now();
      if (now - lastWarmAt < 20_000) return;
      lastWarmAt = now;
      for (const href of getNativeWarmRoutes(userId, activeContext)) {
        router.prefetch(href);
      }
    };
    const schedule = () => {
      const requestIdle = window.requestIdleCallback;
      if (requestIdle) {
        const idleId = requestIdle(run, { timeout: 2500 });
        return () => window.cancelIdleCallback?.(idleId);
      }
      const timeoutId = window.setTimeout(run, 1200);
      return () => window.clearTimeout(timeoutId);
    };
    const cancelInitial = schedule();
    const onNativeReady = () => void schedule();
    const onOnline = () => void schedule();
    const onVisible = () => {
      if (document.visibilityState === "visible") void schedule();
    };
    window.addEventListener("eid:native-app-ready", onNativeReady);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelInitial();
      window.removeEventListener("eid:native-app-ready", onNativeReady);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activeContext, router, userId]);

  useEffect(() => {
    if (!isAnyNativeApp()) return;
    const warmed = new Map<string, number>();
    const profileRoutePattern = /^\/(?:perfil-time|perfil-dupla|espaco|local)\/[^/?#]+/;

    const warmProfileRoute = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (!profileRoutePattern.test(url.pathname)) return;

      const href = `${url.pathname}${url.search}`;
      const now = Date.now();
      const last = warmed.get(href) ?? 0;
      if (now - last < 15_000) return;
      warmed.set(href, now);
      router.prefetch(href);
    };

    document.addEventListener("pointerdown", warmProfileRoute, { capture: true, passive: true });
    document.addEventListener("touchstart", warmProfileRoute, { capture: true, passive: true });
    return () => {
      document.removeEventListener("pointerdown", warmProfileRoute, { capture: true });
      document.removeEventListener("touchstart", warmProfileRoute, { capture: true });
      warmed.clear();
    };
  }, [router]);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  if (!isOffline) return null;

  return (
    <div className="eid-native-offline-shell" role="status" aria-live="polite">
      <div className="eid-native-offline-card">
        <div className="eid-native-offline-mark" aria-hidden="true" />
        <div className="min-w-0">
          <p className="eid-native-offline-title">Sem conexao</p>
          <p className="eid-native-offline-text">Confira sua internet para continuar usando o EsporteID.</p>
        </div>
        <button type="button" className="eid-native-offline-action" onClick={handleRetry}>
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
