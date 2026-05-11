import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

type FirebaseServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

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

export function getFcmMessaging() {
  const account = parseServiceAccount();
  if (!account?.project_id || !account.client_email || !account.private_key) {
    throw new Error("Firebase Admin nao configurado.");
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key,
      }),
    });

  return getMessaging(app);
}
