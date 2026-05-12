"use client";

import { useEffect } from "react";
import { isNativeAndroidApp } from "@/lib/pwa/push-client";

export function NativeAppRuntime() {
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

  return null;
}
