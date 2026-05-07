export const PENDING_SIGNUP_STORAGE_KEY = "eid-pending-signup";

export type PendingSignupSnapshot = {
  email: string;
  password: string;
  meta: Record<string, string>;
  savedAt: number;
};

