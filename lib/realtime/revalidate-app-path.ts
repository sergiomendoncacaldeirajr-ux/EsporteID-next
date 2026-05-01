import { revalidatePath } from "next/cache";

/** Normaliza e valida path para `revalidatePath` (apenas rotas internas). */
export function normalizeRevalidateAppPath(raw: string): string {
  const path = String(raw ?? "").split("?")[0]?.split("#")[0]?.trim() || "/";
  if (!path.startsWith("/")) throw new Error("invalid path");
  if (path.includes("..")) throw new Error("invalid path");
  if (path.startsWith("/api/") || path.startsWith("/_next")) throw new Error("invalid path");
  if (path.length > 512) throw new Error("invalid path");
  return path || "/";
}

export function revalidateAppPath(raw: string) {
  revalidatePath(normalizeRevalidateAppPath(raw));
}
