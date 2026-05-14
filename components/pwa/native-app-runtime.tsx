"use client";

import { Capacitor } from "@capacitor/core";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ActiveAppContext } from "@/lib/auth/active-context";
import { EID_SYSTEM_UI_THEME_COLOR_DARK, EID_SYSTEM_UI_THEME_COLOR_LIGHT } from "@/lib/branding";
import { listNativeOfflineOutbox } from "@/lib/native/offline-outbox";
import { getNativeLocalStore, listNativeLocalStore, pruneNativeLocalStore, setNativeLocalStore } from "@/lib/native/local-store";
import { authenticateNativeUser, getNativeBiometricLogin } from "@/lib/native/secure-session";
import {
  EID_NATIVE_APP_VERSION,
  getAndroidNativePushOptOut,
  getRememberedAndroidFcmToken,
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

type NativeFileSharePayload = {
  url: string;
  fileName?: string;
  mimeType?: string;
  title?: string;
  text?: string;
};

type NativeCalendarPayload = {
  title?: string;
  location?: string | null;
  description?: string | null;
  startMs?: number;
  endMs?: number;
};

type NativeReminderPayload = NativeCalendarPayload & {
  matchId?: number | string | null;
  url?: string | null;
};

type NativePushData = {
  url?: unknown;
};

type NativePermissionKind = "camera" | "photos" | "notifications" | "calendar" | "files" | "location";

type NativePermissionPrompt = {
  kind: NativePermissionKind;
  resolve: (allowed: boolean) => void;
};

type NativeOfflineSnapshot = {
  href: string;
  title: string;
  text: string;
  updatedAt: number;
  scrollY: number;
};

type NativeScreenState = {
  href: string;
  pathname: string;
  search: string;
  hash: string;
  scrollY: number;
  activeControl?: string;
  updatedAt: number;
};

const EID_NATIVE_ROUTE_CACHE = "eid-native-route-cache-v1";
const EID_NATIVE_CACHE_META_KEY = "eidNativeRouteCacheMeta";
const EID_NATIVE_OFFLINE_SCOPE = "offline-snapshots";
const EID_NATIVE_SCREEN_SCOPE = "screen-state";

const EID_ANDROID_PUSH_CHANNELS = [
  {
    id: "eid_desafios",
    name: "Desafios",
    description: "Convites, disputas e ações de desafios.",
    importance: 4,
  },
  {
    id: "eid_agenda",
    name: "Agenda e placares",
    description: "Atualizações de agenda, placares e compromissos.",
    importance: 4,
  },
  {
    id: "eid_ranking",
    name: "Ranking",
    description: "Resultados, pontuação e movimentações de ranking.",
    importance: 3,
  },
  {
    id: "eid_social",
    name: "Comunidade",
    description: "Convites de equipe, candidaturas, aulas e comunidade.",
    importance: 3,
  },
  {
    id: "eid_geral",
    name: "EsporteID",
    description: "Notificações gerais do EsporteID.",
    importance: 3,
  },
] as const;

declare global {
  interface Window {
    eidNativeShare?: (payload?: NativeSharePayload) => Promise<void>;
    eidNativeShareFile?: (payload: NativeFileSharePayload) => Promise<void>;
    eidNativeAddCalendarEvent?: (payload: NativeCalendarPayload) => Promise<void>;
    eidNativeScheduleMatchReminder?: (payload: NativeReminderPayload) => Promise<void>;
    eidNativeOpenMaps?: (payload: { query: string }) => Promise<void>;
    eidNativeExplainPermission?: (payload: { kind: NativePermissionKind }) => Promise<boolean>;
    eidNativeRegisterPush?: () => Promise<boolean>;
    eidNativeGetCurrentLocation?: () => Promise<{ latitude: number; longitude: number }>;
    EsporteIDAndroid?: {
      addCalendarEvent?: (payload: string) => void;
    };
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
  if (rawUrl.startsWith("/") && !rawUrl.startsWith("//")) return rawUrl;
  return appHrefFromUrl(rawUrl) ?? "/comunidade#notificacoes";
}

function isExternalHttpUrl(url: URL) {
  return (url.protocol === "https:" || url.protocol === "http:") && url.origin !== window.location.origin;
}

function safeNativeFileName(fileName: string) {
  const cleaned = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return cleaned || `esporteid-${Date.now()}`;
}

function fileNameFromUrl(url: URL, fallback = "esporteid-arquivo") {
  const lastPathPart = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
  const withoutQueryNoise = lastPathPart.split("?")[0]?.trim();
  return withoutQueryNoise || fallback;
}

function mimeTypeFromFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "ics":
      return "text/calendar";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "csv":
      return "text/csv";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/octet-stream";
  }
}

function isNativeFileUrl(url: URL, anchor?: HTMLAnchorElement) {
  if (anchor?.hasAttribute("download")) return true;
  if (url.pathname.startsWith("/api/calendar/event.ics")) return true;
  if (url.pathname.includes("/storage/v1/object/")) return true;
  return /\.(?:pdf|ics|csv|docx?|xlsx?|png|jpe?g|webp)$/i.test(url.pathname);
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao preparar arquivo."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Arquivo invalido."));
        return;
      }
      resolve(result.split(",")[1] ?? "");
    };
    reader.readAsDataURL(blob);
  });
}

