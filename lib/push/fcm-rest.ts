type FirebaseServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

type FcmMessage = {
  token: string;
  notification?: {
    title?: string;
    body?: string;
  };
  data?: Record<string, string>;
  android?: {
    priority?: "normal" | "high";
    notification?: {
      channelId?: string;
      icon?: string;
      color?: string;
      tag?: string;
    };
  };
};

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function parseServiceAccount(): FirebaseServiceAccount | null {
  const rawJson = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "").trim();
  if (rawJson) {
    try {
      return JSON.parse(rawJson) as FirebaseServiceAccount;
    } catch {
      return null;
    }
  }

  const projectId = String(process.env.FIREBASE_PROJECT_ID ?? "").trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL ?? "").trim();
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
}

export function isFcmConfigured() {
  const account = parseServiceAccount();
  return Boolean(account?.project_id && account?.client_email && account?.private_key);
}

function base64Url(input: string | ArrayBuffer) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function privateKeyToArrayBuffer(privateKey: string) {
  const pem = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(pem);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function createSignedJwt(account: Required<FirebaseServiceAccount>) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const unsignedJwt = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyToArrayBuffer(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedJwt));
  return `${unsignedJwt}.${base64Url(signature)}`;
}

async function getAccessToken(account: Required<FirebaseServiceAccount>) {
  if (cachedToken && cachedToken.expiresAt - Date.now() > 60_000) return cachedToken.accessToken;

  const assertion = await createSignedJwt(account);
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = (await resp.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!resp.ok || !data.access_token) {
    throw new Error(data.error || "Falha ao autenticar no Firebase.");
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in ?? 3600) - 60) * 1000,
  };
  return cachedToken.accessToken;
}

export async function sendFcmMessage(message: FcmMessage) {
  const account = parseServiceAccount();
  if (!account?.project_id || !account.client_email || !account.private_key) {
    throw new Error("Firebase nao configurado.");
  }

  const accessToken = await getAccessToken(account as Required<FirebaseServiceAccount>);
  const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });
  const data = (await resp.json().catch(() => ({}))) as { error?: { status?: string; message?: string } };
  if (!resp.ok) {
    const err = new Error(data.error?.message || "Falha ao enviar FCM.") as Error & { code?: string };
    err.code = data.error?.status;
    throw err;
  }
}
