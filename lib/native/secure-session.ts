"use client";

import { Capacitor } from "@capacitor/core";

type NativeBiometricLogin = {
  enabled: true;
  email: string;
  enabledAt: string;
  lastUnlockAt?: string;
};

const STORAGE_PREFIX = "eid-native:";
const BIOMETRIC_LOGIN_KEY = "biometric-login";

export function isNativeSecureSessionAvailable() {
  return Capacitor.isNativePlatform();
}

async function nativeSecureStorage() {
  const { SecureStorage, KeychainAccess } = await import("@aparajita/capacitor-secure-storage");
  await SecureStorage.setKeyPrefix(STORAGE_PREFIX);
  await SecureStorage.setSynchronize(false);
  return { SecureStorage, KeychainAccess };
}

export async function checkNativeBiometricAvailable() {
  if (!isNativeSecureSessionAvailable()) return false;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    const info = await BiometricAuth.checkBiometry();
    return info.isAvailable || info.deviceIsSecure;
  } catch {
    return false;
  }
}

export async function authenticateNativeUser(reason = "Confirme sua identidade para continuar no EsporteID.") {
  if (!isNativeSecureSessionAvailable()) return false;
  const { BiometricAuth, AndroidBiometryStrength } = await import("@aparajita/capacitor-biometric-auth");
  await BiometricAuth.authenticate({
    reason,
    cancelTitle: "Cancelar",
    allowDeviceCredential: true,
    iosFallbackTitle: "Usar codigo do aparelho",
    androidTitle: "EsporteID",
    androidSubtitle: reason,
    androidConfirmationRequired: false,
    androidBiometryStrength: AndroidBiometryStrength.weak,
  });
  return true;
}

export async function getNativeBiometricLogin() {
  if (!isNativeSecureSessionAvailable()) return null;
  try {
    const { SecureStorage } = await nativeSecureStorage();
    const value = await SecureStorage.get(BIOMETRIC_LOGIN_KEY);
    if (!value || typeof value !== "object") return null;
    const entry = value as Partial<NativeBiometricLogin>;
    if (entry.enabled !== true || typeof entry.email !== "string") return null;
    return entry as NativeBiometricLogin;
  } catch {
    return null;
  }
}

export async function saveNativeBiometricLogin(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !(await checkNativeBiometricAvailable())) return false;

  const { SecureStorage, KeychainAccess } = await nativeSecureStorage();
  const payload: NativeBiometricLogin = {
    enabled: true,
    email: normalized,
    enabledAt: new Date().toISOString(),
    lastUnlockAt: new Date().toISOString(),
  };

  try {
    await SecureStorage.set(BIOMETRIC_LOGIN_KEY, payload, true, false, KeychainAccess.whenPasscodeSetThisDeviceOnly);
  } catch {
    await SecureStorage.set(BIOMETRIC_LOGIN_KEY, payload);
  }
  return true;
}

export async function enableNativeBiometricLoginAfterPassword(email: string) {
  if (!isNativeSecureSessionAvailable()) return false;
  if (!(await checkNativeBiometricAvailable())) return false;
  try {
    await authenticateNativeUser("Ative o desbloqueio rapido do EsporteID neste aparelho.");
    return saveNativeBiometricLogin(email);
  } catch {
    return false;
  }
}

export async function authenticateNativeBiometricLogin() {
  const saved = await getNativeBiometricLogin();
  if (!saved) return { ok: false, email: null as string | null };

  try {
    await authenticateNativeUser("Desbloqueie sua conta EsporteID.");
    await saveNativeBiometricLogin(saved.email);
    return { ok: true, email: saved.email };
  } catch {
    return { ok: false, email: saved.email };
  }
}

export async function clearNativeBiometricLogin() {
  if (!isNativeSecureSessionAvailable()) return;
  try {
    const { SecureStorage } = await nativeSecureStorage();
    await SecureStorage.remove(BIOMETRIC_LOGIN_KEY);
  } catch {
    /* ignore */
  }
}
