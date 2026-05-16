"use client";

export function isNativeSecureSessionAvailable() {
  return false;
}

export async function checkNativeBiometricAvailable() {
  return false;
}

export async function authenticateNativeUser() {
  throw new Error("Biometria desativada.");
}

export async function getNativeBiometricLogin() {
  return null;
}

export async function saveNativeBiometricLogin() {
  return false;
}

export async function enableNativeBiometricLoginAfterPassword() {
  return false;
}

export async function authenticateNativeBiometricLogin() {
  return { ok: false, email: null as string | null };
}

export async function clearNativeBiometricLogin() {}
