const TAG_PATTERN = /<[^>]*>/g;
const INVISIBLE_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export function sanitizeUserText(raw: FormDataEntryValue | string | null | undefined, maxLen = 280): string {
  const input = typeof raw === "string" ? raw : String(raw ?? "");
  const noTags = input.replace(TAG_PATTERN, " ");
  const noInvisible = noTags.replace(INVISIBLE_PATTERN, "");
  const normalizedSpaces = noInvisible.replace(/\s+/g, " ").trim();
  if (!normalizedSpaces) return "";
  return normalizedSpaces.slice(0, Math.max(1, maxLen));
}

export function sanitizeOptionalUserText(raw: FormDataEntryValue | string | null | undefined, maxLen = 280): string | null {
  const value = sanitizeUserText(raw, maxLen);
  return value ? value : null;
}
