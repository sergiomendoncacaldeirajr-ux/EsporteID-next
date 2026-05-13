"use client";

import { Capacitor } from "@capacitor/core";

type NativeImageSource = "camera" | "gallery";

declare global {
  interface Window {
    eidNativeExplainPermission?: (payload: { kind: "camera" | "photos" | "notifications" | "calendar" | "files" }) => Promise<boolean>;
  }
}

function base64ToFile(base64: string, fileName: string, mimeType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mimeType });
}

async function downscaleImageForNativeUpload(file: File) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) return file;
  if (blob.size >= file.size && file.type === "image/jpeg") return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

export function isNativeCameraAvailable() {
  return Capacitor.isNativePlatform();
}

export async function pickNativeImage(source: NativeImageSource) {
  const allowed = await window.eidNativeExplainPermission?.({ kind: source === "camera" ? "camera" : "photos" });
  if (allowed === false) return null;

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
  const file = base64ToFile(photo.base64String, `esporteid-${source}-${Date.now()}.${extension}`, mimeType);
  return downscaleImageForNativeUpload(file);
}

export function attachFileToInput(input: HTMLInputElement | null, file: File) {
  if (!input) return false;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}
