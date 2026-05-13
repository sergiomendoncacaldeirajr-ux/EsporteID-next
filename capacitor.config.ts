import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.esporteid.app",
  appName: "EsporteID",
  webDir: "capacitor-www",
  server: {
    url: "https://esporteid.com.br",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    scheme: "EsporteID",
  },
  android: {
    buildOptions: {
      releaseType: "AAB",
    },
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_eid_notification",
      iconColor: "#2563EB",
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#0b1d2e",
      androidSplashResourceName: "splash_screen",
      showSpinner: false,
    },
  },
};

export default config;
