"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ActiveAppContext } from "@/lib/auth/active-context";
import { isNativeAndroidApp } from "@/lib/pwa/push-client";

const NATIVE_PREFETCH_ROUTES = ["/dashboard", "/agenda", "/comunidade", "/ranking", "/match", "/desafio", "/times"] as const;

type Props = {
  userId?: string | null;
  activeContext?: ActiveAppContext;
};

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

  useEffect(() => {
    if (!isNativeAndroidApp()) return;

    const html = document.documentElement;
    const body = document.body;
    html.dataset.eidRuntime = "android-app";
    body.classList.add("eid-native-android-app");

    return () => {
      if (html.dataset.eidRuntime === "android-app") {
        delete html.dataset.eidRuntime;
      }
      body.classList.remove("eid-native-android-app");
    };
  }, []);

  useEffect(() => {
    if (!isNativeAndroidApp()) return;
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
    if (!isNativeAndroidApp()) return;
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

  return null;
}
