"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isNativeAndroidApp } from "@/lib/pwa/push-client";

const NATIVE_PREFETCH_ROUTES = ["/dashboard", "/agenda", "/comunidade", "/ranking", "/perfil", "/match", "/desafio", "/times"] as const;

export function NativeAppRuntime() {
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
    const run = () => {
      for (const href of NATIVE_PREFETCH_ROUTES) {
        router.prefetch(href);
      }
    };
    const requestIdle = window.requestIdleCallback;
    if (requestIdle) {
      const id = requestIdle(run, { timeout: 2500 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(run, 1200);
    return () => window.clearTimeout(id);
  }, [router]);

  return null;
}
