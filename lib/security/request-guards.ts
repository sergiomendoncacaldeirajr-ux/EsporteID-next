const MALICIOUS_PATTERNS = [
  /<\s*script\b/i,
  /javascript:/i,
  /vbscript:/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /union\s+select/i,
  /;\s*drop\s+table/i,
  /\.\.\/|\.\.\\/,
  /%3cscript/i,
  /data:\s*text\/html/i,
];

export function hasMaliciousPayload(raw: string): boolean {
  const value = String(raw ?? "");
  if (!value) return false;
  return MALICIOUS_PATTERNS.some((re) => re.test(value));
}