function nativePermissionCopy(kind: NativePermissionKind) {
  switch (kind) {
    case "camera":
      return {
        title: "Usar câmera",
        body: "O EsporteID vai abrir a câmera do aparelho para você enviar ou atualizar uma imagem.",
        action: "Continuar",
      };
    case "photos":
      return {
        title: "Escolher foto",
        body: "O EsporteID vai abrir sua galeria para você selecionar uma imagem.",
        action: "Abrir galeria",
      };
    case "notifications":
      return {
        title: "Ativar notificações",
        body: "Você receberá avisos de agenda, desafios, ranking e comunidade pelo sistema do aparelho.",
        action: "Ativar",
      };
    case "calendar":
      return {
        title: "Adicionar à agenda",
        body: "O EsporteID vai enviar este evento para a agenda oficial do seu aparelho.",
        action: "Adicionar",
      };
    case "files":
      return {
        title: "Abrir arquivo",
        body: "O EsporteID vai preparar o arquivo e abrir as opções nativas do aparelho.",
        action: "Abrir",
      };
    case "location":
      return {
        title: "Detectar localização",
        body: "O EsporteID vai usar a localização do aparelho para preencher sua cidade automaticamente.",
        action: "Detectar",
      };
  }
}

function whatsAppUrlFromUrl(url: URL) {
  if (url.protocol === "whatsapp:") return url.toString();
  const host = url.hostname.replace(/^www\./, "");
  if (host === "wa.me") {
    const phone = url.pathname.replace(/\D/g, "");
    return phone ? `whatsapp://send?phone=${phone}` : null;
  }
  if (host === "api.whatsapp.com" || host === "whatsapp.com") {
    const phone = url.searchParams.get("phone")?.replace(/\D/g, "");
    const text = url.searchParams.get("text");
    const params = new URLSearchParams();
    if (phone) params.set("phone", phone);
    if (text) params.set("text", text);
    const qs = params.toString();
    return qs ? `whatsapp://send?${qs}` : "whatsapp://send";
  }
  return null;
}

function calendarFileHref(payload: NativeCalendarPayload) {
  const qs = new URLSearchParams({
    title: String(payload.title || "EsporteID"),
    startMs: String(payload.startMs || ""),
    endMs: String(payload.endMs || ""),
    location: String(payload.location || ""),
    description: String(payload.description || ""),
  });
  return `${window.location.origin}/api/calendar/event.ics?${qs.toString()}`;
}

function androidCalendarIntent(payload: NativeCalendarPayload) {
  const title = encodeURIComponent(String(payload.title || "EsporteID"));
  const location = encodeURIComponent(String(payload.location || ""));
  const description = encodeURIComponent(String(payload.description || ""));
  const startMs = Math.max(0, Math.floor(Number(payload.startMs ?? 0)));
  const endMs = Math.max(startMs + 60_000, Math.floor(Number(payload.endMs ?? startMs + 90 * 60_000)));
  const fallback = encodeURIComponent(calendarFileHref(payload));
  return `intent://esporteid/calendar#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.item/event;S.title=${title};S.eventLocation=${location};S.description=${description};l.beginTime=${startMs};l.endTime=${endMs};S.browser_fallback_url=${fallback};end`;
}

