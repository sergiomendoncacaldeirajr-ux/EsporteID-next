"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "eid-input-dark w-full rounded-xl px-3 py-3 text-eid-fg placeholder:text-eid-text-secondary/85";

export function RedefinirForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== password2) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.refresh();
    router.push("/login");
  }

  if (!ready) {
    return (
      <p className="text-sm leading-relaxed text-eid-text-secondary">
        Abrindo sessão de recuperação… Se nada acontecer, abra o link do e-mail de novo ou peça um
        novo em{" "}
        <Link href="/recuperar-senha" className="font-semibold text-eid-action-500 hover:underline">
          Esqueci minha senha
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="new-pass" className="mb-1 block text-sm font-medium text-eid-fg">
          Nova senha
        </label>
        <input
          id="new-pass"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="new-pass2" className="mb-1 block text-sm font-medium text-eid-fg">
          Confirmar nova senha
        </label>
        <input
          id="new-pass2"
          type="password"
          autoComplete="new-password"
          required
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          className={inputClass}
        />
      </div>
      <button type="submit" disabled={loading} className="eid-btn-primary w-full disabled:opacity-60">
        {loading ? "Salvando…" : "Salvar nova senha"}
      </button>
    </form>
  );
}
