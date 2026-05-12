"use client";

import { Capacitor } from "@capacitor/core";

type NativeImageSource = "camera" | "gallery";

function base64ToFile(base64: string, fileName: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mimeType });
}

export function isNativeCameraAvailable() {
  return Capacitor.isNativePlatform();
}

export async function pickNativeImage(source: NativeImageSource) {
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  const photo = await Camera.getPhoto({
    quality: 86,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
    correctOrientation: true,
  });
  if (!photo.base64String) return null;

  const format = photo.format || "jpeg";
  const mimeType = format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
  const extension = format === "jpeg" ? "jpg" : format;
  return base64ToFile(photo.base64String, `esporteid-${source}-${Date.now()}.${extension}`, mimeType);
}

export function attachFileToInput(input: HTMLInputElement | null, file: File) {
  if (!input) return false;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}