function localNotificationIdFromMatch(matchId: string | number | null | undefined, startMs: number) {
  const seed = `${matchId ?? "match"}:${startMs}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash % 2_000_000_000) + 1000;
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

function nativeCacheableHref(rawHref: string) {
  let url: URL;
  try {
    url = new URL(rawHref, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  if (!url.pathname.startsWith("/")) return null;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) return null;
  return `${url.pathname}${url.search}`;
}

function rememberNativeCacheMeta(path: string) {
  try {
    const raw = window.localStorage.getItem(EID_NATIVE_CACHE_META_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    parsed[path] = Date.now();
    const entries = Object.entries(parsed)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24);
    window.localStorage.setItem(EID_NATIVE_CACHE_META_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* ignore */
  }
}

function lastNativeCacheAt(path: string) {
  try {
    const raw = window.localStorage.getItem(EID_NATIVE_CACHE_META_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Record<string, number>;
    return Number(parsed[path] ?? 0);
  } catch {
    return 0;
  }
}

function normalizeNativeText(value: string, maxLength = 1800) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function nativeSnapshotFromDocument(href: string): NativeOfflineSnapshot | null {
  const root = document.querySelector("main,[role='main']") ?? document.body;
  const text = normalizeNativeText(root.textContent ?? "");
  if (text.length < 24) return null;
  return {
    href,
    title: normalizeNativeText(document.title.replace(/ · EsporteID$/, "") || "EsporteID", 96),
    text,
    updatedAt: Date.now(),
    scrollY: Math.max(0, Math.round(window.scrollY)),
  };
}

function nativeSnapshotFromHtml(href: string, html: string): NativeOfflineSnapshot | null {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const root = doc.querySelector("main,[role='main']") ?? doc.body;
    const text = normalizeNativeText(root.textContent ?? "");
    if (text.length < 24) return null;
    return {
      href,
      title: normalizeNativeText(doc.title.replace(/ · EsporteID$/, "") || "EsporteID", 96),
      text,
      updatedAt: Date.now(),
      scrollY: 0,
    };
  } catch {
    return null;
  }
}

function currentNativeHref() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function shortNativeToken(token: string) {
  if (!token) return "sem token";
  if (token.length <= 24) return token;
  return `${token.slice(0, 12)}...${token.slice(-8)}`;
}

export function NativeAppRuntime({ userId, activeContext }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOffline, setIsOffline] = useState(false);
  const [showStartup, setShowStartup] = useState(false);
  const [permissionPrompt, setPermissionPrompt] = useState<NativePermissionPrompt | null>(null);
  const [nativeLocked, setNativeLocked] = useState(false);
  const [nativeUnlocking, setNativeUnlocking] = useState(false);
  const [nativeRefreshing, setNativeRefreshing] = useState(false);
  const [nativeTransitioning, setNativeTransitioning] = useState(false);
  const [nativeUploadBusy, setNativeUploadBusy] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [offlineCacheAt, setOfflineCacheAt] = useState(0);
  const [offlineSnapshot, setOfflineSnapshot] = useState<NativeOfflineSnapshot | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagnosticsCopied, setDiagnosticsCopied] = useState(false);
  const [diagnosticsTapCount, setDiagnosticsTapCount] = useState(0);

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
    if (!isAnyNativeApp()) return;
    if (isCapacitorNativeApp()) return;
    setShowStartup(true);
    const timer = window.setTimeout(() => setShowStartup(false), 1450);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isCapacitorNativeApp()) return;
    let cleanup = false;

    async function configureNativeShell() {
      const [
        { StatusBar, Style },
        { Keyboard, KeyboardResize },
        { Network },
        { App },
        { Browser },
        { AppLauncher },
        { Filesystem, Directory },
        { Share },
        { LocalNotifications },
        { SplashScreen },
      ] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/keyboard"),
        import("@capacitor/network"),
        import("@capacitor/app"),
        import("@capacitor/browser"),
        import("@capacitor/app-launcher"),
        import("@capacitor/filesystem"),
        import("@capacitor/share"),
        import("@capacitor/local-notifications"),
        import("@capacitor/splash-screen"),
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
        LocalNotifications.registerActionTypes({
          types: [
            {
              id: "EID_AGENDA_REMINDER",
              actions: [
                { id: "open", title: "Ver agenda", foreground: true },
                { id: "maps", title: "Abrir rota", foreground: true },
              ],
            },
          ],
        }),
      ]);

      const networkStatus = await Network.getStatus();
      if (!cleanup) setIsOffline(!networkStatus.connected);
      let lastInactiveAt = 0;
      const hideNativeSplash = () => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            void SplashScreen.hide({ fadeOutDuration: 220 });
          });
        });
      };
      if (document.readyState === "complete") hideNativeSplash();
      else window.addEventListener("load", hideNativeSplash, { once: true });

      const [networkHandle, appStateHandle, backHandle, urlOpenHandle] = await Promise.all([
        Network.addListener("networkStatusChange", (status) => setIsOffline(!status.connected)),
        App.addListener("appStateChange", (state) => {
          if (!state.isActive) {
            lastInactiveAt = Date.now();
            return;
          }
          void applySystemBars();
          if (lastInactiveAt && Date.now() - lastInactiveAt > 1500) router.refresh();
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
      const localNotificationHandle = await LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
        const extra = event.notification.extra as { url?: string; mapsQuery?: string } | undefined;
        if (event.actionId === "maps" && extra?.mapsQuery) {
          void window.eidNativeOpenMaps?.({ query: extra.mapsQuery });
          return;
        }
        router.push(extra?.url || "/agenda");
      });

      const themeObserver = new MutationObserver(() => void applySystemBars());
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-eid-theme"] });

      const explainPermission = ({ kind }: { kind: NativePermissionKind }) => {
        if (!isCapacitorNativeApp()) return Promise.resolve(true);
        return new Promise<boolean>((resolve) => {
          setPermissionPrompt({ kind, resolve });
        });
      };

      const shareNativeFile = async (payload: NativeFileSharePayload) => {
        const allowed = await explainPermission({ kind: "files" });
        if (!allowed) return;
        const source = new URL(payload.url, window.location.href);
        const response = await fetch(source.toString(), { credentials: "include" });
        if (!response.ok) throw new Error("Falha ao baixar arquivo.");

        const blob = await response.blob();
        const fallbackName = fileNameFromUrl(source);
        const fileName = safeNativeFileName(payload.fileName || fallbackName);
        const base64Data = await blobToBase64(blob);
        const saved = await Filesystem.writeFile({
          path: `shared/${Date.now()}-${fileName}`,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });

        await Share.share({
          title: payload.title ?? "EsporteID",
          text: payload.text,
          files: [saved.uri],
          dialogTitle: "Abrir ou compartilhar arquivo",
        });
      };

      const openNativeExternalUrl = async (rawUrl: string) => {
        const url = new URL(rawUrl, window.location.href);
        if (!isExternalHttpUrl(url)) return null;
        await Browser.open({ url: url.toString() });
        return true;
      };

      const onDocumentClick = (event: MouseEvent) => {
        if (event.defaultPrevented) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const anchor = target.closest("a[href]");
        if (!(anchor instanceof HTMLAnchorElement)) return;
        if (anchor.target && anchor.target !== "_self") {
          let external: URL;
          try {
            external = new URL(anchor.href, window.location.href);
          } catch {
            return;
          }
          if (isNativeFileUrl(external, anchor)) {
            event.preventDefault();
            void shareNativeFile({
              url: external.toString(),
              fileName: anchor.download || fileNameFromUrl(external),
              mimeType: mimeTypeFromFileName(anchor.download || fileNameFromUrl(external)),
              title: anchor.textContent?.trim() || "EsporteID",
            }).catch(() => Browser.open({ url: external.toString() }));
            return;
          }
          const targetWhatsAppUrl = whatsAppUrlFromUrl(external);
          if (targetWhatsAppUrl) {
            event.preventDefault();
            void AppLauncher.openUrl({ url: targetWhatsAppUrl }).catch(() => Browser.open({ url: external.toString() }));
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
        if (isNativeFileUrl(url, anchor)) {
          event.preventDefault();
          void shareNativeFile({
            url: url.toString(),
            fileName: anchor.download || fileNameFromUrl(url),
            mimeType: mimeTypeFromFileName(anchor.download || fileNameFromUrl(url)),
            title: anchor.textContent?.trim() || "EsporteID",
          }).catch(() => Browser.open({ url: url.toString() }));
          return;
        }
        const whatsAppUrl = whatsAppUrlFromUrl(url);
        if (whatsAppUrl) {
          event.preventDefault();
          void AppLauncher.openUrl({ url: whatsAppUrl }).catch(() => Browser.open({ url: url.toString() }));
          return;
        }
        if (isExternalHttpUrl(url)) {
          event.preventDefault();
          void Browser.open({ url: url.toString() });
          return;
        }
        const internalHref = nativeCacheableHref(url.toString());
        if (internalHref && internalHref !== `${window.location.pathname}${window.location.search}`) {
          setNativeTransitioning(true);
          window.setTimeout(() => setNativeTransitioning(false), 1400);
        }
        const href = appHrefFromUrl(url.toString());
        if (href && url.origin !== window.location.origin) {
          event.preventDefault();
          router.push(href);
        }
      };
      document.addEventListener("click", onDocumentClick, { capture: true });
      const originalWindowOpen = window.open.bind(window);
      window.open = ((url?: string | URL, target?: string, features?: string) => {
        if (url) {
          const rawUrl = typeof url === "string" ? url : url.toString();
          void openNativeExternalUrl(rawUrl).then((handled) => {
            if (handled) {
              window.setTimeout(() => router.refresh(), 1200);
              return;
            }
            originalWindowOpen(rawUrl, target, features);
          });
          return null;
        }
        return originalWindowOpen(url, target, features);
      }) as typeof window.open;
      window.eidNativeExplainPermission = explainPermission;
      window.eidNativeShareFile = shareNativeFile;

      window.eidNativeAddCalendarEvent = async (payload) => {
        if (!Number.isFinite(Number(payload.startMs))) return;
        const allowed = await explainPermission({ kind: "calendar" });
        if (!allowed) return;
        const fileHref = calendarFileHref(payload);
        if (Capacitor.getPlatform() === "android") {
          try {
            await AppLauncher.openUrl({ url: androidCalendarIntent(payload) });
          } catch {
            try {
              await Browser.open({ url: fileHref });
            } catch {
              window.location.href = fileHref;
            }
          }
          return;
        }
        await Browser.open({ url: fileHref });
      };
      window.eidNativeScheduleMatchReminder = async (payload) => {
        if (!Number.isFinite(Number(payload.startMs))) return;
        const allowed = await explainPermission({ kind: "notifications" });
        if (!allowed) return;
        const permission = await LocalNotifications.checkPermissions();
        const display =
          permission.display === "prompt" ? (await LocalNotifications.requestPermissions()).display : permission.display;
        if (display !== "granted") return;
        const startMs = Number(payload.startMs);
        const reminderAt = new Date(Math.max(Date.now() + 60_000, startMs - 60 * 60_000));
        const id = localNotificationIdFromMatch(payload.matchId, startMs);
        await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => undefined);
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title: payload.title || "EsporteID",
              body: payload.location ? `Seu compromisso começa em breve em ${payload.location}.` : "Seu compromisso começa em breve.",
              schedule: { at: reminderAt },
              actionTypeId: "EID_AGENDA_REMINDER",
              extra: {
                url: payload.url || "/agenda",
                mapsQuery: payload.location || "",
              },
            },
          ],
        });
      };
      window.eidNativeOpenMaps = async ({ query }) => {
        const clean = query.trim();
        if (!clean) return;
        const encoded = encodeURIComponent(clean);
        const appUrl =
          Capacitor.getPlatform() === "ios" ? `maps://?q=${encoded}` : `geo:0,0?q=${encoded}`;
        await AppLauncher.openUrl({ url: appUrl }).catch(() =>
          Browser.open({ url: `https://www.google.com/maps/search/?api=1&query=${encoded}` })
        );
      };
      window.eidNativeGetCurrentLocation = async () => {
        const allowed = await explainPermission({ kind: "location" });
        if (!allowed) throw new Error("Permita o acesso à localização para preencher sua cidade automaticamente.");
        const { Geolocation } = await import("@capacitor/geolocation");
        const permission = await Geolocation.checkPermissions();
        if (permission.location !== "granted" && permission.coarseLocation !== "granted") {
          const requested = await Geolocation.requestPermissions({
            permissions: ["location", "coarseLocation"],
          });
          if (requested.location !== "granted" && requested.coarseLocation !== "granted") {
            throw new Error("Permita o acesso à localização do app para preencher sua cidade automaticamente.");
          }
        }
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          maximumAge: 60_000,
          timeout: 12_000,
        });
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      };
      window.EsporteIDAndroid = {
        ...(window.EsporteIDAndroid ?? {}),
        addCalendarEvent: (payload) => {
          try {
            const parsed = JSON.parse(payload) as NativeCalendarPayload;
            void window.eidNativeAddCalendarEvent?.(parsed);
          } catch {
            /* ignore */
          }
        },
      };

      window.dispatchEvent(new CustomEvent("eid:native-app-ready"));

      return () => {
        themeObserver.disconnect();
        document.removeEventListener("click", onDocumentClick, { capture: true });
        window.removeEventListener("load", hideNativeSplash);
        window.open = originalWindowOpen;
        delete window.eidNativeExplainPermission;
        delete window.eidNativeShareFile;
        delete window.eidNativeAddCalendarEvent;
        delete window.eidNativeScheduleMatchReminder;
        delete window.eidNativeOpenMaps;
        delete window.eidNativeGetCurrentLocation;
        if (window.EsporteIDAndroid?.addCalendarEvent) delete window.EsporteIDAndroid.addCalendarEvent;
        void networkHandle.remove();
        void appStateHandle.remove();
        void backHandle.remove();
        void urlOpenHandle.remove();
        void localNotificationHandle.remove();
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
      let registrationInFlight: Promise<boolean> | null = null;

      await Promise.allSettled(
        EID_ANDROID_PUSH_CHANNELS.map((channel) =>
          PushNotifications.createChannel({
            ...channel,
            visibility: 1,
            lights: true,
            lightColor: "#2563EB",
            vibration: true,
          })
        )
      );

      const [registrationHandle, registrationErrorHandle, receivedHandle, actionHandle] = await Promise.all([
        PushNotifications.addListener("registration", (token) => {
          rememberAndroidFcmToken(token.value);
          if (!getAndroidNativePushOptOut()) {
            void syncAndroidNativePushToken().then((ok) => {
              if (!ok) window.setTimeout(() => void syncAndroidNativePushToken().catch(() => false), 2500);
            });
          }
        }),
        PushNotifications.addListener("registrationError", (error) => {
          console.warn("Falha ao registrar push nativo.", error);
        }),
        PushNotifications.addListener("pushNotificationReceived", () => {
          if (document.visibilityState === "visible") {
            void PushNotifications.removeAllDeliveredNotifications();
          }
        }),
        PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
          void PushNotifications.removeAllDeliveredNotifications();
          router.push(notificationHrefFromData(event.notification.data as NativePushData | undefined));
        }),
      ]);
      handles.push(registrationHandle, registrationErrorHandle, receivedHandle, actionHandle);

      const registerNativePush = async () => {
        if (registrationInFlight) return registrationInFlight;
        registrationInFlight = (async () => {
          const permission = await PushNotifications.checkPermissions();
          let receive = permission.receive;
          if (receive === "prompt") {
            const allowed = await window.eidNativeExplainPermission?.({ kind: "notifications" });
            if (allowed === false) return false;
            receive = (await PushNotifications.requestPermissions()).receive;
          }
          if (disposed || receive !== "granted" || getAndroidNativePushOptOut()) return false;

          await PushNotifications.register();
          const synced = await syncAndroidNativePushToken().catch(() => false);
          await PushNotifications.removeAllDeliveredNotifications();
          return synced || Boolean(getRememberedAndroidFcmToken());
        })().finally(() => {
          registrationInFlight = null;
        });
        return registrationInFlight;
      };

      window.eidNativeRegisterPush = registerNativePush;
      const retryNativePush = () => {
        if (!getAndroidNativePushOptOut()) void registerNativePush().catch(() => false);
      };
      window.addEventListener("eid:pwa-resume", retryNativePush);
      window.addEventListener("online", retryNativePush);
      handles.push({
        remove: async () => {
          window.removeEventListener("eid:pwa-resume", retryNativePush);
          window.removeEventListener("online", retryNativePush);
          if (window.eidNativeRegisterPush === registerNativePush) delete window.eidNativeRegisterPush;
        },
      });

      void registerNativePush();
    }

    void configureNativePush();
    return () => {
      disposed = true;
      for (const handle of handles) void handle.remove();
    };
  }, [router]);

  useEffect(() => {
    if (!isCapacitorNativeApp()) return;
    let disposed = false;
    let lastHapticAt = 0;

    async function installNativeHaptics() {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      if (disposed) return;

      const onPointerUp = (event: PointerEvent) => {
        if (event.defaultPrevented || event.pointerType === "mouse") return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const interactive = target.closest(
          'button,a[href],[role="button"],summary,input[type="checkbox"],input[type="radio"],input[type="range"],select'
        );
        if (!(interactive instanceof HTMLElement)) return;
        if (interactive.matches("[disabled],[aria-disabled='true'],[data-eid-no-haptic='true']")) return;

        const now = Date.now();
        if (now - lastHapticAt < 90) return;
        lastHapticAt = now;
        void Haptics.impact({ style: ImpactStyle.Light });
      };

      document.addEventListener("pointerup", onPointerUp, { capture: true, passive: true });

      return () => {
        document.removeEventListener("pointerup", onPointerUp, { capture: true });
      };
    }

    let dispose: void | (() => void);
    void installNativeHaptics().then((fn) => {
      dispose = fn;
      if (disposed) dispose?.();
    });

    return () => {
      disposed = true;
      dispose?.();
    };
  }, []);

  useEffect(() => {
    if (!isCapacitorNativeApp() || !userId) return;
    let disposed = false;
    let backgroundAt = 0;
    let authenticating = false;
    let lastPromptAt = 0;

    async function lockIfNeeded() {
      if (disposed || authenticating || nativeLocked || nativeUnlocking) return;
      const saved = await getNativeBiometricLogin();
      if (!saved) return;
      const awayMs = backgroundAt ? Date.now() - backgroundAt : 0;
      if (awayMs < 10 * 60_000) return;
      if (Date.now() - lastPromptAt < 30_000) return;

      authenticating = true;
      lastPromptAt = Date.now();
      backgroundAt = 0;
      setNativeLocked(true);
      setNativeUnlocking(true);
      try {
        await authenticateNativeUser("Desbloqueie o EsporteID para continuar.");
        if (!disposed) setNativeLocked(false);
      } catch {
        if (!disposed) setNativeLocked(true);
      } finally {
        authenticating = false;
        if (!disposed) setNativeUnlocking(false);
      }
    }

    async function installResumeLock() {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("appStateChange", (state) => {
        if (!state.isActive) {
          backgroundAt = Date.now();
          return;
        }
        void lockIfNeeded();
      });
      return () => {
        void handle.remove();
      };
    }

    let dispose: void | (() => void);
    void installResumeLock().then((fn) => {
      dispose = fn;
      if (disposed) dispose?.();
    });

    return () => {
      disposed = true;
      dispose?.();
    };
  }, [nativeLocked, nativeUnlocking, userId]);

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
    setNativeTransitioning(false);
  }, [pathname]);

  useEffect(() => {
    if (!isAnyNativeApp()) return;
    if (!isOffline) {
      setOfflineSnapshot(null);
      return;
    }
    const href = `${window.location.pathname}${window.location.search}`;
    const cachedSnapshot = getNativeLocalStore<NativeOfflineSnapshot>(EID_NATIVE_OFFLINE_SCOPE, href)?.value ?? null;
    setOfflineCacheAt(cachedSnapshot?.updatedAt ?? lastNativeCacheAt(href));
    setOfflineSnapshot(cachedSnapshot);
  }, [isOffline, pathname]);

  useEffect(() => {
    if (!isAnyNativeApp() || !("caches" in window)) return;
    let cancelled = false;

    async function cacheRoutes() {
      if (!navigator.onLine) return;
      const cache = await caches.open(EID_NATIVE_ROUTE_CACHE);
      const routes = new Set<string>([
        `${window.location.pathname}${window.location.search}`,
        ...getNativeWarmRoutes(userId, activeContext),
      ]);
      navigator.serviceWorker?.controller?.postMessage({
        type: "EID_CACHE_ROUTES",
        routes: [...routes],
      });

      for (const href of routes) {
        if (cancelled) return;
        const cacheable = nativeCacheableHref(href);
        if (!cacheable) continue;
        try {
          const response = await fetch(cacheable, {
            credentials: "include",
            headers: { "X-EsporteID-Native-Cache": "1" },
          });
          if (!response.ok || response.type === "opaque") continue;
          await cache.put(cacheable, response.clone());
          const html = await response
            .clone()
            .text()
            .catch(() => "");
          const snapshot = html ? nativeSnapshotFromHtml(cacheable, html) : null;
          if (snapshot) setNativeLocalStore(EID_NATIVE_OFFLINE_SCOPE, cacheable, snapshot, { ttlMs: 7 * 24 * 60 * 60_000 });
          rememberNativeCacheMeta(cacheable);
        } catch {
          /* ignore */
        }
      }
      pruneNativeLocalStore(EID_NATIVE_OFFLINE_SCOPE, 36);
    }

    const timeout = window.setTimeout(() => void cacheRoutes(), 1800);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [activeContext, pathname, userId]);

  useEffect(() => {
    if (!isAnyNativeApp()) return;
    const href = currentNativeHref();
    const pathKey = `${window.location.pathname}${window.location.search}`;
    const saved = getNativeLocalStore<NativeScreenState>(EID_NATIVE_SCREEN_SCOPE, href)?.value;
    if (saved && !window.location.hash && Date.now() - saved.updatedAt < 7 * 24 * 60 * 60_000 && saved.scrollY > 80) {
      window.setTimeout(() => window.scrollTo(0, saved.scrollY), 180);
    }

    let timer = 0;
    let lastActiveControl = saved?.activeControl;
    const saveState = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const screenState: NativeScreenState = {
          href,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          scrollY: Math.max(0, Math.round(window.scrollY)),
          activeControl: lastActiveControl,
          updatedAt: Date.now(),
        };
        setNativeLocalStore(EID_NATIVE_SCREEN_SCOPE, href, screenState, { ttlMs: 14 * 24 * 60 * 60_000 });
        const snapshot = nativeSnapshotFromDocument(pathKey);
        if (snapshot && navigator.onLine) {
          setNativeLocalStore(EID_NATIVE_OFFLINE_SCOPE, pathKey, snapshot, { ttlMs: 7 * 24 * 60 * 60_000 });
          rememberNativeCacheMeta(pathKey);
        }
      }, 180);
    };
    const onControlChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest("[role='tab'],[aria-selected],button,a[href],select,input");
      if (!(control instanceof HTMLElement)) return;
      lastActiveControl =
        control.getAttribute("data-state") ||
        control.getAttribute("aria-label") ||
        control.getAttribute("href") ||
        normalizeNativeText(control.textContent ?? "", 80);
      saveState();
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") saveState();
    };
    const onBeforeUnload = () => saveState();

    saveState();
    window.addEventListener("scroll", saveState, { passive: true });
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onControlChange, { capture: true, passive: true });
    document.addEventListener("change", onControlChange, { capture: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", saveState);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onControlChange, { capture: true });
      document.removeEventListener("change", onControlChange, { capture: true });
      document.removeEventListener("visibilitychange", onVisible);
      pruneNativeLocalStore(EID_NATIVE_SCREEN_SCOPE, 48);
    };
  }, [pathname]);

  useEffect(() => {
    if (!isAnyNativeApp()) return;
    let startY = 0;
    let tracking = false;
    let armed = false;

    const isInteractiveTarget = (target: EventTarget | null) =>
      target instanceof Element &&
      Boolean(target.closest("input,textarea,select,button,a,[role='button'],[data-eid-no-pull-refresh='true']"));

    const onTouchStart = (event: TouchEvent) => {
      if (nativeRefreshing || window.scrollY > 0 || isInteractiveTarget(event.target)) return;
      const touch = event.touches[0];
      if (!touch) return;
      startY = touch.clientY;
      tracking = true;
      armed = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking) return;
      const touch = event.touches[0];
      if (!touch) return;
      const distance = Math.max(0, touch.clientY - startY);
      if (distance <= 0) return;
      if (window.scrollY > 0) {
        tracking = false;
        setPullDistance(0);
        return;
      }
      if (distance > 8) event.preventDefault();
      const nextDistance = Math.min(96, Math.round(distance * 0.45));
      armed = nextDistance >= 58;
      setPullDistance(nextDistance);
    };

    const onTouchEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (!armed) {
        setPullDistance(0);
        return;
      }
      setNativeRefreshing(true);
      setPullDistance(72);
      router.refresh();
      window.setTimeout(() => {
        setNativeRefreshing(false);
        setPullDistance(0);
      }, 1100);
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [nativeRefreshing, router]);

  useEffect(() => {
    if (!isCapacitorNativeApp()) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      if (event.clientX > 28) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input,textarea,select,[data-eid-no-edge-back='true']")) return;
      startX = event.clientX;
      startY = event.clientY;
      tracking = true;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!tracking) return;
      const dx = event.clientX - startX;
      const dy = Math.abs(event.clientY - startY);
      if (dy > 45) {
        tracking = false;
        return;
      }
      if (dx > 86) {
        tracking = false;
        setNativeTransitioning(true);
        router.back();
        window.setTimeout(() => setNativeTransitioning(false), 900);
      }
    };

    const stop = () => {
      tracking = false;
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    document.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
    document.addEventListener("pointerup", stop, { capture: true, passive: true });
    document.addEventListener("pointercancel", stop, { capture: true, passive: true });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("pointermove", onPointerMove, { capture: true });
      document.removeEventListener("pointerup", stop, { capture: true });
      document.removeEventListener("pointercancel", stop, { capture: true });
    };
  }, [router]);

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

  useEffect(() => {
    if (!isAnyNativeApp()) return;
    let hideTimer = 0;
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.querySelector('input[type="file"]')) return;
      setNativeUploadBusy(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setNativeUploadBusy(false), 12_000);
    };
    const onPageShow = () => {
      window.clearTimeout(hideTimer);
      setNativeUploadBusy(false);
    };
    document.addEventListener("submit", onSubmit, { capture: true });
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("eid:native-upload-done", onPageShow);
    return () => {
      window.clearTimeout(hideTimer);
      document.removeEventListener("submit", onSubmit, { capture: true });
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("eid:native-upload-done", onPageShow);
    };
  }, []);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  const handlePermissionCancel = useCallback(() => {
    permissionPrompt?.resolve(false);
    setPermissionPrompt(null);
  }, [permissionPrompt]);

  const handlePermissionContinue = useCallback(() => {
    permissionPrompt?.resolve(true);
    setPermissionPrompt(null);
  }, [permissionPrompt]);

  const handleNativeUnlock = useCallback(async () => {
    setNativeUnlocking(true);
    try {
      await authenticateNativeUser("Desbloqueie o EsporteID para continuar.");
      setNativeLocked(false);
    } catch {
      setNativeLocked(true);
    } finally {
      setNativeUnlocking(false);
    }
  }, []);

  const nativeDiagnostics = {
    versao: EID_NATIVE_APP_VERSION,
    plataforma: isCapacitorNativeApp() ? Capacitor.getPlatform() : isNativeAndroidApp() ? "android-twa" : "web",
    nativo: isAnyNativeApp(),
    offline: isOffline,
    rotaAtual: typeof window !== "undefined" ? currentNativeHref() : pathname,
    usuario: userId ?? "sem usuario",
    contexto: activeContext ?? "sem contexto",
    pushOptOut: getAndroidNativePushOptOut(),
    tokenFcm: shortNativeToken(getRememberedAndroidFcmToken()),
    snapshotsOffline: listNativeLocalStore<NativeOfflineSnapshot>(EID_NATIVE_OFFLINE_SCOPE).length,
    telasComEstado: listNativeLocalStore<NativeScreenState>(EID_NATIVE_SCREEN_SCOPE).length,
    acoesPendentes: listNativeOfflineOutbox().length,
    ultimoCache: offlineCacheAt ? new Date(offlineCacheAt).toISOString() : "sem cache",
    serviceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator ? Boolean(navigator.serviceWorker.controller) : false,
    onlineNavigator: typeof navigator !== "undefined" ? navigator.onLine : true,
  };

  const handleCopyDiagnostics = useCallback(async () => {
    try {
      await navigator.clipboard?.writeText(JSON.stringify(nativeDiagnostics, null, 2));
      setDiagnosticsCopied(true);
      window.setTimeout(() => setDiagnosticsCopied(false), 1600);
    } catch {
      setDiagnosticsCopied(false);
    }
  }, [nativeDiagnostics]);

  const handleDiagnosticsHotspot = useCallback(() => {
    setDiagnosticsTapCount((count) => {
      const next = count + 1;
      if (next >= 5) {
        setDiagnosticsOpen(true);
        return 0;
      }
      window.setTimeout(() => {
        setDiagnosticsTapCount(0);
      }, 1800);
      return next;
    });
  }, []);

  const cacheTimeLabel = offlineCacheAt
    ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(offlineCacheAt))
    : null;
  const permissionCopy = permissionPrompt ? nativePermissionCopy(permissionPrompt.kind) : null;
  const permissionTitleId = permissionPrompt ? `eid-native-permission-title-${permissionPrompt.kind}` : undefined;
  const permissionBodyId = permissionPrompt ? `eid-native-permission-body-${permissionPrompt.kind}` : undefined;

  return (
    <>
      {pullDistance > 0 || nativeRefreshing ? (
        <div
          className="eid-native-pull-refresh"
          style={{ transform: `translate3d(-50%, ${Math.max(0, pullDistance)}px, 0)` }}
          aria-hidden="true"
        >
          <span className={nativeRefreshing ? "eid-native-pull-spinner is-spinning" : "eid-native-pull-spinner"} />
        </div>
      ) : null}
      {nativeTransitioning ? <div className="eid-native-transition-bar" aria-hidden="true" /> : null}
      {nativeUploadBusy ? (
        <div className="eid-native-upload-headsup" role="status" aria-live="polite">
          <span className="eid-native-pull-spinner is-spinning" aria-hidden="true" />
          <span>Enviando arquivo...</span>
        </div>
      ) : null}
      {isAnyNativeApp() ? (
        <button
          type="button"
          className="eid-native-diagnostics-trigger"
          onClick={handleDiagnosticsHotspot}
          aria-label="Diagnóstico do app"
        >
          {diagnosticsTapCount ? String(5 - diagnosticsTapCount) : ""}
        </button>
      ) : null}
      {showStartup ? (
        <div className="eid-native-startup-shell" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pwa-splash-open-mark.png" alt="" className="eid-native-startup-logo" />
        </div>
      ) : null}
      {permissionPrompt && permissionCopy ? (
        <div
          className="eid-native-permission-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={permissionTitleId}
          aria-describedby={permissionBodyId}
        >
          <div className="eid-native-permission-card">
            <span className="eid-native-permission-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3 4 7v6c0 4.5 3.2 7.4 8 8 4.8-.6 8-3.5 8-8V7l-8-4Z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m9 12 2 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p id={permissionTitleId} className="eid-native-permission-title">{permissionCopy.title}</p>
            <p id={permissionBodyId} className="eid-native-permission-body">{permissionCopy.body}</p>
            <p className="eid-native-permission-note">Você pode alterar isso depois nas permissões do aparelho.</p>
            <div className="eid-native-permission-actions">
              <button
                type="button"
                onClick={handlePermissionCancel}
                className="eid-native-permission-cancel"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={handlePermissionContinue}
                className="eid-native-permission-continue"
              >
                {permissionCopy.action}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {nativeLocked ? (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-[color:var(--eid-brand-ink)] px-5 text-eid-fg">
          <div className="w-full max-w-xs text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pwa-splash-open-mark.png" alt="" className="mx-auto h-16 w-16 object-contain" />
            <p className="mt-5 text-[15px] font-black uppercase tracking-[0.1em]">EsporteID bloqueado</p>
            <p className="mt-2 text-[13px] leading-relaxed text-eid-text-muted">
              Confirme sua identidade para continuar usando o app.
            </p>
            <button
              type="button"
              onClick={handleNativeUnlock}
              disabled={nativeUnlocking}
              className="mt-5 h-12 w-full rounded-xl bg-eid-action-500 text-[13px] font-black uppercase tracking-wide text-white disabled:opacity-70"
            >
              {nativeUnlocking ? "Desbloqueando..." : "Desbloquear"}
            </button>
          </div>
        </div>
      ) : null}
      {diagnosticsOpen ? (
        <div className="eid-native-diagnostics-panel" role="dialog" aria-modal="true" aria-label="Diagnóstico do app">
          <div className="eid-native-diagnostics-card">
            <div className="eid-native-diagnostics-head">
              <div>
                <p className="eid-native-diagnostics-kicker">App nativo</p>
                <p className="eid-native-diagnostics-title">Diagnóstico</p>
              </div>
              <button type="button" className="eid-native-diagnostics-close" onClick={() => setDiagnosticsOpen(false)}>
                Fechar
              </button>
            </div>
            <dl className="eid-native-diagnostics-grid">
              {Object.entries(nativeDiagnostics).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
            <button type="button" className="eid-native-diagnostics-copy" onClick={handleCopyDiagnostics}>
              {diagnosticsCopied ? "Copiado" : "Copiar diagnóstico"}
            </button>
          </div>
        </div>
      ) : null}
      {isOffline ? (
        <div className="eid-native-offline-shell" role="status" aria-live="polite">
          <div className="eid-native-offline-card">
            <div className="eid-native-offline-mark" aria-hidden="true" />
            <div className="min-w-0">
              <p className="eid-native-offline-title">Sem conexao</p>
              <p className="eid-native-offline-text">
                {cacheTimeLabel
                  ? `Mostrando dados recentes salvos as ${cacheTimeLabel}.`
                  : "Confira sua internet para continuar usando o EsporteID."}
              </p>
              {offlineSnapshot ? (
                <details className="eid-native-offline-snapshot">
                  <summary>{offlineSnapshot.title}</summary>
                  <p>{offlineSnapshot.text}</p>
                </details>
              ) : null}
            </div>
            <button type="button" className="eid-native-offline-action" onClick={handleRetry}>
              Tentar de novo
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
